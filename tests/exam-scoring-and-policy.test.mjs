// Pass37 lossless capability suite. Each lexical block preserves the original
// independent fixtures and test body, identified for assertion-level traceability.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "node:fs/promises";
import * as __suite_dep_3 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_4 from "../src/domain/integrity.ts";
import * as __suite_dep_5 from "../src/app/exam-package.ts";
import * as __suite_dep_6_stored_record_validator from "../src/app/stored-record-validator.ts";
import * as __suite_dep_6_exam_view from "../src/app/exam-view.ts";
import * as __suite_dep_7 from "../src/engine/session.ts";
import * as __suite_dep_8 from "../src/engine/manual-grading.ts";
import * as __suite_dep_9 from "../src/engine/source-comparison.ts";
import * as __suite_dep_10 from "../src/engine/scoring.ts";
import * as __suite_dep_11 from "../src/engine/clock.ts";
import * as __suite_dep_12 from "../src/app/exam-preflight.ts";
import * as __suite_dep_13 from "../src/engine/score-ceiling.ts";
import * as __suite_dep_14 from "../src/domain/validate.ts";
import * as __suite_dep_15 from "../src/app/result-presentation.ts";
import * as __suite_dep_16 from "../src/history/frozen.ts";

// === Legacy suite: tests/exam-policy-manual-grading-and-timing.test.mjs — 9 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const pkg = __suite_dep_3["pkg"];
const paperRevisionHash = __suite_dep_4["paperRevisionHash"];
const validateExamPackage = __suite_dep_5["validateExamPackage"];
const configureCglPractice = __suite_dep_5["configureCglPractice"];
const builtinCglPackages = __suite_dep_5["builtinCglPackages"];
const startGenericAttempt = __suite_dep_5["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_5["transitionGenericAttempt"];
const validateGenericStoredRecord = __suite_dep_6_stored_record_validator["validateGenericStoredRecord"];
const transition = __suite_dep_7["transition"];
const startSession = __suite_dep_7["startSession"];
const setManualGrade = __suite_dep_8["setManualGrade"];
const validateManualGrades = __suite_dep_8["validateManualGrades"];
const manualGradeSummary = __suite_dep_8["manualGradeSummary"];
const createSourceKeyReference = __suite_dep_9["createSourceKeyReference"];
const sourceKeyScore = __suite_dep_9["sourceKeyScore"];
const validateSourceKeyReference = __suite_dep_9["validateSourceKeyReference"];
const scoreAttempt = __suite_dep_10["scoreAttempt"];
const createSessionClock = __suite_dep_11["createSessionClock"];
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const builtins=builtinCglPackages(sources,patches);
const mock=(paperChanges)=>{const base={...pkg.paper,...paperChanges,
  navigation:paperChanges.timing?.kind==="sectional"?
    {...pkg.paper.navigation,sectionNavigation:"sequential-locked",...paperChanges.navigation}:
    paperChanges.navigation??pkg.paper.navigation};
 return validateExamPackage({...pkg,paper:{...base,contentHash:paperRevisionHash(base)}});};

test("strict section submission policy is an engine invariant, not a disabled button",()=>{
 const bundle=mock({timing:{kind:"sectional",transition:"automatic",pausePolicy:"forbidden",allowEarlySubmit:false,
   sectionLimits:[{sectionId:"s1",durationMs:1000},{sectionId:"s2",durationMs:1000}]}});
 const started=startSession(bundle.paper,0);
 assert.equal(transition(bundle.paper,started,{type:"SUBMIT_ATTEMPT",nowMs:1}).status,"running");
 assert.equal(transition(bundle.paper,started,{type:"SUBMIT_SECTION",nowMs:2}).sectionIndex,0);
 const timed=transition(bundle.paper,started,{type:"TICK",nowMs:1000});
 assert.equal(timed.sectionIndex,1);
 assert.deepEqual(timed.completedSections,[0]);
 assert.equal(transition(bundle.paper,timed,{type:"SUBMIT_ATTEMPT",nowMs:1001}).status,"running");
 assert.equal(transition(bundle.paper,timed,{type:"TICK",nowMs:2000}).status,"completed");
});
test("delayed submit cannot accidentally finish the next section after a timeout",()=>{
 const bundle=mock({timing:{kind:"sectional",transition:"automatic",pausePolicy:"forbidden",allowEarlySubmit:true,
   sectionLimits:[{sectionId:"s1",durationMs:1000},{sectionId:"s2",durationMs:1000}]}});
 const first=startSession(bundle.paper,0);
 const advanced=transition(bundle.paper,first,{type:"SUBMIT_SECTION",nowMs:1050});
 assert.equal(advanced.status,"running");
 assert.equal(advanced.sectionIndex,1);
 assert.deepEqual(advanced.completedSections,[0]);
 const final=transition(bundle.paper,advanced,{type:"SUBMIT_SECTION",nowMs:1060});
 assert.equal(final.status,"completed");
});
test("pause and flag policies hold in pure transitions, including clock rollback",()=>{
 const bundle=mock({timing:{kind:"whole-paper",durationMs:5000,pausePolicy:"forbidden"},
    navigation:{questionNavigation:"forward-only",sectionNavigation:"sequential-locked",allowFlagging:false,allowReview:false}});
 const initial=startSession(bundle.paper,3000);
 assert.equal(transition(bundle.paper,initial,{type:"PAUSE",nowMs:3001}).status,"running");
 const moved=transition(bundle.paper,initial,{type:"NAVIGATE",nowMs:3010,sectionIndex:0,questionIndex:2});
 assert.equal(moved.questionIndex,2);
 assert.equal(transition(bundle.paper,moved,{type:"NAVIGATE",nowMs:3011,sectionIndex:0,questionIndex:0}).questionIndex,2);
 const flagRejected=transition(bundle.paper,moved,{type:"FLAG",nowMs:3011,flagged:true});
 assert.ok(flagRejected.responses.every(row=>!row.flagged),"Disabled flag event created a flag");
 const rebased=transition(bundle.paper,moved,{type:"TICK",nowMs:2000});
 assert.equal(rebased.clockMs,2000);
 assert.equal(rebased.elapsedMs,moved.elapsedMs);
 assert.equal(transition(bundle.paper,rebased,{type:"TICK",nowMs:2100}).elapsedMs,moved.elapsedMs+100);
});
test("all four attempt modes are pinned with their actual CGL policy or custom package",()=>{
 const cgl=builtins.find(p=>p.paper.edition==="reviewed");
 for(const [mode,expected] of [["strict","exam-simulation"],["free","full-paper-practice"],["single","section-practice"]]){
  const configured=configureCglPractice(cgl,mode,0);
  const a=startGenericAttempt(configured,mode,1000);
  assert.equal(a.frozen.snapshot.mode,expected);
  validateGenericStoredRecord(a);
 }
 const custom=startGenericAttempt(pkg,"custom",1000);
 assert.equal(custom.frozen.snapshot.mode,"custom-practice");
});
test("built-in source page and independently supplied references survive reviewed import",()=>{
 const source=Object.values(sources)[0];
 const built=builtins.find(p=>p.paper.paperId===source.id&&p.paper.edition==="source");
 const first=source.questions[0];
 const q=built.questions.find(q=>q.questionId.endsWith(":q:"+first.n));
 assert.equal(q.editorial.sourcePage,first.sourcePage);
 assert.deepEqual(q.editorial.sources??[],first.sources??[]);
 const withSources=source.questions.find(q=>q.sources?.length);
 if(withSources){
  const candidate=built.questions.find(q=>q.questionId.endsWith(":q:"+withSources.n));
  assert.deepEqual(candidate.editorial.sources,withSources.sources);
 }
});
test("written response can be explicitly self-assessed without modifying frozen automated results",()=>{
 const bundle=validateExamPackage(pkg);
 let a=startGenericAttempt(bundle,"essay",1000);
 const qm=new Map(bundle.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"NAVIGATE",nowMs:1010,sectionIndex:1,questionIndex:2},qm);
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1011,response:{kind:"free-response",text:"I explain the reasons."}},qm);
 a=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1020},qm);
 const original=structuredClone(a.result);
 assert.equal(a.result.items.at(-1).verdict,"pending");
 const marked=setManualGrade(a,bundle.questions[5].id,1.5,"Reasoning is plausible",new Date(1500).toISOString());
 assert.deepEqual(marked.result,original);
 assert.equal(manualGradeSummary(marked).total,1.5);
 assert.equal(manualGradeSummary(marked).graded,1);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(marked))).manualGrades[0].marks,1.5);
 assert.throws(()=>setManualGrade(marked,bundle.questions[5].id,99,"",new Date(2000).toISOString()),/Invalid manual grade/);
 assert.throws(()=>validateManualGrades({...marked,manualGrades:[...marked.manualGrades,...marked.manualGrades]}),/invalid manual grade/i);
 assert.throws(()=>setManualGrade(marked,bundle.questions[0].id,1,"",new Date(2000).toISOString()),/pending written responses/);
 assert.throws(()=>setManualGrade(startGenericAttempt(bundle,"open",2000),bundle.questions[5].id,1,"",new Date(2001).toISOString()),/pending written responses/);
});

