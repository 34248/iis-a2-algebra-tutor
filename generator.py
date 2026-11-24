"""Create local paired algebra exercises. All coefficients and answers are exact."""
from fractions import Fraction
from math import lcm
import random


LEVELS = ('Warm-up', 'Signed numbers', 'Fractions', 'Multi-step', 'Challenge')


def offset(value):
    return f'+ {value}' if value >= 0 else f'- {abs(value)}'


def exercise(level, rng):
    a, b, c = rng.randint(2, 9), rng.randint(1, 12), rng.randint(1, 9)
    if level == 'Warm-up':
        answer = rng.choice((-1, 1)) * rng.randint(1, 18)
        question = f'{a}x + {b} = {a*answer+b}'
        lines = [(f'Subtract {b} from both sides', f'{a}x = {a*answer}')]
        divisor = a
    elif level == 'Signed numbers':
        answer = rng.randint(-18, -1)
        question = f'-{a}x - {b} = {-a*answer-b}'
        lines = [(f'Add {b} to both sides', f'-{a}x = {-a*answer}')]
        divisor = -a
    elif level == 'Fractions':
        right = rng.randint(-8, 8)
        if (right*c - b) % a == 0:
            b += 1
        answer = Fraction(right*c - b, a)
        question = f'({a}x + {b})/{c} = {right}'
        lines = [(f'Multiply both sides by {c}', f'{a}x + {b} = {right*c}'),
                 (f'Subtract {b} from both sides', f'{a}x = {right*c-b}')]
        divisor = a
    elif level == 'Multi-step':
        d = rng.randint(1, a-1)
        right_constant = rng.randint(-16, 18)
        question = f'{a}(x - {b}) = {d}x {offset(right_constant)}'
        divisor = a-d
        numerator = right_constant+a*b
        answer = Fraction(numerator, divisor)
        lines = [('Expand the brackets', f'{a}x - {a*b} = {d}x {offset(right_constant)}'),
                 (f'Subtract {d}x from both sides', f'{divisor}x - {a*b} = {right_constant}'),
                 (f'Add {a*b} to both sides', f'{divisor}x = {numerator}')]
    elif level == 'Challenge':
        m, n = rng.sample(range(2, 8), 2)
        multiple = lcm(m, n)
        k, j = multiple//m, multiple//n
        # Choose the coefficient gap large enough for a nonzero x coefficient.
        d = rng.randint(1, 5)
        a = d + j//k + rng.randint(1, 4)
        e = rng.randint(1, 12)
        question = f'({a}x + {b})/{m} - (x + {c})/{n} = ({d}x + {e})/{m}'
        left = k*a-j
        constant = k*b-j*c
        divisor = left-k*d
        numerator = k*e-constant
        answer = Fraction(numerator, divisor)
        lines = [(f'Multiply both sides by {multiple}', f'{k}({a}x + {b}) - {j}(x + {c}) = {k}({d}x + {e})'),
                 ('Expand the brackets', f'{k*a}x + {k*b} - {j}x - {j*c} = {k*d}x + {k*e}'),
                 ('Collect like terms', f'{left}x {offset(constant)} = {k*d}x + {k*e}'),
                 ('Collect the x terms', f'{divisor}x = {numerator}')]
    else:
        raise ValueError('Choose a listed difficulty.')
    lines.append((f'Divide both sides by {divisor}', f'x = {answer}'))
    return {'question': question, 'answer': str(answer), 'difficulty': level,
            'equation_steps': [line for _, line in lines],
            'steps': [f'{action}: {line}.' for action, line in lines] +
                     ['Check by substitution: ' + question.replace('x', f'({answer})') + '.']}


def pair(level, identifier, used, rng=random):
    selected = []
    for _ in range(250):
        item = exercise(level, rng)
        if item['question'] in used or any(p['answer'] == item['answer'] for p in selected):
            continue
        selected.append(item)
        if len(selected) == 2:
            practice, partner = selected
            practice.update(id='G'+identifier, transfer_id='U'+identifier)
            return practice, {'id': practice['transfer_id'], 'question': partner['question'],
                             'difficulty': level, 'answer': partner['answer']}
    raise ValueError('No unused pair found. Try a different difficulty.')
