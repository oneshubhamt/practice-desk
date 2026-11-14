/** Canonical product-domain suite. */
{
// Merged from tests/p59-agent-native-authoring.test.mjs; lexical isolation preserves original fixtures.
/** P59 RED-first agent-native context-efficient editing contract.
 * Proves real CLI interface without binding external agents to app internals.
 * Generated source claims stay unverified; no network/browser/DB use.
 */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {spawnSync}=await import("node:child_process");
const {fileURLToPath}=await import("node:url");
const {mkdtemp,readFile,writeFile,rm}=await import("node:fs/promises");
const {tmpdir}=await import("node:os");
const {join}=await import("node:path");
const {createHash}=await import("node:crypto");
const {inspectExternalQuestionBank}=await import("../src/authoring/external-bank.ts");
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
 assert.equal(next.questions[0].qa.status,"needs-review",
  "Any substantive AI key/solution correction must be queued for renewed review");
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
  {...base,updates:[{...base.updates[0],set:{qa:{status:"verified"}}}]},
  {...base,updates:[{...base.updates[0],set:{answer:"C",qa:{status:"unchecked"}}}]}
 ];
 for(const [i,shape] of cases.entries()){
  await writeFile(patch,JSON.stringify(shape));
  const r=exec("patch",input,patch,output);
  assert.notEqual(r.status,0,"Invalid patch "+i+" must fail");
  assert.equal(r.data.valid,false);
  assert.ok(["agent-input-invalid","agent-validation-failed"].includes(r.data.code),
   "Invalid edit "+i+" should have a structured typed failure: "+JSON.stringify(r.data));
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


test("P59: AI appends or removes only named questions with a non-destructive guard; dry runs never materialize output",async()=>inTemp(async dir=>{
 const source=JSON.parse(await readFile(apfc,"utf8"));
 const input=join(dir,"source.json"),patch=join(dir,"patch.json"),
  output=join(dir,"next.json");
 await writeFile(input,JSON.stringify(source));
 const base=exec("inspect",input).data.sourceSha256;
 const q=exec("show",input,"labour-01");
 const appended={...structuredClone(source.questions[0]),
  id:"labour-02",prompt:"Which letter immediately follows B in the English alphabet?",
  answer:"C",explanation:"C follows B; A precedes B and D comes after C."};
 const operations={
  format:"practice-desk-agent-patch",version:1,baseSha256:base,
  add:[appended],
  remove:[{id:"labour-01",expectedQuestionSha256:q.data.questionSha256}]
 };
 await writeFile(patch,JSON.stringify(operations));
 const dry=exec("patch",input,patch,output,"--dry-run");
 assert.equal(dry.status,0,dry.stderr);
 assert.equal(dry.data.dryRun,true);
 assert.deepEqual(dry.data.addedIds,["labour-02"]);
 assert.deepEqual(dry.data.removedIds,["labour-01"]);
 await assert.rejects(()=>readFile(output));
 const applied=exec("patch",input,patch,output);
 assert.equal(applied.status,0,applied.stderr);
 const next=JSON.parse(await readFile(output,"utf8"));
 assert.ok(!next.questions.some(q=>q.id==="labour-01"));
 assert.ok(next.questions.some(q=>q.id==="labour-02"));
 assert.equal(next.questions.length,3);
 assert.equal(source.questions[0].id,"labour-01");
 assert.equal(inspectExternalQuestionBank(next).valid,true);
 const same=exec("patch",input,patch,output);
 assert.notEqual(same.status,0);
 assert.match(same.data.message,/exist/i);
}));

test("P59: focused optional-field removal needs exact question identity; no arbitrary modifications allowed",async()=>inTemp(async dir=>{
 const source=JSON.parse(await readFile(apfc,"utf8"));
 const input=join(dir,"source.json"),patch=join(dir,"patch.json"),
  output=join(dir,"clean.json");
 await writeFile(input,JSON.stringify(source));
 const base=exec("inspect",input).data.sourceSha256;
 const item=exec("show",input,"labour-01").data.questionSha256;
 await writeFile(patch,JSON.stringify({
  format:"practice-desk-agent-patch",version:1,baseSha256:base,
  updates:[{id:"labour-01",expectedQuestionSha256:item,unset:["topic"]}]
 }));
 const out=exec("patch",input,patch,output);
 assert.equal(out.status,0,out.stderr);
 assert.equal(JSON.parse(await readFile(output,"utf8")).questions[0].topic,undefined);
 assert.equal(JSON.parse(await readFile(input,"utf8")).questions[0].topic,"Illustrative labour principles");
}));


test("P59: 200-question ordinary agent inspection uses much smaller output than full QA without concealing truncation",async()=>inTemp(async dir=>{
 const {makeP58cSources}=await import("../scripts/p58c-synthetic-fixture.mjs");
 const source=makeP58cSources({files:1,each:200,media:false})[0];
 const input=join(dir,"200-questions.json");
 await writeFile(input,JSON.stringify(source));
 const compact=exec("inspect",input);
 assert.equal(compact.status,0,compact.stderr);
 assert.equal(compact.data.questionCount,200);
 assert.equal(compact.data.issues.limit,12);
 assert.ok(compact.data.issues.items.length<=12);
 assert.equal(compact.data.factualVerification,"not-performed");
 const fullCli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
 const old=spawnSync(process.execPath,[fullCli,"qa-bank",input],{
  encoding:"utf8",timeout:30000,maxBuffer:2*1024*1024
 });
 assert.equal(old.status,0,old.stderr);
 assert.ok(compact.stdout.length<8000,
  "200-question compact report must not print all 200 question checks");
 assert.ok(compact.stdout.length*5<old.stdout.length,
  "Compact authoring diagnostics should consume at most a fifth of full QA characters");
 console.log("P59 agent context proxy, 200 questions: concise "+compact.stdout.length+
  " UTF-8 JS characters vs full machine QA "+old.stdout.length+
  " JS characters; this is not a measured model token count");
}));


test("P59: editing an alleged official PYQ cannot silently retain its provenance or suppress correction review",async()=>inTemp(async dir=>{
 const source=JSON.parse(await readFile(apfc,"utf8"));
 source.questions[0].provenance={kind:"official-pyq",examYear:2025,
  sourceNote:"Synthetic, unverified label added for this negative test only"};
 const input=join(dir,"unverified.json"),ops=join(dir,"patch.json"),output=join(dir,"corrected.json");
 await writeFile(input,JSON.stringify(source));
 const baseSha256=exec("inspect",input).data.sourceSha256;
 const expectedQuestionSha256=exec("show",input,"labour-01").data.questionSha256;
 const set={prompt:"Which letter comes third in the English alphabet?",
  answer:"C",explanation:"C comes third in this synthetic practice example."};
 const patch={
  format:"practice-desk-agent-patch",version:1,baseSha256,
  updates:[{id:"labour-01",expectedQuestionSha256,set}]
 };
 await writeFile(ops,JSON.stringify(patch));
 const denied=exec("patch",input,ops,output);
 assert.notEqual(denied.status,0);
 assert.match(denied.data.message,/official-PYQ|provenance/i);
 await assert.rejects(()=>readFile(output));
 patch.updates[0].set.provenance={
  kind:"reconstruction",sourceNote:"Edited from a hypothetical, UNVERIFIED source claim"
 };
 await writeFile(ops,JSON.stringify(patch));
 const allowed=exec("patch",input,ops,output);
 assert.equal(allowed.status,0,allowed.stderr);
 const corrected=JSON.parse(await readFile(output,"utf8"));
 assert.equal(corrected.questions[0].provenance.kind,"reconstruction");
 assert.equal(corrected.questions[0].qa.status,"needs-review");
 assert.equal(inspectExternalQuestionBank(corrected).factualVerification,"not-performed");
 assert.equal(JSON.parse(await readFile(input,"utf8")).questions[0].provenance.kind,"official-pyq");
}));
}

