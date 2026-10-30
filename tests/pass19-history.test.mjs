import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {crossPaperMarksPriorities} from "../src/app/history-priorities.ts";
import {frozenScoreSummary} from "../src/app/history-score.ts";
import {historyHTML,sectionPriorities,filteredHistory} from "../src/app/history-page.ts";
import {scoreableMaximum,sectionScoreSummaries} from "../src/engine/score-ceiling.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
const bank=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patch=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const editions=builtinCglPackages(bank,patch);
const originals=editions.filter(p=>p.paper.edition==="source");
const reviewed=editions.filter(p=>p.paper.edition==="reviewed");
const questionMap=(bundle)=>new Map(bundle.questions.map(q=>[q.id,q]));
const act=(type,nowMs,extra={})=>({type,nowMs,...extra});
function finish(bundle,id,startedAt,sectionAnswers={}){
 let a=startGenericAttempt(bundle,id,startedAt);
 const qmap=questionMap(bundle);
 let time=startedAt;
 for(let section=0;section<bundle.paper.sections.length;section++){
   const questionIds=bundle.paper.sections[section].questionRevisionIds;
   for(const [index,right] of sectionAnswers[section]??[]){
     a=transitionGenericAttempt(a,act("NAVIGATE",++time,{sectionIndex:section,questionIndex:index}),qmap);
     const qid=questionIds[index];
     const answer=bundle.answerKey.entries.find(e=>e.questionRevisionId===qid)?.answer;
     const q=bundle.questions.find(q=>q.id===qid);
     assert.equal(answer?.kind,"single-choice");
     assert.equal(q?.content.kind,"single-choice");
     const option=right?answer.optionId:q.content.options.find(o=>o.id!==answer.optionId).id;
     a=transitionGenericAttempt(a,act("ANSWER",++time,{response:{kind:"single-choice",optionId:option}}),qmap);
   }
   const last=section===bundle.paper.sections.length-1;
   // Sectional strict exams must finish via section submission, including the
   // final section; direct SUBMIT_ATTEMPT cannot bypass the section policy.
   const action=bundle.paper.timing.kind==="sectional"?"SUBMIT_SECTION":
     last?"SUBMIT_ATTEMPT":"SUBMIT_SECTION";
   a=transitionGenericAttempt(a,act(action,++time),qmap);
 }
 assert.notEqual(a.finishedAt,null);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 return a;
}

test("F03: rank frozen adjusted marks, not accuracy, across two real compatible full CGL papers",()=>{
 const one=configureCglPractice(originals[0],"strict");
 const two=configureCglPractice(originals[1],"strict");
 const answers={0:[[0,true]],1:[[0,true],[1,true],[2,true],[3,true],[4,true],
   [5,false],[6,false],[7,false],[8,false],[9,false]]};
 const a=finish(one,"a",1000,answers),b=finish(two,"b",2000,answers);
 const marks=crossPaperMarksPriorities([b,a]);
 assert.ok(marks);
 assert.equal(marks.attempts,2);
 assert.equal(marks.distinctPapers,2);
 assert.equal(marks.mode,"exam-simulation");
 const section1=marks.rows.find(x=>x.title===one.paper.sections[0].title);
 const section2=marks.rows.find(x=>x.title===one.paper.sections[1].title);
 assert.ok(section1&&section2);
 assert.ok(section1.percent<section2.percent,"Low-coverage all-correct section must rank lower by marks share");
 assert.ok(section1.accuracy>section2.accuracy,"Accuracy alone gives the opposite section ordering");
 const rows=[sectionScoreSummaries(a,a.result),sectionScoreSummaries(b,b.result)];
 assert.equal(section1.eligibleMax,rows[0][0].eligibleMax+rows[1][0].eligibleMax);
 assert.equal(section1.earned,rows[0][0].marks+rows[1][0].marks);
 assert.equal(marks.rows[0].percent,0,"Unanswered sections correctly remain at zero share");
 const accuracy=sectionPriorities([a,b]);
 assert.ok(accuracy.length>0,"Previous accuracy lens remains independently available");
});

test("F03: eight newest qualifying full-paper records limit cohort; single and unrelated modes excluded",()=>{
 const base=originals.slice(0,2).map(p=>configureCglPractice(p,"strict"));
 const attempts=Array.from({length:10},(_,i)=>finish(base[i%2],"id-"+i,10000+i*1000,{}));
 // All have zero marks but still have true eligible maximum.
 const result=crossPaperMarksPriorities(attempts);
 assert.ok(result);
 assert.equal(result.attempts,8);
 assert.equal(result.distinctPapers,2);
 assert.equal(result.rows[0].earned,0);
 const single=finish(configureCglPractice(originals[0],"single",0),"single",40000,{});
 assert.equal(crossPaperMarksPriorities([single,...attempts]).attempts,8);
 const reviewedAttempt=finish(configureCglPractice(reviewed[0],"strict"),"reviewed",50000,{});
 const mixed=crossPaperMarksPriorities([reviewedAttempt,...attempts]);
 assert.equal(mixed.edition,"source","One newer reviewed edition must not join the original-source cohort");
 const free=finish(configureCglPractice(originals[0],"free"),"free",60000,{});
 assert.equal(crossPaperMarksPriorities([free,...attempts]).mode,"exam-simulation");
 assert.equal(crossPaperMarksPriorities([attempts[0],attempts[2]]),null,
   "Repeated attempts at only one paper do not constitute cross-paper evidence");
});

