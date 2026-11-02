import csv,io,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import app,telemetry

class TraceChecks(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup)
        for target,value in [('DATA_DIR',Path(self.tmp.name)),('RUN_KIND','developer_check')]:
            p=patch.object(telemetry,target,value);p.start();self.addCleanup(p.stop)
        q=patch.object(app,'log_context',lambda p:None);q.start();self.addCleanup(q.stop);app.SESSIONS.clear()
    def start(self,**kw):return app.start({'problem_id':'A01','question':'2x + 3 = 11',**kw})
    def test_export_contains_actions_not_free_text_or_session_tokens(self):
        d=self.start();secret='Private free-text sentence'
        app.action({'session':d['session'],'action':'attempt','attempt':secret})
        app.action({'session':d['session'],'action':'hint'})
        app.transfer({'session':d['session'],'problem_id':'T01','answer':'3'})
        result=app.export_trace({'session':d['session']});rows=list(csv.DictReader(io.StringIO(result['csv'])))
        self.assertEqual([r['event'] for r in rows],['start','attempt','hint','unassisted_check'])
        self.assertEqual(rows[2]['shown_steps'],'1');self.assertEqual(rows[-1]['correct'],'True')
        persisted=''.join(p.read_text() for p in Path(self.tmp.name).glob('*.jsonl'))
        self.assertNotIn(secret,result['csv']+persisted);self.assertNotIn(d['session'],result['csv']+persisted)
    def test_trace_export_is_scoped_to_each_session(self):
        a=self.start();b=self.start(condition='immediate')
        self.assertNotEqual(app.export_trace({'session':a['session']})['filename'],app.export_trace({'session':b['session']})['filename'])
        self.assertEqual(app.export_trace({'session':a['session']})['rows'],1)
    def test_unknown_export_refuses(self):
        with self.assertRaises(app.UserError):app.export_trace({'session':'missing'})
    def test_disk_error_keeps_practice_usable_and_reports_export_status(self):
        p=Path(self.tmp.name)/'file';p.write_text('not a directory')
        with patch.object(telemetry,'DATA_DIR',p):d=self.start()
        self.assertFalse(app.export_trace({'session':d['session']})['local_file_saved'])
    def test_invalid_hint_is_recorded_as_no_step_release(self):
        d=self.start();app.action({'session':d['session'],'action':'hint'})
        rows=list(csv.DictReader(io.StringIO(app.export_trace({'session':d['session']})['csv'])))
        self.assertEqual(rows[-1]['shown_steps'],'0')

if __name__=='__main__':unittest.main()
