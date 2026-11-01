import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,validateExamPackage} from "../src/app/exam-package.ts";
import {examPreflight,preflightHTML,examRulesHTML} from "../src/app/exam-preflight.ts";
import {scoreableMaximum} from "../src/engine/score-ceiling.ts";
import {paperRevisionHash,answerKeyRevisionHash} from "../src/domain/integrity.ts";

const source=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const cgl=builtinCglPackages(source,patches);
const reviewed=cgl.find(p=>p.paper.edition==="reviewed");
const original=cgl.find(p=>p.paper.edition==="source");
assert.ok(reviewed&&original);
const model=(bundle,builtinCgl=false)=>examPreflight(bundle,{builtinCgl,
 reviewedPatchCount:Object.keys(patches[bundle.paper.paperId]??{}).length});

test("F02: reviewed CGL strict, free, single are calculated on their actual executable policy",()=>{
 const strict=configureCglPractice(reviewed,"strict");
 const free=configureCglPractice(reviewed,"free");
 const single=configureCglPractice(reviewed,"single",2);
 for(const p of [strict,free,single]){
  const x=model(p,true);
  assert.equal(x.maximum,scoreableMaximum(p.paper,p.answerKey,p.questions));
  assert.equal(x.eligibleQuestions+x.excludedQuestions+x.manualQuestions,x.totalQuestions);
  assert.equal(x.ruleSummary,"Correct +2 · Incorrect -0.5 · Unanswered 0");
  assert.equal(x.eligibleQuestions*2,x.maximum);
  assert.equal(x.decimals,2);
 }
 assert.equal(model(strict,true).maximum,200);
 assert.equal(model(free,true).maximum,200);
 assert.equal(model(single,true).maximum,50);
 assert.equal(model(single,true).totalQuestions,25);
 assert.equal(strict.paper.timing.kind,"sectional");
 assert.equal(strict.paper.timing.transition,"automatic");
 assert.match(model(strict,true).timingRules.join(" "),/15 min/);
 assert.match(model(strict,true).timingRules.join(" "),/Unused minutes do not carry/);
 assert.match(model(free,true).timingRules.join(" "),/One shared 60 min paper timer/);
 assert.doesNotMatch(model(free,true).timingRules.join(" "),/Unused minutes do not carry/);
 assert.match(model(free,true).timingRules.join(" "),/Pause control is available/);
 assert.match(model(strict,true).timingRules.join(" "),/Pausing the timer is not permitted/);
});

test("F02/F15: source edition reports excluded publisher items; reviewed is scoreable caution, not official SSC",()=>{
 const x=model(original,true),y=model(reviewed,true);
 assert.ok(x.excludedQuestions>0,"Source edition should count genuine unscoreable original defects");
 assert.equal(x.maximum,scoreableMaximum(original.paper,original.answerKey,original.questions));
 assert.ok(x.maximum<200);
 assert.equal(y.excludedQuestions,0);
 assert.ok(y.correctedQuestions>0,"Reviewed paper contains independently corrected items");
 const disputed=cgl.find(p=>p.paper.edition==="reviewed"&&p.paper.paperId==="cgl-2026-10-06");
 assert.ok(disputed);
 assert.ok(model(disputed,true).cautionQuestions>0,
   "Disputed reviewed 6 October questions retain editorial caution rather than being silently excluded");
 assert.equal(y.cautionQuestions,reviewed.questions.filter(q=>q.editorial.status==="caution").length);
 assert.equal(y.patchCount,Object.keys(patches[reviewed.paper.paperId]??{}).length);
 assert.ok(y.patchCount>0);
 assert.match(x.provenance,/publisher-provided/);
 assert.match(x.provenance,/not an SSC-operated/);
 assert.match(y.provenance,/independent educational corrections/);
 assert.match(y.provenance,/not official SSC answer keys/);
 assert.doesNotMatch(preflightHTML(y),/correct option is|answer is A|Q62.+B/i);
 assert.match(preflightHTML(x),/excluded/);
 assert.match(preflightHTML(y),/reviewed changes/);
});

