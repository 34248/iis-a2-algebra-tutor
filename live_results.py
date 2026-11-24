"""Summaries for explicitly labelled local testing sessions."""
import json

_sessions = {}


def update(row):
    code = row.get('tester')
    if not code or row['run_kind'].startswith('developer'):
        return
    trace = row['trace_id']
    summary = _sessions.setdefault(trace, {
        'tester': code, 'started': row['timestamp_utc'], 'problem': row['practice_problem'],
        'mode': row['condition'], 'partner': row['paired_problem'], 'practice': None,
        'independent_first': None, 'independent_latest': None, 'independent_checks': 0,
        'help_rating': None, 'completed': False, 'equation': row.get('practice_equation', ''),
    })
    summary.update(updated=row['timestamp_utc'], shown=row['shown_steps'], attempts=row['attempt_count'],
                   step_checks=row['step_checks'], answer_checks=row['answer_checks'])
    if row['event'] == 'check' and type(row['final_correct']) is bool:
        summary['practice'] = row['final_correct']
        if row['final_correct']:
            summary['completed'] = True
    if row['event'] == 'rate_help':
        summary['help_rating'] = row['help_rating']
    if row['event'] == 'unassisted_check' and row['transfer_problem'] == summary['partner']:
        if summary['independent_checks'] == 0:
            summary['independent_first'] = row['correct']
        summary['independent_checks'] += 1
        summary['independent_latest'] = row['correct']


def restore(directory):
    _sessions.clear()
    for path in directory.glob('*.jsonl'):
        with path.open(encoding='utf-8') as stream:
            for line in stream:
                try:
                    row = json.loads(line)
                except json.JSONDecodeError:
                    continue
                update(row)


def snapshot(catalogue=None):
    order = sorted(_sessions, key=lambda trace: (_sessions[trace]['started'], trace), reverse=True)
    rows = []
    for trace in order:
        summary = _sessions[trace]
        if summary['completed']:
            row = summary.copy()
            if not row['equation'] and catalogue:
                row['equation'] = catalogue.get(row['problem'], {}).get('question', '')
            rows.append(row)
    return rows
