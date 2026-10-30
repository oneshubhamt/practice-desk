import test from "node:test";
import assert from "node:assert/strict";
import { pkg, questions, answers } from "./fixtures/six-kinds.mjs";
import { validateAnswerKeyRevision, validatePaperRevision } from "../src/domain/validate.ts";
import { paperRevisionHash,answerKeyRevisionHash } from "../src/domain/integrity.ts";
import { startSession, transition } from "../src/engine/session.ts";
import { scoreAttempt } from "../src/engine/scoring.ts";
import { scoreableMaximum,scoreableLowerBound,scoreableBounds } from "../src/engine/score-ceiling.ts";
import { validateExamPackage,startGenericAttempt,transitionGenericAttempt } from "../src/app/exam-package.ts";
import { validateGenericStoredRecord,renderModelExam } from "../src/app/generic-ui.ts";
import { resultTabsHTML } from "../src/app/result-presentation.ts";
import { restoreSession } from "../src/history/frozen.ts";

const evt=(type,nowMs,rest={})=>({type,nowMs,...rest});
const bundleWith=(changes)=>{
 const base={...pkg.paper,...changes};
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
 assert.equal(a.result.snapshot.unansweredCount,5);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
});

test("G02 adjacent: automatic sectional expiry still advances across overshoot; early submission works",()=>{
 const b=bundleWith({timing:{kind:"sectional",transition:"automatic",allowEarlySubmit:true,pausePolicy:"forbidden",
  sectionLimits:[{sectionId:"s1",durationMs:100},{sectionId:"s2",durationMs:200}]}});
 let s=transition(b.paper,startSession(b.paper,0),evt("TICK",150));
 assert.equal(s.status,"running");
 assert.equal(s.sectionIndex,1);
 assert.equal(s.elapsedMs,150);
 s=transition(b.paper,s,evt("SUBMIT_SECTION",151));
 assert.equal(s.status,"completed");
 assert.equal(s.elapsedMs,151);
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