test("source-key comparison pins original answer references independently of reviewed revisions",()=>{
 const reviewed=builtins.find(p=>p.paper.edition==="reviewed");
 const source=builtins.find(p=>p.paper.paperId===reviewed.paper.paperId&&p.paper.edition==="source");
 const original=createSourceKeyReference(reviewed,source);
 assert.equal(original.entries.length,100);
 let a=startGenericAttempt(reviewed,"original-vs-reviewed",1000);
 a={...a,sourceKeyReference:original};
 validateSourceKeyReference(a);
 assert.equal(sourceKeyScore(a),null,"Never compare an active attempt");
 const qm=new Map(reviewed.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:1001,
   response:{kind:"single-choice",optionId:reviewed.questions[0].content.options[0].id}},qm);
 for(let i=0;i<4;i++)a=transitionGenericAttempt(a,{type:"SUBMIT_SECTION",nowMs:1010+i},qm);
 const comparison=sourceKeyScore(a);
 assert.equal(comparison.correct+comparison.incorrect+comparison.unanswered,comparison.comparable);
 assert.equal(comparison.comparable+comparison.unavailable,100);
 assert.ok(comparison.unavailable>0);
 assert.equal(comparison.maxMarks,2*comparison.comparable);
 assert.equal(validateGenericStoredRecord(JSON.parse(JSON.stringify(a))).sourceKeyReference.contentHash,original.contentHash);
 const malicious=structuredClone(a);
 malicious.sourceKeyReference.entries[0].originalOptionId="tampered";
 assert.throws(()=>validateGenericStoredRecord(malicious),/source-key reference hash mismatch/);
 const single=configureCglPractice(reviewed,"single",2);
 const singleRef=createSourceKeyReference(single,source);
 assert.equal(singleRef.entries.length,25);
 assert.equal(createSourceKeyReference(pkg,source),null);
});
test("draft and editorial-unsafe questions are excluded rather than treated as correct",()=>{
 const reviewed=builtins.find(p=>p.paper.edition==="reviewed");
 const q=reviewed.questions[0];
 const draft={...q,editorial:{...q.editorial,status:"draft"}};
 const paper={...reviewed.paper,sections:[{...reviewed.paper.sections[0],questionRevisionIds:[q.id]}],
   timing:{kind:"untimed"}};
 const score=scoreAttempt(paper,reviewed.answerKey,[draft],[
  {questionRevisionId:q.id,response:{kind:"single-choice",optionId:reviewed.answerKey.entries[0].answer.optionId},
   timeSpentMs:0,flagged:false,answerChangeCount:0}
 ],new Date(1000).toISOString());
 assert.deepEqual(score.items.map(x=>x.verdict),["excluded"]);
 assert.equal(score.snapshot.earnedMarks,0);
});

test("live timer uses nondecreasing monotonic elapsed time even if wall clock moves",()=>{
 let mono=100;
 const clock=createSessionClock(10000,100,()=>mono);
 assert.equal(clock(),10000);
 mono=110;assert.equal(clock(),10010);
 mono=105;assert.equal(clock(),10010,"A backwards sample must never reverse the timer");
 mono=130;assert.equal(clock(),10030);
 const paper={...pkg.paper,timing:{kind:"whole-paper",durationMs:40,pausePolicy:"forbidden"}};
 const initial=startSession(paper,10000);
 const after=transition(paper,initial,{type:"TICK",nowMs:clock()});
 assert.equal(after.elapsedMs,30);
 mono=145;
 assert.equal(transition(paper,after,{type:"TICK",nowMs:clock()}).status,"completed");
});
}

// === Legacy suite: tests/exam-preflight-and-policy-disclosure.test.mjs — 7 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const pkg = __suite_dep_3["pkg"];
const questions = __suite_dep_3["questions"];
const builtinCglPackages = __suite_dep_5["builtinCglPackages"];
const configureCglPractice = __suite_dep_5["configureCglPractice"];
const validateExamPackage = __suite_dep_5["validateExamPackage"];
const examPreflight = __suite_dep_12["examPreflight"];
const preflightHTML = __suite_dep_12["preflightHTML"];
const examRulesHTML = __suite_dep_12["examRulesHTML"];
const scoreableMaximum = __suite_dep_13["scoreableMaximum"];
const paperRevisionHash = __suite_dep_4["paperRevisionHash"];
const answerKeyRevisionHash = __suite_dep_4["answerKeyRevisionHash"];
const source=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const cgl=builtinCglPackages(source,patches);
const reviewed=cgl.find(p=>p.paper.edition==="reviewed");
const original=cgl.find(p=>p.paper.edition==="source");
assert.ok(reviewed&&original);
const model=(bundle,builtinCgl=false)=>examPreflight(bundle,{builtinCgl,
 reviewedPatchCount:Object.keys(patches[bundle.paper.paperId]??{}).length});

