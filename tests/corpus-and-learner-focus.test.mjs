import test from "node:test";
import assert from "node:assert/strict";
import {cp,mkdir,mkdtemp,readFile,rm,stat,writeFile} from "node:fs/promises";
import {execFileSync,spawnSync} from "node:child_process";
import {tmpdir} from "node:os";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {addPaper,appendRevision} from "../scripts/question-bank-corpus.mjs";
import {loadQuestionBankCatalog} from "../scripts/question-bank-catalog.mjs";
import {SEMANTIC_CHECKLIST,BANK_CHECKLIST} from "../scripts/question-quality.mjs";
import {buildLearnerFocusPacket,validateLearnerFocusPacket} from "../src/learning/learner-focus.ts";
import {composePracticeSet} from "../src/app/practice-compose.ts";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {addLearningCard,validateLearningCard} from "../src/learning/learning.ts";

const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const exists=async path=>(await stat(path).catch(()=>null))!==null;
const writeJson=async(path,value)=>{await mkdir(dirname(path),{recursive:true});await writeFile(path,JSON.stringify(value,null,2)+"\n");return path;};

async function publicationEvidence(sourcePath,dir,label){
 const reviewDir=join(dir,"review-work");
 execFileSync(process.execPath,[join(root,"scripts","question-quality.mjs"),"prepare",sourcePath,reviewDir],{cwd:root});
 const source=JSON.parse(await readFile(sourcePath,"utf8"));
 const review=JSON.parse(await readFile(join(reviewDir,"review.json"),"utf8"));
 review.reviewMode="clean-context";review.candidateOnlyContextClaim=true;
 review.reviewer={id:label,kind:"ai"};
 for(const record of review.records){
  const question=source.questions.find(q=>q.id===record.questionId);
  record.applicability={mathematical:"yes",legal:"yes",timeSensitive:"yes",visual:"no",asOfDate:"2026-11-17"};
  record.solution={status:"completed",answer:String(question?.answer??""),
   reasoning:"Synthetic corpus-operation regression review."};
  record.semanticChecks=SEMANTIC_CHECKLIST.map(check=>({id:check.id,status:"pass",
   basis:check.id==="mathematical-correctness"?"mathematical-proof":
    ["factual-correctness","temporal-correctness","pyq-fidelity"].includes(check.id)?"source-consulted":
    check.id==="visual-integrity"?"rendered-claim":"semantic-editorial",
   rationale:"Synthetic regression evidence for transactional corpus tests."}));
  record.evidence=[{publisher:"Fixture",title:"Corpus transaction regression evidence",
   locator:"question:"+record.questionId,retrievedAt:"2026-11-17",asOfDate:"2026-11-17",
   excerpt:"Synthetic evidence exercises transaction gates only; it is not factual certification."}];
 }
 review.bankReview={checks:BANK_CHECKLIST.map(check=>({id:check.id,status:"pass",
  basis:"bank-editorial",rationale:"Synthetic bank-level transaction regression witness."}))};
 const reviewPath=await writeJson(join(dir,"quality-review.json"),review);
 const blueprint={format:"practice-desk-content-blueprint",version:1,id:label+"-blueprint",
  examId:source.examId,paperId:source.paperId,revision:source.revision,targetCount:source.questions.length,
  allowPartial:false,taxonomyId:"pfrda-grade-a-2026-general",
  syllabus:{basis:"official-source-attributed",asOfDate:"2026-09-03",
   reference:"PFRDA Grade A 2026 syllabus regression fixture"},
  requirements:{requireTaxonomy:true,requireExplanation:true},quotas:{}};
 const blueprintPath=await writeJson(join(dir,"blueprint.json"),blueprint);
 await rm(reviewDir,{recursive:true,force:true});
 return {reviewPath,blueprintPath};
}
async function corpusSource(dir,revision,paperId="pfrda-grade-a-2026-transaction-test"){
 const base=JSON.parse(await readFile(join(root,"question-banks","pfrda","2026","mocks","day-02","original","bank.authoring.json"),"utf8"));
 const source={...base,bankId:"transaction-test-r"+revision,paperId,
  title:"PFRDA Grade A 2026 — Transaction Test",revision};
 const path=await writeJson(join(dir,"bank-r"+revision+".authoring.json"),source);
 const evidence=await publicationEvidence(path,join(dir,"evidence-r"+revision),"transaction-r"+revision);
 return {path,...evidence,source};
}

