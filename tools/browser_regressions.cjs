const {chromium}=require('playwright');
const cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const project=process.env.A2_PROJECT||path.resolve(__dirname,'..');
(async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'a2-race-'));
 const child=cp.spawn(process.env.PYTHON_EXECUTABLE||'python',['-B','app.py','--port','0'],{cwd:project,env:{...process.env,PYTHONUTF8:'1',TUTOR_RUN_KIND:'developer_check',TUTOR_DATA_DIR:temp},windowsHide:true});
 let stdout='',stderr='',browser;child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 try{
  const base=await new Promise((resolve,reject)=>{const timer=setInterval(()=>{const m=stdout.match(/http:\/\/127.0.0.1:\d+/);if(m){clearInterval(timer);clearTimeout(end);resolve(m[0]);}},30);const end=setTimeout(()=>{clearInterval(timer);reject(Error(stderr||'No server'));},10000);});
  browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-proxy-server']});
  const page=await browser.newPage();await page.goto(base);await page.waitForSelector('#problem option',{state:'attached'});
  async function click(s){await Promise.all([page.waitForResponse(r=>r.request().method()==='POST'),page.locator(s).click()]);await page.waitForTimeout(70);}
  await click('#start');await page.locator('#attempt').fill('Try isolating x.');await click('#save-attempt');
  let release,ready;const gate=new Promise(r=>release=r),received=new Promise(r=>ready=r);
  await page.route('**/api/action',async route=>{const response=await route.fetch();ready();await gate;await route.fulfill({response});});
  await page.locator('#hint').click();await received;
  const controls=await page.evaluate(()=>Object.fromEntries(['start','condition','problem','version','equation','transfer','save-attempt','export-trace','transfer-check'].map(id=>[id,document.getElementById(id).disabled])));
  release();await page.waitForTimeout(150);await page.unroute('**/api/action');
  await page.locator('#transfer-answer').fill('3');await click('#transfer-check');
  await page.locator('#transfer').selectOption('T02');
  const reset=await page.evaluate(()=>({answer:document.getElementById('transfer-answer').value,result:document.getElementById('transfer-result').textContent}));
  const checks=[{name:'Pending request locks conflicting controls',passed:Object.values(controls).every(Boolean),observed:controls},{name:'Changing unassisted item clears old result and answer',passed:reset.answer===''&&!/^Correct/.test(reset.result),observed:reset}];
  const output={run_kind:'developer_check',participant_study:false,checks};
  fs.mkdirSync(path.join(project,'evidence'),{recursive:true});fs.writeFileSync(process.env.A2_REGRESSION_OUT||path.join(project,'evidence/browser_regressions.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output));
  if(!process.env.A2_EXPECT_FAILURE&&checks.some(c=>!c.passed))process.exitCode=1;
 }finally{if(browser)await browser.close();child.kill();await new Promise(resolve=>child.exitCode!==null?resolve():child.once('exit',resolve));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
