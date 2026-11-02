import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {importAuthoredExam,importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {validateExamPackage,builtinCglPackages,configureCglPractice,
 configureUntimedPractice,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validatePracticeSetups} from "../src/app/practice-selection.ts";
const starter=JSON.parse(await readFile(new URL("../examples/apfc-mcq-nat-starter.json",import.meta.url),"utf8"));
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url),"utf8"));
test("easy APFC/NAT author bank generates a strict validated immutable exam package",()=>{
 const pkg=importAuthoredExam(starter);
 assert.equal(pkg.questions.length,3);
 assert.equal(pkg.paper.sections.length,3);
 assert.equal(pkg.paper.timing.kind,"untimed");
 assert.equal(pkg.paper.scoring.defaultRule.correctMarks,2.5);
 assert(Math.abs(pkg.paper.scoring.defaultRule.incorrectMarks-(-5/6))<1e-12,
  "APFC negative 1/3 of 2.5 marks must retain the full fractional value, not round to -0.83");
 assert.deepEqual(pkg.questions.map(q=>q.content.kind),["single-choice","single-choice","numeric-entry"]);
 assert.equal(pkg.answerKey.entries[0].answer.optionId,"A");
 assert.equal(pkg.answerKey.entries[1].answer.optionId,"B");
 assert.equal(pkg.answerKey.entries[2].answer.acceptedValues[0],4);
 assert.equal(validateExamPackage(pkg),pkg);
 const copy=importSimpleQuestionBank(JSON.parse(JSON.stringify(starter)));
 assert.deepEqual(copy,pkg,"Same authored question bank must generate same revision/content hashes");
});
test("simple-bank input rejects malformed keys, excess questions, invalid marks and NAT tolerance",()=>{
 const edited=mutate=>{const x=structuredClone(starter);mutate(x);return x;};
 for(const [name,mutate] of [
  ["duplicate",x=>x.questions[1].id=x.questions[0].id],
  ["letter outside options",x=>x.questions[0].answer="Z"],
  ["bad question",x=>x.questions[0].question=""],
  ["negative tolerance",x=>x.questions[2].tolerance=-0.01],
  ["invalid penalty",x=>x.scoring.incorrectMarks=10],
  ["huge count",x=>x.questions=Array.from({length:2001},(_,i)=>({...x.questions[0],id:"q"+i}))],
  ["unsupported content",x=>x.questions[0].type="bogus"],
  ["duplicate bank identifier",x=>x.bankId="hello world"],
 ]){
  assert.throws(()=>importSimpleQuestionBank(edited(mutate)),undefined,name);
 }
});
test("untimed option derives new validated frozen policy for every built-in mode and generic package",()=>{
 const p=builtinCglPackages(sources,patches,solutions).find(x=>x.paper.edition==="reviewed");
 assert(p);
 for(const mode of ["strict","free","single"]){
  const base=configureCglPractice(p,mode,2);
  const untimed=configureUntimedPractice(base,true);
  assert.notEqual(untimed.paper.id,base.paper.id);
  assert.notEqual(untimed.paper.contentHash,base.paper.contentHash);
  assert.equal(untimed.paper.timing.kind,"untimed");
  assert.deepEqual(untimed.paper.navigation,base.paper.navigation);
  assert.deepEqual(untimed.answerKey,base.answerKey);
  assert.equal(untimed.questions.length,base.questions.length);
  assert.equal(validateExamPackage(untimed),untimed);
  assert.equal(configureUntimedPractice(base,false),base);
  const attempt=startGenericAttempt(untimed,mode+"-untimed",1000);
  const lookup=new Map(untimed.questions.map(q=>[q.id,q]));
  const tick=transitionGenericAttempt(attempt,{type:"TICK",nowMs:1000+3*3600000},lookup);
  assert.equal(tick.state.status,"running","Untimed mode must never time out even after three hours");
  if(mode==="strict"){
   const continued=transitionGenericAttempt(tick,{type:"SUBMIT_SECTION",nowMs:1000+3*3600000+1},lookup);
   assert.equal(continued.state.sectionIndex,1,"Untimed strict exam must still allow forward section progression");
   assert.equal(continued.state.status,"running");
  }
 }
 const custom=importAuthoredExam({...starter,timing:{kind:"whole-paper",minutes:20}});
 assert.equal(custom.paper.timing.kind,"whole-paper");
 const unlocked=configureUntimedPractice(custom,true);
 assert.equal(unlocked.paper.timing.kind,"untimed");
 assert.equal(unlocked.paper.edition,"custom");
 assert.equal(validateExamPackage(unlocked),unlocked);
});
test("P43 per-family selection rejects invalid mode, edition and untimed values",()=>{
 const valid={schema:2,selectedFamilyId:"builtin:ssc-cgl",families:{
   "builtin:ssc-cgl":{paperRevisionId:"paper-x",mode:"free",section:2,untimed:true,edition:"source"}
 }};
 assert.equal(validatePracticeSetups(valid).selectedFamilyId,"builtin:ssc-cgl");
 for(const [field,invalid] of [["untimed","yes"],["edition","corrupt"],["section",-1],["mode","other"]]){
   const copy=structuredClone(valid);
   copy.families["builtin:ssc-cgl"][field]=invalid;
   assert.throws(()=>validatePracticeSetups(copy),/Invalid/);
 }
});

