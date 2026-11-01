// Pass37 lossless capability suite. Each lexical block preserves the original
// independent fixtures and test body, identified for assertion-level traceability.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "node:fs/promises";
import * as __suite_dep_3 from "../src/app/exam-package.ts";
import * as __suite_dep_4 from "../src/domain/validate.ts";
import * as __suite_dep_5 from "../src/domain/integrity.ts";
import * as __suite_dep_6 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_7 from "../src/app/generic-ui.ts";
import * as __suite_dep_8 from "../src/history/backup.ts";
import * as __suite_dep_9 from "../src/app/bank-import.ts";
import * as __suite_dep_10 from "../src/engine/response.ts";
import * as __suite_dep_11 from "../src/engine/scoring.ts";
import * as __suite_dep_12 from "../src/engine/score-ceiling.ts";

// === Legacy suite: tests/exam-packages-and-cgl-modes.test.mjs — 5 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const builtinCglPackages = __suite_dep_3["builtinCglPackages"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_3["transitionGenericAttempt"];
const configureCglPractice = __suite_dep_3["configureCglPractice"];
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const packages=builtinCglPackages(sources,patches);

test("generic importer retains all 500 questions in 10 existing editions",()=>{
 assert.equal(packages.length,10);
 assert.equal(packages.reduce((n,p)=>n+p.questions.length,0),1000);
 for(const p of packages) {
   assert.equal(validateExamPackage(p),p);
   assert.equal(p.questions.length,100,"Each original and reviewed paper has 100 validated question revisions");
   assert.equal(p.paper.sections.length,4);
 }
});
test("a package rejects missing questions, unknown media and malformed keys",()=>{
 const p=packages[0];
 assert.throws(()=>validateExamPackage({...p,questions:p.questions.slice(1)}));
 assert.throws(()=>validateExamPackage({...p,questions:[{...p.questions[0],
   content:{...p.questions[0].content,assetIds:["missing-image"]}},...p.questions.slice(1)]}),/Missing question image/);
});
test("generic attempt uses validated responses and frozen revisions",()=>{
 const p=packages[0];
 const start=startGenericAttempt(p,"test",100);
 const id=p.questions[0].id, option=p.questions[0].content.options[0].id;
 const index=new Map(p.questions.map(q=>[q.id,q]));
 const next=transitionGenericAttempt(start,{type:"ANSWER",nowMs:101,response:{kind:"single-choice",optionId:option}},index);
 assert.equal(next.state.responses.find(x=>x.questionRevisionId===id).response.optionId,option);
 assert.throws(()=>transitionGenericAttempt(start,{type:"ANSWER",nowMs:101,
   response:{kind:"single-choice",optionId:"not-real"}},index),/Unknown option/);
 // Sectional exam cannot bypass the locked sections by directly submitting.
 const blocked=transitionGenericAttempt(next,{type:"SUBMIT_ATTEMPT",nowMs:200},index);
 assert.equal(blocked.finishedAt,null);
 let end=blocked;
 for(let section=0;section<4;section++)
   end=transitionGenericAttempt(end,{type:"SUBMIT_SECTION",nowMs:201+section},index);
 assert.equal(end.finishedAt,204);
 assert.equal(end.result.items.length,100);
});


// Alternate built-in CGL edition/mode fixtures; retained from cgl-practice.test.mjs.
{
const papers=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const all=builtinCglPackages(papers,patches,solutions);
test("one engine supports strict, flexible and single CGL policies",()=>{
 const standard=all[0];
 const strict=configureCglPractice(standard,"strict");
 const free=configureCglPractice(standard,"free");
 const single=configureCglPractice(standard,"single",2);
 assert.equal(strict.paper.timing.kind,"sectional");
 assert.equal(strict.paper.timing.transition,"automatic","Actual strict mode must not inherit raw manual source transition");
 assert.notEqual(strict.paper.id,standard.paper.id,"Derived strict policy must have distinct frozen revision identity");
 assert.equal(free.paper.timing.kind,"whole-paper");
 assert.equal(free.paper.sections.length,4);
 assert.equal(single.paper.sections.length,1);
 assert.equal(single.questions.length,25);
 assert.equal(single.answerKey.entries.length,25);
 assert.equal(validateExamPackage(free),free);
 assert.equal(validateExamPackage(single),single);
 const attempt=startGenericAttempt(single,"one",1000);
 const lookup=new Map(single.questions.map(q=>[q.id,q]));
 const answered=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1001,response:{
  kind:"single-choice",optionId:single.questions[0].content.options[0].id}},lookup);
 assert.equal(answered.state.responses.length,1);
 const ended=transitionGenericAttempt(answered,{type:"SUBMIT_ATTEMPT",nowMs:1002},lookup);
 assert.equal(ended.result.items.length,25);
});
}
}

