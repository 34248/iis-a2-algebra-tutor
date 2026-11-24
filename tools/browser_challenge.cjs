const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
(async () => {
  const root = path.join(__dirname, '..');
  const base = process.env.TUTOR_URL || 'http://127.0.0.1:8768/';
  const b = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE, args:['--no-proxy-server']});
  try {
    const page = await b.newPage({viewport:{width:1400,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '?lang=both');
    await page.locator('#problem option').first().waitFor({state:'attached'});
    assert(await page.locator('#problem option').count() >= 13);
    const items = JSON.parse(fs.readFileSync(path.join(root,'problems.json')));
    const pairs = JSON.parse(fs.readFileSync(path.join(root,'transfer.json')));
    await page.selectOption('#problem', 'A07');
    await page.click('#start');
    const working = '5x-2x=13+2\n3x=15 x=5';
    await page.fill('#attempt', working);
    await page.click('#check-step');
    const rows = page.locator('#step-feedback li');
    await rows.filter({hasText:'第 2 行第 2 步 · 正确'}).waitFor();
    assert.equal(await rows.count(), 3);
    assert.equal(await page.locator('#attempt').inputValue(), working);
    await page.fill('#attempt', working.replace('x=5', 'x=6'));
    await page.click('#check-step');
    await rows.filter({hasText:'第 2 行第 2 步 · 改变了原解'}).waitFor();
    assert.equal(await rows.locator('strong').filter({hasText:'· 正确'}).count(), 2);
    for (const item of items.filter(q => q.difficulty === 'Challenge')) {
      await page.selectOption('#problem', item.id);
      await page.selectOption('#condition','gradual');
      await page.click('#start');
      await page.locator('#save-attempt:enabled').waitFor();
      assert(await page.locator('#hint').isDisabled());
      await page.fill('#attempt','My first step: '+item.equation_steps[0]);
      await page.click('#check-step');
      await page.locator('#step-feedback[data-status=good]:visible').waitFor();
      await page.click('#hint');
      await page.locator('#steps li').first().waitFor();
      await page.fill('#answer','99');
      await page.click('#check-answer');
      await page.locator('#reply').filter({hasText:'does not match'}).waitFor();
      await page.fill('#answer',String(item.answer));
      await page.click('#check-answer');
      await page.click('#try-independent');
      assert.equal(await page.locator('#transfer').inputValue(),item.transfer_id);
      await page.fill('#transfer-answer',String(pairs.find(t=>t.id===item.transfer_id).answer));
      await page.click('#transfer-check');
      await page.locator('#transfer-result[data-status=good]').waitFor();
      await page.selectOption('#condition','immediate');
      await page.click('#start');
      await page.waitForFunction(n=>document.querySelectorAll('#steps li').length===n,item.steps.length);
    }
    await page.locator('.language-switch').click();
    assert(!/挑战题/.test(await page.locator('#problem').innerText()));
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    for (const route of ['import.html','convolution.html']) assert.equal((await page.request.get(base+route)).status(),404);
    if (process.env.RENDER_DIAGRAM) {
      await page.setViewportSize({width:1200,height:640});
      await page.goto(pathToFileURL(path.join(root,'docs/figures/architecture.svg')).href);
      await page.locator('svg').screenshot({path:path.join(root,'docs/figures/architecture.png')});
    }
    assert.deepEqual(errors,[]);
    console.log('All four challenge pairs, both help modes, language switch and mobile layout passed.');
  } finally { await b.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