test("F02: reviewed CGL strict, free, single are calculated on their actual executable policy",()=>{
 const strict=configureCglPractice(reviewed,"strict");
 const free=configureCglPractice(reviewed,"free");
 const single=configureCglPractice(reviewed,"single",2);
 for(const p of [strict,free,single]){
  const x=model(p,true);
  assert.equal(x.maximum,scoreableMaximum(p.paper,p.answerKey,p.questions));
  assert.equal(x.eligibleQuestions+x.excludedQuestions+x.manualQuestions,x.totalQuestions);
  assert.equal(x.ruleSummary,"Correct +2 · Incorrect -0.5 · Unanswered 0");
  assert.equal(x.eligibleQuestions*2,x.maximum);
  assert.equal(x.decimals,2);
 }
 assert.equal(model(strict,true).maximum,200);
 assert.equal(model(free,true).maximum,200);
 assert.equal(model(single,true).maximum,50);
 assert.equal(model(single,true).totalQuestions,25);
 assert.equal(strict.paper.timing.kind,"sectional");
 assert.equal(strict.paper.timing.transition,"automatic");
 assert.match(model(strict,true).timingRules.join(" "),/15 min/);
 assert.match(model(strict,true).timingRules.join(" "),/Unused minutes do not carry/);
 assert.match(model(free,true).timingRules.join(" "),/One shared 60 min paper timer/);
 assert.doesNotMatch(model(free,true).timingRules.join(" "),/Unused minutes do not carry/);
 assert.match(model(free,true).timingRules.join(" "),/Pause control is available/);
 assert.match(model(strict,true).timingRules.join(" "),/Pausing the timer is not permitted/);
});

test("F02/F15: source edition reports excluded publisher items; reviewed is scoreable caution, not official SSC",()=>{
 const x=model(original,true),y=model(reviewed,true);
 assert.ok(x.excludedQuestions>0,"Source edition should count genuine unscoreable original defects");
 assert.equal(x.maximum,scoreableMaximum(original.paper,original.answerKey,original.questions));
 assert.ok(x.maximum<200);
 assert.equal(y.excludedQuestions,0);
 assert.ok(y.correctedQuestions>0,"Reviewed paper contains independently corrected items");
 const disputed=cgl.find(p=>p.paper.edition==="reviewed"&&p.paper.paperId==="cgl-2026-10-06");
 assert.ok(disputed);
 assert.ok(model(disputed,true).cautionQuestions>0,
   "Disputed reviewed 6 October questions retain editorial caution rather than being silently excluded");
 assert.equal(y.cautionQuestions,reviewed.questions.filter(q=>q.editorial.status==="caution").length);
 assert.equal(y.patchCount,Object.keys(patches[reviewed.paper.paperId]??{}).length);
 assert.ok(y.patchCount>0);
 assert.match(x.provenance,/publisher-provided/);
 assert.match(x.provenance,/not an SSC-operated/);
 assert.match(y.provenance,/independent educational corrections/);
 assert.match(y.provenance,/not official SSC answer keys/);
 assert.doesNotMatch(preflightHTML(y),/correct option is|answer is A|Q62.+B/i);
 assert.match(preflightHTML(x),/excluded/);
 assert.match(preflightHTML(y),/reviewed changes/);
});

test("F02: a custom exam uses frozen eligible max and plainly labels manual questions",()=>{
 const b=validateExamPackage(pkg),x=model(b);
 assert.equal(x.maximum,10);
 assert.equal(x.totalQuestions,6);
 assert.equal(x.eligibleQuestions,5);
 assert.equal(x.manualQuestions,1);
 assert.equal(x.excludedQuestions,0);
 assert.equal(x.patchCount,null);
 assert.equal(x.builtinCgl,false);
 assert.match(x.provenance,/author\/importer/);
 assert.doesNotMatch(x.provenance,/SSC/);
 const html=preflightHTML(x);
 assert.match(html,/10.00/);
 assert.match(html,/1 manual-response/);
 assert.match(html,/Marking/);
 assert.doesNotMatch(html,/rev-0|optionId|question-0/);
});

test("F02: effective per-item and per-section overrides are disclosed without key answers",()=>{
 const b=structuredClone(pkg);
 b.paper.sections[0].scoringOverride={correctMarks:3,incorrectMarks:-1,unansweredMarks:0};
 b.answerKey.entries[0].scoringOverride={correctMarks:5,incorrectMarks:-2,unansweredMarks:0};
 b.paper.scoring.byQuestionKind={"true-false":{correctMarks:1,incorrectMarks:0,unansweredMarks:0}};
 // Preflight operates on the exact selected rule+key; testing direct data does
 // not mutate the immutable source fixture or its published content hashes.
 const x=model(b);
 assert.equal(x.maximum,5+3+3+1+2);
 assert.equal(x.hasVariableRules,true);
 assert.match(x.ruleSummary,/Marking varies by question/);
 assert.match(x.ruleSummary,/\+1 to \+5/);
 assert.match(x.ruleSummary,/-2 to 0/);
 assert.doesNotMatch(preflightHTML(x),/Alpha|Beta|optionId/);
});

test("F02: a paper with only manually graded and excluded items never invents an automated maximum",()=>{
 const b=structuredClone(pkg);
 for(let i=0;i<5;i++)b.questions[i].editorial.status="invalid";
 const x=model(b);
 assert.equal(x.maximum,0);
 assert.equal(x.eligibleQuestions,0);
 assert.equal(x.excludedQuestions,5);
 assert.equal(x.manualQuestions,1);
 assert.match(x.ruleSummary,/No automatically scoreable questions/);
 assert.match(preflightHTML(x),/0.00/);
});

test("F06: generic timing/section, forward navigation, review and pause policies are explained",()=>{
 const b=structuredClone(pkg);
 b.paper.navigation={questionNavigation:"forward-only",sectionNavigation:"sequential-locked",
  allowFlagging:false,allowReview:false};
 b.paper.timing={kind:"sectional",transition:"manual",allowEarlySubmit:false,
  pausePolicy:"allowed",sectionLimits:[{sectionId:"s1",durationMs:60000},{sectionId:"s2",durationMs:null}]};
 const x=model(b),text=examRulesHTML(x);
 assert.match(text,/Independent section timers/);
 assert.match(text,/until you select Continue/);
 assert.match(text,/waiting does not consume/);
 assert.match(text,/cannot be submitted before/);
 assert.match(text,/forward-only/);
 assert.match(text,/flagging is disabled/);
 assert.match(text,/detailed answer-key\/solution review is withheld/);
 assert.match(text,/Checksum|checksum/);
 assert.match(text,/A–D/);
 assert.match(text,/Enter and Space/);
 assert.doesNotMatch(text,/15-minute sections/);
 const untimed=structuredClone(pkg);untimed.paper.timing={kind:"untimed"};
 assert.match(examRulesHTML(model(untimed)),/Untimed practice/);
 assert.doesNotMatch(examRulesHTML(model(untimed)),/Pausing the timer is not permitted/);
});

test("F15: independently imported editions cannot inherit built-in SSC provenance",()=>{
 const sourceBundle=structuredClone(pkg);
 sourceBundle.paper={...sourceBundle.paper,id:sourceBundle.paper.id+":source",edition:"source"};
 sourceBundle.paper.contentHash=paperRevisionHash(sourceBundle.paper);
 const reviewedBundle=structuredClone(pkg);
 reviewedBundle.answerKey={...reviewedBundle.answerKey,id:reviewedBundle.answerKey.id+":reviewed"};
 reviewedBundle.paper={...reviewedBundle.paper,id:reviewedBundle.paper.id+":reviewed",
  edition:"reviewed",answerKeyRevisionId:reviewedBundle.answerKey.id,
  sourcePaperRevisionId:sourceBundle.paper.id,sourceAnswerKeyRevisionId:sourceBundle.answerKey.id};
 reviewedBundle.paper.contentHash=paperRevisionHash(reviewedBundle.paper);
 for(const b of [sourceBundle,reviewedBundle]){
  const x=model(b);
  assert.equal(x.builtinCgl,false);
  assert.equal(x.patchCount,null);
  assert.match(x.provenance,/supplied/);
  assert.doesNotMatch(x.provenance,/SSC/);
  assert.doesNotMatch(x.provenance,/independent educational corrections/);
 }
});
}