// === Legacy suite: tests/exam-schema-validation.test.mjs — 6 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const validateAnswerKeyRevision = __suite_dep_4["validateAnswerKeyRevision"];
const validatePaperRevision = __suite_dep_4["validatePaperRevision"];
const validateQuestionRevision = __suite_dep_4["validateQuestionRevision"];
const hash = "a".repeat(64);
const question = (overrides = {}) => ({
  id: "question-rev-1",
  questionId: "question-1",
  revision: 1,
  contentHash: hash,
  content: {
    kind: "single-choice",
    prompt: "Which option is correct?",
    options: [
      { id: "option-a", text: "A" },
      { id: "option-b", text: "B" },
    ],
  },
  editorial: { status: "verified" },
  ...overrides,
});
const scoring = {
  defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 },
};
const paper = (overrides = {}) => ({
  id: "paper-rev-1",
  paperId: "paper-1",
  revision: 1,
  contentHash: hash,
  edition: "reviewed",
  answerKeyRevisionId: "key-rev-1",
  sections: [{ id: "section-1", title: "Section 1", questionRevisionIds: ["question-rev-1"] }],
  timing: { kind: "sectional", sectionLimits: [{ sectionId: "section-1", durationMs: 900000 }], transition: "manual", allowEarlySubmit: true, pausePolicy: "forbidden" },
  navigation: { questionNavigation: "free", sectionNavigation: "sequential-locked", allowFlagging: true, allowReview: true },
  scoring,
  ...overrides,
});
const answerKey = (overrides = {}) => ({
  id: "key-rev-1",
  paperId: "paper-1",
  revision: 1,
  contentHash: hash,
  entries: [{ questionRevisionId: "question-rev-1", answer: { kind: "single-choice", optionId: "option-b" } }],
  ...overrides,
});

test("accepts a valid question, paper revision and matching answer key", () => {
  const q = validateQuestionRevision(question());
  const key = validateAnswerKeyRevision(answerKey(), [q]);
  const p = validatePaperRevision(paper(), [q], key);
  assert.equal(p.sections[0].questionRevisionIds[0], q.id);
  assert.equal(key.entries[0].answer.optionId, "option-b");
});

test("rejects duplicate option identities and malformed hashes", () => {
  const duplicateOptions = question({
    content: { kind: "single-choice", prompt: "Choose", options: [{ id: "same", text: "A" }, { id: "same", text: "B" }] },
  });
  assert.throws(() => validateQuestionRevision(duplicateOptions), /duplicate identifier/);
  assert.throws(() => validateQuestionRevision(question({ contentHash: "not-a-hash" })), /SHA-256/);
});

test("rejects incompatible answer kinds and unknown option IDs", () => {
  const q = validateQuestionRevision(question());
  assert.throws(() => validateAnswerKeyRevision(answerKey({
    entries: [{ questionRevisionId: q.id, answer: { kind: "single-choice", optionId: "not-an-option" } }],
  }), [q]), /unknown option/);
  assert.throws(() => validateAnswerKeyRevision(answerKey({
    entries: [{ questionRevisionId: q.id, answer: { kind: "true-false", value: true } }],
  }), [q]), /does not match question kind/);
});

