/** Canonical product-domain suite. */
import {runJsonCli,inTempDir} from "./fixtures/cli-test-support.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,writeFile,access} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {inspectCandidateIntegrity} from "../src/authoring/candidate-integrity.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";
import {buildInitialAuthoringBrief,validateStandardAuthoringBrief} from "../src/authoring/authoring-brief.ts";

/** Content Blueprints — canonical domain contracts. */
async function registerContentBlueprintsTests(){
/** P60-B RED-first: enforce authored content blueprints without modifying exam or scorer. */
const script=fileURLToPath(new URL("../scripts/content-blueprint.mjs",import.meta.url));
const example=fileURLToPath(new URL("../examples/ai-first-apfc.json",import.meta.url));
const mkPlan=()=>({
 format:"practice-desk-content-blueprint",version:1,id:"apfc-three",examId:"upsc-epfo-apfc",
 paperId:"apfc-schema-example",revision:1,targetCount:3,
 syllabus:{basis:"user-defined",asOfDate:"2026-11-06",reference:"Fixture only; not an official allocation"},
 requirements:{requireTopic:false,requireDifficulty:false,requireExplanation:true,minCitations:0,
  allowedOrigins:["ai-original"],maxTopicSharePercent:100},
 quotas:{
  subjects:{exhaustive:true,targets:[{key:"subject:Industrial Relations, Labour Codes and Social Security in India",count:1},
    {key:"subject:Developmental Issues and Present Trends in Indian Economy",count:1},{key:"subject:Principles of Accountancy, Auditing and Insurance",count:1}]},
  kinds:{exhaustive:true,targets:[{key:"single-choice",count:3}]}
 }
});
const run=(...args)=>runJsonCli(script,args,{timeout:20000,maxBuffer:200000});
const temp=fn=>inTempDir("pd-p60b-",fn);
const write=async(dir,name,value)=>{const p=join(dir,name);await writeFile(p,JSON.stringify(value));return p;};

test("P60-B RED: exact syllabus counts and all specified quotas produce a compact truthful pass",()=>temp(async dir=>{
 const plan=await write(dir,"plan.json",mkPlan());
 const check=run("validate",plan);
 assert.equal(check.status,0,check.stderr);
 assert.equal(check.data.format,"practice-desk-blueprint-validation");
 assert.equal(check.data.valid,true);
 const result=run("audit",plan,example);
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.valid,true);
 assert.equal(result.data.readyForPublication,true);
 assert.equal(result.data.actualCount,3);
 assert.equal(result.data.factualVerification,"not-performed");
 assert.equal(result.data.issues.total,0);
 assert.equal(result.data.coverage.subjects.length,3);
 assert.ok(!result.stdout.includes("Which letter comes"),"No full question text or keys in compact report");
 assert.ok(result.stdout.length<13000);
}));

test("P60-B: answer-position statistics expand to the actual authored option cardinality",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(example,"utf8"));
 src.questions[0].options=["One","Two","Three","Four","Five"];
 src.questions[0].answer="E";
 const input=await write(dir,"five-option.json",src);
 const plan=await write(dir,"five-plan.json",mkPlan());
 const audited=run("audit",plan,input);
 assert.equal(audited.status,0,audited.stderr);
 assert.equal(audited.data.answerPositionCounts.E,1);
 assert.deepEqual(Object.keys(audited.data.answerPositionCounts),["A","B","C","D","E"]);
}));

test("P60-B RED: count mismatch, subject drift, mixed paper and duplicated question IDs are hard failures",()=>temp(async dir=>{
 const base=JSON.parse(await readFile(example,"utf8"));
 const plan=await write(dir,"plan.json",mkPlan());
 const reduced=structuredClone(base);reduced.questions.pop();
 const short=run("audit",plan,await write(dir,"short.json",reduced));
 assert.notEqual(short.status,0);
 assert.ok(short.data.issues.items.some(x=>x.code==="target-count"||x.code==="quota-mismatch"));
 const drift=structuredClone(base);drift.questions[0].subject="Developmental Issues and Present Trends in Indian Economy";
 const wrong=run("audit",plan,await write(dir,"wrong.json",drift));
 assert.notEqual(wrong.status,0);
 assert.ok(wrong.data.issues.items.some(x=>x.code==="quota-mismatch"));
 const other=structuredClone(base);other.bankId="b2";other.paperId="another-paper";other.questions[0].id="new-1";
 const mixed=run("audit",plan,example,await write(dir,"other.json",other));
 assert.notEqual(mixed.status,0);
 assert.ok(mixed.data.issues.items.some(x=>x.code==="paper-mismatch"));
 const dup=structuredClone(base);dup.bankId="another-bank";
 const duplicated=run("audit",plan,example,await write(dir,"dup.json",dup));
 assert.notEqual(duplicated.status,0);
 assert.ok(duplicated.data.issues.items.some(x=>x.code==="duplicate-question-id"));
}));

test("P60-B RED: untrusted cognitive labels require a complete separate sidecar, never inferred",()=>temp(async dir=>{
 const planObj=mkPlan();
 planObj.quotas.cognitive={exhaustive:true,targets:[{key:"recall",count:1},{key:"application",count:2}]};
 const plan=await write(dir,"plan.json",planObj);
 const absent=run("audit",plan,example);
 assert.notEqual(absent.status,0);
 assert.ok(absent.data.issues.items.some(x=>x.code==="cognitive-tags-missing"));
 const cognitive={format:"practice-desk-cognitive-tags",version:1,tags:[
  {bankId:"apfc-schema-example",questionId:"labour-01",level:"recall"},
  {bankId:"apfc-schema-example",questionId:"economy-01",level:"application"},
  {bankId:"apfc-schema-example",questionId:"account-01",level:"application"}
 ]};
 const tags=await write(dir,"tags.json",cognitive);
 const good=run("audit",plan,example,"--cognitive",tags);
 assert.equal(good.status,0,good.stderr);
 assert.equal(good.data.coverage.cognitive.find(x=>x.key==="application").actual,2);
 assert.equal(good.data.cognitiveVerification,"author-attributed-not-independently-verified");
 const corrupted=structuredClone(cognitive);corrupted.tags[2].questionId="missing";
 const bad=run("audit",plan,example,"--cognitive",await write(dir,"corrupted.json",corrupted));
 assert.notEqual(bad.status,0);
 assert.ok(bad.data.issues.items.some(x=>x.code==="cognitive-tag-unknown"||x.code==="cognitive-tag-missing"));
}));

test("P60-B RED: contradicted blueprint, impossible allocations, unsupported fields and false official claims fail closed",()=>temp(async dir=>{
 for(const mutate of [
  p=>{p.targetCount=2;},
  p=>{p.quotas.subjects.targets[1].key="subject:Industrial Relations, Labour Codes and Social Security in India";},
  p=>{p.quotas.subjects.targets[0].count=4;},
  p=>{p.quotas.subjects.targets[0].key="not-a-valid-subject-key";},
  p=>{p.fakeVerified=true;},
  p=>{p.syllabus.basis="official-confirmed";},
  p=>{p.requirements.allowedOrigins=["verified-pyq"];},
  p=>{p.paperRules={tools:{calculator:"scientific-v9"}};},
  p=>{p.paperRules={practiceModes:["strict","strict"]};},
  p=>{p.paperRules={scoring:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:3}};}
 ]){
  const p=mkPlan();mutate(p);
  const file=await write(dir,"broken-"+Math.random()+".json",p);
  const r=run("validate",file);
  assert.notEqual(r.status,0);
  assert.equal(r.data.valid,false);
 }
}));

