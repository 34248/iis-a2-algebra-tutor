"""Checks for real equation reasoning and its interaction boundary."""
import csv
import io
import tempfile
import unittest
from fractions import Fraction
from pathlib import Path
from unittest.mock import patch
import algebra
import app
import telemetry


class EquationChecks(unittest.TestCase):
    def test_equivalent_working_in_different_forms(self):
        for line in ['2x = 8', '2 x = 8', 'x = 4', '4 = x', '4x + 6 = 22', 'x/2 = 2']:
            with self.subTest(line=line):
                result = algebra.check_step('2x + 3 = 11', line)
                self.assertTrue(result['equivalent'])
                self.assertNotIn('x = 4', result['reply'])

    def test_changed_solution_gets_feedback_without_answer(self):
        result = algebra.check_step('2x + 3 = 11', '2x = 14')
        self.assertTrue(result['valid'])
        self.assertFalse(result['equivalent'])
        self.assertNotIn('4', result['reply'])

    def test_exact_decimal_fraction_and_parentheses(self):
        self.assertEqual(algebra.solution('0.1x + 0.2 = 0.5'), Fraction(3))
        self.assertEqual(algebra.solution('2(x + 1) = 10'), Fraction(4))
        self.assertEqual(algebra.solution('x/3 + 1 = 3/2'), Fraction(3, 2))
        self.assertEqual(algebra.solution('-2x + 6 = 14'), Fraction(-4))

    def test_incomplete_or_identity_is_not_credited(self):
        for line in ['2x + = 11', '2x', '4 = 4', 'x = x', 'x + 1 = x + 2']:
            with self.subTest(line=line):
                self.assertFalse(algebra.check_step('2x + 3 = 11', line)['valid'])

    def test_unsupported_or_executable_syntax_is_rejected(self):
        for line in ['x*x = 16', 'x**2 = 16', 'x/(x-1) = 4',
                     '__import__("os") = x', '[x][0] = 4', 'x = 1/0']:
            with self.subTest(line=line):
                self.assertFalse(algebra.check_step('2x + 3 = 11', line)['valid'])

    def test_all_authored_items_and_steps_are_verified(self):
        self.assertEqual(len(app.PROBLEMS), 9)
        self.assertEqual(len(app.TRANSFER), 9)
        algebra.validate_catalog(app.PROBLEMS, app.TRANSFER)

    def test_corrupt_catalog_is_rejected(self):
        from copy import deepcopy
        bad = deepcopy(app.PROBLEMS)
        bad['A01']['answer'] = 999
        with self.assertRaises(ValueError):
            algebra.validate_catalog(bad, app.TRANSFER)
        bad = deepcopy(app.PROBLEMS)
        bad['A01']['steps'][-1] = 'Check by substitution: 2(4) + 3 = 100.'
        with self.assertRaises(ValueError):
            algebra.validate_catalog(bad, app.TRANSFER)


class LearningFlowChecks(unittest.TestCase):
    def setUp(self):
        app.SESSIONS.clear()
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        patched = patch.object(telemetry, 'DATA_DIR', Path(temporary.name))
        patched.start();self.addCleanup(patched.stop)

    def start(self, pid='A01'):
        return app.start({'problem_id': pid, 'question': app.PROBLEMS[pid]['question']})

    def test_equation_attempt_checks_without_releasing_hint(self):
        state = self.start()
        result = app.action({'session': state['session'], 'action': 'check_step',
                             'attempt': '2x = 8'})
        self.assertTrue(result['step_feedback']['equivalent'])
        self.assertEqual(result['shown'], 0)
        self.assertEqual(result['attempt_count'], 1)
        self.assertTrue(result['next_hint_allowed'])

    def test_wrong_equation_does_not_disclose_the_answer(self):
        state = self.start()
        result = app.action({'session': state['session'], 'action': 'check_step',
                             'attempt': '2x = 14'})
        self.assertFalse(result['step_feedback']['equivalent'])
        self.assertEqual(result['steps'], [])
        self.assertNotIn('x = 4', result['step_feedback']['reply'])

    def test_fraction_answer_and_session_summary(self):
        state = self.start('A05')
        result = app.action({'session': state['session'], 'action': 'check', 'answer': '5/3'})
        self.assertTrue(result['solved'])
        self.assertEqual(result['answer_checks'], 1)
        self.assertEqual(result['transfer_id'], 'T05')
        invalid = app.action({'session': state['session'], 'action': 'check', 'answer': 'bad'})
        self.assertFalse(invalid['solved'])
        self.assertEqual(invalid['answer_checks'], 1)

    def test_step_trace_records_result_without_working_text(self):
        state = self.start()
        app.action({'session': state['session'], 'action': 'check_step', 'attempt': '2x = 8'})
        result = app.export_trace({'session': state['session']})
        rows = list(csv.DictReader(io.StringIO(result['csv'])))
        self.assertEqual(rows[-1]['event'], 'check_step')
        self.assertEqual(rows[-1]['step_equivalent'], 'True')
        self.assertEqual(rows[-1]['step_checks'], '1')
        self.assertNotIn('2x = 8', result['csv'])

    def test_multi_step_fraction_task_and_its_paired_item(self):
        state = self.start('A09')
        checked = app.action({'session': state['session'], 'action': 'check_step',
                              'attempt': '2(x-1) + 3x = 24'})
        self.assertTrue(checked['step_feedback']['equivalent'])
        solved = app.action({'session': state['session'], 'action': 'check',
                             'answer': '26/5'})
        self.assertTrue(solved['solved'])
        self.assertTrue(app.transfer({'session': state['session'],
                                      'problem_id': 'T09', 'answer': '6'})['correct'])

    def test_comparison_control_disables_extra_feedback_in_both_modes(self):
        for mode in ['gradual', 'immediate']:
            with self.subTest(mode=mode):
                state = app.start({'problem_id': 'A01', 'question': '2x + 3 = 11',
                                   'condition': mode, 'equation_feedback': False})
                with self.assertRaises(app.UserError):
                    app.action({'session': state['session'], 'action': 'check_step',
                                'attempt': '2x = 8'})
                recorded = app.action({'session': state['session'],
                                       'action': 'attempt', 'attempt': 'My own approach'})
                self.assertEqual(recorded['attempt_count'], 1)
                rows = list(csv.DictReader(io.StringIO(app.export_trace(
                    {'session': state['session']})['csv'])))
                self.assertTrue(all(row['equation_feedback'] == 'False' for row in rows))


if __name__ == '__main__':
    unittest.main()
