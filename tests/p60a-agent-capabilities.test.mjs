/** P60-A read-only agent capability discovery contract.
 * Source-based claims, bounded outputs and honest planned-vs-built statuses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,access} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";

const root=fileURLToPath(new URL("../",import.meta.url));
const contract=fileURLToPath(new URL("../docs/contracts/practice-desk-capabilities.v1.json",import.meta.url));
const script=fileURLToPath(new URL("../scripts/practice-desk-capabilities.mjs",import.meta.url));
const cli=(...args)=>{
 const r=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:10000,maxBuffer:250000});
 assert.equal(r.error,undefined,String(r.error));
 let json;
 try{json=JSON.parse(r.stdout||r.stderr);}catch{assert.fail("CLI must emit valid JSON: "+r.stdout+" "+r.stderr);}
 return {...r,json};
};

test("P60-A: source-backed capability catalogue is versioned, unique, nonempty and evidence-navigable",async()=>{
 const doc=JSON.parse(await readFile(contract,"utf8"));
 assert.equal(doc.format,"practice-desk-agent-capabilities");
 assert.equal(doc.version,1);
 assert.equal(doc.product.embeddedLLM,false);
 assert.equal(doc.product.automaticCloudSync,false);
 assert.equal(doc.product.agentDeviceBridge,false);
 assert.equal(doc.capabilities.length,13);
 const ids=new Set();
 for(const cap of doc.capabilities){
  assert.match(cap.id,/^[a-z0-9-]+$/);
  assert.ok(!ids.has(cap.id),"duplicate capability "+cap.id);
  ids.add(cap.id);
  assert.ok(["implemented","implemented-with-limits"].includes(cap.status));
  assert.ok(cap.summary.length>=30);
  assert.ok(cap.agentUse.length>=15);
  assert.ok(cap.limitations.length>=1);
  assert.ok(cap.provides.length>=2);
  for(const src of cap.sourcePaths){
   assert.ok(/^(src|scripts)\/[\w./-]+\.(?:ts|mjs)$/.test(src),"No external/untrusted evidence path");
   assert.ok(!src.includes(".."),"Source paths must remain repository-relative");
   await access(resolve(root,src));
  }
 }
 assert.deepEqual(new Set(doc.plannedProgramme.map(x=>x.id)),new Set(["P60-D","P60-E","P60-F"]));
 assert.ok(doc.trustBoundaries.some(x=>x.includes("does not authenticate")));
 await access(resolve(root,doc.discovery.lowContextEntry));
 await access(resolve(root,doc.discovery.appGuide));
 await access(resolve(root,doc.discovery.programme));
});

test("P60-A: default summary and list are bounded, source-private, machine-readable and low-context",()=>{
 const s=cli("summary");
 assert.equal(s.status,0,s.stderr);
 assert.equal(s.json.format,"practice-desk-capability-summary");
 assert.equal(s.json.version,1);
 assert.equal(s.json.capabilityCount,13);
 assert.equal(s.json.product.runtime.includes("offline"),true);
 assert.ok(s.stdout.length<5500,"Summary should not dump whole contract");
 assert.ok(!s.stdout.includes("sourcePaths"),"Summary should not dump source code paths");
 const list=cli("list");
 assert.equal(list.status,0,list.stderr);
 assert.equal(list.json.format,"practice-desk-capability-list");
 assert.equal(list.json.capabilities.length,13);
 assert.ok(list.stdout.length<7500);
 assert.ok(!list.stdout.includes("sourcePaths"),"List should not dump source references");
 assert.ok(!list.stdout.includes("correctMarks"),"List should not expose paper/answer data");
});

test("P60-A: agent can inspect exactly one capability and concrete operation separately",()=>{
 const f=cli("show","ai-authoring");
 assert.equal(f.status,0,f.stderr);
 assert.equal(f.json.format,"practice-desk-capability");
 assert.equal(f.json.capability.id,"ai-authoring");
 assert.deepEqual(f.json.capability.sourcePaths.some(x=>x.endsWith("question-bank-agent.mjs")),true);
 assert.ok(!f.stdout.includes("Exam source and answer-key integrity maintained"));
 const ops=cli("operations");
 assert.equal(ops.status,0,ops.stderr);
 assert.equal(ops.json.operations.length,12);
 assert.ok(ops.json.operations.every(x=>["read-only","create-new-file"].includes(x.privilege)));
 assert.ok(!ops.stdout.includes("IndexedDB"));
});

test("P60-A: unsupported or ambiguous commands fail closed without app/history access",()=>{
 for(const args of [[],["show"],["show","pdf-ingestion"],["show","__proto__"],["list","extra"],["foo"]]){
  const r=cli(...args);
  assert.notEqual(r.status,0,args.join(" "));
  assert.equal(r.json.valid,false);
  assert.equal(r.json.code,"unsupported-capability-request");
 }
});

test("P60-A: documentation truth table excludes claims that later P60 work already exists",async()=>{
 const raw=await readFile(contract,"utf8");
 const contractDoc=JSON.parse(raw);
 const plannedIds=contractDoc.plannedProgramme.map(x=>x.id);
 assert.deepEqual(plannedIds,["P60-D","P60-E","P60-F"]);
 assert.ok(contractDoc.capabilities.some(x=>x.id==="editorial-source"&&x.limitations.some(y=>y.includes("P60-D"))));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="rich-media"&&x.limitations.some(y=>y.includes("PDF"))));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="ai-authoring"&&x.limitations.some(y=>y.includes("authenticate"))));
});
