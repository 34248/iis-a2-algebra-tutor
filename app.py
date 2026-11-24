"""Local fixed-content algebra tutor. Python standard library only."""
import argparse
import copy
import json
import logging
import re
import secrets
import sys
import threading
from fractions import Fraction
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

# The prepared standalone runtime does not automatically add this directory.
ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import model
import telemetry
import algebra
import generator
import live_results

LOGGER = logging.getLogger(__name__)
PROBLEMS = {item['id']: item for item in json.loads(
    (ROOT / 'problems.json').read_text(encoding='utf-8'))}
TRANSFER = {item['id']: item for item in json.loads(
    (ROOT / 'transfer.json').read_text(encoding='utf-8'))}
algebra.validate_catalog(PROBLEMS, TRANSFER)
SESSIONS = {}
LOCK = threading.RLock()
NUMBER = r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)'
ANSWER_PATTERN = re.compile(
    rf'(?:x\s*=\s*)?({NUMBER})(?:\s*/\s*({NUMBER}))?', re.IGNORECASE)
ANSWER_FORMAT = 'Enter a number or fraction, optionally starting with x =.'
CHECKED_REPLY = ('Checked steps are shown below. '
                 'This is a fixed-content tutor simulation.')


class UserError(ValueError):
    """Input that the interface can explain without a server error."""


def log_context(parts):
    """Keep free-text attempts and checked solutions out of terminal logs."""
    LOGGER.debug('Tutor context roles: %s', [part.get('role') for part in parts])


def norm(value):
    return re.sub(r'\s+', '', value.lower().replace('−', '-').replace('×', '*'))


def text(value, label, limit=500):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise UserError(f'{label} must contain 1 to {limit} characters.')
    return value.strip()


def parse_answer(value):
    """Parse numbers and fractions exactly, without evaluating expressions."""
    match = ANSWER_PATTERN.fullmatch(text(value, 'Answer'))
    if not match:
        raise UserError(ANSWER_FORMAT)
    try:
        numerator = Fraction(match.group(1))
        denominator = Fraction(match.group(2)) if match.group(2) else Fraction(1)
        return numerator / denominator
    except (ValueError, ZeroDivisionError):
        raise UserError('Enter a valid number or fraction with a nonzero denominator.') from None


def session_for(payload):
    identifier = payload.get('session')
    state = SESSIONS.get(identifier) if isinstance(identifier, str) else None
    if state is None:
        raise UserError('Start a new practice session first.')
    return state


def public(state, reply=''):
    problem = PROBLEMS[state['problem_id']]
    return {
        'session': state['session'], 'problem_id': problem['id'],
        'question_received': state['question'], 'condition': state['condition'],
        'version': state['version'], 'status': state['status'],
        'reply': reply or state['reply'], 'steps': copy.deepcopy(state['steps']),
        'shown': len(state['steps']), 'total_steps': len(problem['steps']),
        'attempt_count': len(state['attempts']),
        'events': copy.deepcopy(state['events']),
        'next_hint_allowed': (state['status'] == 'ready' and
                              bool(state['attempts']) and
                              len(state['steps']) < len(problem['steps'])),
        'simulated': True,
        'step_feedback': copy.deepcopy(state['step_feedback']),
        'equation_feedback': state['equation_feedback'],
        'step_checks': state['step_checks'], 'answer_checks': state['answer_checks'],
        'solved': state['final_correct'] is True,
        'transfer_id': problem['transfer_id'], 'difficulty': problem['difficulty'],
    }