test("Pass 5 corpus add-paper is dry-runnable, strict and commits a validated self-contained paper",async()=>{
 const work=await mkdtemp(join(tmpdir(),"pd-corpus-add-")),repo=join(work,"repo");
 try{
  await cp(join(root,"question-banks"),join(repo,"question-banks"),{recursive:true});
  const authored=await corpusSource(work,1);
  const args={root:repo,familyId:"pfrda-grade-a-2026-phase-ii",year:2026,paperId:"transaction-test",
   sourcePath:authored.path,qualityReviewPath:authored.reviewPath,blueprintPath:authored.blueprintPath};
  const dry=await addPaper({...args,dryRun:true});
  assert.equal(dry.dryRun,true);
  const paperDir=join(repo,"question-banks","pfrda","2026","mocks","transaction-test");
  assert.equal(await exists(paperDir),false,"dry-run must not mutate corpus");
  const added=await addPaper(args);
  assert.equal(added.dryRun,false);assert.equal(added.edition,"r1");
  assert.equal(await exists(join(paperDir,"r1","bank.authoring.json")),true);
  const manifest=JSON.parse(await readFile(join(paperDir,"manifest.json"),"utf8"));
  assert.equal(manifest.canonicalEdition,"r1");
  assert.deepEqual(Object.keys(manifest.editions),["r1"]);
  const year=JSON.parse(await readFile(join(repo,"question-banks","pfrda","2026","manifest.json"),"utf8"));
  assert.ok(year.mocks.some(x=>x.id==="pfrda-grade-a-2026-transaction-test"&&
    x.path==="mocks/transaction-test/manifest.json"));
  await loadQuestionBankCatalog(repo);
  await assert.rejects(()=>addPaper(args),/already exists|Logical paperId/);
 }finally{await rm(work,{recursive:true,force:true});}
});

test("Pass 5 append-revision advances canonical custom revision transactionally and refuses rollback",async()=>{
 const work=await mkdtemp(join(tmpdir(),"pd-corpus-revision-")),repo=join(work,"repo");
 try{
  await cp(join(root,"question-banks"),join(repo,"question-banks"),{recursive:true});
  const first=await corpusSource(work,1);
  const common={root:repo,familyId:"pfrda-grade-a-2026-phase-ii",year:2026,paperId:"transaction-test"};
  await addPaper({...common,sourcePath:first.path,qualityReviewPath:first.reviewPath,blueprintPath:first.blueprintPath});
  const second=await corpusSource(work,2);
  const dry=await appendRevision({...common,sourcePath:second.path,qualityReviewPath:second.reviewPath,
   blueprintPath:second.blueprintPath,dryRun:true});
  assert.equal(dry.revision,2);assert.equal(dry.previousHighestRevision,1);
  const paperDir=join(repo,"question-banks","pfrda","2026","mocks","transaction-test");
  assert.equal(await exists(join(paperDir,"r2")),false);
  const appended=await appendRevision({...common,sourcePath:second.path,qualityReviewPath:second.reviewPath,
   blueprintPath:second.blueprintPath});
  assert.equal(appended.edition,"r2");
  const manifest=JSON.parse(await readFile(join(paperDir,"manifest.json"),"utf8"));
  assert.equal(manifest.canonicalEdition,"r2");
  assert.deepEqual(Object.keys(manifest.editions).sort(),["r1","r2"]);
  await loadQuestionBankCatalog(repo);
  await assert.rejects(()=>appendRevision({...common,sourcePath:first.path,qualityReviewPath:first.reviewPath,
    blueprintPath:first.blueprintPath}),/greater than current highest revision/);
  assert.equal((await jsonSafe(join(paperDir,"manifest.json"))).canonicalEdition,"r2");
 }finally{await rm(work,{recursive:true,force:true});}
});
const jsonSafe=async path=>JSON.parse(await readFile(path,"utf8"));

function wrongSingleChoice(bundle){
 const q=bundle.questions[0],entry=bundle.answerKey.entries.find(x=>x.questionRevisionId===q.id);
 assert.equal(q.content.kind,"single-choice");assert.equal(entry.answer.kind,"single-choice");
 const option=q.content.options.find(x=>x.id!==entry.answer.optionId);
 assert.ok(option);return {kind:"single-choice",optionId:option.id};
}
function finishedAttempt(bundle,id,start){
 let a=startGenericAttempt(bundle,id,start,"custom-practice");
 const byId=new Map(bundle.questions.map(q=>[q.id,q]));
 a=transitionGenericAttempt(a,{type:"ANSWER",nowMs:start+1000,response:wrongSingleChoice(bundle)},byId);
 a=transitionGenericAttempt(a,{type:"FLAG",nowMs:start+1100,flagged:true},byId);
 a=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:start+1200},byId);
 assert.ok(a.result&&a.finishedAt!==null);return a;
}