// === Legacy suite: tests/scoring-and-section-policy.test.mjs — 12 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_3["pkg"];
const questions = __suite_dep_3["questions"];
const answers = __suite_dep_3["answers"];
const validateAnswerKeyRevision = __suite_dep_14["validateAnswerKeyRevision"];
const validatePaperRevision = __suite_dep_14["validatePaperRevision"];
const paperRevisionHash = __suite_dep_4["paperRevisionHash"];
const answerKeyRevisionHash = __suite_dep_4["answerKeyRevisionHash"];
const startSession = __suite_dep_7["startSession"];
const transition = __suite_dep_7["transition"];
const scoreAttempt = __suite_dep_10["scoreAttempt"];
const scoreableMaximum = __suite_dep_13["scoreableMaximum"];
const scoreableLowerBound = __suite_dep_13["scoreableLowerBound"];
const scoreableBounds = __suite_dep_13["scoreableBounds"];
const validateExamPackage = __suite_dep_5["validateExamPackage"];
const startGenericAttempt = __suite_dep_5["startGenericAttempt"];
const transitionGenericAttempt = __suite_dep_5["transitionGenericAttempt"];
const validateGenericStoredRecord = __suite_dep_6_stored_record_validator["validateGenericStoredRecord"];
const renderModelExam = __suite_dep_6_exam_view["renderModelExam"];
const resultTabsHTML = __suite_dep_15["resultTabsHTML"];
const restoreSession = __suite_dep_16["restoreSession"];
const evt=(type,nowMs,rest={})=>({type,nowMs,...rest});
const bundleWith=(changes)=>{
 const base={...pkg.paper,...changes,
  navigation:changes.timing?.kind==="sectional"?
    {...pkg.paper.navigation,sectionNavigation:"sequential-locked",...changes.navigation}:
    changes.navigation??pkg.paper.navigation};
 return validateExamPackage({...pkg,paper:{...base,contentHash:paperRevisionHash(base)}});
};
const lookup=new Map(questions.map(q=>[q.id,q]));
const keyWith=(entries)=>({...pkg.answerKey,entries,contentHash:answerKeyRevisionHash({entries})});

