import test from "node:test";
import assert from "node:assert/strict";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt,validateExamPackage} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {startSession,canNavigateToQuestion} from "../src/engine/session.ts";
import {findNextCandidateQuestion} from "../src/app/exam-navigation.ts";
import {
 emptyCandidateScratch,eliminatedOptionIdsForQuestion,setCandidateOptionEliminated
} from "../src/domain/candidate-scratch.ts";
import {renderModelExam} from "../src/app/exam-view.ts";

function response(questionRevisionId,response,flagged=false){
 return {questionRevisionId,response,flagged,timeSpentMs:0,answerChangeCount:0,
  firstVisitMs:0,postDeadlineMs:0,preFirstAnswerMs:0};
}
function flag(questionRevisionId){
 return {questionRevisionId,flagged:true,timeSpentMs:0,answerChangeCount:0,
  firstVisitMs:0,postDeadlineMs:0,preFirstAnswerMs:0};
}

test("option elimination is stable OptionId scratch state and cannot change the answer",()=>{
 const q=questions[0];
 let scratch=emptyCandidateScratch();
 scratch=setCandidateOptionEliminated(scratch,q,"b",true);
 assert.deepEqual(eliminatedOptionIdsForQuestion(scratch,q.id),["b"]);
 assert.equal(scratch.eliminations[0].optionIds.includes("a"),false,
  "display position must not own elimination identity");
 const same=setCandidateOptionEliminated(scratch,q,"b",true);
 assert.equal(same,scratch,"idempotent elimination should preserve the scratch object");
 scratch=setCandidateOptionEliminated(scratch,q,"b",false);
 assert.deepEqual(scratch.eliminations,[]);

 const bundle=validateExamPackage(pkg),lookup=new Map(bundle.questions.map(item=>[item.id,item]));
 const base=startGenericAttempt(bundle,"elim-score",1000);
 const eliminated={...base,candidateScratch:setCandidateOptionEliminated(base.candidateScratch,q,"b",true)};
 const answered=transitionGenericAttempt(eliminated,{type:"ANSWER",nowMs:1010,
  response:{kind:"single-choice",optionId:"a"}},lookup);
 assert.equal(answered.state.responses[0].response.optionId,"a");
 assert.deepEqual(eliminatedOptionIdsForQuestion(answered.candidateScratch,q.id),["b"]);
});

test("candidate elimination renders as a sibling control without disabling answer selection",()=>{
 const bundle=validateExamPackage(pkg);
 const attempt=startGenericAttempt(bundle,"elim-render",1000);
 const q=bundle.questions[0];
 const withScratch={...attempt,candidateScratch:setCandidateOptionEliminated(
  attempt.candidateScratch,q,"b",true)};
 const html=renderModelExam(withScratch,bundle);
 assert.match(html,/data-eliminate="b" aria-pressed="true" aria-label="Restore option B"/);
 assert.match(html,/data-choice="b"/);
 assert.doesNotMatch(html,/data-choice="b"[^>]* disabled/,
  "elimination is candidate scratch, not an answer-eligibility rule");
 assert.match(html,/generic-choice-action-row eliminated/);
});

test("next unanswered and next flagged follow authored order and may wrap only when legal",()=>{
 const paper=pkg.paper;
 const state={...startSession(paper,0),sectionIndex:0,questionIndex:1,responses:[
  response("rev-0",{kind:"single-choice",optionId:"a"}),
  response("rev-2",{kind:"numeric-entry",value:3.5}),
  flag("rev-3")
 ]};
 assert.deepEqual(findNextCandidateQuestion(paper,state,"unanswered"),{sectionIndex:1,questionIndex:0});
 assert.deepEqual(findNextCandidateQuestion(paper,state,"flagged"),{sectionIndex:1,questionIndex:0});

 const last={...state,sectionIndex:1,questionIndex:2};
 assert.deepEqual(findNextCandidateQuestion(paper,last,"unanswered"),{sectionIndex:0,questionIndex:1},
  "free navigation may wrap to an earlier legal unanswered question");
});

test("quick navigation cannot bypass forward-only, sequential section locks or completed sections",()=>{
 const forward={...pkg.paper,navigation:{...pkg.paper.navigation,questionNavigation:"forward-only"}};
 const atEnd={...startSession(forward,0),sectionIndex:1,questionIndex:2,responses:[
  response("rev-3",{kind:"true-false",value:true}),
  response("rev-4",{kind:"matching",pairs:[]})
 ]};
 assert.equal(findNextCandidateQuestion(forward,atEnd,"unanswered"),null,
  "forward-only quick navigation must never wrap backwards");
 assert.equal(canNavigateToQuestion(forward,atEnd,0,1),false);

 const locked={...pkg.paper,navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}};
 const lockedState={...startSession(locked,0),questionIndex:2,responses:[
  response("rev-0",{kind:"single-choice",optionId:"a"}),
  response("rev-1",{kind:"multiple-select",optionIds:["x","z"]}),
  flag("rev-3")
 ]};
 assert.equal(findNextCandidateQuestion(locked,lockedState,"flagged"),null,
  "a later-section flag must not bypass a sequential section lock");
 assert.equal(canNavigateToQuestion(locked,lockedState,1,0),false);

 const free=pkg.paper;
 const completed={...startSession(free,0),sectionIndex:1,questionIndex:2,completedSections:[0],
  responses:[flag("rev-0")]};
 assert.equal(findNextCandidateQuestion(free,completed,"flagged"),null,
  "quick navigation must not re-enter a completed section");
});

test("quick navigation is disabled when session state itself forbids movement",()=>{
 const paper=pkg.paper;
 for(const status of ["paused","section-expired","completed"]){
  const state={...startSession(paper,0),status,responses:[flag("rev-1")]};
  assert.equal(findNextCandidateQuestion(paper,state,"flagged"),null);
  assert.equal(canNavigateToQuestion(paper,state,0,1),false);
 }
});
