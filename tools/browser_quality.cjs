const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const project = process.env.A2_PROJECT || path.resolve(__dirname, '..');

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'iis-a2-quality-'));
  const unwritableDirectory = path.join(temporary, 'file-instead-of-directory');
  fs.writeFileSync(unwritableDirectory, 'Intentional developer fault injection.');
  const child = cp.spawn(process.env.PYTHON_EXECUTABLE || 'python',
    ['-B', 'app.py', '--port', '0'], {
      cwd: project, windowsHide: true,
      env: {...process.env, PYTHONUTF8: '1', TUTOR_RUN_KIND: 'developer_check',
            TUTOR_DATA_DIR: unwritableDirectory},
    });
  let output = '', errors = '', browser;
  child.stdout.on('data', value => output += value);
  child.stderr.on('data', value => errors += value);
  try {
    const base = await new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        const match = output.match(/http:\/\/127.0.0.1:\d+/);
        if (match) {
          clearInterval(interval); clearTimeout(deadline); resolve(match[0]);
        }
      }, 25);
      const deadline = setTimeout(() => {
        clearInterval(interval); reject(Error(errors || 'Server did not start.'));
      }, 10000);
    });
    browser = await chromium.launch({
      ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {}),
      headless: true, args: ['--no-proxy-server'],
    });
    const page = await browser.newPage({acceptDownloads: true});
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(base);
    await page.waitForSelector('#problem option', {state: 'attached'});
    async function click(selector) {
      const [response] = await Promise.all([
        page.waitForResponse(r => r.request().method() === 'POST'),
        page.locator(selector).click(),
      ]);
      await response.finished();
      await page.waitForTimeout(40);
      return response;
    }
    await click('#start');
    await page.locator('#transfer-answer').fill('not a number');
    const invalid = await (await click('#transfer-check')).json();
    assert.equal(invalid.valid, false);
    assert.equal(invalid.correct, null);
    assert.match(await page.locator('#transfer-result').textContent(), /Enter/);
    assert.doesNotMatch(await page.locator('#transfer-result').textContent(), /Not correct/);

    await page.locator('#answer').fill('not a number');
    await click('#check-answer');
    assert.doesNotMatch(await page.locator('#reply').textContent(), /4/);
    assert.equal(await page.locator('#steps li').count(), 0);
    await page.locator('#answer').fill('x = 8 / 2');
    await click('#check-answer');
    assert.match(await page.locator('#reply').textContent(), /^Correct/);

    const downloading = page.waitForEvent('download');
    const exported = await (await click('#export-trace')).json();
    const download = await downloading;
    await download.saveAs(path.join(project, 'evidence/browser-quality-trace.csv'));
    assert.equal(exported.local_file_saved, false);
    assert.match(exported.csv, /unassisted_invalid/);
    assert.match(await page.locator('#export-status').textContent(), /could not be saved/);

    async function editDuringResponse(routePattern, field, button, oldValue, nextValue, feedback) {
      await page.locator(field).fill(oldValue);
      let release, ready;
      const gate = new Promise(resolve => release = resolve);
      const sent = new Promise(resolve => ready = resolve);
      await page.route(routePattern, async route => {
        const response = await route.fetch();
        ready(); await gate; await route.fulfill({response});
      });
      await page.locator(button).click(); await sent;
      await page.locator(field).fill(nextValue);
      release();
      await page.waitForFunction(selector => document.querySelector(selector)
        .textContent.includes('changed while checking'), feedback);
      assert.doesNotMatch(await page.locator(feedback).textContent(), /^Correct/);
      await page.unroute(routePattern);
    }
    await editDuringResponse('**/api/action', '#answer', '#check-answer', '4', '5', '#reply');
    await editDuringResponse('**/api/transfer', '#transfer-answer', '#transfer-check', '3', '4', '#transfer-result');
    assert.deepEqual(pageErrors, []);
    const report = {
      run_kind: 'developer_check', checked_at_utc: new Date().toISOString(),
      participant_study: false, passed: true,
      fault_injection: 'Trace path is an existing file, preventing local directory writes.',
      checks: ['Invalid input is distinct from an incorrect answer',
               'Neutral format feedback and exact spaced fractions',
               'Actual CSV download despite reported local write failure',
               'Delayed feedback does not grade subsequently edited answers'],
    };
    fs.writeFileSync(path.join(project, 'evidence/browser_quality.json'), JSON.stringify(report, null, 2));
    console.log('PASS: four browser quality checks; intentional file-write failure is labelled.');
  } finally {
    if (browser) await browser.close();
    child.kill();
    await new Promise(resolve => child.exitCode !== null ? resolve() : child.once('exit', resolve));
    fs.rmSync(temporary, {recursive: true, force: true});
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