def run_model(state, count):
    problem = PROBLEMS[state['problem_id']]
    parts = [
        {'role': 'system', 'content': (
            'Offline tutor simulation. Return only the requested prefix of the '
            'fixed checked solution; never invent missing problem content.')},
        {'role': 'tool', 'name': 'checked_problem_state', 'content': json.dumps({
            'problem': problem, 'condition': state['condition'],
            'reveal_count': count, 'attempts': state['attempts']})},
        {'role': 'user', 'content': state['question']},
    ]
    log_context(parts)
    try:
        data = model.call_json(parts, model.SCHEMA)
    except Exception:
        # A failure at the response boundary must not advance tutoring state.
        state['reply'] = ('Tutor analysis is unavailable. Your progress is '
                          'unchanged. Retry when available.')
        return public(state)

    valid = (
        isinstance(data, dict) and
        data.get('accepted') is True and data.get('simulated') is True and
        isinstance(data.get('reply'), str) and bool(data['reply'].strip()) and
        isinstance(data.get('steps'), list) and
        data['steps'] == problem['steps'][:count]
    )
    if not valid:
        state['reply'] = ('Tutor output was invalid. No additional steps were '
                          'released; retry or ask a tutor.')
        return public(state)
    state['steps'] = copy.deepcopy(data['steps'])
    # Validate the frame, but display a controller-owned acknowledgement: a
    # free-text reply must not bypass the checked-step release boundary.
    state['reply'] = CHECKED_REPLY
    return public(state)


def _start(payload):
    pid = payload.get('problem_id')
    condition = payload.get('condition', 'gradual')
    version = payload.get('version', 'revised')
    if (not isinstance(pid, str) or pid not in PROBLEMS or
            not isinstance(condition, str) or condition not in {'gradual', 'immediate'} or
            not isinstance(version, str) or version not in {'baseline', 'revised'}):
        raise UserError('Choose a listed problem, condition and version.')
    question = text(payload.get('question'), 'Equation')
    tester = payload.get('tester', '')
    if not isinstance(tester, str) or not re.fullmatch(r'[A-Za-z0-9]{0,6}', tester.strip()):
        raise UserError('Use up to 6 letters or digits, or leave the code blank.')
    state = {
        'tester': tester.strip().upper(), 'paired_problem': PROBLEMS[pid]['transfer_id'],
        'session': secrets.token_urlsafe(24), 'problem_id': pid,
        'question': question, 'condition': condition, 'version': version,
        'status': 'ready', 'steps': [], 'attempts': [], 'events': [], 'reply': '',
        'step_feedback': None, 'step_checks': 0, 'answer_checks': 0, 'final_correct': None,
        'equation_feedback': payload.get('equation_feedback', True) is not False,
    }
    SESSIONS[state['session']] = state
    mismatch = norm(question) != norm(PROBLEMS[pid]['question'])
    if version == 'revised' and mismatch:
        state['status'] = 'blocked'
        state['reply'] = ('Equation is incomplete or does not match the selected '
                          'checked problem. Correct it and start again. No solution '
                          'has been guessed.')
        state['events'].append('Input validation blocked a mismatched equation.')
        return public(state)
    if version == 'baseline' and mismatch:
        state['events'].append('INTENTIONAL BASELINE FAILURE: ignored the '
                               'entered equation and used the selected exercise.')
        run_model(state, len(PROBLEMS[pid]['steps']))
        if state['steps'] != PROBLEMS[pid]['steps']:
            return public(state)
        state['reply'] = ('Known baseline error: assumed the selected exercise and '
                          'disclosed its full solution despite incomplete input.')
        return public(state)
    if payload.get('unavailable') is True:
        state['reply'] = ('Tutor analysis is unavailable. No steps were released. '
                          'Retry after unchecking the unavailable option.')
        return public(state)
    if condition == 'immediate':
        return run_model(state, len(PROBLEMS[pid]['steps']))
    state['reply'] = ('Try a step first. Your attempt unlocks the first hint; '
                      'it is recorded, not automatically graded.')
    return public(state)


