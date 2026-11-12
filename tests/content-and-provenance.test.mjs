// Capability suite with source-verified consolidation. Original fixture blocks
// remain traceable; overlapping Q62 status/marks checks now have one owner.
// Imports are module namespaces to avoid collisions between former suites.
import * as __suite_dep_0 from "node:test";
import * as __suite_dep_1 from "node:assert/strict";
import * as __suite_dep_2 from "node:fs/promises";
import * as __suite_dep_3 from "./fixtures/six-kinds.mjs";
import * as __suite_dep_4 from "../src/app/exam-package.ts";
import * as __generic_attempt from "../src/engine/generic-attempt.ts";
import * as __suite_dep_5 from "../src/engine/scoring.ts";
import * as __suite_dep_6 from "../src/engine/score-ceiling.ts";
import * as __suite_dep_7 from "../src/domain/integrity.ts";
import * as __suite_dep_8_stored_record_validator from "../src/app/stored-record-validator.ts";
import * as __suite_dep_8_exam_view from "../src/app/exam-view.ts";
import * as __suite_dep_9 from "../src/engine/review-source.ts";
import * as __suite_dep_10 from "../src/content/import-cgl.ts";
import * as __suite_dep_11 from "../src/engine/response.ts";
import * as __suite_dep_12 from "../src/app/editorial-labels.ts";
import * as __suite_dep_13 from "node:child_process";
import * as __suite_dep_14 from "node:url";
import * as __suite_dep_15 from "node:path";
import * as __suite_dep_16 from "../src/domain/validate.ts";
import * as __suite_dep_17 from "../src/engine/session.ts";
import * as __suite_dep_18 from "../src/app/result-presentation.ts";
import * as __suite_dep_19 from "../src/app/exam-preflight.ts";
import * as __suite_dep_20 from "../src/app/response-drafts.ts";
import * as __suite_dep_21 from "../src/history/deletion-policy.ts";
import * as __suite_dep_22 from "../src/history/backup.ts";
import * as __suite_dep_23 from "../src/engine/source-comparison.ts";
import * as __suite_dep_24 from "../src/content/validate.ts";
import * as __suite_dep_25 from "node:vm";
import * as __suite_dep_26 from "../src/domain/hash.ts";
import * as __suite_dep_27 from "../src/learning/learning.ts";
import * as __suite_dep_28 from "../src/app/preferences.ts";

// === Consolidated coverage: tests/content-cgl-edition-parity.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const pkg = __suite_dep_3["pkg"];
const builtinCglPackages = __suite_dep_4["builtinCglPackages"];
const configureCglPractice = __suite_dep_4["configureCglPractice"];
const cglAttemptMode = __suite_dep_4["cglAttemptMode"];
const validateExamPackage = __suite_dep_4["validateExamPackage"];
const startGenericAttempt = __suite_dep_4["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const scoreAttempt = __suite_dep_5["scoreAttempt"];
const scoreableMaximum = __suite_dep_6["scoreableMaximum"];
const sectionScoreSummaries = __suite_dep_6["sectionScoreSummaries"];
const paperRevisionHash = __suite_dep_7["paperRevisionHash"];
const validateGenericStoredRecord = __suite_dep_8_stored_record_validator["validateGenericStoredRecord"];
const createSourceReviewReference = __suite_dep_9["createSourceReviewReference"];
const editorialStatusLabel = __suite_dep_12["editorialStatusLabel"];
const papers=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const editions=builtinCglPackages(papers,patches,solutions);

test("all five CGL paper families preserve independently pinned original and reviewed keys, editorial changes and content",()=>{
 assert.equal(Object.keys(papers).length,5);
 assert.equal(editions.length,10);
 let corrected=0,caution=0;
 for(const original of Object.values(papers)){
   const source=editions.find(p=>p.paper.paperId===original.id&&p.paper.edition==="source");
   const reviewed=editions.find(p=>p.paper.paperId===original.id&&p.paper.edition==="reviewed");
   assert.ok(source&&reviewed);
   assert.equal(source.questions.length,100);assert.equal(reviewed.questions.length,100);
   for(const variant of [source,reviewed]){
     assert.equal(variant.paper.sections.length,4);
     assert.equal(variant.paper.sections.reduce((n,section)=>n+section.questionRevisionIds.length,0),100);
     assert.equal(variant.paper.answerKeyRevisionId,variant.answerKey.id,
       "Paper revision must pin its precise source/reviewed answer key");
     assert.equal(variant.answerKey.entries.length,100);
   }
   assert.deepEqual(source.paper.sections.map(s=>s.questionRevisionIds.length),[25,25,25,25]);
   const keySource=new Map(source.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
   const keyReviewed=new Map(reviewed.answerKey.entries.map(e=>[e.questionRevisionId,e.answer]));
   for(let i=0;i<100;i++){
     const before=original.questions[i],src=source.questions[i],rev=reviewed.questions[i];
     const patch=patches[original.id]?.[String(before.n)]??{};
     assert.equal(src.content.prompt,before.stem);
     assert.deepEqual(src.content.options.map(o=>o.text),before.opts);
     assert.equal(keySource.get(src.id)?.optionId,src.content.options["abcd".indexOf(before.key)].id);
     assert.equal(rev.content.prompt,patch.stem??before.stem);
     assert.deepEqual(rev.content.options.map(o=>o.text),patch.opts??before.opts);
     assert.equal(keyReviewed.get(rev.id)?.optionId,rev.content.options["abcd".indexOf(patch.key??before.key)].id);
     // Canonical reviewed-edition status mapping:
     const reviewedStatus=patch.status??(before.status==="invalid"||before.status==="caution"?"caution":"ok");
     const expected=reviewedStatus==="ok"?"verified":reviewedStatus;
     assert.equal(rev.editorial.status,expected,original.id+" Q"+before.n+" editorial parity");
     if(expected==="corrected")corrected++;
     if(expected==="caution")caution++;
   }
 }
 assert.ok(corrected>50);assert.ok(caution>5);
});

test("October 6 Q62: published b disputed; original excluded, reviewed caution remains scored against b",()=>{
 const source=editions.find(x=>x.paper.paperId==="cgl-2026-10-06"&&x.paper.edition==="source");
 const reviewed=editions.find(x=>x.paper.paperId==="cgl-2026-10-06"&&x.paper.edition==="reviewed");
 const index=61;
 const original=source.questions[index],changed=reviewed.questions[index];
 assert.equal(original.editorial.status,"invalid");
 assert.equal(changed.editorial.status,"caution");
 assert.match(editorialStatusLabel(changed.editorial),/not certified/);
 assert.match(changed.editorial.notes,/published answer is retained for scoring/i);
 assert.match(changed.editorial.notes,/disputed/i);
 assert.equal(changed.content.options[1].text,"Both 1 and 2, but not 3");
 assert.equal(changed.content.options[3].text,"Only 2");
 assert.equal(source.answerKey.entries[index].answer.optionId,original.content.options[1].id);
 assert.equal(reviewed.answerKey.entries[index].answer.optionId,changed.content.options[1].id);
 const submittedAt=new Date(10000).toISOString();
 const sourceResult=scoreAttempt(source.paper,source.answerKey,source.questions,
  [{questionRevisionId:original.id,response:{kind:"single-choice",optionId:original.content.options[1].id},flagged:false,timeSpentMs:0,answerChangeCount:0}],submittedAt);
 assert.equal(sourceResult.items[index].verdict,"excluded");
 assert.equal(sourceResult.items[index].marks,0);
 const answer=(optionId)=>[{questionRevisionId:changed.id,
   response:{kind:"single-choice",optionId},flagged:false,timeSpentMs:0,answerChangeCount:0}];
 const right=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,
   answer(changed.content.options[1].id),submittedAt);
 const disputed=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,
   answer(changed.content.options[3].id),submittedAt);
 assert.equal(right.items[index].verdict,"correct");
 assert.equal(right.items[index].marks,2);
 assert.equal(disputed.items[index].verdict,"incorrect");
 assert.equal(disputed.items[index].marks,-0.5);
 assert.ok(scoreableMaximum(reviewed.paper,reviewed.answerKey,reviewed.questions)>=
   scoreableMaximum(source.paper,source.answerKey,source.questions)+2,
   "The reviewed edition must include Q62; other independently patched source-invalid items also restore marks");
 const ref=createSourceReviewReference(reviewed,source);
 assert.ok(ref.entries.some(e=>e.targetQuestionRevisionId===changed.id));
});

