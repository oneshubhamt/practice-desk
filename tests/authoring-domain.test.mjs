/** Domain-organized authoring contracts.
 * All 27 historical test registrations and their original source bodies are
 * carried unchanged, each in a lexical scope. One new property oracle follows.
 * Migration and source hashes: docs/TEST_SUITE_LEDGER.md.
 */
import * as __dep_0 from "node:test";
import * as __dep_1 from "node:assert/strict";
import * as __dep_2 from "node:fs/promises";
import * as __dep_3 from "../src/domain/rich-document.ts";
import * as __dep_4 from "../src/authoring/authoring-draft.ts";
import * as __dep_5 from "../src/authoring/wordgard-document-bridge.ts";
import * as __dep_6 from "../src/authoring/authoring-publisher.ts";
import * as __dep_7 from "../src/app/exam-package.ts";
import * as __dep_8 from "../src/domain/integrity.ts";
import * as __dep_9 from "../src/engine/scoring.ts";
import * as __dep_10 from "../src/domain/hash.ts";
import * as __dep_11 from "../src/authoring/authoring-sections.ts";
import * as __dep_12 from "../src/authoring/authoring-preview.ts";
import * as __dep_13 from "../src/authoring/external-bank.ts";

// === Unchanged tests from tests/p47-rich-document.test.mjs (source blob 6eb45817f1a6075e3e1c28080fd4f52f30103974) ===
{
const test=__dep_0.default;
const assert=__dep_1.default;
const {readFile}=__dep_2;
const {validateRichDocument,plainRichDocument,canonicalRichDocument,RICH_LIMITS}=__dep_3;
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const txt=(text,marks)=>({type:"text",text,...(marks?{marks}:{})});
const assets={knownAssets:new Set(["fig-1"])};

test("P47-5A canonical immutable normalized marks and explicit math",()=>{
  const a=doc([{type:"paragraph",content:[txt("P",["emphasis","strong"])]},
    {type:"display-math",tex:"\\frac12",linearText:"one half"}]);
  const b=doc([{type:"paragraph",content:[txt("P",["strong","emphasis"])]},a.blocks[1]]);
  assert.equal(canonicalRichDocument(a),canonicalRichDocument(b));
  const result=validateRichDocument(a);
  a.blocks[0].content[0].text="mutated";
  assert.equal(result.blocks[0].content[0].text,"P");
  assert.ok(Object.isFrozen(result.blocks[0].content));
});
test("P47-5A rectangles, local assets and lists are canonical",()=>{
  const a=doc([
    {type:"table",rows:[[[txt("a")],[{type:"math",tex:"x^2",linearText:"x squared"}]]]},
    {type:"image",assetId:"fig-1",altText:"labelled diagram"},
    {type:"list",ordered:true,items:[[txt("i")],[txt("ii")]]}
  ]);
  assert.equal(validateRichDocument(a,assets).blocks.length,3);
  assert.throws(()=>validateRichDocument(a));
});
test("P47-5A rejects active HTML, remote assets and untrusted fields",()=>{
  const cases=[
    doc([{type:"paragraph",content:[{type:"text",text:"OK",onclick:"evil()"}]}]),
    doc([{type:"paragraph",content:[{type:"math",tex:"x",linearText:"x",html:"bad"}]}]),
    doc([{type:"image",assetId:"https://evil",altText:"bad"}]),
    doc([{type:"paragraph",content:[txt("x",["strong","strong"])]}]),
    doc([{type:"heading",level:1,content:[txt("No")]}]),
    doc([{type:"table",rows:[[[txt("a")]],[[txt("b")],[txt("c")]]]}])
  ];
  for(const value of cases)assert.throws(()=>validateRichDocument(value,assets));
});
test("P47-5A rejects budget overflow and prototype-inherited metadata",()=>{
  assert.throws(()=>validateRichDocument(doc([{type:"display-math",tex:"x".repeat(RICH_LIMITS.tex+1),linearText:"x"}])));
  assert.throws(()=>validateRichDocument(doc(Array.from({length:RICH_LIMITS.blocks+1},()=>({type:"paragraph",content:[]})))));
  assert.throws(()=>validateRichDocument(Object.assign(Object.create({unsafe:1}),doc([]))));
});
test("P47-5A app-owned ports do not import vendors, persist data or mutate application engines",async()=>{
  for(const path of ["src/authoring/vendor-ports.ts","src/learning/revision-scheduler-port.ts","src/domain/rich-document.ts"]){
    const content=await readFile(new URL("../"+path,import.meta.url),"utf8");
    for(const vendor of ["from \"wordgard","from \"katex","from \"ts-fsrs"])
      assert.ok(!content.includes(vendor),path+" imports vendor "+vendor);
    assert.ok(!content.includes("indexedDB")&&!content.includes("localStorage"));
  }
});
}