test("P60-B RED: requirements, audited metadata, quota enforcement and honest nonverification",()=>temp(async dir=>{
 const planObj=mkPlan();
 planObj.requirements.requireTopic=true;
 planObj.requirements.requireDifficulty=true;
 planObj.requirements.minCitations=1;
 const plan=await write(dir,"plan.json",planObj);
 const r=run("audit",plan,example);
 assert.notEqual(r.status,0);
 assert.ok(r.data.issues.total>=4);
 assert.ok(r.data.issues.items.some(x=>x.code==="topic-required"));
 assert.ok(r.data.issues.items.some(x=>x.code==="difficulty-required"));
 assert.ok(r.data.issues.items.some(x=>x.code==="citations-required"));
 assert.equal(r.data.factualVerification,"not-performed");
 assert.equal(r.data.readyForPublication,false);
}));

test("P60-B: explicitly permitted partial batches disclose remaining targets without pretending complete coverage",()=>temp(async dir=>{
 const planObj=mkPlan();planObj.targetCount=4;planObj.allowPartial=true;
 planObj.quotas.subjects.exhaustive=false;planObj.quotas.kinds.exhaustive=false;
 const plan=await write(dir,"partial.json",planObj);
 const p=run("validate",plan);
 assert.equal(p.status,0,p.stderr);
 const r=run("audit",plan,example);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.valid,true);
 assert.equal(r.data.readyForPublication,false);
 assert.equal(r.data.actualCount,3);
 assert.equal(r.data.partialDeliveryAllowed,true);
 assert.equal(r.data.partialDelivery,true);
 assert.equal(r.data.remainingCount,1);
}));

test("P60-B RED: audit reports no keys/base64 and rejects unsupported input/flags",()=>temp(async dir=>{
 const plan=await write(dir,"plan.json",mkPlan());
 for(const args of [["audit",plan],["audit",plan,example,"--secret","x"],["validate",plan,"extra"],["invalid",plan]]){
  const r=run(...args);
  assert.notEqual(r.status,0);
  assert.equal(r.data.valid,false);
 }
 const r=run("audit",plan,example,"--limit","1");
 assert.equal(r.status,0);
 assert.equal(r.data.issues.limit,1);
}));


test("P60-B: canonical compiler optionally gates exact single-source publication while structural validation remains explicit",()=>temp(async dir=>{
 const plan=await write(dir,"plan.json",mkPlan());
 const source=await write(dir,"source.json",JSON.parse(await readFile(example,"utf8")));
 const out=join(dir,"compiled.json");
 const cli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
 const compile=(...args)=>{
  const x=spawnSync(process.execPath,[cli,...args],{encoding:"utf8",timeout:30000,maxBuffer:250000});
  assert.equal(x.error,undefined,String(x.error));
  return {...x,data:JSON.parse(x.stdout||x.stderr)};
 };
 const ok=compile("compile-bank",source,out,"--blueprint",plan);
 assert.equal(ok.status,0,ok.stderr);
 assert.equal(ok.data.blueprint.valid,true);
 const frozen=JSON.parse(await readFile(out,"utf8"));
 assert.equal(frozen.format,"practice-desk-exam");
 const badPlan=mkPlan();badPlan.quotas.subjects.targets[0].count=0;
 badPlan.quotas.subjects.exhaustive=false;
 const badFile=await write(dir,"bad.json",badPlan);
 const blocked=compile("compile-bank",source,join(dir,"blocked.json"),"--blueprint",badFile);
 assert.notEqual(blocked.status,0);
 assert.equal(blocked.data.compiled,false);
 assert.equal(blocked.data.blueprint.valid,false);
 await assert.rejects(readFile(join(dir,"blocked.json"),"utf8"));
 const structural=compile("validate-bank",source);
 assert.equal(structural.status,0,"Structural validation remains available without a blueprint");
}));

test("P60-B: parent-child allocation contradictions are rejected at plan time, not silently audited",()=>temp(async dir=>{
 for(const mut of [
  p=>{p.quotas.topics={targets:[{subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"A",count:2}]};},
  p=>{p.quotas.subtopics={targets:[{subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"A",subtopic:"B",count:2}]};},
  p=>{p.quotas.topics={exhaustive:true,targets:[{subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"A",count:3}]};}
 ]){
  const p=mkPlan();mut(p);
  const r=run("validate",await write(dir,"contradiction-"+Math.random()+".json",p));
  assert.notEqual(r.status,0);
 }
}));

test("P60-B: explicitly requested paper rules must match actual scoring, timers and navigation",()=>temp(async dir=>{
 const p=mkPlan();const src=JSON.parse(await readFile(example,"utf8"));
 p.paperRules={scoring:structuredClone(src.scoring),timing:structuredClone(src.timing),
  navigation:structuredClone(src.navigation)};
 const plan=await write(dir,"plan.json",p);
 assert.equal(run("audit",plan,example).status,0);
 p.paperRules.scoring.correctMarks=100;
 const wrong=run("audit",await write(dir,"wrong.json",p),example);
 assert.notEqual(wrong.status,0);
 assert.ok(wrong.data.issues.items.some(x=>x.code==="paper-policy-mismatch"));
}));


test("P60-B: separate coherent source batches meet an exact aggregate blueprint without flattening exam sections",()=>temp(async dir=>{
 const raw=JSON.parse(await readFile(example,"utf8"));
 const a=structuredClone(raw),b=structuredClone(raw);
 a.bankId="apfc-first-batch";a.questions=raw.questions.slice(0,2);
 b.bankId="apfc-next-batch";b.questions=raw.questions.slice(2);
 const plan=await write(dir,"plan.json",mkPlan());
 const r=run("audit",plan,await write(dir,"batch-a.json",a),await write(dir,"batch-b.json",b));
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.actualCount,3);
 assert.equal(r.data.sourceCount,2);
 assert.equal(r.data.batches.length,2);
 assert.equal(r.data.readyForPublication,true);
 assert.equal(r.data.coverage.subjects.every(x=>x.actual===x.target),true);
 assert.ok(r.data.blueprintSha256?.length===64);
}));

test("P60-B: combined sibling topic targets cannot exceed a parent allocation",()=>temp(async dir=>{
 const p=mkPlan();
 p.quotas.topics={targets:[{subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"Wages",count:1},
  {subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"Disputes",count:1}]};
 const bad=run("validate",await write(dir,"parent.json",p));
 assert.notEqual(bad.status,0);
 assert.match(bad.data.message,/Combined topic allocations exceed/);
}));

test("P60-B: actual category inventory remains paged and available even without exact quotas",()=>temp(async dir=>{
 const p=mkPlan();
 delete p.quotas.subjects;
 const plan=await write(dir,"plan.json",p);
 const out=run("audit",plan,example);
 assert.equal(out.status,0,out.stderr);
 assert.equal(out.data.observed.subjects.totalCategories,3);
 assert.equal(out.data.observed.subjects.shown.length,3);
 assert.equal(out.data.factualVerification,"not-performed");
}));


test("P60-B: same versioned blueprint contract works for CAT's separate physical sections and semantic subjects",()=>{
 const catPlan=fileURLToPath(new URL("../examples/p60b-cat-blueprint.json",import.meta.url));
 const catSource=fileURLToPath(new URL("../examples/ai-first-cat.json",import.meta.url));
 const v=run("validate",catPlan);
 assert.equal(v.status,0,v.stderr);
 const r=run("audit",catPlan,catSource);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.actualCount,3);
 assert.equal(r.data.coverage.subjects.length,3);
 assert.equal(r.data.coverage.sections.length,3);
 assert.equal(r.data.coverage.kinds.length,3);
 assert.equal(r.data.factualVerification,"not-performed");
});


