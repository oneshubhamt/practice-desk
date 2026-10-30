import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {scoreableMaximum,sectionScoreSummaries} from "../src/engine/score-ceiling.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
import {createSourceReviewReference} from "../src/engine/review-source.ts";

const papers=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const editions=builtinCglPackages(papers,patches,solutions);

test("independent v11 edition parity: all five CGL papers preserve 500 original published keys, and reviewed patches",()=>{
 assert.equal(Object.keys(papers).length,5);
 assert.equal(editions.length,10);
 let corrected=0,caution=0;
 for(const original of Object.values(papers)){
   const source=editions.find(p=>p.paper.paperId===original.id&&p.paper.edition==="source");
   const reviewed=editions.find(p=>p.paper.paperId===original.id&&p.paper.edition==="reviewed");
   assert.ok(source&&reviewed);
   assert.equal(source.questions.length,100);assert.equal(reviewed.questions.length,100);
   assert.deepEqual(source.paper.sections.map(s=>s.questionRevisionIds.length),[25,25,25,25]);
   const keySource=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
   const keyReviewed=new Map(reviewed.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
   for(let i=0;i<100;i++){
     const before=original.questions[i],src=source.questions[i],rev=reviewed.questions[i];
     const patch=patches[original.id]?.[String(before.n)]??{};
     assert.equal(src.content.prompt,before.stem);
     assert.deepEqual(src.content.options.map(o=>o.text),before.opts);
     assert.equal(keySource.get(src.id)?.optionId,src.content.options["abcd".indexOf(before.key)].id);
     assert.equal(rev.content.prompt,patch.stem??before.stem);
     assert.deepEqual(rev.content.options.map(o=>o.text),patch.opts??before.opts);
     assert.equal(keyReviewed.get(rev.id)?.optionId,rev.content.options["abcd".indexOf(patch.key??before.key)].id);
     // Directly derived from frozen baseline/v11 legacy.ts 7-12:
     const v11Status=patch.status??(before.status==="invalid"||before.status==="caution"?"caution":"ok");
     const expected=v11Status==="ok"?"verified":v11Status;
     assert.equal(rev.editorial.status,expected,original.id+" Q"+before.n+" editorial parity");
     if(expected==="corrected")corrected++;
     if(expected==="caution")caution++;
   }
 }
 assert.ok(corrected>50);assert.ok(caution>5);
});

test("October 6 Q62: published b disputed; original excluded, reviewed caution remains scored against b",()=>{
 const source=editions.find(x=>x.paper.paperId==="cgl-2026-10-06"&&x.paper.edition==="source");
 const reviewed=editions.find(x=>x.paper.paperId==="cgl-2026-10-06"&&x.paper.edition==="reviewed");
 const index=61;
 const original=source.questions[index],changed=reviewed.questions[index];
 assert.equal(original.editorial.status,"invalid");
 assert.equal(changed.editorial.status,"caution");
 assert.match(changed.editorial.notes,/published answer is retained for scoring/i);
 assert.match(changed.editorial.notes,/disputed/i);
 assert.equal(changed.content.options[1].text,"Both 1 and 2, but not 3");
 assert.equal(changed.content.options[3].text,"Only 2");
 assert.equal(source.answerKey.entries[index].answer.optionId,original.content.options[1].id);
 assert.equal(reviewed.answerKey.entries[index].answer.optionId,changed.content.options[1].id);
 const submittedAt=new Date(10000).toISOString();
 const sourceResult=scoreAttempt(source.paper,source.answerKey,source.questions,
  [{questionRevisionId:original.id,response:{kind:"single-choice",optionId:original.content.options[1].id},flagged:false,timeSpentMs:0,answerChangeCount:0}],submittedAt);
 assert.equal(sourceResult.items[index].verdict,"excluded");
 const answer=(optionId)=>[{questionRevisionId:changed.id,
   response:{kind:"single-choice",optionId},flagged:false,timeSpentMs:0,answerChangeCount:0}];
 const right=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,
   answer(changed.content.options[1].id),submittedAt);
 const disputed=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,
   answer(changed.content.options[3].id),submittedAt);
 assert.equal(right.items[index].verdict,"correct");
 assert.equal(right.items[index].marks,2);
 assert.equal(disputed.items[index].verdict,"incorrect");
 assert.equal(disputed.items[index].marks,-0.5);
 assert.ok(scoreableMaximum(reviewed.paper,reviewed.answerKey,reviewed.questions)>=
   scoreableMaximum(source.paper,source.answerKey,source.questions)+2,
   "The reviewed edition must include Q62; other independently patched source-invalid items also restore marks");
 const ref=createSourceReviewReference(reviewed,source);
 assert.ok(ref.entries.some(e=>e.targetQuestionRevisionId===changed.id));
});

function customScoring(){
 const updated=structuredClone(pkg);
 const scoring={...updated.paper.scoring,decimalPlaces:2,
  byQuestionKind:{
   "multiple-select":{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:8}},
   "matching":{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:9}}
  }};
 const changed={...updated.paper,scoring};
 updated.paper={...changed,contentHash:paperRevisionHash(changed)};
 return validateExamPackage(updated);
}
test("imported generic multiple-select cannot earn above declared max through excessive component awards",()=>{
 const exam=customScoring();
 const q=exam.questions[1];
 const r=scoreAttempt(exam.paper,exam.answerKey,exam.questions,
  [{questionRevisionId:q.id,response:{kind:"multiple-select",optionIds:["x","y"]},
   timeSpentMs:1,answerChangeCount:0,flagged:false}],new Date().toISOString());
 assert.equal(r.items[1].verdict,"incorrect");
 assert.equal(r.items[1].marks,2);
 assert.ok(r.snapshot.earnedMarks<=scoreableMaximum(exam.paper,exam.answerKey,exam.questions));
});
test("imported generic matching partial response cannot exceed nominal full credit",()=>{
 const exam=customScoring(),q=exam.questions[4];
 const r=scoreAttempt(exam.paper,exam.answerKey,exam.questions,
  [{questionRevisionId:q.id,response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]},
   timeSpentMs:1,answerChangeCount:0,flagged:false}],new Date().toISOString());
 assert.equal(r.items[4].verdict,"incorrect");assert.equal(r.items[4].marks,2);
});
test("standard CGL marking and nominal denominator are unchanged by generic cap",()=>{
 const x=editions.find(x=>x.paper.paperId==="cgl-2026-10-08"&&x.paper.edition==="reviewed");
 const q=x.questions[0],key=x.answerKey.entries[0].answer;
 const wrong=q.content.options.find(o=>o.id!==key.optionId);
 const r=scoreAttempt(x.paper,x.answerKey,x.questions,[{questionRevisionId:q.id,
  response:{kind:"single-choice",optionId:wrong.id},timeSpentMs:1,answerChangeCount:0,flagged:false}],
  new Date().toISOString());
 assert.equal(r.items[0].marks,q.editorial.status==="invalid"?0:-0.5);
 const a=startGenericAttempt(configureCglPractice(x,"single",0),"pass16-standard",1000);
 assert.equal(validateGenericStoredRecord(a),a);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1200},
    new Map(a.frozen.questions.map(q=>[q.id,q])));
 assert.equal(sectionScoreSummaries(ended,ended.result)[0].eligibleMax,
   scoreableMaximum(ended.frozen.paper,ended.frozen.key,ended.frozen.questions));
});