test("Pass 5 learner focus is exam-scoped, opt-in, evidence-only and detailed mode is explicitly richer",async()=>{
 const loaded=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=loaded.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const source=loaded.packages.find(x=>x.paper.id===family.currentPaperRevisionId);
 const topicId="taxonomy:"+source.taxonomy.id+":pfrda-act";
 const bundle=composePracticeSet(source,{count:1,seed:"learner-focus",filters:{topicId}}).bundle;
 const a1=finishedAttempt(bundle,"focus-a1",Date.parse("2026-11-10T10:00:00Z"));
 const a2=finishedAttempt(bundle,"focus-a2",Date.parse("2026-11-12T10:00:00Z"));
 const q=bundle.questions[0];
 let card=addLearningCard(a2,q.id,"2026-11-12T10:01:00.000Z");
 card=validateLearningCard({...card,bookmarked:true,errorLabel:"knowledge-gap",
  updatedAt:"2026-11-12T10:02:00.000Z"});
 const due=new Set([card.id]),asOf="2026-11-17T09:00:00.000Z";
 assert.equal(buildLearnerFocusPacket([a1,a2],[card],due,{
  examId:source.examId,mode:"off",intent:"targeted-practice",asOf}),null);

 const focused=buildLearnerFocusPacket([a1,a2],[card],due,{
  examId:source.examId,mode:"focused",intent:"targeted-practice",asOf});
 const checked=validateLearnerFocusPacket(focused);
 assert.equal(checked.mode,"focused");assert.equal(checked.compositionPolicy,"focus-first-with-blueprint-guardrails");
 const obs=checked.observations.find(x=>x.nodeId==="pfrda-act");
 assert.ok(obs);assert.equal(obs.attempts,2);assert.equal(obs.incorrect,2);
 assert.equal(obs.repeatedMisses,1);assert.equal(obs.bookmarkedQuestions,1);assert.equal(obs.dueQuestions,1);
 assert.ok(obs.signals.includes("repeated-misses"));assert.ok(obs.signals.includes("fsrs-due"));
 const focusedText=JSON.stringify(checked);
 assert.equal(focusedText.includes(q.content.prompt),false,"Focused mode must not expose prior question bodies");
 assert.equal(focusedText.includes("selectedResponse"),false);
 assert.equal(focusedText.includes("knowledge-gap"),false);
 assert.equal(focusedText.includes("name"),false);

 const detailed=validateLearnerFocusPacket(buildLearnerFocusPacket([a1,a2],[card],due,{
  examId:source.examId,mode:"detailed",intent:"exam-simulation",asOf}));
 assert.equal(detailed.compositionPolicy,"blueprint-first");
 assert.equal(detailed.questionEvidence.length,1);
 assert.equal(detailed.questionEvidence[0].prompt,q.content.prompt);
 assert.equal(detailed.questionEvidence[0].wrongAttempts,2);
 assert.equal(detailed.questionEvidence[0].selfReportedErrorLabel,"knowledge-gap");
 assert.ok(detailed.questionEvidence[0].selectedResponse);
 assert.equal(JSON.stringify(detailed).includes("answerKey"),false,
  "Detailed learner evidence may share the response/explanation but not a hidden answer-key object");
});

test("Pass 5 authoring brief inserts validated learner focus and rejects cross-exam focus",async()=>{
 const loaded=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=loaded.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const source=loaded.packages.find(x=>x.paper.id===family.currentPaperRevisionId);
 const topicId="taxonomy:"+source.taxonomy.id+":pfrda-act";
 const bundle=composePracticeSet(source,{count:1,seed:"brief-focus",filters:{topicId}}).bundle;
 const attempt=finishedAttempt(bundle,"focus-brief",Date.parse("2026-11-12T12:00:00Z"));
 const focus=buildLearnerFocusPacket([attempt],[],new Set(),{
  examId:source.examId,mode:"focused",intent:"targeted-practice",asOf:"2026-11-17T09:00:00.000Z"});
 const dir=await mkdtemp(join(tmpdir(),"pd-focus-brief-"));
 try{
  const focusPath=await writeJson(join(dir,"focus.json"),focus);
  const script=join(root,"scripts","content-blueprint.mjs");
  const blueprint=join(root,"question-banks","pfrda","2026","mocks","day-01","revised","blueprint.json");
  const bank=join(root,"question-banks","pfrda","2026","mocks","day-01","revised","bank.authoring.json");
  const taxonomy=join(root,"question-banks","pfrda","2026","taxonomy.json");
  const args=["brief",blueprint,bank,"--taxonomy",taxonomy,"--learner-focus",focusPath,
   "--bank-id","focus-next","--title","Focus next","--batch-size","2"];
  const run=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:30000,maxBuffer:2_000_000});
  assert.equal(run.status,0,run.stderr);const brief=JSON.parse(run.stdout);
  assert.equal(brief.learnerFocusIncluded,true);assert.equal(brief.learnerFocus.mode,"focused");
  assert.equal(brief.personalisationIntent.intent,"targeted-practice");
  const standard=spawnSync(process.execPath,[script,"brief",blueprint,bank,"--taxonomy",taxonomy,
   "--bank-id","plain-next","--title","Plain next"],{encoding:"utf8",timeout:30000,maxBuffer:2_000_000});
  assert.equal(standard.status,0,standard.stderr);const plain=JSON.parse(standard.stdout);
  assert.equal(plain.learnerFocusIncluded,false);assert.equal(plain.learnerFocus,undefined);

  const mismatch={...focus,examId:"different-exam"};
  const mismatchPath=await writeJson(join(dir,"mismatch.json"),mismatch);
  const bad=spawnSync(process.execPath,[script,...args.map(x=>x===focusPath?mismatchPath:x)],{
   encoding:"utf8",timeout:30000,maxBuffer:2_000_000});
  assert.notEqual(bad.status,0);assert.match(bad.stderr,/examId does not match blueprint/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
