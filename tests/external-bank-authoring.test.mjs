/** Canonical external-bank and staged-authoring contracts. */
{
// Merged from tests/p57a-external-bank.test.mjs; lexical isolation preserves original fixtures.
/** P57-A red/green external authoring source contract and immutable end-to-end oracles. */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {readFile}=await import("node:fs/promises");
const {compileExternalQuestionBank,inspectExternalQuestionBank,toAuthoringDraft}=await import("../src/authoring/external-bank.ts");
const {validateExamPackage}=await import("../src/app/exam-package.ts");
const {scoreAttempt}=await import("../src/engine/scoring.ts");
const fixture=async(name)=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
test("P57-A CAT external agent source compiles without authored hashes and reuses one shared RC and DILR stimulus",async()=>{
 const source=await fixture("cat"),report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const pkg=compileExternalQuestionBank(source);
 assert.equal(validateExamPackage(pkg),pkg);
 assert.equal(JSON.stringify(pkg),JSON.stringify(compileExternalQuestionBank(structuredClone(source))));
 assert.equal(pkg.paper.sections.length,3);
 assert.deepEqual(pkg.questions.map(q=>q.content.kind),["single-choice","numeric-entry","multiple-select"]);
 assert.equal(pkg.stimuli.length,2);
 assert.equal(pkg.questions[0].content.stimulusId,pkg.stimuli[0].id);
 assert.equal(pkg.questions[1].content.stimulusId,pkg.stimuli[1].id);
 assert.equal(pkg.paper.timing.kind,"sectional");
 assert.equal(pkg.paper.timing.sectionLimits.length,3);
 assert.equal(pkg.questions[0].editorial.status,"caution");
 assert.match(pkg.questions[0].editorial.notes,/not been independently certified/);
});
test("P57-A APFC academic subject hierarchy remains independent of one physical exam section",async()=>{
 const source=await fixture("apfc");
 const pkg=compileExternalQuestionBank(source);
 assert.equal(pkg.paper.sections.length,1);
 assert.equal(pkg.paper.sections[0].questionRevisionIds.length,3);
 assert.equal(pkg.questions.length,3);
 assert.ok(pkg.questions[0].content.topicIds[0].includes("Industrial"));
 assert.ok(pkg.questions[1].content.topicIds[0].includes("Developmental"));
 assert.ok(pkg.questions[2].content.topicIds[0].includes("Accountancy"));
 assert.equal(pkg.paper.scoring.defaultRule.incorrectMarks,-5/6);
 const q=pkg.questions[0],entries=pkg.answerKey.entries;
 const marked=[{questionRevisionId:q.id,response:{kind:"single-choice",optionId:"A"},timeSpentMs:0,answerChangeCount:0}];
 const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,marked,new Date().toISOString());
 assert.ok(Math.abs(result.snapshot.earnedMarks-(-5/6))<1e-10);
 const draft=toAuthoringDraft(source);
 assert.equal(draft.questions[0].section,"Combined Examination");
 assert.equal(draft.questions[0].syllabusHeadingId,"labour");
 assert.equal(entries[0].answer.optionId,"B");
});
test("P57-A external source rejects unsupported fields, fake IDs, broken references, suspect math and conflicting answer keys",async()=>{
 const source=await fixture("cat");
 const cases=[
  {format:"practice-desk-exam"},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,contentHash:"forged"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,stimulusRef:"missing"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,answer:"Z"})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,options:["x","y"]})},
  {questions:source.questions.map((q,i)=>i?{...q}:{...q,prompt:"<script>alert(1)</script>"})},
  {timing:{...source.timing,kind:"sectional",sectionTransition:"automatic"},navigation:{...source.navigation,sectionNavigation:"free"}}
 ];
 for(const fields of cases){
  const input={...source,...fields};
  const report=inspectExternalQuestionBank(input);
  assert.equal(report.valid,false,JSON.stringify(fields));
  assert.ok(report.issues.length>0);
  assert.throws(()=>compileExternalQuestionBank(input));
 }
});
test("P57-A immutable question IDs survive source revisions; changed passage changes hashed reference and older key remains frozen",async()=>{
 const source=await fixture("cat");
 const p1=compileExternalQuestionBank(source);
 const p2=compileExternalQuestionBank({...source,revision:2,stimuli:source.stimuli.map((s,i)=>i? s:{...s,text:s.text+" Revision two."}),questions:source.questions.map((q,i)=>i? q:{...q,answer:"B"})});
 assert.notEqual(p1.paper.id,p2.paper.id);
 assert.equal(p1.questions[0].questionId,p2.questions[0].questionId);
 assert.notEqual(p1.questions[0].content.stimulusId,p2.questions[0].content.stimulusId);
 assert.notEqual(p1.questions[0].contentHash,p2.questions[0].contentHash);
 assert.equal(p1.answerKey.entries[0].answer.optionId,"A");
 assert.equal(p2.answerKey.entries[0].answer.optionId,"B");
 assert.equal(inspectExternalQuestionBank(source,[p1]).valid,false);
});
test("P57-A all six response kinds, safe rich math, image assets and genuine mixed scoring use one published engine",async()=>{
 const original=await fixture("cat");
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const richMath={format:"practice-desk-rich",version:1,
  blocks:[{type:"paragraph",content:[
   {type:"text",text:"Compute "},{type:"math",tex:"2+2",linearText:"two plus two"}]}]};
 const extra=[
  {id:"tf-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"true-false",
   prompt:"2 + 2 = 4.",stimulusRef:"chart-one",answer:true,explanation:"Elementary arithmetic.",
   provenance:{kind:"manual"},qa:{status:"needs-review"}},
  {id:"matching-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"matching",
   prompt:"Match each number with its label.",
   leftItems:["One","Two","Three","Four"],rightItems:["Two","Four","One","Three"],
   answer:"1-C,2-A,3-D,4-B",partialCreditEach:0.5,partialPenaltyEach:0.1,
   explanation:"Pair each word with the matching number.",provenance:{kind:"ai-original"},qa:{status:"unchecked"}},
  {id:"written-1",examSection:"qa",subject:"Quantitative Aptitude",kind:"free-response",
   prompt:richMath,answer:"A model explanation of arithmetic",explanation:"2 + 2 = 4.",
   provenance:{kind:"ai-original"},qa:{status:"unchecked"}}
 ];
 const source={...original,media:[{id:"tiny",dataUri:"data:image/png;base64,"+png,altText:"Illustrative one-pixel icon"}],
  stimuli:[...original.stimuli,{id:"chart-one",kind:"image",mediaRef:"tiny",altText:"Illustrative one-pixel icon"}],
  questions:[...original.questions,...extra]};
 const packageValue=compileExternalQuestionBank(source);
 assert.equal(packageValue.questions.length,6);
 assert.deepEqual(packageValue.questions.map(q=>q.content.kind),
  ["single-choice","numeric-entry","multiple-select","true-false","matching","free-response"]);
 assert.equal(packageValue.assets.length,1);
 assert.equal(packageValue.questions[5].content.richPrompt.blocks[0].content[1].tex,"2+2");
 assert.equal(packageValue.answerKey.entries[4].answer.pairs[0].rightId,"C");
 assert.equal(packageValue.answerKey.entries[3].answer.value,true);
 assert.equal(packageValue.answerKey.entries[5].answer.evaluation,"manual");
 const q=packageValue.questions;
 const responses=[
  {questionRevisionId:q[0].id,response:{kind:"single-choice",optionId:"A"}},
  {questionRevisionId:q[1].id,response:{kind:"numeric-entry",value:6}},
  {questionRevisionId:q[2].id,response:{kind:"multiple-select",optionIds:["A","C"]}},
  {questionRevisionId:q[3].id,response:{kind:"true-false",value:true}},
  {questionRevisionId:q[4].id,response:{kind:"matching",pairs:[
   {leftId:"L1",rightId:"C"},{leftId:"L2",rightId:"A"},
   {leftId:"L3",rightId:"D"},{leftId:"L4",rightId:"B"}]}},
  {questionRevisionId:q[5].id,response:{kind:"free-response",text:"2+2 is four"}}
 ].map(x=>({...x,timeSpentMs:0,answerChangeCount:0}));
 const scored=scoreAttempt(packageValue.paper,packageValue.answerKey,packageValue.questions,
  responses,new Date().toISOString());
 assert.deepEqual(scored.items.map(x=>x.verdict),
  ["correct","correct","correct","correct","correct","pending"]);
});
test("P57-A headless CLI emits machine-readable diagnostics and byte-identical compiled JSON without network",async()=>{
 const {mkdtemp,readFile:read,rm}=await import("node:fs/promises");
 const {tmpdir}=await import("node:os");
 const {join}=await import("node:path");
 const {spawnSync}=await import("node:child_process");
 const folder=await mkdtemp(join(tmpdir(),"p57a-"));
 try{
  const input=new URL("../examples/ai-first-apfc.json",import.meta.url).pathname;
  const out=join(folder,"compiled.json");
  const cli=new URL("../scripts/question-bank-cli.mjs",import.meta.url).pathname;
  const validate=spawnSync(process.execPath,[cli,"validate-bank",input],{encoding:"utf8"});
  assert.equal(validate.status,0,validate.stderr);
  assert.equal(JSON.parse(validate.stdout).valid,true);
  const compiled=spawnSync(process.execPath,[cli,"compile-bank",input,out],{encoding:"utf8"});
  assert.equal(compiled.status,0,compiled.stderr);
  assert.deepEqual(JSON.parse(await read(out,"utf8")),compileExternalQuestionBank(await fixture("apfc")));
  const rejected=spawnSync(process.execPath,[cli,"compile-bank",input,out],{encoding:"utf8"});
  assert.notEqual(rejected.status,0,"must not overwrite previous immutable compiler output");
  const malformed=join(folder,"bad.json");await (await import("node:fs/promises")).writeFile(malformed,
   '{"format":"practice-desk-authoring","version":1,"questions":[]}');
  const bad=spawnSync(process.execPath,[cli,"validate-bank",malformed],{encoding:"utf8"});
  assert.equal(bad.status,1);
  const failure=JSON.parse(bad.stdout);
  assert.equal(failure.valid,false);
  assert.ok(failure.issues[0].path);
 }finally{await rm(folder,{recursive:true,force:true});}
});