function customScoring(){
 const updated=structuredClone(pkg);
 const scoring={...updated.paper.scoring,decimalPlaces:2,
  byQuestionKind:{
   "multiple-select":{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:8}},
   "matching":{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0,
    partialCredit:{kind:"per-correct-component",marksPerCorrectComponent:9}}
  }};
 const changed={...updated.paper,scoring};
 updated.paper={...changed,contentHash:paperRevisionHash(changed)};
 return validateExamPackage(updated);
}
test("imported generic multiple-select cannot earn above declared max through excessive component awards",()=>{
 const exam=customScoring();
 const q=exam.questions[1];
 const r=scoreAttempt(exam.paper,exam.answerKey,exam.questions,
  [{questionRevisionId:q.id,response:{kind:"multiple-select",optionIds:["x","y"]},
   timeSpentMs:1,answerChangeCount:0,flagged:false}],new Date().toISOString());
 assert.equal(r.items[1].verdict,"incorrect");
 assert.equal(r.items[1].marks,2);
 assert.ok(r.snapshot.earnedMarks<=scoreableMaximum(exam.paper,exam.answerKey,exam.questions));
});
test("imported generic matching partial response cannot exceed nominal full credit",()=>{
 const exam=customScoring(),q=exam.questions[4];
 const r=scoreAttempt(exam.paper,exam.answerKey,exam.questions,
  [{questionRevisionId:q.id,response:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"}]},
   timeSpentMs:1,answerChangeCount:0,flagged:false}],new Date().toISOString());
 assert.equal(r.items[4].verdict,"incorrect");assert.equal(r.items[4].marks,2);
});
test("standard CGL marking and nominal denominator are unchanged by generic cap",()=>{
 const x=editions.find(x=>x.paper.paperId==="cgl-2026-10-08"&&x.paper.edition==="reviewed");
 const q=x.questions[0],key=x.answerKey.entries[0].answer;
 const wrong=q.content.options.find(o=>o.id!==key.optionId);
 const r=scoreAttempt(x.paper,x.answerKey,x.questions,[{questionRevisionId:q.id,
  response:{kind:"single-choice",optionId:wrong.id},timeSpentMs:1,answerChangeCount:0,flagged:false}],
  new Date().toISOString());
 assert.equal(r.items[0].marks,q.editorial.status==="invalid"?0:-0.5);
 const a=startGenericAttempt(configureCglPractice(x,"single",0),"pass16-standard",1000);
 assert.equal(validateGenericStoredRecord(a),a);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1200},
    new Map(a.frozen.questions.map(q=>[q.id,q])));
 assert.equal(sectionScoreSummaries(ended,ended.result)[0].eligibleMax,
   scoreableMaximum(ended.frozen.paper,ended.frozen.key,ended.frozen.questions));
});
}

