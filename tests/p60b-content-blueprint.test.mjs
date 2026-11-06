/** P60-B RED-first: enforce authored content blueprints without modifying exam or scorer. */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
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
 assert.equal(r.data.readyForPublication,true);
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


test("P60-B: canonical compiler optionally gates exact single-source publication, preserving old paths",()=>temp(async dir=>{
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
 const old=compile("validate-bank",source);
 assert.equal(old.status,0,"Legacy no-plan workflow remains usable");
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