test("P60-B: agents can page errors without loading 200 questions and coverage output is bounded",()=>temp(async dir=>{
 const p=mkPlan();
 p.requirements.requireTopic=true;
 p.requirements.requireDifficulty=true;
 p.requirements.minCitations=1;
 p.quotas.topics={exhaustive:false,targets:Array.from({length:20},(_,i)=>({
  subjectKey:"subject:Industrial Relations, Labour Codes and Social Security in India",topic:"Synthetic unrequested "+i,count:0
 }))};
 const plan=await write(dir,"pages.json",p);
 const first=run("audit",plan,example,"--offset","0","--limit","1");
 const second=run("audit",plan,example,"--offset","1","--limit","1");
 assert.notEqual(first.status,0);
 assert.notEqual(second.status,0);
 assert.equal(first.data.issues.total,second.data.issues.total);
 assert.equal(first.data.issues.nextOffset,1);
 assert.equal(second.data.issues.offset,1);
 assert.notDeepEqual(first.data.issues.items,second.data.issues.items);
 assert.equal(first.data.coverage.topics.length,12);
 assert.equal(first.data.coverageSummary.topics.remainingTargets,8);
 assert.ok(first.stdout.length<18000,"metadata-only audit should remain small");
 const bad=run("audit",plan,example,"--offset","-1");
 assert.notEqual(bad.status,0);
 assert.equal(bad.data.code,"blueprint-input-invalid");
}));

test("Authoring brief: new-bank packet is compact, single-agent compatible and contains decisions rather than repository plumbing",()=>temp(async dir=>{
 const p=mkPlan();
 p.paperRules={
  scoring:{correctMarks:2.5,incorrectMarks:-0.8333333333333334},
  timing:{kind:"whole-paper",minutes:10,pausePolicy:"allowed"},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  sections:[{id:"combined",title:"Combined Examination"}]
 };
 const plan=await write(dir,"brief-plan.json",p);
 const result=run("brief",plan,"--bank-id","apfc-next-batch","--title","APFC next authoring batch","--batch-size","2");
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.format,"practice-desk-authoring-brief");
 assert.equal(result.data.valid,true);
 assert.deepEqual(result.data.workflow,{singleAgentCompatible:true,multipleAgentsRequired:false});
 assert.equal(result.data.task.targetCount,3);
 assert.equal(result.data.task.alreadyAuthored,0);
 assert.equal(result.data.task.remainingCount,3);
 assert.equal(result.data.task.requestedNow,2);
 assert.deepEqual(result.data.task.suggestedQuestionIds,["apfc-next-batch-q01","apfc-next-batch-q02"]);
 assert.equal(result.data.outputContract.sourceEnvelope.format,"practice-desk-authoring");
 assert.equal(result.data.outputContract.sourceEnvelope.bankId,"apfc-next-batch");
 assert.equal(result.data.outputContract.sourceEnvelope.questions,undefined);
 assert.ok(result.data.priorityDeficits.some(x=>x.group==="subjects"&&x.remaining===1));
 assert.ok(result.data.priorityDeficits.some(x=>x.group==="kinds"&&x.remaining===3));
 assert.equal(result.data.learnerFocusIncluded,false);
 assert.equal(result.data.factualVerification,"not-performed");
 assert.ok(!result.stdout.includes("question-banks/"));
 assert.ok(!result.stdout.includes("package.exam.json"));
 assert.ok(!result.stdout.includes("Which letter comes second"));
 assert.ok(result.stdout.length<12000,"brief must stay decision-ready rather than becoming a source-tree dump");
}));

test("Pass 4: taxonomy-aware PFRDA brief exposes data-owned A-L nodes and rejects out-of-taxonomy authoring",()=>temp(async dir=>{
 const taxonomy=fileURLToPath(new URL("../question-banks/pfrda/2026/taxonomy.json",import.meta.url));
 const base=JSON.parse(await readFile(example,"utf8"));
 base.bankId="pfrda-taxonomy-fixture";base.examId="pfrda-grade-a-2026-phase-ii";
 base.paperId="pfrda-taxonomy-fixture";base.title="PFRDA taxonomy fixture";base.revision=1;
 base.questions=[structuredClone(base.questions[0])];
 base.questions[0].id="pfrda-act-01";base.questions[0].subject="PFRDA Act";
 delete base.questions[0].topic;
 const source=await write(dir,"pfrda-source.json",base);
 const planObj={format:"practice-desk-content-blueprint",version:1,id:"pfrda-taxonomy-one",
  examId:base.examId,paperId:base.paperId,revision:1,targetCount:1,allowPartial:false,
  taxonomyId:"pfrda-grade-a-2026-general",
  syllabus:{basis:"official-source-attributed",asOfDate:"2026-09-03",
   reference:"PFRDA Advertisement No. 03/2026 syllabus fixture"},
  paperRules:{scoring:structuredClone(base.scoring),timing:structuredClone(base.timing),
   navigation:structuredClone(base.navigation),sections:structuredClone(base.sections)},
  requirements:{requireTaxonomy:true,requireExplanation:true,allowedOrigins:["ai-original"]},
  quotas:{subjects:{exhaustive:true,targets:[{key:"taxonomy:pfrda-act",count:1}]},
   kinds:{exhaustive:true,targets:[{key:"single-choice",count:1}]},
   origins:{exhaustive:true,targets:[{key:"ai-original",count:1}]}}};
 const plan=await write(dir,"pfrda-plan.json",planObj);
 const validated=run("validate",plan,"--taxonomy",taxonomy);
 assert.equal(validated.status,0,validated.stderr);
 assert.equal(validated.data.taxonomyId,"pfrda-grade-a-2026-general");
 const audited=run("audit",plan,source,"--taxonomy",taxonomy);
 assert.equal(audited.status,0,audited.stderr);
 assert.equal(audited.data.readyForPublication,true);
 assert.equal(audited.data.coverage.subjects[0].actual,1);
 const brief=run("brief",plan,"--taxonomy",taxonomy,"--bank-id","pfrda-next","--title","PFRDA next","--batch-size","1");
 assert.equal(brief.status,0,brief.stderr);
 assert.equal(brief.data.taxonomy.id,"pfrda-grade-a-2026-general");
 assert.equal(brief.data.taxonomyScope.totalNodes,142);
 assert.ok(brief.data.taxonomyScope.includedNodes<142,"batch brief must not embed the full exam taxonomy");
 assert.ok(brief.data.taxonomyScope.omittedNodes>0);
 assert.deepEqual(brief.data.taxonomyScope.selectedRootIds,["pfrda-act"]);
 assert.ok(brief.data.taxonomy.nodes.some(x=>x.id==="pfrda-act"&&x.code==="A"));
 assert.equal(brief.data.taxonomy.nodes.some(x=>x.id==="marketing-communication"),false,
  "irrelevant distant syllabus roots should stay out of a one-question batch brief");
 assert.equal(brief.data.classification.requireTaxonomy,true);
 assert.equal(brief.data.classification.taxonomyAssignmentPolicy,"deepest-defensible");
 assert.equal(brief.data.classification.difficultyAssignmentPolicy,"when-defensible");
 assert.ok(brief.stdout.length<12000,"taxonomy-backed authoring brief should remain decision-ready");
 const cli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
 const output=join(dir,"pfrda-taxonomy.exam.json");
 const compiled=spawnSync(process.execPath,[cli,"compile-bank",source,output,
  "--blueprint",plan,"--taxonomy",taxonomy],{encoding:"utf8",timeout:30000,maxBuffer:250000});
 assert.equal(compiled.status,0,compiled.stderr||compiled.stdout);
 const runtime=JSON.parse(await readFile(output,"utf8"));
 assert.equal(runtime.taxonomy.id,"pfrda-grade-a-2026-general");
 assert.equal(Object.keys(runtime.taxonomyAssignments).length,1);
 assert.equal(runtime.taxonomyAssignments[runtime.questions[0].id],"pfrda-act");
 const drift=structuredClone(base);drift.questions[0].subject="Invented Off-Syllabus Root";
 const bad=run("audit",plan,await write(dir,"drift.json",drift),"--taxonomy",taxonomy,"--limit","20");
 assert.notEqual(bad.status,0);
 assert.ok(bad.data.issues.items.some(x=>x.code==="taxonomy-classification-required"));
}));