// === Consolidated coverage: tests/content-cgl-import-and-scoring.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const importCglBank = __suite_dep_10["importCglBank"];
const validateResponse = __suite_dep_11["validateResponse"];
const scoreAttempt = __suite_dep_5["scoreAttempt"];
const papers = JSON.parse(await readFile(new URL("../src/content/papers.json", import.meta.url)));
const patches = JSON.parse(await readFile(new URL("../src/content/patches.json", import.meta.url)));
const library = importCglBank(papers, patches);


test("reviewed editorial policy: source invalid without a patch is scored as caution", () => {
  for (let i = 0; i < library.length; i += 2) {
    const source = library[i], reviewed = library[i + 1];
    for (let j = 0; j < source.questions.length; j++) {
      const original = source.questions[j], corrected = reviewed.questions[j];
      if (original.editorial.status === "invalid") {
        assert.equal(corrected.editorial.status,
          patches[source.paper.paperId]?.[String(j+1)]?.status ?? "caution");
        assert.equal(original.editorial.status,"invalid","Source edition must remain unchanged");
      }
    }
  }
});




}

// === Consolidated coverage: tests/content-editorial-and-timing-labels.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const builtinCglPackages = __suite_dep_4["builtinCglPackages"];
const configureCglPractice = __suite_dep_4["configureCglPractice"];
const startGenericAttempt = __suite_dep_4["startGenericAttempt"];
const renderModelExam = __suite_dep_8_exam_view["renderModelExam"];
const readablePracticeMode = __suite_dep_8_exam_view["readablePracticeMode"];
const editorialStatusLabel = __suite_dep_12["editorialStatusLabel"];
const scoreAttempt = __suite_dep_5["scoreAttempt"];
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
const packages=builtinCglPackages(sources,patches);
const find=(paperId,edition)=>packages.find(p=>p.paper.paperId===paperId&&p.paper.edition===edition);
const question=(p,n)=>p.questions[n-1];
const entry=(p,n)=>p.answerKey.entries[n-1];
const letter=id=>id.split(":").at(-1);
test("L08: classified changes match actual source/patch field differences",()=>{
 let keys=0,wordings=0,options=0,explanations=0;
 for(const [paperId,source] of Object.entries(sources)){
  const original=find(paperId,"source"),reviewed=find(paperId,"reviewed");
  assert.ok(original&&reviewed);
  for(const row of source.questions){
   const p=patches[paperId]?.[String(row.n)]??{};
   const r=question(reviewed,row.n),o=question(original,row.n),changes=r.editorial.changes??[];
   const checks=[["answer-key",p.key!==undefined&&p.key!==row.key],
     ["wording",p.stem!==undefined&&p.stem!==row.stem],
     ["options",p.opts!==undefined&&p.opts.some((v,i)=>v!==row.opts[i])],
     ["explanation",p.explanation!==undefined&&p.explanation!==row.explanation]];
   for(const [type,expected] of checks)
    assert.equal(changes.includes(type),expected,paperId+" Q"+row.n+" "+type);
   assert.equal(o.editorial.changes,undefined,"Source does not acquire reviewed metadata");
   assert.equal(letter(entry(original,row.n).answer.optionId),row.key);
   assert.equal(letter(entry(reviewed,row.n).answer.optionId),p.key??row.key);
   assert.equal(editorialStatusLabel(r.editorial).startsWith("Key corrected"),
    r.editorial.status==="corrected"&&checks[0][1],paperId+" Q"+row.n+" label");
   keys+=Number(checks[0][1]);wordings+=Number(checks[1][1]);
   options+=Number(checks[2][1]);explanations+=Number(checks[3][1]);
  }
 }
 assert.equal(keys,10,"Ten changed published keys across five fixed CGL dates");
 assert.ok(wordings>10&&options>2&&explanations>10,
  "Every actual patch type independently exercised");
});
test("L08: 30 Sep Q6 C to D, wording-only Q3, and disputed 6 Oct Q62 unchanged",()=>{
 const p=find("cgl-2026-09-30","reviewed");
 assert.ok(question(p,6).editorial.changes.includes("answer-key"));
 assert.equal(letter(entry(find("cgl-2026-09-30","source"),6).answer.optionId),"c");
 assert.equal(letter(entry(p,6).answer.optionId),"d");
 assert.equal(editorialStatusLabel(question(p,6).editorial),"Key corrected · recorded editorial change");
 assert.ok(question(p,3).editorial.changes.includes("wording"));
 assert.ok(!question(p,3).editorial.changes.includes("answer-key"));
 assert.ok(!editorialStatusLabel(question(p,3).editorial).startsWith("Key corrected"));
 assert.ok(!editorialStatusLabel(question(p,97).editorial).startsWith("Key corrected"));
 const original=find("cgl-2026-10-06","source"),reviewed=find("cgl-2026-10-06","reviewed");
 assert.equal(question(original,62).editorial.status,"invalid");
 assert.equal(question(reviewed,62).editorial.status,"caution");
 assert.equal(letter(entry(original,62).answer.optionId),"b");
 assert.equal(letter(entry(reviewed,62).answer.optionId),"b");
 assert.ok(!question(reviewed,62).editorial.changes?.includes("answer-key"));
 const id=question(reviewed,62).id;
 const result=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,
  [{questionRevisionId:id,response:{kind:"single-choice",optionId:entry(reviewed,62).answer.optionId}}],
  "2026-10-31T00:00:00Z");
 assert.equal(result.items.find(x=>x.questionRevisionId===id)?.marks,2);
});
test("L09/L10: timing type and frozen mode have accurate labels, untimed included",()=>{
 const p=find("cgl-2026-09-30","reviewed");
 for(const [configured,policy,mode,scope,aria] of [
  [configureCglPractice(p,"free"),"free","Full paper · flexible navigation","Whole-paper timer","Whole-paper time used"],
  [configureCglPractice(p,"strict"),"strict","Exam simulation","Section timer","Section time used"],
  [configureCglPractice(p,"single",1),"single","Single-section practice","Whole-paper timer","Whole-paper time used"]]){
  const a=startGenericAttempt(configured,mode,0,cglAttemptMode(policy)),html=renderModelExam(a,configured);
  assert.ok(html.includes('<p class="muted">'+mode+' · '),
   "Human-readable frozen exam mode must remain visible beneath the compact title");
  assert.ok(html.includes('aria-valuetext="'+scope+' '),
   scope+" must remain available to screen readers in the compact progress bar");
  assert.ok(html.includes('aria-label="'+aria+'"'),aria+" missing");
  assert.ok(!html.includes("Key corrected"),"Pre-submit editorial key leaked");
 }
 const source=startGenericAttempt(p,"custom",0);
 const untimed={...source,frozen:{...source.frozen,paper:{
  ...source.frozen.paper,timing:{kind:"untimed"}}}};
 const html=renderModelExam(untimed,p);
 assert.ok(html.includes('aria-valuetext="Question coverage '));
 assert.ok(html.includes('aria-label="Questions answered"'));
 assert.ok(!html.includes('aria-valuetext="Section timer '));
 assert.equal(readablePracticeMode("custom-practice"),"Custom practice");
 assert.equal(readablePracticeMode("author-defined-mode"),"author defined mode");
});
}