test("rejects duplicate section membership and missing sectional limits", () => {
  const q = validateQuestionRevision(question());
  const duplicated = paper({
    sections: [
      { id: "section-1", title: "One", questionRevisionIds: [q.id] },
      { id: "section-2", title: "Two", questionRevisionIds: [q.id] },
    ],
    timing: { kind: "untimed" },
  });
  assert.throws(() => validatePaperRevision(duplicated, [q]), /multiple sections/);
  assert.throws(() => validatePaperRevision(paper({
    timing: { kind: "sectional", sectionLimits: [], transition: "manual", allowEarlySubmit: true, pausePolicy: "forbidden" },
  }), [q]), /exactly one limit/);
});

test("rejects scoring rules with a positive wrong-answer penalty", () => {
  const q = validateQuestionRevision(question());
  assert.throws(() => validatePaperRevision(paper({
    scoring: { defaultRule: { correctMarks: 2, incorrectMarks: 0.5, unansweredMarks: 0 } },
  }), [q]), /non-positive/);
});

test("rejects an answer key that omits a question in the paper", () => {
  const q = validateQuestionRevision(question());
  const key = validateAnswerKeyRevision(answerKey({ entries: [] }), [q]);
  assert.throws(() => validatePaperRevision(paper(), [q], key), /missing answer-key entry/);
});
}

// === Legacy suite: tests/exam-six-kind-lifecycle.test.mjs — 5 unchanged test registrations ===
{
const paperRevisionHash = __suite_dep_5["paperRevisionHash"];
const test = __suite_dep_0["default"];
const questions = __suite_dep_6["questions"];
const answers = __suite_dep_6["answers"];
const pkg = __suite_dep_6["pkg"];
const assert = __suite_dep_1["default"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const startGenericAttempt = __suite_dep_3["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_3["transitionGenericAttempt"];
const readableAnswer = __suite_dep_3["readableAnswer"];
const validateGenericStoredRecord = __suite_dep_7["validateGenericStoredRecord"];
const makeBackup = __suite_dep_8["makeBackup"];
const verifyBackup = __suite_dep_8["verifyBackup"];
const planBackupMerge = __suite_dep_8["planBackupMerge"];
const responses=[
 {kind:"single-choice",optionId:"a"},
 {kind:"multiple-select",optionIds:["x","z"]},
 {kind:"numeric-entry",value:3.5},
 {kind:"true-false",value:true},
 {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
 {kind:"free-response",text:"Because of the underlying principles."},
];
const lookup=new Map(questions.map(q=>[q.id,q]));
test("a non-CGL paper completes all six response types through the same engine",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"test",1000);
 let now=1001;
 for(let i=0;i<6;i++){
   const s=i<3?0:1, n=i%3;
   attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:now++,sectionIndex:s,questionIndex:n},lookup);
   attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:now++,response:responses[i]},lookup);
 }
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:now++},lookup);
 assert.equal(attempt.state.status,"completed");
 assert.equal(attempt.result.snapshot.correctCount,5);
 assert.equal(attempt.result.snapshot.earnedMarks,10);
 assert.equal(attempt.result.items.filter(item=>item.verdict==="pending").length,1);
 assert.equal(attempt.frozen.snapshot.examId,"example-exam");
 assert.equal(readableAnswer(questions[0],answers[0]),"Alpha");
});
test("invalid numeric value, underspecified selections and duplicate matches are rejected",()=>{
 const bundle=validateExamPackage(pkg);
 let attempt=startGenericAttempt(bundle,"bad",1000);
 const navigate=(s,n)=>{attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1001,sectionIndex:s,questionIndex:n},lookup);};
 navigate(0,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1002,response:{kind:"multiple-select",optionIds:["x"]}},lookup),/selection/i);
 navigate(0,2);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1003,response:{kind:"numeric-entry",value:11}},lookup),/numeric/i);
 navigate(1,1);
 assert.throws(()=>transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:1004,response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}},lookup),/matching/i);
});
test("forward-only navigation restrictions are respected for non-CGL papers",()=>{
 const changed={...pkg.paper,navigation:{...pkg.paper.navigation,questionNavigation:"forward-only"}};
 const b=validateExamPackage({...pkg,paper:{...changed,contentHash:paperRevisionHash(changed)}});
 let attempt=startGenericAttempt(b,"forward",0);
 attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:1,sectionIndex:0,questionIndex:2},lookup);
 const back=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:2,sectionIndex:0,questionIndex:0},lookup);
 assert.equal(back.state.questionIndex,2);
});

