"""Exact checks for a deliberately limited grammar of linear equations in x.

No submitted expression is executed. Each syntax node is reduced to ax + b.
Equivalence means equal unique solutions, not a score for explanatory quality.
"""
import ast
import re
from dataclasses import dataclass
from fractions import Fraction


class EquationError(ValueError):
    pass


@dataclass(frozen=True)
class Linear:
    coefficient: Fraction = Fraction(0)
    constant: Fraction = Fraction(0)

    def add(self, other):
        return Linear(self.coefficient + other.coefficient,
                      self.constant + other.constant)

    def scale(self, factor):
        return Linear(self.coefficient * factor, self.constant * factor)


def expression(source):
    source = source.strip().lower().replace('−', '-').replace('×', '*').replace('÷', '/')
    if (not source or len(source) > 160 or
            not re.fullmatch(r'[0-9x\s.+*/()\-]+', source)):
        raise EquationError('Use numbers, x, parentheses and +, -, * or / in one linear equation.')
    if any(len(token.replace('.', '')) > 18 for token in re.findall(r'\d+(?:\.\d*)?', source)):
        raise EquationError('Use shorter numbers for this practice check.')
    source = re.sub(r'(?<=\d)\s*(?=[x(])', '*', source)
    source = re.sub(r'(?<=x)\s*(?=\()', '*', source)
    source = re.sub(r'(?<=\))\s*(?=[x(\d])', '*', source)
    try:
        tree = ast.parse(source, mode='eval')
    except (SyntaxError, RecursionError):
        raise EquationError('This line is incomplete. Include a complete expression on both sides of =.') from None
    if sum(1 for _ in ast.walk(tree)) > 80:
        raise EquationError('Use a shorter line of working.')

    def reduce(node):
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            return Linear(constant=Fraction(ast.get_source_segment(source, node)))
        if isinstance(node, ast.Name) and node.id == 'x':
            return Linear(coefficient=Fraction(1))
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            return reduce(node.operand).scale(-1 if isinstance(node.op, ast.USub) else 1)
        if isinstance(node, ast.BinOp):
            left, right = reduce(node.left), reduce(node.right)
            if isinstance(node.op, ast.Add):
                return left.add(right)
            if isinstance(node.op, ast.Sub):
                return left.add(right.scale(-1))
            if isinstance(node.op, ast.Mult):
                if left.coefficient and right.coefficient:
                    raise EquationError('This checker supports linear equations only; do not multiply x by x.')
                return (right.scale(left.constant) if not left.coefficient
                        else left.scale(right.constant))
            if isinstance(node.op, ast.Div):
                if right.coefficient:
                    raise EquationError('This checker does not divide by an expression containing x.')
                if not right.constant:
                    raise EquationError('A denominator cannot be zero.')
                return left.scale(1 / right.constant)
        raise EquationError('Use a linear expression with +, -, * or /; powers and functions are not supported.')

    try:
        return reduce(tree.body)
    except (ValueError, ZeroDivisionError, OverflowError, RecursionError) as error:
        if isinstance(error, EquationError):
            raise
        raise EquationError('This expression could not be checked. Use a shorter linear expression.') from None


def equation(source):
    if not isinstance(source, str) or len(source) > 160 or source.count('=') != 1:
        raise EquationError('For an equation check, enter one complete equation with =. You can record a written explanation separately.')
    left, right = (expression(part) for part in source.split('='))
    difference = left.add(right.scale(-1))
    if not difference.coefficient:
        raise EquationError('Keep an equation that identifies one value of x. This line no longer does that.')
    return left, right, -difference.constant / difference.coefficient


def solution(source):
    return equation(source)[2]


def check_step(original, proposed):
    expected = solution(original)
    # A worked step can include a description before the equation.
    if isinstance(proposed, str) and proposed.count('=') == 1:
        parts = re.split(r'[:：]', proposed, maxsplit=1)
        if len(parts) == 2 and '=' not in parts[0] and re.search(r'[^\W\d_]', parts[0]):
            proposed = parts[1].strip().removesuffix('。').removesuffix('.')
    try:
        left, right, result = equation(proposed)
    except EquationError as error:
        return {'valid': False, 'equivalent': None, 'isolated': False, 'reply': str(error)}
    equivalent = expected == result
    isolated = ((left == Linear(Fraction(1), Fraction(0)) and not right.coefficient) or
                (right == Linear(Fraction(1), Fraction(0)) and not left.coefficient))
    if not equivalent:
        reply = ('This line changes the solution of the original equation. '
                 'Check the signs and apply the same operation to both sides.')
    elif isolated:
        reply = 'Equivalent equation: x is isolated. Check this value in the final answer box.'
    else:
        reply = 'Equivalent equation: this line keeps the same solution. Continue with your own next step.'
    return {'valid': True, 'equivalent': equivalent,
            'isolated': equivalent and isolated, 'reply': reply}


def validate_catalog(practice, transfer):
    """Fail startup if an authored item, pairing or checked working is inconsistent."""
    for pid, problem in practice.items():
        expected = Fraction(str(problem['answer']))
        if solution(problem['question']) != expected:
            raise ValueError(f'Incorrect authored answer: {pid}')
        for line in problem.get('equation_steps', []):
            if solution(line) != expected:
                raise ValueError(f'Incorrect authored working: {pid}')
        left, right = problem['steps'][-1].split(':', 1)[1].rstrip('.').split('=')
        if expression(left) != expression(right):
            raise ValueError(f'Incorrect substitution check: {pid}')
        partner = transfer[problem['transfer_id']]
        if solution(partner['question']) != Fraction(str(partner['answer'])):
            raise ValueError(f'Incorrect paired answer: {pid}')
        if partner['question'] == problem['question']:
            raise ValueError(f'The unaided item must be a different equation: {pid}')