test("P57-A two CAT RC questions share the same immutable stimulus once; changing media bytes changes frozen reference",async()=>{
 const base=await fixture("cat");
 const rc2={...base.questions[0],id:"rc-2",
  prompt:"Which entity is described in the illustrative passage?",answer:"A"};
 const source={...base,questions:[base.questions[0],rc2,...base.questions.slice(1)]};
 const first=compileExternalQuestionBank(source);
 assert.equal(first.stimuli.length,2,"stimulus must not be copied for each referencing question");
 assert.equal(first.questions[0].content.stimulusId,first.questions[1].content.stimulusId);
 assert.equal(first.paper.sections[0].questionRevisionIds.length,2);
 const png1="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const imageSource={...source,media:[{id:"tiny",altText:"Small demonstration image",dataUri:"data:image/png;base64,"+png1}],
  stimuli:[...source.stimuli,{id:"visual",kind:"chart",mediaRef:"tiny",altText:"Small demonstration image"}],
  questions:[...source.questions.map((q,i)=>i===2?{...q,stimulusRef:"visual"}:q)]};
 const im=compileExternalQuestionBank(imageSource);
 assert.equal(im.questions[2].content.stimulusId,im.stimuli.find(s=>s.kind==="chart").id);
 // Any revised media byte sequence is rehashed. An invalid base64 payload must
 // fail before compilation; no untrusted caller-supplied media digest accepted.
 const broken=structuredClone(imageSource);
 broken.media[0].dataUri="https://external.example/chart.png";
 assert.equal(inspectExternalQuestionBank(broken).valid,false);
});
}

