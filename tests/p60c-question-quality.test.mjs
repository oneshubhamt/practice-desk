/** P60-C RED: candidate-visible hint leakage and externally performed quality evidence. */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFile,writeFile,mkdtemp,rm,access} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {inspectCandidateIntegrity} from "../src/authoring/candidate-integrity.ts";
import {inspectAuthoringPublication} from "../src/authoring/authoring-publisher.ts";

const tool=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const cli=fileURLToPath(new URL("../scripts/question-bank-cli.mjs",import.meta.url));
const apfc=fileURLToPath(new URL("../examples/ai-first-apfc.json",import.meta.url));
const cat=fileURLToPath(new URL("../examples/ai-first-cat.json",import.meta.url));
const sha=s=>createHash("sha256").update(s).digest("hex");
const command=(script,...args)=>{
 const result=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:30000,maxBuffer:1024*1024});
 assert.equal(result.error,undefined,String(result.error));
 let data;try{data=JSON.parse(result.stdout||result.stderr);}
 catch{assert.fail(result.stdout+" "+result.stderr);}
 return {...result,data};
};
const temp=async f=>{const dir=await mkdtemp(join(tmpdir(),"pd-p60c-"));try{return await f(dir);}finally{await rm(dir,{recursive:true,force:true});}};
const write=async(dir,name,data)=>{const path=join(dir,name);await writeFile(path,JSON.stringify(data));return path;};