test("generic attempts and imported packages survive a verified history backup round trip",()=>{
 const bundle=validateExamPackage(pkg);
 const unfinished=startGenericAttempt(bundle,"resumeable",1000);
 let completed=startGenericAttempt(bundle,"completed",1000);
 completed=transitionGenericAttempt(completed,{type:"ANSWER",nowMs:1001,response:responses[0]},lookup);
 completed=transitionGenericAttempt(completed,{type:"SUBMIT_ATTEMPT",nowMs:1002},lookup);
 assert.equal(validateGenericStoredRecord(unfinished),unfinished);
 assert.equal(validateGenericStoredRecord(completed),completed);
 const importedPackage={recordType:"generic-package",id:"generic-package:"+bundle.paper.id,bundle};
 const contents=[importedPackage,unfinished,completed];
 const backup=makeBackup(contents,{schema:1,dark:false,scale:100},"2026-10-28T00:00:00Z");
 const reloaded=verifyBackup(JSON.parse(JSON.stringify(backup)));
 assert.equal(reloaded.records.length,3);
 for(const record of reloaded.records) assert.doesNotThrow(()=>validateGenericStoredRecord(record));
 assert.deepEqual(planBackupMerge([completed],reloaded.records,"completed").map(x=>x.id),
  [importedPackage.id,unfinished.id]);
 assert.throws(()=>verifyBackup({...reloaded,records:reloaded.records.slice(1)}),/integrity/);
});
test("completed generic scores cannot be silently rewritten in stored history",()=>{
 const bundle=validateExamPackage(pkg);
 let completed=startGenericAttempt(bundle,"tamper",1000);
 completed=transitionGenericAttempt(completed,{type:"SUBMIT_ATTEMPT",nowMs:1100},lookup);
 const altered=structuredClone(completed);
 altered.result.snapshot.earnedMarks=123456;
 assert.throws(()=>validateGenericStoredRecord(altered),/score does not match/);
 assert.throws(()=>validateGenericStoredRecord({...completed,packageId:"different-revision"}),/incorrect revision/);
});
}

// === Legacy suite: tests/import-boundary-properties.test.mjs — 5 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const importAuthoredExam = __suite_dep_9["importAuthoredExam"];
const importSimpleQuestionBank = __suite_dep_9["importSimpleQuestionBank"];
const validateExamPackage = __suite_dep_3["validateExamPackage"];
const validateResponse = __suite_dep_10["validateResponse"];
const scoreAttempt = __suite_dep_11["scoreAttempt"];
const scoreableMaximum = __suite_dep_12["scoreableMaximum"];
const questions = __suite_dep_6["questions"];
const pkg = __suite_dep_6["pkg"];
const starter=JSON.parse(await readFile(new URL("../examples/apfc-mcq-nat-starter.json",import.meta.url),"utf8"));
function rng(seed){let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}
const edit=mutate=>{const b=structuredClone(starter);mutate(b);return b;};

