import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app
import live_results
import telemetry


class LiveResultTests(unittest.TestCase):
    def test_compare_sessions_and_restore_first_valid_paired_answer(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(telemetry, 'DATA_DIR', Path(tmp)), \
                patch.object(telemetry, 'RUN_KIND', 'local_inspection'), patch.dict(app.SESSIONS), \
                patch.dict(live_results._sessions, clear=True):
            payload = {'problem_id':'A01', 'question':'2x + 3 = 11'}
            app.start(payload)
            with patch.object(telemetry, 'RUN_KIND', 'developer_demo'):
                app.start(dict(payload, tester='P99'))
            session = app.start(dict(payload, tester='p01'))['session']
            other = app.start(dict(payload, tester='03'))['session']
            app.start(dict(payload, tester='Team2'))
            app.start(dict(payload, tester='P01'))
            app.action({'session':session, 'action':'hint'})
            app.action({'session':session, 'action':'check', 'answer':'9'})
            self.assertEqual(live_results.snapshot(),[])
            app.action({'session':other,'action':'check','answer':'4'})
            app.action({'session':session, 'action':'check', 'answer':'4'})
            for problem, answer in [('T02','7'),('T01','hello')]:
                app.transfer({'session':session,'problem_id':problem,'answer':answer})
                with self.assertRaises(app.UserError):
                    app.rate_help({'session':session,'rating':'somewhat'})
            for problem, answer in [('T01','1'),('T01','3')]:
                app.transfer({'session':session,'problem_id':problem,'answer':answer})
            with self.assertRaises(app.UserError):
                app.rate_help({'session':session,'rating':'invalid'})
            with patch.object(Path, 'open', side_effect=OSError), self.assertRaises(app.UserError):
                app.rate_help({'session':session,'rating':'somewhat'})
            self.assertTrue(all(r['help_rating'] is None for r in live_results.snapshot()))
            for rating in ['very','not_helpful','not_viewed','somewhat','somewhat']:
                app.rate_help({'session':session,'rating':rating})
            self.assertEqual(sum(r['event'] == 'rate_help' for r in app.SESSIONS[session]['_trace_rows']),4)
            rows = live_results.snapshot()
            self.assertCountEqual([r['tester'] for r in rows], ['P01','03'])
            row = next(r for r in rows if r['independent_checks'])
            self.assertEqual((row['practice'],row['independent_first'],row['independent_latest']), (True,False,True))
            self.assertEqual(row['equation'],'2x + 3 = 11')
            self.assertEqual(row['independent_checks'], 2)
            self.assertEqual(row['help_rating'],'somewhat')
            self.assertTrue(all(r['help_rating'] is None for r in rows if r is not row))
            live_results.restore(Path(tmp))
            self.assertEqual(rows,live_results.snapshot())
