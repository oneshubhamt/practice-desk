/** P60-F RED: a coherent source-bound agent handoff, never a cloud/device bridge.
 * All reviewer/source statements in fixtures are synthetic, not proof of truth.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,writeFile,mkdtemp,rm,readdir,access} from "node:fs/promises";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {QUALITY_CHECKLIST} from "../scripts/question-quality.mjs";
const script=fileURLToPath(new URL("../scripts/agent-handoff.mjs",import.meta.url));
const quality=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const editorial=fileURLToPath(new URL("../scripts/editorial-editions.mjs",import.meta.url));
const sha=s=>createHash("sha256").update(s).digest("hex");
const run=(program,...args)=>{
 const r=spawnSync(process.execPath,[program,...args],{encoding:"utf8",timeout:60000,maxBuffer:3*1024*1024});
 assert.equal(r.error,undefined,JSON.stringify(r.error));
 let data;try{data=JSON.parse(r.stdout||r.stderr)}catch{assert.fail("Expected JSON: "+r.stdout+" "+r.stderr)}
 return {...r,data};
};
const scoped=async fn=>{const root=await mkdtemp(join(tmpdir(),"pd-p60f-"));
 try{return await fn(root);}finally{await rm(root,{recursive:true,force:true});}};
const put=async(dir,name,data)=>{const path=join(dir,name);await writeFile(path,typeof data==="string"||Buffer.isBuffer(data)?data:JSON.stringify(data));return path;};
async function files(dir,{asDocument=false}={}){
 const source=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
 if(asDocument)source.questions=source.questions.map((q,i)=>({...q,
  provenance:{kind:"reconstruction",sourceNote:"Synthetic examination document, page 1 item "+(i+1)+"; not an authentic PYQ"}}));
 const original=await put(dir,"original.json",source);
 const reviewed=structuredClone(source);reviewed.questions[0].answer="A";
 reviewed.questions[0].explanation="Synthetic disputed editorial key; never a checked historical or legal fact.";
 const corrected=await put(dir,"reviewed.json",reviewed);
 const packet=run(quality,"candidate",corrected,"--limit","10");
 assert.equal(packet.status,0,packet.stderr);
 const review={format:"practice-desk-quality-review",version:1,bankId:reviewed.bankId,
  sourceSha256:packet.data.sourceSha256,records:packet.data.items.map(candidate=>{
   const q=reviewed.questions.find(x=>x.id===candidate.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:candidate.candidateSha256,reviewer:{kind:"ai",id:"synthetic-independent-check"},
    independentSolution:{blindClaim:true,answer:String(q.answer),
     reasoning:"Synthetic QA check record; no source has been authenticated."},
    checks:QUALITY_CHECKLIST.map((ck,i)=>({id:ck.id,status:"pass",
     basis:[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
     rationale:"Synthetic software fixture, never factual source certification."})),
    evidence:[{publisher:"Synthetic",title:"Fixture only",locator:"test:"+q.id,
      retrievedAt:"2026-11-06",excerpt:"No independent source consultation was actually performed."}]};
  })};
 const reviewFile=await put(dir,"review.json",review);
 const decisionTemplate=run(editorial,"template",original,corrected);
 assert.equal(decisionTemplate.status,0,decisionTemplate.stderr);
 const decision=structuredClone(decisionTemplate.data);delete decision.templateIncomplete;
 decision.entries=decision.entries.map(e=>({...e,disposition:"corrected",
  reason:"Synthetic disputed source-key example; correction is not factually authenticated.",
  evidence:[{publisher:"Synthetic",title:"P60-F fixture",locator:"item "+e.questionId,
   sourceNote:"Software contract example only; does not prove a correct response."}]}));
 const decisions=await put(dir,"decisions.json",decision);
 return {source,original,reviewed,corrected,review,reviewFile,decision,decisions};
}
test("P60-F RED: discover concise versioned actions and privilege limits, without any browser/History access",()=>{
 const r=run(script,"actions");
 assert.equal(r.status,0,JSON.stringify(r.data));
 assert.equal(r.data.format,"practice-desk-agent-handoff-actions");
 assert.equal(r.data.version,1);
 assert.deepEqual(r.data.modes,["single","paired","pdf"]);
 assert.deepEqual(r.data.commands.map(x=>x.name),["prepare","assess","publish"]);
 assert.equal(r.data.commands[0].privilege,"create-only-with-explicit-consent");
 assert.equal(r.data.commands[1].privilege,"read-only");
 assert.equal(r.data.commands[2].privilege,"create-only-with-explicit-consent");
 assert.equal(r.data.agentDeviceBridge,false);
 assert.ok(!r.stdout.includes("IndexedDB")&&!r.stdout.includes("correctMarks"));
});
test("P60-H: sourced APFC/CAT items prepare as a complete blind packet, compile cautiously and require real review for strict publication",()=>scoped(async dir=>{
 const compiler=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
 for(const filename of ["source-grounded-apfc-2023.json","source-grounded-cat-2024.json"]){
  const input=fileURLToPath(new URL("../examples/"+filename,import.meta.url));
  const raw=await readFile(input,"utf8"),source=JSON.parse(raw);
  const reviewDir=join(dir,source.bankId+"-review");
  const prepared=run(script,"prepare",input,reviewDir,"--allow-create");
  assert.equal(prepared.status,0,prepared.stderr);
  assert.equal(prepared.data.readyForPublication,false);
  assert.equal(prepared.data.questionCount,2);
  const blind=JSON.parse(await readFile(join(reviewDir,"blind-candidates.json"),"utf8"));
  const review=JSON.parse(await readFile(join(reviewDir,"review.json"),"utf8"));
  assert.equal(blind.items.length,source.questions.length);
  assert.equal(review.records.length,source.questions.length);
  assert.deepEqual(blind.items.map(x=>x.questionId),source.questions.map(q=>q.id));
  for(const [index,q] of source.questions.entries()){
   assert.equal(blind.items[index].answer,undefined);
   assert.equal(blind.items[index].explanation,undefined);
   assert.ok(!JSON.stringify(blind.items[index]).includes(q.explanation));
   assert.equal(review.records[index].independentSolution.blindClaim,false);
   assert.equal(review.records[index].checks.length,20);
   assert.ok(review.records[index].checks.every(check=>check.status==="not-reviewed"));
  }
  const notReviewed=run(quality,"audit",input,"--review",join(reviewDir,"review.json"));
  assert.notEqual(notReviewed.status,0,"An unreviewed real source must not pass the strict editorial gate");
  const blockedOutput=join(dir,source.bankId+"-blocked.exam.json");
  const blocked=run(script,"publish","single",input,blockedOutput,
   "--quality-review",join(reviewDir,"review.json"),"--allow-create");
  assert.notEqual(blocked.status,0);
  await assert.rejects(access(blockedOutput));
  // The canonical authoring pathway can still emit a clearly caution-labelled
  // package; this is NOT a P60-C reviewed or factually authenticated publication.
  const cautionOutput=join(dir,source.bankId+"-caution.exam.json");
  const compiled=run(compiler,"compile-bank",input,cautionOutput);
  assert.equal(compiled.status,0,JSON.stringify(compiled.data));
  const bundle=validateExamPackage(JSON.parse(await readFile(cautionOutput,"utf8")));
  assert.equal(bundle.questions.length,2);
  assert.ok(bundle.questions.every(q=>q.editorial.status==="caution"));
 }
}));
test("P60 final: reject paired comparison options that cannot be applied without a blueprint",()=>scoped(async dir=>{
 const x=await files(dir);
 const r=run(script,"assess","paired",x.original,x.corrected,x.decisions,
  "--quality-review",x.reviewFile,"--against",x.original);
 assert.notEqual(r.status,0);
 assert.match(r.data.message,/--against requires --blueprint/);
 assert.equal(r.data.readyForPublication,false);
}));
test("P60-F RED: single mode converges source + P60-C into bounded answer-private readiness",()=>scoped(async dir=>{
 const x=await files(dir);
 const result=run(script,"assess","single",x.corrected,"--quality-review",x.reviewFile);
 assert.equal(result.status,0,JSON.stringify(result.data));
 assert.equal(result.data.readyForPublication,true);
 assert.equal(result.data.factualVerification,"not-performed");
 assert.equal(result.data.externalAuthenticatedReview,false);
 assert.equal(result.data.mode,"single");
 assert.ok(result.stdout.length<6000);
 assert.ok(!result.stdout.includes("Synthetic disputed editorial key"));
 assert.ok(!result.stdout.includes("data:image"));
 const noReview=run(script,"assess","single",x.corrected);
 assert.notEqual(noReview.status,0);
 assert.equal(noReview.data.readyForPublication,false);
 assert.ok(!noReview.stdout.includes(x.review.records[0].independentSolution.reasoning));
 const noOutput=join(dir,"forbidden.json");
 const blocked=run(script,"publish","single",x.corrected,noOutput,"--quality-review",x.reviewFile);
 assert.notEqual(blocked.status,0);
 await assert.rejects(access(noOutput));
 const yes=run(script,"publish","single",x.corrected,noOutput,"--quality-review",x.reviewFile,"--allow-create");
 assert.equal(yes.status,0,JSON.stringify(yes.data));
 assert.equal(yes.data.writtenFiles.length,1);
 assert.equal(yes.data.writtenFiles[0].sha256,sha(await readFile(noOutput)));
 const pkg=validateExamPackage(JSON.parse(await readFile(noOutput,"utf8")));
 assert.equal(pkg.questions.length,3);
 assert.ok(pkg.questions.every(q=>q.editorial.status==="caution"));
 const duplicate=run(script,"publish","single",x.corrected,noOutput,"--quality-review",x.reviewFile,"--allow-create");
 assert.notEqual(duplicate.status,0);
 assert.equal(sha(await readFile(noOutput)),yes.data.writtenFiles[0].sha256);
}));
test("P60-F RED: paired original/reviewed only publishes with complete SHA-bound review, decisions and create-only permission",()=>scoped(async dir=>{
 const x=await files(dir);
 const ok=run(script,"assess","paired",x.original,x.corrected,x.decisions,"--quality-review",x.reviewFile);
 assert.equal(ok.status,0,JSON.stringify(ok.data));
 assert.equal(ok.data.mode,"paired");
 assert.equal(ok.data.readyForPublication,true);
 assert.equal(ok.data.sourceKeyComparison?.unavailable,1,"Changed key/explanation is not semantically comparable to the printed source");
 const output=join(dir,"pair-output");
 assert.notEqual(run(script,"publish","paired",x.original,x.corrected,x.decisions,output,
  "--quality-review",x.reviewFile).status,0);
 await assert.rejects(access(output));
 const yes=run(script,"publish","paired",x.original,x.corrected,x.decisions,output,
  "--quality-review",x.reviewFile,"--allow-create");
 assert.equal(yes.status,0,JSON.stringify(yes.data));
 assert.equal(yes.data.writtenFiles.length,5);
 assert.equal(await readFile(join(output,"original-source.json"),"utf8"),await readFile(x.original,"utf8"));
 assert.equal(await readFile(join(output,"reviewed-source.json"),"utf8"),await readFile(x.corrected,"utf8"));
 const source=validateExamPackage(JSON.parse(await readFile(join(output,"source.exam.json"),"utf8")));
 const reviewed=validateExamPackage(JSON.parse(await readFile(join(output,"reviewed.exam.json"),"utf8")));
 assert.equal(source.answerKey.entries[0].answer.optionId,"B");
 assert.equal(reviewed.answerKey.entries[0].answer.optionId,"A");
 assert.equal(source.paper.edition,"source");
 assert.equal(reviewed.paper.edition,"reviewed");
 const outdated={...x.decision,originalSha256:"f".repeat(64)};
 const stale=await put(dir,"bad-decisions.json",outdated),notCreated=join(dir,"must-not-exist");
 const rejected=run(script,"publish","paired",x.original,x.corrected,stale,notCreated,
  "--quality-review",x.reviewFile,"--allow-create");
 assert.notEqual(rejected.status,0);
 await assert.rejects(access(notCreated));
}));
test("P60-F RED: invalid QA source hash and blueprint mismatch fail before any new file",()=>scoped(async dir=>{
 const x=await files(dir);
 const review={...x.review,sourceSha256:"b".repeat(64)};
 const bad=await put(dir,"stale-review.json",review),out=join(dir,"no-file.json");
 const failure=run(script,"publish","single",x.corrected,out,
  "--quality-review",bad,"--allow-create");
 assert.notEqual(failure.status,0);await assert.rejects(access(out));
 const plan=JSON.parse(await readFile(new URL("../examples/p60b-apfc-blueprint.json",import.meta.url),"utf8"));
 plan.targetCount=999;
 const planFile=await put(dir,"wrong-blueprint.json",plan);
 const blocked=run(script,"publish","single",x.corrected,out,
  "--quality-review",x.reviewFile,"--blueprint",planFile,"--allow-create");
 assert.notEqual(blocked.status,0);await assert.rejects(access(out));
}));
test("P60-F RED: unknown modes/flags and local private-performance request fail closed",()=>scoped(async dir=>{
 for(const args of [["inspect-performance"],["publish","single","source.json","out.json","--allow-create"],
  ["assess","bad-mode","source.json"],["assess","single","source.json","--history","x.json"],
  ["publish","single","source.json","out.json","--allow-create","--allow-create"]]){
  const r=run(script,...args);
  assert.notEqual(r.status,0,args.join(" "));
  assert.equal(r.data.valid,false);
 }
}));

test("P60-F RED: one strict handoff also handles agent-transcribed PDF and preserves original/key lineage",()=>scoped(async dir=>{
 const x=await files(dir,{asDocument:true});
 // Minimal private synthetic PDF byte source; page text truth is not checked by this software.
 const document=await put(dir,"fixture.pdf",Buffer.from(
  "%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"+
  "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"+
  "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 300 300] >> endobj\n"+
  "trailer << /Root 1 0 R >>\n%%EOF\n"));
 const tool=fileURLToPath(new URL("../scripts/pdf-ingest.mjs",import.meta.url));
 const template=run(tool,"template",x.original,document);
 assert.equal(template.status,0,JSON.stringify(template.data));
 const intake=structuredClone(template.data);
 intake.document.title="Synthetic paper with original questions and printed key";
 intake.document.identityNote="Synthetic fixture, original page and key only, not a real institutional paper";
 intake.document.inspectedPages=[1];
 intake.inspector={kind:"agent",id:"test-pdf-agent",method:"Synthetic page comparison only",
  reviewedAt:"2026-11-06"};
 intake.documentInventoryStatus="checked-against-source";
 intake.externalVerification="recorded-agent-check";
 for(const [i,row] of intake.questions.entries())Object.assign(row,{pages:[1],
  status:"source-compared",printedNumber:String(i+1),keyOrigin:"source-document",
  keyPages:[1],mathStatus:"source-compared",explanationOrigin:"editorial-not-in-source",
  notes:"Synthetic source comparison assertion is not independently authenticated."});
 const intakePath=await put(dir,"intake.json",intake);
 const yes=run(script,"assess","pdf",intakePath,x.original,document,x.corrected,x.decisions,
  "--quality-review",x.reviewFile);
 assert.equal(yes.status,0,JSON.stringify(yes.data));
 assert.equal(yes.data.readyForPublication,true);
 assert.equal(yes.data.externalAuthenticatedReview,false);
 const out=join(dir,"pdf-handoff");
 const publish=run(script,"publish","pdf",intakePath,x.original,document,x.corrected,x.decisions,out,
  "--quality-review",x.reviewFile,"--allow-create");
 assert.equal(publish.status,0,JSON.stringify(publish.data));
 assert.equal(publish.data.writtenFiles.length,6);
 assert.deepEqual((await readdir(out)).sort(),["editorial-lineage.json","original-source.json",
  "pdf-intake-provenance.json","reviewed-source.json","reviewed.exam.json","source.exam.json"]);
 const manifest=JSON.parse(await readFile(join(out,"pdf-intake-provenance.json"),"utf8"));
 assert.equal(manifest.document.sha256,sha(await readFile(document)));
 const source=JSON.parse(await readFile(join(out,"source.exam.json"),"utf8"));
 assert.equal(source.paper.edition,"source");
 assert.equal(await readFile(join(out,"original-source.json"),"utf8"),
  await readFile(x.original,"utf8"));
 intake.questions[0].keyOrigin="unavailable";
 const invalid=await put(dir,"intake-stale-key.json",intake);
 const blocked=run(script,"publish","pdf",invalid,x.original,document,x.corrected,x.decisions,
  join(dir,"not-written"),"--quality-review",x.reviewFile,"--allow-create");
 assert.notEqual(blocked.status,0);
 await assert.rejects(access(join(dir,"not-written")));
}));