test("author-friendly MCQ/NAT adapter retains full fractions, unique identities and hash determinism",()=>{
 for(let seed=1;seed<=75;seed++){
  const random=rng(0x36b123^seed);
  const count=1+random(50);
  const bank=structuredClone(starter);
  bank.bankId="seed-"+seed;
  bank.questions=Array.from({length:count},(_,i)=>{
   const q=structuredClone(starter.questions[i%starter.questions.length]);
   q.id="seed-q"+i;
   q.section="Section "+(i%4);
   if(q.type==="nat")q.answer=[-2,0,12][random(3)];
   return q;
  });
  const pkg=importAuthoredExam(bank);
  assert.equal(pkg.questions.length,count,"seed="+seed);
  assert.equal(pkg.answerKey.entries.length,count,"seed="+seed);
  assert.equal(pkg.paper.sections.length,Math.min(4,count),"seed="+seed);
  assert.equal(pkg.paper.scoring.defaultRule.correctMarks,2.5);
  assert.ok(Math.abs(pkg.paper.scoring.defaultRule.incorrectMarks+5/6)<1e-12);
  assert.equal(validateExamPackage(pkg),pkg);
  assert.deepEqual(importAuthoredExam(structuredClone(bank)),pkg,
   "seed="+seed+" stable identities and hashes");
  assert.equal(new Set(pkg.questions.map(q=>q.id)).size,count);
  assert.ok(pkg.questions.every(q=>q.editorial.status==="verified"));
  assert.ok(pkg.answerKey.entries.every(e=>e.answer.kind==="single-choice"||e.answer.kind==="numeric-entry"));
  const maximum=scoreableMaximum(pkg.paper,pkg.answerKey,pkg.questions);
  assert.ok(Math.abs(maximum-2.5*count)<1e-8,"seed="+seed+" nominal maximum");
 }
});

test("simple-bank upper boundary of 2000 questions succeeds without truncating keys or sections",()=>{
 const bank=edit(b=>{b.bankId="limit-2000";b.questions=Array.from({length:2000},(_,i)=>({
  ...structuredClone(starter.questions[0]),id:"q"+i,section:"Group "+(i%10)}));});
 const p=importSimpleQuestionBank(bank);
 assert.equal(p.questions.length,2000);
 assert.equal(p.answerKey.entries.length,2000);
 assert.equal(p.paper.sections.length,10);
 assert.equal(p.paper.sections.reduce((n,s)=>n+s.questionRevisionIds.length,0),2000);
 assert.equal(new Set(p.questions.map(q=>q.id)).size,2000,
  "each question has a unique revision identity even for identical wording");
 assert.equal(new Set(p.answerKey.entries.map(e=>e.questionRevisionId)).size,2000,
  "all 2000 distinct identities have retained keys");
 assert.ok(p.questions.every(q=>typeof q.contentHash==="string"&&q.contentHash.length===64),
  "every revision retains an integrity hash; identical content may legitimately share a hash");
 assert.ok(Math.abs(scoreableMaximum(p.paper,p.answerKey,p.questions)-5000)<1e-8);
 assert.throws(()=>importSimpleQuestionBank({...bank,questions:[
  ...bank.questions,{...bank.questions[0],id:"q2000"}]}),/1–2000/);
});

test("hostile or borderline authored bank input is rejected instead of truncated or coerced",()=>{
 const cases=[
  ["20001 prompt",b=>b.questions[0].question="X".repeat(20001)],
  ["blank prompt",b=>b.questions[0].question=" "],
  ["duplicate stable ID",b=>b.questions[1].id=b.questions[0].id],
  ["invalid option",b=>b.questions[0].options=["only-one"]],
  ["nonfinite incorrect",b=>b.scoring.incorrectMarks=Infinity],
  ["negative wrong reward fraction",b=>b.scoring.negativeFraction=-1],
  ["contradictory scoring knobs",b=>b.scoring.incorrectMarks=-1],
  ["nonfinite NAT",b=>b.questions[2].answer=NaN],
  ["NAT accepted list empty",b=>b.questions[2].answer=[]],
  ["NAT too many alternatives",b=>b.questions[2].answer=Array.from({length:21},(_,i)=>i)],
  ["NAT negative tolerance",b=>b.questions[2].tolerance=-0.001],
  ["NAT excessive tolerance",b=>b.questions[2].tolerance=1000001],
  ["unsupported answer kind",b=>b.questions[0].type="matching"],
  ["invalid revision",b=>b.revision=1.5],
  ["invalid edition",b=>b.edition="official-maybe"],
  ["invalid bank identifier",b=>b.bankId="../outside"],
 ];
 for(const [name,mutate] of cases){
  assert.throws(()=>importSimpleQuestionBank(edit(mutate)),undefined,name);
 }
});