// === Consolidated coverage: tests/content-frozen-integrity.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const execFileSync = __suite_dep_13["execFileSync"];
const fileURLToPath = __suite_dep_14["fileURLToPath"];
const resolve = __suite_dep_15["resolve"];
const pkg = __suite_dep_3["pkg"];
const questions = __suite_dep_3["questions"];
const builtinCglPackages = __suite_dep_4["builtinCglPackages"];
const configureCglPractice = __suite_dep_4["configureCglPractice"];
const validateExamPackage = __suite_dep_4["validateExamPackage"];
const startGenericAttempt = __suite_dep_4["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const validateAnswerKeyRevision = __suite_dep_16["validateAnswerKeyRevision"];
const validatePaperRevision = __suite_dep_16["validatePaperRevision"];
const paperRevisionHash = __suite_dep_7["paperRevisionHash"];
const answerKeyRevisionHash = __suite_dep_7["answerKeyRevisionHash"];
const scoreableMaximum = __suite_dep_6["scoreableMaximum"];
const scoreableLowerBound = __suite_dep_6["scoreableLowerBound"];
const scoreAttempt = __suite_dep_5["scoreAttempt"];
const startSession = __suite_dep_17["startSession"];
const transition = __suite_dep_17["transition"];
const sectionTimerDuration = __suite_dep_17["sectionTimerDuration"];
const resultTabsHTML = __suite_dep_18["resultTabsHTML"];
const examPreflight = __suite_dep_19["examPreflight"];
const editorialStatusLabel = __suite_dep_12["editorialStatusLabel"];
const duplicateMatchingTargets = __suite_dep_20["duplicateMatchingTargets"];
const multipleDraftMessage = __suite_dep_20["multipleDraftMessage"];
const assertDeletionAllowed = __suite_dep_21["assertDeletionAllowed"];
const makeBackup = __suite_dep_22["makeBackup"];
const verifyBackup = __suite_dep_22["verifyBackup"];
const planBackupMerge = __suite_dep_22["planBackupMerge"];
/** Pass 23 independent boundary audit, not reused Pass 17–22 fixtures/results.
 * Cross-check immutable canonical source banks and reconcile adversarial generic contracts.
 */




















const root=resolve(fileURLToPath(new URL("..",import.meta.url)));
const json=async name=>JSON.parse(await readFile(new URL("../src/content/"+name+".json",import.meta.url)));
const [sources,patches,solutions]=await Promise.all(["papers","patches","solutions"].map(json));
const banks=builtinCglPackages(sources,patches,solutions);
const sameRecord=(old,now)=>JSON.stringify(old)===JSON.stringify(now);
const advance=(p,s,type,at,props={})=>transition(p,s,{type,nowMs:at,...props});
const rehash=b=>{
 const base={...b,contentHash:undefined};delete base.contentHash;
 return {...base,contentHash:paperRevisionHash(base)};
};
const keyUpdate=entries=>({...pkg.answerKey,entries,contentHash:answerKeyRevisionHash({entries})});

test("SOURCE A/V01/V05/V19: original content banks retain their canonical source blobs",async()=>{
 const canonicalSourceBlob={
   papers:"1d2c388a91a82c49feb57ccd86a8a40eb7388473",
   patches:"37328784aadd53810a786550ce02ff3105fccbd7",
   solutions:"ada93d1f27c091023d6a26e9f89dd8956ebaf55e"
 };
 for(const name of ["papers","patches","solutions"]){
  const filename="src/content/"+name+".json";
  const hash=execFileSync("git",["hash-object",filename],{cwd:root,encoding:"utf8"}).trim();
  assert.equal(hash,canonicalSourceBlob[name],
    name+" was silently changed from its canonical source Git blob");
 }
 assert.equal(Object.keys(sources).length,5);
 assert.equal(Object.values(sources).reduce((n,p)=>n+p.questions.length,0),500);
 assert.equal(banks.length,10);
 for(const paper of Object.values(sources)){
  assert.equal(paper.questions.length,100);
  const editions=banks.filter(b=>b.paper.paperId===paper.id);
  assert.deepEqual(editions.map(x=>x.paper.edition).sort(),["reviewed","source"]);
  for(const edition of editions){
   assert.equal(edition.questions.length,100);
   assert.equal(edition.paper.sections.length,4);
   assert.ok(edition.assets.every(a=>a.dataUri.startsWith("data:image/")&&a.altText),
     "Frozen CGL media must be contextual and offline");
  }
 }
});

test("V02/V07/F02/F06: all 10 paper editions have derived full/section marks, no hardcoded ceiling",()=>{
 for(const b of banks){
  const strict=configureCglPractice(b,"strict");
  const free=configureCglPractice(b,"free");
  const single=configureCglPractice(b,"single",3);
  for(const mode of [strict,free,single]){
   const max=scoreableMaximum(mode.paper,mode.answerKey,mode.questions);
   assert.equal(examPreflight(mode,{builtinCgl:true}).maximum,max);
   assert.equal(mode.paper.timing.kind,mode===strict?"sectional":"whole-paper");
   assert.ok(max<=mode.questions.length*2);
   assert.ok(max>=0);
  }
  assert.equal(strict.paper.timing.transition,"automatic");
  assert.equal(free.paper.timing.durationMs,3600000);
  assert.equal(single.questions.length,25);
  assert.equal(single.paper.timing.durationMs,900000);
  assert.equal(single.paper.navigation.sectionNavigation,"sequential-locked");
 }
});













test("F13/G10: delete lifecycle cannot bypass unfinished status; noncanonical backup versions are rejected",()=>{
 assert.throws(()=>assertDeletionAllowed({recordType:"generic-attempt",finishedAt:null},"completed"),/Discard/);
 assert.throws(()=>assertDeletionAllowed({recordType:"generic-attempt",finishedAt:1},"discard-unfinished"),/completed/);
 assert.doesNotThrow(()=>assertDeletionAllowed({recordType:"generic-attempt",finishedAt:1},"completed"));
 assert.throws(()=>verifyBackup({format:"practice-desk-backup",version:1,attempts:[]}),/Invalid backup/);
 // The checksum covers the backup's payload and is not a cosmetic metadata label.
 const saved=makeBackup([],{schema:1,dark:false,scale:100},new Date(0).toISOString());
 assert.equal(verifyBackup(saved).manifest.recordCount,0);
 const corrupt=structuredClone(saved);corrupt.exportedAt=new Date(5000).toISOString();
 assert.throws(()=>verifyBackup(corrupt),/integrity/i);
});
}