test("P60-C: all authoring paths block explicit answers hidden in private rich passages or shared rich media text",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 const draft=structuredClone(toAuthoringDraft(source));
 const textBlock=t=>({format:"practice-desk-rich",version:1,blocks:[{type:"paragraph",content:[{type:"text",text:t}]}]});
 // Direct Wordgard authoring may supply a private passage rather than a v1 stimulus.
 draft.questions[0].passage=textBlock("Correct answer: A");
 let issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field==="passage"));
 const denied=inspectAuthoringPublication(draft);
 assert.equal(denied.valid,false);
 assert.ok(denied.issues.some(x=>x.field.includes("Candidate view")&&x.reason.includes("explicit answer")));
 draft.questions[0].passage=textBlock("Unrelated passage.");
 // The rendered rich text, not only its plain-text fallback, can contain a leak.
 const passage=draft.stimuli.find(x=>x.kind==="passage"||x.kind==="case");
 assert.ok(passage);
 passage.text="Visible fallback contains no answer labels";
 passage.richText=textBlock("Correct answer: A");
 issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field==="stimulus.richText"));
 assert.equal(inspectAuthoringPublication(draft).valid,false);
 // Shared Wordgard tables and rich chart captions must also be inspected.
 draft.questions[0].stimulusRef="table-rich";
 draft.stimuli.push({id:"table-rich",kind:"table",columns:["Safe heading"],rows:[["Safe cell"]],
  richColumns:[textBlock("Correct answer: A")],richRows:[[textBlock("Unrelated cell")]]});
 issues=inspectCandidateIntegrity(draft);
 assert.ok(issues.some(x=>x.code==="candidate-answer-leak"&&x.field.startsWith("stimulus.richColumns")));
});
test("P60 full QA: explicit choice/answer markers are blocked but legitimate checkmark symbols remain choices",async()=>{
 const original=JSON.parse(await readFile(apfc,"utf8"));
 const marked=structuredClone(original);
 marked.questions[0].options[0]+=" (correct)";
 assert.ok(inspectExternalQuestionBank(marked).issues.some(x=>x.code==="candidate-answer-leak"));
 const exposed=structuredClone(original);
 exposed.questions[0].prompt="Correct choice: B";
 assert.ok(inspectExternalQuestionBank(exposed).issues.some(x=>x.code==="candidate-answer-leak"));
 const legitimate=structuredClone(original);
 legitimate.questions[0].options[0]="A check mark (✓)";
 assert.ok(!inspectExternalQuestionBank(legitimate).issues.some(x=>x.code==="candidate-answer-leak"));
});
test("P60-C RED: explicit answer labels in actual candidate stems fail canonical existing publisher",async()=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].prompt="Which letter is second? Correct answer: B";
 const report=inspectExternalQuestionBank(src);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"&&x.severity==="error"));
 const answerInExplanation=JSON.parse(await readFile(apfc,"utf8"));
 answerInExplanation.questions[0].explanation="The correct answer is B; A and C are wrong.";
 assert.equal(inspectExternalQuestionBank(answerInExplanation).valid,true,"Author-only explanations are allowed");
});
test("P60-C RED: misleading option markers, shared stimulus leakage and answer-giving alt metadata fail",async()=>{
 const catSource=JSON.parse(await readFile(cat,"utf8"));
 catSource.questions[0].options[0]="✓ A library replaces its catalogue.";
 assert.ok(inspectExternalQuestionBank(catSource).issues.some(x=>x.code==="candidate-answer-leak"));
 const stimulus=JSON.parse(await readFile(cat,"utf8"));
 stimulus.stimuli[0].text+=" Correct answer: A";
 assert.ok(inspectExternalQuestionBank(stimulus).issues.some(x=>x.code==="candidate-answer-leak"));
 const subtle=JSON.parse(await readFile(apfc,"utf8"));
 subtle.questions[0].prompt="A number series follows the pattern of consecutive squares: 1, 4, 9, 16. What is the next number?";
 const qa=inspectExternalQuestionBank(subtle);
 assert.ok(qa.issues.some(x=>x.code==="candidate-unintended-clue"&&x.severity==="warning"));
});
test("P60-C RED: blinded review packet exposes single candidate-only question, never key/explanation/source QA",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const r=command(tool,"candidate",input,"--limit","1");
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-blind-candidates");
 assert.equal(r.data.items.length,1);
 assert.equal(r.data.items[0].questionId,"labour-01");
 assert.ok(/^[a-f0-9]{64}$/.test(r.data.items[0].candidateSha256));
 assert.ok(/^[a-f0-9]{64}$/.test(r.data.sourceSha256));
 const body=JSON.stringify(r.data.items[0]);
 for(const field of ["answer","explanation","provenance","sourceNote","correctOption","qa"])
  assert.ok(!Object.hasOwn(r.data.items[0],field),"Protected field leaked: "+field);
 assert.ok(!body.includes("This placeholder is not a labour-law question."));
 assert.ok(!body.includes("data:image/"));
 assert.ok(!r.stdout.includes("What is 2 + 2?"));
 assert.ok(r.stdout.length<9000);
}));
test("P60-C RED: QA reports 20 mandatory checks, unverified by default and never claims internet retrieval",()=>temp(async dir=>{
 const input=await write(dir,"apfc.json",JSON.parse(await readFile(apfc,"utf8")));
 const r=command(tool,"audit",input);
 assert.equal(r.status,1,"Independent assessment absent is not a completed quality gate");
 assert.equal(r.data.format,"practice-desk-question-quality-audit");
 assert.equal(r.data.readyForPublication,false);
 assert.equal(r.data.factualVerification,"not-performed");
 assert.equal(r.data.externalSourceFetches,0);
 assert.equal(r.data.checklist.length,20);
 assert.equal(r.data.questionsMissingReview,3);
 assert.ok(r.data.issues.total>=3);
 assert.ok(!r.stdout.includes("B is second. This placeholder"));
 assert.ok(!r.stdout.includes("data:image/"));
}));
test("P60-C RED: external review must be SHA-bound, complete, independently solved; a matching self-assertion is NOT authenticated",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const pack=command(tool,"candidate",input,"--limit","10");
 assert.equal(pack.status,0,pack.stderr);
 const checks=Array.from({length:20},(_,i)=>({id:command(tool,"checklist").data.checklist[i].id,
  status:"pass",basis:i===11||i===12||i===13?"source-consulted":i===19?"rendered-claim":"independent-editorial",
  rationale:"Synthetic test assertion only, no authentic source verification"}));
 const report={format:"practice-desk-quality-review",version:1,bankId:src.bankId,sourceSha256:pack.data.sourceSha256,
  records:pack.data.items.map((q,i)=>({questionId:q.questionId,questionSha256:sha(JSON.stringify(src.questions[i])),
   candidateSha256:q.candidateSha256,
   reviewer:{id:"synthetic-reviewer",kind:"ai"},
   independentSolution:{blindClaim:true,answer:src.questions[i].answer,
    reasoning:"Synthetic fixture reasoning, not independently established"},
   checks:structuredClone(checks),
   evidence:[{publisher:"Fixture",title:"Illustrative only",locator:"test",retrievedAt:"2026-11-06",
    excerpt:"Synthetic example; source not authenticated"}]
  }))};
 const review=await write(dir,"review.json",report);
 const out=command(tool,"audit",input,"--review",review);
 assert.equal(out.status,0,out.stderr);
 assert.equal(out.data.readyForPublication,true);
 assert.equal(out.data.reviewAssurance,"recorded-self-attestation-not-authenticated");
 assert.equal(out.data.factualVerification,"not-performed");
 assert.equal(out.data.externalSourceFetches,0);
 const compiled=command(cli,"compile-bank",input,join(dir,"quality-reviewed-exam.json"),
  "--quality-review",review);
 assert.equal(compiled.status,0,compiled.stderr);
 assert.equal(compiled.data.qualityReview.readyForPublication,true);
 assert.equal(compiled.data.qualityReview.factualVerification,"not-performed");
 const plan=fileURLToPath(new URL("../examples/p60b-apfc-blueprint.json",import.meta.url));
 const both=command(cli,"compile-bank",input,join(dir,"blueprint-and-reviewed.json"),
  "--blueprint",plan,"--quality-review",review);
 assert.equal(both.status,0,both.stderr);
 assert.equal(both.data.blueprint.valid,true);
 assert.equal(both.data.qualityReview.readyForPublication,true);
 const compiledPkg=JSON.parse(await readFile(join(dir,"quality-reviewed-exam.json"),"utf8"));
 assert.equal(compiledPkg.questions[0].editorial.status,"caution",
  "An asserted review does not automatically upgrade editorial source authenticity");
 const legal=structuredClone(src);
 legal.questions[0].prompt="Under the Code on Wages 2019, which letter is second?";
 const legalPath=await write(dir,"legal.json",legal);
 const legalPacket=command(tool,"candidate",legalPath);
 const legalReview=structuredClone(report);
 legalReview.sourceSha256=legalPacket.data.sourceSha256;
 legalReview.records[0].questionSha256=sha(JSON.stringify(legal.questions[0]));
 legalReview.records[0].candidateSha256=legalPacket.data.items[0].candidateSha256;
 const lawResult=command(tool,"audit",legalPath,"--review",
  await write(dir,"legal-review.json",legalReview));
 assert.equal(lawResult.status,1);
 assert.ok(lawResult.data.issues.items.some(x=>x.code==="legal-asof-evidence-required"));
 const bad=structuredClone(report);bad.records[0].independentSolution.answer="D";
 const wrong=command(tool,"audit",input,"--review",await write(dir,"wrong.json",bad));
 assert.equal(wrong.status,1);
 assert.ok(wrong.data.issues.items.some(x=>x.code==="independent-key-disagreement"));
 const stale=structuredClone(report);stale.records[0].candidateSha256="0".repeat(64);
 const staleResult=command(tool,"audit",input,"--review",await write(dir,"stale.json",stale));
 assert.equal(staleResult.status,1);
 assert.ok(staleResult.data.issues.items.some(x=>x.code==="review-stale"));
}));
test("P60-C RED: strict compiler refuses incomplete review and never writes compiled output",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const incomplete={format:"practice-desk-quality-review",version:1,bankId:src.bankId,
  sourceSha256:sha(JSON.stringify(src)),records:[]};
 const review=await write(dir,"review.json",incomplete),output=join(dir,"blocked.json");
 const blocked=command(cli,"compile-bank",input,output,"--quality-review",review);
 assert.notEqual(blocked.status,0);
 await assert.rejects(access(output));
 const legacy=command(cli,"validate-bank",input);
 assert.equal(legacy.status,0,"Legacy unreviewed source remains caution-compatible");
}));
test("P60-C RED: malformed, fabricated, duplicate and undisclosed review records fail closed",()=>temp(async dir=>{
 const input=await write(dir,"source.json",JSON.parse(await readFile(cat,"utf8")));
 const source=JSON.parse(await readFile(input,"utf8"));
 for(const review of [
  {format:"practice-desk-quality-review",version:1,bankId:source.bankId,sourceSha256:"0".repeat(64),records:[]},
  {format:"practice-desk-quality-review",version:1,bankId:source.bankId,sourceSha256:sha(JSON.stringify(source)),records:[{questionId:"x",extra:"trusted"}]},
  {format:"practice-desk-quality-review",version:1,bankId:source.bankId,sourceSha256:sha(JSON.stringify(source)),records:[]}
 ]){
  const p=await write(dir,"broken-"+Math.random()+".json",review);
  const r=command(tool,"audit",input,"--review",p);
  assert.notEqual(r.status,0);
  assert.equal(r.data.readyForPublication,false);
 }
}));


