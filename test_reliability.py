"""Regression checks for the tutor contract and faithful interaction records."""
import contextlib
import csv
import io
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch

import app
import telemetry


class ReliabilityChecks(unittest.TestCase):
    def setUp(self):
        app.SESSIONS.clear()
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        for name, value in [('DATA_DIR', Path(temporary.name)),
                            ('RUN_KIND', 'developer_check')]:
            patched = patch.object(telemetry, name, value)
            patched.start()
            self.addCleanup(patched.stop)

    def start(self):
        return app.start({'problem_id': 'A01', 'question': '2x + 3 = 11'})

    def attempt(self, session, value='My own approach'):
        return app.action({'session': session['session'], 'action': 'attempt',
                           'attempt': value})

    def hint(self, session):
        return app.action({'session': session['session'], 'action': 'hint'})

    def test_declined_response_does_not_release_checked_steps(self):
        session = self.start()
        self.attempt(session)
        response = {'reply': 'Declined.', 'accepted': False, 'simulated': True,
                    'steps': app.PROBLEMS['A01']['steps'][:1]}
        with patch.object(app.model, 'call_json', return_value=response):
            result = self.hint(session)
        self.assertEqual(result['steps'], [])

    def test_malformed_reply_or_status_does_not_release_checked_steps(self):
        session = self.start()
        self.attempt(session)
        for field, value in [('reply', {}), ('reply', ''),
                             ('simulated', False), ('accepted', 'true')]:
            response = {'reply': 'A checked step.', 'accepted': True,
                        'simulated': True,
                        'steps': app.PROBLEMS['A01']['steps'][:1]}
            response[field] = value
            with self.subTest(field=field, value=value):
                with patch.object(app.model, 'call_json', return_value=response):
                    self.assertEqual(self.hint(session)['steps'], [])

    def test_response_exception_preserves_progress_and_allows_retry(self):
        session = self.start()
        self.attempt(session)
        self.hint(session)
        with patch.object(app.model, 'call_json', side_effect=RuntimeError('failure')):
            result = self.hint(session)
        self.assertEqual(result['shown'], 1)
        self.assertIn('unavailable', result['reply'])
        self.assertEqual(self.hint(session)['shown'], 2)

    def test_free_text_reply_cannot_bypass_the_step_boundary(self):
        session = self.start()
        self.attempt(session)
        leaked = 'The full solution and final answer are x = 4.'
        response = {'reply': leaked, 'accepted': True, 'simulated': True,
                    'steps': app.PROBLEMS['A01']['steps'][:1]}
        with patch.object(app.model, 'call_json', return_value=response):
            result = self.hint(session)
        self.assertEqual(result['shown'], 1)
        self.assertNotIn(leaked, result['reply'])
        self.assertNotIn('x = 4', result['reply'])

    def test_practice_format_feedback_does_not_supply_the_answer(self):
        session = self.start()
        result = app.action({'session': session['session'], 'action': 'check',
                             'answer': 'not a number'})
        self.assertEqual(result['steps'], [])
        self.assertNotIn('4', result['reply'])

    def test_invalid_unassisted_input_is_not_scored_as_wrong(self):
        session = self.start()
        for value in ['not a number', '1/0', '', 'NaN']:
            with self.subTest(value=value):
                result = app.transfer({'session': session['session'],
                                       'problem_id': 'T01', 'answer': value})
                self.assertIsNone(result['correct'])
                self.assertFalse(result['valid'])
        rows = list(csv.DictReader(io.StringIO(app.export_trace(
            {'session': session['session']})['csv'])))
        self.assertEqual([row['event'] for row in rows[1:]],
                         ['unassisted_invalid'] * 4)
        self.assertTrue(all(row['correct'] == '' for row in rows[1:]))

    def test_equivalent_numeric_forms_are_checked_consistently(self):
        session = self.start()
        for value in ['x = 8 / 2', '4.', '+4', '-8 / -2', '4.0']:
            with self.subTest(value=value):
                result = app.action({'session': session['session'],
                                     'action': 'check', 'answer': value})
                self.assertIn('Correct', result['reply'])
                self.assertEqual(result['steps'], [])
        self.assertTrue(app.transfer({'problem_id': 'T01',
                                      'answer': '1.5 / .5'})['correct'])

    def test_default_context_logging_omits_free_text(self):
        stream = io.StringIO()
        with contextlib.redirect_stdout(stream):
            app.log_context([{'role': 'user', 'content': 'PRIVATE ATTEMPT TEXT'}])
        self.assertNotIn('PRIVATE ATTEMPT TEXT', stream.getvalue())

    def test_action_state_and_trace_recording_are_atomic(self):
        session = self.start()
        original_record = telemetry.record
        entered, release, second_finished = (threading.Event() for _ in range(3))
        errors = []

        def delayed_record(state, event, **extra):
            if threading.current_thread().name == 'first-attempt':
                entered.set()
                if not release.wait(3):
                    raise RuntimeError('Timed out waiting to release trace')
            return original_record(state, event, **extra)

        def attempt(value, finished=None):
            try:
                self.attempt(session, value)
            except Exception as error:
                errors.append(error)
            finally:
                if finished:
                    finished.set()

        first = threading.Thread(target=attempt, args=('First',),
                                 name='first-attempt')
        second = threading.Thread(target=attempt, args=('Second', second_finished))
        with patch.object(telemetry, 'record', side_effect=delayed_record):
            first.start()
            self.assertTrue(entered.wait(2))
            second.start()
            try:
                overlapped = second_finished.wait(.2)
            finally:
                release.set()
                first.join(4)
                second.join(4)
        self.assertFalse(first.is_alive() or second.is_alive())
        self.assertEqual(errors, [])
        self.assertFalse(overlapped, 'A second action completed before the first trace')
        rows = list(csv.DictReader(io.StringIO(app.export_trace(
            {'session': session['session']})['csv'])))
        self.assertEqual([row['attempt_count'] for row in rows[1:]], ['1', '2'])


if __name__ == '__main__':
    unittest.main()