test("F03: separate exam identities and differently structured papers cannot produce false cross-paper groups",()=>{
 const p=originals.slice(0,2).map(p=>configureCglPractice(p,"strict"));
 const a=finish(p[0],"first",1000,{});
 const b=finish(p[1],"second",2000,{});
 const swappedExam=structuredClone(b);
 swappedExam.frozen.snapshot.examId="a-different-exam";
 assert.equal(crossPaperMarksPriorities([a,swappedExam]),null);
 const swappedSection=structuredClone(b);
 swappedSection.frozen.paper.sections[1].title="Different sectional blueprint";
 assert.equal(crossPaperMarksPriorities([a,swappedSection]),null);
 const changedScheme=structuredClone(b);
 changedScheme.frozen.paper.scoring.defaultRule.correctMarks=7;
 assert.equal(crossPaperMarksPriorities([a,changedScheme]),null);
 const changedTiming=structuredClone(b);
 changedTiming.frozen.paper.timing.transition="manual";
 assert.equal(crossPaperMarksPriorities([a,changedTiming]),null);
 const changedNavigation=structuredClone(b);
 changedNavigation.frozen.paper.navigation.questionNavigation="forward-only";
 assert.equal(crossPaperMarksPriorities([a,changedNavigation]),null);
 const changedItemRule=structuredClone(b);
 changedItemRule.frozen.key.entries[0].scoringOverride={
   correctMarks:5,incorrectMarks:-1,unansweredMarks:0};
 assert.equal(crossPaperMarksPriorities([a,changedItemRule]),null,
   "An item-specific grading override must separate otherwise identical format cohorts");
});

test("F03: negative earned marks stay visible while progress width can be clamped for display",()=>{
 const a=finish(configureCglPractice(originals[0],"strict"),"bad-a",1000,{0:[[0,false]]});
 const b=finish(configureCglPractice(originals[1],"strict"),"bad-b",2000,{0:[[0,false]]});
 const result=crossPaperMarksPriorities([a,b]);
 assert.ok(result);
 const first=result.rows.find(row=>row.title===a.frozen.paper.sections[0].title);
 assert.ok(first.percent<0);
 const html=historyHTML([a,b],new Map(),{status:"all",sort:"newest",search:""},false,false,"");
 assert.match(html,/Cross-paper marks priorities/);
 assert.match(html,/-[0-9.]+% marks/);
 assert.doesNotMatch(html,/width:-/);
});

test("F04: archive uses attempt's frozen eligible maximum, not nominal 100-paper marks",()=>{
 const strict=finish(configureCglPractice(originals[0],"strict"),"whole",1000,{});
 const single=finish(configureCglPractice(originals[0],"single",2),"section",2000,{});
 const maxFull=scoreableMaximum(strict.frozen.paper,strict.frozen.key,strict.frozen.questions);
 const maxSingle=scoreableMaximum(single.frozen.paper,single.frozen.key,single.frozen.questions);
 assert.ok(maxFull>maxSingle);
 assert.equal(frozenScoreSummary(strict).maximum,maxFull);
 assert.equal(frozenScoreSummary(single).maximum,maxSingle);
 const html=historyHTML([strict,single],new Map(),{status:"all",sort:"newest",search:""},false,false,"");
 assert.ok(html.includes(frozenScoreSummary(strict).text));
 assert.ok(html.includes(frozenScoreSummary(single).text));
 assert.match(html,/section practice/);
 assert.match(html,/exam simulation/);
 const pending=startGenericAttempt(validateExamPackage(pkg),"unfinished",1000);
 assert.equal(frozenScoreSummary(pending),null);
 assert.match(historyHTML([pending],new Map(),{status:"all",sort:"newest",search:""},false,false,""),
   /In progress/);
});

test("F05 adjacent: archive status filters retain separate complete and progress workflows",()=>{
 const complete=finish(configureCglPractice(originals[0],"strict"),"complete",1000,{});
 const progress=startGenericAttempt(validateExamPackage(pkg),"progress",3000);
 const packages=new Map();
 assert.deepEqual(filteredHistory([complete,progress],packages,{status:"complete",sort:"newest",search:""}).map(x=>x.id),["complete"]);
 assert.deepEqual(filteredHistory([complete,progress],packages,{status:"progress",sort:"newest",search:""}).map(x=>x.id),["progress"]);
});
