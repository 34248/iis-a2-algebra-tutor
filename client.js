const $ = id => document.getElementById(id);
let session = null;
let config = null;
let busy = false;
let current = null;

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
  for (const id of ['problem', 'equation', 'condition', 'version', 'transfer']) {
    $(id).disabled = busy || !config;
  }
  $('start').disabled = busy || !config;
  $('save-attempt').disabled = $('check-answer').disabled =
    busy || !current || current.status !== 'ready';
  $('hint').disabled = busy || !current || !current.next_hint_allowed;
  $('export-trace').disabled = busy || !session;
  $('transfer-check').disabled = busy || !config;
}

function render(result) {
  current = result;
  session = result.session;
  $('reply').textContent = result.reply;
  $('progress').textContent = `${result.condition} | ${result.status} | ` +
    `${result.shown} / ${result.total_steps} steps | ${result.attempt_count} attempts`;
  $('steps').replaceChildren(...result.steps.map(step => node('li', step)));
  $('events').replaceChildren(...result.events.map(event => node('li', event)));
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
}

function resetPractice(message) {
  session = null;
  current = null;
  for (const id of ['steps', 'events']) $(id).replaceChildren();
  $('attempt').value = '';
  $('answer').value = '';
  $('export-status').textContent = '';
  $('progress').textContent = 'Start a practice session.';
  $('reply').textContent = message;
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
  }));
});

bind('save-attempt', async () => render(await api('/api/action', {
  session, action: 'attempt', attempt: $('attempt').value,
})));

bind('hint', async () => render(await api('/api/action', {
  session, action: 'hint', unavailable: $('unavailable').checked,
})));

bind('check-answer', async () => {
  const submitted = $('answer').value;
  render(await api('/api/action', {session, action: 'check', answer: submitted}));
  if ($('answer').value !== submitted) {
    $('reply').textContent = 'Your answer changed while checking. Check the current answer again.';
  }
});

bind('transfer-check', async () => {
  const submitted = $('transfer-answer').value;
  const result = await api('/api/transfer', {
    session, problem_id: $('transfer').value, answer: submitted,
  });
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

for (const id of ['condition', 'version', 'equation']) {
  $(id).addEventListener('change', () => resetPractice(
    'Setup changed. Start a new practice session.'));
}
$('problem').addEventListener('change', () => {
  $('equation').value = config.problems.find(item => item.id === $('problem').value).question;
  resetPractice('Problem changed. Start a new practice session.');
});
$('transfer').addEventListener('change', resetUnassisted);
$('transfer-answer').addEventListener('input', () => {
  $('transfer-result').textContent = 'Answer changed. Check it when ready.';
});
$('answer').addEventListener('input', () => {
  if (current) $('reply').textContent = 'Answer changed. Check it when ready.';
});

syncControls();
(async () => {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) throw Error('Could not load the checked practice items. Reload to retry.');
    const loaded = await response.json();
    for (const item of loaded.problems) {
      const option = node('option', item.id + ': ' + item.question);
      option.value = item.id;
      $('problem').append(option);
    }
    for (const item of loaded.transfer) {
      const option = node('option', item.id + ': ' + item.question);
      option.value = item.id;
      $('transfer').append(option);
    }
    config = loaded;
    syncControls();
  } catch (error) {
    fail(error);
  }
})();
