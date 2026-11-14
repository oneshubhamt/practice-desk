/** Canonical product-domain suite. */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,writeFile,mkdtemp,access,readdir,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {createSourceKeyReference,validateSourceKeyReference,sourceKeyScore} from "../src/engine/source-comparison.ts";
import {questionRevisionHash,paperRevisionHash} from "../src/domain/integrity.ts";
import {hashJson} from "../src/domain/hash.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {compileExternalQuestionBank,inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {createSourceReviewReference} from "../src/engine/review-source.ts";
import {familyIdFor,pairedEdition,examFamilyCatalog} from "../src/app/exam-families.ts";
import {auditPdfIntake,buildPdfIntakeTemplate} from "../scripts/pdf-ingest.mjs";

/** Editorial Lineage — canonical domain contracts. */
async function registerEditorialLineageTests(){
/** P60-D RED: general original/reviewed editorial lineage for external AI banks.
 * A stamped, unverified author explanation never upgrades facts to official truth.
 */
const tool=fileURLToPath(new URL("../scripts/editorial-editions.mjs",import.meta.url));
const qualityTool=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const fixture=fileURLToPath(new URL("../examples/ai-first-apfc.json",import.meta.url));
const sha=s=>createHash("sha256").update(s).digest("hex");
const temp=async fn=>{const dir=await mkdtemp(join(tmpdir(),"pd-p60d-"));
 try{return await fn(dir);}finally{await rm(dir,{force:true,recursive:true});}};
const file=async(dir,name,raw)=>{const path=join(dir,name);await writeFile(path,typeof raw==="string"?raw:JSON.stringify(raw));return path;};
const run=(script,...args)=>{
 const x=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:30000,maxBuffer:1200000});
 assert.equal(x.error,undefined,String(x.error));
 let data;try{data=JSON.parse(x.stdout||x.stderr)}catch{assert.fail("Expected machine JSON:\n"+x.stdout+"\n"+x.stderr)}
 return {...x,data};
};
const asSource=candidate=>{
 const paperBase={...candidate.paper,edition:"source"};
 return validateExamPackage({...candidate,
  paper:{...paperBase,contentHash:paperRevisionHash(paperBase)}});
};
const bindReviewed=(source,candidate)=>{
 const paperBase={...candidate.paper,edition:"reviewed",
  sourcePaperRevisionId:source.paper.id,sourceAnswerKeyRevisionId:source.answerKey.id};
 return validateExamPackage({...candidate,
  paper:{...paperBase,contentHash:paperRevisionHash(paperBase)}});
};
const pairs=async dir=>{
 const original=JSON.parse(await readFile(fixture,"utf8"));
 const reviewed=structuredClone(original);
 reviewed.questions[0].answer="A"; // deliberately synthetic disagreement, not a factual endorsement
 reviewed.questions[0].explanation="Synthetic proposed key change for regression only.";
 const originalPath=await file(dir,"original.json",original);
 const reviewedPath=await file(dir,"reviewed.json",reviewed);
 return {original,reviewed,originalPath,reviewedPath};
};
const fillDecisions=(template)=>{
 const result=structuredClone(template);
 for(const item of result.entries){
  item.disposition="corrected";
  item.reason="Synthetic deliberately disputed source key; reviewed key was independently analysed for the regression fixture.";
  item.evidence=[{publisher:"Fixture",title:"Synthetic key discrepancy",locator:"question "+item.questionId,
   sourceNote:"Test-only editorial assertion; NOT external factual verification"}];
 }
 delete result.templateIncomplete;
 return result;
};
const reviewFor=(source,candidates)=>{
 const c=run(qualityTool,"checklist");assert.equal(c.status,0);
 return {format:"practice-desk-quality-review",version:2,bankId:source.bankId,
  sourceSha256:candidates.sourceSha256,
  records:candidates.items.map((entry,index)=>{
   const q=source.questions.find(x=>x.id===entry.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:entry.candidateSha256,
    applicability:{mathematical:q.id==="account-01"?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},
    reviewer:{id:"fictional-test-operator",kind:"ai"},
    independentSolution:{blindClaim:true,answer:q.answer,
     reasoning:"Test-only assertion of independent solution, no external source was checked."},
    checks:c.data.checklist.map((check,i)=>({id:check.id,status:"pass",
     basis:i===9?"mathematical-proof":[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
     rationale:"Synthetic QA record, not authenticated independent reasoning."})),
    evidence:[{publisher:"Fixture",title:"Synthetic QA record",locator:"test:"+q.id,
      retrievedAt:"2026-11-06",excerpt:"This is only a software regression fixture, not evidence of factual truth."}]
   };
  })
 };
};
test("P60-D RED: machine-readable template derives exact changed fields without exposing either keyed answer",()=>temp(async dir=>{
 const {originalPath,reviewedPath}=await pairs(dir);
 const r=run(tool,"template",originalPath,reviewedPath);
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-editorial-decisions");
 assert.equal(r.data.version,1);
 assert.equal(r.data.entries.length,1);
 assert.equal(r.data.entries[0].questionId,"labour-01");
 assert.deepEqual(r.data.entries[0].changedFields,["answer","explanation"]);
 assert.equal("templateIncomplete" in r.data,false,"Fillable editorial template must be exact v1 schema");
 assert.match(r.data.originalSha256,/^[a-f0-9]{64}$/);
 assert.match(r.data.reviewedSha256,/^[a-f0-9]{64}$/);
 assert.ok(!r.stdout.includes("B is second."));
 assert.ok(!r.stdout.includes("Synthetic proposed key change"));
}));
test("P60-D RED: source-preserving paired publication uses existing scorer/reviewer contracts and exact original bytes",()=>temp(async dir=>{
 const {original,reviewed,originalPath,reviewedPath}=await pairs(dir);
 const t=run(tool,"template",originalPath,reviewedPath);
 const decisionsPath=await file(dir,"decisions.json",fillDecisions(t.data));
 const packets=run(qualityTool,"candidate",reviewedPath,"--limit","10");
 const reviewPath=await file(dir,"review.json",reviewFor(reviewed,packets.data));
 const preview=run(tool,"audit",originalPath,reviewedPath,decisionsPath,"--quality-review",reviewPath);
 assert.equal(preview.status,0,JSON.stringify(preview.data));
 assert.equal(preview.data.readyForPublication,true);
 assert.equal(preview.data.sourceKeyComparison.comparable,3);
 assert.equal(preview.data.sourceKeyComparison.total,3);
 assert.equal(preview.data.factualVerification,"not-performed");
 assert.equal(preview.data.reviewAssurance,"recorded-self-attestation-not-authenticated");
 assert.equal(preview.data.changes.total,1);
 const out=join(dir,"published-pair");
 const result=run(tool,"compile",originalPath,reviewedPath,decisionsPath,out,"--quality-review",reviewPath);
 assert.equal(result.status,0,result.stderr);
 assert.equal(result.data.compiled,true);
 assert.deepEqual((await readdir(out)).sort(),["editorial-lineage.json","original-source.json","reviewed-source.json","reviewed.exam.json","source.exam.json"]);
 assert.equal(await readFile(join(out,"original-source.json"),"utf8"),await readFile(originalPath,"utf8"));
 assert.equal(await readFile(join(out,"reviewed-source.json"),"utf8"),await readFile(reviewedPath,"utf8"));
 const source=validateExamPackage(JSON.parse(await readFile(join(out,"source.exam.json"),"utf8")));
 const target=validateExamPackage(JSON.parse(await readFile(join(out,"reviewed.exam.json"),"utf8")));
 assert.equal(source.paper.edition,"source");
 assert.equal(target.paper.edition,"reviewed");
 assert.equal(source.paper.paperId,target.paper.paperId);
 assert.notEqual(source.paper.id,target.paper.id);
 assert.equal(source.answerKey.entries[0].answer.optionId,"B");
 assert.equal(target.answerKey.entries[0].answer.optionId,"A");
 assert.equal(target.questions[0].editorial.status,"corrected","Correction disposition must remain distinct");
 assert.match(target.questions[0].editorial.notes,/not authenticated/,
  "Status corrected is descriptive and never an assertion of official authentication");
 assert.ok(target.questions[0].editorial.changes.includes("answer-key"));
 assert.ok(target.questions[0].editorial.notes.includes("Synthetic deliberately disputed"));
 const lineage=JSON.parse(await readFile(join(out,"editorial-lineage.json"),"utf8"));
 assert.equal(lineage.format,"practice-desk-editorial-lineage");
 assert.equal(lineage.factualVerification,"not-performed");
 assert.equal(lineage.originalSha256,sha(await readFile(originalPath,"utf8")));
 assert.equal(lineage.reviewedSha256,sha(await readFile(reviewedPath,"utf8")));
 assert.equal(lineage.entries.length,1);
 assert.equal(target.paper.sourcePaperRevisionId,lineage.sourcePaperRevisionId);
 assert.equal(target.paper.sourceAnswerKeyRevisionId,lineage.sourceAnswerKeyRevisionId);
 assert.equal(target.paper.sourcePaperRevisionId,source.paper.id);
 assert.equal(target.paper.sourceAnswerKeyRevisionId,source.answerKey.id);
 assert.ok(lineage.entries[0].changedFields.includes("answer"));
 assert.equal(lineage.entries[0].originalQuestionSha256,sha(JSON.stringify(original.questions[0])));
 assert.equal(lineage.entries[0].reviewedQuestionSha256,sha(JSON.stringify(reviewed.questions[0])));
 const ref=createSourceKeyReference(target,source);
 assert.equal(ref.schema,3);
 assert.equal(ref.entries.filter(x=>x.comparable).length,3);
 const frozen=startGenericAttempt(target,"id",100000);
 assert.ok(createSourceReviewReference(target,source));
 const families=examFamilyCatalog([source,target],new Set());
 const paired=pairedEdition(families[0],target,"source");
 assert.equal(paired?.paper.id,source.paper.id);
 assert.equal(familyIdFor(target,new Set()),familyIdFor(source,new Set()));
 assert.equal(frozen.frozen.questions[0].questionId,target.questions[0].questionId);
 assert.equal(sourceKeyScore(frozen),null,"Unfinished attempt never produces hypothetical score");
}));
test("P60-D RED: changed stem/options/shared table makes source-key comparison unavailable for that item",()=>temp(async dir=>{
 const {originalPath,reviewedPath,reviewed}=await pairs(dir);
 reviewed.questions[0].prompt="Which letter occurs first in the alphabet?";
 await writeFile(reviewedPath,JSON.stringify(reviewed));
 const t=run(tool,"template",originalPath,reviewedPath);
 assert.equal(t.status,0);
 assert.ok(t.data.entries[0].changedFields.includes("prompt"));
 const decisions=await file(dir,"decisions.json",fillDecisions(t.data));
 const result=run(tool,"audit",originalPath,reviewedPath,decisions);
 assert.equal(result.status,1,"Missing independent review must block final publication");
 assert.equal(result.data.sourceKeyComparison.comparable,2);
 assert.equal(result.data.sourceKeyComparison.unavailable,1);
 assert.equal(result.data.sourceKeyComparison.total,3);
}));
test("P60-D RED: missing or stale decisions, undeclared corrections and invented official authenticity fail closed",()=>temp(async dir=>{
 const {originalPath,reviewedPath,reviewed}=await pairs(dir);
 const t=run(tool,"template",originalPath,reviewedPath);
 const missing=run(tool,"audit",originalPath,reviewedPath,await file(dir,"empty.json",{
  format:"practice-desk-editorial-decisions",version:1,
  originalSha256:t.data.originalSha256,reviewedSha256:t.data.reviewedSha256,entries:[]}));
 assert.equal(missing.status,1);
 assert.ok(missing.data.issues.items.some(x=>x.code==="missing-change-decision"));
 const stale=fillDecisions(t.data);stale.originalSha256="0".repeat(64);
 const bad=run(tool,"audit",originalPath,reviewedPath,await file(dir,"stale.json",stale));
 assert.equal(bad.status,1);
 assert.ok(bad.data.issues?.items?.some(x=>x.code==="stale-decisions"),JSON.stringify(bad.data));
 const official=structuredClone(reviewed);
 official.questions[0].provenance.kind="official-pyq";
 const officiallyAlteredPath=await file(dir,"official.json",official);
 const t2=run(tool,"template",originalPath,officiallyAlteredPath);
 const decision=fillDecisions(t2.data);
 decision.entries[0].evidence=[];
 const suspicious=run(tool,"audit",originalPath,officiallyAlteredPath,await file(dir,"no-evidence.json",decision));
 assert.equal(suspicious.status,1);
 assert.ok(suspicious.data.issues.items.some(x=>x.code==="change-evidence-required"));
}));
test("P60-D RED: mismatched paper policy, attempted question deletion or answer in source stem cannot silently publish",()=>temp(async dir=>{
 const {originalPath,reviewedPath,reviewed,original}=await pairs(dir);
 const invalid=structuredClone(reviewed);invalid.scoring.correctMarks=5;
 const alt=await file(dir,"policy.json",invalid);
 const policy=run(tool,"template",originalPath,alt);
 assert.notEqual(policy.status,0);
 const dropped=structuredClone(reviewed);dropped.questions.pop();
 assert.notEqual(run(tool,"template",originalPath,await file(dir,"drop.json",dropped)).status,0);
 const leaking=structuredClone(original);leaking.questions[0].prompt="Correct answer: B. Which letter comes second?";
 const old=await file(dir,"leak.json",leaking);
 const template=run(tool,"template",old,reviewedPath);
 const dec=await file(dir,"decisions.json",fillDecisions(template.data));
 const no=run(tool,"audit",old,reviewedPath,dec);
 assert.equal(no.status,1);
 assert.ok(no.data.issues.items.some(x=>x.code==="source-candidate-answer-leak"));
}));
test("P60-D RED: absent independent review or old review after edited question cannot produce half-written output",()=>temp(async dir=>{
 const {originalPath,reviewedPath}=await pairs(dir);
 const t=run(tool,"template",originalPath,reviewedPath);
 const decision=await file(dir,"decision.json",fillDecisions(t.data));
 const out=join(dir,"not-created");
 const missing=run(tool,"compile",originalPath,reviewedPath,decision,out);
 assert.notEqual(missing.status,0);
 await assert.rejects(access(out));
 const inUse=join(dir,"existing");await file(dir,"existing","KEEP THIS");
 const bad=run(tool,"compile",originalPath,reviewedPath,decision,inUse);
 assert.notEqual(bad.status,0);
 assert.equal(await readFile(inUse,"utf8"),"KEEP THIS");
}));

// P62-B: a reviewed file carries signed original IDs even when another
// plausible Source revision is imported earlier in the library.
test("P62-B exact revision pairing survives multiple originals and missing files",()=>temp(async dir=>{
 const {originalPath,reviewedPath,reviewed}=await pairs(dir);
 const t=run(tool,"template",originalPath,reviewedPath);
 const decisions=await file(dir,"decisions.json",fillDecisions(t.data));
 const candidates=run(qualityTool,"candidate",reviewedPath,"--limit","10");
 const review=await file(dir,"review.json",reviewFor(reviewed,candidates.data));
 const out=join(dir,"p62-lineage");
 const built=run(tool,"compile",originalPath,reviewedPath,decisions,out,"--quality-review",review);
 assert.equal(built.status,0,JSON.stringify(built.data));
 const source=validateExamPackage(JSON.parse(await readFile(join(out,"source.exam.json"),"utf8")));
 const target=validateExamPackage(JSON.parse(await readFile(join(out,"reviewed.exam.json"),"utf8")));
 const lineage=JSON.parse(await readFile(join(out,"editorial-lineage.json"),"utf8"));
 assert.equal(target.paper.sourcePaperRevisionId,lineage.sourcePaperRevisionId);
 assert.equal(target.paper.sourceAnswerKeyRevisionId,lineage.sourceAnswerKeyRevisionId);
 const other=structuredClone(source);
 other.paper.id=source.paper.id+":another-revision";
 other.paper.revision++;
 other.answerKey.id=source.answerKey.id+":another-revision";
 other.answerKey.revision++;
 other.paper.answerKeyRevisionId=other.answerKey.id;
 other.paper.contentHash=paperRevisionHash(other.paper);
 validateExamPackage(other);
 const family=examFamilyCatalog([other,target,source],new Set())[0];
 assert.equal(pairedEdition(family,target,"source")?.paper.id,source.paper.id);
 assert.equal(createSourceKeyReference(target,other),null);
 assert.equal(createSourceReviewReference(target,other),null);
 assert.equal(pairedEdition(examFamilyCatalog([other,target],new Set())[0],target,"source"),undefined,
  "A different original must not replace the pinned source");
 const unbound=structuredClone(target);
 delete unbound.paper.sourcePaperRevisionId;
 delete unbound.paper.sourceAnswerKeyRevisionId;
 unbound.paper.contentHash=paperRevisionHash(unbound.paper);
 assert.throws(()=>validateExamPackage(unbound),/requires exact original revision and key lineage/,
  "A reviewed paper without exact Source lineage is not a valid package");
 const tampered=structuredClone(target);
 tampered.paper.sourcePaperRevisionId=other.paper.id;
 assert.throws(()=>validateExamPackage(tampered),/hash mismatch/);
 const frozen={...startGenericAttempt(target,"reviewed-immutable",1000),
  sourceKeyReference:createSourceKeyReference(target,source)};
 validateSourceKeyReference(frozen);
 assert.equal(frozen.frozen.paper.sourcePaperRevisionId,source.paper.id);
}));

test("P62-B nineteen MCQs remain comparable beside one numerical question",()=>{
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 const input=revision=>({format:"practice-desk-authoring",version:1,
  bankId:"p62-mixed",examId:"synthetic-comparison",paperId:"p62-mixed",
  title:"Mixed P62 synthetic test",edition:"custom",revision,
  scoring:{correctMarks:2.5,incorrectMarks:-5/6},
  timing:{kind:"untimed",pausePolicy:"allowed"},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  sections:[{id:"general",title:"General"}],
  media:[{id:"diagram",dataUri:"data:image/png;base64,"+png,altText:"Diagram context"}],
  questions:Array.from({length:20},(_,i)=>i===19?
   {id:"q20",examSection:"general",kind:"numeric-entry",prompt:"Numeric example",answer:[5],
    provenance:{kind:"ai-original"},qa:{status:"unchecked"}}:
   {id:"q"+(i+1),examSection:"general",kind:"single-choice",
    prompt:i===0?{format:"practice-desk-rich",version:1,blocks:[
      {type:"paragraph",content:[{type:"text",text:"MCQ 1"}]},
      {type:"image",assetId:"diagram",altText:"Diagram context"}]}:"MCQ "+(i+1),
    options:["Alpha","Beta","Gamma","Delta"],answer:"B",
    provenance:{kind:"ai-original"},qa:{status:"unchecked"}})});
 const source=asSource(compileExternalQuestionBank(input(1)));
 const reviewed=bindReviewed(source,compileExternalQuestionBank(input(2)));
 const ref=createSourceKeyReference(reviewed,source);
 assert.equal(ref.schema,3);
 assert.equal(ref.entries.length,20);
 assert.equal(ref.entries.filter(x=>x.comparable).length,19);
 assert.deepEqual(ref.entries[19],{kind:"unavailable",
   questionRevisionId:reviewed.questions[19].id,comparable:false,reason:"unsupported-kind"});
 const attempt={...startGenericAttempt(reviewed,"mixed-attempt",1000),
  sourceKeyReference:ref,finishedAt:2000};
 validateSourceKeyReference(attempt);
 const score=sourceKeyScore(attempt);
 assert.equal(score.total,20);
 assert.equal(score.comparable,19);
 assert.equal(score.unavailable,1);
 assert.equal(score.maxMarks,47.5);
 const metadataOnly=structuredClone(reviewed);
 const q=metadataOnly.questions[1];
 q.content.richExplanation=plainRichDocument("Revised private solution");
 q.content.topicIds=["source:topic"];
 q.content.tags=["difficulty:hard"];
 q.contentHash=questionRevisionHash(q);
 validateExamPackage(metadataOnly);
 assert.equal(createSourceKeyReference(metadataOnly,source).entries.filter(x=>x.comparable).length,19,
  "Explanation-only and taxonomy edits cannot suppress an equivalent MCQ");
 const changedStem=structuredClone(metadataOnly);
 changedStem.questions[1].content.prompt="Changed candidate question";
 changedStem.questions[1].contentHash=questionRevisionHash(changedStem.questions[1]);
 validateExamPackage(changedStem);
 assert.equal(createSourceKeyReference(changedStem,source).entries.filter(x=>x.comparable).length,18);
 const changedOptions=structuredClone(metadataOnly);
 changedOptions.questions[1].content.options[0].text="Rewritten candidate option";
 changedOptions.questions[1].contentHash=questionRevisionHash(changedOptions.questions[1]);
 validateExamPackage(changedOptions);
 assert.equal(createSourceKeyReference(changedOptions,source).entries.filter(x=>x.comparable).length,18);
 const changedMedia=structuredClone(metadataOnly);
 changedMedia.assets[0].altText="Altered candidate diagram description";
 validateExamPackage(changedMedia);
 assert.equal(createSourceKeyReference(changedMedia,source).entries.filter(x=>x.comparable).length,18);
 const sourcePassage=structuredClone(source),targetPassage=structuredClone(reviewed);
 for(const pkg of [sourcePassage,targetPassage]){
   pkg.stimuli=[{id:"shared-passage",kind:"passage",text:"Same candidate passage"}];
   pkg.questions[1].content.stimulusId="shared-passage";
   pkg.questions[1].contentHash=questionRevisionHash(pkg.questions[1]);
   validateExamPackage(pkg);
 }
 assert.equal(createSourceKeyReference(targetPassage,sourcePassage).entries.filter(x=>x.comparable).length,19);
 targetPassage.stimuli[0].text="New candidate passage";
 validateExamPackage(targetPassage);
 assert.equal(createSourceKeyReference(targetPassage,sourcePassage).entries.filter(x=>x.comparable).length,18);
});

test("P62-B rejects noncanonical schema-2 source-key snapshots",()=>{
 const bank=revision=>({format:"practice-desk-authoring",version:1,
  bankId:"p62-schema-reject",examId:"synthetic-comparison",paperId:"p62-schema-reject",
  title:"Schema rejection test",edition:"custom",revision,
  scoring:{correctMarks:2.5,incorrectMarks:-5/6},
  timing:{kind:"untimed",pausePolicy:"allowed"},
  navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
  sections:[{id:"general",title:"General"}],
  questions:[{id:"q1",examSection:"general",kind:"single-choice",prompt:"Canonical question",
   options:["A","B","C","D"],answer:"B",provenance:{kind:"ai-original"},qa:{status:"unchecked"}}]});
 const source=asSource(compileExternalQuestionBank(bank(1)));
 const reviewed=bindReviewed(source,compileExternalQuestionBank(bank(2)));
 const sourceHash=hashJson({content:source.questions[0].content,stimulus:null,media:[]});
 const core={schema:2,paperId:reviewed.paper.paperId,sourcePaperRevisionId:source.paper.id,
   sourceAnswerKeyRevisionId:source.answerKey.id,
   entries:[{questionRevisionId:reviewed.questions[0].id,
    originalOptionId:"B",markingRule:source.paper.scoring.defaultRule,
    sourceSemanticHash:sourceHash,comparable:true}]};
 const reference={...core,contentHash:hashJson(core)};
 const attempt={...startGenericAttempt(reviewed,"schema-2-rejected",1000),
  sourceKeyReference:reference,finishedAt:2000};
 assert.throws(()=>validateSourceKeyReference(attempt),/source-key comparison schema/);
 assert.throws(()=>sourceKeyScore(attempt),/source-key comparison schema/);
});
}
await registerEditorialLineageTests();