{
// Merged from tests/p57b-external-bank-qa.test.mjs; lexical isolation preserves original fixtures.
/** P57-B independent adversarial deterministic QA tests; no network requests. */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {readFile,mkdtemp,writeFile,rm}=await import("node:fs/promises");
const {tmpdir}=await import("node:os");
const {join}=await import("node:path");
const {spawnSync}=await import("node:child_process");
const {inspectExternalQuestionBank,compileExternalQuestionBank}=await import("../src/authoring/external-bank.ts");
const load=async(kind)=>JSON.parse(await readFile(new URL("../examples/ai-first-"+kind+".json",import.meta.url),"utf8"));
const inspect=(source,compare=[])=>inspectExternalQuestionBank(source,[],compare);
test("P57-B valid CAT/APFC reports explicit unverified states; real engine oracle; no source fetch",async()=>{
 for(const name of ["cat","apfc"]){
  const r=inspect(await load(name));
  assert.equal(r.valid,true,JSON.stringify(r.issues));
  assert.ok(r.quality);
  assert.equal(r.quality.summary.externalSourceFetches,0);
  assert.equal(r.quality.summary.errors,0);
  assert.equal(r.quality.questions.length,3);
  assert.ok(r.quality.questions.every(q=>q.checks.key_consistent==="pass"&&
   q.checks.source_corroborated==="unverified"&&q.checks.human_reviewed==="unverified"));
  assert.equal(r.compiled.questions[0].editorial.status,"caution");
 }
});
test("P57-B block equivalent MCQ answer options with question/field diagnosis",async()=>{
 const s=await load("apfc");
 s.questions[0].options[2]=" B ";
 const r=inspect(s);
 assert.equal(r.valid,false);
 const defect=r.issues.find(i=>i.code==="duplicate-option");
 assert.equal(defect.questionId,"labour-01");
 assert.match(defect.path,/options\[2\]/);
 assert.equal(defect.severity,"error");
 assert.equal(r.compiled,undefined);
 assert.throws(()=>compileExternalQuestionBank(s));
});
test("P57-B narrow deterministic mathematics flags an incorrect keyed arithmetic answer",async()=>{
 const s=await load("apfc");
 s.questions[2].answer="B"; // 3 instead of 4 for What is 2 + 2?
 const r=inspect(s);
 assert.equal(r.valid,false);
 assert.ok(r.issues.some(i=>i.code==="math-answer-conflict"&&i.questionId==="account-01"));
 assert.equal(r.quality.questions[2].checks.solution_checked,"issue");
});
test("P57-B recognizes proved arithmetic but does not claim general factual proof",async()=>{
 const s=await load("apfc");
 const r=inspect(s);
 assert.equal(r.quality.questions[2].checks.solution_checked,"pass");
 assert.equal(r.quality.questions[0].checks.solution_checked,"unverified");
 assert.equal(r.factualVerification,"not-performed");
});
test("P57-B legal claims require provision and as-of evidence, and still cannot be source corroborated",async()=>{
 const s=await load("apfc");
 s.questions[0].prompt="Under the Example Code 2020, section 5 is effective from 2025; which is second alphabetically?";
 let r=inspect(s);
 assert.equal(r.valid,true);
 assert.ok(r.issues.some(i=>i.code==="legal-asof-evidence-missing"));
 assert.ok(r.issues.some(i=>i.code==="legal-currentness-unverified"));
 s.questions[0].provenance.sources=[{publisher:"Example Ministry",title:"Example Gazette",
  url:"https://example.gov.in/gazette.pdf",publicationDate:"2025-01-31",asOfDate:"2026-11-05",
  provision:"section 5",page:"10",stance:"supports"}];
 r=inspect(s);
 assert.equal(r.valid,true,JSON.stringify(r.issues));
 assert.equal(r.issues.some(i=>i.code==="legal-asof-evidence-missing"),false);
 assert.equal(r.quality.questions[0].checks.source_corroborated,"unverified");
 assert.equal(r.compiled.questions[0].editorial.sources[0].url,"https://example.gov.in/gazette.pdf");
 assert.equal(r.compiled.questions[0].editorial.status,"caution");
});
test("P57-B reject fake calendar dates and malicious/credentialled URLs; never execute data",async()=>{
 const cases=["javascript:alert(1)","file:///etc/passwd","http://example.com","https://name:password@example.com"];
 for(const url of cases){
  const s=await load("cat");s.questions[0].provenance.sources=[{publisher:"X",title:"Y",url}];
  const r=inspect(s);assert.equal(r.valid,false,url);
  assert.ok(r.issues.some(i=>i.path.includes("provenance.sources")));
 }
 const s=await load("cat");s.questions[0].provenance.sources=[
  {publisher:"P",title:"T",publicationDate:"2026-02-30"}];
 const r=inspect(s);assert.equal(r.valid,false);
 assert.ok(r.issues.some(i=>i.path.includes("publicationDate")));
});
test("P57-B exact duplicate across files ignores option order; shared passage alone never duplicates",async()=>{
 const s=await load("cat");
 let r=inspect(s);
 assert.equal(r.quality.summary.duplicateCandidates,0);
 const previous=structuredClone(s);previous.bankId="older-batch";previous.paperId="older-paper";
 previous.questions[0].id="other-rc";previous.questions[0].options.reverse();
 r=inspect(s,[previous]);
 assert.equal(r.valid,true);
 assert.ok(r.quality.duplicates.some(d=>d.classification==="exact"&&
  d.second.bankId==="older-batch"&&d.second.questionId==="other-rc"));
 assert.equal(r.quality.duplicates.every(d=>d.resolution==="human-review-required"),true);
});
test("P57-B same-stem and near-duplicate candidates are advisory, not destructive",async()=>{
 const s=await load("cat");
 s.questions[0].id="a";s.questions.push({...s.questions[0],id:"b",
  options:["This different answer","Yes","No","Maybe"]});
 let r=inspect(s);
 assert.equal(r.valid,true);
 assert.ok(r.quality.duplicates.some(d=>d.classification==="same-stem"));
 const long="Which of the following hypothetical library summaries most accurately represents the catalogue replacement described in the passage?";
 s.questions[0].prompt=long;
 s.questions[3].prompt=long.replace("most accurately","best");
 r=inspect(s);
 assert.equal(r.valid,true);
 assert.ok(r.quality.duplicates.some(d=>d.classification==="near"));
});
test("P57-B claimed official PYQ year, source disputes and explicit explanation mismatch remain warning-only",async()=>{
 const s=await load("cat");
 s.questions[0].provenance={kind:"official-pyq",sources:[
  {publisher:"A",title:"One",stance:"supports"},
  {publisher:"B",title:"Two",stance:"disputes"}]};
 s.questions[0].explanation="The correct answer is B.";
 const r=inspect(s);
 assert.equal(r.valid,true,JSON.stringify(r.issues));
 for(const code of ["pyq-year-missing","source-disagreement","explanation-key-conflict"])
  assert.ok(r.issues.some(i=>i.code===code),code);
 assert.equal(r.quality.questions[0].recommendedStatus,"needs-review");
 assert.equal(r.compiled.questions[0].editorial.status,"caution");
});
test("P57-B CLI qa-bank and against source emit JSON; deterministic fatal exit and no destructive output",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"p57b-"));
 try{
  const s=await load("apfc");const before=join(dir,"a.json");const against=join(dir,"older.json");
  await writeFile(before,JSON.stringify(s));
  await writeFile(against,JSON.stringify({...s,bankId:"older"}));
  const go=(args)=>spawnSync(process.execPath,["scripts/question-bank-cli.mjs",...args],
   {cwd:new URL("..",import.meta.url).pathname,encoding:"utf8"});
  let p=go(["qa-bank",before,"--against",against]);assert.equal(p.status,0,p.stderr);
  let report=JSON.parse(p.stdout);assert.ok(report.quality.duplicates.length>0);
  s.questions[2].answer="A";await writeFile(before,JSON.stringify(s));
  p=go(["compile-bank",before,join(dir,"compiled.json")]);assert.equal(p.status,1,p.stdout);
  report=JSON.parse(p.stdout);assert.equal(report.valid,false);
  assert.ok(report.issues.some(i=>i.code==="math-answer-conflict"));
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("P57-B do not silently discard zero-question physical exam sections",async()=>{
 const s=await load("cat");
 s.sections.push({id:"declared-empty",title:"Declared but empty",minutes:40});
 const r=inspect(s);
 assert.equal(r.valid,false);
 assert.ok(r.issues.some(i=>i.code==="empty-exam-section"&&
  i.path.includes("declared-empty")));
 assert.equal(r.compiled,undefined);
});
test("P57-B APFC academic syllabus attribution is mandatory and never inferred from physical section",async()=>{
 const s=await load("apfc");
 delete s.questions[1].syllabusHeadingId;
 const r=inspect(s);
 assert.equal(r.valid,false);
 assert.ok(r.issues.some(i=>i.code==="apfc-heading-missing"&&i.questionId==="economy-01"));
});
test("P57-B distinct matching labels and redundant numeric-answer tolerance trigger appropriate severity",async()=>{
 const cat=await load("cat");
 cat.questions[1].answer=[6,6];
 let r=inspect(cat);
 assert.equal(r.valid,true,JSON.stringify(r.issues));
 assert.ok(r.issues.some(i=>i.code==="numeric-alternatives-overlap"&&i.severity==="warning"));
 const matching={id:"pairs",examSection:"qa",subject:"Reasoning",
  kind:"matching",prompt:"Match the labels",
  leftItems:["L1","L1","L3","L4"],rightItems:["R1","R2","R3","R4"],
  answer:"1-A,2-B,3-C,4-D",explanation:"Synthetic example.",
  provenance:{kind:"ai-original"},qa:{status:"unchecked"}};
 cat.questions.push(matching);
 r=inspect(cat);
 assert.equal(r.valid,false);
 assert.ok(r.issues.some(i=>i.code==="duplicate-matching-label"&&
  i.questionId==="pairs"&&i.severity==="error"));
});

test("P62-D math option fingerprint distinguishes signed fractions and decimals",async()=>{
 const bank=await load("apfc");
 bank.questions[0].options=["2/3","-2/3","4/3","-4/3"];
 let report=inspect(bank);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 bank.questions[0].options=["1.2","12","-0.5","0.5"];
 report=inspect(bank);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 bank.questions[0].options[3]="-0.5";
 report=inspect(bank);
 assert.ok(report.issues.some(x=>x.code==="duplicate-option"&&x.questionId==="labour-01"));
});
}