// === Consolidated coverage: tests/content-source-review-and-frozen-media.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const pkg = __suite_dep_3["pkg"];
const builtinCglPackages = __suite_dep_4["builtinCglPackages"];
const configureCglPractice = __suite_dep_4["configureCglPractice"];
const validateExamPackage = __suite_dep_4["validateExamPackage"];
const startGenericAttempt = __suite_dep_4["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const createSourceReviewReference = __suite_dep_9["createSourceReviewReference"];
const validateSourceReviewReference = __suite_dep_9["validateSourceReviewReference"];
const createSourceKeyReference = __suite_dep_23["createSourceKeyReference"];
const scoreableMaximum = __suite_dep_6["scoreableMaximum"];
const sectionScoreSummaries = __suite_dep_6["sectionScoreSummaries"];
const questionRevisionHash = __suite_dep_7["questionRevisionHash"];
const paperRevisionHash = __suite_dep_7["paperRevisionHash"];
const answerKeyRevisionHash = __suite_dep_7["answerKeyRevisionHash"];
const validateGenericStoredRecord = __suite_dep_8_stored_record_validator["validateGenericStoredRecord"];
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const solutions=JSON.parse(await readFile(new URL("../src/content/solutions.json",import.meta.url)));
const cgl=builtinCglPackages(sources,patches,solutions);
const byPaper=(id,edition)=>cgl.find(p=>p.paper.paperId===id&&p.paper.edition===edition);
const editedPaper=Object.keys(patches).find(id=>Object.keys(patches[id]).length>0);
assert.ok(editedPaper,"CGL patch bank unexpectedly empty");
const reviewed=byPaper(editedPaper,"reviewed"),original=byPaper(editedPaper,"source");
const qaMap=new Map(reviewed.questions.map(q=>[q.id,q]));

test("CGL original wording, options, source key and media are frozen at reviewed test start",()=>{
 const ref=createSourceReviewReference(reviewed,original);
 assert.ok(ref?.entries.length>0,"Corrected CGL content not identified");
 assert.equal(ref.schema,1);
 assert.equal(ref.paperId,reviewed.paper.paperId);
 const target=reviewed.questions.find(q=>q.id===ref.entries[0].targetQuestionRevisionId);
 assert.equal(ref.entries[0].sourceQuestion.questionId,target.questionId);
 const sourceKey=createSourceKeyReference(reviewed,original);
 assert.ok(sourceKey?.entries.length===100);
 const attempt={...startGenericAttempt(reviewed,"cgl-reviewed",1000),
   sourceKeyReference:sourceKey,sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(attempt),attempt);
 const duplicate=structuredClone(attempt);
 duplicate.sourceReviewReference.entries[0].sourceQuestion.content.prompt+=" TAMPER";
 assert.throws(()=>validateGenericStoredRecord(duplicate),/source-review hash mismatch/);
 const patchedKey=structuredClone(attempt);
 patchedKey.sourceReviewReference.entries[0].sourceAnswer.optionId="unknown";
 assert.throws(()=>validateGenericStoredRecord(patchedKey),/source-review hash mismatch/);
 // Source-review comparison metadata is additive current-session evidence; a
 // current attempt remains valid when no comparison reference was frozen.
 assert.equal(validateGenericStoredRecord(startGenericAttempt(reviewed,"no-comparison",1000)).id,"no-comparison");
});

test("edited single-section CGL preserves only its changed question subset and adjusted max",()=>{
 const r=configureCglPractice(reviewed,"single",2);
 const o=original;
 const ref=createSourceReviewReference(r,o);
 if(ref)assert.ok(ref.entries.every(e=>r.questions.some(q=>q.id===e.targetQuestionRevisionId)));
 const a=startGenericAttempt(r,"single",1000);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1100},
   new Map(r.questions.map(q=>[q.id,q])));
 const summary=sectionScoreSummaries(ended,ended.result);
 assert.equal(summary.length,1);
 assert.equal(summary[0].questions,25);
 assert.equal(summary[0].marks,ended.result.snapshot.earnedMarks);
 const eligible=r.questions.filter(q=>!["draft","invalid","under-review","superseded","incomplete-source"].includes(q.editorial.status)).length;
 assert.equal(scoreableMaximum(r.paper,r.answerKey,r.questions),eligible*2);
 assert.equal(summary[0].eligibleMax,eligible*2);
});

