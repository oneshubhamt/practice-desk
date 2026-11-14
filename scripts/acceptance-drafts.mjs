/** Current-app G07/G08 response-contract browser tests, without Pass21 SHA parity. */
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {chooseModernPaper} from "./paper-select.mjs";
import {openHarness,offlineUrl,check} from "./browser/fixtures.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const browser=h.browser,modern=offlineUrl,ensure=check,errors=[];
async function attempts(page){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open("practiceDesk.history",1);
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{
   const db=req.result,request=db.transaction("attempts","readonly").objectStore("attempts").getAll();
   request.onsuccess=()=>{resolve(request.result.filter(x=>x.recordType==="generic-attempt"));db.close();};
   request.onerror=()=>{reject(request.error);db.close();};
  };
 }));
}
async function eventuallySaved(page,condition,label){
 for(let i=0;i<45;i++){
  const all=await attempts(page);
  if(condition(all))return all;
  await page.waitForTimeout(75); // bounded polling for asynchronous IDB checkpoint
 }
 throw Error("Timed out waiting for durable "+label);
}

// Sidebar counts belong to the active three-question section of this six-kind paper.
async function responseTest(){
 const ctx=await browser.newContext();
 const page=await ctx.newPage();page.setDefaultTimeout(14000);
 page.on("pageerror",e=>errors.push("response: "+e.message));
 page.on("dialog",d=>{void d.accept()});
 try{
  await page.goto(modern,{waitUntil:"load"});
  await page.locator("#g-file").setInputFiles({
   name:"six-kinds.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(pkg))
  });
  await chooseModernPaper(page,pkg.paper.id);
  await page.locator("#g-start").click();
  await page.locator('[data-q="1"]').click();
  await page.locator('[data-choice="x"]').check();
  ensure(await page.locator('[data-choice="x"]').isChecked(),
    "G07: first checkbox selection was immediately lost");
  ensure((await page.locator(".generic-response-group [role=status]").innerText()).includes("Unsaved draft"),
    "G07: incomplete selection not explicitly marked unsaved");
  ensure((await page.locator(".navigator-stats b").first().innerText()).replace(/\s+/g," ").trim()==="0 / 3",
    "G07: incomplete checkbox selection incorrectly scored");
  await page.locator('[data-choice="y"]').check();
  ensure(await page.locator(".generic-response-group [role=status]").count()===0,
    "G07: valid 2-option selection still reports unscored draft");
  ensure((await page.locator(".navigator-stats b").first().innerText()).replace(/\s+/g," ").trim()==="1 / 3",
    "G07: valid two-option answer not committed");
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-1"&&x.response?.kind==="multiple-select"&&x.response.optionIds.length===2)),
    "committed two-option answer");
  await page.locator('[data-choice="x"]').uncheck();
  ensure(await page.locator('[data-choice="y"]').isChecked(),
    "G07: partial edit was not preserved visibly");
  ensure((await page.locator(".generic-response-group [role=status]").innerText()).includes("not saved to your attempt"),
    "G07: partial edit is not disclosed as transient");
  ensure((await page.locator(".navigator-stats b").first().innerText()).replace(/\s+/g," ").trim()==="0 / 3",
    "G07: outdated previously saved answer still counts");
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-1"&&x.response===undefined)),
    "clear of obsolete valid answer");
  await page.locator('[data-q="2"]').click();
  await page.locator('[data-q="1"]').click();
  ensure(await page.locator('[data-choice="y"]').isChecked(),
    "G07: draft should survive in-tab question navigation");
  await page.reload({waitUntil:"load"});
  // Native exam deep links resume the saved attempt directly after reload.
  // Library-only resume entry is still valid for a non-routed initial page.
  if(await page.locator("#g-pending-attempts .recent-attempt").count())
    await page.locator("#g-pending-attempts .recent-attempt").first().click();
  else await page.locator("#g-next").waitFor({state:"visible"});
  await page.locator('[data-q="1"]').click();
  ensure(!(await page.locator('[data-choice="y"]').isChecked()),
    "G07: volatile draft was misleadingly persisted through reload");
  ensure((await page.locator(".navigator-stats b").first().innerText()).replace(/\s+/g," ").trim()==="0 / 3",
    "G07: reload revived old previously saved selection");
  await page.locator('[data-section="1"]').click();
  await page.locator('[data-q="1"]').click();
  const selects=page.locator("[data-match]");
  ensure(await selects.count()===2,"G08: matching selectors unavailable");
  await selects.nth(0).selectOption("r1");
  await selects.nth(1).selectOption("r1");
  ensure(await page.locator("#g-save").isDisabled(),
    "G08: Save not blocked on duplicate right target");
  ensure(await page.locator('[data-match][aria-invalid="true"]').count()===2,
    "G08: both conflicting rows were not identified");
  ensure((await page.locator("#g-match-feedback").innerText()).includes("First"),
    "G08: conflict feedback does not name repeated target");
  await selects.nth(1).selectOption("r2");
  ensure(await page.locator("[data-match][aria-invalid=true]").count()===0,
    "G08: resolved matches remain in error state");
  ensure(await page.locator("#g-save").isEnabled(),
    "G08: Save did not recover after correcting duplicate");
  ensure((await page.locator("#g-match-feedback").innerText()).includes("not yet saved"),
    "G08: valid but uncommitted selection not identified");
  await page.locator("#g-save").click();
  await eventuallySaved(page,rows=>rows.some(a=>a.state.responses.some(x=>
    x.questionRevisionId==="rev-4"&&x.response?.kind==="matching"&&x.response.pairs.length===2)),
    "matching response");
  await page.locator('[data-q="0"]').click();
  await page.locator('[data-q="1"]').click();
  ensure(await selects.nth(0).inputValue()==="r1"&&await selects.nth(1).inputValue()==="r2",
    "G08: corrected matching pairs not restored from saved record");
  console.log("MODERN DRAFTS G07/G08: incomplete drafts, saved-answer clearing, reload, conflicts and keyboard-correctable native matching PASS");
 }finally{await ctx.close();}
}

try{await responseTest();check(errors.length===0,"Browser exceptions: "+errors.join("; "));}
finally{await h.finish();}