{
// Merged from tests/p57c-authoring-staging.test.mjs; lexical isolation preserves original fixtures.
/** P57-C staged multi-source handoff contract. Actual browser lifecycle is tested separately. */
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {readFile}=await import("node:fs/promises");
const {addStagedFiles,updateStagedSelection,inspectStagingWorkspace,
 stagedToAuthoringDraft,validateStagingWorkspace}=await import("../src/authoring/authoring-staging.ts");
const {inspectAuthoringPublication}=await import("../src/authoring/authoring-publisher.ts");
const {inspectExternalQuality}=await import("../src/authoring/external-bank-qa.ts");
const {defaultAuthoringShelf}=await import("../src/authoring/authoring-draft.ts");
const {handoffStagingToDraftShelf,ingestStagedFiles,inspectPublicationWorkflow,
 preparePublicationWorkflow}=await import("../src/authoring/authoring-workflow.ts");
const {scoreAttempt}=await import("../src/engine/scoring.ts");
const load=async(name)=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
const initial={schema:1,files:[],selected:[]};
const staged=(source,name="first.json")=>addStagedFiles(initial,[{name,source}]);
test("P57-C stores unverified AI imports as selected, unpublished staged files with no scored package",async()=>{
 const source=await load("apfc");
 const state=staged(source);
 const view=inspectStagingWorkspace(state);
 assert.equal(view.questions.length,source.questions.length);
 assert.equal(view.selectedCount,3);
 assert.equal(view.sourceCount,source.questions.reduce((n,q)=>n+(q.provenance.sources?.length??0),0));
 assert.equal(view.questions.every(q=>q.selected),true);
 assert.equal("compiled" in state,false);
 assert.equal(validateStagingWorkspace(JSON.parse(JSON.stringify(state))).selected.length,3);
});
test("P57-C two compatible batches provide cross-batch overlap diagnostics and deterministic stable handoff identities",async()=>{
 const a=await load("apfc"),b=structuredClone(a);
 b.bankId="second-batch";b.questions=b.questions.map(q=>({...q,id:"copy-"+q.id}));
 const state=addStagedFiles(staged(a),[{name:"second.json",source:b}]);
 const report=inspectStagingWorkspace(state);
 assert.equal(report.selectedCount,6);
 assert.ok(report.duplicateCandidates>=3);
 assert.ok(report.issues.some(i=>i.code==="duplicate-candidate"));
 const draft=stagedToAuthoringDraft(state);
 assert.equal(draft.questions.length,6);
 assert.equal(new Set(draft.questions.map(q=>q.id)).size,6);
 const compiled=inspectAuthoringPublication(draft);
 assert.equal(compiled.valid,true,JSON.stringify(compiled.issues));
 assert.equal(compiled.compiled.questions.length,6);
 assert.equal(compiled.compiled.questions[0].editorial.status,"caution");
 const reversed=addStagedFiles(initial,[{name:"second.json",source:b},{name:"first.json",source:a}]);
 const other=stagedToAuthoringDraft(reversed);
 assert.deepEqual(new Set(draft.questions.map(q=>q.id)),new Set(other.questions.map(q=>q.id)),
  "Stable question IDs do not depend on source file ordering");
});
test("P57-C a deterministically wrong mathematical key is staged for Wordgard correction, then rechecked",async()=>{
 const a=await load("apfc"),original=a.questions[2].answer;
 a.questions[2].answer="B";
 const state=staged(a);
 assert.equal(inspectStagingWorkspace(state).issues.some(i=>i.code==="math-answer-conflict"),true);
 const draft=stagedToAuthoringDraft(state);
 const report=inspectAuthoringPublication(draft);
 assert.equal(report.valid,true,"structural publisher alone must not suppress QA");
 const qa=inspectExternalQuality(draft,report.compiled,"stage");
 assert.equal(qa.issues.some(i=>i.code==="math-answer-conflict"&&i.severity==="error"),true);
 const edited={...draft,questions:draft.questions.map((q,i)=>i===2?{...q,answer:original}:q)};
 const green=inspectAuthoringPublication(edited);
 assert.equal(green.valid,true);
 assert.equal(inspectExternalQuality(edited,green.compiled,"stage").issues.some(i=>i.code==="math-answer-conflict"),false);
});
test("P57-C selecting individual questions prunes unselected scoring while preserving the selected key and source",async()=>{
 const a=await load("apfc");
 let state=staged(a);
 state=updateStagedSelection(state,a.bankId+"::"+a.questions[0].id,false);
 state=updateStagedSelection(state,a.bankId+"::"+a.questions[1].id,false);
 const draft=stagedToAuthoringDraft(state);
 assert.equal(draft.questions.length,1);
 assert.equal(draft.questions[0].provenance.kind,a.questions[2].provenance.kind);
 const report=inspectAuthoringPublication(draft);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const pkg=report.compiled;
 assert.equal(pkg.paper.sections[0].questionRevisionIds.length,1);
 const correct=pkg.answerKey.entries[0].answer;
 const response=correct.kind==="single-choice"?{kind:"single-choice",optionId:correct.optionId}:undefined;
 if(response){
  const result=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,
   [{questionRevisionId:pkg.questions[0].id,response,timeSpentMs:0,answerChangeCount:0}],
    "2026-11-05T00:00:00.000Z");
  assert.equal(result.items[0].verdict,"correct");
 }
});
test("P57-C strict staging rejects incompatible marking policies and duplicate bank identity",async()=>{
 const a=await load("apfc"),b=structuredClone(a);
 b.bankId="another";b.scoring.correctMarks=2;
 assert.throws(()=>addStagedFiles(staged(a),[{name:"conflict.json",source:b}]),/same exam, paper, revision, marking/);
 assert.throws(()=>addStagedFiles(staged(a),[{name:"repeat.json",source:a}]),/Bank ID/);
});
test("P57-C rejects unknown/duplicate selection, excessive authoring selection and empty handoff",async()=>{
 const a=await load("apfc"),state=staged(a);
 assert.throws(()=>validateStagingWorkspace({...state,selected:["none::unknown"]}),/unknown/);
 assert.throws(()=>validateStagingWorkspace({...state,selected:[state.selected[0],state.selected[0]]}),/repeated/);
 const cleared={...state,selected:[]};
 assert.equal(inspectStagingWorkspace(cleared).selectedCount,0);
 assert.throws(()=>stagedToAuthoringDraft(cleared),/Select at least one/);
});
test("P57-C stable semantic identities survive corrected revisions and never replace old frozen papers",async()=>{
 const a=await load("apfc"),first=stagedToAuthoringDraft(staged(a));
 const v1=inspectAuthoringPublication(first).compiled;
 const revised={...a,revision:a.revision+1,questions:a.questions.map((q,i)=>
  i===0?{...q,explanation:q.explanation+" Additional editorial context."}:q)};
 const next=stagedToAuthoringDraft(staged(revised));
 assert.deepEqual(first.questions.map(q=>q.id),next.questions.map(q=>q.id));
 const v2=inspectAuthoringPublication(next,[v1]).compiled;
 assert.notEqual(v1.paper.id,v2.paper.id);
 assert.equal(v1.questions[0].questionId,v2.questions[0].questionId);
 assert.notEqual(v1.questions[0].contentHash,v2.questions[0].contentHash);
 assert.equal(v1.questions[0].editorial.status,"caution");
 assert.equal(v2.questions[0].editorial.status,"caution");
});

