/** Canonical product-domain suite. Historical programme files are preserved only as trace comments. */
{
// Merged from tests/p49-p52-enhancements.test.mjs; lexical isolation preserves the original fixture namespace.
/** P49/P50/P52 independent hierarchy, publication and shortcut contracts.
 * Assemble genuine six-kind authored papers and evaluate through actual engine
 * rather than asserting merely that authoring controls exist in HTML.
 */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft}=await import("../src/authoring/authoring-draft.ts");
const {compileAuthoringPublication,inspectAuthoringPublication}=await import("../src/authoring/authoring-publisher.ts");
const {plainRichDocument}=await import("../src/domain/rich-document.ts");
const {validateExamPackage,startGenericAttempt}=await import("../src/app/exam-package.ts");
const {transitionGenericAttempt}=await import("../src/engine/generic-attempt.ts");
const {scoreAttempt}=await import("../src/engine/scoring.ts");
const {topicAncestors,topicPathId,parseTopicPathId,attributedTopicPath}=await import("../src/learning/syllabus-taxonomy.ts");
const {addLearningCard,topicMetrics,validateLearningCard}=await import("../src/learning/learning.ts");
const {makeBackup,verifyBackup}=await import("../src/history/backup.ts");
const {reconstructRecords}=await import("../src/history/shared-store.ts");
const {validateGenericStoredRecord}=await import("../src/app/stored-record-validator.ts");
const {DEFAULT_PREFERENCES}=await import("../src/app/preferences.ts");
const {DEFAULT_SHORTCUTS,resolveExamShortcut,readShortcutBindings,
 validateShortcutBindings,writeShortcutBindings,examShortcutHelp}=await import("../src/app/exam-shortcuts.ts");
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
}

{
// Merged from tests/p53-taxonomy-separation.test.mjs; lexical isolation preserves the original fixture namespace.
/** P53 independent structural regression checks (introduced red BEFORE repair).
 * Exercise the real publisher and completed saved attempts, not a made-up
 * taxonomy demo. A failed assertion is a requirement, not a green fixture.
 */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft}=await import("../src/authoring/authoring-draft.ts");
const {compileAuthoringPublication}=await import("../src/authoring/authoring-publisher.ts");
const {plainRichDocument}=await import("../src/domain/rich-document.ts");
const {topicAncestors,parseTopicPathId,attributedTopicPath}=await import("../src/learning/syllabus-taxonomy.ts");
const {topicMetrics,addLearningCard,validateLearningCard}=await import("../src/learning/learning.ts");
const {startGenericAttempt}=await import("../src/app/exam-package.ts");
const {transitionGenericAttempt}=await import("../src/engine/generic-attempt.ts");
const {practiceInventory,composePracticeSet}=await import("../src/app/practice-compose.ts");
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
}
