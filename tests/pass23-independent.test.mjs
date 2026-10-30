/** Pass 23 independent boundary audit, not reused Pass 17–22 fixtures/results.
 * Cross-check immutable v11 banks and reconcile adversarial generic contracts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateAnswerKeyRevision,validatePaperRevision} from "../src/domain/validate.ts";
import {paperRevisionHash,answerKeyRevisionHash} from "../src/domain/integrity.ts";
import {scoreableMaximum,scoreableLowerBound} from "../src/engine/score-ceiling.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import {startSession,transition,sectionTimerDuration} from "../src/engine/session.ts";
import {resultTabsHTML} from "../src/app/result-presentation.ts";
import {examPreflight} from "../src/app/exam-preflight.ts";
import {editorialStatusLabel} from "../src/app/editorial-labels.ts";
import {duplicateMatchingTargets,multipleDraftMessage} from "../src/app/response-drafts.ts";
import {assertDeletionAllowed} from "../src/history/deletion-policy.ts";
import {makeBackup,verifyBackup,planBackupMerge} from "../src/history/backup.ts";

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

test("SOURCE A/V01/V05/V19: original three content banks byte-identical with frozen baseline v11",async()=>{
 for(const name of ["papers","patches","solutions"]){
  const filename="src/content/"+name+".json";
  const current=await readFile(new URL("../"+filename,import.meta.url));
  const baseline=execFileSync("git",["show","origin/baseline/v11:"+filename],
   {cwd:root,maxBuffer:18*1024*1024});
  assert.ok(current.equals(baseline),name+" was silently changed from frozen v11");
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

test("V05/V07/F08/Q62: same published B remains reviewed scoreable caution, original excluded",()=>{
 const id="cgl-2026-10-06";
 const source=banks.find(x=>x.paper.paperId===id&&x.paper.edition==="source");
 const reviewed=banks.find(x=>x.paper.paperId===id&&x.paper.edition==="reviewed");
 assert.ok(source&&reviewed);
 const orig=source.questions.find(q=>q.questionId.endsWith(":62"));
 const fix=reviewed.questions.find(q=>q.questionId.endsWith(":62"));
 assert.ok(orig&&fix);
 assert.equal(orig.editorial.status,"invalid");
 assert.equal(fix.editorial.status,"caution");
 assert.match(editorialStatusLabel(fix.editorial),/not certified/);
 const oi=source.answerKey.entries.find(x=>x.questionRevisionId===orig.id);
 const ri=reviewed.answerKey.entries.find(x=>x.questionRevisionId===fix.id);
 const so=orig.content.options[1].id,sr=fix.content.options[1].id;
 assert.equal(oi.answer.optionId,so);
 assert.equal(ri.answer.optionId,sr);
 const candidate={questionRevisionId:fix.id,response:{kind:"single-choice",optionId:sr},flagged:false,timeSpentMs:0,answerChangeCount:0};
 const scored=scoreAttempt(reviewed.paper,reviewed.answerKey,reviewed.questions,[candidate],new Date(0).toISOString());
 const item=scored.items.find(x=>x.questionRevisionId===fix.id);
 assert.equal(item.verdict,"correct");assert.equal(item.marks,2);
 const originalScored=scoreAttempt(source.paper,source.answerKey,source.questions,
 [{...candidate,questionRevisionId:orig.id,response:{kind:"single-choice",optionId:so}}],new Date(0).toISOString());
 const originalItem=originalScored.items.find(x=>x.questionRevisionId===orig.id);
 assert.equal(originalItem.verdict,"excluded");assert.equal(originalItem.marks,0);
});

test("G01/G02/F01/F09: locked shared paper, manual expiry and frozen truthful section timers",()=>{
 const locked=rehash({...pkg.paper,navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
 validatePaperRevision(locked,questions,pkg.answerKey);
 let s=startSession(locked,1000);
 s=advance(locked,s,"SUBMIT_ATTEMPT",1005);
 assert.equal(s.status,"running");
 s=advance(locked,s,"SUBMIT_SECTION",2000);
 assert.equal(s.sectionIndex,1);
 assert.equal(sectionTimerDuration(s,0),1000);
 s=advance(locked,s,"SUBMIT_ATTEMPT",2500);
 assert.equal(s.status,"completed");
 assert.equal(sectionTimerDuration(s,1),1500);
 const manual=rehash({...pkg.paper,
   timing:{kind:"sectional",transition:"manual",allowEarlySubmit:false,pausePolicy:"allowed",
    sectionLimits:[{sectionId:"s1",durationMs:75},{sectionId:"s2",durationMs:100}]},
   navigation:{...pkg.paper.navigation,sectionNavigation:"sequential-locked"}});
 validatePaperRevision(manual,questions,pkg.answerKey);
 s=startSession(manual,0);
 s=advance(manual,s,"TICK",500);
 assert.equal(s.status,"section-expired");assert.equal(s.elapsedMs,75);
 const frozen=s.responses;
 s=advance(manual,s,"ANSWER",900,{response:{kind:"single-choice",optionId:"a"}});
 assert.equal(s.status,"section-expired");assert.deepEqual(s.responses,frozen);
 s=advance(manual,s,"SUBMIT_SECTION",1000);
 assert.equal(s.sectionIndex,1);assert.equal(s.elapsedMs,75);
 assert.equal(sectionTimerDuration(s,0),75);
});

test("G03/G09: imported marks have honest ceiling/floor and forbid worse-than-wrong blanks",()=>{
 for(const blank of [-2,3]){
  assert.throws(()=>validatePaperRevision({...pkg.paper,scoring:{defaultRule:{correctMarks:2,incorrectMarks:-1,unansweredMarks:blank}}},questions,pkg.answerKey),
   /unansweredMarks/);
 }
 const valid={correctMarks:3,incorrectMarks:-2,unansweredMarks:-0.25};
 validatePaperRevision({...pkg.paper,scoring:{defaultRule:valid}},questions,pkg.answerKey);
 const p=rehash({...pkg.paper,scoring:{defaultRule:valid}});
 validatePaperRevision(p,questions,pkg.answerKey);
 const ceiling=scoreableMaximum(p,pkg.answerKey,questions);
 const floor=scoreableLowerBound(p,pkg.answerKey,questions);
 assert.equal(ceiling,15);assert.ok(floor<0);assert.ok(ceiling>=floor);
 const score=scoreAttempt(p,pkg.answerKey,questions,[],new Date(0).toISOString());
 assert.ok(score.snapshot.earnedMarks<=ceiling&&score.snapshot.earnedMarks>=floor);
});

test("G04/G05: reject answer keys candidates cannot legally reproduce",()=>{
 const wrongCard=keyUpdate(pkg.answerKey.entries.map((row,i)=>i===1?
  {...row,answer:{kind:"multiple-select",optionIds:["x"]}}:row));
 assert.throws(()=>validateAnswerKeyRevision(wrongCard,questions),/cardinality|selection bounds/);
 const dup=keyUpdate(pkg.answerKey.entries.map((row,i)=>i===4?
  {...row,answer:{kind:"matching",pairs:[{leftId:"l1",rightId:"r1"},{leftId:"l2",rightId:"r1"}]}}:row));
 assert.throws(()=>validateAnswerKeyRevision(dup,questions),/duplicate/);
 assert.doesNotThrow(()=>validateExamPackage(pkg));
});

test("G06/V06/V10: no-review edition keeps results but never exposes answer tab",()=>{
 const p=rehash({...pkg.paper,navigation:{...pkg.paper.navigation,allowReview:false}});
 const bundle=validateExamPackage({...pkg,paper:p});
 const a=startGenericAttempt(bundle,"no-review",100);
 assert.equal(a.frozen.paper.navigation.allowReview,false);
 assert.doesNotMatch(resultTabsHTML("overview",false),/data-result-tab="review"/);
 assert.match(resultTabsHTML("overview",false),/data-result-tab="timing"/);
});

test("G07/G08: drafts explicitly nonpersistent, duplicate matching targets deterministic",()=>{
 assert.match(multipleDraftMessage(1,2,2),/Unsaved draft/);
 assert.match(multipleDraftMessage(3,2,2),/Unsaved draft/);
 assert.equal(multipleDraftMessage(2,2,2),"");
 assert.deepEqual(duplicateMatchingTargets(["r1","r2","r1","","r2"]),["r1","r2"]);
});

test("F13/G10: delete lifecycle cannot bypass unfinished status; v11 backup intentionally unsupported",()=>{
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