/** Pdf Ingestion — canonical domain contracts. */
async function registerPdfIngestionTests(){
/** P60-E: no-PDF-parser intake protocol; all semantic/page claims remain external.
 * Fixtures exercise the same canonical authoring, P60-C and P60-D CLIs.
 */
const tool=fileURLToPath(new URL("../scripts/pdf-ingest.mjs",import.meta.url));
const editorial=fileURLToPath(new URL("../scripts/editorial-editions.mjs",import.meta.url));
const quality=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const sha=v=>createHash("sha256").update(v).digest("hex");
const sandbox=async fn=>{const folder=await mkdtemp(join(tmpdir(),"pd-p60e-"));
 try{return await fn(folder);}finally{await rm(folder,{recursive:true,force:true});}};
const save=async(dir,name,v)=>{const f=join(dir,name);
 await writeFile(f,typeof v==="string"||Buffer.isBuffer(v)?v:JSON.stringify(v));return f;};
const run=(script,...args)=>{
 const p=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:60000,maxBuffer:2*1024*1024});
 assert.equal(p.error,undefined,String(p.error));
 let data;try{data=JSON.parse(p.stdout||p.stderr);}
 catch{assert.fail("Invalid CLI JSON: "+p.stdout+" / "+p.stderr)}
 return {...p,data};
};
// Actually structured, small, two-page PDF fixture with a shared passage, a table,
// a TeX exercise and a figure; the software checks bytes, not visual equivalence.
function pdf(pages){
 const objects=[null,"<< /Type /Catalog /Pages 2 0 R >>",null];
 const content=[];
 let next=3,ids=[];
 for(const text of pages){
  const page=next++,stream=next++;
  ids.push(page);
  const escaped=text.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const line="BT /F1 12 Tf 48 700 Td ("+escaped+") Tj ET";
  objects[page]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 "+
    (3+pages.length*2)+" 0 R >> >> /Contents "+stream+" 0 R >>";
  objects[stream]="<< /Length "+Buffer.byteLength(line)+" >>\nstream\n"+line+"\nendstream";
 }
 const fontId=3+pages.length*2;
 objects[2]="<< /Type /Pages /Kids ["+ids.map(v=>v+" 0 R").join(" ")+"] /Count "+pages.length+" >>";
 objects[fontId]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
 let out="%PDF-1.4\n",offsets=[0];
 for(let i=1;i<objects.length;i++){
  offsets[i]=Buffer.byteLength(out);out+=i+" 0 obj\n"+objects[i]+"\nendobj\n";
 }
 const xref=Buffer.byteLength(out);out+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
 for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 out+="trailer\n<< /Root 1 0 R /Size "+objects.length+" >>\nstartxref\n"+xref+"\n%%EOF\n";
 return Buffer.from(out);
}
async function fixture(){
 const bank=JSON.parse(await readFile(new URL("../examples/ai-first-cat.json",import.meta.url),"utf8"));
 bank.bankId="p60e-extraction-synthetic";
 bank.paperId="p60e-synthetic";
 for(let i=0;i<bank.questions.length;i++)bank.questions[i].provenance={
  kind:"reconstruction",sourceNote:"Synthetic two-page PDF fixture; printed item "+(i+1)+" on page "+(i<2?1:2)};
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 bank.media=[{id:"diagram-1",dataUri:"data:image/png;base64,"+png,altText:"Schematic figure"}];
 bank.stimuli.push({id:"figure-one",kind:"image",mediaRef:"diagram-1",altText:"Schematic figure"});
 bank.questions.push({id:"figure-q",examSection:"qa",subject:"Quantitative Aptitude",
  kind:"single-choice",prompt:"What does the schematic depict?",stimulusRef:"figure-one",
  options:["A square","A circle","A triangle","A line"],answer:"A",
  explanation:"Synthetic image fixture; answer is test-only, not optically verified.",
  provenance:{kind:"reconstruction",sourceNote:"Synthetic two-page PDF figure, printed item 4 page 2"},
  qa:{status:"unchecked"}});
 bank.questions[2].prompt={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Evaluate "},{type:"math",tex:"2+2",linearText:"two plus two"}]}]};
 assert.equal(inspectExternalQuestionBank(bank).valid,true);
 const raw=JSON.stringify(bank),doc=pdf([
  "CAT practice fixture page 1: shared passage and DILR table; item 1 and item 2.",
  "CAT practice fixture page 2: mathematics 2+2, schematic figure, item 3 and item 4; printed key A B C A."
 ]);
 const bytes={sha256:sha(doc),byteLength:doc.length};
 const manifest=buildPdfIntakeTemplate(bank,raw,null,bytes);
 Object.assign(manifest.document,{title:"Synthetic CAT examination with passage/table/math/diagram",
  pageCount:2,inspectedPages:[1,2],
  identityNote:"Test-produced synthetic document; not a PYQ or institutional publisher"});
 manifest.documentInventoryStatus="checked-against-source";
 manifest.externalVerification="recorded-agent-check";
 manifest.inspector={kind:"agent",id:"synthetic-regression-agent",
  method:"Synthetic test compares page references, not independently verified PDF wording",
  reviewedAt:"2026-11-06"};
 manifest.questions.forEach((q,i)=>Object.assign(q,{
  pages:[i<2?1:2],status:"source-compared",printedNumber:String(i+1),
  keyOrigin:"source-document",keyPages:[2],mathStatus:"source-compared",explanationOrigin:"editorial-not-in-source",
  notes:"Synthetic fixture comparison claim; no actual OCR or source proof"}));
 manifest.stimuli.forEach((s,i)=>Object.assign(s,{pages:[i===0?1:i===1?1:2],
  status:"source-compared",notes:"Synthetic fixture page-linked stimulus"}));
 manifest.media.forEach(m=>Object.assign(m,{pages:[2],status:"source-compared",
  visualStatus:"source-compared",notes:"Synthetic figure visually compared in test claim"}));
 return {bank,raw,doc,bytes,manifest};
}
const audit=async x=>auditPdfIntake(x.manifest,x.bank,x.raw,x.bytes);
test("P60-E extracted mixed page, shared passage/table, TeX and embedded figure have complete page-bound ledger",async()=>{
 const x=await fixture(),r=await audit(x);
 assert.equal(r.valid,true,JSON.stringify(r.issues.items));
 assert.equal(r.readyForPublication,false,"No reviewed P60-C/D gate supplied");
 assert.equal(r.stage,"transcription-only");
 assert.equal(r.questionCount,4);
 assert.equal(r.sourceElementsChecked,8);
 assert.equal(r.factualVerification,"not-performed");
 assert.equal(r.actualPdfTextComparison,"not-performed-by-software");
 assert.ok(!JSON.stringify(r).includes("data:image"));
 assert.ok(!JSON.stringify(r).includes("answer"));
});
test("P60-E missing page, duplicate numbering and cropped/uncertain maths or figure fail closed",async()=>{
 const fresh=await fixture();
 for(const mutate of [
  m=>{m.document.inspectedPages=[1];m.document.missingPages=[2];},
  m=>{m.questions[3].printedNumber="3";},
  m=>{m.questions[2].mathStatus="not-applicable";},
  m=>{m.media[0].visualStatus="unchecked";},
  m=>{m.stimuli[1].uncertainties=["Table header cropped"];},
  m=>{m.questions[0].keyOrigin="unavailable";},
  m=>{m.original.omissions=["item-5"];},
  m=>{m.documentInventoryStatus="unchecked";},
  m=>{m.questions[1].pages=[3];},
  m=>{m.questions[0].explanationOrigin="unverified";},
  m=>{m.inspector.id="";},
  m=>{m.questions[0].pages=[2];},
  m=>{m.inspector.kind="human";},
  m=>{m.document.title="REPLACE WITH EXACT DOCUMENT TITLE";},
  m=>{m.stimuli[0].mathStatus="unchecked";}
 ]){
  const x=structuredClone(fresh);mutate(x.manifest);
  try{assert.equal((await audit(x)).valid,false);}
  catch(e){assert.match(e.message,/page|number|list|source|intake|key|math|figure|inspector|string/i);}
 }
});
test("P60-E original/source-document mismatch, stale individual revision and forged identity cannot silently pass",async()=>{
 const original=await fixture();
 for(const mutate of [
  x=>x.bytes.sha256="0".repeat(64),
  x=>{x.bank.questions[0].prompt="An unreviewed modified question";x.raw=JSON.stringify(x.bank);},
  x=>x.manifest.original.sourceSha256="f".repeat(64),
  x=>x.manifest.questions.pop(),
  x=>x.manifest.stimuli.push({...x.manifest.stimuli[0]}),
  x=>{x.manifest.questions[0].status="source-compared";x.manifest.questions[0].sha256="1".repeat(64);},
  x=>{x.bank.questions[0].provenance.kind="official-pyq";x.raw=JSON.stringify(x.bank);
   x.manifest.original.sourceSha256=sha(x.raw);x.manifest.questions[0].sha256=sha(JSON.stringify(x.bank.questions[0]));}
 ]){
  const x=structuredClone(original);mutate(x);
  assert.equal((await audit(x)).valid,false);
 }
});
test("P60-E CLI template is explicitly incomplete and does not reveal keys, audit uses byte-bound source, safe on corrupt PDFs",()=>sandbox(async dir=>{
 const x=await fixture();
 const paper=await save(dir,"paper.pdf",x.doc),original=await save(dir,"original.json",x.raw);
 const t=run(tool,"template",original,paper);
 assert.equal(t.status,0,t.stderr);
 assert.equal(t.data.questions[0].status,"unchecked");
 assert.equal(t.data.questions[0].keyOrigin,"unavailable");
 assert.ok(!t.stdout.includes("data:image"));
 assert.ok(!t.stdout.includes("A square"));
 const manifest=await save(dir,"intake.json",x.manifest);
 const a=run(tool,"audit",manifest,original,paper);
 assert.equal(a.status,0,a.stderr);
 assert.equal(a.data.valid,true);
 assert.equal(a.data.readyForPublication,false);
 const wrong=await save(dir,"wrong.pdf",pdf(["Different but still well-formed PDF"]));
 const mismatch=run(tool,"audit",manifest,original,wrong);
 assert.equal(mismatch.status,1);assert.ok(mismatch.data.issues.items.some(v=>v.code==="document-digest-mismatch"));
 const corrupt=await save(dir,"corrupt.pdf","%PDF-1.4\ncorrupted without trailer");
 const fail=run(tool,"audit",manifest,original,corrupt);
 assert.equal(fail.status,2);assert.equal(fail.data.code,"pdf-intake-input-invalid");
}));
test("P60-E strict compile delegates P60-D without rewriting original, and cannot publish stale decisions",()=>sandbox(async dir=>{
 const x=await fixture(),original=await save(dir,"original.json",x.raw);
 const pdfPath=await save(dir,"paper.pdf",x.doc),manifest=await save(dir,"intake.json",x.manifest);
 const reviewed=structuredClone(x.bank);
 reviewed.revision=2;
 reviewed.questions[0].answer="B";
 reviewed.questions[0].explanation="In the synthetic fixture, item 1 is intentionally disputed and has a reviewed choice.";
 const reviewedPath=await save(dir,"reviewed.json",reviewed);
 const d=run(editorial,"template",original,reviewedPath);
 assert.equal(d.status,0,d.stderr);
 const decisions=structuredClone(d.data);delete decisions.templateIncomplete;
 for(const row of decisions.entries){row.disposition="corrected";
  row.reason="Synthetic disputed answer adjudicated for software regression; no real source authenticated.";
  row.evidence=[{publisher:"Fixture",title:"Synthetic correction note",
   locator:"page 1 item "+row.questionId,sourceNote:"Test only; source paper not authenticated"}];}
 const decisionsPath=await save(dir,"decisions.json",decisions);
 const candidate=run(quality,"candidate",reviewedPath);
 assert.equal(candidate.status,0,candidate.stderr);
 const checklist=run(quality,"checklist");
 const review={format:"practice-desk-quality-review",version:2,bankId:reviewed.bankId,
  sourceSha256:candidate.data.sourceSha256,records:candidate.data.items.map(row=>{
   const q=reviewed.questions.find(q=>q.id===row.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:row.candidateSha256,
    applicability:{mathematical:["dilr-1","qa-1"].includes(q.id)?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},
    reviewer:{id:"synthetic-agent-reviewer",kind:"ai"},
    independentSolution:{blindClaim:true,answer:String(q.answer),
     reasoning:"Synthetic review assertion for software tests, not external proof."},
    checks:checklist.data.checklist.map((c,i)=>({id:c.id,status:"pass",
      basis:i===9?"mathematical-proof":[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
      rationale:"Synthetic QA statement for a regression fixture, not source certification."})),
    evidence:[{publisher:"Fixture",title:"Synthetic sample",
      locator:"paper page 1",retrievedAt:"2026-11-06",
      excerpt:"Test-only statement; no external source content checked."}]};
  })};
 const reviewPath=await save(dir,"review.json",review);
 const out=join(dir,"compiled");
 const before=run(tool,"audit",manifest,original,pdfPath,"--reviewed",reviewedPath,
  "--decisions",decisionsPath,"--quality-review",reviewPath);
 assert.equal(before.status,0,JSON.stringify(before.data));
 assert.equal(before.data.readyForPublication,true);
 const result=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  decisionsPath,out,"--quality-review",reviewPath);
 assert.equal(result.status,0,JSON.stringify(result.data));
 assert.equal(result.data.compiled,true);
 assert.deepEqual((await readdir(out)).sort(),["editorial-lineage.json","original-source.json",
  "pdf-intake-provenance.json","reviewed-source.json","reviewed.exam.json","source.exam.json"]);
 assert.equal(await readFile(join(out,"original-source.json"),"utf8"),x.raw);
 const note=JSON.parse(await readFile(join(out,"pdf-intake-provenance.json"),"utf8"));
 assert.equal(note.document.sha256,x.bytes.sha256);
 const source=JSON.parse(await readFile(join(out,"source.exam.json"),"utf8"));
 const corrected=JSON.parse(await readFile(join(out,"reviewed.exam.json"),"utf8"));
 assert.equal(source.paper.edition,"source");assert.equal(corrected.paper.edition,"reviewed");
 const attempted=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  decisionsPath,out,"--quality-review",reviewPath);
 assert.notEqual(attempted.status,0,"Never overwrite published pair");
 const stale={...decisions,originalSha256:"e".repeat(64)};
 const stalePath=await save(dir,"stale.json",stale),notCreated=join(dir,"no-out");
 const rejected=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  stalePath,notCreated,"--quality-review",reviewPath);
 assert.equal(rejected.status,1);
 await assert.rejects(access(notCreated));
}));