// === Unchanged tests from tests/p47-authoring.test.mjs (source blob bb7d1b8042b74afa4f4bff19b0fdecb048311298) ===
{
const test=__dep_0.default;
const assert=__dep_1.default;
const {readFile}=__dep_2;
const {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft,validateAuthoringShelf,AUTHORING_KEY}=__dep_4;
const {plainRichDocument}=__dep_3;
const {decodeAuthorAtom,encodeAuthorAtom,richToWordgardHTML}=__dep_5;
test("P47-5C draft is not a published paper or answer key and covers six kinds",()=>{
 const kinds=["single-choice","multiple-select","numeric-entry","true-false","matching","free-response"];
 const a=newAuthoringDraft();
 const s=validateAuthoringDraft({...a,questions:kinds.map(kind=>newAuthoringQuestion(kind))});
 assert.equal(s.questions.length,6);
 assert.ok(!("contentHash" in s));
 assert.ok(!("frozen" in s));
 assert.ok(!("score" in s));
 assert.equal(AUTHORING_KEY,"practiceDesk.authoring.drafts.v1");
});
test("P47-5C app-owned draft rejects malicious, duplicate and malformed content",()=>{
 const a=newAuthoringDraft();
 const q=a.questions[0];
 for(const x of [
  {...a,unexpected:"<script>"},
  {...a,questions:[]},
  {...a,questions:[q,q]},
  {...a,questions:[{...q,kind:"custom-script"}]},
  {...a,questions:[{...q,prompt:{...q.prompt,html:"<iframe>"}}]},
  {...a,marksIncorrect:Infinity},
  {...a,assets:[{id:"url",dataUri:"https://external.example/image"}]}
 ])assert.throws(()=>validateAuthoringDraft(x));
});
test("P47-5C shelf is independent of exam attempts and blocks unknown active IDs",()=>{
 const d=newAuthoringDraft();
 const s=validateAuthoringShelf({schema:1,activeId:d.id,drafts:[d]});
 assert.equal(s.drafts[0].questions[0].kind,"single-choice");
 assert.throws(()=>validateAuthoringShelf({schema:1,activeId:"unknown",drafts:[d]}));
});
test("P47-5C math and local image tokens never contain remote URLs or execute HTML",()=>{
 const a={type:"math",tex:"x^2",linearText:"x squared"};
 assert.deepEqual(decodeAuthorAtom(encodeAuthorAtom(a)),a);
 assert.throws(()=>decodeAuthorAtom(encodeAuthorAtom({type:"xss",code:"evil"})));
 assert.throws(()=>decodeAuthorAtom("invalid percent %"));
 const doc=plainRichDocument("<script>alert(1)</script>");
 const html=richToWordgardHTML(doc,new Set());
 assert.ok(html.includes("&lt;script&gt;"));
 assert.ok(!html.includes("<script>"));
});
test("P47-5C vendor is quarantined to adapter; no global published schema or FSRS changes",async()=>{
 const paths=["src/authoring/authoring-draft.ts","src/authoring/authoring-studio.ts",
  "src/authoring/wordgard-document-bridge.ts","src/authoring/vendor-ports.ts"];
 for(const path of paths){
  const source=await readFile(new URL("../"+path,import.meta.url),"utf8");
  assert.doesNotMatch(source,/from "wordgard\//,path+" may not reach vendor code");
 }
 const adapter=await readFile(new URL("../src/authoring/wordgard-adapter.ts",import.meta.url),"utf8");
 assert.match(adapter,/from "wordgard\/editor"/);
 assert.doesNotMatch(adapter,/indexedDB|createExamPackage|scoreAttempt|localStorage/);
});
}


// === Unchanged tests from tests/p47-publication.test.mjs (source blob 785fa9c52dabad40e806cb9afd1f6375225ee7b8) ===
{
const test=__dep_0.default;
const assert=__dep_1.default;
const {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft}=__dep_4;
const {compileAuthoringPublication,inspectAuthoringPublication,publicationPlainText, PublicationValidationError}=__dep_6;
const {plainRichDocument}=__dep_3;
const {validateExamPackage}=__dep_7;
const {questionRevisionHash}=__dep_8;
const {scoreAttempt}=__dep_9;
const {sha256}=__dep_10;
/** P47-5D: source-verified immutable publication and scored engine contracts. */
const P=(text)=>plainRichDocument(text);
const rich=(name)=>({format:"practice-desk-rich",version:1,blocks:[
 {type:"paragraph",content:[{type:"text",text:name+" · "},
  {type:"math",tex:"\\frac{x}{2}",linearText:"x divided by two"}]},
 {type:"table",rows:[
  [[{type:"text",text:"x"}],[{type:"text",text:"Value"}]],
  [[{type:"text",text:"2"}],[{type:"math",tex:"x^2",linearText:"x squared"}]]
 ]}
]});
const answers={"single-choice":"B","multiple-select":"A,C","numeric-entry":"4,4.5",
 "true-false":"False","matching":"1-C,2-A,3-D,4-B","free-response":"Essay rubric"};
const kinds=Object.keys(answers);
function readyDraft(){
 const a=newAuthoringDraft();
 const questions=kinds.map((kind,i)=>{
  const q=newAuthoringQuestion(kind);
  return {...q,section:i<3?"Mathematics":"General",source:"Author-provided literature reference",
   prompt:rich("Problem "+i),passage:i===0?rich("Read the case"):P(""),
   options:["Alpha","Beta","Gamma","Delta"].map(P),
   leftItems:["One","Two","Three","Four"].map(P),
   rightItems:["Right A","Right B","Right C","Right D"].map(P),
   explanation:P("Worked explanation for "+kind),
   answer:answers[kind],tolerance:kind==="numeric-entry"?0.01:0};
 });
 return {...a,examId:"cat-pgdba",paperId:"mixed-2026",title:"Original six-kind CAT and PGDBA practice",
   revision:1,edition:"custom",durationMinutes:120,questions};
}
test("P47-5D all six kinds publish as source-validated frozen rich package, with correct hashes",()=>{
 const a=readyDraft(),pkg=compileAuthoringPublication(a);
 assert.equal(validateExamPackage(pkg),pkg);
 assert.equal(pkg.questions.length,6);
 assert.equal(pkg.answerKey.entries.length,6);
 assert.equal(pkg.paper.sections.length,2);
 assert.equal(pkg.stimuli?.length,1);
 assert.equal(pkg.paper.edition,"custom");
 assert.equal(pkg.paper.timing.kind,"whole-paper");
 assert.equal(pkg.questions[0].content.richPrompt.blocks[0].content[1].tex,"\\frac{x}{2}");
 assert.equal(pkg.questions[0].content.stimulusId,pkg.stimuli[0].id);
 assert.equal(pkg.questions[0].content.richExplanation.blocks[0].content[0].text,"Worked explanation for single-choice");
 assert.equal(pkg.questions[0].contentHash,questionRevisionHash(pkg.questions[0]));
 assert.deepEqual(pkg.answerKey.entries.map(e=>e.answer.kind),kinds);
 assert.equal(pkg.answerKey.entries[2].answer.absoluteTolerance,0.01);
 assert.equal(pkg.answerKey.entries[4].answer.pairs[0].rightId,"C");
 assert.equal(pkg.answerKey.entries[5].answer.evaluation,"manual");
 assert.match(pkg.questions[0].editorial.notes,/not been independently certified/);
 // Same authenticated six-kind publisher output is the scorer oracle; one compile.

 const ids=pkg.questions.map(q=>q.id);
 const responses=[
  {questionRevisionId:ids[0],response:{kind:"single-choice",optionId:"B"}},
  {questionRevisionId:ids[1],response:{kind:"multiple-select",optionIds:["A","C"]}},
  {questionRevisionId:ids[2],response:{kind:"numeric-entry",value:4.009}},
  {questionRevisionId:ids[3],response:{kind:"true-false",value:true}},
  {questionRevisionId:ids[4],response:{kind:"matching",pairs:[
   {leftId:"L1",rightId:"C"},{leftId:"L2",rightId:"A"},
   {leftId:"L3",rightId:"D"},{leftId:"L4",rightId:"B"}]}},
  {questionRevisionId:ids[5],response:{kind:"free-response",text:"Model answer"}}
 ].map(x=>({...x,timeSpentMs:0,answerChangeCount:0}));
 const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,responses,new Date().toISOString());
 assert.equal(result.snapshot.correctCount,4);
 assert.equal(result.snapshot.incorrectCount,1);
 assert.deepEqual(result.items.map(x=>x.verdict),["correct","correct","correct","incorrect","correct","pending"]);
 assert.ok(Math.abs(result.snapshot.earnedMarks-(4*2.5-5/6))<1e-10);
});
test("P47-5D authored rich fallback preserves math alt/table/image semantics without TeX parsing of literal dollars",()=>{
 const text=publicationPlainText(rich("Read $5"));
 assert.match(text,/Read \$5/);
 assert.match(text,/x divided by two/);
 assert.match(text,/Value/);
 assert.match(text,/x squared/);
 assert.doesNotMatch(text,/\\frac/);
});

test("P47-5D rejects incomplete paper, missing keys and every kind's malformed answer",()=>{
 for(const kind of kinds){
  const a=readyDraft();
  const questions=a.questions.map((q,i)=>i===kinds.indexOf(kind)?{...q,answer:"?"}:q);
  const report=inspectAuthoringPublication({...a,questions});
  if(kind!=="free-response"){
   assert.equal(report.valid,false,kind);
   assert.ok(report.issues.some(x=>x.reason.match(/Enter|Use|format|Matching|finite|option/i)),kind);
   assert.throws(()=>compileAuthoringPublication({...a,questions}),PublicationValidationError);
  }
 }
 const a=readyDraft();
 for(const override of [
  {title:"Untitled question bank"},{examId:"new-exam"},{paperId:"new-paper"},
  {revision:0},{durationMinutes:1.25}
 ])assert.throws(()=>compileAuthoringPublication({...a,...override}));
 const q=a.questions[0];
 assert.throws(()=>compileAuthoringPublication({...a,questions:[{...q,options:[P(""),...q.options.slice(1)]}]}));
});
test("P47-5D never replaces published ID; increments and separately authenticates new revision",()=>{
 const a=readyDraft(),first=compileAuthoringPublication(a);
 assert.equal(inspectAuthoringPublication(a,[first]).valid,false);
 assert.throws(()=>compileAuthoringPublication(a,[first]),/already published/);
 const second=compileAuthoringPublication({...a,revision:2,questions:[
  {...a.questions[0],answer:"A"},...a.questions.slice(1)]},[first]);
 assert.notEqual(second.paper.id,first.paper.id);
 assert.notEqual(second.paper.contentHash,first.paper.contentHash);
 assert.notEqual(second.questions[0].contentHash,first.questions[0].contentHash);
 assert.equal(second.questions[0].questionId,first.questions[0].questionId);
 assert.equal(first.answerKey.entries[0].answer.optionId,"B");
 assert.equal(second.answerKey.entries[0].answer.optionId,"A");
});
test("P47-5D source/reviewed editions require provenance and a real source counterpart",()=>{
 const a=readyDraft(),source={...a,edition:"source"};
 assert.ok(inspectAuthoringPublication(source).valid);
 const signed=compileAuthoringPublication(source);
 const reviewed={...a,edition:"reviewed",questions:a.questions.map((q,i)=>
  i===0?{...q,answer:"A"}:q)};
 assert.ok(inspectAuthoringPublication(reviewed).issues.some(x=>x.field==="Edition"));
 const review=compileAuthoringPublication(reviewed,[signed]);
 assert.notEqual(review.paper.id,signed.paper.id);
 assert.equal(review.paper.paperId,signed.paper.paperId);
 assert.equal(review.questions[0].questionId,signed.questions[0].questionId);
 assert.equal(review.answerKey.entries[0].answer.optionId,"A");
 const missing={...source,questions:[{...source.questions[0],source:""}]};
 assert.ok(inspectAuthoringPublication(missing).issues.some(x=>/Provenance/.test(x.field)));
});
test("P47-5D authenticated local image references include only used assets",()=>{
 const a=readyDraft(),png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const dataUri="data:image/png;base64,"+png,bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0));
 const figure={id:"fig1",mediaType:"image/png",dataUri,
  contentHash:sha256(bytes),altText:"A 1 pixel science figure"};
 const richImage={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Find the marked figure"},{type:"image",assetId:"fig1",altText:figure.altText}]}
 ]};
 const qa={...a,assets:[figure],questions:[{...a.questions[0],prompt:richImage}]};
 const compiled=compileAuthoringPublication(qa);
 assert.equal(compiled.assets.length,1);
 assert.deepEqual(compiled.questions[0].content.assetIds,["fig1"]);
 const tampered=structuredClone(compiled);tampered.assets[0].contentHash="0".repeat(64);
 assert.throws(()=>validateExamPackage(tampered),/digest mismatch/);
});
test("P47-5D rejects tampered already-published mathematical/source/key hashes",()=>{
 const pkg=compileAuthoringPublication(readyDraft());
 const bad=structuredClone(pkg);
 bad.questions[0].content.richPrompt.blocks[0].content[1].tex="\\wrongCommand";
 assert.throws(()=>validateExamPackage(bad),/hash mismatch/);
 const key=structuredClone(pkg);key.answerKey.entries[0].answer.optionId="D";
 assert.throws(()=>validateExamPackage(key),/hash mismatch/);
 const rules=structuredClone(pkg);rules.paper.scoring.defaultRule.correctMarks=100;
 assert.throws(()=>validateExamPackage(rules),/hash mismatch/);
});
test("P47-5D publisher depends on domain hashes and validated packages, never editor or storage",async()=>{
 const {readFile}=await import("node:fs/promises");
 const s=await readFile(new URL("../src/authoring/authoring-publisher.ts",import.meta.url),"utf8");
 assert.doesNotMatch(s,/from "wordgard\/|localStorage|indexedDB|document\.querySelector|fetch\(/);
 assert.match(s,/validateExamPackage/);
 assert.match(s,/answerKeyRevisionHash/);
 assert.match(s,/paperRevisionHash/);
});
}