function edition(edition,revised=false){
 const questions=pkg.questions.map((q,i)=>{
   const initial=structuredClone(q);
   if(!revised||i!==0)return initial;
   const content={...initial.content,prompt:"Changed clinical triage prompt",
     options:initial.content.options.map((o,j)=>j===0?{...o,text:"Updated intervention"}:o)};
   const editorial={...initial.editorial,status:"corrected",notes:"Reviewed clinical evidence"};
   const update={...initial,id:initial.id+":reviewed",revision:2,content,editorial};
   return {...update,contentHash:questionRevisionHash(update)};
 });
 const ids=new Map(questions.map((q,i)=>[pkg.questions[i].id,q.id]));
 const entries=pkg.answerKey.entries.map(e=>({...e,questionRevisionId:ids.get(e.questionRevisionId)}));
 const answerKey={...pkg.answerKey,id:"key-"+edition,entries,contentHash:answerKeyRevisionHash({entries})};
 const sections=pkg.paper.sections.map(section=>({...section,
   questionRevisionIds:section.questionRevisionIds.map(id=>ids.get(id))}));
 const policy={...pkg.paper.scoring,byQuestionKind:{
   "numeric-entry":{correctMarks:5,incorrectMarks:-1,unansweredMarks:0},
   "multiple-select":{correctMarks:3,incorrectMarks:-1,unansweredMarks:0}}};
 const paperBase={...pkg.paper,id:"paper-"+edition,edition,answerKeyRevisionId:answerKey.id,
   ...(edition==="reviewed"?{
     sourcePaperRevisionId:"paper-source",
     sourceAnswerKeyRevisionId:"key-source"
   }:{}),
   sections,scoring:policy};
 const paper={...paperBase,contentHash:paperRevisionHash(paperBase)};
 return validateExamPackage({...pkg,title:"Generic exam "+edition,questions,answerKey,paper});
}

test("non-CGL exam source/review snapshots support six response types and arbitrary marking",()=>{
 const source=edition("source"),target=edition("reviewed",true);
 const ref=createSourceReviewReference(target,source);
 assert.ok(ref);
 assert.equal(ref.entries.length,1);
 assert.equal(ref.entries[0].sourceQuestion.content.prompt,"Choose one");
 const a={...startGenericAttempt(target,"generic-reviewed",1000),sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(a),a);
 // 2 single + 3 multi + 5 numeric + 2 true/false + 2 matching,
 // manually assessed free-response has no automatic mark maximum.
 assert.equal(scoreableMaximum(target.paper,target.answerKey,target.questions),14);
 const ended=transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:1100},
   new Map(target.questions.map(q=>[q.id,q])));
 const sections=sectionScoreSummaries(ended,ended.result);
 assert.equal(sections.length,2);
 assert.equal(sections[0].eligibleMax,10);
 assert.equal(sections[1].eligibleMax,4);
 assert.equal(sections[1].pending,0);
 assert.equal(validateGenericStoredRecord(ended),ended);
 assert.equal(createSourceReviewReference(source,target),null,"Source/review direction cannot be reversed");
});

test("source-review snapshots detect passage-only edits without forcing a new question kind",()=>{
 const source=edition("source"),reviewed=edition("reviewed");
 const withPassage=(base,text)=>{
   const questions=base.questions.map((q,i)=>{
     if(i!==0)return q;
     const changed={...q,content:{...q.content,stimulusId:"shared-passage"}};
     return {...changed,contentHash:questionRevisionHash(changed)};
   });
   return validateExamPackage({...base,questions,
     stimuli:[{id:"shared-passage",kind:"passage",text}]});
 };
 const original=withPassage(source,"Unedited clinical case text");
 const updated=withPassage(reviewed,"Revised clinical case text");
 assert.equal(original.questions[0].id,updated.questions[0].id,
   "Passage-only edits should not need to re-key the question");
 const ref=createSourceReviewReference(updated,original);
 assert.equal(ref.entries.length,1);
 assert.equal(ref.stimuli[0].text,"Unedited clinical case text");
 const attempt={...startGenericAttempt(updated,"passage",1000),sourceReviewReference:ref};
 assert.equal(validateGenericStoredRecord(attempt),attempt);
});

