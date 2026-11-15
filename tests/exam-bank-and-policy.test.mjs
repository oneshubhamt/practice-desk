import {loadCglFixture,loadQuestionBankGraph,repositoryRoot} from "./fixtures/cgl-bank.mjs";
import {archiveCglPackages as builtinCglPackages} from "../tools/cgl-archive-converter.ts";
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {validateExamPackage,availablePracticeModes,defaultPracticeMode,resolvePracticeMode,
 configurePracticeMode,attemptModeForPractice,configureUntimedPractice,startGenericAttempt} from "../src/app/exam-package.ts";
import {loadQuestionBankCatalog} from "../scripts/question-bank-catalog.mjs";
import {applyLibraryFamily} from "../src/app/library-controller.ts";
import {shouldShowWordCount} from "../src/domain/word-count.ts";
import {newAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {validatePracticeSetups} from "../src/app/practice-selection.ts";
const starter=JSON.parse(await readFile(new URL("../examples/apfc-authoring-example.json",import.meta.url),"utf8"));
const sources=(await loadCglFixture()).sources;
const patches=(await loadCglFixture()).patches;
const solutions=(await loadCglFixture()).solutions;
test("easy APFC/NAT author bank generates a strict validated immutable exam package",()=>{
 const pkg=compileExternalQuestionBank(starter);
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
 const copy=compileExternalQuestionBank(JSON.parse(JSON.stringify(starter)));
 assert.deepEqual(copy,pkg,"Same canonical authoring source must generate same revision/content hashes");
});
test("canonical authoring input rejects malformed keys, excess questions, invalid marks and numeric tolerance",()=>{
 const edited=mutate=>{const x=structuredClone(starter);mutate(x);return x;};
 for(const [name,mutate] of [
  ["duplicate",x=>x.questions[1].id=x.questions[0].id],
  ["letter outside options",x=>x.questions[0].answer="Z"],
  ["bad question",x=>x.questions[0].prompt=""],
  ["negative tolerance",x=>x.questions[2].tolerance=-0.01],
  ["invalid penalty",x=>x.scoring.incorrectMarks=10],
  ["huge count",x=>x.questions=Array.from({length:201},(_,i)=>({...x.questions[0],id:"q"+i}))],
  ["unsupported content",x=>x.questions[0].kind="bogus"],
  ["invalid bank identifier",x=>x.bankId="hello world"],
 ]){
  assert.throws(()=>compileExternalQuestionBank(edited(mutate)),undefined,name);
 }
});
test("untimed option derives new validated frozen policy for every built-in mode and generic package",()=>{
 const p=builtinCglPackages(sources,patches,solutions).find(x=>x.paper.edition==="reviewed");
 assert(p);
 for(const mode of ["strict","free","single"]){
  const base=configurePracticeMode(p,mode,2);
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
 const custom=compileExternalQuestionBank({...starter,timing:{kind:"whole-paper",minutes:20,pausePolicy:"allowed"}});
 assert.equal(custom.paper.timing.kind,"whole-paper");
 const unlocked=configureUntimedPractice(custom,true);
 assert.equal(unlocked.paper.timing.kind,"untimed");
 assert.equal(unlocked.paper.edition,"custom");
 assert.equal(validateExamPackage(unlocked),unlocked);
});

test("PFRDA generic modes preserve authored 20+40 minutes, keys and live word-counter policy",async()=>{
 const preinstalled=(await loadQuestionBankCatalog(repositoryRoot)).preinstalled;
 const pfrda=preinstalled.families.find(f=>f.id==="pfrda-grade-a-2026-phase-ii");
 const packageValue=preinstalled.packages.find(p=>p.paper.id===pfrda?.currentPaperId);
 assert.ok(packageValue);
 assert.equal(packageValue.examId,"pfrda-grade-a-2026-phase-ii");
 const strict=configurePracticeMode(packageValue,"strict");
 assert.equal(strict.paper.timing.kind,"sectional");
 assert.deepEqual(strict.paper.timing.sectionLimits.map(x=>x.durationMs),[20*60000,40*60000]);
 assert.equal(strict.paper.timing.transition,"automatic");
 assert.equal(validateExamPackage(strict),strict);
 const hard=startGenericAttempt(strict,"pfrda-strict",1000,attemptModeForPractice("strict"));
 const lookup=new Map(strict.questions.map(q=>[q.id,q]));
 const advanced=transitionGenericAttempt(hard,{type:"TICK",nowMs:1000+20*60000},lookup);
 assert.equal(advanced.state.sectionIndex,1,"hard deadline must advance to General Stream");
 assert.equal(advanced.state.status,"running");
 const expired=transitionGenericAttempt(advanced,{type:"TICK",nowMs:1000+60*60000},lookup);
 assert.equal(expired.state.status,"completed","hard exam must finish after both sections");

 const flexible=configurePracticeMode(packageValue,"free");
 assert.equal(flexible.paper.timing.kind,"whole-paper");
 assert.equal(flexible.paper.timing.durationMs,60*60000);
 assert.equal(flexible.paper.navigation.sectionNavigation,"free");
 assert.equal(flexible.paper.navigation.questionNavigation,"free");
 assert.equal(validateExamPackage(flexible),flexible);
 const advisory=startGenericAttempt(flexible,"pfrda-flexible",1000,attemptModeForPractice("free"));
 assert.equal(transitionGenericAttempt(advisory,{type:"TICK",nowMs:1000+65*60000},lookup).state.status,"running",
  "flexible PFRDA must allow truthful overtime");

 for(const [sectionIndex,count,minutes] of [[0,1,20],[1,50,40]]){
  const single=configurePracticeMode(packageValue,"single",sectionIndex);
  assert.equal(single.questions.length,count);
  assert.equal(single.answerKey.entries.length,count);
  assert.equal(single.paper.sections.length,1);
  assert.equal(single.paper.timing.kind,"whole-paper");
  assert.equal(single.paper.timing.durationMs,minutes*60000);
  assert.equal(single.paper.candidateTools?.wordCount,undefined);
  assert.equal(validateExamPackage(single),single);
  assert.equal(startGenericAttempt(single,"pfrda-section-"+sectionIndex,1000,
   attemptModeForPractice("single")).frozen.snapshot.mode,"section-practice");
 }
 assert.deepEqual(strict.answerKey.entries,packageValue.answerKey.entries);
 assert.deepEqual(flexible.answerKey.entries,packageValue.answerKey.entries);
 assert.equal(flexible.questions[0].content.responseRules.wordLimit,120);
 assert.equal(shouldShowWordCount(strict.paper.candidateTools?.wordCount,"exam-simulation"),false);
 assert.equal(shouldShowWordCount(flexible.paper.candidateTools?.wordCount,"full-paper-practice"),true);
 assert.equal(resolvePracticeMode(packageValue.paper,"strict"),"strict");
});

test("mode availability follows authored physical sections, not exam names",()=>{
 const oneSection={...starter,
  paperId:"one-section-exam",bankId:"one-section-exam",examId:"upsc-cse-prelims",
  sections:[{id:"whole",title:"Complete paper"}],
  questions:starter.questions.map(({syllabusHeadingId:_,...q})=>({...q,subject:"General",examSection:"whole"})),
  timing:{kind:"whole-paper",minutes:120,pausePolicy:"forbidden"}};
 const single=compileExternalQuestionBank(oneSection);
 assert.deepEqual(availablePracticeModes(single.paper),["strict","free"]);
 assert.equal(resolvePracticeMode(single.paper,"single"),"free",
  "a custom one-section paper must not retain an unavailable mode");
 assert.throws(()=>configurePracticeMode(single,"single",0),/unavailable/);
 assert.equal(configurePracticeMode(single,"strict").paper.timing.durationMs,120*60000);
 assert.equal(configurePracticeMode(single,"free").paper.timing.durationMs,120*60000);

 const multi=compileExternalQuestionBank({...oneSection,
  bankId:"multi-section-exam",paperId:"multi-section-exam",examId:"xat",
  sections:starter.sections,
  questions:starter.questions.map(({syllabusHeadingId:_,...q})=>({...q,subject:"General"}))});
 assert.deepEqual(availablePracticeModes(multi.paper),["strict","free","single"]);
 assert.equal(configurePracticeMode(multi,"single",1).paper.timing.kind,"untimed",
  "whole-paper limit must not fabricate a section-only time budget");
});

test("fresh custom families retain advisory default; CGL stays strict; saved modes remain deliberate",()=>{
 const custom=compileExternalQuestionBank({...starter,
  timing:{kind:"whole-paper",minutes:2,pausePolicy:"allowed"}});
 assert.equal(defaultPracticeMode(custom.paper),"free");
 const cgl=builtinCglPackages(sources,patches)[0];
 assert.equal(defaultPracticeMode(cgl.paper),"strict");
 const families=[
  {id:"imported:custom",papers:[custom],currentPaperId:custom.paper.id},
  {id:"builtin:ssc-cgl",papers:[cgl],currentPaperId:cgl.paper.id}
 ];
 const owner={selectedFamilyId:"",setups:{schema:2,selectedFamilyId:"imported:custom",families:{}},
  choice:"",practiceMode:"strict",singleSection:0,untimedPractice:false,editionView:"reviewed",
  packages:new Map([[custom.paper.id,custom],[cgl.paper.id,cgl]]),families:()=>families};
 applyLibraryFamily(owner,"imported:custom");
 assert.equal(owner.practiceMode,"free","new authored/imported papers must not silently gain hard expiry");
 applyLibraryFamily(owner,"builtin:ssc-cgl");
 assert.equal(owner.practiceMode,"strict","CGL default must remain strict");
 owner.setups.families["imported:custom"]={paperRevisionId:custom.paper.id,mode:"strict",
  section:0,untimed:false,edition:"reviewed"};
 applyLibraryFamily(owner,"imported:custom");
 assert.equal(owner.practiceMode,"strict","an explicitly saved strict selection must be respected");
});

test("generic mode derivation never invents timers for unallocated sections",()=>{
 const noClock=compileExternalQuestionBank(starter);
 assert.equal(resolvePracticeMode(noClock.paper,"strict"),"strict");
 assert.equal(configurePracticeMode(noClock,"free"),noClock,
  "already-flexible untimed papers need no duplicate paper/key revisions");
 assert.equal(configurePracticeMode(noClock,"free").paper.timing.kind,"untimed");
 assert.equal(configurePracticeMode(noClock,"single",1).paper.timing.kind,"untimed");
 const whole=compileExternalQuestionBank({...starter,timing:{kind:"whole-paper",minutes:50,pausePolicy:"forbidden"}});
 const alreadyFlexible=compileExternalQuestionBank({...starter,
  timing:{kind:"whole-paper",minutes:50,pausePolicy:"allowed"}});
 assert.equal(configurePracticeMode(alreadyFlexible,"free"),alreadyFlexible,
  "existing whole-paper free navigation must retain its package identity");
 assert.equal(configurePracticeMode(whole,"free").paper.timing.durationMs,50*60000);
 assert.equal(configurePracticeMode(whole,"single",1).paper.timing.kind,"untimed",
  "the whole-paper limit is not evidence of a particular section's allowance");
 assert.throws(()=>configurePracticeMode(whole,"single",100),/Unknown practice section/);
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

test("included family bootstrap preserves catalog-declared order without exam-name special cases",async()=>{
 const {examFamilyCatalog}=await import("../src/app/exam-families.ts");
 const cgl=builtinCglPackages(sources,patches)[0];
 const apfc=compileExternalQuestionBank(starter);
 const included=[
  {id:"first-declared",examId:cgl.examId,title:"Zeta title",paperIds:[cgl.paper.id],currentPaperId:cgl.paper.id},
  {id:"second-declared",examId:apfc.examId,title:"Alpha title",paperIds:[apfc.paper.id],currentPaperId:apfc.paper.id}
 ];
 const catalog=examFamilyCatalog([apfc,cgl],included);
 assert.deepEqual(catalog.map(f=>f.id),["included:first-declared","included:second-declared"],
  "bootstrap order must follow the catalog, not alphabetical titles or package iteration order");
});

test("P43 catalog keeps imported families distinct, sorted and never claims official CGL identity",async()=>{
 const {examFamilyCatalog,pairedEdition,familyIdFor}=await import("../src/app/exam-families.ts");
 const originals=builtinCglPackages(sources,patches);
 const included=[{id:"ssc-cgl",examId:"ssc-cgl",title:"SSC CGL",
   paperIds:originals.map(p=>p.paper.id),
   currentPaperId:originals.find(p=>p.paper.edition==="reviewed")?.paper.id}];
 const apfc=compileExternalQuestionBank(starter);
 const imposterSource={...starter,examId:"ssc-cgl",bankId:"user-supplied-cgl",
   paperId:"user-supplied-cgl",title:"Unverified SSC labelled bank",
   questions:starter.questions.map(q=>{const {syllabusHeadingId:_,...rest}=q;
     return {...rest,subject:"User supplied"};})};
 const imposter=compileExternalQuestionBank(imposterSource);
 const catalog=examFamilyCatalog([...originals,imposter,apfc],included);
 assert.deepEqual(catalog.map(f=>f.id),
   ["included:ssc-cgl","imported:ssc-cgl","imported:upsc-epfo-apfc"]);
 assert.equal(catalog[0].papers.length,10);
 assert.equal(catalog[1].imported,true);
 assert.equal(catalog[1].papers.length,1);
 assert.equal(familyIdFor(imposter,included),"imported:ssc-cgl");
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
 const authored=compileExternalQuestionBank(starter);
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
 const authored=compileExternalQuestionBank(starter);
 const decorated=structuredClone(authored);
 const q=decorated.questions[0];
 q.content.topicIds=["labour-code-verified"];
 q.content.tags=["difficulty:medium"];
 q.contentHash=questionRevisionHash(q);
 const snapshot=JSON.stringify(decorated);
 const inventory=practiceInventory(decorated);
 assert.ok(inventory.topics.some(x=>x.id==="labour-code-verified"));
 assert.deepEqual(inventory.difficulties.map(x=>x.id),["medium"]);
 const selected=composePracticeSet(decorated,{count:1,seed:"topic-1",
   filters:{topicId:"labour-code-verified",difficulty:"medium"}});
 assert.equal(selected.bundle.questions[0].id,q.id);
 assert.equal(selected.manifest.eligibleCount,1);
 assert.equal(JSON.stringify(decorated),snapshot,"No mutation of original bank");
 assert.equal(validateExamPackage(selected.bundle),selected.bundle);
});


test("authoring cardinality and scoring are data-driven for 2/4/5 options and variable matching",()=>{
 const source=structuredClone(starter);
 source.questions[0].options=["Alpha","Beta"];
 source.questions[0].answer="B";
 source.questions[1].options=["A","B","C","D","E"];
 source.questions[1].answer="E";
 const third=source.questions[2];
 delete third.tolerance;
 third.kind="matching";
 third.leftItems=["Left 1","Left 2","Left 3"];
 third.rightItems=["Right A","Right B","Right C","Right D","Right E"];
 third.answer="1-A,2-C,3-E";
 source.scoring={
  correctMarks:3,incorrectMarks:-1,unansweredMarks:-0.25,decimalPlaces:3,
  byQuestionKind:{"matching":{correctMarks:4,incorrectMarks:-1,unansweredMarks:0}}
 };
 source.sections[1].scoringOverride={correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0};
 const pkg=compileExternalQuestionBank(source);
 assert.deepEqual(pkg.questions.slice(0,2).map(q=>q.content.options.length),[2,5]);
 assert.equal(pkg.answerKey.entries[0].answer.optionId,"B");
 assert.equal(pkg.answerKey.entries[1].answer.optionId,"E");
 assert.equal(pkg.questions[2].content.leftItems.length,3);
 assert.equal(pkg.questions[2].content.rightItems.length,5);
 assert.deepEqual(pkg.answerKey.entries[2].answer.pairs.map(p=>p.rightId),["A","C","E"]);
 assert.deepEqual(pkg.paper.scoring.defaultRule,{correctMarks:3,incorrectMarks:-1,unansweredMarks:-0.25});
 assert.deepEqual(pkg.paper.scoring.byQuestionKind.matching,{correctMarks:4,incorrectMarks:-1,unansweredMarks:0});
 assert.equal(pkg.paper.scoring.decimalPlaces,3);
 assert.deepEqual(pkg.paper.sections[1].scoringOverride,{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0});
 assert.equal(validateExamPackage(pkg),pkg);
 const four=compileExternalQuestionBank(starter);
 assert.deepEqual(four.questions.filter(q=>q.content.kind==="single-choice").map(q=>q.content.options.length),[4,4]);
});

test("omitted written target stays omitted and new manual authoring starts from neutral policy",()=>{
 const source=structuredClone(starter),written=source.questions[2];
 delete written.tolerance;
 written.kind="free-response";
 delete written.answer;
 delete written.wordLimit;
 written.prompt="Write a short analytical response.";
 const pkg=compileExternalQuestionBank(source);
 const q=pkg.questions[2];
 assert.equal(q.content.kind,"free-response");
 assert.equal(q.content.responseRules.wordLimit,undefined,
  "AI authoring must never invent a 300-word target");
 const draft=newAuthoringDraft();
 assert.equal(draft.timingKind,"untimed");
 assert.equal(draft.durationMinutes,0);
 assert.equal(draft.marksCorrect,1);
 assert.equal(draft.marksIncorrect,0);
 assert.equal(draft.marksUnanswered,0);
 assert.equal(draft.scoreDecimalPlaces,2);
 assert.equal(draft.sections[0].minutes,0);
 assert.equal(draft.questions[0].wordLimit,undefined);
});

test("explicit practice eligibility can narrow structural modes without exam-name special cases",()=>{
 const one={...starter,bankId:"one-mode",paperId:"one-mode",examId:"generic-one",
  practiceModes:["free"],sections:[{id:"whole",title:"Whole paper"}],
  questions:starter.questions.map(({syllabusHeadingId:_,...q})=>({...q,subject:"General",examSection:"whole"}))};
 const onePkg=compileExternalQuestionBank(one);
 assert.deepEqual(availablePracticeModes(onePkg.paper),["free"]);
 assert.equal(resolvePracticeMode(onePkg.paper,"strict"),"free");
 assert.throws(()=>configurePracticeMode(onePkg,"strict"),/unavailable/);
 const multi={...starter,bankId:"multi-modes",paperId:"multi-modes",examId:"generic-multi",
  practiceModes:["strict","free"],
  questions:starter.questions.map(({syllabusHeadingId:_,...q})=>({...q,subject:"General"}))};
 const multiPkg=compileExternalQuestionBank(multi);
 assert.deepEqual(availablePracticeModes(multiPkg.paper),["strict","free"]);
 assert.throws(()=>configurePracticeMode(multiPkg,"single",0),/unavailable/);
 const invalid={...one,practiceModes:["single"]};
 assert.throws(()=>compileExternalQuestionBank(invalid),/Section practice requires multiple physical sections/);
});

test("edition pairing never substitutes a different logical paper",async()=>{
 const {pairedCounterpart,pairedEdition}=await import("../src/app/exam-families.ts");
 const genericQuestions=starter.questions.map(({syllabusHeadingId:_,...q})=>({...q,subject:"General"}));
 const source=compileExternalQuestionBank({...starter,bankId:"paper-a",paperId:"paper-a",examId:"mixed-editions",questions:genericQuestions});
 const reviewedLike=compileExternalQuestionBank({...starter,bankId:"paper-b",paperId:"paper-b",examId:"mixed-editions",questions:genericQuestions});
 const fakeSource={...source,paper:{...source.paper,edition:"source"}};
 const fakeReviewed={...reviewedLike,paper:{...reviewedLike.paper,edition:"reviewed",
  sourcePaperRevisionId:"other-source",sourceAnswerKeyRevisionId:"other-key"}};
 const family={id:"included:mixed-editions",title:"Mixed",imported:false,origin:"included",
  examId:"mixed-editions",includedPaperIds:[],papers:[fakeSource,fakeReviewed]};
 assert.equal(pairedEdition(family,fakeSource,"reviewed"),undefined);
 assert.equal(pairedEdition(family,fakeReviewed,"source"),undefined);
 assert.equal(pairedCounterpart(family,fakeSource),undefined,
  "an unrelated reviewed paper must not make a source-only paper look paired");
 assert.equal(pairedCounterpart(family,fakeReviewed),undefined,
  "an unrelated source paper must not make a reviewed-only paper look paired");
 const actual=builtinCglPackages(sources,patches);
 const realSource=actual.find(p=>p.paper.edition==="source");
 const realReviewed=actual.find(p=>p.paper.edition==="reviewed"&&
   p.paper.sourcePaperRevisionId===realSource?.paper.id);
 assert.ok(realSource&&realReviewed);
 const realFamily={...family,examId:"ssc-cgl",papers:[realSource,realReviewed]};
 assert.equal(pairedCounterpart(realFamily,realSource)?.paper.id,realReviewed.paper.id);
 assert.equal(pairedCounterpart(realFamily,realReviewed)?.paper.id,realSource.paper.id);
});