// === Unchanged tests from tests/p54-authoring-integrity.test.mjs (source blob 42ff0f713fd36624d2c26e10d66269ddee12501c) ===
{
const test=__dep_0.default;
const assert=__dep_1.default;
const {newAuthoringDraft,newAuthoringQuestion}=__dep_4;
const {compileAuthoringPublication,inspectAuthoringPublication}=__dep_6;
const {plainRichDocument}=__dep_3;
const {authoringSections,setAuthoringSectionMinutes,assignAuthoringQuestionSection}=__dep_11;
const {authoringPublishedPreview,authoringPartialCreditExamples}=__dep_12;
const {scoreAttempt}=__dep_9;
/** P54 first-principles: publication preflight must mean exact compiler success,
 * section editing is one operation on a section, and real scorer previews policy.
 */
const P=s=>plainRichDocument(s);
function q(kind,section,answer){
 return {...newAuthoringQuestion(kind),section,answer,prompt:P("Authoring "+kind+" example"),
   options:["Alpha","Beta","Gamma","Delta"].map(P),
   leftItems:["First","Second","Third","Fourth"].map(P),
   rightItems:["One","Two","Three","Four"].map(P)};
}
function draft(){
 const d=newAuthoringDraft();
 return {...d,examId:"apfc",paperId:"p54",title:"Actual six-kind authoring proof",timingKind:"sectional",
  sectionNavigation:"sequential-locked",pausePolicy:"forbidden",allowEarlySubmit:false,
  sectionTransition:"automatic",allowReview:false,questions:[
    {...q("multiple-select","Specialised","A,C"),minSelections:2,maxSelections:3,
      partialCreditEach:1,partialPenaltyEach:0.5,sectionMinutes:15},
    {...q("matching","Specialised","1-C,2-A,3-D,4-B"),partialCreditEach:0.6,
      partialPenaltyEach:0.1,sectionMinutes:15},
    {...q("single-choice","General","B"),sectionMinutes:10},
    {...q("true-false","General","True"),sectionMinutes:10},
    {...q("numeric-entry","General","42"),sectionMinutes:10},
    {...q("free-response","General","Write a rubric"),explanation:P("Model response"),sectionMinutes:10}
  ]};
}
test("P54 authoritative inspector yields the same immutable package the publisher would create",()=>{
 const d=draft(),pre=inspectAuthoringPublication(d);
 assert.equal(pre.valid,true);
 assert.deepEqual(pre.compiled,compileAuthoringPublication(d));
 assert.equal(pre.compiled.paper.timing.kind,"sectional");
 assert.equal(pre.compiled.paper.navigation.allowReview,false);
 assert.deepEqual(pre.compiled.paper.timing.sectionLimits.map(s=>s.durationMs),[900000,600000]);
});
test("P54 inspector handles imported malformed structure as issues, never says Ready",()=>{
 const d=draft(),raw={...d,questions:[{...d.questions[0],subject:"Labour"+String.fromCharCode(10)+"Codes"},...d.questions.slice(1)]};
 const pre=inspectAuthoringPublication(raw);
 assert.equal(pre.valid,false);
 assert.ok(pre.issues.length>=1);
 assert.equal(pre.compiled,undefined);
 assert.throws(()=>compileAuthoringPublication(raw));
});
test("P54 section manager always updates the whole named section, preserving physical section order",()=>{
 const d=draft();
 assert.deepEqual(authoringSections(d).map(s=>({name:s.name,count:s.count,minutes:s.minutes,conflict:s.conflict})),[
  {name:"Specialised",count:2,minutes:15,conflict:false},
  {name:"General",count:4,minutes:10,conflict:false}]);
 const changed=setAuthoringSectionMinutes(d,"Specialised",17);
 assert.deepEqual(changed.questions.slice(0,2).map(q=>q.sectionMinutes),[17,17]);
 assert.deepEqual(changed.questions.slice(2).map(q=>q.sectionMinutes),[10,10,10,10]);
 const moved=assignAuthoringQuestionSection(changed,changed.questions[0].id,"General");
 assert.equal(moved.questions[0].sectionMinutes,10);
 assert.equal(moved.questions[0].section,"General");
 const broken={...d,questions:[d.questions[0],{...d.questions[1],sectionMinutes:12},...d.questions.slice(2)]};
 assert.equal(authoringSections(broken)[0].conflict,true);
 assert.equal(inspectAuthoringPublication(broken).valid,false);
 const repaired=setAuthoringSectionMinutes(broken,"Specialised",20);
 assert.equal(inspectAuthoringPublication(repaired).valid,true);
});
test("P54 real six-kind preview uses frozen question controls, never index-pairs matching answers",()=>{
 const pkg=compileAuthoringPublication(draft());
 for(const q of pkg.questions){
  const html=authoringPublishedPreview(pkg,q.id);
  assert.match(html,/pd-author-preview-content/);
  assert.match(html,/inert/);
  assert.match(html,/role="region" tabindex="0" aria-label="Published section timing and question counts"/);
  if(q.content.kind==="matching"){
   assert.match(html,/data-match="L1"/);
   assert.match(html,/value="C"/);
   assert.doesNotMatch(html,/First\s*—\s*One/);
   assert.match(html,/Author-only answer key/);
  }else if(q.content.kind==="numeric-entry")assert.match(html,/id="g-number"/);
  else if(q.content.kind==="true-false")assert.match(html,/data-bool="true"/);
  else if(q.content.kind==="free-response"){assert.match(html,/id="g-text"/);assert.match(html,/Author-provided written model\/rubric/);}
  else assert.match(html,/data-choice/);
 }
});
test("P54 partial-credit examples are from actual scoreAttempt, not a second scoring formula",()=>{
 const pkg=compileAuthoringPublication(draft());
 const examples=authoringPartialCreditExamples(pkg);
 assert.ok(examples.length>=2);
 for(const e of examples){
  const q=pkg.questions.find(q=>q.id===e.questionRevisionId);
  const expected=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,[{
    questionRevisionId:e.questionRevisionId,timeSpentMs:0,answerChangeCount:0,response:e.response
  }],"2026-11-04T00:00:00.000Z").items.find(i=>i.questionRevisionId===e.questionRevisionId);
  assert.equal(e.marks,expected.marks);
  assert.equal(e.verdict,expected.verdict);
 }
});
}