test("Authoring Brief shared contract rejects shallow lookalikes and browser-native first-batch generation matches it",()=>temp(async dir=>{
 const blueprintPath=fileURLToPath(new URL("../question-banks/pfrda/2026/mocks/day-01/revised/blueprint.json",import.meta.url));
 const taxonomyPath=fileURLToPath(new URL("../question-banks/pfrda/2026/taxonomy.json",import.meta.url));
 const blueprintRaw=await readFile(blueprintPath,"utf8"),blueprint=JSON.parse(blueprintRaw);
 const taxonomy=JSON.parse(await readFile(taxonomyPath,"utf8"));
 const brief=buildInitialAuthoringBrief(blueprint,blueprintRaw,{
  bankId:"browser-native-pfrda",title:"Browser native PFRDA batch",batchSize:2,taxonomy
 });
 assert.deepEqual(validateStandardAuthoringBrief(brief),brief);
 assert.equal(brief.task.alreadyAuthored,0);
 assert.equal(brief.task.requestedNow,2);
 assert.ok(brief.taxonomyScope.includedNodes<brief.taxonomyScope.totalNodes);
 assert.equal(brief.classification.taxonomyAssignmentPolicy,"deepest-defensible");
 assert.throws(()=>validateStandardAuthoringBrief({
  format:"practice-desk-authoring-brief",version:1,valid:true,
  blueprint:{id:"shallow",examId:blueprint.examId},task:{remainingCount:2},
  paper:{source:"not-a-paper-contract"},outputContract:{sourceEnvelope:{}},learnerFocusIncluded:false
 }),/blueprint|Authoring Brief|sha256|unsupported/i);
}));


test("Authoring brief: existing partial batches contribute only compact coverage and preserve exact paper envelope",()=>temp(async dir=>{
 const p=mkPlan();
 p.paperRules={
  scoring:{correctMarks:2.5,incorrectMarks:-0.8333333333333334},
  timing:{kind:"whole-paper",minutes:10,pausePolicy:"allowed"},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  sections:[{id:"combined",title:"Combined Examination"}]
 };
 const source=JSON.parse(await readFile(example,"utf8"));
 source.questions=source.questions.slice(0,1);
 source.tools={wordCount:"auto"};
 const plan=await write(dir,"partial-brief-plan.json",p);
 const input=await write(dir,"partial-source.json",source);
 const result=run("brief",plan,input,"--bank-id","apfc-batch-2","--title","APFC batch 2","--batch-size","8");
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.task.alreadyAuthored,1);
 assert.equal(result.data.task.remainingCount,2);
 assert.equal(result.data.task.requestedNow,2);
 assert.deepEqual(result.data.task.suggestedQuestionIds,["apfc-batch-2-q01","apfc-batch-2-q02"]);
 assert.equal(result.data.outputContract.sourceEnvelope.tools.wordCount,"auto");
 assert.equal(result.data.outputContract.sourceEnvelope.bankId,"apfc-batch-2");
 assert.equal(result.data.outputContract.sourceEnvelope.questions,undefined);
 assert.ok(!result.stdout.includes(source.questions[0].prompt));
 const duplicate=run("brief",plan,input,"--bank-id",source.bankId,"--title","Duplicate");
 assert.notEqual(duplicate.status,0);
 assert.match(duplicate.data.message,/bank-id.*new/i);
}));

test("Authoring brief: first-batch envelope preserves full generic paper capabilities and is canonically parseable",()=>temp(async dir=>{
 const p=mkPlan();
 p.paperRules={
  scoring:{
   correctMarks:3,incorrectMarks:-1,unansweredMarks:0,decimalPlaces:2,
   byQuestionKind:{"free-response":{correctMarks:10,incorrectMarks:0,unansweredMarks:0}}
  },
  timing:{kind:"whole-paper",minutes:30,pausePolicy:"forbidden",sectionTransition:"manual",allowEarlySubmit:true},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  tools:{calculator:"basic-v1",wordCount:"auto"},
  practiceModes:["strict","free"],
  sections:[{id:"combined",title:"Combined",scoringOverride:{correctMarks:3,incorrectMarks:-1,unansweredMarks:0}}]
 };
 const plan=await write(dir,"full-paper-brief.json",p);
 const result=run("brief",plan,"--bank-id","generic-batch","--title","Generic batch","--batch-size","3");
 assert.equal(result.status,0,result.stderr);
 assert.deepEqual(result.data.paper.scoring,p.paperRules.scoring);
 assert.deepEqual(result.data.paper.tools,p.paperRules.tools);
 assert.deepEqual(result.data.paper.practiceModes,p.paperRules.practiceModes);
 assert.deepEqual(result.data.paper.sections,p.paperRules.sections);
 assert.deepEqual(result.data.outputContract.sourceEnvelope.scoring,p.paperRules.scoring);
 assert.deepEqual(result.data.outputContract.sourceEnvelope.tools,p.paperRules.tools);
 assert.deepEqual(result.data.outputContract.sourceEnvelope.practiceModes,p.paperRules.practiceModes);
 assert.equal(result.data.itemWritingPriorities.length,5);
}));

test("Authoring brief: deficit accounting stays exact beyond the ordinary audit display bound",()=>temp(async dir=>{
 const p=mkPlan();
 p.targetCount=13;
 p.quotas={
  subjects:{exhaustive:true,targets:Array.from({length:13},(_,i)=>({key:"subject:S"+i,count:1}))},
  topics:{exhaustive:true,targets:Array.from({length:13},(_,i)=>({subjectKey:"subject:S"+i,topic:"T"+i,count:1}))},
  kinds:{exhaustive:true,targets:[{key:"single-choice",count:13}]}
 };
 p.paperRules={
  scoring:{correctMarks:2,incorrectMarks:-0.5},
  timing:{kind:"whole-paper",minutes:20,pausePolicy:"allowed"},
  sections:[{id:"combined",title:"Combined"}]
 };
 const plan=await write(dir,"large-brief-plan.json",p);
 const result=run("brief",plan,"--bank-id","large-batch","--title","Large batch","--batch-size","8");
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.task.remainingCount,13);
 assert.equal(result.data.priorityDeficits.length,24);
 assert.ok(result.data.priorityDeficits.some(x=>x.group==="kinds"),
  "Bounded brief must not let large subject/topic lists hide another active quota dimension");
 assert.equal(result.data.deficitSummary.shown,24);
 assert.equal(result.data.deficitSummary.remaining,3,
  "13 subject + 13 topic + 1 kind deficits should be counted even though ordinary audit displays only 12 rows per group");
 assert.deepEqual(result.data.deficitSummary.byGroup.kinds,{total:1,shown:1,remaining:0});
 assert.equal(result.data.deficitSummary.byGroup.subjects.total,13);
 assert.equal(result.data.deficitSummary.byGroup.topics.total,13);
}));

