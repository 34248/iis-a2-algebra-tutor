const $ = id => document.getElementById(id);
let session = null;
let config = null;
let busy = false;
let current = null;
let checkedWorking = null;
const topicNote = difficulty => ({'Warm-up': 'Two-step equations with whole numbers.', 'Signed numbers': 'Practise signs and negative values.', 'Fractions': 'Work with fractional values and coefficients.', 'Multi-step': 'Work with brackets, fractions and x on both sides.'})[difficulty];

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
  for (const id of ['problem', 'equation', 'condition', 'version', 'transfer', 'equation-feedback']) {
    $(id).disabled = busy || !config;
  }
  $('start').disabled = busy || !config;
  $('save-attempt').disabled = $('check-answer').disabled =
    busy || !current || current.status !== 'ready';
  $('hint').disabled = busy || !current || !current.next_hint_allowed;
  $('export-trace').disabled = busy || !session;
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
  $('export-status').textContent = '';
  $('progress').textContent = 'Start a practice session.';
  $('reply').textContent = message;
  $('reply').hidden = false;
  $('error').hidden = true;
  resetUnassisted();
  syncControls();
}

bind('start', async () => {
  // Clear before waiting, preserving anything typed during the request.
  resetPractice('Starting a new practice session.');
  render(await api('/api/start', {
    problem_id: $('problem').value,
    question: $('equation').value,
    condition: $('condition').value,
    version: $('version').value,
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

bind('check-step', async () => {
  const submitted = $('attempt').value;
  checkedWorking = submitted;
  render(await api('/api/action', {session, action: 'check_step', attempt: submitted}));
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

bind('export-trace', async () => {
  const result = await api('/api/export', {session});
  const url = URL.createObjectURL(new Blob(['\ufeff' + result.csv], {
    type: 'text/csv;charset=utf-8',
  }));
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  const saveMessage = result.local_file_saved ? '' :
    ' The server copy could not be saved; keep the downloaded CSV.';
  $('export-status').textContent = `${result.rows} recorded events included. ` +
    'CSV download started.' + saveMessage +
    ' This is an inspection trace, not a learning-effect result.';
});

for (const id of ['condition', 'version', 'equation', 'equation-feedback']) {
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
  $('independent').scrollIntoView({behavior: 'smooth', block: 'start'});
  $('transfer-answer').focus({preventScroll: true});
});
for (const [field, button] of [['answer', 'check-answer'], ['transfer-answer', 'transfer-check']]) {
  $(field).addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); $(button).click(); }
  });
}
syncControls();
(async () => {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw Error('Could not load the checked practice items. Reload to retry.');
    const loaded = await response.json();
    for (const item of loaded.problems) {
      const option = node('option', item.id + ' · ' + item.difficulty);
      option.value = item.id;
      $('problem').append(option);
    }
    for (const item of loaded.transfer) {
      const option = node('option', item.id + ' · ' + item.difficulty);
      option.value = item.id;
      $('transfer').append(option);
    }
    config = loaded;
    $('problem-kind').textContent = topicNote(loaded.problems[0].difficulty);
    $('current-equation').textContent = loaded.problems[0].question;
    resetUnassisted();
    syncControls();
  } catch (error) {
    fail(error);
  }
})();