test("P43 catalog keeps imported families distinct, sorted and never claims official CGL identity",async()=>{
 const {examFamilyCatalog,BUILTIN_CGL_FAMILY,pairedEdition,familyIdFor}=
   await import("../src/app/exam-families.ts");
 const originals=builtinCglPackages(sources,patches);
 const builtins=new Set(originals.map(p=>p.paper.id));
 const apfc=importAuthoredExam(starter);
 const imposter=importAuthoredExam({...starter,examId:"ssc-cgl",bankId:"user-supplied-cgl",title:"Unverified SSC labelled bank"});
 const catalog=examFamilyCatalog([...originals,imposter,apfc],builtins);
 assert.deepEqual(catalog.map(f=>f.id),
   [BUILTIN_CGL_FAMILY,"imported:ssc-cgl","imported:upsc-epfo-apfc"]);
 assert.equal(catalog[0].papers.length,10);
 assert.equal(catalog[1].imported,true);
 assert.equal(catalog[1].papers.length,1);
 assert.equal(familyIdFor(imposter,builtins),"imported:ssc-cgl");
 const reviewed=catalog[0].papers.find(p=>p.paper.edition==="reviewed");
 const original=pairedEdition(catalog[0],reviewed,"source");
 assert.equal(original?.paper.paperId,reviewed.paper.paperId);
 assert.equal(pairedEdition(catalog[1],imposter,"source"),undefined);
 assert.equal(imposter.paper.timing.kind,"untimed");
 assert.equal(apfc.paper.scoring.defaultRule.correctMarks,2.5);
});

test("P44 seeded composition is exact, reproducible, editorial-safe and preserves source policy",async()=>{
 const {composePracticeSet,practiceInventory}=await import("../src/app/practice-compose.ts");
 const {scoreableMaximum}=await import("../src/engine/score-ceiling.ts");
 const all=builtinCglPackages(sources,patches);
 const source=all.find(p=>p.paper.edition==="source"&&p.paper.paperId==="cgl-2026-10-06");
 const reviewed=all.find(p=>p.paper.edition==="reviewed"&&p.paper.paperId===source.paper.paperId);
 assert.ok(source&&reviewed);
 const request={count:12,seed:"P44-fixed",filters:{}};
 const a=composePracticeSet(reviewed,request),b=composePracticeSet(reviewed,request);
 assert.deepEqual(a,b);
 assert.equal(a.bundle.questions.length,12);
 assert.equal(a.bundle.answerKey.entries.length,12);
 assert.equal(new Set(a.bundle.questions.map(q=>q.id)).size,12);
 assert.equal(a.bundle.paper.sections.flatMap(s=>s.questionRevisionIds).length,12);
 assert.equal(a.manifest.selectedQuestionRevisionIds.length,12);
 assert.equal(a.bundle.paper.timing.kind,reviewed.paper.timing.kind);
 assert.deepEqual(a.bundle.paper.navigation,reviewed.paper.navigation);
 assert.deepEqual(a.bundle.paper.scoring,reviewed.paper.scoring);
 assert.equal(validateExamPackage(a.bundle),a.bundle);
 assert.ok(a.bundle.questions.every(q=>["verified","corrected","caution"].includes(q.editorial.status)));
 assert.ok(a.bundle.paper.sections.every(s=>source.paper.sections.some(parent=>
   parent.id===s.id&&JSON.stringify(s.scoringOverride)===JSON.stringify(parent.scoringOverride))));
 const original=composePracticeSet(source,request);
 assert.ok(original.bundle.questions.every(q=>q.editorial.status!=="invalid"));
 assert.equal(original.bundle.questions.length,12);
 const alternate=composePracticeSet(reviewed,{...request,seed:"P44-other"});
 assert.notDeepEqual(alternate.manifest.selectedQuestionRevisionIds,a.manifest.selectedQuestionRevisionIds);
 assert.ok(Number.isFinite(scoreableMaximum(a.bundle.paper,a.bundle.answerKey,a.bundle.questions)));
 assert.equal(practiceInventory(reviewed).eligible,a.manifest.eligibleCount);
});