test("G01: whole-paper locked sections have explicit one-way progress and cannot submit unseen later sections",()=>{
 const bundle=bundleWith({navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
 let a=startGenericAttempt(bundle,"locked",1000);
 assert.match(renderModelExam(a,bundle),/Finish section →/);
 a=transitionGenericAttempt(a,evt("NAVIGATE",1001,{sectionIndex:1,questionIndex:0}),lookup);
 assert.equal(a.state.sectionIndex,0);
 a=transitionGenericAttempt(a,evt("SUBMIT_ATTEMPT",1002),lookup);
 assert.equal(a.state.status,"running");
 a=transitionGenericAttempt(a,evt("SUBMIT_SECTION",1100),lookup);
 assert.equal(a.state.sectionIndex,1);
 assert.deepEqual(a.state.completedSections,[0]);
 assert.equal(a.state.elapsedMs,100);
 assert.equal(a.state.sectionElapsedMs,0);
 a=transitionGenericAttempt(a,evt("NAVIGATE",1101,{sectionIndex:0,questionIndex:0}),lookup);
 assert.equal(a.state.sectionIndex,1);
 a=transitionGenericAttempt(a,evt("SUBMIT_ATTEMPT",1150),lookup);
 assert.equal(a.state.status,"completed");
 assert.equal(a.state.elapsedMs,150);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("G01: untimed sequentially locked sections are reachable but cannot be skipped",()=>{
 const b=bundleWith({timing:{kind:"untimed"},navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
 let a=startGenericAttempt(b,"untimed-locked",1000);
 assert.match(renderModelExam(a,b),/Finish section →/);
 a=transitionGenericAttempt(a,evt("SUBMIT_ATTEMPT",1010),lookup);
 assert.equal(a.state.status,"running");
 a=transitionGenericAttempt(a,evt("SUBMIT_SECTION",1020),lookup);
 assert.equal(a.state.sectionIndex,1);
 a=transitionGenericAttempt(a,evt("SUBMIT_ATTEMPT",1030),lookup);
 assert.equal(a.state.status,"completed");
});

test("G01/G02: sectional clocks reject a contradictory free section-navigation promise",()=>{
 const base={...pkg.paper,timing:{kind:"sectional",transition:"automatic",allowEarlySubmit:true,pausePolicy:"allowed",
  sectionLimits:[{sectionId:"s1",durationMs:100},{sectionId:"s2",durationMs:200}]}};
 assert.throws(()=>validatePaperRevision(base,questions),/require sequential-locked/);
});

test("G01 adjacent: a whole-paper lock cannot bypass the global deadline",()=>{
 const bundle=bundleWith({timing:{kind:"whole-paper",durationMs:50,pausePolicy:"forbidden"},
  navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
 const ended=transition(bundle.paper,startSession(bundle.paper,100),evt("SUBMIT_SECTION",200));
 assert.equal(ended.status,"completed");
 assert.equal(ended.elapsedMs,50);
 assert.equal(ended.sectionIndex,0);
});

test("G02: manual expiry freezes answers and elapsed time until an explicit continuation",()=>{
 const bundle=bundleWith({timing:{kind:"sectional",transition:"manual",allowEarlySubmit:false,pausePolicy:"allowed",
  sectionLimits:[{sectionId:"s1",durationMs:100},{sectionId:"s2",durationMs:200}]}});
 let a=startGenericAttempt(bundle,"manual",1000);
 a=transitionGenericAttempt(a,evt("TICK",1150),lookup);
 assert.equal(a.state.status,"section-expired");
 assert.equal(a.state.elapsedMs,100);
 assert.equal(a.state.sectionIndex,0);
 assert.match(renderModelExam(a,bundle),/Answers are locked/);
 assert.match(renderModelExam(a,bundle),/Continue to next section/);
 assert.match(renderModelExam(a,bundle),/id="g-flag"[^>]*disabled/,"Expired boundary must not present an active but inert flag button");
 assert.doesNotMatch(renderModelExam(a,bundle),/id="g-submit" disabled/);
 a=transitionGenericAttempt(a,evt("ANSWER",1250,{response:{kind:"single-choice",optionId:"a"}}),lookup);
 assert.equal(a.state.responses.length,1,"Expired question time record remains, but the answer must not change");
 assert.equal(a.state.responses[0].response,undefined);
 a=transitionGenericAttempt(a,evt("NAVIGATE",1300,{sectionIndex:0,questionIndex:1}),lookup);
 assert.equal(a.state.questionIndex,0);
 a=transitionGenericAttempt(a,evt("TICK",2500),lookup);
 assert.equal(a.state.elapsedMs,100);
 assert.equal(a.state.status,"section-expired");
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 const restored=restoreSession(bundle.paper,a.state,3500,true);
 assert.equal(restored.state.status,"section-expired");
 assert.equal(restored.state.elapsedMs,100);
 assert.equal(restored.expired,false);
 a=transitionGenericAttempt(a,evt("SUBMIT_SECTION",3500),lookup);
 assert.equal(a.state.status,"running");
 assert.equal(a.state.sectionIndex,1);
 assert.equal(a.state.elapsedMs,100);
 a=transitionGenericAttempt(a,evt("TICK",3800),lookup);
 assert.equal(a.state.status,"section-expired");
 assert.equal(a.state.elapsedMs,300);
 a=transitionGenericAttempt(a,evt("SUBMIT_SECTION",3900),lookup);
 assert.equal(a.state.status,"completed");
 assert.equal(a.result.snapshot.unansweredCount,6);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});



test("G02 extra: no-deadline sectional sections can always be finished explicitly",()=>{
 const b=bundleWith({timing:{kind:"sectional",transition:"automatic",allowEarlySubmit:false,pausePolicy:"forbidden",
  sectionLimits:[{sectionId:"s1",durationMs:null},{sectionId:"s2",durationMs:100}]}});
 let a=startGenericAttempt(b,"untimed-section",1000);
 assert.match(renderModelExam(a,b),/Finish untimed section/);
 a=transitionGenericAttempt(a,evt("SUBMIT_SECTION",1500),lookup);
 assert.equal(a.state.sectionIndex,1);
 assert.equal(a.state.status,"running");
 assert.equal(a.state.elapsedMs,500);
 a=transitionGenericAttempt(a,evt("TICK",1600),lookup);
 assert.equal(a.state.status,"completed");
 assert.equal(a.state.elapsedMs,600);
});

test("G04: imported multi-select key is constrained by actual candidate selection bounds",()=>{
 const k=pkg.answerKey.entries;
 const question=questions[1];
 const tight={...question,content:{...question.content,maxSelections:2}};
 const tooMany=[...k];tooMany[1]={...k[1],answer:{kind:"multiple-select",optionIds:["x","y","z"]}};
 assert.throws(()=>validateAnswerKeyRevision(keyWith(tooMany),[questions[0],tight,...questions.slice(2)]),/cardinality|selection bounds/);
 const tooFew=[...k];tooFew[1]={...k[1],answer:{kind:"multiple-select",optionIds:["x"]}};
 assert.throws(()=>validateAnswerKeyRevision(keyWith(tooFew),questions),/cardinality|selection bounds/);
 assert.doesNotThrow(()=>validateAnswerKeyRevision(pkg.answerKey,questions));
});

test("G05: imported matching keys cannot reuse left or right endpoints",()=>{
 const base=pkg.answerKey.entries;
 const mk=pairs=>{const entries=[...base];entries[4]={...base[4],answer:{kind:"matching",pairs}};return keyWith(entries);};
 assert.throws(()=>validateAnswerKeyRevision(mk([{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]),questions),/duplicate identifier/);
 assert.throws(()=>validateAnswerKeyRevision(mk([{leftId:"l1",rightId:"r1"},{leftId:"l1",rightId:"r2"}]),questions),/duplicate identifier/);
 assert.throws(()=>validateAnswerKeyRevision(mk([]),questions),/at least one pair/);
 assert.doesNotThrow(()=>validateAnswerKeyRevision(pkg.answerKey,questions));
});

test("G03/G09: blank reward cannot exceed correct; worse-than-wrong blank is rejected across overrides",()=>{
 const rule=(unansweredMarks)=>({correctMarks:2,incorrectMarks:-0.5,unansweredMarks});
 for(const marks of [3,-3]){
   assert.throws(()=>validatePaperRevision({...pkg.paper,scoring:{defaultRule:rule(marks)}},questions),
     /unansweredMarks/);
   assert.throws(()=>validatePaperRevision({...pkg.paper,sections:[
     {...pkg.paper.sections[0],scoringOverride:rule(marks)},pkg.paper.sections[1]]},questions),
     /unansweredMarks/);
   assert.throws(()=>validateAnswerKeyRevision(keyWith([
     {...pkg.answerKey.entries[0],scoringOverride:rule(marks)},...pkg.answerKey.entries.slice(1)]),questions),
     /unansweredMarks/);
 }
 const under={...pkg.paper,scoring:{defaultRule:rule(-0.25)}};
 assert.doesNotThrow(()=>validatePaperRevision(under,questions));
});

test("G09: unusual partial penalties have honest conservative lower bound and capped full maximum",()=>{
 const part={correctMarks:2,incorrectMarks:-0.5,unansweredMarks:-0.25,
   partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:40,penaltyPerIncorrectComponent:4}};
 const changed={...pkg.paper,scoring:{defaultRule:part}};
 validatePaperRevision(changed,questions);
 assert.equal(scoreableMaximum(changed,pkg.answerKey,questions),10);
 const floor=scoreableLowerBound(changed,pkg.answerKey,questions);
 assert.ok(floor<=-8,"Conservative bound must account for multiple wrong components");
 const result=scoreAttempt(changed,pkg.answerKey,questions,[
  {questionRevisionId:questions[1].id,response:{kind:"multiple-select",optionIds:["x","y"]}}],new Date(1000).toISOString());
 assert.equal(result.items[1].marks,2,"Partially correct answer cannot exceed full credit");
 assert.ok(result.snapshot.earnedMarks<=scoreableBounds(changed,pkg.answerKey,questions).maximum);
 assert.ok(result.snapshot.earnedMarks>=floor);
 const harsh={...pkg.paper,scoring:{defaultRule:{...part,partialCredit:{...part.partialCredit,penaltyPerIncorrectComponent:1e20}}}};
 assert.throws(()=>validatePaperRevision(harsh,questions),/1000000/);
});

test("G06: withholding detailed post-test review does not disable exam navigation or summary/timing tabs",()=>{
 const b=bundleWith({navigation:{...pkg.paper.navigation,allowReview:false}});
 let a=startGenericAttempt(b,"blind",1000);
 a=transitionGenericAttempt(a,evt("NAVIGATE",1001,{sectionIndex:1,questionIndex:0}),lookup);
 assert.equal(a.state.sectionIndex,1,"Review-release policy must not alter exam navigation");
 a=transitionGenericAttempt(a,evt("SUBMIT_ATTEMPT",1100),lookup);
 assert.equal(a.state.status,"completed");
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 const noAnswers=resultTabsHTML("overview",false);
 assert.doesNotMatch(noAnswers,/data-result-tab="review"/);
 assert.match(noAnswers,/data-result-tab="timing"/);
 assert.match(resultTabsHTML("overview",true),/data-result-tab="review"/);
});
}

// === Legacy suite: tests/scoring-property-model.test.mjs — 6 unchanged test registrations ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const scoreAttempt = __suite_dep_10["scoreAttempt"];
const scoreableBounds = __suite_dep_13["scoreableBounds"];
const scoreableMaximum = __suite_dep_13["scoreableMaximum"];
const scoreableLowerBound = __suite_dep_13["scoreableLowerBound"];
const pkg = __suite_dep_3["pkg"];
const questions = __suite_dep_3["questions"];
// Self-contained reference arithmetic: no production scoring/ceiling helper is used
// to calculate any expected answer. Seed, policy and case index survive test failures.
function rng(seed){
 let x=seed>>>0;
 return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
function approx(actual,expected,label){
 assert.ok(Number.isFinite(actual)&&Number.isFinite(expected),label+": finite operands");
 assert.ok(Math.abs(actual-expected)<=1e-9*Math.max(1,Math.abs(expected),Math.abs(actual)),
  label+": expected "+expected+"; got "+actual);
}
const policies=[
 {correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0},
 {correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0},
 {correctMarks:4,incorrectMarks:-1,unansweredMarks:-0.25},
 {correctMarks:5,incorrectMarks:-2,unansweredMarks:-1},
 {correctMarks:1.25,incorrectMarks:-0.75,unansweredMarks:0},
];

test("seeded independent scoring reference: precedence, marks ledger, verdicts, exclusions and bounds",()=>{
 for(let seed=1;seed<=200;seed++){
  const random=rng(0x36b00b^seed);
  const sections=[],entries=[],qs=[],responses=[],expected=[];
  const defaultRule=policies[random(policies.length)];
  const byKind= random(2)?{ "single-choice":policies[random(policies.length)] }:{};
  const sectionCount=1+random(4);
  for(let s=0;s<sectionCount;s++){
   const scoringOverride=random(3)===0?policies[random(policies.length)]:undefined;
   const section={id:"s"+s,questionRevisionIds:[],...(scoringOverride?{scoringOverride}:{})};
   sections.push(section);
   const n=1+random(10);
   for(let i=0;i<n;i++){
    const id="q"+s+"-"+i;
    const status=random(9)===0?"invalid":random(8)===0?"under-review":random(5)===0?"caution":"verified";
    const question={id,editorial:{status},content:{kind:"single-choice",prompt:"Reference question",options:[
     {id:"a",text:"A"},{id:"b",text:"B"}]}};
    qs.push(question);section.questionRevisionIds.push(id);
    const entryOverride=random(4)===0?policies[random(policies.length)]:undefined;
    entries.push({questionRevisionId:id,answer:{kind:"single-choice",optionId:"a"},
     ...(entryOverride?{scoringOverride:entryOverride}:{})});
    const rule=entryOverride??scoringOverride??byKind["single-choice"]??defaultRule;
    const choice=random(3);
    if(choice!==2)responses.push({questionRevisionId:id,response:{kind:"single-choice",optionId:choice===0?"a":"b"}});
    const verdict=["invalid","under-review"].includes(status)?"excluded":
      choice===2?"unanswered":choice===0?"correct":"incorrect";
    const marks=verdict==="excluded"?0:verdict==="unanswered"?rule.unansweredMarks:
      verdict==="correct"?rule.correctMarks:rule.incorrectMarks;
    expected.push({id,verdict,marks,rule});
   }
  }
  const paper={id:"pr",paperId:"p",answerKeyRevisionId:"key",sections,
   scoring:{defaultRule,byQuestionKind:byKind}};
  const key={id:"key",paperId:"p",entries};
  const result=scoreAttempt(paper,key,qs,responses,"2026-11-01T00:00:00Z");
  const eligible=expected.filter(x=>x.verdict!=="excluded");
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  const expectedMarks=sum(expected.map(x=>x.marks));
  const positive=sum(expected.map(x=>Math.max(0,x.marks)));
  const penalties=sum(expected.map(x=>Math.max(0,-x.marks)));
  const ceiling=sum(eligible.map(x=>x.rule.correctMarks));
  const lower=sum(eligible.map(x=>Math.min(x.rule.correctMarks,x.rule.incorrectMarks,x.rule.unansweredMarks)));
  assert.equal(result.items.length,expected.length,"seed="+seed);
  for(let i=0;i<expected.length;i++){
   assert.equal(result.items[i].questionRevisionId,expected[i].id,"seed="+seed+" item="+i+" id");
   assert.equal(result.items[i].verdict,expected[i].verdict,"seed="+seed+" item="+i+" verdict");
   approx(result.items[i].marks,expected[i].marks,"seed="+seed+" item="+i+" policy");
  }
  const snap=result.snapshot;
  approx(snap.earnedMarks,expectedMarks,"seed="+seed+" earned");
  approx(snap.positiveMarks,positive,"seed="+seed+" positive");
  approx(snap.penaltyMarks,penalties,"seed="+seed+" penalties");
  approx(snap.earnedMarks,snap.positiveMarks-snap.penaltyMarks,"seed="+seed+" ledger identity");
  approx(snap.earnedMarks,sum(result.items.map(x=>x.marks)),"seed="+seed+" items identity");
  for(const [verdict,name] of [["correct","correctCount"],["incorrect","incorrectCount"],
   ["unanswered","unansweredCount"],["excluded","excludedCount"]]){
   assert.equal(snap[name],expected.filter(x=>x.verdict===verdict).length,"seed="+seed+" "+name);
  }
  const bounds=scoreableBounds(paper,key,qs);
  approx(bounds.maximum,ceiling,"seed="+seed+" maximum");
  approx(bounds.lowerBound,lower,"seed="+seed+" lower bound");
  approx(scoreableMaximum(paper,key,qs),ceiling,"seed="+seed+" direct max");
  approx(scoreableLowerBound(paper,key,qs),lower,"seed="+seed+" direct floor");
  assert.ok(snap.earnedMarks>=bounds.lowerBound-1e-8&&snap.earnedMarks<=bounds.maximum+1e-8,
    "seed="+seed+" result outside declared bounds");
  for(const section of sections){
   const its=eligible.filter(x=>section.questionRevisionIds.includes(x.id));
   approx(scoreableMaximum(paper,key,qs,section),sum(its.map(x=>x.rule.correctMarks)),
    "seed="+seed+" section="+section.id);
  }
 }
});



/** Cross-kind property: independently calculate the six original verdicts,
 * then bijectively rename all candidate/key IDs and reorder *input arrays*.
 * Unlike the legacy scorer's 200-seed policy model, this exercises all kinds.
 */
test("P61-H six-kind independent ledger survives answer-ID bijections and input permutations",()=>{
 const stamp="2026-11-08T00:00:00Z";
 const relabel={
  a:"alpha",b:"beta",x:"xi",y:"upsilon",z:"zeta",
  l1:"left-first",l2:"left-second",r1:"right-first",r2:"right-second"
 };
 const mapId=id=>relabel[id]??id;
 const rename=value=>{
  switch(value.kind){
   case "single-choice":return {...value,optionId:mapId(value.optionId)};
   case "multiple-select":return {...value,optionIds:value.optionIds.map(mapId)};
   case "matching":return {...value,pairs:value.pairs.map(pair=>({
    leftId:mapId(pair.leftId),rightId:mapId(pair.rightId)}))};
   default:return {...value};
  }
 };
 const renamedQuestions=questions.map(q=>{
  const content=q.content;
  if(content.kind==="single-choice"||content.kind==="multiple-select")
   return {...q,content:{...content,options:content.options.map(o=>({...o,id:mapId(o.id)}))}};
  if(content.kind==="matching")
   return {...q,content:{...content,
    leftItems:content.leftItems.map(o=>({...o,id:mapId(o.id)})),
    rightItems:content.rightItems.map(o=>({...o,id:mapId(o.id)}))}};
  return structuredClone(q);
 });
 const renamedKey={...pkg.answerKey,entries:pkg.answerKey.entries.map(e=>({
  ...e,answer:rename(e.answer)})).reverse()};
 for(let seed=1;seed<=128;seed++){
  const rand=rng(0x61a11^seed);
  const one=["a","b"][rand(2)];
  const multi=[["x","z"],["x","y"],["y","z"],["x","y","z"]][rand(4)];
  const number=[3.5,3.495,3.505,3.6][rand(4)];
  const bool=[true,false][rand(2)];
  const isMatch=rand(2)===0;
  const pairList=isMatch?
   [{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]:
   [{leftId:"l1",rightId:"r2"},{leftId:"l2",rightId:"r1"}];
  const raw=[
   {kind:"single-choice",optionId:one},
   {kind:"multiple-select",optionIds:multi},
   {kind:"numeric-entry",value:number},
   {kind:"true-false",value:bool},
   {kind:"matching",pairs:pairList},
   {kind:"free-response",text:"Candidate's independent explanation "+seed}
  ];
  const expected=[
   one==="a",multi.length===2&&multi.includes("x")&&multi.includes("z"),
   Math.abs(number-3.5)<=0.01,bool===true,isMatch
  ].map(ok=>ok?"correct":"incorrect").concat("pending");
  const responses=questions.map((q,i)=>({questionRevisionId:q.id,response:raw[i]}));
  const before=structuredClone(responses);
  const actual=scoreAttempt(pkg.paper,pkg.answerKey,questions,responses,stamp);
  const correct=expected.filter(x=>x==="correct").length;
  const wrong=expected.filter(x=>x==="incorrect").length;
  assert.deepEqual(actual.items.map(x=>x.verdict),expected,"seed="+seed+" verdict");
  for(let i=0;i<6;i++)approx(actual.items[i].marks,
   i===5?0:expected[i]==="correct"?2:-0.5,"seed="+seed+" item="+i);
  approx(actual.snapshot.earnedMarks,correct*2-wrong*0.5,"seed="+seed+" net");
  assert.equal(actual.snapshot.correctCount,correct,"seed="+seed+" correct");
  assert.equal(actual.snapshot.incorrectCount,wrong,"seed="+seed+" incorrect");
  assert.equal(actual.snapshot.unansweredCount,0,"seed="+seed+" blank");
  assert.equal(actual.items[5].verdict,"pending","seed="+seed+" manual");
  const transformed=responses.map(r=>({...r,response:rename(r.response)})).reverse();
  const mapped=scoreAttempt(pkg.paper,renamedKey,
   renamedQuestions.slice().reverse(),transformed,stamp);
  assert.deepEqual(mapped,actual,"seed="+seed+" simultaneous ID relabel/reorder changed grading");
  assert.deepEqual(responses,before,"seed="+seed+" scoring mutated candidate responses");
 }
});

test("partial-credit cap and conservative penalty floor hold under adversarial component rules",()=>{
 const section={id:"s",questionRevisionIds:["rev-1","rev-4"]};
 const options=[
  {questionRevisionId:"rev-1",response:{kind:"multiple-select",optionIds:["x","y"]}},
  {questionRevisionId:"rev-4",response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]}},
 ];
 for(const floorAtZero of [false,true]){
  for(let per=0;per<=20;per+=4){
   const rule={correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:per,
     penaltyPerIncorrectComponent:per+2,floorAtZero}};
   const paper={...pkg.paper,sections:[section],scoring:{defaultRule:rule}};
   const result=scoreAttempt(paper,pkg.answerKey,questions,options,"2026-11-01T00:00:00Z");
   const refMulti=Math.min(2,floorAtZero?Math.max(0,per-(per+2)):per-(per+2));
   const refMatching=Math.min(2,floorAtZero?Math.max(0,per):per);
   approx(result.items[0].marks,refMulti,"multi component reference per="+per);
   approx(result.items[1].marks,refMatching,"matching component reference per="+per);
   assert.ok(result.items.every(x=>x.marks<=2),"full-credit cap");
   const bounds=scoreableBounds(paper,pkg.answerKey,questions);
   assert.ok(result.snapshot.earnedMarks>=bounds.lowerBound-1e-8);
   assert.ok(result.snapshot.earnedMarks<=bounds.maximum+1e-8);
   approx(bounds.maximum,4,"full nominal ceiling");
  }
 }
});

test("numeric-entry uses max(absolute,relative × |accepted|) at exact binary boundaries",()=>{
 const question={...questions[2],content:{...questions[2].content,numericRules:{allowNegative:true}}};
 const paper={...pkg.paper,sections:[{id:"numeric",questionRevisionIds:[question.id]}],
  scoring:{defaultRule:{correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0}}};
 const entry={questionRevisionId:question.id,answer:{
  kind:"numeric-entry",acceptedValues:[-8,0,12],absoluteTolerance:0.25,relativeTolerance:0.25}};
 const key={...pkg.answerKey,entries:[entry]};
 const cases=[
  [-10,"correct"],[-6,"correct"],[-6+0.000001,"incorrect"],
  [-10-0.000001,"incorrect"],[0,"correct"],[0.25,"correct"],
  [0.2500001,"incorrect"],[-0.25,"correct"],[-0.2500001,"incorrect"],
  [9,"correct"],[15,"correct"],[15.000001,"incorrect"],
  [8.999999,"incorrect"],[NaN,"incorrect"],[Infinity,"incorrect"],
 ];
 for(const [value,verdict] of cases){
  const r=scoreAttempt(paper,key,[question],
   [{questionRevisionId:question.id,response:{kind:"numeric-entry",value}}],
   "2026-11-01T00:00:00Z");
  assert.equal(r.items[0].verdict,verdict,"candidate="+String(value));
  approx(r.items[0].marks,verdict==="correct"?2.5:-5/6,"candidate="+String(value));
 }
 const p2={...paper,scoring:{...paper.scoring,decimalPlaces:0}};
 const p3={...paper,scoring:{...paper.scoring,decimalPlaces:6}};
 const response=[{questionRevisionId:question.id,response:{kind:"numeric-entry",value:0.2500001}}];
 assert.equal(scoreAttempt(p2,key,[question],response,"T").snapshot.earnedMarks,
  scoreAttempt(p3,key,[question],response,"T").snapshot.earnedMarks);
});

test("APFC one-third deduction is accumulated unrounded, blanks score zero",()=>{
 const p={...pkg.paper,sections:[{id:"apfc",questionRevisionIds:Array.from({length:120},(_,i)=>"apfc-"+i)}],
  scoring:{defaultRule:{correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0,}}};
 const qs=p.sections[0].questionRevisionIds.map(id=>({
  id,editorial:{status:"verified"},content:{kind:"single-choice",prompt:"APFC",options:[
   {id:"A",text:"A"},{id:"B",text:"B"}]}}));
 const entries=qs.map(q=>({questionRevisionId:q.id,answer:{kind:"single-choice",optionId:"A"}}));
 const key={...pkg.answerKey,entries};
 const records=qs.slice(0,100).map((q,i)=>({questionRevisionId:q.id,
  response:{kind:"single-choice",optionId:i<60?"A":"B"}}));
 const r=scoreAttempt(p,key,qs,records,"T");
 const unrounded=60*2.5-40*(5/6);
 approx(r.snapshot.earnedMarks,unrounded,"APFC aggregate marks");
 assert.equal(r.snapshot.correctCount,60);
 assert.equal(r.snapshot.incorrectCount,40);
 assert.equal(r.snapshot.unansweredCount,20);
 approx(scoreableMaximum(p,key,qs),300,"APFC 120×2.5 working denominator");
 assert.ok(Math.abs(unrounded-(60*2.5-40*.83))>0.1,"do not round penalty per incorrect item");
});

test("negative-zero policy never creates phantom marks or a negative aggregate",()=>{
 const question={id:"zero-q",editorial:{status:"verified"},
  content:{kind:"single-choice",prompt:"Neg-zero",options:[{id:"a",text:"A"},{id:"b",text:"B"}]}};
 const paper={id:"pr",paperId:"p",answerKeyRevisionId:"key",
  sections:[{id:"s",questionRevisionIds:["zero-q"]}],
  scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0,unansweredMarks:0},decimalPlaces:2}};
 const key={id:"key",paperId:"p",entries:[
  {questionRevisionId:"zero-q",answer:{kind:"single-choice",optionId:"a"}}]};
 const result=scoreAttempt(paper,key,[question],[
  {questionRevisionId:"zero-q",response:{kind:"single-choice",optionId:"b"}}],"T");
 assert.equal(result.items[0].verdict,"incorrect");
 assert.equal(result.snapshot.earnedMarks,0);
 assert.equal(result.snapshot.positiveMarks,0);
 assert.equal(result.snapshot.penaltyMarks,0);
 assert.equal(result.snapshot.earnedMarks.toFixed(paper.scoring.decimalPlaces),"0.00");
 assert.ok(result.snapshot.earnedMarks<=scoreableMaximum(paper,key,[question]));
});
}

const testP41=__suite_dep_0.default,testAssert=__suite_dep_1.default;

testP41("source comparison refuses unchanged-letter identities when option meaning changes",async()=>{
 const papers=JSON.parse(await __suite_dep_2.readFile(new URL("../src/content/papers.json",import.meta.url)));
 const patches=JSON.parse(await __suite_dep_2.readFile(new URL("../src/content/patches.json",import.meta.url)));
 const all=__suite_dep_5.builtinCglPackages(papers,patches);
 let changes=0,correctTextChanges=0;
 for(const [paperId,modified] of Object.entries(patches)){
  const src=all.find(x=>x.paper.paperId===paperId&&x.paper.edition==="source");
  const reviewed=all.find(x=>x.paper.paperId===paperId&&x.paper.edition==="reviewed");
  const ref=__suite_dep_9.createSourceKeyReference(reviewed,src);
  for(const [number,patch] of Object.entries(modified)){
   const q=papers[paperId].questions.find(x=>x.n===Number(number));
   if(!patch.opts||patch.opts.every((text,i)=>text===q.opts[i]))continue;
   changes++;
   if(q.opts["abcd".indexOf(q.key)]!==patch.opts["abcd".indexOf(q.key)])correctTextChanges++;
   const reviewQuestion=reviewed.questions.find(x=>x.questionId.endsWith(":q:"+number));
   testAssert.equal(ref.entries.find(x=>x.questionRevisionId===reviewQuestion.id).comparable,false);
  }
 }
 testAssert.equal(changes,25);
 testAssert.equal(correctTextChanges,21);
});

const p41papers=JSON.parse(await __suite_dep_2.readFile(new URL("../src/content/papers.json",import.meta.url)));
const p41patches=JSON.parse(await __suite_dep_2.readFile(new URL("../src/content/patches.json",import.meta.url)));

testP41("publisher comparison preserves identical contexts but rejects reordered options and punctuation",()=>{
 const source=__suite_dep_5.builtinCglPackages(
  p41papers,p41patches).find(x=>x.paper.edition==="source");
 const same=structuredClone(source);
 same.answerKey={...same.answerKey,id:same.answerKey.id+":reviewed-test"};
 same.paper={...same.paper,id:same.paper.id+":reviewed-test",edition:"reviewed",
  answerKeyRevisionId:same.answerKey.id,sourcePaperRevisionId:source.paper.id,
  sourceAnswerKeyRevisionId:source.answerKey.id};
 same.paper.contentHash=__suite_dep_4.paperRevisionHash(same.paper);
 const original=__suite_dep_9.createSourceKeyReference(same,source);
 testAssert.ok(original.entries.every(x=>x.comparable));
 const changed=structuredClone(same);
 changed.questions[0].content.options.reverse();
 testAssert.equal(__suite_dep_9.createSourceKeyReference(changed,source).entries[0].comparable,false);
 const punct=structuredClone(same);
 punct.questions[0].content.prompt+=".";
 testAssert.equal(__suite_dep_9.createSourceKeyReference(punct,source).entries[0].comparable,false);
 const media=structuredClone(same);
 media.questions[0].content.assetIds=["unmatched-media"];
 testAssert.equal(__suite_dep_9.createSourceKeyReference(media,source).entries[0].comparable,false);
});

testP41("frozen source evidence rejects forged comparability and unsupported v1 snapshots",async()=>{
 const all=__suite_dep_5.builtinCglPackages(p41papers,p41patches);
 const source=all.find(x=>x.paper.paperId==="cgl-2026-10-05"&&x.paper.edition==="source");
 const revised=all.find(x=>x.paper.paperId==="cgl-2026-10-05"&&x.paper.edition==="reviewed");
 const ref=__suite_dep_9.createSourceKeyReference(revised,source);
 const attempt={...__suite_dep_5.startGenericAttempt(revised,"p41-legacy",1000),
   finishedAt:1100,sourceKeyReference:ref};
 const subtotal=__suite_dep_9.sourceKeyScore(attempt);
 testAssert.ok(subtotal.unavailable>0);
 testAssert.equal(subtotal.comparable+subtotal.unavailable,100);
 const hash=(await import("../src/domain/hash.ts")).hashJson;
 const forged=structuredClone(attempt);
 forged.sourceKeyReference.entries.find(x=>!x.comparable).comparable=true;
 const {contentHash:ignored,...core}=forged.sourceKeyReference;
 forged.sourceKeyReference.contentHash=hash(core);
 testAssert.throws(()=>__suite_dep_9.validateSourceKeyReference(forged),/semantic correspondence/);
 const legacyEntries=ref.entries.map(({questionRevisionId,originalOptionId,markingRule})=>
   ({questionRevisionId,originalOptionId,markingRule}));
 const legacyCore={schema:1,paperId:ref.paperId,
   sourcePaperRevisionId:ref.sourcePaperRevisionId,
   sourceAnswerKeyRevisionId:ref.sourceAnswerKeyRevisionId,entries:legacyEntries};
 const legacy={...attempt,sourceKeyReference:{...legacyCore,contentHash:hash(legacyCore)}};
 testAssert.throws(()=>__suite_dep_9.validateSourceKeyReference(legacy),
   /Invalid original source-key comparison/,
   "Clean-break app must reject unprovable old positional answer-key snapshots");
});
