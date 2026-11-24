const $ = id => document.getElementById(id);
let session = null;
let config = null;
let busy = false;
let current = null;
let checkedWorking = null;
let checkedLocations = [];
const topicNote = difficulty => ({'Warm-up': 'Two-step equations with whole numbers.', 'Signed numbers': 'Practise signs and negative values.', 'Fractions': 'Work with fractional values and coefficients.', 'Challenge': 'Practise clearing denominators, nested brackets and decimal coefficients.', 'Multi-step': 'Work with brackets, fractions and x on both sides.'})[difficulty];

function node(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

async function api(path, data) {
  $('error').hidden = true;
  const response = await fetch(path, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw Error(result.error || 'Request failed');
  return result;
}

function fail(error) {
  $('error').textContent = error.message;
  $('error').hidden = false;
}

function syncControls() {
  for (const id of ['problem', 'equation', 'condition', 'version', 'transfer', 'equation-feedback','difficulty','generate','tester']) {
    $(id).disabled = busy || !config;
  }
  $('start').disabled = busy || !config;
  $('save-attempt').disabled = $('check-answer').disabled =
    busy || !current || current.status !== 'ready';
  $('hint').disabled = busy || !current || !current.next_hint_allowed;
  $('transfer-check').disabled = busy || !config;
  $('check-step').disabled = busy || !current || current.status !== 'ready' || !current.equation_feedback;
  $('try-independent').disabled = busy || !current || !current.solved;
}

function render(result) {
  const newSession = session !== result.session;
  current = result;
  session = result.session;
  $('reply').textContent = result.reply;
  $('reply').dataset.status = result.solved ? 'good' : result.status === 'blocked' ? 'warn' : '';
  $('current-equation').textContent = result.question_received;
  $('practice-state').textContent = result.status === 'blocked' ? 'Check input' : result.solved ? 'Solved' : 'In progress';
  $('progress').textContent = (result.condition === 'gradual' ? 'Try first' : 'Worked solution') +
    ` · ${result.attempt_count} attempt${result.attempt_count === 1 ? '' : 's'} recorded`;
  $('steps').replaceChildren(...result.steps.map(step => node('li', step)));
  $('steps-empty').hidden = result.shown > 0;
  $('hint-count').textContent = `${result.shown} of ${result.total_steps} shown`;
  $('hint-progress').max = result.total_steps;
  $('hint-progress').value = result.shown;
  $('events').replaceChildren(...result.events.map(event => node('li', event)));
  $('session-facts').textContent = `${result.step_checks} equation check${result.step_checks === 1 ? '' : 's'} · ${result.answer_checks} valid answer check${result.answer_checks === 1 ? '' : 's'}`;
  const feedback = result.step_feedback;
  const showStepFeedback = feedback && checkedWorking === $('attempt').value;
  $('step-feedback').hidden = !showStepFeedback;
  $('reply').hidden = showStepFeedback && result.reply === feedback.reply;
  if (feedback) {
    $('step-feedback').textContent = feedback.reply;
    if (feedback.lines) {
      const list = document.createElement('ul');
      list.className = 'line-results';
      for (const check of feedback.lines) {
        const item = document.createElement('li');
        item.dataset.status = check.equivalent ? 'good' : 'warn';
        const label = check.equivalent ? 'correct' : check.valid ? 'changes the solution' : 'cannot check';
        const location = checkedLocations[check.line - 1];
        const position = location ? location.line : check.line;
        const part = location?.part ? ', step ' + location.part : '';
        item.append(node('strong', 'Line ' + position + part + ' · ' + label));
        if (part) item.append(' ', node('code', location.equation));
        if (!check.equivalent) item.append(node('div', check.reply));
        list.append(item);
      }
      $('step-feedback').append(list);
    }
    $('step-feedback').dataset.status = feedback.equivalent ? 'good' : 'warn';
  }
  $('completion').hidden = !result.solved;
  $('completion-summary').textContent = `${result.answer_checks} valid answer check${result.answer_checks === 1 ? '' : 's'} · ${result.shown} of ${result.total_steps} worked steps viewed. Try the paired question next.`;
  $('start').textContent = 'Start fresh';
  if (newSession) {
    $('transfer').value = result.transfer_id;
    resetUnassisted();
  }
  syncControls();
}

function bind(id, action) {
  $(id).addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    syncControls();
    try {
      await action();
    } catch (error) {
      fail(error);
    } finally {
      busy = false;
      syncControls();
    }
  });
}