{
// Merged from tests/p60a-agent-capabilities.test.mjs; lexical isolation preserves original fixtures.
/** P60-A read-only agent capability discovery contract.
 * Source-based claims, bounded outputs and honest planned-vs-built statuses.
 */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {spawnSync}=await import("node:child_process");
const {readFile,access}=await import("node:fs/promises");
const {fileURLToPath}=await import("node:url");
const {resolve,dirname}=await import("node:path");
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
 assert.equal(doc.capabilities.length,16);
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
 assert.deepEqual(new Set(doc.plannedProgramme.map(x=>x.id)),new Set());
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
 assert.equal(s.json.capabilityCount,16);
 assert.equal(s.json.product.runtime.includes("offline"),true);
 assert.ok(s.stdout.length<5500,"Summary should not dump whole contract");
 assert.ok(!s.stdout.includes("sourcePaths"),"Summary should not dump source code paths");
 const list=cli("list");
 assert.equal(list.status,0,list.stderr);
 assert.equal(list.json.format,"practice-desk-capability-list");
 assert.equal(list.json.capabilities.length,16);
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
 assert.equal(ops.json.operations.length,21);
  assert.ok(ops.json.operations.some(x=>x.operation==="prepare-blind-review"&&
   x.command.includes("--allow-create")),"Discovery must advertise the real full-bank preparation action");
 assert.ok(ops.json.operations.every(x=>["read-only","create-new-file"].includes(x.privilege)));
 assert.ok(!ops.stdout.includes("IndexedDB"));
 const intake=cli("show","agent-pdf-intake");
 assert.equal(intake.status,0,intake.stderr);
 assert.equal(intake.json.capability.id,"agent-pdf-intake");
 const handoff=cli("show","agent-integration");
 assert.equal(handoff.status,0,handoff.stderr);
 assert.equal(handoff.json.capability.id,"agent-integration");
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
 assert.deepEqual(plannedIds,[]);
 assert.ok(contractDoc.capabilities.some(x=>x.id==="agent-integration"&&x.status==="implemented-with-limits"));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="agent-pdf-intake"&&x.status==="implemented-with-limits"));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="editorial-editions"&&x.limitations.some(y=>y.includes("P60-E"))));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="rich-media"&&x.limitations.some(y=>y.includes("PDF"))));
 assert.ok(contractDoc.capabilities.some(x=>x.id==="ai-authoring"&&x.limitations.some(y=>y.includes("authenticate"))));
});
}