test("Authoring brief: bootstrap requires explicit identity and enough paper rules; authoring constraints fail closed",()=>temp(async dir=>{
 const p=mkPlan();
 const plan=await write(dir,"no-rules.json",p);
 const noIdentity=run("brief",plan);
 assert.notEqual(noIdentity.status,0);
 assert.match(noIdentity.data.message,/bank-id|title/i);
 const noRules=run("brief",plan,"--bank-id","new-bank","--title","New bank");
 assert.notEqual(noRules.status,0);
 assert.match(noRules.data.message,/paperRules/i);
 const badBatch=run("brief",plan,"--bank-id","new-bank","--title","New bank","--batch-size","21");
 assert.notEqual(badBatch.status,0);
 assert.match(badBatch.data.message,/Batch size/i);
}));

// P62-A: structural partial validity must not be confused with a final compiled bank.
test("P62-A partial blueprint passes read-only validation but blocks final compiler output",()=>temp(async dir=>{
 const p=mkPlan();p.targetCount=4;p.allowPartial=true;
 p.quotas.subjects.exhaustive=false;p.quotas.kinds.exhaustive=false;
 const plan=await write(dir,"partial-p62.json",p);
 const source=await write(dir,"source-p62.json",JSON.parse(await readFile(example,"utf8")));
 const cli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
 const exec=(...args)=>{
  const r=spawnSync(process.execPath,[cli,...args],{encoding:"utf8",timeout:30000});
  assert.equal(r.error,undefined,String(r.error));
  return {...r,data:JSON.parse(r.stdout||r.stderr)};
 };
 const reviewed=exec("validate-bank",source,"--blueprint",plan);
 assert.equal(reviewed.status,0,reviewed.stderr);
 assert.equal(reviewed.data.valid,true);
 assert.equal(reviewed.data.readyForPublication,false);
 assert.equal(reviewed.data.blueprint.valid,true);
 assert.equal(reviewed.data.blueprint.readyForPublication,false);
 const out=join(dir,"MUST-NOT-EXIST.exam.json");
 const published=exec("compile-bank",source,out,"--blueprint",plan);
 assert.notEqual(published.status,0);
 assert.equal(published.data.valid,true);
 assert.equal(published.data.readyForPublication,false);
 assert.equal(published.data.compiled,false);
 assert.equal(published.data.blueprint.valid,true);
 assert.equal(published.data.blueprint.readyForPublication,false);
 await assert.rejects(readFile(out,"utf8"));
}));
}
await registerContentBlueprintsTests();


/** Candidate Secrecy — canonical domain contracts. */
async function registerCandidateSecrecyTests(){
/** P60-C RED: candidate-visible hint leakage and externally performed quality evidence. */
const tool=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const cli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
const apfc=fileURLToPath(new URL("../examples/ai-first-apfc.json",import.meta.url));
const cat=fileURLToPath(new URL("../examples/ai-first-cat.json",import.meta.url));
const sha=s=>createHash("sha256").update(s).digest("hex");
const command=(script,...args)=>runJsonCli(script,args,{timeout:30000,maxBuffer:1024*1024});
const temp=f=>inTempDir("pd-p60c-",f);
const write=async(dir,name,data)=>{const path=join(dir,name);await writeFile(path,JSON.stringify(data));return path;};
const semanticContract=()=>command(tool,"checklist").data.layers.semantic.checklist;
const bankContract=()=>command(tool,"checklist").data.layers.bank.checklist;
const semanticPass=(id,math=false)=>({id,status:"pass",
 basis:id==="mathematical-correctness"||id==="factual-correctness"&&math?"mathematical-proof":
  ["factual-correctness","temporal-correctness","pyq-fidelity"].includes(id)?"source-consulted":
  id==="visual-integrity"?"rendered-claim":"semantic-editorial",
 rationale:"Synthetic regression assertion only; it does not authenticate content."});
const completeLayeredReview=(src,pack,{mathIds=[],legalIds=[],timeIds=[],visualIds=[],asOfDates={},
 reviewMode="self-review",candidateOnlyContextClaim=reviewMode!=="self-review"}={})=>{
 const math=new Set(mathIds),legal=new Set(legalIds),time=new Set(timeIds),visual=new Set(visualIds);
 const semantic=semanticContract();
 return {format:"practice-desk-quality-review",version:3,bankId:src.bankId,sourceSha256:pack.sourceSha256,
  reviewMode,candidateOnlyContextClaim,reviewer:{id:"synthetic-quality-fixture",kind:"ai"},
  records:pack.items.map(item=>{
   const q=src.questions.find(x=>x.id===item.questionId),m=math.has(q.id),l=legal.has(q.id),t=time.has(q.id),v=visual.has(q.id);
   const ids=new Set(["exam-relevance","clarity-defensibility","reasoning-correctness","factual-correctness","explanation-quality"]);
   if(["single-choice","multiple-select"].includes(q.kind))ids.add("distractor-quality");
   if(m)ids.add("mathematical-correctness");if(l||t)ids.add("temporal-correctness");
   if(q.provenance?.kind==="official-pyq")ids.add("pyq-fidelity");if(v)ids.add("visual-integrity");
   const asOfDate=asOfDates[q.id]??null;
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),candidateSha256:item.candidateSha256,
    applicability:{mathematical:m?"yes":"no",legal:l?"yes":"no",timeSensitive:t?"yes":"no",visual:v?"yes":"no",asOfDate},
    solution:{status:"completed",answer:String(q.answer),
     reasoning:"Synthetic second-pass reasoning for software regression only."},
    semanticChecks:semantic.filter(x=>ids.has(x.id)).map(x=>semanticPass(x.id,m)),
    evidence:[{publisher:"Synthetic fixture",title:"Regression evidence",locator:"item:"+q.id,
     retrievedAt:"2026-11-06",...(asOfDate?{asOfDate}:{}),excerpt:"Software contract fixture; not independently authenticated."}]};
  }),
  bankReview:{checks:bankContract().map(x=>({id:x.id,status:"pass",basis:"bank-editorial",
   rationale:"Synthetic bank-level regression assertion only."}))}
 };
};


