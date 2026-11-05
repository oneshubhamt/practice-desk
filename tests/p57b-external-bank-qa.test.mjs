/** P57-B independent adversarial deterministic QA tests; no network requests. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {inspectExternalQuestionBank,compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
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