test("P44 refuses invented tags, unavailable inventory and misleading counts",async()=>{
 const {composePracticeSet,practiceInventory}=await import("../src/app/practice-compose.ts");
 const all=builtinCglPackages(sources,patches);
 const source=all.find(p=>p.paper.edition==="source");
 const inventory=practiceInventory(source);
 const total=source.questions.length;
 assert.equal(inventory.eligible+inventory.excluded,total);
 assert.equal(inventory.difficulties.length,0,"No invented difficulty metadata in built-in CGL");
 assert.throws(()=>composePracticeSet(source,{count:total+1,seed:"fixed",filters:{}}),
   /Only \d+ eligible questions/);
 assert.throws(()=>composePracticeSet(source,{count:1,seed:"fixed",filters:{topicId:"invented-topic"}}),
   /Only 0 eligible/);
 assert.throws(()=>composePracticeSet(source,{count:1,seed:"fixed",filters:{difficulty:"hard"}}),
   /Only 0 eligible/);
 assert.throws(()=>composePracticeSet(source,{count:2.5,seed:"fixed",filters:{}}),/1–2000/);
 assert.throws(()=>composePracticeSet(source,{count:1,seed:"invalid seed",filters:{}}),/seed/);
});

test("P44 imported APFC custom subset freezes exact policies and graded outcomes",async()=>{
 const {composePracticeSet,validatePracticeComposition}=await import("../src/app/practice-compose.ts");
 const {scoreAttempt}=await import("../src/engine/scoring.ts");
 const authored=importAuthoredExam(starter);
 const request={count:2,seed:"APFC-1",filters:{sectionId:authored.paper.sections[0].id}};
 assert.throws(()=>composePracticeSet(authored,request),/Only 1 eligible/);
 const selection=composePracticeSet(authored,{...request,count:1});
 assert.equal(selection.bundle.paper.scoring.defaultRule.correctMarks,2.5);
 assert.ok(Math.abs(selection.bundle.paper.scoring.defaultRule.incorrectMarks-(-5/6))<1e-12);
 assert.equal(selection.bundle.paper.timing.kind,"untimed");
 const started={...startGenericAttempt(selection.bundle,"p44-apfc",1000),
   practiceComposition:selection.manifest};
 validatePracticeComposition(started);
 const completed=transitionGenericAttempt(started,{type:"SUBMIT_ATTEMPT",nowMs:1100},
   new Map(selection.bundle.questions.map(q=>[q.id,q])));
 assert.equal(completed.result.snapshot.unansweredCount,1);
 assert.equal(completed.result.snapshot.earnedMarks,0);
 const tampered=structuredClone(started);
 tampered.practiceComposition.selectedQuestionRevisionIds[0]="forged";
 assert.throws(()=>validatePracticeComposition(tampered),/hash mismatch/);
 const rehashed=structuredClone(started);
 rehashed.practiceComposition.selectedQuestionRevisionIds[0]="forged";
 const {hashJson}=await import("../src/domain/hash.ts");
 const {contentHash:ignored,...core}=rehashed.practiceComposition;
 rehashed.practiceComposition.contentHash=hashJson(core);
 assert.throws(()=>validatePracticeComposition(rehashed),/frozen content/);
});

test("P44 explicit topic and difficulty metadata work without guessing or changing full source",async()=>{
 const {composePracticeSet,practiceInventory}=await import("../src/app/practice-compose.ts");
 const {questionRevisionHash}=await import("../src/domain/integrity.ts");
 const authored=importAuthoredExam(starter);
 const decorated=structuredClone(authored);
 const q=decorated.questions[0];
 q.content.topicIds=["labour-code-verified"];
 q.content.tags=["difficulty:medium"];
 q.contentHash=questionRevisionHash(q);
 const snapshot=JSON.stringify(decorated);
 const inventory=practiceInventory(decorated);
 assert.deepEqual(inventory.topics.map(x=>x.id),["labour-code-verified"]);
 assert.deepEqual(inventory.difficulties.map(x=>x.id),["medium"]);
 const selected=composePracticeSet(decorated,{count:1,seed:"topic-1",
   filters:{topicId:"labour-code-verified",difficulty:"medium"}});
 assert.equal(selected.bundle.questions[0].id,q.id);
 assert.equal(selected.manifest.eligibleCount,1);
 assert.equal(JSON.stringify(decorated),snapshot,"No mutation of original bank");
 assert.equal(validateExamPackage(selected.bundle),selected.bundle);
});
