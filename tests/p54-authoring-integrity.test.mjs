/** P54 first-principles: publication preflight must mean exact compiler success,
 * section editing is one operation on a section, and real scorer previews policy.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication,inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {authoringSections,setAuthoringSectionMinutes,assignAuthoringQuestionSection} from "../src/authoring/authoring-sections.ts";
import {authoringPublishedPreview,authoringPartialCreditExamples} from "../src/authoring/authoring-preview.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
const P=s=>plainRichDocument(s);
function q(kind,section,answer){
 return {...newAuthoringQuestion(kind),section,answer,prompt:P("Authoring "+kind+" example"),
   options:["Alpha","Beta","Gamma","Delta"].map(P),
   leftItems:["First","Second","Third","Fourth"].map(P),
   rightItems:["One","Two","Three","Four"].map(P)};
}
function draft(){
 const d=newAuthoringDraft();
 return {...d,examId:"apfc",paperId:"p54",title:"Actual six-kind authoring proof",timingKind:"sectional",
  sectionNavigation:"sequential-locked",pausePolicy:"forbidden",allowEarlySubmit:false,
  sectionTransition:"automatic",allowReview:false,questions:[
    {...q("multiple-select","Specialised","A,C"),minSelections:2,maxSelections:3,
      partialCreditEach:1,partialPenaltyEach:0.5,sectionMinutes:15},
    {...q("matching","Specialised","1-C,2-A,3-D,4-B"),partialCreditEach:0.6,
      partialPenaltyEach:0.1,sectionMinutes:15},
    {...q("single-choice","General","B"),sectionMinutes:10},
    {...q("true-false","General","True"),sectionMinutes:10},
    {...q("numeric-entry","General","42"),sectionMinutes:10},
    {...q("free-response","General","Write a rubric"),explanation:P("Model response"),sectionMinutes:10}
  ]};
}
test("P54 authoritative inspector yields the same immutable package the publisher would create",()=>{
 const d=draft(),pre=inspectAuthoringPublication(d);
 assert.equal(pre.valid,true);
 assert.deepEqual(pre.compiled,compileAuthoringPublication(d));
 assert.equal(pre.compiled.paper.timing.kind,"sectional");
 assert.equal(pre.compiled.paper.navigation.allowReview,false);
 assert.deepEqual(pre.compiled.paper.timing.sectionLimits.map(s=>s.durationMs),[900000,600000]);
});
test("P54 inspector handles imported malformed structure as issues, never says Ready",()=>{
 const d=draft(),raw={...d,questions:[{...d.questions[0],subject:"Labour"+String.fromCharCode(10)+"Codes"},...d.questions.slice(1)]};
 const pre=inspectAuthoringPublication(raw);
 assert.equal(pre.valid,false);
 assert.ok(pre.issues.length>=1);
 assert.equal(pre.compiled,undefined);
 assert.throws(()=>compileAuthoringPublication(raw));
});
test("P54 section manager always updates the whole named section, preserving physical section order",()=>{
 const d=draft();
 assert.deepEqual(authoringSections(d).map(s=>({name:s.name,count:s.count,minutes:s.minutes,conflict:s.conflict})),[
  {name:"Specialised",count:2,minutes:15,conflict:false},
  {name:"General",count:4,minutes:10,conflict:false}]);
 const changed=setAuthoringSectionMinutes(d,"Specialised",17);
 assert.deepEqual(changed.questions.slice(0,2).map(q=>q.sectionMinutes),[17,17]);
 assert.deepEqual(changed.questions.slice(2).map(q=>q.sectionMinutes),[10,10,10,10]);
 const moved=assignAuthoringQuestionSection(changed,changed.questions[0].id,"General");
 assert.equal(moved.questions[0].sectionMinutes,10);
 assert.equal(moved.questions[0].section,"General");
 const broken={...d,questions:[d.questions[0],{...d.questions[1],sectionMinutes:12},...d.questions.slice(2)]};
 assert.equal(authoringSections(broken)[0].conflict,true);
 assert.equal(inspectAuthoringPublication(broken).valid,false);
 const repaired=setAuthoringSectionMinutes(broken,"Specialised",20);
 assert.equal(inspectAuthoringPublication(repaired).valid,true);
});
test("P54 real six-kind preview uses frozen question controls, never index-pairs matching answers",()=>{
 const pkg=compileAuthoringPublication(draft());
 for(const q of pkg.questions){
  const html=authoringPublishedPreview(pkg,q.id);
  assert.match(html,/pd-author-preview-content/);
  assert.match(html,/inert/);
  if(q.content.kind==="matching"){
   assert.match(html,/data-match="L1"/);
   assert.match(html,/value="C"/);
   assert.doesNotMatch(html,/First\s*—\s*One/);
   assert.match(html,/Author-only answer key/);
  }else if(q.content.kind==="numeric-entry")assert.match(html,/id="g-number"/);
  else if(q.content.kind==="true-false")assert.match(html,/data-bool="true"/);
  else if(q.content.kind==="free-response")assert.match(html,/id="g-text"/);
  else assert.match(html,/data-choice/);
 }
});
test("P54 partial-credit examples are from actual scoreAttempt, not a second scoring formula",()=>{
 const pkg=compileAuthoringPublication(draft());
 const examples=authoringPartialCreditExamples(pkg);
 assert.ok(examples.length>=2);
 for(const e of examples){
  const q=pkg.questions.find(q=>q.id===e.questionRevisionId);
  const expected=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,[{
    questionRevisionId:e.questionRevisionId,timeSpentMs:0,answerChangeCount:0,response:e.response
  }],"2026-11-04T00:00:00.000Z").items.find(i=>i.questionRevisionId===e.questionRevisionId);
  assert.equal(e.marks,expected.marks);
  assert.equal(e.verdict,expected.verdict);
 }
});
