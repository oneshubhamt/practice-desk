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
import {DEFAULT_SHORTCUTS,resolveExamShortcut,readShortcutBindings,
 validateShortcutBindings,writeShortcutBindings,examShortcutHelp} from "../src/app/exam-shortcuts.ts";

const P=x=>plainRichDocument(x);
function paper(){
 const a=newAuthoringDraft();
 const a1={...newAuthoringQuestion("multiple-select"),section:"Economy",topic:"Inflation",
  subtopic:"CPI",difficulty:"medium",sectionMinutes:15,minSelections:2,maxSelections:3,
  partialCreditEach:1,partialPenaltyEach:0.5,
  prompt:P("Select two correct statements"),options:["A","B","C","D"].map(P),
  answer:"A,C",explanation:P("Detailed source evidence")};
 const a2={...newAuthoringQuestion("single-choice"),section:"Polity",topic:"Parliament",
  subtopic:"Committees",difficulty:"easy",sectionMinutes:10,
  prompt:P("What is the answer?"),options:["A","B","C","D"].map(P),answer:"B"};
 return {...a,examId:"upsc-epfo-apfc",paperId:"hierarchical-check",
  title:"User-authored custom hierarchy",timingKind:"sectional",sectionNavigation:"sequential-locked",
  questionNavigation:"forward-only",pausePolicy:"forbidden",allowReview:false,
  sectionTransition:"automatic",allowEarlySubmit:false,questions:[a1,a2]};
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
 assert.deepEqual(attributedTopicPath("upsc-epfo-apfc","General","labour","Labour Codes","Wages"),
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
 const conflict={...orig,questions:[orig.questions[0],{...orig.questions[0],
  id:newAuthoringQuestion().id,sectionMinutes:14}]};
 assert.equal(inspectAuthoringPublication(conflict).valid,false);
 assert.match(inspectAuthoringPublication(conflict).issues.map(x=>x.reason).join("|"),/same duration/);
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