test("P60-C: all authoring paths block explicit answers hidden in private rich passages or shared rich media text",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 const draft=structuredClone(toAuthoringDraft(source));
 const textBlock=t=>({format:"practice-desk-rich",version:1,blocks:[{type:"paragraph",content:[{type:"text",text:t}]}]});
 // Direct Wordgard authoring may supply a private passage rather than a v1 stimulus.
 draft.questions[0].passage=textBlock("Correct answer: A");
 let issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field==="passage"));
 const denied=inspectAuthoringPublication(draft);
 assert.equal(denied.valid,false);
 assert.ok(denied.issues.some(x=>x.field.includes("Candidate view")&&x.reason.includes("explicit answer")));
 draft.questions[0].passage=textBlock("Unrelated passage.");
 // The rendered rich text, not only its plain-text fallback, can contain a leak.
 const passage=draft.stimuli.find(x=>x.kind==="passage"||x.kind==="case");
 assert.ok(passage);
 passage.text="Visible fallback contains no answer labels";
 passage.richText=textBlock("Correct answer: A");
 issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field==="stimulus.richText"));
 assert.equal(inspectAuthoringPublication(draft).valid,false);
 // Shared Wordgard tables and rich chart captions must also be inspected.
 draft.questions[0].stimulusRef="table-rich";
 draft.stimuli.push({id:"table-rich",kind:"table",columns:["Safe heading"],rows:[["Safe cell"]],
  richColumns:[textBlock("Correct answer: A")],richRows:[[textBlock("Unrelated cell")]]});
 issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field.startsWith("stimulus.richColumns")));
});
test("P60 full QA: explicit choice/answer markers are blocked but legitimate checkmark symbols remain choices",async()=>{
 const original=JSON.parse(await readFile(apfc,"utf8"));
 const marked=structuredClone(original);
 marked.questions[0].options[0]+=" (correct)";
 assert.ok(inspectExternalQuestionBank(marked).issues.some(x=>x.code==="candidate-answer-leak"));
 const exposed=structuredClone(original);
 exposed.questions[0].prompt="Correct choice: B";
 assert.ok(inspectExternalQuestionBank(exposed).issues.some(x=>x.code==="candidate-answer-leak"));
 const legitimate=structuredClone(original);
 legitimate.questions[0].options[0]="A check mark (✓)";
 assert.ok(!inspectExternalQuestionBank(legitimate).issues.some(x=>x.code==="candidate-answer-leak"));
});
test("P60-C RED: explicit answer labels in actual candidate stems fail canonical existing publisher",async()=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].prompt="Which letter is second? Correct answer: B";
 const report=inspectExternalQuestionBank(src);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"&&x.severity==="error"));
 const answerInExplanation=JSON.parse(await readFile(apfc,"utf8"));
 answerInExplanation.questions[0].explanation="The correct answer is B; A and C are wrong.";
 assert.equal(inspectExternalQuestionBank(answerInExplanation).valid,true,"Author-only explanations are allowed");
});
test("P60-C RED: misleading option markers, shared stimulus leakage and answer-giving alt metadata fail",async()=>{
 const catSource=JSON.parse(await readFile(cat,"utf8"));
 catSource.questions[0].options[0]="✓ A library replaces its catalogue.";
 assert.ok(inspectExternalQuestionBank(catSource).issues.some(x=>x.code==="candidate-answer-leak"));
 const stimulus=JSON.parse(await readFile(cat,"utf8"));
 stimulus.stimuli[0].text+=" Correct answer: A";
 assert.ok(inspectExternalQuestionBank(stimulus).issues.some(x=>x.code==="candidate-answer-leak"));
 const subtle=JSON.parse(await readFile(apfc,"utf8"));
 subtle.questions[0].prompt="A number series follows the pattern of consecutive squares: 1, 4, 9, 16. What is the next number?";
 const qa=inspectExternalQuestionBank(subtle);
 assert.ok(qa.issues.some(x=>x.code==="candidate-unintended-clue"&&x.severity==="warning"));
});
test("P60-C: five-option candidate-only packets preserve every authored choice label",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].options=["One","Two","Three","Four","Five"];
 src.questions[0].answer="E";
 const input=await write(dir,"five-option.json",src);
 const packet=command(tool,"candidate",input,"--limit","1");
 assert.equal(packet.status,0,packet.stderr);
 assert.deepEqual(packet.data.items[0].choices.map(x=>x.label),["A","B","C","D","E"]);
}));

test("P60-C RED: answer-hidden review packet exposes single candidate-only question, never key/explanation/source QA",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const r=command(tool,"candidate",input,"--limit","1");
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-review-candidates");
 assert.equal(r.data.items.length,1);
 assert.equal(r.data.items[0].questionId,"labour-01");
 assert.ok(/^[a-f0-9]{64}$/.test(r.data.items[0].candidateSha256));
 assert.ok(/^[a-f0-9]{64}$/.test(r.data.sourceSha256));
 const body=JSON.stringify(r.data.items[0]);
 for(const field of ["answer","explanation","provenance","sourceNote","correctOption","qa"])
  assert.ok(!Object.hasOwn(r.data.items[0],field),"Protected field leaked: "+field);
 assert.ok(!body.includes("This placeholder is not a labour-law question."));
 assert.ok(!body.includes("data:image/"));
 assert.ok(!r.stdout.includes("What is 2 + 2?"));
 assert.ok(r.stdout.length<9000);
}));
test("P60-C: all 20 former quality dimensions are redistributed across deterministic, semantic and bank layers without loss",()=>temp(async dir=>{
 const input=await write(dir,"apfc.json",JSON.parse(await readFile(apfc,"utf8")));
 const contract=command(tool,"checklist");
 assert.equal(contract.status,0,contract.stderr);
 assert.equal(contract.data.version,2);
 assert.equal(contract.data.layers.semantic.checklist.length,10);
 assert.equal(contract.data.layers.bank.checklist.length,6);
 assert.equal(contract.data.coverageMap.length,20);
 assert.equal(new Set(contract.data.coverageMap.map(x=>x.dimension)).size,20);
 assert.deepEqual(contract.data.reviewModes,["self-review","clean-context","independent-agent"]);
 const r=command(tool,"audit",input);
 assert.equal(r.status,1,"Semantic and bank review are absent");
 assert.equal(r.data.format,"practice-desk-question-quality-audit");
 assert.equal(r.data.readyForPublication,false);
 assert.equal(r.data.factualVerification,"not-performed");
 assert.equal(r.data.externalSourceFetches,0);
 assert.equal(r.data.questionsMissingReview,3);
 assert.equal(r.data.layers.deterministic.status,"pass");
 assert.equal(r.data.layers.semantic.status,"incomplete");
 assert.equal(r.data.layers.bank.status,"incomplete");
 assert.ok(!r.stdout.includes("B is second. This placeholder"));
 assert.ok(!r.stdout.includes("data:image/"));
}));

test("P60-C: layered semantic + bank review is SHA-bound, key-reconciled and source-evidence strict",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const pack=command(tool,"candidate",input,"--limit","10");
 assert.equal(pack.status,0,pack.stderr);
 const report=completeLayeredReview(src,pack.data,{mathIds:["account-01"]});
 const review=await write(dir,"review.json",report);
 const out=command(tool,"audit",input,"--review",review);
 assert.equal(out.status,0,out.stderr);
 assert.equal(out.data.readyForPublication,true);
 assert.equal(out.data.reviewMode,"self-review");
 assert.equal(out.data.reviewAssurance,"recorded-self-review-not-independent-or-authenticated");
 assert.equal(out.data.layers.semantic.reviewedQuestions,3);
 assert.equal(out.data.layers.bank.passedChecks,6);
 const compiled=command(cli,"compile-bank",input,join(dir,"quality-reviewed-exam.json"),"--quality-review",review);
 assert.equal(compiled.status,0,compiled.stderr);
 assert.equal(compiled.data.qualityReview.reviewMode,"self-review");
 const plan=fileURLToPath(new URL("../examples/p60b-apfc-blueprint.json",import.meta.url));
 const both=command(cli,"compile-bank",input,join(dir,"blueprint-and-reviewed.json"),"--blueprint",plan,"--quality-review",review);
 assert.equal(both.status,0,both.stderr);
 assert.equal(both.data.blueprint.valid,true);
 assert.equal(both.data.qualityReview.readyForPublication,true);
 const legal=structuredClone(src);
 legal.questions[0].prompt="Under the Code on Wages 2019, which letter is second?";
 const legalPath=await write(dir,"legal.json",legal),legalPacket=command(tool,"candidate",legalPath);
 const legalReview=completeLayeredReview(legal,legalPacket.data,{mathIds:["account-01"],legalIds:["labour-01"],timeIds:["labour-01"]});
 const lawResult=command(tool,"audit",legalPath,"--review",await write(dir,"legal-review.json",legalReview));
 assert.equal(lawResult.status,1);
 assert.ok(lawResult.data.issues.items.some(x=>x.code==="legal-asof-evidence-required"));
 const bad=structuredClone(report);bad.records[0].solution.answer="D";
 const wrong=command(tool,"audit",input,"--review",await write(dir,"wrong.json",bad));
 assert.equal(wrong.status,1);
 assert.ok(wrong.data.issues.items.some(x=>x.code==="review-key-disagreement"));
 const stale=structuredClone(report);stale.records[0].candidateSha256="0".repeat(64);
 const staleResult=command(tool,"audit",input,"--review",await write(dir,"stale.json",stale));
 assert.equal(staleResult.status,1);
 assert.ok(staleResult.data.issues.items.some(x=>x.code==="review-stale"));
 const bankFail=structuredClone(report);bankFail.bankReview.checks[0].status="fail";
 const bankResult=command(tool,"audit",input,"--review",await write(dir,"bank-fail.json",bankFail));
 assert.equal(bankResult.status,1);
 assert.ok(bankResult.data.issues.items.some(x=>x.code==="bank-check-unresolved"));
}));

