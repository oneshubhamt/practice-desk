/** P60-D RED: general original/reviewed editorial lineage for external AI banks.
 * A stamped, unverified author explanation never upgrades facts to official truth.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,writeFile,mkdtemp,access,readdir,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {createSourceKeyReference,sourceKeyScore} from "../src/engine/source-comparison.ts";
import {createSourceReviewReference} from "../src/engine/review-source.ts";
import {familyIdFor,pairedEdition,examFamilyCatalog} from "../src/app/exam-families.ts";

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
 return {format:"practice-desk-quality-review",version:1,bankId:source.bankId,
  sourceSha256:candidates.sourceSha256,
  records:candidates.items.map((entry,index)=>{
   const q=source.questions.find(x=>x.id===entry.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:entry.candidateSha256,reviewer:{id:"fictional-test-operator",kind:"ai"},
    independentSolution:{blindClaim:true,answer:q.answer,
     reasoning:"Test-only assertion of independent solution, no external source was checked."},
    checks:c.data.checklist.map((check,i)=>({id:check.id,status:"pass",
     basis:[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
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
 assert.equal(r.data.templateIncomplete,true);
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
 assert.equal(preview.status,0,preview.stderr);
 assert.equal(preview.data.readyForPublication,true);
 assert.equal(preview.data.sourceKeyComparison.comparable,2);
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
 assert.equal(target.questions[0].editorial.status,"caution","Author claims never self-certify correction");
 assert.ok(target.questions[0].editorial.changes.includes("answer-key"));
 assert.ok(target.questions[0].editorial.notes.includes("Synthetic deliberately disputed"));
 const lineage=JSON.parse(await readFile(join(out,"editorial-lineage.json"),"utf8"));
 assert.equal(lineage.format,"practice-desk-editorial-lineage");
 assert.equal(lineage.factualVerification,"not-performed");
 assert.equal(lineage.originalSha256,sha(await readFile(originalPath,"utf8")));
 assert.equal(lineage.reviewedSha256,sha(await readFile(reviewedPath,"utf8")));
 assert.equal(lineage.entries.length,1);
 assert.ok(lineage.entries[0].changedFields.includes("answer"));
 assert.equal(lineage.entries[0].originalQuestionSha256,sha(JSON.stringify(original.questions[0])));
 assert.equal(lineage.entries[0].reviewedQuestionSha256,sha(JSON.stringify(reviewed.questions[0])));
 const ref=createSourceKeyReference(target,source);
 assert.equal(ref.entries.filter(x=>x.comparable).length,2);
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
 assert.ok(bad.data.issues.items.some(x=>x.code==="stale-decisions"));
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
