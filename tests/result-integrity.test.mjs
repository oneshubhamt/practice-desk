import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt,validateExamPackage} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {setManualGrade} from "../src/engine/manual-grading.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {timingLedgerHTML} from "../src/app/result-presentation.ts";
import {activateWorkspaceRoute} from "../src/app/route-controller.ts";
import {renderCurrentResultHTML} from "../src/app/result-controller.ts";

test("resume expiry samples one monotonic instant for state, persistence and score evidence",async()=>{
 const attempt={...startGenericAttempt(pkg,"cleer-expiry",0,"exam-simulation"),saveRevision:1};
 const restoredAt=pkg.paper.timing.durationMs+5000;
 let nowCalls=0,saved=null;
 const routes=[];
 const previousDocument=Object.getOwnPropertyDescriptor(globalThis,"document");
 Object.defineProperty(globalThis,"document",{value:{hidden:true},configurable:true});
 try{
  const owner={
   activationGeneration:0,routeHydrated:true,hydration:Promise.resolve(),disposed:false,
   view:"library",resultTab:"overview",attempt:null,records:new Map([[attempt.id,attempt]]),
   warning:"",freshlyStartedAttemptId:null,reviewFilter:"all",writtenDrafts:new Map(),
   now:()=>{nowCalls++;return restoredAt;},
   save:async record=>{saved=record;return true;},
   go:route=>{routes.push(route);},
   draw:()=>{throw new Error("Expired restore should route to Results before drawing Exam");}
  };
  await activateWorkspaceRoute(owner,{screen:"exam",attemptId:attempt.id},
   {kind:"push",signal:undefined,generation:1});
 }finally{
  if(previousDocument)Object.defineProperty(globalThis,"document",previousDocument);
  else delete globalThis.document;
 }
 assert.equal(nowCalls,1);
 assert.ok(saved);
 assert.equal(saved.updatedAt,restoredAt);
 assert.equal(saved.finishedAt,restoredAt);
 assert.equal(saved.completionReason,"time-expired");
 assert.equal(saved.result.snapshot.calculatedAt,new Date(restoredAt).toISOString());
 assert.deepEqual(routes,[{screen:"result",attemptId:attempt.id,tab:"overview"}]);
});

test("Results never repairs a completed attempt by recomputing a missing immutable score",()=>{
 const attempt={...startGenericAttempt(pkg,"cleer-result",0),finishedAt:1,result:undefined};
 assert.throws(()=>renderCurrentResultHTML({attempt}),/Completed attempt has no immutable score/);
});


test("unsectioned fractional Results use frozen precision, paper language and neutral provenance",()=>{
 const paperBase={...pkg.paper,id:"rev-paper:fractional-unsectioned",
  sections:[{id:"whole",title:"Internal structural group",questionRevisionIds:pkg.questions.map(q=>q.id)}],
  timing:{kind:"untimed"},navigation:{...pkg.paper.navigation,sectionNavigation:"free"},
  scoring:{defaultRule:{correctMarks:1/3,incorrectMarks:-1/9,unansweredMarks:0},decimalPlaces:3}};
 const paper={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const bundle=validateExamPackage({...pkg,title:"Fractional unsectioned",paper});
 const lookup=new Map(bundle.questions.map(q=>[q.id,q]));
 const right=bundle.answerKey.entries[0].answer;
 let attempt=startGenericAttempt(bundle,"fractional-result",0,"full-paper-practice");
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:10,response:right},lookup);
 attempt=transitionGenericAttempt(attempt,{type:"NAVIGATE",nowMs:11,sectionIndex:0,questionIndex:5},lookup);
 attempt=transitionGenericAttempt(attempt,{type:"ANSWER",nowMs:12,
  response:{kind:"free-response",text:"A short assessed response."}},lookup);
 attempt=transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:20},lookup);
 attempt=setManualGrade(attempt,"rev-5",1/3,"Fractional manual assessment",new Date(30).toISOString());
 const owner={attempt,resultTab:"overview",reviewFilter:"all",warning:"",
  packageForAttempt:()=>bundle,manualGradeDrafts:new Map(),records:new Map()};
 const overview=renderCurrentResultHTML(owner);
 assert.match(overview,/0\.333/);
 assert.match(overview,/<th>Paper<\/th>/);
 assert.match(overview,/Paper diagnostics/);
 assert.doesNotMatch(overview,/Section diagnostics/);
 assert.match(overview,/Frozen source &amp; independence:/);
 assert.match(overview,/does not independently authenticate official status/);
 assert.match(overview,/0\.333 \/ 0\.333/,"written self-assessment must use frozen mark precision");
 assert.doesNotMatch(overview,/0\.333333/);
 const ledger=timingLedgerHTML(attempt,true,true);
 assert.match(ledger,/<th>Paper<\/th>/);
 assert.match(ledger,/Whole paper/);

 const review=renderCurrentResultHTML({...owner,resultTab:"review"});
 assert.match(review,/0\.333 automated marks/);
 assert.match(review,/Self-assessed marks \(0–0\.333\)/);
 assert.match(review,/step="0\.001"/);
 assert.match(review,/value="0\.333"/);
 assert.doesNotMatch(review,/0\.333333/);
});
