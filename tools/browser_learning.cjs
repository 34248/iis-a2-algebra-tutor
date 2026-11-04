const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const cp = require('node:child_process'), fs = require('node:fs');
const path = require('node:path'), os = require('node:os');
const project = process.env.A2_PROJECT || path.resolve(__dirname, '..');

(async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'iis-a2-learning-'));
  const child = cp.spawn(process.env.PYTHON_EXECUTABLE || 'python', ['-B','app.py','--port','0'], {
    cwd: project, windowsHide: true, env: {...process.env, PYTHONUTF8:'1', TUTOR_RUN_KIND:'developer_demo', TUTOR_DATA_DIR:temp},
  });
  let stdout='', stderr='', browser;
  child.stdout.on('data', value => stdout += value);
  child.stderr.on('data', value => stderr += value);
  try {
    const base = await new Promise((resolve,reject) => {
      const interval=setInterval(() => {const m=stdout.match(/http:\/\/127.0.0.1:\d+/);if(m){clearInterval(interval);clearTimeout(end);resolve(m[0]);}},25);
      const end=setTimeout(() => {clearInterval(interval);reject(Error(stderr||'Server did not start'));},10000);
    });
    browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-proxy-server']});
    const page=await browser.newPage({viewport:{width:1360,height:1000},acceptDownloads:true,colorScheme:'light',reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);await page.waitForSelector('#problem option',{state:'attached'});
    async function click(selector){const [r]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'),page.locator(selector).click()]);await r.finished();await page.waitForTimeout(50);return r;}
    assert.equal(await page.locator('#problem option').count(),9);
    assert.equal(await page.locator('#transfer option').count(),9);
    assert.equal(await page.locator('#inspector').getAttribute('open'),null);
    await click('#start');await page.locator('#attempt').fill('2x = 8');await click('#check-step');
    assert.match(await page.locator('#step-feedback').textContent(),/^Equivalent/);
    assert.equal(await page.locator('#steps li').count(),0);
    assert.equal(await page.locator('#hint').isDisabled(),false);
    await click('#hint');
    await page.screenshot({path:path.join(project,'evidence/07-learning-workspace.png'),fullPage:true});
    await page.locator('#attempt').fill('2x = 14');await click('#check-step');
    assert.match(await page.locator('#step-feedback').textContent(),/changes the solution/);
    assert.doesNotMatch(await page.locator('#step-feedback').textContent(),/x = 4/);
    assert.equal(await page.locator('#steps li').count(),1);

    const downloading=page.waitForEvent('download');await click('#export-trace');
    const downloaded=await downloading;const csvFile=path.join(project,'evidence/learning-demo-trace.csv');await downloaded.saveAs(csvFile);
    const csv=fs.readFileSync(csvFile,'utf8');assert.match(csv,/step_equivalent/);assert.match(csv,/check_step/);assert.match(csv,/developer_demo/);assert.ok(!csv.includes('2x = 14')&&!csv.includes('2x = 8'));

    await page.locator('#problem').selectOption('A05');await click('#start');await page.locator('#answer').fill('5/3');await click('#check-answer');
    assert.equal(await page.locator('#completion').isVisible(),true);
    await page.locator('#try-independent').click();assert.equal(await page.locator('#transfer').inputValue(),'T05');
    assert.equal(await page.locator('#transfer-answer').inputValue(),'');
    await page.locator('#transfer-answer').fill('3/2');const result=await (await click('#transfer-check')).json();
    assert.equal(result.correct,true);assert.deepEqual(result.steps,[]);
    await page.screenshot({path:path.join(project,'evidence/08-completed-and-independent.png'),fullPage:true});

    await page.locator('#problem').selectOption('A04');await click('#start');await page.locator('#attempt').fill('-2x = 8');await click('#check-step');
    assert.match(await page.locator('#step-feedback').textContent(),/^Equivalent/);
    await page.locator('#answer').fill('-4');await click('#check-answer');assert.equal(await page.locator('#completion').isVisible(),true);
    await page.locator('#transfer-answer').fill('-5');await page.locator('#transfer-answer').press('Enter');
    await page.waitForFunction(()=>document.getElementById('transfer-result').textContent==='Correct.');
    await page.locator('#problem').selectOption('A09');await click('#start');
    await page.locator('#attempt').fill('2(x-1) + 3x = 24');await click('#check-step');
    assert.match(await page.locator('#step-feedback').textContent(),/^Equivalent/);
    await click('#hint');assert.match(await page.locator('#hint-count').textContent(),/1 of 6/);
    await page.screenshot({path:path.join(project,'evidence/10-multi-step-workspace.png'),fullPage:true});
    await page.locator('#inspector').evaluate(element=>element.open=true);
    await page.locator('#equation-feedback').uncheck();await click('#start');
    assert.equal(await page.locator('#check-step').isDisabled(),true);
    await page.locator('#attempt').fill('My own approach');await click('#save-attempt');
    assert.equal(await page.locator('#hint').isDisabled(),false);
    const comparison=await (await click('#export-trace')).json();assert.match(comparison.csv,/equation_feedback/);assert.match(comparison.csv,/False/);
    await page.locator('#condition').selectOption('immediate');await click('#start');
    assert.equal(await page.locator('#check-step').isDisabled(),true);
    assert.equal(await page.locator('#steps li').count(),6);
    const mobile=await browser.newPage({viewport:{width:390,height:844},colorScheme:'dark',reducedMotion:'reduce'});
    mobile.on('pageerror',error=>errors.push(error.message));await mobile.goto(base);await mobile.waitForSelector('#problem option',{state:'attached'});
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.equal(await mobile.locator('#inspector').getAttribute('open'),null);
    await mobile.locator('#start').click();
    await mobile.waitForFunction(()=>!document.getElementById('check-step').disabled);
    await mobile.locator('#attempt').fill('2x = 8');await mobile.locator('#check-step').click();
    await mobile.waitForFunction(()=>document.getElementById('step-feedback').textContent.startsWith('Equivalent'));
    assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await mobile.screenshot({path:path.join(project,'evidence/09-mobile-dark.png'),fullPage:true});
    assert.deepEqual(errors,[]);
    const report={run_kind:'developer_demo',checked_at_utc:new Date().toISOString(),passed:true,participant_study:false,checks:[
      'Equivalent equation checked without releasing hints','Wrong equation feedback preserves released content',
      'Fraction answer completes and selects paired item','Paired fraction answer checked without worked steps',
      'Step-result trace exports without raw working','Negative coefficient exercise is checked correctly',
      'Enter key submits independent answer','390px dark layout and collapsed demo controls', 'Multi-step fractional equation and six-step help', 'Optional equation feedback disabled across both comparison conditions'],screenshots:4};
    fs.writeFileSync(path.join(project,'evidence/browser_learning.json'),JSON.stringify(report,null,2));
    console.log('PASS: ten learning-flow browser checks, four screenshots and a labelled demonstration export.');
  } finally {
    if(browser)await browser.close();child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));
    fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
