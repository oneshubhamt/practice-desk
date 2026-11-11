/** P56 source-first cross-boundary contracts, independently written against
 * real publisher -> frozen session -> scoring -> topic evidence -> retest ->
 * shared digest -> strict portable backup. No test-only scorer or forged key.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication,inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {topicAncestors} from "../src/learning/syllabus-taxonomy.ts";
import {topicMetrics,addLearningCard,validateLearningCard} from "../src/learning/learning.ts";
import {mockEvidenceAttempts,revisionInventory,revisionTake} from "../src/learning/revision-selection.ts";
import {createNotebookLineage,makeRevisionPackage} from "../src/learning/revision-test.ts";
import {serializeVerifiedBackup,verifyBackup,planBackupMerge} from "../src/history/backup.ts";
import {DEFAULT_PREFERENCES} from "../src/app/preferences.ts";
import {compactAttempt,reconstructRecords} from "../src/history/shared-store.ts";
import {authoringPublishedPreview} from "../src/authoring/authoring-preview.ts";

const P=s=>plainRichDocument(s);
const timestamp=Date.UTC(2026,10,5,0);
const Q=(kind,section,answer,extras={})=>({
 ...newAuthoringQuestion(kind),section,sectionMinutes:section==="Combined"?10:5,
 answer,prompt:P("P56 independently frozen "+kind+" "+section),
 options:["Alpha","Beta","Gamma","Delta"].map(P),
 leftItems:["Left 1","Left 2","Left 3","Left 4"].map(P),
 rightItems:["Right A","Right B","Right C","Right D"].map(P),
 ...extras
});
function mixedDraft(){
 return {...newAuthoringDraft(),examId:"upsc-epfo-apfc",paperId:"p56-crosslayer",
  title:"P56 cross-layer authored exam",edition:"custom",revision:1,
  timingKind:"sectional",sectionNavigation:"sequential-locked",
  pausePolicy:"forbidden",sectionTransition:"manual",allowEarlySubmit:true,allowReview:true,
  marksCorrect:2.5,marksIncorrect:-5/6,questions:[
    Q("single-choice","Combined","B",{syllabusHeadingId:"labour",
      topic:"Labour Codes",subtopic:"Wages"}),
    Q("multiple-select","Combined","A,C",{syllabusHeadingId:"accountancy",topic:"Ledger",
      minSelections:1,maxSelections:3,partialCreditEach:0.4,partialPenaltyEach:0.1}),
    Q("numeric-entry","Combined","20",{syllabusHeadingId:"economy",tolerance:0.1}),
    Q("matching","General","1-C,2-A,3-D,4-B",{subject:"Quantitative Reasoning",
      topic:"Matching",partialCreditEach:0.6,partialPenaltyEach:0.1}),
    Q("free-response","General","Manual rubric",{subject:"Quantitative Reasoning",
      explanation:P("This written response requires a separate human assessment.")})
  ]};
}
function runRealPaper(pkg,id){
 const map=new Map(pkg.questions.map(q=>[q.id,q]));
 let a=startGenericAttempt(pkg,id,timestamp);
 const step=(type,time,extra={})=>{
  a=transitionGenericAttempt(a,{type,nowMs:timestamp+time,...extra},map);
 };
 step("ANSWER",1000,{response:{kind:"single-choice",optionId:"B"}});
 step("NAVIGATE",1500,{sectionIndex:0,questionIndex:1});
 step("ANSWER",2000,{response:{kind:"multiple-select",optionIds:["A","B"]}});
 step("NAVIGATE",2500,{sectionIndex:0,questionIndex:2});
 step("ANSWER",3000,{response:{kind:"numeric-entry",value:20.05}});
 step("SUBMIT_SECTION",4000);
 assert.equal(a.state.sectionIndex,1,"exact published section lock must advance only on submit");
 step("ANSWER",4500,{response:{kind:"matching",pairs:[
   {leftId:"L1",rightId:"C"},{leftId:"L2",rightId:"B"}]}});
 step("NAVIGATE",5000,{sectionIndex:1,questionIndex:1});
 step("ANSWER",5500,{response:{kind:"free-response",text:"A human evaluated model response"}});
 step("SUBMIT_SECTION",6000);
 assert.ok(a.finishedAt!==null);
 validateGenericStoredRecord(a);
 return a;
}

test("P56 publication source→exact preview and APFC academic roots remain independent of two physical section budgets",()=>{
 const draft=mixedDraft(),review=inspectAuthoringPublication(draft);
 assert.equal(review.valid,true,JSON.stringify(review.issues));
 const pkg=compileAuthoringPublication(draft);
 assert.deepEqual(review.compiled,pkg);
 assert.equal(pkg.paper.sections.length,2);
 assert.deepEqual(pkg.paper.sections.map(x=>x.title),["Combined","General"]);
 assert.deepEqual(pkg.paper.timing.sectionLimits.map(x=>x.durationMs),[600000,300000]);
 assert.equal(pkg.paper.navigation.sectionNavigation,"sequential-locked");
 assert.equal(pkg.paper.navigation.allowReview,true);
 assert.deepEqual(pkg.questions.slice(0,3).map(x=>x.content.topicIds?.length),[3,2,1]);
 assert.notEqual(pkg.questions[0].content.topicIds[0],pkg.questions[1].content.topicIds[0]);
 assert.notEqual(pkg.questions[1].content.topicIds[0],pkg.questions[2].content.topicIds[0]);
 const numeric=pkg.questions[2],key=pkg.answerKey.entries[2].answer;
 assert.equal(key.kind,"numeric-entry");
 assert.equal(key.absoluteTolerance,0.1);
 assert.match(authoringPublishedPreview(pkg,numeric.id),/0.1 tolerance/);
 assert.equal(pkg.answerKey.entries[1].scoringOverride.partialCredit.marksPerCorrectComponent,0.4);
 assert.doesNotThrow(()=>validateExamPackage(pkg));
 // Publisher revision is immutable, but underlying semantic question IDs
 // must not inflate when author publishes a new reviewed version.
 const v2=compileAuthoringPublication({...draft,revision:2});
 assert.notEqual(v2.paper.id,pkg.paper.id);
 assert.equal(v2.questions[0].questionId,pkg.questions[0].questionId);
 assert.notEqual(v2.questions[0].id,pkg.questions[0].id);
 assert.throws(()=>compileAuthoringPublication(draft,[pkg]),/published|Revision/i);
});
test("P56 real session uses exactly frozen numeric tolerance, negative and partial rules, review embargo and honest pending free response",()=>{
 const pkg=compileAuthoringPublication(mixedDraft()),finished=runRealPaper(pkg,"p56-finished");
 assert.deepEqual(finished.result.items.map(x=>x.verdict),
  ["correct","incorrect","correct","incorrect","pending"]);
 assert.deepEqual(finished.result.items.map(x=>Number(x.marks.toFixed(6))),
  [2.5,0.3,2.5,0.5,0]);
 assert.ok(Math.abs(finished.result.snapshot.earnedMarks-5.8)<1e-9);
 assert.equal(finished.result.snapshot.correctCount,2);
 assert.equal(finished.result.snapshot.incorrectCount,2);
 assert.equal(finished.result.snapshot.unansweredCount,0);
 assert.equal(finished.state.completedSections.length,2);
 assert.equal(finished.state.completedSectionTimings.length,2);
 assert.deepEqual(finished.state.completedSectionTimings.map(x=>x.reason),
  ["submitted","submitted"]);
 assert.equal(finished.frozen.paper.id,pkg.paper.id);
 const topicRoot=topicAncestors(["Principles of Accountancy, Auditing and Insurance"])[0].id;
 const metric=topicMetrics([finished]).find(m=>m.kind==="hierarchy"&&m.id.endsWith(topicRoot));
 assert.equal(metric?.incorrect,1);
 assert.equal(metric?.distinctQuestions,1);
});
test("P56 source-frozen wrong answer produces independent 1/0 revision, strict lineage, and is excluded from source-topic statistics",()=>{
 const pkg=compileAuthoringPublication(mixedDraft());
 const original=runRealPaper(pkg,"p56-source-mistake");
 const wrong=pkg.questions[1];
 const card=addLearningCard(original,wrong.id,new Date(timestamp+7000).toISOString());
 const annotation=validateLearningCard({...card,customSubject:"Double-Entry Accounting",
   customTopic:"Ledger",customSubtopic:"Posting",bookmarked:true});
 const candidates=revisionInventory([original],[annotation],new Set(),
   pkg.examId,["wrong","bookmarked"]);
 assert.ok(candidates.eligibleCount>=2);
 const choice=revisionTake(candidates,1)[0],p=makeRevisionPackage([choice.card],"p56-one-card");
 assert.equal(p.paper.timing.kind,"untimed");
 assert.equal(p.paper.scoring.defaultRule.correctMarks,1);
 assert.equal(p.paper.scoring.defaultRule.incorrectMarks,0);
 assert.equal(p.paper.edition,"custom");
 const selection={schema:1,examId:pkg.examId,reasons:["wrong","bookmarked"],
   eligibleCount:candidates.eligibleCount,selectedQuestionIds:[choice.questionId]};
 const sourceTrail=createNotebookLineage([choice.card],selection);
 const retest={...startGenericAttempt(p,"p56-generated-retest",timestamp+10000),
   notebookLineage:sourceTrail};
 validateGenericStoredRecord(retest);
 assert.equal(mockEvidenceAttempts([original,retest]).length,1);
 assert.deepEqual(topicMetrics([original,retest],[annotation]),topicMetrics([original],[annotation]));
 assert.equal(retest.frozen.paper.scoring.defaultRule.incorrectMarks,0);
});
test("P56 exact v4 manifest and shared SHA survive multi-type source→notebook→retest without mutable score leakage",()=>{
 const pkg=compileAuthoringPublication(mixedDraft());
 const source=runRealPaper(pkg,"p56-portable-source");
 const card=addLearningCard(source,pkg.questions[1].id,new Date(timestamp+7000).toISOString());
 const retestPkg=makeRevisionPackage([card],"p56-portable");
 const retest={...startGenericAttempt(retestPkg,"p56-portable-retest",timestamp+10000),
   notebookLineage:createNotebookLineage([card])};
 const corpus=[{...source,saveRevision:1},{...card,saveRevision:1},{...retest,saveRevision:1}],
   at="2026-11-05T01:00:00.000Z";
 const body=serializeVerifiedBackup(corpus,DEFAULT_PREFERENCES,at);
 const archive=verifyBackup(JSON.parse(body));
 assert.equal(archive.records.length,3);
 assert.equal(archive.snapshots.length,2,"different immutable source and retest content");
 assert.equal(archive.manifest.algorithm,"sha256");
 assert.deepEqual(reconstructRecords(archive.records,archive.snapshots)
    .map(validateGenericStoredRecord).map(x=>x.id),corpus.map(x=>x.id));
 const duplicate=compactAttempt(corpus[0]);
 assert.equal(duplicate.snapshot.id,archive.snapshots[0].id);
 assert.deepEqual(planBackupMerge([corpus[0]],corpus).map(x=>x.id),[card.id,retest.id]);
 const tampered=JSON.parse(body);
 tampered.records.find(x=>x.id===source.id).result.snapshot.earnedMarks=999;
 assert.throws(()=>verifyBackup(tampered),/integrity check/i);
 const malformed=structuredClone(source);
 malformed.result.snapshot.earnedMarks=999;
 assert.throws(()=>validateGenericStoredRecord(malformed),/score|frozen/i);
});
test("P56 invalid semantic/canonical taxonomy cannot acquire publisher readiness or mutate approved source revision",()=>{
 const draft=mixedDraft(),prior=compileAuthoringPublication(draft);
 for(const subject of ["Bad"+String.fromCharCode(10)+"Subject","Bad"+String.fromCharCode(0)+"Subject"]){
  const invalid={...draft,questions:[{...draft.questions[0],
     syllabusHeadingId:"",subject},...draft.questions.slice(1)]};
  const report=inspectAuthoringPublication(invalid);
  assert.equal(report.valid,false);
  assert.equal(report.compiled,undefined);
  assert.throws(()=>compileAuthoringPublication(invalid));
 }
 const mismatched={...draft,questions:[draft.questions[0],
   {...draft.questions[1],sectionMinutes:12},...draft.questions.slice(2)]};
 assert.equal(inspectAuthoringPublication(mismatched).valid,false);
 assert.deepEqual(compileAuthoringPublication(draft),prior);
});