{
// Merged from tests/p60f-agent-handoff.test.mjs; lexical isolation preserves original fixtures.
/** P60-F RED: a coherent source-bound agent handoff, never a cloud/device bridge.
 * All reviewer/source statements in fixtures are synthetic, not proof of truth.
 */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {spawnSync}=await import("node:child_process");
const {readFile,writeFile,mkdtemp,rm,readdir,access}=await import("node:fs/promises");
const {createHash}=await import("node:crypto");
const {tmpdir}=await import("node:os");
const {join}=await import("node:path");
const {fileURLToPath}=await import("node:url");
const {validateExamPackage}=await import("../src/app/exam-package.ts");
const {QUALITY_CHECKLIST}=await import("../scripts/question-quality.mjs");
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
 const review={format:"practice-desk-quality-review",version:2,bankId:reviewed.bankId,
  sourceSha256:packet.data.sourceSha256,records:packet.data.items.map(candidate=>{
   const q=reviewed.questions.find(x=>x.id===candidate.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:candidate.candidateSha256,
    applicability:{mathematical:q.id==="account-01"?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},
    reviewer:{kind:"ai",id:"synthetic-independent-check"},
    independentSolution:{blindClaim:true,answer:String(q.answer),
     reasoning:"Synthetic QA check record; no source has been authenticated."},
    checks:QUALITY_CHECKLIST.map((ck,i)=>({id:ck.id,status:"pass",
     basis:i===9?"mathematical-proof":[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
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
test("P60 full QA: source-attributed APFC/CAT end-to-end review record, strict publication, integrity and stale refusal",()=>scoped(async dir=>{
 for(const file of ["source-grounded-apfc-2023.json","source-grounded-cat-2024.json"]){
  const input=fileURLToPath(new URL("../examples/"+file,import.meta.url));
  const source=JSON.parse(await readFile(input,"utf8"));
  const reviewDir=join(dir,source.bankId+"-full-review");
  const prepared=run(script,"prepare",input,reviewDir,"--allow-create");
  assert.equal(prepared.status,0,prepared.stderr);
  const review=JSON.parse(await readFile(join(reviewDir,"review.json"),"utf8"));
  // These reviewer and evidence declarations are synthetic contract checks,
  // NOT an independent blind fact check, source fetch or PYQ authentication.
  review.records=review.records.map((record,i)=>{
   const q=source.questions[i],math=file.startsWith("source-grounded-cat");
   return {...record,applicability:{mathematical:math?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},reviewer:{id:"synthetic-p60-e2e",kind:"ai"},
    independentSolution:{blindClaim:true,answer:String(q.answer),
     reasoning:"Synthetic software-acceptance replay of the authored answer. No independent research or blinding occurred."},
    checks:record.checks.map(check=>({id:check.id,
     status:check.id==="pyq-fidelity"||check.id==="temporal-correctness"||
      (check.id==="mathematical-correctness"&&!math)?"not-applicable":"pass",
     basis:check.id==="candidate-view-integrity"?"rendered-claim":
      check.id==="factual-correctness"?(math?"mathematical-proof":"source-consulted"):
      check.id==="mathematical-correctness"&&math?"mathematical-proof":"independent-editorial",
     rationale:"Synthetic acceptance record only. Editorial and source claims remain unauthenticated."})),
    evidence:[{publisher:"Synthetic acceptance",title:"Source-grounded example only",
     locator:q.id,retrievedAt:"2026-11-06",excerpt:"Software regression: source was not independently authenticated."}]};
  });
  const reviewFile=await put(dir,source.bankId+"-completed-review.json",review);
  const assessed=run(script,"assess","single",input,"--quality-review",reviewFile);
  assert.equal(assessed.status,0,JSON.stringify(assessed.data));
  assert.equal(assessed.data.readyForPublication,true);
  assert.equal(assessed.data.externalAuthenticatedReview,false);
  assert.equal(assessed.data.factualVerification,"not-performed");
  const destination=join(dir,source.bankId+"-strict.exam.json");
  const published=run(script,"publish","single",input,destination,
   "--quality-review",reviewFile,"--allow-create");
  assert.equal(published.status,0,JSON.stringify(published.data));
  assert.equal(published.data.writtenFiles[0].file,destination);
  assert.equal(published.data.writtenFiles[0].sha256,sha(await readFile(destination)));
  const pkg=validateExamPackage(JSON.parse(await readFile(destination,"utf8")));
  assert.equal(pkg.questions.length,2);
  assert.equal(pkg.answerKey.entries.length,2);
  assert.ok(pkg.questions.every(q=>q.editorial.status==="caution"));
  const twice=run(script,"publish","single",input,destination,
   "--quality-review",reviewFile,"--allow-create");
  assert.notEqual(twice.status,0,"Create-only publication cannot overwrite a verified package");
  const modified=structuredClone(source);
  modified.questions[0].answer=modified.questions[0].answer==="A"?"B":"A";
  const changedInput=await put(dir,source.bankId+"-changed.json",modified);
  const staleFile=join(dir,source.bankId+"-stale-do-not-write.json");
  const stale=run(script,"publish","single",changedInput,staleFile,
   "--quality-review",reviewFile,"--allow-create");
  assert.notEqual(stale.status,0);
  await assert.rejects(access(staleFile));
 }
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
 assert.equal(yes.data.writtenFiles[0].file,noOutput);
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
 assert.equal(ok.data.sourceKeyComparison?.unavailable,0,"Key/explanation-only changes preserve candidate semantic comparability");
 const output=join(dir,"pair-output");
 assert.notEqual(run(script,"publish","paired",x.original,x.corrected,x.decisions,output,
  "--quality-review",x.reviewFile).status,0);
 await assert.rejects(access(output));
 const yes=run(script,"publish","paired",x.original,x.corrected,x.decisions,output,
  "--quality-review",x.reviewFile,"--allow-create");
 assert.equal(yes.status,0,JSON.stringify(yes.data));
 assert.equal(yes.data.writtenFiles.length,5);
 assert.deepEqual(yes.data.writtenFiles.map(x=>x.file).sort(),
  ["editorial-lineage.json","original-source.json","reviewed-source.json","reviewed.exam.json","source.exam.json"]
   .map(x=>join(output,x)).sort(),"Published bundle reports usable full output paths");
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

// P62-A: the agent can assess a partial bank, but cannot publish it or its reviewed pair.
test("P62-A agent assessment preserves valid partial status and rejects incomplete publication",()=>scoped(async dir=>{
 const x=await files(dir);
 const plan=JSON.parse(await readFile(new URL("../examples/p60b-apfc-blueprint.json",import.meta.url),"utf8"));
 plan.allowPartial=true;plan.targetCount=4;
 for(const quota of Object.values(plan.quotas))quota.exhaustive=false;
 const planFile=await put(dir,"partial-p62-blueprint.json",plan);
 const assessed=run(script,"assess","single",x.corrected,
   "--quality-review",x.reviewFile,"--blueprint",planFile);
 assert.equal(assessed.status,0,JSON.stringify(assessed.data));
 assert.equal(assessed.data.valid,true);
 assert.equal(assessed.data.readyForPublication,false);
 assert.equal(assessed.data.partialDelivery,true);
 assert.equal(assessed.data.remainingCount,1);
 const output=join(dir,"blocked-partial.exam.json");
 const publication=run(script,"publish","single",x.corrected,output,
   "--quality-review",x.reviewFile,"--blueprint",planFile,"--allow-create");
 assert.notEqual(publication.status,0);
 assert.equal(publication.data.valid,true);
 assert.equal(publication.data.readyForPublication,false);
 await assert.rejects(access(output));
 const paired=run(script,"assess","paired",x.original,x.corrected,x.decisions,
   "--quality-review",x.reviewFile,"--blueprint",planFile);
 assert.equal(paired.status,0,JSON.stringify(paired.data));
 assert.equal(paired.data.valid,true);
 assert.equal(paired.data.readyForPublication,false);
 const folder=join(dir,"blocked-pair");
 const pairedPublication=run(script,"publish","paired",x.original,x.corrected,x.decisions,folder,
   "--quality-review",x.reviewFile,"--blueprint",planFile,"--allow-create");
 assert.notEqual(pairedPublication.status,0);
 await assert.rejects(access(folder));
}));
}