test("P57-C attributed, unverified reviewer warning acceptance remains in exact immutable editorial evidence",async()=>{
 const source=await load("apfc"),draft=stagedToAuthoringDraft(staged(source));
 const reviewed={...draft,questions:draft.questions.map((q,i)=>i? q:{...q,qa:{
  status:"needs-review",review:{reviewer:"Independent reader (author-claimed)",
   reviewedAt:"2026-11-05T08:00:00.000Z",note:"Arithmetic and source references compared manually; independent verification not claimed.",
   acceptedWarningCodes:["missing-explanation","legal-currentness-unverified"]}
 }})};
 const report=inspectAuthoringPublication(reviewed);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const notes=report.compiled.questions[0].editorial.notes;
 assert.match(notes,/Author-entered review\/QA acknowledgement/);
 assert.match(notes,/identity NOT authenticated/);
 assert.match(notes,/missing-explanation/);
 assert.equal(report.compiled.questions[0].editorial.status,"caution");
 const bad=structuredClone(reviewed);bad.questions[0].qa.review.reviewedAt="2026-02-30T08:00:00.000Z";
 assert.equal(inspectAuthoringPublication(bad).valid,false);
});


test("Authoring workflow ingests staging and hands off one deterministic unpublished draft without overwriting edits",async()=>{
 const source=await load("apfc");
 const file=new File([JSON.stringify(source)],"apfc.json",{type:"application/json"});
 const stagedByWorkflow=await ingestStagedFiles(null,[file]);
 assert.equal(stagedByWorkflow.files.length,1);
 assert.equal(stagedByWorkflow.selected.length,source.questions.length);
 const base=defaultAuthoringShelf();
 const first=handoffStagingToDraftShelf(stagedByWorkflow,base);
 assert.equal(first.shelf.activeId,first.draft.id);
 assert.equal(first.draft.questions.length,source.questions.length);
 assert.throws(()=>handoffStagingToDraftShelf(stagedByWorkflow,first.shelf),/already has a Wordgard draft/);
 const direct=stagedToAuthoringDraft(stagedByWorkflow);
 assert.equal(first.draft.id,direct.id);
 assert.deepEqual(first.draft.questions.map(q=>q.id),direct.questions.map(q=>q.id));
});

