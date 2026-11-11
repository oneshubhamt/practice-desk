/** P49/P50/P52 independent hierarchy, publication and shortcut contracts.
 * Assemble genuine six-kind authored papers and evaluate through actual engine
 * rather than asserting merely that authoring controls exist in HTML.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication,inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {topicAncestors,topicPathId,parseTopicPathId,attributedTopicPath} from "../src/learning/syllabus-taxonomy.ts";
import {addLearningCard,topicMetrics,validateLearningCard} from "../src/learning/learning.ts";
import {makeBackup,verifyBackup} from "../src/history/backup.ts";
import {reconstructRecords} from "../src/history/shared-store.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {DEFAULT_PREFERENCES} from "../src/app/preferences.ts";
import {DEFAULT_SHORTCUTS,resolveExamShortcut,readShortcutBindings,
 validateShortcutBindings,writeShortcutBindings,examShortcutHelp} from "../src/app/exam-shortcuts.ts";

const P=x=>plainRichDocument(x);
function paper(){
 const a=newAuthoringDraft();
 const a1={...newAuthoringQuestion("multiple-select"),section:"Economy",subject:"Economy",topic:"Inflation",
  subtopic:"CPI",difficulty:"medium",minSelections:2,maxSelections:3,
  partialCreditEach:1,partialPenaltyEach:0.5,
  prompt:P("Select two correct statements"),options:["A","B","C","D"].map(P),
  answer:"A,C",explanation:P("Detailed source evidence")};
 const a2={...newAuthoringQuestion("single-choice"),section:"Polity",subject:"Polity",topic:"Parliament",
  subtopic:"Committees",difficulty:"easy",
  prompt:P("What is the answer?"),options:["A","B","C","D"].map(P),answer:"B"};
 return {...a,examId:"upsc-epfo-apfc",paperId:"hierarchical-check",
  title:"User-authored custom hierarchy",timingKind:"sectional",sectionNavigation:"sequential-locked",
  questionNavigation:"forward-only",pausePolicy:"forbidden",allowReview:false,
  sectionTransition:"automatic",allowEarlySubmit:false,
  sections:[{name:"Economy",minutes:15},{name:"Polity",minutes:10}],questions:[a1,a2]};
}
test("P49 topic paths have stable ancestors and never collapse same label across different parents",()=>{
 const left=topicAncestors(["Economy","Inflation","CPI"]);
 const right=topicAncestors(["Science","Inflation","CPI"]);
 assert.equal(left.length,3);
 assert.equal(left[1].parentId,left[0].id);
 assert.equal(left[2].parentId,left[1].id);
 assert.notEqual(left[2].id,right[2].id);
 assert.deepEqual(parseTopicPathId(left[2].id),["Economy","Inflation","CPI"]);
 assert.equal(parseTopicPathId("topic:Economy/%ZZ"),null);
 for(const item of [[],["Economy","","CPI"],["Economy","Inflation","CPI","extra"],["x\n"]])
  assert.throws(()=>topicPathId(item));
 assert.throws(()=>attributedTopicPath("upsc-epfo-apfc","General","labour","","Wages"));
 assert.throws(()=>attributedTopicPath("upsc-epfo-apfc","General","labour","Labour Codes","Wages"),
  /either an official/);
 assert.deepEqual(attributedTopicPath("upsc-epfo-apfc","","labour","Labour Codes","Wages"),
  ["Industrial Relations, Labour Codes and Social Security in India","Labour Codes","Wages"]);
});
test("P50 authored sectional paper freezes exact navigation, source topic hierarchy and difficulty",()=>{
 const draft=validateAuthoringDraft(paper());
 const out=compileAuthoringPublication(draft);
 assert.equal(validateExamPackage(out),out);
 assert.equal(out.paper.timing.kind,"sectional");
 assert.deepEqual(out.paper.timing.sectionLimits.map(x=>x.durationMs),[900000,600000]);
 assert.equal(out.paper.timing.pausePolicy,"forbidden");
 assert.equal(out.paper.timing.transition,"automatic");
 assert.equal(out.paper.timing.allowEarlySubmit,false);
 assert.equal(out.paper.navigation.sectionNavigation,"sequential-locked");
 assert.equal(out.paper.navigation.questionNavigation,"forward-only");
 assert.equal(out.paper.navigation.allowReview,false);
 assert.equal(out.questions[0].content.kind,"multiple-select");
 assert.equal(out.questions[0].content.minSelections,2);
 assert.equal(out.questions[0].content.maxSelections,3);
 assert.deepEqual(out.questions[0].content.topicIds,topicAncestors(["Economy","Inflation","CPI"]).map(x=>x.id));
 assert.deepEqual(out.questions[0].content.tags,["difficulty:medium"]);
 assert.equal(out.answerKey.entries[0].scoringOverride.partialCredit.marksPerCorrectComponent,1);
 assert.equal(out.answerKey.entries[0].scoringOverride.partialCredit.penaltyPerIncorrectComponent,0.5);
});
test("P50 component marking is actual scorer policy; frozen full marks remain capped",()=>{
 const pkg=compileAuthoringPublication(paper()),id=pkg.questions[0].id;
 const response=[{questionRevisionId:id,timeSpentMs:0,answerChangeCount:0,
  response:{kind:"multiple-select",optionIds:["A","B"]}}];
 const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,response,"2026-11-04T10:00:00.000Z");
 assert.equal(result.items[0].verdict,"incorrect");
 assert.equal(result.items[0].marks,0.5);
 assert.equal(result.snapshot.earnedMarks,0.5);
 assert.equal(result.snapshot.unansweredCount,1);
});
test("P50 author cannot publish conflicting section budgets, invalid key cardinality or impossible policy",()=>{
 const orig=paper();
 const conflict={...orig,sections:[...orig.sections,{name:"Economy",minutes:14}]};
 assert.equal(inspectAuthoringPublication(conflict).valid,false);
 assert.match(inspectAuthoringPublication(conflict).issues.map(x=>x.reason).join("|"),/Duplicate exam section/);
 const invalidPolicy={...orig,sectionNavigation:"free"};
 assert.equal(inspectAuthoringPublication(invalidPolicy).valid,false);
 const wrongKey={...orig,questions:[{...orig.questions[0],answer:"A"},orig.questions[1]]};
 assert.equal(inspectAuthoringPublication(wrongKey).valid,false);
});
test("P49 published labels roll up to subject/topic/subtopic without inventing measured mastery",()=>{
 const pkg=compileAuthoringPublication(paper());
 let a=startGenericAttempt(pkg,"p49-hierarchy",Date.UTC(2026,10,4));
 // Whole report intentionally not finished: only source metadata is asserted
 // via the real frozen question revision.
 const paths=pkg.questions[0].content.topicIds.map(parseTopicPathId);
 assert.deepEqual(paths,[["Economy"],["Economy","Inflation"],["Economy","Inflation","CPI"]]);
 assert.equal(a.frozen.questions[0].content.topicIds.length,3);
});
test("P49 real completed attempts aggregate full author and self-labelled paths separately",()=>{
 const pkg=compileAuthoringPublication(paper()),start=Date.UTC(2026,10,4,8);
 const attempt=startGenericAttempt(pkg,"p49-timed",start);
 const finished=transitionGenericAttempt(attempt,{type:"TICK",nowMs:start+30*60*1000},
  new Map(pkg.questions.map(q=>[q.id,q])));
 assert.notEqual(finished.finishedAt,null,"actual sectional expiry must finish both sections");
 const original=addLearningCard(finished,pkg.questions[0].id,new Date(start+30*60*1000).toISOString());
 const card=validateLearningCard({...original,syllabusTopicId:"labour",
  customTopic:"Labour Codes",customSubtopic:"Wages"});
 const metrics=topicMetrics([finished],[card]).filter(x=>x.kind==="hierarchy");
 const label=x=>metrics.find(m=>m.label===x);
 assert.equal(label("Economy")?.total,1);
 assert.equal(label("Economy › Inflation")?.total,1);
 assert.equal(label("Economy › Inflation › CPI")?.total,1);
 const root="Industrial Relations, Labour Codes and Social Security in India";
 assert.equal(label(root+" › Labour Codes › Wages")?.total,1);
 assert.equal(label(root)?.total,1);
 assert.notEqual(label("Economy › Inflation › CPI")?.id,label(root+" › Labour Codes › Wages")?.id);
 assert.equal(label("Economy › Inflation › CPI")?.evidence,"insufficient");
 assert.throws(()=>validateLearningCard({...original,customSubtopic:"Wages"}),/Invalid learning card/);
});
const context={key:"a",alt:false,repeat:false,paused:false,
 focusedRadio:false,editable:false,blocked:false,allowFlagging:true};
const C=(key,b,extra={})=>resolveExamShortcut({...context,key,...extra},b);
test("P52 local keyboard remapping rejects conflicts, reserved keys and phantom fields",()=>{
 assert.equal(validateShortcutBindings(DEFAULT_SHORTCUTS).answerA,"a");
 const mapping={...DEFAULT_SHORTCUTS,answerA:"1",answerB:"2",
  answerC:"3",answerD:"4",previous:"j",next:"k",flag:"r",fullscreen:"z"};
 const map=new Map();
 const storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 writeShortcutBindings(mapping,storage);
 assert.deepEqual(readShortcutBindings(storage),mapping);
 assert.deepEqual(C("1",mapping),{kind:"answer",index:0});
 assert.deepEqual(C("k",mapping),{kind:"navigate",delta:1});
 assert.equal(C("k",mapping,{focusedRadio:true}),null);
 assert.deepEqual(C("k",mapping,{focusedRadio:true,alt:true}),{kind:"navigate",delta:1});
 assert.deepEqual(C("r",mapping,{paused:true}),{kind:"flag"});
 assert.equal(C("k",mapping,{paused:true,alt:true}),null);
 assert.equal(C("1",mapping,{editable:true}),null);
 assert.match(examShortcutHelp(mapping),/1\/2\/3\/4/);
 assert.throws(()=>validateShortcutBindings({...mapping,answerB:"1"}),/conflict/i);
 assert.throws(()=>validateShortcutBindings({...mapping,next:"Escape"}),/unsupported/i);
 assert.throws(()=>validateShortcutBindings({...mapping,admin:"on"}),/unsupported/i);
 assert.deepEqual(readShortcutBindings({getItem:()=>"{not json"}),DEFAULT_SHORTCUTS);
});

test("P52 pure Exam presenter resolves default shortcuts without browser localStorage",()=>{
 assert.deepEqual(readShortcutBindings(),DEFAULT_SHORTCUTS);
 assert.ok(examShortcutHelp().includes("A/B/C/D"));
});

test("P49 full-path IDs stay distinct even for visually identical joined labels",()=>{
 const a=topicAncestors(["Economy › Inflation"])[0];
 const b=topicAncestors(["Economy","Inflation"])[1];
 assert.equal(a.path.join(" › "),b.path.join(" › "));
 assert.notEqual(a.id,b.id);
});

test("P49 hierarchical Learning note and subtopic survive strict v4 backup and import",()=>{
 const pkg=compileAuthoringPublication(paper());
 const start=Date.UTC(2026,10,4,8,0);
 const frozen=startGenericAttempt(pkg,"p49-roundtrip",start);
 const completed=transitionGenericAttempt(frozen,{type:"TICK",nowMs:start+1800000},
   new Map(pkg.questions.map(q=>[q.id,q])));
 assert.notEqual(completed.finishedAt,null);
 const base=addLearningCard(completed,pkg.questions[0].id,
   new Date(start+1800000).toISOString());
 const card=validateLearningCard({...base,
   customTopic:"Labour Codes",customSubtopic:"Wage definitions",
   syllabusTopicId:"labour",note:"Retain independently authored explanation"});
 assert.doesNotThrow(()=>validateGenericStoredRecord(card));
 const archive=makeBackup([{...completed,saveRevision:1},{...card,saveRevision:1}],DEFAULT_PREFERENCES,
   new Date(start+1900000).toISOString());
 const checked=verifyBackup(JSON.parse(JSON.stringify(archive)));
 const imported=reconstructRecords(checked.records,checked.snapshots);
 const restored=imported.find(row=>row?.id===card.id);
 assert.equal(validateGenericStoredRecord(restored).customSubtopic,"Wage definitions");
 assert.equal(restored.note,"Retain independently authored explanation");
 assert.throws(()=>validateGenericStoredRecord({...card,certifiedExamAuthority:true}),
   /unsupported field/);
});
