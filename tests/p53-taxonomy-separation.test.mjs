/** P53 independent structural regression checks (introduced red BEFORE repair).
 * Exercise the real publisher and completed saved attempts, not a made-up
 * taxonomy demo. A failed assertion is a requirement, not a green fixture.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft} from "../src/authoring/authoring-draft.ts";
import {compileAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {topicAncestors,parseTopicPathId,attributedTopicPath} from "../src/learning/syllabus-taxonomy.ts";
import {topicMetrics,addLearningCard,validateLearningCard} from "../src/learning/learning.ts";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {practiceInventory,composePracticeSet} from "../src/app/practice-compose.ts";
const P=s=>plainRichDocument(s);
const q=(section,subject,topic,subtopic)=>({
 ...newAuthoringQuestion("single-choice"),section,subject,topic,subtopic,
 prompt:P("Knowledge for "+subject+" "+topic),options:["A","B","C","D"].map(P),
 answer:"A"
});
function paper(){
 return {...newAuthoringDraft(),examId:"upsc-epfo-apfc",paperId:"p53-mixed",title:"Mixed subject practice",
  sections:[{name:"General Paper",minutes:15}],questions:[
   {...q("General Paper","", "Labour Codes","Wages"),syllabusHeadingId:"labour"},
   {...q("General Paper","", "Accounting","Ledger"),syllabusHeadingId:"accountancy"},
   {...q("General Paper","", "",""),syllabusHeadingId:"economy"}
  ]};
}
const complete=(pkg,id,ms)=>{
 const t=Date.UTC(2026,10,4,8)+ms;
 const started=startGenericAttempt(pkg,id,t);
 const finished=transitionGenericAttempt(started,{type:"TICK",nowMs:t+125*60000},
   new Map(pkg.questions.map(x=>[x.id,x])));
 assert.ok(finished.finishedAt!==null,"the real paper must have finished");
 return finished;
};
test("P53: mixed APFC subjects remain ONE true exam section with separate semantic roots",()=>{
 const draft=validateAuthoringDraft(paper());
 const compiled=compileAuthoringPublication(draft);
 assert.equal(compiled.paper.sections.length,1);
 assert.equal(compiled.paper.sections[0].title,"General Paper");
 assert.deepEqual(compiled.questions.map(x=>x.content.topicIds?.[0]),[
  ...["labour","accountancy","economy"].map(id=>{
    const headings={
     labour:"Industrial Relations, Labour Codes and Social Security in India",
     accountancy:"Principles of Accountancy, Auditing and Insurance",
     economy:"Developmental Issues and Present Trends in Indian Economy"
    };
    return topicAncestors([headings[id]])[0].id;
  })
 ]);
 assert.deepEqual(compiled.questions[2].content.topicIds,[
  topicAncestors(["Developmental Issues and Present Trends in Indian Economy"])[0].id
 ]);
});
test("P53: author-declared non-APFC subject has no phantom exam section/syllabus inference",()=>{
 const draft={...newAuthoringDraft(),examId:"generic-cat",paperId:"p53-cat",
  title:"CAT mixed practice",sections:[{name:"Full paper",minutes:15}],
  questions:[q("Full paper","Quantitative Aptitude","Ratios",""),
    q("Full paper","Verbal Ability","Reading","Passages")]};
 const pkg=compileAuthoringPublication(draft);
 assert.equal(pkg.paper.sections.length,1);
 assert.deepEqual(pkg.questions[0].content.topicIds,topicAncestors(["Quantitative Aptitude","Ratios"]).map(x=>x.id));
 assert.deepEqual(pkg.questions[1].content.topicIds,topicAncestors(["Verbal Ability","Reading","Passages"]).map(x=>x.id));
});
test("P53: exact source subject selection is validated; unknown APFC or orphaned path fails",()=>{
 assert.throws(()=>validateAuthoringDraft({...paper(),questions:[
  {...paper().questions[0],syllabusHeadingId:"fictitious"}
 ]}),/heading|syllabus/i);
 assert.throws(()=>validateAuthoringDraft({...paper(),questions:[
  {...paper().questions[0],topic:"",subtopic:"Wages"}
 ]}),/subtopic/i);
 assert.throws(()=>validateAuthoringDraft({...paper(),questions:[
  {...paper().questions[0],subject:"Labour"+String.fromCharCode(10)+"Codes",syllabusHeadingId:""}
 ]}),/Invalid|topic/i);
});
test("P53: source-root totals include topicless questions and child subtree filters select correct questions",()=>{
 const pkg=compileAuthoringPublication(paper());
 const finished=complete(pkg,"p53-completed-1",0);
 const metrics=topicMetrics([finished]).filter(x=>x.kind==="hierarchy");
 const root="Developmental Issues and Present Trends in Indian Economy";
 assert.equal(metrics.find(x=>x.label===root)?.total,1);
 const labour="Industrial Relations, Labour Codes and Social Security in India";
 assert.equal(metrics.find(x=>x.label===labour)?.total,1);
 assert.equal(metrics.find(x=>x.label===labour+" › Labour Codes")?.total,1);
 assert.equal(practiceInventory(pkg).topics.find(x=>x.id===topicAncestors([labour])[0].id)?.count,1);
 const subset=composePracticeSet(pkg,{count:1,seed:"taxon42",
  filters:{topicId:topicAncestors([labour])[0].id}}).bundle;
 assert.deepEqual(subset.questions.map(x=>x.questionId),[pkg.questions[0].questionId]);
});
test("P53: distinct underlying question counts cannot inflate with authored revisions and repeat attempts",()=>{
 const base=paper(),first=compileAuthoringPublication(base),second=compileAuthoringPublication({...base,revision:2});
 assert.equal(first.questions[0].questionId,second.questions[0].questionId);
 assert.notEqual(first.questions[0].id,second.questions[0].id);
 const a=complete(first,"p53-edition-1",0);
 const b=complete(second,"p53-edition-2",13000000);
 const c=complete(first,"p53-repeat",26000000);
 const root="Industrial Relations, Labour Codes and Social Security in India";
 const m=topicMetrics([a,b,c]).find(x=>x.kind==="hierarchy"&&x.label===root);
 assert.equal(m.total,3,"three attempt observations must remain separate");
 assert.equal(m.attempts,3);
 assert.equal(m.distinctQuestions,1,"one underlying item despite two immutable revisions");
 assert.equal(m.distinctRevisions,2,"do not erase revision diversity");
});
test("P53: notebook subject is a separate explicit annotation, not exam section",()=>{
 const pkg=compileAuthoringPublication(paper()),finished=complete(pkg,"p53-notebook",0);
 const item=addLearningCard(finished,pkg.questions[0].id,new Date(Date.UTC(2026,10,5)).toISOString());
 assert.throws(()=>validateLearningCard({...item,customTopic:"Labour"+String.fromCharCode(10)+"Codes"}),
   /Invalid learning card/,"untrusted newline must not crash later metrics");
 const card=validateLearningCard({...item,customSubject:"Industrial Relations",
  customTopic:"Trade Unions",customSubtopic:"Recognition",syllabusTopicId:undefined});
 const m=topicMetrics([finished],[card]);
 assert.equal(m.find(x=>x.kind==="hierarchy"&&x.label==="Industrial Relations › Trade Unions › Recognition")?.total,1);
 assert.equal(m.find(x=>x.kind==="hierarchy"&&x.label==="General Paper › Trade Unions › Recognition"),undefined);
});
