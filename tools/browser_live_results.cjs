const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {once} = require('node:events');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'iis-observer-'));
  const server = spawn(process.env.PYTHON_EXECUTABLE || 'python', ['-B','app.py','--port','0'],
    {cwd:root,windowsHide:true,env:{...process.env,TUTOR_DATA_DIR:tmp,TUTOR_RUN_KIND:'isolated_browser_check'}});
  let browser;
  try {
    const [output] = await once(server.stdout, 'data');
    const base = output.toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
    browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE, args:['--no-proxy-server']});
    const observer = await browser.newPage();
    await observer.goto(base + '/results.html?lang=both');
    await observer.locator('#empty:visible').waitFor();
    async function start(code, mode) {
      const p = await browser.newPage();
      await p.goto(base + '/?lang=both');
      await p.fill('#tester', code);
      await p.selectOption('#condition', mode);
      await p.click('#start');
      await p.locator('#save-attempt:enabled').waitFor();
      assert.equal(await p.locator('#export-trace').count(),0);
      return p;
    }
    const a = await start('P01','gradual');
    await start('P02','immediate');
    await observer.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);
    await a.fill('#attempt','2x = 8');
    await a.click('#check-step');
    await a.click('#hint');
    await a.fill('#answer','4');
    await a.click('#check-answer');
    await a.click('#try-independent');
    for (const [value, text] of [['1','Not correct'],['3','Correct.']]) {
      await a.fill('#transfer-answer',value);
      await a.click('#transfer-check');
      await a.locator('#transfer-result').filter({hasText:text}).waitFor();
    }
    await observer.selectOption('#tester-filter','P01');
    const row = observer.locator('#rows tr');
    await row.locator('td').nth(9).filter({hasText:'Correct / 正确'}).waitFor();
    assert.equal(await row.count(),1);
    assert.match(await row.locator('td').nth(8).innerText(),/Incorrect/);
    assert.equal(await row.locator('td').nth(5).innerText(),'1');
    await observer.selectOption('#tester-filter','P02');
    assert.equal(await row.locator('td').nth(8).innerText(),'—');
    await observer.reload();
    await observer.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);
    console.log('PASS: two testers, live refresh without reloading, filtering, first and latest paired scores.');
  } finally {
    if(browser) await browser.close();
    const exited=once(server,'exit');
    server.kill(); await exited;
    const target = fs.realpathSync(tmp);
    if (path.dirname(target) === fs.realpathSync(os.tmpdir()) && path.basename(target).startsWith('iis-observer-')) {
      fs.rmSync(target,{recursive:true,force:true});
    }
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