function resetUnassisted() {
  $('transfer-answer').value = '';
  $('transfer-result').textContent = 'No hints or worked steps will be shown.';
  $('transfer-result').dataset.status = '';
  const item = config && config.transfer.find(item => item.id === $('transfer').value);
  if (item) $('transfer-equation').textContent = item.question;
}

function resetPractice(message) {
  $('independent').hidden = true;
  session = null;
  current = null;
  checkedWorking = null;
  $('step-feedback').hidden = true;
  $('completion').hidden = true;
  $('steps-empty').hidden = false;
  $('hint-count').textContent = 'Nothing shown yet';
  $('hint-progress').value = 0;
  $('practice-state').textContent = 'Ready to start';
  $('session-facts').textContent = 'Start a practice session to create a record.';
  $('start').textContent = 'Start practice';
  $('reply').dataset.status = '';
  for (const id of ['steps', 'events']) $(id).replaceChildren();
  $('attempt').value = '';
  $('answer').value = '';
  $('progress').textContent = 'Start a practice session.';
  $('reply').textContent = message;
  $('reply').hidden = false;
  $('error').hidden = true;
  resetUnassisted();
  syncControls();
}

bind('start', async () => {
  // Clear before waiting, preserving anything typed during the request.
  const code = $('tester').value.trim().toUpperCase();
  if (code && !/^P[0-9]{2,5}$/.test(code)) throw Error('Use a tester code such as P01, or leave it empty.');
  $('tester').value = code;
  resetPractice('Starting a new practice session.');
  render(await api('/api/start', {
    problem_id: $('problem').value,
    question: $('equation').value,
    condition: $('condition').value,
    version: $('version').value,
    tester: code,
    unavailable: $('unavailable').checked,
    equation_feedback: $('equation-feedback').checked,
  }));
  if (matchMedia('(max-width: 700px)').matches) {
    $('practice').scrollIntoView({behavior: 'smooth', block: 'start'});
  }
});

bind('save-attempt', async () => {
  checkedWorking = null;
  render(await api('/api/action', {session, action: 'attempt', attempt: $('attempt').value}));
});

// The checker accepts one equation per row. Split only at an unambiguous
// gap between consecutive equals signs, retaining the visible line numbers.
function splitWorkingLine(line) {
  const equals = [...line.matchAll(/=/g)].map(match => match.index);
  const steps = [];
  let start = 0;
  for (let i = 1; i < equals.length; i++) {
    const between = line.slice(equals[i - 1] + 1, equals[i]);
    let depth = 0;
    const boundaries = [];
    for (const token of between.matchAll(/[()]|\s+/g)) {
      if (token[0] === '(') depth++;
      else if (token[0] === ')') depth--;
      else if (depth === 0 && /[\dx)]$/i.test(between.slice(0, token.index))
          && /^[\dx(]/i.test(between.slice(token.index + token[0].length))) {
        boundaries.push(token.index);
      }
    }
    if (boundaries.length !== 1) return [line];
    const end = equals[i - 1] + 1 + boundaries[0];
    steps.push(line.slice(start, end).trim());
    start = end;
  }
  steps.push(line.slice(start).trim());
  return steps;
}

bind('check-step', async () => {
  const submitted = $('attempt').value;
  const locations = submitted.split('\n').flatMap((line, index) => {
    const parts = splitWorkingLine(line);
    return parts.map((equation, i) => ({
      line: index + 1, part: parts.length > 1 ? i + 1 : 0, equation
    }));
  });
  const result = await api('/api/action', {
    session, action: 'check_step', attempt: locations.map(entry => entry.equation).join('\n')
  });
  checkedWorking = submitted;
  checkedLocations = locations;
  render(result);
  if ($('attempt').value !== submitted) {
    $('step-feedback').hidden = true;
    $('reply').textContent = 'Your working changed while checking. Check the current line again.';
  }
});