test("P60-C RED: strict compiler refuses incomplete review and never writes compiled output",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const incomplete=command(tool,"template",input,"--limit","10").data;
 incomplete.records=[];
 const review=await write(dir,"review.json",incomplete),output=join(dir,"blocked.json");
 const blocked=command(cli,"compile-bank",input,output,"--quality-review",review);
 assert.notEqual(blocked.status,0);
 await assert.rejects(access(output));
 const structural=command(cli,"validate-bank",input);
 assert.equal(structural.status,0,"Unreviewed structural source validation remains available");
}));
test("P60-C: malformed, fabricated, duplicate and stale layered review records fail closed",()=>temp(async dir=>{
 const input=await write(dir,"source.json",JSON.parse(await readFile(cat,"utf8")));
 const template=command(tool,"template",input,"--limit","10").data;
 const cases=[];
 const stale=structuredClone(template);stale.sourceSha256="0".repeat(64);cases.push(stale);
 const extra=structuredClone(template);extra.records[0].extra="trusted";cases.push(extra);
 const empty=structuredClone(template);empty.records=[];cases.push(empty);
 const duplicate=structuredClone(template);duplicate.records.push(structuredClone(duplicate.records[0]));cases.push(duplicate);
 for(const review of cases){
  const p=await write(dir,"broken-"+Math.random()+".json",review),r=command(tool,"audit",input,"--review",p);
  assert.notEqual(r.status,0);assert.equal(r.data.readyForPublication,false);
 }
}));

test("P60-C: actual candidate exam renderer with an unpublished answer key never prints solution or editorial key",async()=>{
 const {compileExternalQuestionBank}=await import("../src/authoring/external-bank.ts");
 const {startGenericAttempt}=await import("../src/app/exam-package.ts");
 const {renderModelExam}=await import("../src/app/exam-view.ts");
 const source=JSON.parse(await readFile(apfc,"utf8"));
 const pkg=compileExternalQuestionBank(source);
 const attempt=startGenericAttempt(pkg,"p60c-render-frozen",1000);
 const html=renderModelExam(attempt,pkg);
 assert.match(html,/Which letter comes second/);
 assert.ok(!html.includes("B is second. This placeholder"),"Premature worked solution leaked");
 assert.ok(!html.includes("Correct answer: B"),"Premature explicit key leaked");
 assert.ok(!html.includes("not been independently certified"),"Editorial notes leaked before submission");
});

test("P60-C: referenced image alt text can leak a key without any incorrect answer field",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 source.media=[{id:"image-one",dataUri:"data:image/png;base64,"+png,altText:"Correct answer: A"}];
 source.stimuli.push({id:"picture-question",kind:"image",mediaRef:"image-one",
  altText:"Diagram used for a question"});
 source.questions[0].stimulusRef="picture-question";
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"&&x.path.includes("media.altText")));
});

test("P60-C: layered review template is incomplete, answer-private and materially smaller than the former 20xN checklist",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8")),input=await write(dir,"source.json",src);
 const r=command(tool,"template",input,"--limit","10");
 assert.equal(r.status,0,r.stderr);assert.equal(r.data.format,"practice-desk-quality-review");assert.equal(r.data.version,3);
 assert.equal(r.data.reviewMode,"self-review");assert.equal(r.data.candidateOnlyContextClaim,false);
 assert.equal(r.data.records.length,3);assert.equal(r.data.bankReview.checks.length,6);
 for(const row of r.data.records){
  assert.deepEqual(row.applicability,{mathematical:"pending",legal:"pending",timeSensitive:"pending",visual:"pending",asOfDate:null});
  assert.equal(row.solution.status,"pending");
  assert.ok(row.semanticChecks.length>=6&&row.semanticChecks.length<20);
  assert.ok(row.semanticChecks.every(check=>check.status==="not-reviewed"));
 }
 const mathRecord=r.data.records.find(row=>row.questionId==="account-01");
 assert.equal(mathRecord.semanticChecks.find(x=>x.id==="mathematical-correctness")?.basis,"mathematical-proof");
 assert.equal(mathRecord.semanticChecks.find(x=>x.id==="factual-correctness")?.basis,"mathematical-proof",
  "Pure mathematical items should not be prefilled with a needless source-consulted factual basis");
 const judgmentRows=r.data.records.reduce((n,row)=>n+row.semanticChecks.length,0)+r.data.bankReview.checks.length;
 assert.ok(judgmentRows<src.questions.length*20,"Layered review must reduce repetitive reviewer judgments");
 assert.ok(!r.stdout.includes("B is second. This placeholder"));assert.ok(!r.stdout.includes("data:image/"));
 const check=command(tool,"audit",input,"--review",await write(dir,"unfinished-review.json",r.data));
 assert.equal(check.status,1);assert.equal(check.data.readyForPublication,false);
}));

test("P60-C: complete keyed answer repeated in question prompt is highlighted as untrusted semantic clue",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 source.questions[0].prompt="A library replaces its catalogue. A library replaces its catalogue. Which statement is correct?";
 const q=inspectExternalQuestionBank(source);
 assert.ok(q.issues.some(x=>x.code==="candidate-unintended-clue"&&x.severity==="warning"));
});


test("P60-C: literal check-mark symbol as an answer choice is not falsely blocked as an editorial badge",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 source.questions[0].options=["Tick mark (✓)","Cross mark (✗)","Empty square (□)","Empty circle (○)"];
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 assert.ok(!report.issues.some(x=>x.code==="candidate-answer-leak"));
});


test("P60-C: direct named-answer and worked-solution labels are blocked in GK stems, without touching private explanations",async()=>{
 const base=JSON.parse(await readFile(apfc,"utf8"));
 const exposed=structuredClone(base);
 exposed.questions[0].prompt="Which city is India's capital? Correct answer: New Delhi.";
 const report=inspectExternalQuestionBank(exposed);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"));
 const privateExplanation=structuredClone(base);
 privateExplanation.questions[0].explanation="Correct answer: New Delhi. This is a synthetic explanation, not an examination fact claim.";
 assert.equal(inspectExternalQuestionBank(privateExplanation).valid,true,
  "Author-only solution text must not be mistaken for candidate-visible leaked hints");
});


test("P60-C: bounded quality audit exposes heuristic candidate-hint warnings instead of hiding them behind aggregate counts",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].prompt="A series follows the pattern of consecutive squares: 1, 4, 9, 16. What comes next?";
 const file=await write(dir,"hinted.json",src);
 const r=command(tool,"audit",file,"--limit","20");
 assert.equal(r.status,1,"Review is still absent");
 assert.ok(r.data.issues.items.some(x=>x.code==="canonical-candidate-unintended-clue"&&x.severity==="warning"));
 assert.ok(r.data.issues.items.some(x=>x.code==="review-missing"&&x.severity==="error"));
 assert.ok(r.data.warningIssueCount>=1);
 assert.ok(r.data.blockingIssueCount>=1);
 assert.equal(r.data.factualVerification,"not-performed");
}));

