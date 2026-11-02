"""Local AI tutoring interface prototype. Python standard library only."""
import argparse,copy,json,re,secrets,threading
from pathlib import Path
from fractions import Fraction
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
import model
import telemetry
ROOT=Path(__file__).resolve().parent
PROBLEMS={p['id']:p for p in json.loads((ROOT/'problems.json').read_text(encoding='utf-8'))}
SESSIONS={};LOCK=threading.RLock()
TRANSFER={'T01':{'question':'4x + 1 = 13','answer':3},'T02':{'question':'5x - 2 = 18','answer':4}}
lab4=None
class UserError(ValueError):pass

def log_context(parts):
    for part in parts:print('CONTEXT:',json.dumps(part,ensure_ascii=False),flush=True)

def norm(s):return re.sub(r'\s+','',s.lower().replace('−','-').replace('×','*'))
def text(value,label,limit=500):
    if not isinstance(value,str) or not value.strip() or len(value)>limit:raise UserError(label+' must contain 1 to '+str(limit)+' characters.')
    return value.strip()
def public(s,reply=''):
    p=PROBLEMS[s['problem_id']]
    return {'session':s['session'],'problem_id':p['id'],'question_received':s['question'],'condition':s['condition'],
            'version':s['version'],'status':s['status'],'reply':reply or s.get('reply',''),
            'steps':copy.deepcopy(s['steps']),'shown':len(s['steps']),'total_steps':len(p['steps']),
            'attempt_count':len(s['attempts']),'events':copy.deepcopy(s['events']),
            'next_hint_allowed':s['status']=='ready' and len(s['attempts'])>0 and len(s['steps'])<len(p['steps']),
            'simulated':True}
def run_model(s,count):
    p=PROBLEMS[s['problem_id']]
    parts=[{'role':'system','content':'Offline tutor simulation. Return only the requested prefix of the fixed checked solution; never invent missing problem content.'},
           {'role':'tool','name':'checked_problem_state','content':json.dumps({'problem':p,'condition':s['condition'],'reveal_count':count,'attempts':s['attempts']})},
           {'role':'user','content':s['question']}]
    log_context(parts)
    data=model.call_json(parts,model.SCHEMA)
    if not isinstance(data,dict) or not all(k in data for k in model.SCHEMA['required']) or data['steps']!=p['steps'][:count]:
        s['reply']='Tutor output was invalid. No additional steps were released; retry or ask a tutor.'
        return public(s)
    s['steps']=data['steps'];s['reply']=data['reply'];return public(s)

def _start(payload):
    pid=payload.get('problem_id');condition=payload.get('condition','gradual');version=payload.get('version','revised')
    if pid not in PROBLEMS or condition not in {'gradual','immediate'} or version not in {'baseline','revised'}:raise UserError('Choose a listed problem, condition and version.')
    q=text(payload.get('question'),'Equation')
    s={'session':secrets.token_urlsafe(24),'problem_id':pid,'question':q,'condition':condition,'version':version,
       'status':'ready','steps':[],'attempts':[],'events':[],'reply':''}
    with LOCK:
        SESSIONS[s['session']]=s
        if version=='revised' and norm(q)!=norm(PROBLEMS[pid]['question']):
            s['status']='blocked';s['reply']='Equation is incomplete or does not match the selected checked problem. Correct it and start again. No solution has been guessed.'
            s['events'].append('Input validation blocked a mismatched equation.')
            return public(s)
        if version=='baseline' and norm(q)!=norm(PROBLEMS[pid]['question']):
            s['events'].append('INTENTIONAL BASELINE FAILURE: ignored the entered equation and used the selected exercise.')
            data=run_model(s,len(PROBLEMS[pid]['steps']));s['reply']='Known baseline error: assumed the selected exercise and disclosed its full solution despite incomplete input.';return public(s)
        if payload.get('unavailable') is True:
            s['reply']='Tutor analysis is unavailable. No steps were released. Retry after unchecking the unavailable option.'
            return public(s)
        if condition=='immediate':return run_model(s,len(PROBLEMS[pid]['steps']))
        s['reply']='Try a step first. Your attempt unlocks the first hint; it is recorded, not automatically graded.'
        return public(s)