def _action(payload):
    state = session_for(payload)
    if state['status'] != 'ready':
        raise UserError('Correct the equation and start again before requesting help.')
    verb = payload.get('action')
    if verb == 'attempt':
        state['step_feedback'] = None
        state['attempts'].append(text(payload.get('attempt'), 'Attempt', limit=2500))
        state['events'].append('Attempt recorded; not automatically graded.')
        state['reply'] = 'Attempt recorded. Select Next hint when you want one checked step.'
    elif verb == 'check_step':
        if not state['equation_feedback']:
            raise UserError('Equation feedback is disabled for this comparison. Record an attempt or request an available worked step.')
        proposed = payload.get('attempt')
        text(proposed, 'Your working', limit=2500)
        feedback = algebra.check_step(PROBLEMS[state['problem_id']]['question'], proposed)
        state['attempts'].append(proposed)
        state['step_checks'] += 1
        state['step_feedback'] = feedback
        state['reply'] = feedback['reply']
        result = 'equivalent' if feedback['equivalent'] else 'not equivalent' if feedback['valid'] else 'not checkable'
        state['events'].append('Equation check: ' + result + '.')
    elif verb == 'hint':
        if payload.get('unavailable') is True:
            return public(state, 'Tutor analysis is unavailable. Your progress is '
                          'unchanged. Retry when available.')
        if state['condition'] != 'gradual':
            return public(state, 'All checked steps are already visible in immediate mode.')
        if not state['attempts']:
            return public(state, 'Enter an attempt before requesting a hint. No steps were released.')
        state['events'].append('Requested one next hint.')
        return run_model(state, min(len(state['steps']) + 1,
                                    len(PROBLEMS[state['problem_id']]['steps'])))
    elif verb == 'check':
        state['final_correct'] = None
        try:
            answer = parse_answer(payload.get('answer'))
        except UserError as error:
            return public(state, str(error) + ' No steps were released.')
        correct = answer == Fraction(str(PROBLEMS[state['problem_id']]['answer']))
        state['answer_checks'] += 1
        state['final_correct'] = correct
        state['events'].append('Checked final numeric answer: ' + str(correct))
        return public(state, 'Correct final answer for this checked problem.' if correct else
                      'That final answer does not match this problem. Check your own '
                      'working or request the next available hint.')
    else:
        raise UserError('Unknown tutor action.')
    return public(state)


def _transfer(payload):
    pid = payload.get('problem_id')
    if not isinstance(pid, str) or pid not in TRANSFER:
        raise UserError('Choose a listed unassisted problem.')
    result = {'steps': [], 'note': 'Self-practice only. No research participant '
              'study or learning-effect claim.'}
    try:
        answer = parse_answer(payload.get('answer'))
    except UserError as error:
        return {**result, 'reply': str(error), 'correct': None, 'valid': False}
    correct = answer == Fraction(str(TRANSFER[pid]['answer']))
    return {**result, 'reply': 'Correct.' if correct else 'Not correct; try again without help.',
            'correct': correct, 'valid': True}


def record_result(data, event):
    state = session_for(data)
    feedback = state['step_feedback'] or {}
    telemetry.record(state, event, step_equivalent=feedback.get('equivalent') if event == 'check_step' else '')
    return data


def start(payload):
    # State change, response snapshot and trace belong to the same operation.
    with LOCK:
        return record_result(_start(payload), 'start')


def action(payload):
    with LOCK:
        return record_result(_action(payload), payload.get('action', 'unknown'))


def transfer(payload):
    with LOCK:
        state = session_for(payload) if payload.get('session') is not None else None
        data = _transfer(payload)
        if state is not None:
            telemetry.record(state, 'unassisted_check' if data['valid'] else
                             'unassisted_invalid', transfer_problem=payload['problem_id'],
                             correct=data['correct'])
        return data


def export_trace(payload):
    with LOCK:
        return telemetry.export(session_for(payload))


def catalogue_item(item):
    return {key: item[key] for key in ('id', 'question', 'difficulty', 'transfer_id') if key in item}


def restore_pairs():
    for path in sorted((telemetry.DATA_DIR / 'generated').glob('*.json')):
        practice, partner = json.loads(path.read_text(encoding='utf-8'))
        algebra.validate_catalog({practice['id']: practice}, {partner['id']: partner})
        PROBLEMS[practice['id']] = practice
        TRANSFER[partner['id']] = partner