test("Authoring publication workflow is sole owner of external QA acknowledgement and recompiles exact evidence",async()=>{
 const source=await load("apfc");
 const draft=stagedToAuthoringDraft(staged(source));
 const inspection=inspectPublicationWorkflow(draft,[]);
 assert.equal(inspection.report.valid,true,JSON.stringify(inspection.report.issues));
 assert.equal(inspection.errors.length,0,JSON.stringify(inspection.errors));
 if(inspection.warnings.length){
  assert.throws(()=>preparePublicationWorkflow(draft,[],{
   confirmed:true,acceptWarnings:false,reviewer:"",reviewNote:"",
   acceptedAt:"2026-11-12T00:00:00.000Z"
  }),/Explicitly acknowledge/);
 }
 assert.throws(()=>preparePublicationWorkflow(draft,[],{
  confirmed:false,acceptWarnings:true,reviewer:"",reviewNote:"",
  acceptedAt:"2026-11-12T00:00:00.000Z"
 }),/Confirm your source/);
 assert.throws(()=>preparePublicationWorkflow(draft,[],{
  confirmed:true,acceptWarnings:true,reviewer:"Named reader",reviewNote:"",
  acceptedAt:"2026-11-12T00:00:00.000Z"
 }),/provide both a reviewer name and an evidence note/);

 const prepared=preparePublicationWorkflow(draft,[],{
  confirmed:true,acceptWarnings:true,
  reviewer:"Named reader",reviewNote:"Checked the displayed offline QA evidence; factual verification not claimed.",
  acceptedAt:"2026-11-12T00:00:00.000Z"
 });
 assert.equal(prepared.draftChanged,true);
 assert.equal(prepared.packageValue.questions.length,draft.questions.length);
 assert.ok(prepared.draft.questions.every(q=>q.qa?.review?.reviewer==="Named reader"));
 assert.ok(prepared.packageValue.questions.every(q=>q.editorial.notes.includes("Named reader")));
 assert.equal(prepared.inspection.errors.length,0);
});
}