test("engine response validator gates six kinds independently from UI controls",()=>{
 const accepted=[
  {kind:"single-choice",optionId:"a"},
  {kind:"multiple-select",optionIds:["x","z"]},
  {kind:"numeric-entry",value:3.5},
  {kind:"true-false",value:true},
  {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
  {kind:"free-response",text:"Reasoning and explanation."},
 ];
 for(let i=0;i<accepted.length;i++)assert.doesNotThrow(()=>validateResponse(questions[i],accepted[i]),"kind="+i);
 const invalid=[
  [0,{kind:"single-choice",optionId:"unknown"}],
  [1,{kind:"multiple-select",optionIds:["x"]}],
  [1,{kind:"multiple-select",optionIds:["x","x"]}],
  [1,{kind:"multiple-select",optionIds:["x","z","unknown"]}],
  [2,{kind:"numeric-entry",value:NaN}],
  [2,{kind:"numeric-entry",value:Infinity}],
  [2,{kind:"numeric-entry",value:-1}],
  [2,{kind:"numeric-entry",value:10.01}],
  [2,{kind:"numeric-entry",value:3.501}],
  [3,{kind:"true-false",value:"true"}],
  [4,{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}],
  [4,{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l1",rightId:"r2"}]}],
  [5,{kind:"free-response",text:"word ".repeat(41)}],
 ];
 for(const [i,response] of invalid)assert.throws(()=>validateResponse(questions[i],response),
  undefined,"kind="+i+" input="+JSON.stringify(response));
 const negative={...questions[2],content:{...questions[2].content,
  numericRules:{minimum:-10,maximum:10,allowNegative:true,decimalPlaces:2}}};
 for(const value of [-10,-1.25,0,10])assert.doesNotThrow(()=>
  validateResponse(negative,{kind:"numeric-entry",value}),"negative/zero NAT "+value);
 for(const value of [-10.001,10.001,NaN,-Infinity])assert.throws(()=>
  validateResponse(negative,{kind:"numeric-entry",value}),undefined,"boundary NAT "+value);
});

test("validated advanced six-kind package still retains manual grading separation",()=>{
 assert.equal(validateExamPackage(pkg),pkg);
 const response=[{questionRevisionId:"rev-5",response:{kind:"free-response",text:"Essay"}}];
 const result=scoreAttempt(pkg.paper,pkg.answerKey,questions,response,"T");
 assert.equal(result.items[5].verdict,"pending");
 assert.equal(result.items[5].marks,0);
 assert.equal(result.snapshot.unansweredCount,5);
 assert.equal(scoreableMaximum(pkg.paper,pkg.answerKey,questions),10);
});
}


// P42: adversarial imported-data envelopes; keep these beside the existing
// import/package capability tests rather than adding a chronological suite.
{
const test=__suite_dep_0.default,assert=__suite_dep_1.default;
const {pkg}=__suite_dep_6;
const {validateExamPackage,validateExamImportBudget}=__suite_dep_3;
const {importAuthoredExam}=__suite_dep_9;
const {makeBackup,verifyBackup}=__suite_dep_8;
const clone=()=>structuredClone(pkg);

test("P42 rejects oversized authored text and IDs before any revision hashes are trusted",()=>{
 const oversized=clone();
 oversized.questions[0].content.prompt="q".repeat(20001);
 assert.throws(()=>validateExamPackage(oversized),/20,000 characters/);
 const hugeId=clone();
 hugeId.questions[0].questionId="q".repeat(513);
 assert.throws(()=>validateExamPackage(hugeId),/identifier too long/);
 const hugeTitle=clone();
 hugeTitle.title="z".repeat(32*1024*1024+1);
 assert.throws(()=>validateExamImportBudget(hugeTitle),/32 MiB text budget/);
});

test("P42 rejects deep, cyclic and oversized question inventories; allows shared immutable objects",()=>{
 const deep={};let cursor=deep;
 for(let i=0;i<50;i++){cursor.child={};cursor=cursor.child;}
 assert.throws(()=>validateExamImportBudget(deep),/nesting limit/);
 const cyclic={};cyclic.loop=cyclic;
 assert.throws(()=>validateExamImportBudget(cyclic),/cyclic object/);
 const shared=clone();
 shared.questions[0].editorial=shared.questions[1].editorial;
 assert.equal(validateExamPackage(shared),shared);
 const source=JSON.parse("{\n  \"format\": \"practice-desk-bank\",\n  \"version\": 1,\n  \"bankId\": \"apfc-starter-demo\",\n  \"examId\": \"upsc-epfo-apfc\",\n  \"title\": \"APFC Sample — Labour, Accountancy & NAT\",\n  \"revision\": 1,\n  \"edition\": \"custom\",\n  \"scoring\": {\n    \"correctMarks\": 2.5,\n    \"negativeFraction\": 0.3333333333333333,\n    \"unansweredMarks\": 0\n  },\n  \"timing\": {\n    \"kind\": \"untimed\"\n  },\n  \"questions\": [\n    {\n      \"id\": \"labour-1\",\n      \"section\": \"Labour and Social Security\",\n      \"type\": \"mcq\",\n      \"question\": \"For EPFO APFC, which type of question is shown in this example?\",\n      \"options\": [\n        \"Multiple-choice question\",\n        \"Only a writing task\",\n        \"An audio task\",\n        \"An image-editing task\"\n      ],\n      \"answer\": \"A\",\n      \"explanation\": \"Demonstration item for a user-authored four-option MCQ. Replace with a source-verified APFC question before real study.\"\n    },\n    {\n      \"id\": \"accounts-1\",\n      \"section\": \"Accountancy\",\n      \"type\": \"mcq\",\n      \"question\": \"In double-entry accounting, each transaction has:\",\n      \"options\": [\n        \"One entry only\",\n        \"Equal debits and credits in total\",\n        \"No ledger impact\",\n        \"Only cash impact\"\n      ],\n      \"answer\": \"B\",\n      \"explanation\": \"Basic example; replace with source-backed APFC material for a real practice bank.\"\n    },\n    {\n      \"id\": \"nat-1\",\n      \"section\": \"Elementary Statistics / NAT\",\n      \"type\": \"nat\",\n      \"question\": \"Find the arithmetic mean of 3, 4 and 5.\",\n      \"answer\": 4,\n      \"tolerance\": 0.01,\n      \"explanation\": \"(3 + 4 + 5) / 3 = 4.\"\n    }\n  ]\n}");
 source.questions=Array.from({length:2001},(_,i)=>({...source.questions[0],id:"q"+i}));
 assert.throws(()=>importAuthoredExam(source),/2000 questions/);
});

test("P42 rejects unsupported source schemes, oversized media and invalid media digest",()=>{
 const source=clone();
 source.questions[0].editorial.sources=[{title:"Unsafe source",url:"javascript:alert(1)"}];
 assert.throws(()=>validateExamPackage(source),/only http\(s\)/);
 const oversizedMedia=clone();
 oversizedMedia.assets=[{id:"file",mediaType:"image/png",dataUri:"data:image/png;base64,"+"A".repeat(14*1024*1024+1),contentHash:"0".repeat(64)}];
 assert.throws(()=>validateExamPackage(oversizedMedia),/image data URI too large/);
 const tampered=clone();
 tampered.assets=[{id:"asset",mediaType:"image/png",dataUri:"data:image/png;base64,AA==",contentHash:"0".repeat(64)}];
 assert.throws(()=>validateExamPackage(tampered),/digest mismatch/);
});

test("P42 corrupted backup fails closed without altering legitimate v3 payloads",()=>{
 const backup=makeBackup([{id:"one"}],{schema:1,dark:false,scale:100},"2026-11-02T00:00:00Z");
 assert.deepEqual(verifyBackup(structuredClone(backup)),backup);
 const damaged=structuredClone(backup);
 damaged.records[0].id="tampered";
 assert.throws(()=>verifyBackup(damaged),/integrity/);
});
}
