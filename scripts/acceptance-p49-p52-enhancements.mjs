/** P49–P52 live offline code, not a screenshot/parity-only oracle.
 * Runs against the built self-contained file in each supported browser engine.
 */
import {openHarness,route,check,assertNoOverflow} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open({viewport:{width:1280,height:850}});
try{
 await page.locator("#displayTrigger").click();
 await page.locator("#shortcut-settings summary").click();
 const mapping={previous:"j",next:"k",answerA:"1",answerB:"2",
  answerC:"3",answerD:"4",flag:"r",fullscreen:"z"};
 for(const [name,key] of Object.entries(mapping))
  await page.locator("#shortcut-"+name).selectOption(key);
 await page.locator("#shortcut-apply").click();
 check((await page.locator("#shortcut-status").innerText()).includes("saved"),
  engine+" shortcut changes not visibly saved");
 check(await page.evaluate(()=>JSON.parse(localStorage.getItem("practiceDesk.shortcuts.v1")??"{}").next==="k"),
  engine+" shortcut settings not persisted");
 await page.locator("#displayClose").click();
 await page.locator("#g-start").click();await route(page,"exam");
 check((await page.locator(".navigator-help").innerText()).includes("1/2/3/4"),
  engine+" keyboard help does not reflect actual configured choices");
 await page.locator(".navigator-help summary").click();
 await page.evaluate(()=>{
  window.__p51Header=document.querySelector(".exam-header");
  window.__p51Sidebar=document.querySelector(".exam-sidebar");
  window.__p51Question=document.querySelector(".exam-question");
  window.__p51Help=document.querySelector(".navigator-help");
  document.querySelector(".exam-header h1").focus();
 });
 const oldQ=await page.locator(".exam-question").getAttribute("data-active-question");
 await page.keyboard.press("1");
 check(await page.locator("input[data-choice]").first().isChecked(),
  engine+" remapped digit did not choose first option");
 await page.keyboard.press("k");
 const newQ=await page.locator(".exam-question").getAttribute("data-active-question");
 check(oldQ!==newQ,engine+" remapped navigation did not move to next frozen question");
 check(await page.evaluate(()=>window.__p51Header===document.querySelector(".exam-header")&&
  window.__p51Sidebar===document.querySelector(".exam-sidebar")&&
  window.__p51Help===document.querySelector(".navigator-help")&&
  window.__p51Question!==document.querySelector(".exam-question")),
  engine+" question switch replaced entire Exam shell or reused stale question panel");
 check(await page.locator(".navigator-help").getAttribute("open")!==null,
  engine+" unchanged native keyboard help collapsed during new question");
 check(!(await page.locator("input[data-choice]").first().isChecked()),
  engine+" answer selection from prior question leaked into the next question");
 await page.locator("#displayTrigger").click();
 await page.locator("#shortcut-reset").click();
 check((await page.locator("#shortcut-next").inputValue())==="arrowright",
  engine+" shortcut reset did not restore defaults");
 await page.locator("#displayClose").click();
 await page.keyboard.press("ArrowRight");
 check((await page.locator(".exam-question").getAttribute("data-active-question"))!==newQ,
  engine+" restored arrow mapping did not navigate");
 await page.setViewportSize({width:195,height:844});
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 await page.locator("#shortcut-settings summary").click().catch(()=>{});
 await assertNoOverflow(page,engine+" 195px and 140% Display keyboard editor");
 await page.locator("#displayClose").click();
 await assertNoOverflow(page,engine+" 195px and 140% Exam");
 await page.setViewportSize({width:1280,height:850});
 await page.locator("#g-library").click();await route(page,"library");
 await page.locator("#g-author-open").click();
 await page.locator("#pd-author-heading").waitFor({state:"visible"});
 await page.locator(".pd-author-paper-settings summary").click();
 await page.locator("#pd-author-timing-kind").selectOption("sectional");
 check((await page.locator("#pd-author-section-nav").inputValue())==="sequential-locked",
  engine+" sectional authoring does not enforce locked section navigation");
 await page.locator("#pd-author-topic").fill("Economy");await page.locator("#pd-author-topic").blur();
 await page.locator("#pd-author-subtopic").fill("Inflation");await page.locator("#pd-author-subtopic").blur();
 await page.locator("#pd-author-difficulty").selectOption("medium");
 await page.locator("#pd-author-section-minutes").fill("17");await page.locator("#pd-author-section-minutes").blur();
 const authored=await page.evaluate(()=>{
  const shelf=JSON.parse(localStorage.getItem("practiceDesk.authoring.drafts.v1")??"null");
  const draft=shelf?.drafts.find(d=>d.id===shelf.activeId);
  return {draft,q:draft?.questions[0]};
 });
 check(authored.draft?.timingKind==="sectional"&&
  authored.draft?.sectionNavigation==="sequential-locked"&&
  authored.q?.topic==="Economy"&&authored.q?.subtopic==="Inflation"&&
  authored.q?.difficulty==="medium"&&authored.q?.sectionMinutes===17,
  engine+" rich authoring controls not stored in validated local draft");
 await page.locator("#pd-author-close").click();
 check(errors.length===0,engine+" browser errors "+errors.join("; "));
 console.log("P49–P52 "+engine+" PASS: safe shortcut edit/reset, keyed Exam navigation, overflow and rich draft policies");
}catch(error){await h.diagnose("p49-p52-"+engine,page,error);throw error;}
finally{await context.close();await h.finish();}