test("P60-C: actual candidate exam renderer with an unpublished answer key never prints solution or editorial key",async()=>{
 const {compileExternalQuestionBank}=await import("../src/authoring/external-bank.ts");
 const {startGenericAttempt}=await import("../src/app/exam-package.ts");
 const {renderModelExam}=await import("../src/app/exam-view.ts");
 const source=JSON.parse(await readFile(apfc,"utf8"));
 const pkg=compileExternalQuestionBank(source);
 const attempt=startGenericAttempt(pkg,"p60c-render-frozen",1000);
 const html=renderModelExam(attempt,pkg);
 assert.match(html,/Which letter comes second/);
 assert.ok(!html.includes("B is second. This placeholder"),"Premature worked solution leaked");
 assert.ok(!html.includes("Correct answer: B"),"Premature explicit key leaked");
 assert.ok(!html.includes("not been independently certified"),"Editorial notes leaked before submission");
});

test("P60-C: referenced image alt text can leak a key without any incorrect answer field",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 source.media=[{id:"image-one",dataUri:"data:image/png;base64,"+png,altText:"Correct answer: A"}];
 source.stimuli.push({id:"picture-question",kind:"image",mediaRef:"image-one",
  altText:"Diagram used for a question"});
 source.questions[0].stimulusRef="picture-question";
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"&&x.path.includes("media.altText")));
});

