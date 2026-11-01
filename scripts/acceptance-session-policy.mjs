/** Current exam controls and foreground timing, formerly distinct Pass11/21.
 * One representative strict and one flexible session: no screenshot baseline.
 */
import {openHarness,records,check,route} from "./browser/fixtures.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
let decision="accept",dialogTexts=[];
const {page,errors,context}=await h.open({onDialog:d=>{
 dialogTexts.push(d.message());
 void (decision==="dismiss"?d.dismiss():d.accept());
}});
async function persisted(id,accept=x=>true){
 for(let n=0;n<45;n++){
  const x=(await records(page)).find(row=>row.id===id);
  if(x&&accept(x))return x;
  await page.waitForTimeout(100);
 }
 throw Error("No durable session state "+id);
}
try{
 await page.locator("#g-start").click();await route(page,"exam");
 check((await page.locator('[data-section="0"]').innerText()).includes("0 / 25 answered"),
  "Strict answered counter absent");
 check((await page.locator('[data-section="1"]').innerText()).includes("Locked"),
  "Strict next section improperly unlocked");
 check((await page.locator(".exam-question>.eyebrow").innerText()).includes("Paper Q"),
  "Exam paper-wide question number absent");
 await page.locator('input[data-choice]').first().focus();
 await page.keyboard.press("a");
 check(await page.locator('input[data-choice]').first().isChecked(),"A shortcut failed from focused radio");
 await page.keyboard.press("b");
 check(await page.locator('input[data-choice]').nth(1).isChecked(),"B shortcut failed");
 await page.keyboard.press("m");
 check(await page.locator("#g-flag").getAttribute("aria-pressed")==="true","M shortcut did not mark");
 await page.locator('input[data-choice]').nth(1).focus();
 await page.keyboard.press("ArrowRight");
 check(await page.locator('input[data-choice]').nth(2).isChecked()&&
  await page.locator('[data-q="0"]').getAttribute("aria-current")==="step",
  "Native radio ArrowRight changed question instead of answer");
 await page.keyboard.press("ArrowLeft");
 check(await page.locator('input[data-choice]').nth(1).isChecked(),"Native radio ArrowLeft failed");
 await page.keyboard.press("Alt+ArrowRight");
 check(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
  "Alt+ArrowRight failed while a radio was focused");
 await page.locator("#g-next").focus();
 await page.keyboard.press("ArrowLeft");
 check(await page.locator('[data-q="0"]').getAttribute("aria-current")==="step",
  "Unmodified arrow navigation from non-radio changed");
 await page.keyboard.press("Alt+ArrowRight");
 check(await page.locator('[data-q="1"]').getAttribute("aria-current")==="step",
  "Alt next navigation from button failed");
 check((await page.locator('[data-section="0"]').innerText()).includes("1 / 25 answered"),
  "Answered section count not updated");
 // Native fullscreen rejection must still use the same usable immersive UI.
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(Error("blocked"));});
 await page.locator("#g-exam-full").focus();await page.keyboard.press("f");
 await page.waitForFunction(()=>document.documentElement.classList.contains("immersive"));
 check(await page.locator("#g-exam-full").getAttribute("aria-pressed")==="true"&&
  await page.locator("header").isHidden()&&
  await page.locator("#displayTrigger").evaluate(x=>
   x.parentElement?.parentElement===document.body&&
   getComputedStyle(x.parentElement).position==="fixed"),
  "Fullscreen rejection did not fall back to accessible in-page immersive mode");
 await page.keyboard.press("f");
 await page.waitForFunction(()=>!document.documentElement.classList.contains("immersive"));
 await page.locator("#g-exam-full").click();
 await page.keyboard.press("Escape");
 await page.waitForFunction(()=>!document.documentElement.classList.contains("immersive"));
 decision="dismiss";
 await page.locator("#g-library").click();
 check(await page.locator("#g-timer").count()===1,"Cancelled leave discarded active exam");
 const id=new URL(await page.url()).searchParams.get("attempt");
 check(Boolean(id),"strict saved exam URL lost ID");
 decision="accept";
 await page.locator("#g-library").click();await route(page,"library");
 const left=await persisted(id,x=>x.state.visible===false);
 const first=left.frozen.paper.sections[0].questionRevisionIds[0];
 const spent=left.state.responses.find(x=>x.questionRevisionId===first)?.timeSpentMs??0;
 await page.waitForTimeout(1200);
 await page.locator('[data-attempt="'+id+'"]').first().click();await route(page,"exam");
 const back=await persisted(id,x=>x.state.visible===true&&x.state.elapsedMs>left.state.elapsedMs+700);
 check((back.state.responses.find(x=>x.questionRevisionId===first)?.timeSpentMs??0)-spent<350,
  "Background interval was falsely treated as active question dwell time");
 await page.locator("#g-library").click();await route(page,"library");
 decision="dismiss";dialogTexts=[];
 await page.locator("#g-start").click();
 check(await page.locator("#g-start").count()===1,
  "Cancelled start-over unexpectedly discarded unfinished exam");
 decision="accept";dialogTexts=[];
 await page.locator("#g-start").click();await route(page,"exam");
 check((await records(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt===null).length>=2,
  "Starting another exam erased an unfinished attempt");
 await page.locator("#g-submit").click();
 check((await page.locator('[data-section="0"]').innerText()).includes("Closed")&&
  (await page.locator('[data-section="2"]').innerText()).includes("Locked"),
  "Strict section submitted without correct Closed/Locked navigator state");
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();await route(page,"exam");
 await page.locator('input[data-choice]').nth(1).click();
 const timer=await page.locator("#g-timer").innerText();
 await page.locator("#g-pause").click();
 check(await page.locator("#g-flag").isEnabled(),"Paused exam disabled permitted flagging");
 for(const id of ["#g-next","#g-prev","#g-submit","#g-clear"])
  check(await page.locator(id).isDisabled(),"Paused exam enables forbidden control "+id);
 check(await page.locator("input[data-choice]").first().isDisabled(),
  "Paused answers remain editable");
 await page.locator("#g-flag").click();
 check(await page.locator("#g-flag").getAttribute("aria-pressed")==="true",
  "Paused flagging failed");
 await page.locator("#g-pause").focus();await page.keyboard.press("m");
 check(await page.locator("#g-flag").getAttribute("aria-pressed")==="false",
  "Paused M shortcut did not clear marker");
 await page.keyboard.press("a");
 check(await page.locator('input[data-choice]').nth(1).isChecked(),
  "Paused A shortcut altered frozen answer");
 await page.waitForTimeout(130);
 check(await page.locator("#g-timer").innerText()===timer,
  "Flagging during pause consumed exam time");
 await page.locator("#g-pause").click();
 check(await page.locator("#g-next").isEnabled(),"Resume failed to restore navigation");
 check(errors.length===0,"Page errors "+errors.join("; "));
 await h.evidence("session-contracts",{keyboard:true,fullscreenFallback:true,
  leaveConfirm:true,backgroundQuestionDwell:true,pendingPreserved:true,pausedFlagging:true});
 console.log("MODERN SESSION PASS shortcuts, radio arrows, immersive rejection, leave/start confirmation, background dwell, pause flagging");
}catch(e){await h.diagnose("session",page,e);throw e;}
finally{await context.close();await h.finish();}
