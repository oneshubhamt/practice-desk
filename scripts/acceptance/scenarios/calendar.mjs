/** Stable product-domain browser scenarios. */

export async function calendarIntegration(){
// Consolidated from scripts/acceptance-calendar.mjs; retained browser-only assertions remain intact.
/** First-class Practice Desk Calendar integration journey.
 * Covers file:// routing, host-owned durability/source actions, presentation mapping,
 * backup/restore and the separately built static target.
 */
const {createServer}=await import("node:http");
const {readFile}=await import("node:fs/promises");
const {extname,join}=await import("node:path");
const {openHarness,route,check,records,assertNoOverflow,root}=await import("../../browser/fixtures.mjs");
const {chooseModernPaper}=await import("../../paper-select.mjs");
const {pkg}=await import("../../../tests/fixtures/six-kinds.mjs");
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/calendar"});
const {page,errors}=await h.open({viewport:{width:1280,height:850}});

async function calendarAction(label){
  const occurrences=page.locator("#pd-calendar-mount [data-occurrence-id]");
  const count=await occurrences.count();
  for(let i=0;i<count;i++){
    await occurrences.nth(i).click();
    const dialog=page.locator("#pd-calendar-mount dialog.dc-details-dialog");
    await dialog.waitFor({state:"visible"});
    const action=dialog.getByRole("button",{name:label,exact:true});
    if(await action.count()&&await action.isEnabled()){
      await action.click();
      return true;
    }
    await dialog.getByRole("button",{name:"Close",exact:true}).click();
  }
  return false;
}
async function waitRecord(predicate){
  for(let i=0;i<80;i++){
    const row=(await records(page)).find(predicate);
    if(row)return row;
    await page.waitForTimeout(50);
  }
  return null;
}
async function openCalendar(){
  const button=page.getByRole("button",{name:"Calendar",exact:true});
  await button.click();await route(page,"calendar");
  await page.locator("#pd-calendar-mount .dc-root").waitFor({state:"visible"});
}

let downloadedPath="";
try{
  await page.locator("#g-file").setInputFiles({
    name:"calendar-six-kinds.json",mimeType:"application/json",
    buffer:Buffer.from(JSON.stringify(pkg))
  });
  await chooseModernPaper(page,pkg.paper.id);
  await openCalendar();

  const light=await page.locator("#pd-calendar-mount .dc-root").evaluate(el=>({
    bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color
  }));
  await page.locator("#displayTrigger").click();
  await page.locator("#themeDark").click();
  await page.waitForFunction(light=>{
    if(document.documentElement.dataset.theme!=="dark")return false;
    const el=document.querySelector("#pd-calendar-mount .dc-root");
    if(!(el instanceof HTMLElement))return false;
    const style=getComputedStyle(el);
    return style.backgroundColor!==light.bg&&style.color!==light.color;
  },light);
  const dark=await page.locator("#pd-calendar-mount .dc-root").evaluate(el=>({
    bg:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color
  }));
  check(light.bg!==dark.bg&&light.color!==dark.color,
    engine+" Calendar did not follow Practice Desk light/dark semantic tokens: "+
    JSON.stringify({light,dark}));
  await page.locator("#themeLight").click();
  await page.waitForFunction(light=>{
    if(document.documentElement.dataset.theme!=="light")return false;
    const el=document.querySelector("#pd-calendar-mount .dc-root");
    if(!(el instanceof HTMLElement))return false;
    const style=getComputedStyle(el);
    return style.backgroundColor===light.bg&&style.color===light.color;
  },light);

  const baseCalendarFont=await page.locator("#pd-calendar-mount .dc-root").evaluate(
    el=>Number.parseFloat(getComputedStyle(el).fontSize));
  for(let i=0;i<8;i++)await page.locator("#fontMore").click();
  await page.waitForFunction(()=>getComputedStyle(document.documentElement)
    .getPropertyValue("--type-scale").trim()==="1.4");
  await page.waitForFunction(base=>{
    const el=document.querySelector("#pd-calendar-mount .dc-root");
    return el instanceof HTMLElement&&
      Number.parseFloat(getComputedStyle(el).fontSize)>=base*1.35;
  },baseCalendarFont);
  const scaledCalendarFont=await page.locator("#pd-calendar-mount .dc-root").evaluate(
    el=>Number.parseFloat(getComputedStyle(el).fontSize));
  check(scaledCalendarFont>=baseCalendarFont*1.35,
    engine+" Calendar did not follow Practice Desk text-scale presentation: "+
    JSON.stringify({baseCalendarFont,scaledCalendarFont}));
  await page.locator("#fontReset").click();
  await page.waitForFunction(base=>{
    const el=document.querySelector("#pd-calendar-mount .dc-root");
    return el instanceof HTMLElement&&
      Math.abs(Number.parseFloat(getComputedStyle(el).fontSize)-base)<0.2;
  },baseCalendarFont);
  await page.locator("#displayClose").click();

  await page.setViewportSize({width:390,height:844});
  await assertNoOverflow(page,engine+" Calendar narrow");
  await page.setViewportSize({width:1280,height:850});

  await page.locator("#calendar-package").selectOption(pkg.paper.id);
  await page.locator("#calendar-duration").fill("45");
  await page.locator("#calendar-schedule").click();
  const scheduled=await waitRecord(x=>x.recordType==="calendar-scheduled-mock");
  check(Boolean(scheduled),engine+" scheduled mock was not stored in canonical Practice Desk records");
  check(scheduled.packageRevisionId===pkg.paper.id&&scheduled.durationMinutes===45,
    engine+" scheduled mock lost package identity or duration");
  await page.locator("#pd-calendar-mount [data-occurrence-id]").filter({hasText:pkg.title}).first()
    .waitFor({state:"visible"});

  check(await calendarAction("Launch mock"),engine+" Calendar launch action unavailable");
  await route(page,"exam");
  check((await records(page)).some(x=>x.recordType==="calendar-scheduled-mock"&&x.id===scheduled.id),
    engine+" launching a mock incorrectly consumed durable schedule state");
  await page.locator("#g-submit").click();await route(page,"result");
  const attemptId=new URL(await page.url()).searchParams.get("attempt");
  check(Boolean(attemptId),engine+" scheduled launch did not create routed attempt");

  await page.locator("#result-tab-review").click();
  const add=page.locator("[data-add-card]").first();
  await add.click();
  const learning=await waitRecord(x=>x.recordType==="learning-card");
  check(Boolean(learning),engine+" result review did not create Learning card");

  await page.locator("#g-calendar-results").click();await route(page,"calendar");
  check(await calendarAction("Open result"),engine+" completed-attempt source action unavailable");
  await route(page,"result");
  check(new URL(await page.url()).searchParams.get("attempt")===attemptId,
    engine+" Calendar result action lost attempt identity");
  await page.locator("#g-calendar-results").click();await route(page,"calendar");

  check(await calendarAction("Open learning card"),engine+" Learning-card source action unavailable");
  await route(page,"learning");
  check(await page.locator("[data-learning-card]").getAttribute("data-learning-card")===learning.id,
    engine+" Calendar Learning action did not select the source card");
  await page.getByRole("button",{name:"Calendar",exact:true}).click();await route(page,"calendar");

  await page.getByRole("button",{name:"Library",exact:true}).click();await route(page,"library");
  await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
  const downloadPromise=page.waitForEvent("download");
  await page.locator("#g-export-history").click();
  const download=await downloadPromise;
  downloadedPath=await download.path();
  const exported=JSON.parse(await readFile(downloadedPath,"utf8"));
  check(exported.version===5&&Boolean(exported.revisionSettings),
    engine+" Calendar-aware backup did not include canonical v5 scheduler settings");
  check(exported.records.some(x=>x.recordType==="calendar-scheduled-mock"&&x.id===scheduled.id),
    engine+" durable scheduled mock absent from backup");

  await page.locator("#g-calendar-history").click();await route(page,"calendar");
  check(await calendarAction("Delete schedule"),engine+" schedule deletion action unavailable");
  await page.waitForFunction(async id=>{
    const db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open("practiceDesk.history",1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    try{
      const result=await new Promise((resolve,reject)=>{
        const r=db.transaction("attempts","readonly").objectStore("attempts").get(id);
        r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
      });
      return !result;
    }finally{db.close();}
  },scheduled.id);

  await page.getByRole("button",{name:"Library",exact:true}).click();await route(page,"library");
  await page.getByRole("button",{name:/History & insights/}).click();await route(page,"history");
  await page.locator("#g-history-file").setInputFiles(downloadedPath);
  check(Boolean(await waitRecord(x=>x.recordType==="calendar-scheduled-mock"&&x.id===scheduled.id)),
    engine+" backup import did not restore scheduled Calendar state");
  await page.locator("#g-calendar-history").click();await route(page,"calendar");
  await page.locator("#pd-calendar-mount [data-occurrence-id]").filter({hasText:pkg.title}).first()
    .waitFor({state:"visible"});
  check(errors.length===0,engine+" Calendar standalone runtime errors "+errors.join("; "));

  // Static target: serve the actual separately built artifact rather than reusing file:// HTML.
  const staticRoot=join(root,"Practice_Desk_Static");
  const server=createServer(async(req,res)=>{
    try{
      const raw=(req.url??"/").split("?")[0];
      const relative=raw==="/"?"index.html":decodeURIComponent(raw.slice(1));
      if(relative.includes(".."))throw Error("invalid path");
      const file=join(staticRoot,relative);
      const bytes=await readFile(file);
      const ext=extname(file);
      res.setHeader("Content-Type",ext===".html"?"text/html; charset=utf-8":
        ext===".js"?"text/javascript; charset=utf-8":ext===".wasm"?"application/wasm":"application/octet-stream");
      res.end(bytes);
    }catch{res.statusCode=404;res.end("not found");}
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  try{
    const address=server.address();
    check(address&&typeof address==="object","static test server did not bind");
    const context=await h.browser.newContext({viewport:{width:390,height:844}});
    const staticPage=await context.newPage();
    const staticErrors=[];staticPage.on("pageerror",e=>staticErrors.push(String(e)));
    try{
      await staticPage.goto("http://127.0.0.1:"+address.port+"/index.html",{waitUntil:"load"});
      await staticPage.getByRole("button",{name:/^Start /}).waitFor({state:"visible"});
      await staticPage.getByRole("button",{name:"Calendar",exact:true}).click();
      await staticPage.waitForFunction(()=>new URL(location.href).searchParams.get("pd")==="calendar");
      await staticPage.locator("#pd-calendar-mount .dc-root").waitFor({state:"visible"});
      check(staticErrors.length===0,engine+" static Calendar runtime errors "+staticErrors.join("; "));
    }finally{await context.close();}
  }finally{await new Promise(resolve=>server.close(resolve));}

  await h.evidence("calendar-"+engine,{
    engine,attemptId,learningCardId:learning.id,scheduledMockId:scheduled.id,
    backupVersion:exported.version,standalone:true,static:true,darkLight:true,typeScale:true,narrow:true
  });
  console.log("CALENDAR "+engine+" PASS: route, durable schedule, source actions, backup restore, theme, narrow, file/static");
}catch(error){
  await h.diagnose("calendar-"+engine,page,error);throw error;
}finally{await h.finish();}
}