def generate_pair(payload):
    level = payload.get('difficulty')
    if level not in generator.LEVELS:
        raise UserError('Choose a listed difficulty.')
    with LOCK:
        identifier = secrets.token_hex(4).upper()
        directory = telemetry.DATA_DIR / 'generated'
        directory.mkdir(parents=True, exist_ok=True)
        while (directory / (identifier + '.json')).exists():
            identifier = secrets.token_hex(4).upper()
        used = {p['question'] for bank in (PROBLEMS, TRANSFER) for p in bank.values()}
        practice, partner = generator.pair(level, identifier, used)
        algebra.validate_catalog({practice['id']: practice}, {partner['id']: partner})
        target = directory / (identifier + '.json')
        temporary = target.with_suffix('.tmp')
        try:
            temporary.write_text(json.dumps([practice, partner]), encoding='utf-8')
            temporary.replace(target)
        finally:
            temporary.unlink(missing_ok=True)
        PROBLEMS[practice['id']] = practice
        TRANSFER[partner['id']] = partner
        return {'practice': catalogue_item(practice), 'partner': catalogue_item(partner)}


class Handler(BaseHTTPRequestHandler):
    def respond(self, data, status=200):
        self.send_body(json.dumps(data).encode(), 'application/json; charset=utf-8', status)

    def send_body(self, body, content_type, status=200):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlsplit(self.path).path
        if route == '/api/results':
            if self.headers.get('Host') not in {f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'}:
                return self.respond({'error':'Use the local results page.'}, 403)
            with telemetry.LOCK:
                sessions = live_results.snapshot()
            return self.respond({'sessions': sessions})
        if route == '/api/config':
            with LOCK:
                config = {'lab4': False, 'app_id': 'iis-algebra-tutor', 'version': '4',
                          'local_generation': True,
                          'problems': [catalogue_item(p) for p in PROBLEMS.values()],
                          'transfer': [catalogue_item(p) for p in TRANSFER.values()]}
            return self.respond(config)
        assets = {
            '/results.html': ('results.html', 'text/html; charset=utf-8'),
            '/results.js': ('results.js', 'text/javascript; charset=utf-8'),
            '/': ('index.html', 'text/html; charset=utf-8'),
            '/index.html': ('index.html', 'text/html; charset=utf-8'),
            '/client.js': ('client.js', 'text/javascript; charset=utf-8'),
            '/style.css': ('style.css', 'text/css; charset=utf-8'),
        }
        if route not in assets:
            return self.respond({'error': 'Not found'}, 404)
        filename, content_type = assets[route]
        self.send_body((ROOT / filename).read_bytes(), content_type)

    def do_POST(self):
        try:
            origin = self.headers.get('Origin')
            port = self.server.server_port
            if origin and origin not in {f'http://127.0.0.1:{port}', f'http://localhost:{port}'}:
                return self.respond({'error': 'Use the local app origin.'}, 403)
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 20000:
                raise UserError('Invalid request size.')
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise UserError('A JSON object is required.')
            if urlsplit(self.path).path == '/api/generate' and (
                    self.headers.get('Host') not in {f'localhost:{port}', f'127.0.0.1:{port}'} or
                    self.headers.get_content_type() != 'application/json'):
                return self.respond({'error': 'Use the local practice page.'}, 403)
            actions = {'/api/start': start, '/api/action': action, '/api/generate': generate_pair,
                       '/api/transfer': transfer, '/api/export': export_trace}
            handler = actions.get(urlsplit(self.path).path)
            if handler is None:
                return self.respond({'error': 'Not found'}, 404)
            return self.respond(handler(payload))
        except (UserError, ValueError, KeyError, TypeError) as error:
            return self.respond({'error': str(error)}, 400)
        except Exception:
            return self.respond({'error': 'The local service could not complete this '
                                 'request. Retry or inspect the terminal.'}, 500)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--open', action='store_true', help='Open the local browser after startup')
    args = parser.parse_args()
    restore_pairs()
    live_results.restore(telemetry.DATA_DIR)
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError:
        if args.port == 0:
            raise
        server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    print(f'AI tutoring prototype: http://127.0.0.1:{server.server_port}', flush=True)
    print('Offline fixed-content simulation; no participant study, live AI or external account.', flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(f'http://127.0.0.1:{server.server_port}')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