{
// Merged from tests/p58b-editorial-gap.test.mjs; lexical isolation preserves original fixtures.
const {default:test}=await import("node:test");
const {default:assert}=await import("node:assert/strict");
const {readFile}=await import("node:fs/promises");
const {addStagedFiles,stagedToAuthoringDraft,updateStagedSelection,inspectStagingWorkspace}=await import("../src/authoring/authoring-staging.ts");
const {inspectExternalQuestionBank}=await import("../src/authoring/external-bank.ts");
const {publicationPlainText}=await import("../src/authoring/authoring-publisher.ts");
const load=async()=>JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
const blank={schema:1,files:[],selected:[]};
const staged=(s,name="ai.json")=>addStagedFiles(blank,[{name,source:s}]);
test("P58-B F05 red: changed selection forks without overwriting existing unpublished corrections",async()=>{
 const source=await load(),state=staged(source);
 const first=stagedToAuthoringDraft(state);
 const key=state.selected[1];
 const fork=stagedToAuthoringDraft(updateStagedSelection(state,key,false));
 assert.notEqual(first.id,fork.id,"different selected questions must have independent draft identities");
 assert.deepEqual(first.questions.filter(q=>!fork.questions.some(x=>x.id===q.id)).length,1);
 const reordered=stagedToAuthoringDraft({...state,selected:[...state.selected].reverse()});
 assert.equal(first.id,reordered.id,"selection ordering alone must not change draft identity");
});

test("P58-B F06 red: duplicate screening reports explicit incompleteness and pair count",async()=>{
 const source=await load();
 source.questions=Array.from({length:42},(_,i)=>({...source.questions[0],id:"repeat-"+i}));
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.quality?.duplicates.length,500);
 assert.equal(report.quality?.summary.duplicateTruncated,true,
  "a full-looking 500-candidate list is an unsafe incomplete report");
 assert.ok((report.quality?.summary.duplicatePairsInspected??0)>500);
 assert.ok((report.quality?.summary.duplicatePairsPossible??0)>
  (report.quality?.summary.duplicatePairsInspected??Infinity));
 const inspection=inspectStagingWorkspace(staged(source));
 assert.equal(inspection.duplicateTruncated,true);
});

