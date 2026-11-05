/** P59 RED-first agent-native context-efficient editing contract.
 * Proves real CLI interface without binding external agents to app internals.
 * Generated source claims stay unverified; no network/browser/DB use.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";

const cmd=fileURLToPath(new URL("../scripts/question-bank-agent.mjs",import.meta.url));
const apfc=fileURLToPath(new URL("../examples/ai-first-apfc.json",import.meta.url));
const cat=fileURLToPath(new URL("../examples/ai-first-cat.json",import.meta.url));
const exec=(...args)=>{
 const run=spawnSync(process.execPath,[cmd,...args],{
  encoding:"utf8",timeout:30000,maxBuffer:2*1024*1024});
 assert.equal(run.error,undefined,String(run.error));
 return {...run,data:JSON.parse(run.stdout||run.stderr)};
};
const sha=x=>createHash("sha256").update(x).digest("hex");
const inTemp=async(fn)=>{
 const dir=await mkdtemp(join(tmpdir(),"pd-p59-"));
 try{return await fn(dir);}
 finally{await rm(dir,{recursive:true,force:true});}
};

test("P59: agent inspect returns bounded, paginated actionable errors without full questions or false factual verification",async()=>inTemp(async dir=>{
 const j=JSON.parse(await readFile(apfc,"utf8"));
 j.questions[0].prompt="Under the Sample Act 2020, which letter comes second alphabetically?";
 j.questions[1].prompt="Under the Example Code 2020, how many days in a conventional week?";
 const input=join(dir,"generated.json");
 const raw=JSON.stringify(j);
 await writeFile(input,raw);
 const first=exec("inspect",input,"--limit","1","--offset","0");
 assert.equal(first.status,0,first.stderr);
 assert.equal(first.data.format,"practice-desk-agent-inspection");
 assert.equal(first.data.sourceSha256,sha(raw));
 assert.equal(first.data.factualVerification,"not-performed");
 assert.equal(first.data.editorialStatus,"caution");
 assert.equal(first.data.questionCount,3);
 assert.equal(first.data.issues.items.length,1);
 assert.equal(first.data.issues.offset,0);
 assert.ok(first.data.issues.total>=2);
 assert.equal(first.data.issues.nextOffset,1);
 assert.ok(!first.stdout.includes("Which letter comes second alphabetically?"),"inspect must not flood context with question bodies");
 assert.ok(first.stdout.length<9000,"one-issue inspection is not bounded");
 const second=exec("inspect",input,"--limit","1","--offset","1");
 assert.equal(second.status,0);
 assert.equal(second.data.issues.offset,1);
 assert.equal(second.data.issues.items.length,1);
 assert.notDeepEqual(first.data.issues.items,second.data.issues.items);
 const bad=exec("inspect",input,"--limit","900");
 assert.notEqual(bad.status,0);
 assert.equal(bad.data.valid,false);
 assert.equal(bad.data.code,"agent-input-invalid");
}));

test("P59: agent show retrieves exactly one question with stable per-item fingerprint and separate shared context, no unnecessary bank or image bytes",async()=>inTemp(async dir=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 const input=join(dir,"cat.json");
 await writeFile(input,JSON.stringify(source));
 const result=exec("show",input,"rc-1");
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.format,"practice-desk-agent-question");
 assert.equal(result.data.question.id,"rc-1");
 assert.equal(result.data.questionSha256,sha(JSON.stringify(source.questions[0])));
 assert.equal(result.data.sourceSha256,sha(JSON.stringify(source)));
 assert.equal(result.data.stimulus.id,"rc-one");
 assert.ok(!result.stdout.includes("data:image/"),"agent context must not include base64 media bytes");
 assert.ok(!result.stdout.includes("What is the result of"),"agent show must not dump other questions");
 const unknown=exec("show",input,"no-such-question");
 assert.notEqual(unknown.status,0);
 assert.equal(unknown.data.code,"agent-input-invalid");
}));

test("P59: guarded delta edits preserve original, validate canonical publisher, compile as caution, permit a new numbered revision and refuse overwrite",async()=>inTemp(async dir=>{
 const input=join(dir,"source.json"),output=join(dir,"corrected.json"),patch=join(dir,"patch.json");
 await writeFile(input,await readFile(apfc));
 const before=await readFile(input,"utf8");
 const inspect=exec("inspect",input);
 assert.equal(inspect.status,0,inspect.stderr);
 const oldQuestion=exec("show",input,"labour-01");
 const update={
  format:"practice-desk-agent-patch",version:1,
  baseSha256:inspect.data.sourceSha256,nextRevision:2,
  updates:[{id:"labour-01",expectedQuestionSha256:oldQuestion.data.questionSha256,
   set:{prompt:"Which letter comes third in the English alphabet?",
    answer:"C",explanation:"C is the third letter; A is first, B second and D fourth."}}]
 };
 await writeFile(patch,JSON.stringify(update));
 const run=exec("patch",input,patch,output);
 assert.equal(run.status,0,run.stderr);
 assert.equal(run.data.valid,true);
 assert.equal(run.data.questionCount,3);
 assert.equal(run.data.revision,2);
 assert.equal(run.data.factualVerification,"not-performed");
 assert.equal(run.data.editorialStatus,"caution");
 assert.equal(run.data.updatedIds[0],"labour-01");
 assert.equal(await readFile(input,"utf8"),before,"source must never be mutated");
 const next=JSON.parse(await readFile(output,"utf8"));
 assert.equal(next.revision,2);
 assert.equal(next.questions[0].answer,"C");
 assert.equal(next.questions[0].prompt,update.updates[0].set.prompt);
 assert.equal(next.questions[0].provenance.kind,"ai-original");
 assert.deepEqual(next.questions[1],JSON.parse(before).questions[1],"unchanged questions survive exactly");
 const publisher=inspectExternalQuestionBank(next);
 assert.equal(publisher.valid,true);
 assert.equal(publisher.editorialStatus,"caution");
 assert.equal(publisher.compiled?.answerKey.entries[0].answer.optionId,"C");
 assert.equal(exec("patch",input,patch,output).status,1,"re-running must refuse existing output path");
}));

test("P59: bad source hash, item hash, id, path, revisions and wrong keyed schema fail closed without partial output",async()=>inTemp(async dir=>{
 const input=join(dir,"source.json"),output=join(dir,"result.json"),patch=join(dir,"patch.json");
 await writeFile(input,await readFile(apfc));
 const h=exec("inspect",input).data.sourceSha256;
 const item=exec("show",input,"labour-01").data.questionSha256;
 const base={format:"practice-desk-agent-patch",version:1,baseSha256:h,
  updates:[{id:"labour-01",expectedQuestionSha256:item,set:{explanation:"New explanation with existing B key."}}]};
 const cases=[
  {...base,baseSha256:"0".repeat(64)},
  {...base,updates:[{...base.updates[0],expectedQuestionSha256:"0".repeat(64)}]},
  {...base,updates:[{...base.updates[0],id:"question-does-not-exist"}]},
  {...base,updates:[{...base.updates[0],set:{contentHash:"forged"}}]},
  {...base,updates:[{...base.updates[0],set:{id:"new-id"}}]},
  {...base,updates:[{...base.updates[0],set:{answer:"E"}}]},
  {...base,updates:[base.updates[0],base.updates[0]]},
  {...base,nextRevision:1},
  {...base,evil:"surprise"},
  {...base,updates:[{...base.updates[0],set:{qa:{status:"verified"}}}]}
 ];
 for(const [i,shape] of cases.entries()){
  await writeFile(patch,JSON.stringify(shape));
  const r=exec("patch",input,patch,output);
  assert.notEqual(r.status,0,"Invalid patch "+i+" must fail");
  assert.equal(r.data.valid,false);
  assert.equal(r.data.code,"agent-input-invalid");
  await assert.rejects(()=>readFile(output),"Invalid edit "+i+" wrote output");
 }
 assert.equal(JSON.parse(await readFile(input,"utf8")).questions[0].answer,"B");
}));

test("P59: malformed source and unsupported draft exchange are not silently coerced into the narrow AI edit contract",async()=>inTemp(async dir=>{
 const source=JSON.parse(await readFile(apfc,"utf8"));
 source.questions[0].provenance.kind="official-pyq"; // remains an unverified claim
 const input=join(dir,"unverified.json");
 await writeFile(input,JSON.stringify(source));
 const report=exec("inspect",input,"--limit","3");
 assert.equal(report.status,0,report.stderr);
 assert.equal(report.data.factualVerification,"not-performed");
 assert.equal(report.data.editorialStatus,"caution");
 assert.ok(report.data.issues.total>0);
 const draft=join(dir,"not-source.json");
 await writeFile(draft,JSON.stringify({format:"practice-desk-draft-exchange",version:1,draft:{}}));
 const reject=exec("show",draft,"labour-01");
 assert.notEqual(reject.status,0);
 assert.match(reject.data.message,/source v1|source/i);
}));
