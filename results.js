const byId = id => document.getElementById(id);
const query = new URL(location.href).searchParams.get('lang');
let bilingual = query === 'both' || (query === null && localStorage.getItem('iis-tutor-bilingual') === 'both');
let sessions = [];
let lastUpdate;
let failed = false;
const label = (en, zh) => bilingual ? en + ' / ' + zh : en;
const outcome = value => value == null ? '—' : value ? label('Correct','正确') : label('Incorrect','错误');
const ratings = {
  not_helpful:['Not helpful','没有帮助'], somewhat:['A little helpful','有一点帮助'],
  very:['Very helpful','很有帮助'], not_viewed:['Did not view steps','没看步骤']
};
function render() {
  const filter = byId('tester-filter');
  const selected = filter.value;
  const codes = [...new Set(sessions.map(s => s.tester))].sort();
  const choices = [new Option(label('All testers','全部测试者'),''),
                   ...codes.map(code => new Option(code,code))];
  if (choices.length !== filter.options.length ||
      choices.some((option,i) => option.text !== filter.options[i].text)) filter.replaceChildren(...choices);
  filter.value = codes.includes(selected) ? selected : '';
  const rows = sessions.filter(s => !filter.value || s.tester === filter.value);
  byId('rows').replaceChildren(...rows.map(s => {
    const row = document.createElement('tr');
    const values = [s.tester,new Date(s.started).toLocaleString(),s.problem,
      s.mode === 'gradual' ? label('Step hints','逐步提示') : label('Full example','完整例题'),
      s.attempts,s.shown,outcome(s.practice),outcome(s.independent_first),outcome(s.independent_latest),
      label(...(ratings[s.help_rating] || ['Not rated','未评价']))];
    for (const value of values) row.insertCell().textContent = value;
    return row;
  }));
  byId('empty').hidden = rows.length > 0 || !lastUpdate;
  byId('empty').textContent = label('No labelled sessions yet. Enter 03 on the practice page and start a question.',
                                    '尚无测试记录。在练习页输入 03，再点击开始练习。');
  byId('sync').textContent = failed ? label('Connection lost. Retrying…','连接中断，正在重试…') :
    lastUpdate ? label('Updated every 2 seconds','每 2 秒更新') + ' · ' + lastUpdate.toLocaleTimeString() : label('Loading…','加载中…');
}
function language() {
  document.querySelector('main').translate = !bilingual;
  for (const el of document.querySelectorAll('[data-zh]')) {
    el.dataset.en ??= el.textContent;
    el.textContent = label(el.dataset.en,el.dataset.zh);
  }
  byId('language').textContent = bilingual ? 'English only' : '中英对照';
  render();
}
byId('language').onclick = () => {
  bilingual = !bilingual;
  localStorage.setItem('iis-tutor-bilingual',bilingual ? 'both' : 'en');
  const url = new URL(location.href);
  url.searchParams.set('lang',bilingual ? 'both' : 'en');
  history.replaceState(null,'',url);
  language();
};
byId('tester-filter').onchange = render;
async function poll() {
  try {
    const response = await fetch('/api/results',{cache:'no-store',signal:AbortSignal.timeout(8000)});
    if (!response.ok) throw Error();
    sessions = (await response.json()).sessions;
    lastUpdate = new Date();
    failed = false;
  } catch { failed = true; }
  render();
  setTimeout(poll,2000);
}
language();
poll();