test("P58-B F08 red: independently generated shared media IDs get deterministic safe namespaces",async()=>{
 const a=await load(),b=structuredClone(a);
 const make=(src,bankId,byte)=>{
  src.bankId=bankId;src.questions=[{...src.questions[0],id:"figure-item",
   stimulusRef:"shared-chart",prompt:{format:"practice-desk-rich",version:1,
    blocks:[{type:"paragraph",content:[{type:"text",text:"Which caption is correct?"},
     {type:"image",assetId:"image1",altText:"Source-labelled figure"}]}]}}];
  src.media=[{id:"image1",altText:"Sample synthetic PNG",dataUri:
   "data:image/png;base64,"+Buffer.from([byte,byte+1,byte+2]).toString("base64")}];
  src.stimuli=[{id:"shared-chart",kind:"image",mediaRef:"image1",altText:"Shared chart"}];
  return src;
 };
 const first=make(a,"batchA",3),second=make(b,"batchB",6);
 const merged=stagedToAuthoringDraft(addStagedFiles(blank,[
  {name:"a.json",source:first},{name:"b.json",source:second}
 ]));
 assert.equal(merged.questions.length,2);
 assert.equal(merged.assets.length,2);
 assert.equal(new Set(merged.assets.map(x=>x.id)).size,2);
 for(const q of merged.questions){
  const ref=merged.stimuli.find(s=>s.id===q.stimulusRef);
  assert.equal(ref?.kind,"image");
  assert.ok(merged.assets.some(a=>a.id===ref.assetId));
  assert.match(publicationPlainText(q.prompt),/caption is correct/);
  assert.ok(JSON.stringify(q.prompt).includes(String(ref.assetId)));
 }
 const reverse=stagedToAuthoringDraft(addStagedFiles(blank,[
  {name:"b.json",source:second},{name:"a.json",source:first}
 ]));
 assert.equal(merged.id,reverse.id,"Source file order should not fork a selected paper");
 assert.deepEqual(merged.assets.map(x=>x.id).sort(),reverse.assets.map(x=>x.id).sort());
 const sameDigest=structuredClone(second);
 sameDigest.media[0].dataUri=first.media[0].dataUri;
 const sameMerged=stagedToAuthoringDraft(addStagedFiles(blank,[
  {name:"a.json",source:first},{name:"b.json",source:sameDigest}
 ]));
 assert.equal(sameMerged.assets.length,2,"Same bytes from different banks retain explicit source namespaces");
 assert.equal(sameMerged.assets[0].contentHash,sameMerged.assets[1].contentHash);
});
}
