import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {builtinCglPackages,configureCglPractice,startGenericAttempt} from "../src/app/exam-package.ts";
import {renderModelExam,readablePracticeMode} from "../src/app/generic-ui.ts";
import {editorialStatusLabel} from "../src/app/editorial-labels.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
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
 for(const [configured,mode,scope,aria] of [
  [configureCglPractice(p,"free"),"Full paper · flexible navigation","Whole-paper timer","Whole-paper time used"],
  [configureCglPractice(p,"strict"),"Exam simulation","Section timer","Section time used"],
  [configureCglPractice(p,"single",1),"Single-section practice","Whole-paper timer","Whole-paper time used"]]){
  const a=startGenericAttempt(configured,mode,0),html=renderModelExam(a,configured);
  assert.ok(html.includes("EXAM IN PROGRESS · "+mode));
  assert.ok(html.includes(scope+" · "),scope+" missing");
  assert.ok(html.includes('aria-label="'+aria+'"'),aria+" missing");
  assert.ok(!html.includes("Key corrected"),"Pre-submit editorial key leaked");
 }
 const source=startGenericAttempt(p,"custom",0);
 const untimed={...source,frozen:{...source.frozen,paper:{
  ...source.frozen.paper,timing:{kind:"untimed"}}}};
 const html=renderModelExam(untimed,p);
 assert.ok(html.includes("Question coverage · "));
 assert.ok(html.includes('aria-label="Questions answered"'));
 assert.ok(!html.includes("Section timer · "));
 assert.equal(readablePracticeMode("custom-practice"),"Custom practice");
 assert.equal(readablePracticeMode("author-defined-mode"),"author defined mode");
});