// P62-C: applicability is an explicit reviewer assertion; the scanner cannot
// infer that an innocuously worded example is about a statutory contribution.
test("P62-C unscanned contribution rate still requires reviewer-declared as-of and identifiable source",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].prompt="For Plan Z, which contribution share is assigned to the employer?";
 const input=await write(dir,"opaque-statutory.json",src);
 const pack=command(tool,"candidate",input,"--limit","10");
 const review=completeLayeredReview(src,pack.data,{mathIds:["account-01"],legalIds:["labour-01"]});
 review.records[0].evidence[0]={publisher:"Synthetic fixture",title:"Imaginary Plan Z note",
  locator:"appendix-z-17",retrievedAt:"2026-11-06",
  excerpt:"Imaginary contribution schedule, only a regression fixture."};
 const verify=async(name,review)=>{
  const path=await write(dir,name+".json",review);
  return command(tool,"audit",input,"--review",path,"--limit","50");
 };
 const absent=await verify("no-asof",review);
 assert.equal(absent.status,1);
 assert.ok(absent.data.issues.items.some(x=>x.code==="applicability-asof-required"),JSON.stringify(absent.data.issues));
 assert.ok(absent.data.issues.items.some(x=>x.code==="legal-asof-evidence-required"));
 // Missing matching source evidence is not cured merely by declaring a date.
 review.records[0].applicability.asOfDate="2026-11-06";
 const wrongEvidence=await verify("date-without-source",review);
 assert.equal(wrongEvidence.status,1);
 assert.ok(wrongEvidence.data.issues.items.some(x=>x.code==="legal-asof-evidence-required"));
 review.records[0].evidence[0].asOfDate="2026-11-06";
 const accepted=await verify("supported-attestation",review);
 assert.equal(accepted.status,0,JSON.stringify(accepted.data.issues));
 assert.equal(accepted.data.readyForPublication,true);
 assert.equal(accepted.data.factualVerification,"not-performed");
 assert.equal(accepted.data.reviewAssurance,"recorded-self-review-not-independent-or-authenticated");
 const unsupported=structuredClone(review);
 unsupported.records[0].semanticChecks.find(x=>x.id==="temporal-correctness").basis="semantic-editorial";
 assert.ok((await verify("wrong-temporal-basis",unsupported)).data.issues.items.some(
  x=>x.code==="source-check-basis-invalid"));
 // Independent author-side classification makes this same keyword-free
 // statutory question impossible to downgrade silently in a quality review.
 const authorTagged=structuredClone(src);
 authorTagged.questions[0].qa.applicability={
  mathematical:false,legal:true,timeSensitive:true,asOfDate:"2026-11-06"};
 const authorFile=await write(dir,"opaque-statutory-author-declared.json",authorTagged);
 const authorPack=command(tool,"candidate",authorFile,"--limit","10");
 const wrongTag=structuredClone(review);
 wrongTag.sourceSha256=authorPack.data.sourceSha256;
 wrongTag.records[0].questionSha256=sha(JSON.stringify(authorTagged.questions[0]));
 wrongTag.records[0].candidateSha256=authorPack.data.items[0].candidateSha256;
 wrongTag.records[0].applicability.legal="no";
 wrongTag.records[0].applicability.timeSensitive="no";
 const wrongTagFile=await write(dir,"false-unscanned-declaration.json",wrongTag);
 const blocked=command(tool,"audit",authorFile,"--review",wrongTagFile,"--limit","50");
 assert.equal(blocked.status,1);
 assert.ok(blocked.data.issues.items.some(x=>x.code==="source-applicability-conflict"));
 // Mismatched dates are also rejected, despite intact reviewer evidence.
 wrongTag.records[0].applicability.legal="yes";
 wrongTag.records[0].applicability.timeSensitive="yes";
 wrongTag.records[0].applicability.asOfDate="2025-11-06";
 const wrongDate=command(tool,"audit",authorFile,"--review",
  await write(dir,"wrong-date.json",wrongTag),"--limit","50");
 assert.equal(wrongDate.status,1);
 assert.ok(wrongDate.data.issues.items.some(x=>x.code==="source-asof-conflict"));
}));

test("P60-C visual material activates one conditional rendered-integrity check instead of a per-item candidate-view ritual",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(cat,"utf8"));
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 src.media=[{id:"safe-image",dataUri:"data:image/png;base64,"+png,altText:"Neutral one-pixel diagram"}];
 src.stimuli.push({id:"safe-visual",kind:"image",mediaRef:"safe-image",altText:"Neutral diagram"});
 src.questions[0].stimulusRef="safe-visual";
 const input=await write(dir,"visual.json",src),packet=command(tool,"candidate",input,"--limit","10");
 const review=completeLayeredReview(src,packet.data,{mathIds:["dilr-1","qa-1"],visualIds:["rc-1"]});
 const ok=command(tool,"audit",input,"--review",await write(dir,"visual-review.json",review));
 assert.equal(ok.status,0,JSON.stringify(ok.data.issues));
 const denied=structuredClone(review);denied.records[0].applicability.visual="no";
 denied.records[0].semanticChecks=denied.records[0].semanticChecks.filter(x=>x.id!=="visual-integrity");
 const blocked=command(tool,"audit",input,"--review",await write(dir,"visual-denied.json",denied));
 assert.equal(blocked.status,1);
 assert.ok(blocked.data.issues.items.some(x=>x.code==="visual-applicability-conflict"));
}));

test("P62-C mathematical declarations, pending status, evidence basis and keyword conflicts fail closed",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8")),input=await write(dir,"math.json",src);
 const packet=command(tool,"candidate",input,"--limit","10");
 const review=completeLayeredReview(src,packet.data,{mathIds:["account-01"]});
 const inspect=async(label,value,sourcePath=input)=>command(tool,"audit",sourcePath,"--review",await write(dir,label+".json",value),"--limit","50");
 assert.equal((await inspect("valid",review)).status,0);
 const missing=structuredClone(review);delete missing.records[0].applicability;
 assert.ok((await inspect("missing",missing)).data.issues.items.some(x=>x.code==="review-invalid"));
 const pending=structuredClone(review);pending.records[0].applicability.legal="pending";
 assert.ok((await inspect("pending",pending)).data.issues.items.some(x=>x.code==="applicability-unresolved"));
 const failedMath=structuredClone(review);
 failedMath.records[2].semanticChecks.find(x=>x.id==="mathematical-correctness").status="not-reviewed";
 assert.ok((await inspect("math-unreviewed",failedMath)).data.issues.items.some(x=>x.code==="semantic-check-unresolved"));
 const unsupportedMath=structuredClone(review);
 unsupportedMath.records[2].semanticChecks.find(x=>x.id==="mathematical-correctness").basis="semantic-editorial";
 assert.ok((await inspect("math-without-proof",unsupportedMath)).data.issues.items.some(x=>x.code==="mathematics-proof-required"));
 const contradiction=structuredClone(review);contradiction.records[2].applicability.mathematical="no";
 assert.ok((await inspect("math-heuristic-conflict",contradiction)).data.issues.items.some(x=>x.code==="applicability-heuristic-conflict"));
 const prior=structuredClone(review);prior.version=2;
 assert.ok((await inspect("noncanonical-format",prior)).data.issues.items.some(x=>x.code==="review-invalid"));
 const legal=structuredClone(src);legal.questions[0].prompt="Under the Code on Wages 2019, which letter is second?";
 const legalFile=await write(dir,"legal-heuristic.json",legal),legalPacket=command(tool,"candidate",legalFile,"--limit","10");
 const underClaim=completeLayeredReview(legal,legalPacket.data,{mathIds:["account-01"]});
 assert.ok((await inspect("legal-heuristic-conflict",underClaim,legalFile)).data.issues.items.some(x=>x.code==="applicability-heuristic-conflict"));
}));

}
await registerCandidateSecrecyTests();