test("corrected published keys are compared by semantic source option ID, not display index",()=>{
 let corrected=null;
 for(const target of cgl.filter(x=>x.paper.edition==="reviewed")){
   const source=byPaper(target.paper.paperId,"source");
   const ref=createSourceReviewReference(target,source);
   const reviewKeys=new Map(target.answerKey.entries.map(x=>[x.questionRevisionId,x.answer]));
   corrected=ref?.entries.find(entry=>{
     const current=reviewKeys.get(entry.targetQuestionRevisionId);
     return current?.kind==="single-choice"&&
       entry.sourceAnswer.kind==="single-choice"&&
       entry.sourceAnswer.optionId!==current.optionId;
   });
   if(corrected)break;
 }
 assert.ok(corrected,"CGL revised source-answer keys not represented in frozen comparison");
 assert.equal(corrected.sourceQuestion.content.kind,"single-choice");
 const options=new Set(corrected.sourceQuestion.content.options.map(x=>x.id));
 assert.ok(options.has(corrected.sourceAnswer.optionId));
});
test("time expiration and voluntary finishing have separate durable source-independent reasons",()=>{
 const bundle=edition("reviewed",true),map=new Map(bundle.questions.map(q=>[q.id,q]));
 const started=startGenericAttempt(bundle,"timed",1000);
 const expired=transitionGenericAttempt(started,
   {type:"TICK",nowMs:1000+bundle.paper.timing.durationMs},map);
 assert.equal(expired.completionReason,"time-expired");
 assert.equal(validateGenericStoredRecord(expired),expired);
 const submitted=transitionGenericAttempt(started,{type:"SUBMIT_ATTEMPT",nowMs:1100},map);
 assert.equal(submitted.completionReason,"submitted");
 assert.equal(validateGenericStoredRecord(submitted),submitted);
 const missing=structuredClone(submitted);
 delete missing.completionReason;
 assert.throws(()=>validateGenericStoredRecord(missing),/completion provenance/);
 const forgedExpiry=structuredClone(submitted);
 forgedExpiry.completionReason="time-expired";
 assert.throws(()=>validateGenericStoredRecord(forgedExpiry),/does not match recorded timer evidence/);
 const unfinished=structuredClone(started);
 unfinished.completionReason="submitted";
 assert.throws(()=>validateGenericStoredRecord(unfinished),/Unfinished attempt cannot contain completion provenance/);
});
}

// === Consolidated coverage: tests/content-validation-and-build.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const readFile = __suite_dep_2["readFile"];
const validateContent = __suite_dep_24["validateContent"];
const Script = __suite_dep_25["Script"];
const load = async name => JSON.parse(
  await readFile(new URL('../src/content/' + name + '.json', import.meta.url), 'utf8')
);
const loadContent = async () => ({
  papers: await load('papers'),
  patches: await load('patches'),
  solutions: await load('solutions'),
});
const countEntries = bank => Object.values(bank).reduce(
  (total, pack) => total + Object.keys(pack).length, 0
);

test('current library satisfies schema and all cross-bank references', async () => {
  const data = await loadContent();
  const summary = validateContent(data);
  assert.equal(summary.sourcePapers, Object.keys(data.papers).length);
  assert.equal(summary.questions, Object.values(data.papers).reduce((n, paper) => n + paper.questions.length, 0));
  assert.equal(summary.patches, countEntries(data.patches));
  assert.equal(summary.solutions, countEntries(data.solutions));
  assert.ok(summary.sourcePapers > 0);
  assert.ok(summary.questions > 0);
});

test('validator rejects duplicate question numbers and invalid answer keys', async () => {
  const duplicate = await loadContent();
  const paperId = Object.keys(duplicate.papers)[0];
  const questions = duplicate.papers[paperId].questions;
  questions[1].n = questions[0].n;
  assert.throws(() => validateContent(duplicate), /duplicate question number/);

  const badKey = await loadContent();
  const firstPaperId = Object.keys(badKey.papers)[0];
  badKey.papers[firstPaperId].questions[0].key = 'e';
  assert.throws(() => validateContent(badKey), /expected one of a, b, c or d/);
});

test('validator rejects orphaned patches, missing stimuli and unknown fields', async () => {
  const orphanPatch = await loadContent();
  const paperId = Object.keys(orphanPatch.papers)[0];
  orphanPatch.patches[paperId]['999'] = { key: 'a' };
  assert.throws(() => validateContent(orphanPatch), /references a question that does not exist/);

  const missingPassage = await loadContent();
  const firstPaperId = Object.keys(missingPassage.papers)[0];
  const passageQuestion = missingPassage.papers[firstPaperId].questions.find(q => q.passageRef);
  assert.ok(passageQuestion);
  passageQuestion.passageRef = 'missing-passage';
  assert.throws(() => validateContent(missingPassage), /references missing passage/);

  const unknownField = await loadContent();
  const patchPaperId = Object.keys(unknownField.papers)[0];
  unknownField.patches[patchPaperId]['1'] = { unexpected: true };
  assert.throws(() => validateContent(unknownField), /unknown field/);
});


// Standalone offline-artifact validation; retained from build.test.mjs.
test('single-file release contains a complete inline app',async()=>{
 const html=await readFile(new URL('../Practice_Desk_Offline_Mock_Tests.html',import.meta.url),'utf8');
 assert.match(html,/^<!doctype html>/i);
 assert.equal((html.match(/<style>/g)||[]).length,1);
 assert.equal((html.match(/type="application\/json"/g)||[]).length,3);
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.doesNotMatch(html,/<!-- PD:[A-Z_]+ -->/);
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+rel=["']stylesheet/i);
 const code=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
 assert.ok(code);assert.doesNotThrow(()=>new Script(code));
});
}