// === Unchanged tests from tests/p58a-authoring-integrity.test.mjs (source blob 8b1dbf14f6bdb5382c4988250274f3c5fd83844a) ===
{
const test=__dep_0.default;
const assert=__dep_1.default;
const {readFile}=__dep_2;
const {newAuthoringDraft,validateAuthoringDraft,requiresExternalQuality}=__dep_4;
const {toAuthoringDraft}=__dep_13;
test("P58-A F01: external QA is bound to a validated ingestion mode, not a draft ID",async()=>{
 const source=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
 const imported=toAuthoringDraft(source);
 assert.equal(imported.ingestionMode,"external-source");
 assert.equal(requiresExternalQuality(imported),true);
 const renamed=validateAuthoringDraft({...imported,id:"renamed-by-local-author"});
 assert.equal(requiresExternalQuality(renamed),true);
 const otherClaim=validateAuthoringDraft({...renamed,ingestionMode:"manual"});
 assert.equal(requiresExternalQuality(otherClaim),true,
  "Question provenance must prevent downgrading mandatory QA by toggling workflow mode");
});

test("P58-A F01: genuine manual drafts preserve existing publication validation path",()=>{
 const original=newAuthoringDraft();
 assert.equal(original.ingestionMode,"manual");
 assert.equal(requiresExternalQuality(original),false);
 assert.equal(requiresExternalQuality(validateAuthoringDraft(original)),false);
 assert.equal(requiresExternalQuality(validateAuthoringDraft({
  ...original,id:"stage:misleading-text-prefix"
 })),false,"A staged-looking ID must not spuriously trigger AI-only restrictions");
 assert.throws(()=>validateAuthoringDraft({...original,ingestionMode:"unverified"}),/Invalid authoring ingestion mode/);
 assert.throws(()=>validateAuthoringDraft({...original,ingestionMode:"verified"}),/Invalid authoring ingestion mode/);
});
}