test("P60-C: review templates are intentionally incomplete and do not contain hidden source keys or explanations",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 const input=await write(dir,"source.json",src);
 const r=command(tool,"template",input,"--limit","1");
 assert.equal(r.status,0,r.stderr);
 assert.equal(r.data.format,"practice-desk-quality-review");
 assert.equal("templateIncomplete" in r.data,false,"Fillable review must match exact v1 schema");
 assert.equal(r.data.records.length,1);
 assert.equal(r.data.records[0].checks.length,20);
 assert.equal(r.data.records[0].independentSolution.blindClaim,false);
 assert.ok(!r.stdout.includes("B is second. This placeholder"));
 assert.ok(!r.stdout.includes("data:image/"));
 const check=command(tool,"audit",input,"--review",await write(dir,"unfinished-review.json",{
  format:r.data.format,version:r.data.version,bankId:r.data.bankId,
  sourceSha256:r.data.sourceSha256,records:r.data.records
 }));
 assert.equal(check.status,1);
 assert.equal(check.data.readyForPublication,false);
}));

test("P60-C: complete keyed answer repeated in question prompt is highlighted as untrusted semantic clue",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 source.questions[0].prompt="A library replaces its catalogue. A library replaces its catalogue. Which statement is correct?";
 const q=inspectExternalQuestionBank(source);
 assert.ok(q.issues.some(x=>x.code==="candidate-unintended-clue"&&x.severity==="warning"));
});


test("P60-C: literal check-mark symbol as an answer choice is not falsely blocked as an editorial badge",async()=>{
 const source=JSON.parse(await readFile(cat,"utf8"));
 source.questions[0].options=["Tick mark (✓)","Cross mark (✗)","Empty square (□)","Empty circle (○)"];
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 assert.ok(!report.issues.some(x=>x.code==="candidate-answer-leak"));
});


test("P60-C: direct named-answer and worked-solution labels are blocked in GK stems, without touching private explanations",async()=>{
 const base=JSON.parse(await readFile(apfc,"utf8"));
 const exposed=structuredClone(base);
 exposed.questions[0].prompt="Which city is India's capital? Correct answer: New Delhi.";
 const report=inspectExternalQuestionBank(exposed);
 assert.equal(report.valid,false);
 assert.ok(report.issues.some(x=>x.code==="candidate-answer-leak"));
 const privateExplanation=structuredClone(base);
 privateExplanation.questions[0].explanation="Correct answer: New Delhi. This is a synthetic explanation, not an examination fact claim.";
 assert.equal(inspectExternalQuestionBank(privateExplanation).valid,true,
  "Author-only solution text must not be mistaken for candidate-visible leaked hints");
});


test("P60-C: bounded quality audit exposes heuristic candidate-hint warnings instead of hiding them behind aggregate counts",()=>temp(async dir=>{
 const src=JSON.parse(await readFile(apfc,"utf8"));
 src.questions[0].prompt="A series follows the pattern of consecutive squares: 1, 4, 9, 16. What comes next?";
 const file=await write(dir,"hinted.json",src);
 const r=command(tool,"audit",file,"--limit","20");
 assert.equal(r.status,1,"Review is still absent");
 assert.ok(r.data.issues.items.some(x=>x.code==="canonical-candidate-unintended-clue"&&x.severity==="warning"));
 assert.ok(r.data.issues.items.some(x=>x.code==="review-missing"&&x.severity==="error"));
 assert.ok(r.data.warningIssueCount>=1);
 assert.ok(r.data.blockingIssueCount>=1);
 assert.equal(r.data.factualVerification,"not-performed");
}));
