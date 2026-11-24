import random
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import app
import algebra
import generator


class GeneratedPracticeTests(unittest.TestCase):
    def test_templates_and_partners_are_exact(self):
        for level in generator.LEVELS:
            for seed in range(50):
                p, t = generator.pair(level, 'test', set(), random.Random(seed))
                algebra.validate_catalog({p['id']: p}, {t['id']: t})
                self.assertNotEqual(p['answer'], t['answer'])

    def test_generated_pair_survives_reload_and_both_modes_share_steps(self):
        with tempfile.TemporaryDirectory() as tmp, patch.object(app.telemetry, 'DATA_DIR', Path(tmp)), \
                patch.dict(app.PROBLEMS), patch.dict(app.TRANSFER), patch.dict(app.SESSIONS):
            pair = app.generate_pair({'difficulty': 'Challenge'})
            p, t = pair['practice'], pair['partner']
            self.assertNotIn('answer', p)
            self.assertNotIn('answer', t)
            del app.PROBLEMS[p['id']], app.TRANSFER[t['id']]
            app.restore_pairs()
            payload = {'problem_id': p['id'], 'question': p['question']}
            full = app.start(dict(payload, condition='immediate'))
            gradual = app.start(dict(payload, condition='gradual'))
            app.action({'session': gradual['session'], 'action': 'attempt', 'attempt': 'first attempt'})
            result = app.action({'session': gradual['session'], 'action': 'hint'})
            self.assertEqual(result['steps'], [full['steps'][0].split(':')[0]])
            self.assertEqual(full['transfer_id'], t['id'])