// === Consolidated coverage: tests/integrity-hash-and-media.test.mjs — retained assertions ===
{
const test = __suite_dep_0["default"];
const assert = __suite_dep_1["default"];
const pkg = __suite_dep_3["pkg"];
const sha256 = __suite_dep_26["sha256"];
const questionRevisionHash = __suite_dep_7["questionRevisionHash"];
const answerKeyRevisionHash = __suite_dep_7["answerKeyRevisionHash"];
const paperRevisionHash = __suite_dep_7["paperRevisionHash"];
const validateExamPackage = __suite_dep_4["validateExamPackage"];
const startGenericAttempt = __suite_dep_4["startGenericAttempt"];
const transitionGenericAttempt = __generic_attempt["transitionGenericAttempt"];
const validateGenericStoredRecord = __suite_dep_8_stored_record_validator["validateGenericStoredRecord"];
const addLearningCard = __suite_dep_27["addLearningCard"];
const validateLearningCard = __suite_dep_27["validateLearningCard"];
const readDisplayPreferences = __suite_dep_28["readDisplayPreferences"];
const writeDisplayPreferences = __suite_dep_28["writeDisplayPreferences"];
const clone=structuredClone;
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WsSlz8AAAAASUVORK5CYII=";
const decoded=Uint8Array.from(atob(image.slice(image.indexOf(",")+1)),c=>c.charCodeAt(0));
const asset={id:"figure",mediaType:"image/png",dataUri:image,contentHash:sha256(decoded),altText:"A diagram"};
const baseQuestion=pkg.questions[0];
const withVisual=(()=>{
 const q={...baseQuestion,content:{...baseQuestion.content,assetIds:["figure"],stimulusId:"shared"}};
 return {...q,contentHash:questionRevisionHash(q)};
})();
const visualBundle={...pkg,questions:[withVisual,...pkg.questions.slice(1)],
 stimuli:[{id:"shared",kind:"passage",text:"Examine the diagram.",assetIds:["figure"]}],
 assets:[asset]};
test("canonical hashes prevent unreviewed edits to question, answer key or paper",()=>{
 assert.equal(validateExamPackage(pkg),pkg);
 const q=clone(pkg);
 q.questions[0].content.prompt="Edited without a new revision";
 assert.throws(()=>validateExamPackage(q),/Question revision content hash mismatch/);
 const key=clone(pkg);key.answerKey.entries[0].answer.optionId="b";
 assert.throws(()=>validateExamPackage(key),/Answer-key revision content hash mismatch/);
 const paper=clone(pkg);paper.paper.scoring.defaultRule.correctMarks=12;
 assert.throws(()=>validateExamPackage(paper),/Paper revision content hash mismatch/);
 assert.equal(answerKeyRevisionHash(pkg.answerKey),pkg.answerKey.contentHash);
 assert.equal(paperRevisionHash(pkg.paper),pkg.paper.contentHash);
});
test("stimuli and assets reject unsupported fields, missing images, bad media and malformed tables",()=>{
 assert.equal(validateExamPackage(visualBundle),visualBundle);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"passage",text:"Passage",assetIds:["missing"]}]}),/missing stimulus image/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"table",columns:["X","Y"],rows:[["only one"]]}]}),/row width mismatch/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"image",assetId:"missing",altText:"Figure"}]}),/missing stimulus image/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"passage",text:"OK",script:"alert(1)"}]}),/unsupported field/);
 assert.throws(()=>validateExamPackage({...visualBundle,assets:[{...asset,contentHash:"0".repeat(64)}]}),/digest mismatch/);
 assert.throws(()=>validateExamPackage({...visualBundle,assets:[{...asset,dataUri:"data:image/png;base64,not real"}]}),/invalid base64/);
});
test("frozen attempt and learning notebook retain media after original package is unavailable",()=>{
 const bundle=validateExamPackage(visualBundle);
 const started=startGenericAttempt(bundle,"historical-visual",1000);
 const question=started.frozen.questions[0];
 assert.deepEqual(started.frozen.stimuli.map(s=>s.id),["shared"]);
 assert.deepEqual(started.frozen.assets.map(a=>a.id),["figure"]);
 assert.equal(started.frozen.assets[0].contentHash,asset.contentHash);
 const completed=transitionGenericAttempt(started,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
 const card=addLearningCard(completed,question.id,new Date(3000).toISOString());
 const archived=JSON.parse(JSON.stringify(card));
 assert.equal(validateLearningCard(archived).assets[0].dataUri,image);
 const saved=JSON.parse(JSON.stringify(completed));
 assert.equal(validateGenericStoredRecord(saved).frozen.assets[0].dataUri,image);
 assert.throws(()=>validateLearningCard({...archived,question:{...question,content:{...question.content,prompt:"Modified"}}}),/hash mismatch/);
});
test("stored result rejects tampered item verdict even with untouched totals",()=>{
 const bundle=validateExamPackage(pkg);
 const initial=startGenericAttempt(bundle,"completed",1000);
 const done=transitionGenericAttempt(initial,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
 assert.equal(validateGenericStoredRecord(done),done);
 const changed={...done,result:{...done.result,items:[{...done.result.items[0],verdict:"correct"},...done.result.items.slice(1)]}};
 assert.throws(()=>validateGenericStoredRecord(changed),/item verdict/);
 const changedMarks={...done,result:{...done.result,items:[{...done.result.items[0],marks:999},...done.result.items.slice(1)]}};
 assert.throws(()=>validateGenericStoredRecord(changedMarks),/item verdict/);
});
test("display preferences are validated and round-trip through storage",()=>{
 const values=new Map();
 const store={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);}};
 assert.deepEqual(readDisplayPreferences(store),{schema:1,dark:false,scale:100});
 const p=writeDisplayPreferences({schema:1,dark:true,scale:120},store);
 assert.deepEqual(readDisplayPreferences(store),p);
 values.set("practiceDesk.preferences",'{"schema":1,"dark":false,"scale":500}');
 assert.deepEqual(readDisplayPreferences(store),{schema:1,dark:false,scale:100});
});
}
