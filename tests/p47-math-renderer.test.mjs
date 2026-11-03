/** P47-5B: source-hashed explicit authored maths and safe KaTeX renderer. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {stat} from "node:fs/promises";
import {mathRenderer,KATEX_VERSION} from "../src/app/katex-math-adapter.ts";
import {authoredTextHTML} from "../src/app/rich-content-view.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {renderAuthoredText,stimulusHTML} from "../src/app/question-content-view.ts";
import {frozenReviewMedia,sourceReviewHTML} from "../src/app/review-media-view.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {questionRevisionHash} from "../src/domain/integrity.ts";
import {pkg} from "./fixtures/six-kinds.mjs";

const TEX="\\frac{1}{2}";
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const paragraph=items=>doc([{type:"paragraph",content:items}]);
const txt=text=>({type:"text",text});
const math=(tex=TEX)=>({type:"math",tex,linearText:"one half"});
function richPack(){
 const pack=structuredClone(pkg);
 pack.stimuli=[{id:"math-table",kind:"table",title:"Rational numbers",
  columns:["Expression"],rows:[["1/2"]],
  richColumns:[paragraph([txt("Column "),math()])],
  richRows:[[paragraph([math()])]]}];
 pack.questions=pack.questions.map((q,i)=>{
  let content={...q.content,richPrompt:paragraph([txt("Compute "),math()])};
  if(i===0){
   content={...content,stimulusId:"math-table",
    richExplanation:paragraph([txt("SOLUTION-ONLY-CONTENT "),math()]),
    options:q.content.options.map((o,j)=>j===0?
     {...o,richText:paragraph([txt("Option "),math()])}:o)};
  }
  if(i===4)content={...content,leftItems:q.content.leftItems.map(x=>
   ({...x,richText:paragraph([math()])}))};
  return {...q,content,contentHash:questionRevisionHash({content,editorial:q.editorial})};
 });
 return pack;
}
test("P47-5B latest pinned KaTeX emits HTML and accessible MathML, bounded",()=>{
 assert.equal(KATEX_VERSION,"0.19.1");
 const html=mathRenderer.render({tex:TEX,linearText:"one half",displayMode:true}).html;
 assert.match(html,/katex-html/);
 assert.match(html,/katex-mathml/);
 assert.match(html,/<math/);
 assert.match(html,/pd-math-block/);
});
test("P47-5B malformed, malicious and untrusted TeX uses safe visible fallback",()=>{
 for(const tex of ["\\unknowncommand{bad}","\\href{https://evil.invalid/}{x}","\\includegraphics{https://evil.invalid/}{x}","x".repeat(2049)]){
  const html=mathRenderer.render({tex,linearText:'Figure <1> & "two"',displayMode:false}).html;
  assert.doesNotMatch(html,/<a\s+href=|<img\s+src=|<script/i);
  assert.doesNotMatch(html,/href="https?:/);
 }
 const bad=mathRenderer.render({tex:"\\thisCommandDoesNotExist",linearText:"x < y",displayMode:false}).html;
 assert.match(bad,/pd-math-fallback/);
 assert.match(bad,/aria-label="x &lt; y"/);
 assert.doesNotMatch(bad,/<y/);
});
test("P47-5B ordinary legacy text including TeX-looking dollars stays inert",()=>{
 const source="$x^2$ <script>alert(1)</script>";
 const html=authoredTextHTML(source,undefined,new Set());
 assert.equal(html,"$x^2$ &lt;script&gt;alert(1)&lt;/script&gt;");
 assert.doesNotMatch(html,/katex/);
});
test("P47-5B six-kind authored rich math, tables and explanations survive valid signed import",()=>{
 const pack=richPack();
 assert.equal(validateExamPackage(pack),pack);
 const a=startGenericAttempt(pack,"math-rich",Date.now());
 const view=renderModelExam(a,pack);
 assert.match(view,/katex-mathml/);
 assert.match(view,/Rational numbers/);
 assert.match(view,/generic-choices/);
 assert.doesNotMatch(view,/SOLUTION-ONLY-CONTENT/);
 assert.doesNotMatch(view,/Correct answer/);
 const source=frozenReviewMedia(a,a.frozen.questions[0],undefined,undefined,undefined);
 assert.match(source,/katex-html/);
 const answerHTML=renderAuthoredText(pack,"",pack.questions[0].content.richExplanation);
 assert.match(answerHTML,/SOLUTION-ONLY-CONTENT/);
 assert.match(stimulusHTML(pack,pack.questions[0]),/scroll-table/);
});
test("P47-5B tampering with frozen rich math is rejected by current SHA source contract",()=>{
 const pack=richPack();
 pack.questions[0].content.richPrompt.blocks[0].content[1].tex="\\frac{2}{3}";
 assert.throws(()=>validateExamPackage(pack),/hash|digest|mismatch/i);
 const malformed=richPack();
 malformed.questions[0].content.richPrompt.blocks[0].content[1].unsafeHTML="<img src=x onerror=alert(1)>";
 malformed.questions[0].contentHash=questionRevisionHash(malformed.questions[0]);
 assert.throws(()=>validateExamPackage(malformed),/Unknown|noncanonical|rich|Invalid|source/i);
});
test("P47-5B source/review presentation supports math only from frozen verified resources",()=>{
 const pack=richPack(),a=startGenericAttempt(pack,"source-math",Date.now());
 const q=a.frozen.questions[0],ans=pack.answerKey.entries[0].answer;
 const reference={examId:pack.examId,stimuli:pack.stimuli,assets:[],
  entries:[{targetQuestionRevisionId:q.id,sourceQuestion:q,sourceAnswer:ans}]};
 const html=sourceReviewHTML(a,q,reference);
 assert.match(html,/katex-mathml/);
 assert.match(html,/Original published answer/);
});
test("P47-5B generated release carries only offline WOFF2 and KaTeX MIT notice, no Wordgard",async()=>{
 const html=await readFile(new URL("../Practice_Desk_Offline_Mock_Tests.html",import.meta.url),"utf8");
 const size=(await stat(new URL("../Practice_Desk_Offline_Mock_Tests.html",import.meta.url))).size;
 assert.match(html,/KaTeX 0\.19\.1 LICENSE/);
 assert.match(html,/data:font\/woff2;base64,/);
 assert.doesNotMatch(html,/url\(["']?(?:\.\/)?fonts\/KaTeX/);
 assert.doesNotMatch(html,/url\([^)]*\.ttf\)/);
 assert.doesNotMatch(html,/url\([^)]*\.woff\)/);
 assert.ok(size<2_500_000,"Bundled file exceeds P47-5B review size limit: "+size);
});