test("P60-E source-page tokens do not accept page 10 as citation of page 1; shared TeX must be compared",async()=>{
 const x=await fixture();
 x.bank.questions[0].provenance.sourceNote="Synthetic transcription on printed item 1 of page 10.";
 x.raw=JSON.stringify(x.bank);
 x.manifest.original.sourceSha256=sha(x.raw);
 x.manifest.questions[0].sha256=sha(JSON.stringify(x.bank.questions[0]));
 const report=await audit(x);
 assert.equal(report.valid,false);
 assert.ok(report.issues.items.some(e=>e.code==="source-note-page-mismatch"),JSON.stringify(report.issues));
 const y=await fixture();
 y.bank.stimuli[0].text={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Source text "},{type:"math",tex:"x^2+1",linearText:"x squared plus one"}]}]};
 y.raw=JSON.stringify(y.bank);
 y.manifest.original.sourceSha256=sha(y.raw);
 y.manifest.stimuli[0].sha256=sha(JSON.stringify(y.bank.stimuli[0]));
 const result=await audit(y);
 assert.equal(result.valid,false);
 assert.ok(result.issues.items.some(e=>e.code==="stimulus-math-unverified"),JSON.stringify(result.issues));
});
test("P60-E actual separate printed-key bytes and image document mode require explicit source/key identity",()=>sandbox(async dir=>{
 const x=await fixture(),original=await save(dir,"original.json",x.raw),
  source=await save(dir,"paper.pdf",x.doc);
 const separateKey=await save(dir,"printed-key.pdf",pdf(["Synthetic paper key A B C D"]));
 const templated=run(tool,"template",original,source,"--key-document",separateKey);
 assert.equal(templated.status,0,templated.stderr);
 assert.equal(templated.data.keyDocument.type,"pdf");
 assert.equal(templated.data.keyDocument.sha256,sha(await readFile(separateKey)));
 const manifest=structuredClone(x.manifest);
 manifest.keyDocument={...templated.data.keyDocument,title:"Synthetic separately printed key",
  pageCount:1,inspectedPages:[1],missingPages:[],identityNote:"Synthetic test key from a separate document"};
 for(const q of manifest.questions){q.keyOrigin="key-document";q.keyPages=[1];}
 const input=await save(dir,"separate-intake.json",manifest);
 const accepted=run(tool,"audit",input,original,source,"--key-document",separateKey);
 assert.equal(accepted.status,0,JSON.stringify(accepted.data));
 assert.equal(accepted.data.valid,true);
 const missingKey=run(tool,"audit",input,original,source);
 assert.equal(missingKey.status,1);
 assert.ok(missingKey.data.issues.items.some(e=>e.code==="key-file-required"));
 const corruptKey=await save(dir,"altered-key.pdf",pdf(["An entirely different printed key"]));
 const mismatch=run(tool,"audit",input,original,source,"--key-document",corruptKey);
 assert.equal(mismatch.status,1);
 assert.ok(mismatch.data.issues.items.some(e=>e.code==="document-digest-mismatch"));
 const png=Buffer.from(x.bank.media[0].dataUri.split(",")[1],"base64");
 const image=await save(dir,"scan.png",png);
 const imageTemplate=run(tool,"template",original,image,"--document-type","image");
 assert.equal(imageTemplate.status,0,JSON.stringify(imageTemplate.data));
 assert.equal(imageTemplate.data.document.type,"image");
 assert.equal(imageTemplate.data.document.sha256,sha(png));
 const fakeRiff=await save(dir,"bad.webp",Buffer.from("RIFFjunkjunk"));
 const rejected=run(tool,"template",original,fakeRiff,"--document-type","image");
 assert.equal(rejected.status,2);
 assert.ok(rejected.data.message.includes("signature"));
}));
}
await registerPdfIngestionTests();