test("F02: a custom exam uses frozen eligible max and plainly labels manual questions",()=>{
 const b=validateExamPackage(pkg),x=model(b);
 assert.equal(x.maximum,10);
 assert.equal(x.totalQuestions,6);
 assert.equal(x.eligibleQuestions,5);
 assert.equal(x.manualQuestions,1);
 assert.equal(x.excludedQuestions,0);
 assert.equal(x.patchCount,null);
 assert.equal(x.builtinCgl,false);
 assert.match(x.provenance,/author\/importer/);
 assert.doesNotMatch(x.provenance,/SSC/);
 const html=preflightHTML(x);
 assert.match(html,/10.00/);
 assert.match(html,/1 manual-response/);
 assert.match(html,/Marking/);
 assert.doesNotMatch(html,/rev-0|optionId|question-0/);
});

test("F02: effective per-item and per-section overrides are disclosed without key answers",()=>{
 const b=structuredClone(pkg);
 b.paper.sections[0].scoringOverride={correctMarks:3,incorrectMarks:-1,unansweredMarks:0};
 b.answerKey.entries[0].scoringOverride={correctMarks:5,incorrectMarks:-2,unansweredMarks:0};
 b.paper.scoring.byQuestionKind={"true-false":{correctMarks:1,incorrectMarks:0,unansweredMarks:0}};
 // Preflight operates on the exact selected rule+key; testing direct data does
 // not mutate the immutable source fixture or its published content hashes.
 const x=model(b);
 assert.equal(x.maximum,5+3+3+1+2);
 assert.equal(x.hasVariableRules,true);
 assert.match(x.ruleSummary,/Marking varies by question/);
 assert.match(x.ruleSummary,/\+1 to \+5/);
 assert.match(x.ruleSummary,/-2 to 0/);
 assert.doesNotMatch(preflightHTML(x),/Alpha|Beta|optionId/);
});

test("F02: a paper with only manually graded and excluded items never invents an automated maximum",()=>{
 const b=structuredClone(pkg);
 for(let i=0;i<5;i++)b.questions[i].editorial.status="invalid";
 const x=model(b);
 assert.equal(x.maximum,0);
 assert.equal(x.eligibleQuestions,0);
 assert.equal(x.excludedQuestions,5);
 assert.equal(x.manualQuestions,1);
 assert.match(x.ruleSummary,/No automatically scoreable questions/);
 assert.match(preflightHTML(x),/0.00/);
});

test("F06: generic timing/section, forward navigation, review and pause policies are explained",()=>{
 const b=structuredClone(pkg);
 b.paper.navigation={questionNavigation:"forward-only",sectionNavigation:"sequential-locked",
  allowFlagging:false,allowReview:false};
 b.paper.timing={kind:"sectional",transition:"manual",allowEarlySubmit:false,
  pausePolicy:"allowed",sectionLimits:[{sectionId:"s1",durationMs:60000},{sectionId:"s2",durationMs:null}]};
 const x=model(b),text=examRulesHTML(x);
 assert.match(text,/Independent section timers/);
 assert.match(text,/until you select Continue/);
 assert.match(text,/waiting does not consume/);
 assert.match(text,/cannot be submitted before/);
 assert.match(text,/forward-only/);
 assert.match(text,/flagging is disabled/);
 assert.match(text,/detailed answer-key\/solution review is withheld/);
 assert.match(text,/Checksum|checksum/);
 assert.match(text,/A–D/);
 assert.match(text,/Enter and Space/);
 assert.doesNotMatch(text,/15-minute sections/);
 const untimed=structuredClone(pkg);untimed.paper.timing={kind:"untimed"};
 assert.match(examRulesHTML(model(untimed)),/Untimed practice/);
 assert.doesNotMatch(examRulesHTML(model(untimed)),/Pausing the timer is not permitted/);
});

test("F15: independently imported editions cannot inherit built-in SSC provenance",()=>{
 const sourceBundle=structuredClone(pkg);
 sourceBundle.paper.edition="source";
 const reviewedBundle=structuredClone(pkg);
 reviewedBundle.paper.edition="reviewed";
 for(const b of [sourceBundle,reviewedBundle]){
  const x=model(b);
  assert.equal(x.builtinCgl,false);
  assert.equal(x.patchCount,null);
  assert.match(x.provenance,/supplied/);
  assert.doesNotMatch(x.provenance,/SSC/);
  assert.doesNotMatch(x.provenance,/independent educational corrections/);
 }
});