bind('hint', async () => render(await api('/api/action', {
  session, action: 'hint', unavailable: $('unavailable').checked,
})));

bind('check-answer', async () => {
  const submitted = $('answer').value;
  render(await api('/api/action', {session, action: 'check', answer: submitted}));
  if ($('answer').value !== submitted) {
    $('reply').textContent = 'Your answer changed while checking. Check the current answer again.';
    $('completion').hidden = true;
    $('reply').dataset.status = '';
  }
});

bind('transfer-check', async () => {
  const submitted = $('transfer-answer').value;
  const result = await api('/api/transfer', {
    session, problem_id: $('transfer').value, answer: submitted,
  });
  $('transfer-result').dataset.status = $('transfer-answer').value === submitted ? (result.correct ? 'good' : 'warn') : '';
  $('transfer-result').textContent = $('transfer-answer').value === submitted
    ? result.reply
    : 'Your answer changed while checking. Check the current answer again.';
});

for (const id of ['condition', 'version', 'equation', 'equation-feedback', 'tester']) {
  $(id).addEventListener('change', () => resetPractice(
    'Setup changed. Start a new practice session.'));
}
$('problem').addEventListener('change', () => {
  const item = config.problems.find(item => item.id === $('problem').value);
  $('equation').value = item.question;
  $('current-equation').textContent = item.question;
  $('problem-kind').textContent = topicNote(item.difficulty);
  resetPractice('Problem changed. Start a new practice session.');
});
$('transfer').addEventListener('change', resetUnassisted);
$('transfer-answer').addEventListener('input', () => {
  $('transfer-result').textContent = 'Answer changed. Check it when ready.';
  $('transfer-result').dataset.status = '';
});
$('answer').addEventListener('input', () => {
  if (current) $('reply').textContent = 'Answer changed. Check it when ready.';
  $('completion').hidden = true;
  $('reply').dataset.status = '';
});

$('attempt').addEventListener('input', () => {
  $('step-feedback').hidden = true;
  $('reply').hidden = false;
  if (current) $('reply').textContent = 'Working changed. Check your equation or record your explanation.';
});
$('condition').addEventListener('change', () => {
  $('mode-description').textContent = $('condition').value === 'gradual'
    ? 'Write your first attempt to unlock a hint.'
    : 'The same checked steps appear together. You can still check your own working.';
});
$('try-independent').addEventListener('click', () => {
  if (busy || !current || !current.solved) return;
  $('transfer').value = current.transfer_id;
  resetUnassisted();
  $('independent').hidden = false;
  $('independent').scrollIntoView({behavior: 'smooth', block: 'start'});
  $('transfer-answer').focus({preventScroll: true});
});
for (const [field, button] of [['answer', 'check-answer'], ['transfer-answer', 'transfer-check']]) {
  $(field).addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); $(button).click(); }
  });
}
syncControls();
function addOption(select, item, currentOnly = false) {
  const option = node('option', currentOnly ? 'Current generated question' : item.id + ' · ' + item.difficulty);
  option.value = item.id;
  option.hidden = currentOnly;
  if (currentOnly) select.querySelector('option[hidden]')?.remove();
  select.append(option);
}

function fillCatalogue(select, items) {
  for (const item of items) {
    if (!/^[GU]/.test(item.id)) addOption(select, item);
  }
}

bind('generate', async () => {
  $('generation-status').textContent = '';
  const pair = await api('/api/generate', {difficulty: $('difficulty').value});
  config.problems.push(pair.practice);
  config.transfer.push(pair.partner);
  addOption($('problem'), pair.practice, true);
  addOption($('transfer'), pair.partner, true);
  $('problem').value = pair.practice.id;
  $('problem').dispatchEvent(new Event('change'));
  $('generation-status').textContent = 'Saved on this computer. Select Start practice to begin.';
});
$('problem').addEventListener('change', () => { $('generation-status').textContent = ''; });
(async () => {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw Error('Could not load the checked practice items. Reload to retry.');
    const loaded = await response.json();
    fillCatalogue($('problem'), loaded.problems);
    fillCatalogue($('transfer'), loaded.transfer);
    config = loaded;
    $('generator').hidden = !loaded.local_generation;
    document.querySelector('.catalog-size').replaceChildren(
      node('span', $('problem').length + ' practice items'), document.createElement('br'),
      node('span', $('transfer').length + ' new questions without hints'));
    $('problem-kind').textContent = topicNote(loaded.problems[0].difficulty);
    $('current-equation').textContent = loaded.problems[0].question;
    resetUnassisted();
    syncControls();
  } catch (error) {
    fail(error);
  }
})();

