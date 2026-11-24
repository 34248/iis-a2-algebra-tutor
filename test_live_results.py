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
            app.start(dict(payload, tester='03'))
            app.start(dict(payload, tester='Team2'))
            app.start(dict(payload, tester='P01'))
            app.action({'session':session, 'action':'check', 'answer':'4'})
            for problem, answer in [('T02','7'),('T01','hello'),('T01','1'),('T01','3')]:
                app.transfer({'session':session,'problem_id':problem,'answer':answer})
            rows = live_results.snapshot()
            self.assertCountEqual([r['tester'] for r in rows], ['P01','P01','03','TEAM2'])
            row = next(r for r in rows if r['independent_checks'])
            self.assertEqual((row['practice'],row['independent_first'],row['independent_latest']), (True,False,True))
            self.assertEqual(row['independent_checks'], 2)
            live_results.restore(Path(tmp))
            self.assertEqual(rows,live_results.snapshot())