def _action(payload):
    with LOCK:
        s=SESSIONS.get(payload.get('session'))
        if not s:raise UserError('Start a new practice session first.')
        verb=payload.get('action')
        if s['status']!='ready':raise UserError('Correct the equation and start again before requesting help.')
        if verb=='attempt':
            attempt=text(payload.get('attempt'),'Attempt');s['attempts'].append(attempt);s['events'].append('Attempt recorded; not automatically graded.')
            s['reply']='Attempt recorded. Select Next hint when you want one checked step.'
        elif verb=='hint':
            if payload.get('unavailable') is True:return public(s,'Tutor analysis is unavailable. Your progress is unchanged. Retry when available.')
            if s['condition']!='gradual':return public(s,'All checked steps are already visible in immediate mode.')
            if not s['attempts']:return public(s,'Enter an attempt before requesting a hint. No steps were released.')
            s['events'].append('Requested one next hint.')
            return run_model(s,min(len(s['steps'])+1,len(PROBLEMS[s['problem_id']]['steps'])))
        elif verb=='check':
            value=text(payload.get('answer'),'Answer')
            match=re.fullmatch(r'(?:x\s*=\s*)?([+-]?\d+(?:\.\d+)?(?:/[+-]?\d+)?)',value,re.I)
            if not match:return public(s,'Enter a numeric answer, for example x = 4 or 4. No steps were released.')
            try:correct=Fraction(match.group(1))==PROBLEMS[s['problem_id']]['answer']
            except (ValueError,ZeroDivisionError):return public(s,'Enter a valid number. No steps were released.')
            s['events'].append('Checked final numeric answer: '+str(correct))
            return public(s,'Correct final answer for this checked problem.' if correct else 'That final answer does not match this problem. Check your own working or request the next available hint.')
        else:raise UserError('Unknown tutor action.')
        return public(s)

def _transfer(payload):
    pid=payload.get('problem_id');answer=text(payload.get('answer'),'Answer')
    if pid not in TRANSFER:raise UserError('Choose a listed unassisted problem.')
    m=re.fullmatch(r'(?:x\s*=\s*)?([+-]?\d+(?:\.\d+)?(?:/[+-]?\d+)?)',answer,re.I)
    try:correct=bool(m) and Fraction(m.group(1))==TRANSFER[pid]['answer']
    except (ValueError,ZeroDivisionError):correct=False
    return {'reply':'Correct.' if correct else 'Not correct; try again without help.','correct':correct,'steps':[],
            'note':'Self-practice only. No research participant study or learning-effect claim.'}


def record_result(data,event):
    s=SESSIONS.get(data.get('session'))
    if s:
        telemetry.record(s,event)
    return data

def start(payload):
    return record_result(_start(payload),'start')

def action(payload):
    return record_result(_action(payload),payload.get('action','unknown'))

def transfer(payload):
    data=_transfer(payload)
    s=SESSIONS.get(payload.get('session'))
    if s:telemetry.record(s,'unassisted_check',transfer_problem=payload.get('problem_id'),correct=data['correct'])
    return data

def export_trace(payload):
    s=SESSIONS.get(payload.get('session'))
    if not s:raise UserError('Start a practice session before exporting its trace.')
    return telemetry.export(s)

class Handler(BaseHTTPRequestHandler):
    def respond(self,data,status=200):
        body=json.dumps(data).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
    def do_GET(self):
        if self.path=='/api/config':return self.respond({'lab4':lab4 is not None,'problems':[{'id':p['id'],'question':p['question']} for p in PROBLEMS.values()],
            'transfer':[{'id':k,'question':v['question']} for k,v in TRANSFER.items()]})
        if self.path in ['/','/index.html']:path=ROOT/'index.html';ctype='text/html; charset=utf-8'
        elif self.path in ['/sample_images/sample_poster.png','/sample_images/sample_noticeboard.png'] and lab4:
            path=ROOT/self.path.lstrip('/');ctype='image/png'
        else:return self.respond({'error':'Not found'},404)
        body=path.read_bytes();self.send_response(200);self.send_header('Content-Type',ctype);self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
    def do_POST(self):
        try:
            origin=self.headers.get('Origin');port=self.server.server_port
            if origin and origin not in {f'http://127.0.0.1:{port}',f'http://localhost:{port}'}:return self.respond({'error':'Use the local app origin.'},403)
            length=int(self.headers.get('Content-Length',0))
            if not 0<length<=20000:raise UserError('Invalid request size.')
            payload=json.loads(self.rfile.read(length))
            if not isinstance(payload,dict):raise UserError('A JSON object is required.')
            if self.path=='/api/start':data=start(payload)
            elif self.path=='/api/action':data=action(payload)
            elif self.path=='/api/transfer':data=transfer(payload)
            elif self.path=='/api/export':data=export_trace(payload)
            else:return self.respond({'error':'Not found'},404)
            return self.respond(data)
        except (UserError,ValueError,KeyError,TypeError) as exc:return self.respond({'error':str(exc)},400)
        except Exception:
            return self.respond({'error':'The local service could not complete this request. No success is claimed; retry or inspect the terminal.'},500)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8000);args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print('AI tutoring prototype: http://127.0.0.1:'+str(server.server_port),flush=True)
    print('Offline fixed-content simulation; no participant study, live AI or external account.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
