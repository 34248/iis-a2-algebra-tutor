"""Technical checks, not participant testing or evidence of learning gains."""
import contextlib,io,unittest
from unittest.mock import patch
import app
class TutorChecks(unittest.TestCase):
    def setUp(self):
        app.SESSIONS.clear();self.quiet=patch.object(app,'log_context',lambda p:None);self.quiet.start();self.addCleanup(self.quiet.stop)
    def start(self,**kw):return app.start({'problem_id':'A01','question':'2x + 3 = 11',**kw})
    def act(self,d,action,**kw):return app.action({'session':d['session'],'action':action,**kw})
    def test_gradual_first_hint_requires_only_a_request(self):
        d=self.start();self.assertEqual(d['steps'],[]);first=self.act(d,'hint');self.assertEqual(first['shown'],1);self.assertEqual(first['attempt_count'],0)
    def test_attempt_then_one_step_at_a_time(self):
        d=self.start();self.act(d,'attempt',attempt='Subtract 3');self.assertEqual(self.act(d,'hint')['shown'],1);self.assertEqual(self.act(d,'hint')['shown'],2)
    def test_conditions_share_identical_checked_content(self):
        for p in app.PROBLEMS.values():
            a=self.start(problem_id=p['id'],question=p['question']);b=self.start(problem_id=p['id'],question=p['question'],condition='immediate')
            self.act(a,'attempt',attempt='Try isolating x')
            for _ in p['steps']:a=self.act(a,'hint')
            self.assertEqual(a['steps'],b['steps']);self.assertFalse(a['next_hint_allowed'])
    def test_revised_rejects_incomplete_input(self):
        d=self.start(question='2x + = 11');self.assertEqual(d['status'],'blocked');self.assertEqual(d['steps'],[])
        with self.assertRaises(app.UserError):self.act(d,'hint')
    def test_baseline_reproduces_problem_before_retest(self):
        d=self.start(question='2x + = 11',version='baseline');self.assertEqual(d['shown'],3);self.assertIn('Known baseline error',d['reply'])
        fixed=self.start(question='2x + = 11');self.assertEqual(fixed['shown'],0)
    def test_corrected_input_can_restart(self):
        self.start(question='2x + = 11');d=self.start();self.act(d,'attempt',attempt='Subtract 3');self.assertEqual(self.act(d,'hint')['shown'],1)
    def test_empty_attempt_is_not_counted(self):
        d=self.start()
        with self.assertRaises(app.UserError):self.act(d,'attempt',attempt='  ')
        self.assertEqual(self.act(d,'hint')['attempt_count'],0)
    def test_sessions_do_not_share_progress(self):
        a=self.start();b=self.start();self.act(a,'attempt',attempt='Subtract');self.act(a,'hint');self.assertEqual(self.act(b,'hint')['shown'],1);self.assertEqual(self.act(a,'hint')['shown'],2)
    def test_unavailable_keeps_existing_progress(self):
        a=self.start();self.act(a,'attempt',attempt='Subtract');self.act(a,'hint');d=self.act(a,'hint',unavailable=True);self.assertEqual(d['shown'],1);self.assertIn('unavailable',d['reply'])
    def test_malformed_model_does_not_release_steps(self):
        d=self.start();self.act(d,'attempt',attempt='Subtract')
        with patch.object(app.model,'call_json',return_value={'steps':['invented']}):r=self.act(d,'hint')
        self.assertEqual(r['steps'],[]);self.assertIn('invalid',r['reply'])
    def test_final_answer_and_bad_fraction_do_not_reveal_solution(self):
        d=self.start();self.assertIn('Correct',self.act(d,'check',answer='x=4')['reply']);self.assertIn('does not match',self.act(d,'check',answer='8')['reply']);self.assertEqual(self.act(d,'check',answer='1/0')['steps'],[])
    def test_unassisted_problems_have_no_hint_output(self):
        for pid,ans in [('T01','3'),('T02','4')]:
            d=app.transfer({'problem_id':pid,'answer':ans});self.assertTrue(d['correct']);self.assertEqual(d['steps'],[])
    def test_unsupported_equation_is_not_solved(self):
        d=self.start(question='x squared = 9');self.assertEqual(d['status'],'blocked');self.assertEqual(d['steps'],[])
if __name__=='__main__':unittest.main(verbosity=2)
