"""Deterministic tutor simulation, not a live language model.
The same prechecked solution steps are used in both conditions.
"""
import json
SCHEMA={'required':['reply','steps','accepted','simulated']}
def call_json(parts, schema):
    data=json.loads(next(p['content'] for p in parts if p['role']=='tool'))
    p=data['problem']; count=data['reveal_count']
    return {'reply':'Checked steps are shown below. This is a fixed-content tutor simulation.',
            'steps':p['steps'][:count],'accepted':True,'simulated':True}