/** Seeded metamorphic check. Plain text must not be reinterpreted as HTML or
 * TeX by rich document validation, and repeated validation must be idempotent. */
{
 const test=__dep_0.default;
 const assert=__dep_1.default;
 const {plainRichDocument,validateRichDocument,canonicalRichDocument}=__dep_3;
 test("Authoring property: literal Unicode/math/HTML-like strings survive rich validation unchanged",()=>{
  let state=0x5A17D1;
  const alphabet=["a","Z"," ","<",">","&","$","\\","/","{","}","'","\"","0","9","²","√","∑","न","\\n"];
  // Explicit copyright/source-text sentinels replace the retired single-case smoke.
  for(const raw of [
   "√(a²+b²) $x+1$ <script>alert(1)</script>",
   "<img src=x onerror=alert(1)>",
   "price $5 and genuine LaTeX-looking \\frac{x}{2}",
   "हिंदी < & > \u00a0 ₨"
  ]){
   const validated=validateRichDocument(plainRichDocument(raw));
   assert.equal(validated.blocks[0].content[0].text,raw);
   assert.equal(canonicalRichDocument(validated),
     canonicalRichDocument(validateRichDocument(validated)));
  }

  const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
  for(let i=0;i<128;i++){
   const size=1+(random()%120);
   let original="";
   for(let j=0;j<size;j++)original+=alphabet[random()%alphabet.length];
   const rich=plainRichDocument(original);
   const checked=validateRichDocument(rich);
   assert.equal(checked.blocks.length,1,"case "+i+" inserted an extra paragraph");
   assert.equal(checked.blocks[0].content[0].text,original,"case "+i+" changed candidate text");
   assert.equal(canonicalRichDocument(checked),canonicalRichDocument(rich),"case "+i+" changed representation");
   assert.equal(canonicalRichDocument(validateRichDocument(checked)),canonicalRichDocument(checked),"case "+i+" not idempotent");
  }
 });
}
