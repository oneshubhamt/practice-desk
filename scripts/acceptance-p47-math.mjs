/** P47-5B: actual file:// imported mathematical content, pre-submit key secrecy and post-submit review.
 * No screenshot parity or remote services. Same fixture in Chromium, Firefox and WebKit.
 */
import {openHarness,route,check,assertNoOverflow,records} from "./browser/fixtures.mjs";
import {pkg} from "../tests/fixtures/six-kinds.mjs";
import {questionRevisionHash} from "../src/domain/integrity.ts";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,errors}=await h.open({viewport:{width:390,height:844}});
const requests=[];
page.on("request",r=>{if(/^https?:/i.test(r.url()))requests.push(r.url());});
const TEX="\\frac{a}{b}";
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const math=()=>({type:"math",tex:TEX,linearText:"a divided by b"});
const rich=label=>doc([{type:"paragraph",content:[{type:"text",text:label},math()]}]);
function authoredMath(){
 const p=structuredClone(pkg);
 p.examId="cat-math";
 p.title="CAT mathematical notation (source verified)";
 p.paper={...p.paper,id:"cat-math-paper-r1",paperId:"cat-math-paper"};
 p.answerKey={...p.answerKey,id:"cat-math-key-r1",paperId:"cat-math-paper"};
 p.paper.answerKeyRevisionId=p.answerKey.id;
 // Rehash exact authored paper/key IDs.
 p.answerKey.contentHash=p.answerKey.contentHash;
 p.questions=p.questions.map((q,i)=>{
  const c={...q.content,richPrompt:rich("Question "+i+" algebra "),
    ...(i===0?{richExplanation:rich("P47-SOLUTION-SECRET "),
      options:q.content.options.map((o,j)=>j===0?{...o,richText:rich("Choice ")}:o)}:{})};
  return {...q,content:c,contentHash:questionRevisionHash({content:c,editorial:q.editorial})};
 });
 return p;
}
const {paperRevisionHash}=await import("../src/domain/integrity.ts");
try{
 const p=authoredMath();
 p.paper.contentHash=paperRevisionHash(p.paper);
 // Invalid changed TeX with stale SHA is rejected before current-source installation.
 const tampered=structuredClone(p);
 tampered.questions[0].content.richPrompt.blocks[0].content[1].tex="x^2";
 await page.locator("#g-file").setInputFiles({name:"bad-maths.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(tampered))});
 check((await page.locator(".generic-warning").allTextContents()).some(s=>/hash|mismatch|import/i.test(s)),
  "Tampered rich mathematical content accepted silently");
 await page.locator("#g-file").setInputFiles({name:"cat-rich-maths.json",mimeType:"application/json",
  buffer:Buffer.from(JSON.stringify(p))});
 await page.waitForFunction(id=>document.querySelector("#g-papers")?.value===id,p.paper.id);
 await page.locator("#g-start").click();await route(page,"exam");
 check(await page.locator(".pd-math .katex-mathml").count()>=2,"Read-only rich question and option maths missing");
 check((await page.locator(".pd-rich-prompt .pd-rich-content").innerText()).includes("Question 0 algebra"),
   "Imported authored prompt missing");
 check(!(await page.locator("body").innerText()).includes("P47-SOLUTION-SECRET"),
  "Worked solution leaked before submission");
 check(await page.locator(".worked-solution").count()===0,"Solution UI appeared during active test");
 await page.locator("#displayTrigger").click();
 for(let i=0;i<8;i++)await page.locator("#fontMore").click();
 check((await page.locator("#fontReset").innerText())==="140%","140% scaling absent");
 await page.locator("#displayClose").click();
 await page.setViewportSize({width:195,height:844});
 await assertNoOverflow(page,"P47-5B 195px + 140% mathematical exam");
 const scrollCheck=await page.evaluate(()=>[...document.querySelectorAll(".pd-math-block")].every(el=>
   el.scrollWidth>=el.clientWidth&&el.clientWidth<=document.documentElement.clientWidth));
 check(scrollCheck,"Math scrolling exceeded browser viewport");
 await page.locator('input[data-choice]').first().check();
 await page.locator("#g-submit").click();await route(page,"result");
 await page.locator("#result-tab-review").click();await page.locator("#result-review").waitFor({state:"visible"});
 check(await page.locator(".pd-math .katex-mathml").count()>=6,"Post-submit six-kind math review unavailable");
 await page.locator(".worked-solution").first().locator("summary").click();
 check((await page.locator(".worked-solution").first().innerText()).includes("P47-SOLUTION-SECRET"),
  "Rich worked explanation absent in authorized Results");
 await assertNoOverflow(page,"P47-5B narrow reviewed maths");
 const rows=(await records(page)).filter(x=>x.recordType==="generic-attempt"&&x.finishedAt);
 const saved=rows.find(x=>x.packageId===p.paper.id);
 check(Boolean(saved),"Rich mathematical attempt not stored");
 check(saved.frozen.questions[0].content.richPrompt.blocks[0].content[1].tex===TEX,
  "Source math did not remain frozen by exact hash");
 await page.reload({waitUntil:"load"});await route(page,"result");
 await page.locator("#result-tab-review").click();
 check(await page.locator(".pd-math .katex-mathml").count()>=6,
  "Restored frozen mathematical display missing after reload");
 check(requests.length===0,"Mathematical rendering requested network resources: "+JSON.stringify(requests));
 check(errors.length===0,"Browser JavaScript errors: "+errors.join("; "));
 console.log("P47-5B MATH PASS "+engine+": imported frozen six-kind rich math, embargo, 195px+140%, offline fonts, review/reload");
}catch(e){await h.diagnose("p47-5b-math-"+engine,page,e);throw e;}
finally{await h.finish();}