/* Shared display preferences for the three practice pages. */
function showChallenge() {
  const active = location.hash === '#two-variable';
  $('two-variable').hidden = !active;
  document.querySelector('.intro').hidden = active;
  document.querySelector('.workspace').hidden = active;
  if (active) $('system-title').focus({preventScroll:true});
}
window.addEventListener('hashchange', showChallenge);
showChallenge();

// Keep typed decimals and fractions exact when substituting in both equations.
function coordinate(value) {
  const text = value.trim().replaceAll('−', '-');
  const fraction = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(text);
  if (fraction) {
    const denominator = BigInt(fraction[2]);
    return denominator === 0n ? null : [BigInt(fraction[1]), denominator];
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
  const places = (text.split('.')[1] || '').length;
  return [BigInt(text.replace('.', '')), 10n ** BigInt(places)];
}

$('system-answer').addEventListener('submit', event => {
  event.preventDefault();
  const x = coordinate($('system-x').value);
  const y = coordinate($('system-y').value);
  const feedback = $('system-feedback');
  feedback.hidden = false;
  feedback.dataset.status = 'warn';
  if (!x || !y) {
    feedback.textContent = 'Enter a number or a fraction with a nonzero denominator for each variable.';
    return;
  }
  const scale = x[1] * y[1];
  const scaledX = x[0] * y[1];
  const scaledY = y[0] * x[1];
  const first = 3n * scaledX + 2n * scaledY === 7n * scale;
  const second = 2n * scaledX - 3n * scaledY === 9n * scale;
  if (first && second) {
    feedback.dataset.status = 'good';
    feedback.textContent = 'Correct. Your pair satisfies both equations.';
  } else if (first) {
    feedback.textContent = 'The first equation balances. Check the second.';
  } else if (second) {
    feedback.textContent = 'The second equation balances. Check the first.';
  } else {
    feedback.textContent = 'Check both equations. Substitute your x and y in each one.';
  }
});
$('system-answer').addEventListener('input', () => { $('system-feedback').hidden = true; });

function installBilingualView() {
  const labels = new Map(Object.entries({
    'Tester code (optional)': '测试者编号（可留空）',
    'Use the same code for repeat tests. Leave blank for private practice.': '同一人重复测试请用同一编号；留空则不显示在实时结果页。',
    'Use a tester code such as P01, or leave it empty.': '请输入 P01 这样的编号，或留空。',
    'Live results': '实时结果',
    'Starting again creates a separate practice record.': '重新开始会单独记录一次练习。',
    'New question difficulty': '新题难度',
    'Basic': '基础', 'Multi-step': '多步', 'Challenge': '挑战',
    'Current generated question': '当前生成题',
    'Generate a new question': '生成新题',
    'Two-variable challenge': '二元方程组挑战',
    'Back to practice': '返回一元练习',
    'Find the pair that satisfies both equations.': '求同时满足两个方程的 x 和 y。',
    'Elimination hint': '消元法提示',
    'Substitution hint': '代入法提示',
    'Multiply the first equation by 3 and the second by 2. Add the results to cancel y.': '第一个方程乘以 3，第二个乘以 2，再把两个方程相加消去 y。',
    'From the first equation, y = (7 − 3x)/2. Substitute this expression for y in the second equation.': '由第一个方程得到 y = (7 − 3x)/2，再把第二个方程中的 y 换成这个式子。',
    'Check both equations': '检验两个方程',
    'Extra practice outside the two help modes. Answers stay on this page.': '这是两种提示模式之外的额外练习，答案只在本页核对。',
    'Enter a number or a fraction with a nonzero denominator for each variable.': '请为 x 和 y 各填一个数；若填分数，分母须非零。',
    'Correct. Your pair satisfies both equations.': '答对了，这组数同时满足两个方程。',
    'The first equation balances. Check the second.': '第一个方程成立，请检查第二个。',
    'The second equation balances. Check the first.': '第二个方程成立，请检查第一个。',
    'Check both equations. Substitute your x and y in each one.': '两个方程都不成立，请分别代入 x 和 y 检查。',
    'Saved on this computer. Select Start practice to begin.': '题目已保存在本机，点击「开始练习」即可作答。',
    'Algebra practice': '代数练习',
    'Practise clearing denominators, nested brackets and decimal coefficients.': '综合练习去分母、嵌套括号和小数系数。',
    'Thirteen practice equations each have a paired independent question. The challenge set combines fractions, brackets and variables on both sides. The checker and worked steps run locally.': '13 道练习题各配一道独立题。挑战题结合分数、括号及两边含未知数的方程。所有检查和提示均在本机运行。',
    '← Algebra practice': '← 返回代数练习',
    'Offline tutor': '离线辅导说明',
    'Linear equations': '一元一次方程',
    'Choose a question and how much help you want.': '选一道题，再选你希望怎样获得帮助。',
    '13 practice items': '13 道练习题',
    '13 new questions without hints': '13 道无提示新题',
    'Practice settings': '练习设置',
    'Choose a problem': '选择练习题',
    'How would you like help?': '你希望怎样获得帮助？',
    'Try first · step hints': '先尝试，逐步看提示',
    'Full worked example': '查看完整例题',
    'Write your first attempt to unlock a hint.': '先写一步并提交，即可解锁提示。',
    'The same checked steps appear together. You can still check your own working.': '一次展示完整步骤，你也可以检查自己的解法。',
    'Start practice': '开始练习',
    'Start fresh': '重新开始',
    'Starting again creates a fresh session. Download your record first if you want to keep it.': '重新开始会创建新的练习记录。想保留本次记录，请先下载。',
    'Demo controls': '演示设置',
    'Equation sent to the tutor': '交给助手的方程',
    'Input handling': '输入处理方式',
    'Checked input': '检查输入',
    'Before correction: error demonstration': '修正前的错误演示',
    'Allow equation feedback': '允许检查方程变形',
    'For a presentation-only comparison, switch this off in both conditions. Its setting is included in the record.': '如果只比较步骤展示方式，请在两种模式下都关闭此项。系统会记录这一设置。',
    'Simulate a missing response': '模拟助手无响应',
    'Inspect incomplete input and recovery here. The error demonstration deliberately ignores an incomplete equation.': '在这里测试方程输入不完整时的表现。错误演示模式会故意忽略方程缺失的部分。',
    'Your working': '你的解题过程',
    'Ready to start': '准备开始',
    'Solve for x': '求 x 的值',
    'Choose how you want help, then start.': '选好提示方式后，点击开始练习。',
    'Your working stays here while you practise.': '练习过程中，你写的步骤会保留在这里。',
    'Your working or explanation': '你的推导或解题思路',
    'Write a complete equation to check it, or describe your approach.': '输入完整方程以检查这一步，或写下思路。',
    'Check my steps': '检查我的步骤',
    'All steps preserve the solution.': '所有步骤都与原方程同解。',
    'Review the marked lines.': '请检查标出的行。',
    'Continue on a new line or separate complete equations with a space.': '可以换行，也可以用空格隔开两个完整方程。',
    'Record explanation': '记录思路',
    'Check whether your equation has the same solution. You can also save a written explanation without grading it.': '检查变形后的方程与原方程是否同解。文字思路可以保存，不计分。',
    'Worked steps': '解题步骤',
    'You can refer back to each step you open.': '可以回看已经展开的步骤。',
    'Reveal next step': '查看下一步',
    'Your final answer': '最终答案',
    'Enter a number or fraction': '输入数字或分数',
    'Check answer': '检查答案',
    'Equation solved.': '这道方程答对了。',
    'Try a new question without hints': '独立做一道新题',
    'This session': '本次练习',
    'Start a practice session to create a record.': '开始练习后会生成记录。',
    'Download CSV': '下载练习记录',
    'View practice events': '查看操作记录',
    'Try one on your own': '独立练习',
    'Choose a new question': '选择一道新题',
    'Your answer without help': '你独立算出的答案',
    'No hints or worked steps will be shown.': '独立练习不显示提示和解题步骤。',
    'You can retry. These practice answers are not a controlled learning assessment.': '可以重试。这里的答案只用于练习。',
    'About this prototype and your records': '关于本系统与练习记录',
    'Operation counts and outcomes can be saved on this computer. Your free-text working and session access tokens are excluded from the saved trace. The software checks and sample CSV files are developer demonstrations. A participant study remains future work.': '可在本机保存操作次数和结果。记录会排除自由输入的文字和会话凭证。示例数据来自开发测试，真人研究尚待开展。',
    'Two-step equations with whole numbers.': '用两步求解整数方程。',
    'Practise signs and negative values.': '练习符号和负数。',
    'Work with fractional values and coefficients.': '练习分数解和分数系数。',
    'Work with brackets, fractions and x on both sides.': '练习括号、分数及两边均有 x 的方程。',
    'Check input': '检查输入', 'Solved': '已解出', 'In progress': '进行中',
    'Nothing shown yet': '尚未显示步骤',
    'Start a practice session.': '请开始练习。',
    'Starting a new practice session.': '正在开始新练习。',
    'Setup changed. Start a new practice session.': '设置已更改，请重新开始。',
    'Problem changed. Start a new practice session.': '题目已更改，请开始新练习。',
    'Answer changed. Check it when ready.': '答案已修改，可以重新检查。',
    'Working changed. Check your equation or record your explanation.': '步骤已修改，可以检查方程或记录思路。',
    'Try a step first. Your attempt unlocks the first hint; it is recorded, not automatically graded.': '先写一步并提交，就能解锁第一条提示。系统会记录这次尝试。',
    'Attempt recorded. Select Next hint when you want one checked step.': '思路已记录。需要帮助时，点「查看下一步」。',
    'Checked steps are shown below. This is a fixed-content tutor simulation.': '下方显示已核对的步骤，来自这道题预先编写的解法。',
    'Equivalent equation: this line keeps the same solution. Continue with your own next step.': '变形正确，方程仍然同解。接着试试下一步。',
    'Equivalent equation: x is isolated. Check this value in the final answer box.': '变形正确，已经解出 x。请在最终答案框中检查这个值。',
    'This line changes the solution of the original equation. Check the signs and apply the same operation to both sides.': '这一步改变了原方程的解。检查正负号，确认两边做了相同的运算。',
    'Correct final answer for this checked problem.': '最终答案正确。',
    'That final answer does not match this problem. Check your own working or request the next available hint.': '答案有误。可以检查步骤，或查看下一条提示。',
    'Not correct; try again without help.': '答案有误，再独立试一次。',
    'Correct.': '答对了。',
    'Enter a number or fraction, optionally starting with x =.': '请输入数字或分数，也可以用 x = 开头。',
  }));
  const patterns = [
    [/^(\d+) practice items$/, (_, n) => n + ' 道练习题'],
    [/^(\d+) new questions without hints$/, (_, n) => n + ' 道无提示新题'],
    [/^Line (\d+), step (\d+) · (correct|changes the solution|cannot check)$/, (_, n, part, status) =>
      '第 ' + n + ' 行第 ' + part + ' 步 · ' + ({'correct':'正确','changes the solution':'改变了原解','cannot check':'无法判断'})[status]],
    [/^Line (\d+) · (correct|changes the solution|cannot check)$/, (_, n, status) =>
      '第 ' + n + ' 行 · ' + ({'correct':'正确','changes the solution':'改变了原解','cannot check':'无法判断'})[status]],
    [/^([AT]\d+) · (Warm-up|Multi-step|Signed numbers|Fractions|Challenge)$/, (_, id, topic) => ({'Challenge':'挑战题','Warm-up':'基础题','Multi-step':'多步运算','Signed numbers':'正负数','Fractions':'分数'})[topic]],
    [/^(\d+) of (\d+) shown$/, (_, n, total) => '已显示 ' + n + ' / ' + total + ' 步'],
    [/^(Try first|Worked solution) · (\d+) attempts? recorded$/, (_, mode, n) => (mode === 'Try first' ? '先尝试' : '完整例题') + '，已记录 ' + n + ' 次尝试'],
    [/^(\d+) equation checks? · (\d+) valid answer checks?$/, (_, a, b) => '方程检查 ' + a + ' 次，答案检查 ' + b + ' 次'],
    [/^(\d+) valid answer checks? · (\d+) of (\d+) worked steps viewed\. Try the paired question next\.$/, (_, a, b, c) => '检查答案 ' + a + ' 次，看过 ' + b + ' / ' + c + ' 步。接下来试试配对的新题。'],
    [/^(Subtract|Add) (.+?) (?:from|to) both sides: (.+)\.$/, (_, op, v, eq) => '两边都' + (op === 'Add' ? '加上 ' : '减去 ') + v + '，得到 ' + eq + '。'],
    [/^(Divide|Multiply) both sides by (.+?): (.+)\.$/, (_, op, v, eq) => '两边都' + (op === 'Divide' ? '除以 ' : '乘以 ') + v + '，得到 ' + eq + '。'],
    [/^(Check by substitution|Expand the brackets|Collect the x terms|Collect like terms|Combine the constant terms): (.+)\.$/, (_, op, v) => ({'Check by substitution':'代入检验','Expand the brackets':'展开括号','Collect the x terms':'合并含 x 的项','Collect like terms':'合并同类项','Combine the constant terms':'合并常数项'})[op] + '：' + v + '。'],
  ];
  function translation(text) {
    if (labels.has(text)) return labels.get(text);
    for (const [pattern, format] of patterns) {
      const match = text.match(pattern);
      if (match) return format(...match);
    }
    return '';
  }

  const main = document.querySelector('main');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'language-switch';
  button.setAttribute('aria-label', 'English + 中文 · 中英对照');
  const toolbar = document.querySelector('header nav') || main;
  if (toolbar === main) main.prepend(button);
  else toolbar.append(button);
  const preference = 'iis-tutor-bilingual';
  const query = new URL(location.href).searchParams.get('lang');
  let enabled = query === 'both' || (query === null && localStorage.getItem(preference) === 'both');
  const originals = new WeakMap();
  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest('script,style,textarea,pre,#current-equation,#transfer-equation,.language-switch')) return;
    const original = originals.get(node) ?? node.data;
    const english = original.trim();
    const chinese = translation(english);
    if (!chinese) return;
    originals.set(node, original);
    const next = enabled ? original.replace(english, () => english + ' / ' + chinese) : original;
    if (node.data !== next) node.data = next;
  }
  function visit(root) {
    if (root.nodeType === Node.TEXT_NODE) return updateText(root);
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) updateText(walk.currentNode);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      for (const added of record.addedNodes) visit(added);
    }
  });
  function refresh() {
    main.translate = !enabled;
    $('open-results').href = '/results.html?lang=' + (enabled ? 'both' : 'en');
    visit(main);
    for (const field of main.querySelectorAll('[placeholder]')) {
      const original = field.dataset.placeholderEn ?? field.placeholder;
      field.dataset.placeholderEn = original;
      const chinese = translation(original);
      field.placeholder = enabled && chinese ? original + ' / ' + chinese : original;
    }
    button.textContent = enabled ? 'English only' : '中英对照';
    button.setAttribute('aria-pressed', String(enabled));
    main.classList.toggle('bilingual', enabled);
  }
  function savePreference() {
    localStorage.setItem(preference, enabled ? 'both' : 'en');
  }
  if (query !== null) savePreference();
  button.onclick = () => {
    enabled = !enabled;
    savePreference();
    const url = new URL(location.href);
    url.searchParams.set('lang', enabled ? 'both' : 'en');
    history.replaceState(null, '', url);
    refresh();
  };
  refresh();
  observer.observe(main, {childList:true, subtree:true});
}
installBilingualView();

