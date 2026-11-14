/** Canonical product-domain suite. */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,readFile,writeFile,rm,access} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {inspectCandidateIntegrity} from "../src/authoring/candidate-integrity.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";

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
  subjects:{exhaustive:true,targets:[{key:"heading:labour",count:1},
    {key:"heading:economy",count:1},{key:"heading:accountancy",count:1}]},
  kinds:{exhaustive:true,targets:[{key:"single-choice",count:3}]}
 }
});
const run=(...args)=>{
 const out=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:20000,maxBuffer:200000});
 assert.equal(out.error,undefined,String(out.error));
 let data;try{data=JSON.parse(out.stdout||out.stderr);}catch{assert.fail(out.stdout+"\n"+out.stderr);}
 return {...out,data};
};
const temp=async fn=>{const dir=await mkdtemp(join(tmpdir(),"pd-p60b-"));try{return await fn(dir);}finally{await rm(dir,{force:true,recursive:true});}};
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

test("P60-B RED: count mismatch, subject drift, mixed paper and duplicated question IDs are hard failures",()=>temp(async dir=>{
 const base=JSON.parse(await readFile(example,"utf8"));
 const plan=await write(dir,"plan.json",mkPlan());
 const reduced=structuredClone(base);reduced.questions.pop();
 const short=run("audit",plan,await write(dir,"short.json",reduced));
 assert.notEqual(short.status,0);
 assert.ok(short.data.issues.items.some(x=>x.code==="target-count"||x.code==="quota-mismatch"));
 const drift=structuredClone(base);drift.questions[0].syllabusHeadingId="economy";
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
  p=>{p.quotas.subjects.targets[1].key="heading:labour";},
  p=>{p.quotas.subjects.targets[0].count=4;},
  p=>{p.quotas.subjects.targets[0].key="heading:not-official";},
  p=>{p.fakeVerified=true;},
  p=>{p.syllabus.basis="official-confirmed";},
  p=>{p.requirements.allowedOrigins=["verified-pyq"];}
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
  p=>{p.quotas.topics={targets:[{subjectKey:"heading:labour",topic:"A",count:2}]};},
  p=>{p.quotas.subtopics={targets:[{subjectKey:"heading:labour",topic:"A",subtopic:"B",count:2}]};},
  p=>{p.quotas.topics={exhaustive:true,targets:[{subjectKey:"heading:labour",topic:"A",count:3}]};}
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
 p.quotas.topics={targets:[{subjectKey:"heading:labour",topic:"Wages",count:1},
  {subjectKey:"heading:labour",topic:"Disputes",count:1}]};
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
  subjectKey:"heading:labour",topic:"Synthetic unrequested "+i,count:0
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
const command=(script,...args)=>{
 const result=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.error,undefined,String(result.error));
 let data;try{data=JSON.parse(result.stdout||result.stderr);}
 catch{assert.fail(result.stdout+" "+result.stderr);}
 return {...result,data};
};
const temp=async f=>{const dir=await mkdtemp(join(tmpdir(),"pd-p60c-"));try{return await f(dir);}finally{await rm(dir,{recursive:true,force:true});}};
const write=async(dir,name,data)=>{const path=join(dir,name);await writeFile(path,JSON.stringify(data));return path;};

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
test("P60-C RED: blinded review packet exposes single candidate-only question, never key/explanation/source QA",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const r=command(tool,"candidate",input,"--limit","1");
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-blind-candidates");
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
test("P60-C RED: QA reports 20 mandatory checks, unverified by default and never claims internet retrieval",()=>temp(async dir=>{
 const input=await write(dir,"apfc.json",JSON.parse(await readFile(apfc,"utf8")));
 const r=command(tool,"audit",input);
 assert.equal(r.status,1,"Independent assessment absent is not a completed quality gate");
 assert.equal(r.data.format,"practice-desk-question-quality-audit");
 assert.equal(r.data.readyForPublication,false);
 assert.equal(r.data.factualVerification,"not-performed");
 assert.equal(r.data.externalSourceFetches,0);
 assert.equal(r.data.checklist.length,20);
 assert.equal(r.data.questionsMissingReview,3);
 assert.ok(r.data.issues.total>=3);
 assert.ok(!r.stdout.includes("B is second. This placeholder"));
 assert.ok(!r.stdout.includes("data:image/"));
}));
test("P60-C RED: external review must be SHA-bound, complete, independently solved; a matching self-assertion is NOT authenticated",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const pack=command(tool,"candidate",input,"--limit","10");
 assert.equal(pack.status,0,pack.stderr);
 const checks=Array.from({length:20},(_,i)=>({id:command(tool,"checklist").data.checklist[i].id,
  status:"pass",basis:i===9?"mathematical-proof":i===11||i===12||i===13?"source-consulted":i===19?"rendered-claim":"independent-editorial",
  rationale:"Synthetic test assertion only, no authentic source verification"}));
 const report={format:"practice-desk-quality-review",version:2,bankId:src.bankId,sourceSha256:pack.data.sourceSha256,
  records:pack.data.items.map((q,i)=>({questionId:q.questionId,questionSha256:sha(JSON.stringify(src.questions[i])),
   candidateSha256:q.candidateSha256,
   applicability:{mathematical:src.questions[i].id==="account-01"?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},
   reviewer:{id:"synthetic-reviewer",kind:"ai"},
   independentSolution:{blindClaim:true,answer:src.questions[i].answer,
    reasoning:"Synthetic fixture reasoning, not independently established"},
   checks:structuredClone(checks),
   evidence:[{publisher:"Fixture",title:"Illustrative only",locator:"test",retrievedAt:"2026-11-06",
    excerpt:"Synthetic example; source not authenticated"}]
  }))};
 const review=await write(dir,"review.json",report);
 const out=command(tool,"audit",input,"--review",review);
 assert.equal(out.status,0,out.stderr);
 assert.equal(out.data.readyForPublication,true);
 assert.equal(out.data.reviewAssurance,"recorded-self-attestation-not-authenticated");
 assert.equal(out.data.factualVerification,"not-performed");
 assert.equal(out.data.externalSourceFetches,0);
 const compiled=command(cli,"compile-bank",input,join(dir,"quality-reviewed-exam.json"),
  "--quality-review",review);
 assert.equal(compiled.status,0,compiled.stderr);
 assert.equal(compiled.data.qualityReview.readyForPublication,true);
 assert.equal(compiled.data.qualityReview.factualVerification,"not-performed");
 const plan=fileURLToPath(new URL("../examples/p60b-apfc-blueprint.json",import.meta.url));
 const both=command(cli,"compile-bank",input,join(dir,"blueprint-and-reviewed.json"),
  "--blueprint",plan,"--quality-review",review);
 assert.equal(both.status,0,both.stderr);
 assert.equal(both.data.blueprint.valid,true);
 assert.equal(both.data.qualityReview.readyForPublication,true);
 const compiledPkg=JSON.parse(await readFile(join(dir,"quality-reviewed-exam.json"),"utf8"));
 assert.equal(compiledPkg.questions[0].editorial.status,"caution",
  "An asserted review does not automatically upgrade editorial source authenticity");
 const legal=structuredClone(src);
 legal.questions[0].prompt="Under the Code on Wages 2019, which letter is second?";
 const legalPath=await write(dir,"legal.json",legal);
 const legalPacket=command(tool,"candidate",legalPath);
 const legalReview=structuredClone(report);
 legalReview.sourceSha256=legalPacket.data.sourceSha256;
 legalReview.records[0].questionSha256=sha(JSON.stringify(legal.questions[0]));
 legalReview.records[0].candidateSha256=legalPacket.data.items[0].candidateSha256;
 legalReview.records[0].applicability={mathematical:"no",legal:"yes",timeSensitive:"yes",asOfDate:null};
 const lawResult=command(tool,"audit",legalPath,"--review",
  await write(dir,"legal-review.json",legalReview));
 assert.equal(lawResult.status,1);
 assert.ok(lawResult.data.issues.items.some(x=>x.code==="legal-asof-evidence-required"));
 const bad=structuredClone(report);bad.records[0].independentSolution.answer="D";
 const wrong=command(tool,"audit",input,"--review",await write(dir,"wrong.json",bad));
 assert.equal(wrong.status,1);
 assert.ok(wrong.data.issues.items.some(x=>x.code==="independent-key-disagreement"));
 const stale=structuredClone(report);stale.records[0].candidateSha256="0".repeat(64);
 const staleResult=command(tool,"audit",input,"--review",await write(dir,"stale.json",stale));
 assert.equal(staleResult.status,1);
 assert.ok(staleResult.data.issues.items.some(x=>x.code==="review-stale"));
}));
test("P60-C RED: strict compiler refuses incomplete review and never writes compiled output",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const incomplete={format:"practice-desk-quality-review",version:2,bankId:src.bankId,
  sourceSha256:sha(JSON.stringify(src)),records:[]};
 const review=await write(dir,"review.json",incomplete),output=join(dir,"blocked.json");
 const blocked=command(cli,"compile-bank",input,output,"--quality-review",review);
 assert.notEqual(blocked.status,0);
 await assert.rejects(access(output));
 const structural=command(cli,"validate-bank",input);
 assert.equal(structural.status,0,"Unreviewed structural source validation remains available");
}));
test("P60-C RED: malformed, fabricated, duplicate and undisclosed review records fail closed",()=>temp(async dir=>{
 const input=await write(dir,"source.json",JSON.parse(await readFile(cat,"utf8")));
 const source=JSON.parse(await readFile(input,"utf8"));
 for(const review of [
  {format:"practice-desk-quality-review",version:2,bankId:source.bankId,sourceSha256:"0".repeat(64),records:[]},
  {format:"practice-desk-quality-review",version:2,bankId:source.bankId,sourceSha256:sha(JSON.stringify(source)),records:[{questionId:"x",extra:"trusted"}]},
  {format:"practice-desk-quality-review",version:2,bankId:source.bankId,sourceSha256:sha(JSON.stringify(source)),records:[]}
 ]){
  const p=await write(dir,"broken-"+Math.random()+".json",review);
  const r=command(tool,"audit",input,"--review",p);
  assert.notEqual(r.status,0);
  assert.equal(r.data.readyForPublication,false);
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

test("P60-C: review templates are intentionally incomplete and do not contain hidden source keys or explanations",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const r=command(tool,"template",input,"--limit","1");
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-quality-review");
 assert.equal("templateIncomplete" in r.data,false,"Fillable review must match exact v2 schema");
 assert.equal(r.data.version,2);
 assert.deepEqual(r.data.records[0].applicability,{mathematical:"pending",legal:"pending",timeSensitive:"pending",asOfDate:null});
 assert.equal(r.data.records.length,1);
 assert.equal(r.data.records[0].checks.length,20);
 assert.equal(r.data.records[0].independentSolution.blindClaim,false);
 assert.ok(!r.stdout.includes("B is second. This placeholder"));
 assert.ok(!r.stdout.includes("data:image/"));
 const check=command(tool,"audit",input,"--review",await write(dir,"unfinished-review.json",{
  format:r.data.format,version:r.data.version,bankId:r.data.bankId,
  sourceSha256:r.data.sourceSha256,records:r.data.records
 }));
 assert.equal(check.status,1);
 assert.equal(check.data.readyForPublication,false);
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
 const checklist=command(tool,"checklist").data.checklist;
 const review={format:"practice-desk-quality-review",version:2,bankId:src.bankId,
  sourceSha256:pack.data.sourceSha256,
  records:pack.data.items.map(item=>{
   const q=src.questions.find(q=>q.id===item.questionId),math=q.id==="account-01";
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:item.candidateSha256,
    applicability:{mathematical:math?"yes":"no",legal:q.id==="labour-01"?"yes":"no",
     timeSensitive:"no",asOfDate:null},
    reviewer:{kind:"ai",id:"synthetic-software-regression"},
    independentSolution:{blindClaim:true,answer:q.answer,
     reasoning:"Synthetic asserted answer to an imaginary scheme; no statutory facts authenticated."},
    checks:checklist.map(check=>({id:check.id,status:"pass",
     basis:check.id==="mathematical-correctness"?"mathematical-proof":
      ["factual-correctness","temporal-correctness","pyq-fidelity"].includes(check.id)?"source-consulted":
      check.id==="candidate-view-integrity"?"rendered-claim":"independent-editorial",
     rationale:"Regression-only assertion; source content not authenticated."})),
    evidence:[{publisher:"Synthetic fixture",title:"Imaginary Plan Z note",
     locator:"appendix-z-17",retrievedAt:"2026-11-06",
     excerpt:"Imaginary contribution schedule, only a regression fixture."}]};
  })};
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
 assert.equal(accepted.data.reviewAssurance,"recorded-self-attestation-not-authenticated");
 const unsupported=structuredClone(review);
 unsupported.records[0].checks.find(x=>x.id==="temporal-correctness").basis="independent-editorial";
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

test("P62-C mathematical declarations, pending status and keyword conflicts fail closed",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"math.json",src);
 const packet=command(tool,"candidate",input,"--limit","10");
 const template=command(tool,"template",input,"--limit","10");
 const checks=command(tool,"checklist").data.checklist;
 const review=structuredClone(template.data);
 for(const row of review.records){
  const q=src.questions.find(q=>q.id===row.questionId);
  row.applicability={mathematical:q.id==="account-01"?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null};
  row.reviewer={id:"synthetic-qa",kind:"ai"};
  row.independentSolution={blindClaim:true,answer:q.answer,
   reasoning:"Synthetic reviewer assertion for a software classification test."};
  row.checks=checks.map(c=>({id:c.id,status:"pass",
   basis:c.id==="mathematical-correctness"?"mathematical-proof":
    ["factual-correctness","temporal-correctness","pyq-fidelity"].includes(c.id)?"source-consulted":
    c.id==="candidate-view-integrity"?"rendered-claim":"independent-editorial",
   rationale:"This record is synthetic and cannot establish independent factual truth."}));
  row.evidence=[{publisher:"Test fixture",title:"Fictional calculation note",locator:"item:"+q.id,
   retrievedAt:"2026-11-06",excerpt:"Only proves that schema gates work."}];
 }
 const inspect=async(label,value,sourcePath=input)=>{
  const p=await write(dir,label+".json",value);
  return command(tool,"audit",sourcePath,"--review",p,"--limit","50");
 };
 assert.equal((await inspect("valid",review)).status,0);
 const missing=structuredClone(review);
 delete missing.records[0].applicability;
 assert.ok((await inspect("missing",missing)).data.issues.items.some(x=>x.code==="review-invalid"));
 const pending=structuredClone(review);
 pending.records[0].applicability.legal="pending";
 assert.ok((await inspect("pending",pending)).data.issues.items.some(x=>x.code==="applicability-unresolved"));
 const failedMath=structuredClone(review);
 failedMath.records[2].checks.find(x=>x.id==="mathematical-correctness").status="not-applicable";
 assert.ok((await inspect("math-na",failedMath)).data.issues.items.some(x=>x.code==="mathematics-review-required"));
 const unsupportedMath=structuredClone(review);
 unsupportedMath.records[2].checks.find(x=>x.id==="mathematical-correctness").basis="independent-editorial";
 assert.ok((await inspect("math-without-proof",unsupportedMath)).data.issues.items.some(x=>x.code==="mathematics-proof-required"));
 const contradiction=structuredClone(review);
 contradiction.records[2].applicability.mathematical="no";
 assert.ok((await inspect("math-heuristic-conflict",contradiction)).data.issues.items.some(x=>x.code==="applicability-heuristic-conflict"));
 const prior=structuredClone(review);
 prior.version=1;
 assert.ok((await inspect("noncanonical-format",prior)).data.issues.items.some(x=>x.code==="review-invalid"),
  "Noncanonical sidecar format must not bypass the explicit declarations");
 const legal=structuredClone(src);
 legal.questions[0].prompt="Under the Code on Wages 2019, which letter is second?";
 const legalFile=await write(dir,"legal-heuristic.json",legal);
 const legalPacket=command(tool,"candidate",legalFile,"--limit","10");
 const underClaim=structuredClone(review);
 underClaim.sourceSha256=legalPacket.data.sourceSha256;
 underClaim.records[0].questionSha256=sha(JSON.stringify(legal.questions[0]));
 underClaim.records[0].candidateSha256=legalPacket.data.items[0].candidateSha256;
 assert.ok((await inspect("legal-heuristic-conflict",underClaim,legalFile)).data.issues.items.some(
  x=>x.code==="applicability-heuristic-conflict"));
}));
}
await registerCandidateSecrecyTests();
