"""Local technical traces. No free-text attempts or participant identities are persisted."""
import csv,io,json,os,secrets,threading,time
from pathlib import Path
from datetime import datetime,timezone

DATA_DIR=Path(os.environ.get('TUTOR_DATA_DIR',str(Path(__file__).parent/'data')))
RUN_KIND=os.environ.get('TUTOR_RUN_KIND','local_inspection')
FIELDS=['trace_id','run_kind','timestamp_utc','elapsed_ms','event','practice_problem','condition','version','status','shown_steps','attempt_count','transfer_problem','correct','step_checks','step_equivalent','answer_checks','final_correct','equation_feedback']
LOCK=threading.RLock()

def record(session,event,**extra):
    with LOCK:
        if 'trace_id' not in session:
            session['trace_id']=secrets.token_hex(8);session['_trace_start']=time.monotonic()
        row={'trace_id':session['trace_id'],'run_kind':RUN_KIND,'timestamp_utc':datetime.now(timezone.utc).isoformat(),
             'elapsed_ms':round((time.monotonic()-session['_trace_start'])*1000),'event':event,
             'practice_problem':session['problem_id'],'condition':session['condition'],'version':session['version'],
             'status':session['status'],'shown_steps':len(session['steps']),'attempt_count':len(session['attempts']),
             'transfer_problem':extra.get('transfer_problem',''),'correct':extra.get('correct',''),'step_checks':session.get('step_checks',0),
             'step_equivalent':extra.get('step_equivalent',''),'answer_checks':session.get('answer_checks',0),
             'final_correct':session.get('final_correct',''),'equation_feedback':session.get('equation_feedback',True)}
        session.setdefault('_trace_rows',[]).append(row)
        try:
            DATA_DIR.mkdir(parents=True,exist_ok=True)
            with (DATA_DIR/(session['trace_id']+'.jsonl')).open('a',encoding='utf-8') as f:f.write(json.dumps(row)+'\n')
        except OSError:
            session['_trace_save_error']=True
        return row

def export(session):
    with LOCK:
        rows=session.get('_trace_rows',[]);buf=io.StringIO(newline='');writer=csv.DictWriter(buf,fieldnames=FIELDS)
        writer.writeheader();writer.writerows(rows)
        return {'filename':'tutor-trace-'+session.get('trace_id','empty')+'.csv','csv':buf.getvalue(),'rows':len(rows),
                'local_file_saved':not session.get('_trace_save_error',False),'note':'Technical interaction trace, not a participant learning-effect study.'}
