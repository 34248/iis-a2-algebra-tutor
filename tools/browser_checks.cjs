const {chromium}=require('playwright');
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const os=require('node:os');
const project=path.resolve(__dirname,'..');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'iis-a2-browser-'));
fs.mkdirSync(path.join(project,'evidence'),{recursive:true});
(async()=>{
 const child=cp.spawn(process.env.PYTHON_EXECUTABLE||'python',['-B','app.py','--port','0'],{cwd:project,env:{...process.env,PYTHONUTF8:'1',TUTOR_RUN_KIND:'developer_demo',TUTOR_DATA_DIR:root+'/browser-traces'},windowsHide:true});
 let output='',stderr='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>stderr+=b);
 let browser;
 try{
 const base=await new Promise((resolve,reject)=>{const end=setTimeout(()=>reject(Error('Server startup timed out '+stderr)),12000);const t=setInterval(()=>{const m=output.match(/http:\/\/127.0.0.1:\d+/);if(m){clearInterval(t);clearTimeout(end);resolve(m[0]);}},70);child.once('exit',code=>{clearTimeout(end);clearInterval(t);reject(Error('Server stopped '+code+' '+stderr));});});
 browser=await chromium.launch({...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{}),headless:true,args:['--no-proxy-server']});
 const page=await browser.newPage({viewport:{width:1280,height:1000},acceptDownloads:true,colorScheme:'light',reducedMotion:'reduce'});
 const errors=[];page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('response',async r=>{if(r.status()>=400)console.log('HTTP',r.status(),r.url(),await r.text());});await page.goto(base);await page.waitForSelector('#problem option',{state:'attached'});
 assert.equal(await page.locator('#problem option').count(),2);
 await click('#start');await assertButton('#hint',true);assert.equal(await page.locator('#steps li').count(),0);
 await page.locator('#attempt').fill('Subtract 3 from both sides.');await click('#save-attempt');await page.waitForTimeout(150);await click('#hint');assert.equal(await page.locator('#steps li').count(),1);
 await page.locator('#practice').screenshot({path:path.join(project,'evidence/01-gradual.png')});
 const exp=page.waitForEvent('download');await click('#export-trace');const download=await exp;await download.saveAs(path.join(project,'evidence/developer-demo-trace.csv'));
 const csv=fs.readFileSync(path.join(project,'evidence/developer-demo-trace.csv'),'utf8');assert.match(csv,/developer_demo/);assert.ok(!csv.includes('Subtract 3 from both sides.'));assert.match(csv,/hint/);
 for(let n=0;n<2;n++)await click('#hint');const gradual=await page.locator('#steps li').allTextContents();assert.equal(gradual.length,3);
 await page.locator('#condition').selectOption('immediate');await assertButton('#check-answer',true);await click('#start');assert.deepEqual(await page.locator('#steps li').allTextContents(),gradual);
 await page.locator('#practice').screenshot({path:path.join(project,'evidence/02-immediate.png')});
 await page.locator('#condition').selectOption('gradual');await page.locator('#equation').fill('2x + = 11');await click('#start');assert.match(await page.locator('#reply').textContent(),/incomplete/);assert.equal(await page.locator('#steps li').count(),0);await assertButton('#hint',true);
 await page.locator('#practice').screenshot({path:path.join(project,'evidence/03-blocked.png')});
 await page.locator('#equation').fill('2x + 3 = 11');await click('#start');await page.locator('#attempt').fill('Subtract 3');await click('#save-attempt');await click('#hint');
 await page.locator('#practice').screenshot({path:path.join(project,'evidence/04-recovered.png')});
 await page.locator('#transfer-answer').fill('3');await click('#transfer-check');assert.match(await page.locator('#transfer-result').textContent(),/^Correct/);
 await page.locator('section.card').nth(2).screenshot({path:path.join(project,'evidence/05-unassisted.png')});
 const exp2=page.waitForEvent('download');await click('#export-trace');const dl2=await exp2;await dl2.saveAs(path.join(project,'evidence/developer-demo-with-unassisted.csv'));assert.match(fs.readFileSync(path.join(project,'evidence/developer-demo-with-unassisted.csv'),'utf8'),/unassisted_check/);
 const request=await page.request.post(base+'/api/export',{data:{session:'missing'}});assert.equal(request.status(),400);
 const cross=await page.request.post(base+'/api/start',{headers:{Origin:'https://example.org'},data:{}});assert.equal(cross.status(),403);
 await page.locator('#problem').selectOption('A02');assert.equal(await page.locator('#equation').inputValue(),'3x - 5 = 10');await click('#start');await page.locator('#answer').fill('5');await click('#check-answer');assert.match(await page.locator('#reply').textContent(),/^Correct/);
 await page.locator('#version').selectOption('baseline');await page.locator('#equation').fill('2x + = 11');await click('#start');assert.match(await page.locator('#reply').textContent(),/Known baseline error/);assert.equal(await page.locator('#steps li').count(),3);
 await page.locator('#version').selectOption('revised');await page.locator('#equation').fill('3x - 5 = 10');await click('#start');await page.locator('#attempt').fill('Add 5');await click('#save-attempt');await click('#hint');await page.locator('#unavailable').check();await click('#hint');assert.equal(await page.locator('#steps li').count(),1);assert.match(await page.locator('#reply').textContent(),/unavailable/);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,colorScheme:'light'});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base);await mobile.waitForSelector('#problem option',{state:'attached'});assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:path.join(project,'evidence/06-mobile.png')});
 assert.deepEqual(errors,[]);
 const report={run_kind:'developer_demo',checked_at_utc:new Date().toISOString(),browser:'Microsoft Edge',passed:true,checks:['attempt gate','one-step release','identical mode content','CSV download','no free-text trace','input blocking','correction and restart','unassisted answer','unassisted trace event','unknown export refusal','cross-origin refusal','second checked exercise','labelled baseline failure','unavailable-response preservation','mobile layout','no browser errors'],screenshots:6,participant_study:false};
 fs.writeFileSync(path.join(project,'evidence/browser_checks.json'),JSON.stringify(report,null,2));
 // Server diagnostic text stays in memory and is not published.
 console.log('PASS: '+report.checks.length+' browser checks, six screenshots, two CSV downloads; all data are labelled developer_demo.');
 async function click(sel){const [r]=await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'),page.locator(sel).click()]);await r.finished();await page.waitForTimeout(30);}
 async function assertButton(sel,disabled){await page.waitForFunction(({sel,disabled})=>document.querySelector(sel).disabled===disabled,{sel,disabled});}
 }finally{if(browser)await browser.close();child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
