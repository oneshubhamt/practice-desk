/** Independent six-kind ledger and cross-section metamorphic checks.
 * Expectations are calculated from deliberately separate fixture choices,
 * not from scoreAttempt, scoreableBounds or internal grader helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {scoreableMaximum} from "../src/engine/score-ceiling.ts";

const ruleVariants=[
 {correctMarks:2.5,incorrectMarks:-5/6,unansweredMarks:0},
 {correctMarks:3,incorrectMarks:-1,unansweredMarks:0},
 {correctMarks:1,incorrectMarks:0,unansweredMarks:0},
 {correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0.25}
];
function seeded(seed){
 let n=seed>>>0;
 return max=>{n^=n<<13;n^=n>>>17;n^=n<<5;return (n>>>0)%max;};
}
const variants=[
 [{kind:"single-choice",optionId:"a"},{kind:"single-choice",optionId:"b"},null],
 [{kind:"multiple-select",optionIds:["x","z"]},{kind:"multiple-select",optionIds:["x","y"]},null],
 [{kind:"numeric-entry",value:3.5},{kind:"numeric-entry",value:3.7},null],
 [{kind:"true-false",value:true},{kind:"true-false",value:false},null],
 [{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r2"}]},
  {kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]},null],
 [{kind:"free-response",text:"Rubric response"},null,null]
];
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-9,message+" actual="+a+" expected="+b);
function scramble(items,random){
 const out=[...items];
 for(let i=out.length-1;i>0;i--){const j=random(i+1);[out[i],out[j]]=[out[j],out[i]];}
 return out;
}

test("G scoring: seeded independent six-kind fractional ledger survives policy precedence and split/reordered sections",()=>{
 for(let seed=1;seed<=160;seed++){
  const random=seeded(0x9e3779b9^seed);
  const defaults=ruleVariants[random(ruleVariants.length)];
  const byKind={"true-false":ruleVariants[random(ruleVariants.length)]};
  const sections=pkg.paper.sections.map(section=>({
   ...section,
   ...(random(2)?{scoringOverride:ruleVariants[random(ruleVariants.length)]}:{})
  }));
  const paper={...pkg.paper,sections,scoring:{defaultRule:defaults,byQuestionKind:byKind}};
  const changedQuestions=questions.map(q=>({
   ...q,editorial:{status:random(8)===0?"invalid":random(5)===0?"caution":"verified"}
  }));
  const entries=pkg.answerKey.entries.map((entry,i)=>{
   if(i===1||i===4){
    const basis=ruleVariants[random(ruleVariants.length)];
    return {...entry,scoringOverride:{...basis,partialCredit:{
     kind:"per-correct-component",marksPerCorrectComponent:0.5+random(6)*0.5,
     penaltyPerIncorrectComponent:random(4)*0.25,floorAtZero:Boolean(random(2))
    }}};
   }
   return random(4)===0?{...entry,scoringOverride:ruleVariants[random(ruleVariants.length)]}:entry;
  });
  const key={...pkg.answerKey,entries};
  const selections=variants.map(list=>random(list.length));
  const responses=selections.flatMap((option,i)=>variants[i][option]?
    [{questionRevisionId:questions[i].id,response:structuredClone(variants[i][option])}]:[]);
  const rules=changedQuestions.map((q,i)=>{
   const section=sections.find(s=>s.questionRevisionIds.includes(q.id));
   return entries[i].scoringOverride??section.scoringOverride??byKind[q.content.kind]??defaults;
  });
  const expected=changedQuestions.map((q,i)=>{
   const choice=selections[i],response=variants[i][choice],rule=rules[i];
   if(q.editorial.status==="invalid")return {id:q.id,verdict:"excluded",marks:0};
   if(!response)return {id:q.id,verdict:"unanswered",marks:rule.unansweredMarks};
   if(i===5)return {id:q.id,verdict:"pending",marks:0};
   if(choice===0)return {id:q.id,verdict:"correct",marks:rule.correctMarks};
   let marks=rule.incorrectMarks;
   if((i===1||i===4)&&rule.partialCredit){
    // Independent component reference: mixed multiple-choice has one correct
    // and one incorrect selection; matching has one correct left pair.
    const raw=i===1?
     rule.partialCredit.marksPerCorrectComponent-rule.partialCredit.penaltyPerIncorrectComponent:
     rule.partialCredit.marksPerCorrectComponent;
    marks=Math.min(rule.correctMarks,rule.partialCredit.floorAtZero?Math.max(0,raw):raw);
   }
   return {id:q.id,verdict:"incorrect",marks};
  });
  const result=scoreAttempt(paper,key,changedQuestions,responses,"2026-11-14T00:00:00Z");
  const label="seed="+seed;
  assert.deepEqual(result.items.map(x=>x.verdict),expected.map(x=>x.verdict),label+" verdict");
  for(let i=0;i<6;i++){
   assert.equal(result.items[i].questionRevisionId,expected[i].id,label+" identity");
   close(result.items[i].marks,expected[i].marks,label+" item="+i);
  }
  const marks=expected.map(x=>x.marks);
  close(result.snapshot.earnedMarks,marks.reduce((a,b)=>a+b,0),label+" net");
  close(result.snapshot.positiveMarks,marks.reduce((s,v)=>s+Math.max(0,v),0),label+" positive");
  close(result.snapshot.penaltyMarks,marks.reduce((s,v)=>s+Math.max(0,-v),0),label+" penalty");
  for(const [verdict,keyName] of [["correct","correctCount"],["incorrect","incorrectCount"],
    ["unanswered","unansweredCount"],["excluded","excludedCount"]])
    assert.equal(result.snapshot[keyName],expected.filter(x=>x.verdict===verdict).length,label+" "+keyName);
  const ceiling=changedQuestions.reduce((total,q,i)=>total+
   (q.editorial.status==="invalid"||q.content.kind==="free-response"?0:rules[i].correctMarks),0);
  close(scoreableMaximum(paper,key,changedQuestions),ceiling,label+" eligible ceiling");

  // Section composition is additive; input order, answer-key order and
  // irrelevant excluded responses must not change score or question identity.
  const split=sections.map(section=>{
   const ids=new Set(section.questionRevisionIds);
   return scoreAttempt({...paper,sections:[section]},key,changedQuestions,
     responses.filter(r=>ids.has(r.questionRevisionId)),"2026-11-14T00:00:00Z");
  });
  close(split.reduce((sum,part)=>sum+part.snapshot.earnedMarks,0),
    result.snapshot.earnedMarks,label+" split ledger");
  assert.deepEqual(split.flatMap(x=>x.items),result.items,label+" split item identities");

  const reordered=scoreAttempt(paper,{...key,entries:scramble(entries,random)},
    scramble(changedQuestions,random),scramble(responses,random),"2026-11-14T00:00:00Z");
  assert.deepEqual(reordered,result,label+" permuted inputs");

  const changedExcluded=responses.filter(r=>
    changedQuestions.find(q=>q.id===r.questionRevisionId).editorial.status!=="invalid");
  for(let i=0;i<changedQuestions.length;i++)if(changedQuestions[i].editorial.status==="invalid")
    changedExcluded.push({questionRevisionId:changedQuestions[i].id,
      response:structuredClone(variants[i][i===5?0:1])});
  const same=scoreAttempt(paper,key,changedQuestions,changedExcluded,"2026-11-14T00:00:00Z");
  assert.deepEqual(same,result,label+" excluded response privacy");
 }
});
