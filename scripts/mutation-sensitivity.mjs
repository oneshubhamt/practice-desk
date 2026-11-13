/** P61-G: isolated mutation-sensitivity witnesses for crucial domain contracts.
 * Never edits the working tree. Only a temporary copy holds mutated sources.
 * Each targeted test must PASS unchanged, then FAIL as a named assertion.
 * Ten chosen mutants do not establish a global mutation score.
 */
import {cp,mkdtemp,readFile,rm,symlink,writeFile} from "node:fs/promises";
import {spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const mutants=[
 {
  id:"scoring-unanswered-confused-with-wrong",
  path:"src/engine/scoring.ts",
  find:'marks = rule.unansweredMarks;',
  replace:'marks = rule.incorrectMarks;',
  testFile:"tests/exam-scoring-and-policy.test.mjs",
  testName:"seeded independent scoring reference: precedence, marks ledger, verdicts, exclusions and bounds"
 },
 {
  id:"stored-recovery-equal-version-not-protected",
  path:"src/history/frozen.ts",
  find:'stored.saveRevision >= mirror.saveRevision',
  replace:'stored.saveRevision > mirror.saveRevision',
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"Recovery reference: 576 persisted/mirror precedence combinations, missing IDs, terminal and revision boundaries"
 },
 {
  id:"CAS-next-write-skips-one-revision",
  path:"src/history/concurrency.ts",
  find:'return expected+1;',
  replace:'return expected+2;',
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"seeded two-tab compare-and-swap interleavings reject stale writes, preserve stored revision"
 },
 {
  id:"publisher-unilaterally-inflates-correct-marks",
  path:"src/authoring/authoring-publisher.ts",
  find:'scoring:{defaultRule:{correctMarks:d.marksCorrect,incorrectMarks:d.marksIncorrect,',
  replace:'scoring:{defaultRule:{correctMarks:d.marksCorrect+0.5,incorrectMarks:d.marksIncorrect,',
  testFile:"tests/authoring-domain.test.mjs",
  testName:"P47-5D all six kinds publish as source-validated frozen rich package, with correct hashes"
 },
 {
  id:"rich-source-silently-trims-candidate-text",
  path:"src/domain/rich-document.ts",
  find:'blocks:[{type:"paragraph",content:[{type:"text",text}]}]});',
  replace:'blocks:[{type:"paragraph",content:[{type:"text",text:text.trim()}]}]});',
  testFile:"tests/authoring-domain.test.mjs",
  testName:"Authoring property: literal Unicode/math/HTML-like strings survive rich validation unchanged"
 },
 {
  id:"learning-incorrect-evidence-threshold",
  path:"src/learning/attempt-evidence.ts",
  find:'r.answered<10?"insufficient":',
  replace:'r.answered<100?"insufficient":',
  testFile:"tests/learning-and-analytics.test.mjs",
  testName:"seeded evidence classifications require independent sample size and question diversity"
 },
 {
  id:"six-kind-multi-select-matches-on-overlap-instead-of-exact-set",
  path:"src/engine/scoring.ts",
  find:'a.optionIds.every(id => b.optionIds.includes(id))',
  replace:'a.optionIds.some(id => b.optionIds.includes(id))',
  testFile:"tests/exam-scoring-and-policy.test.mjs",
  testName:"P61-H six-kind independent ledger survives answer-ID bijections and input permutations"
 },
 {
  id:"backup-sha256-payload-integrity-skipped",
  path:"src/history/backup.ts",
  find:'manifest.digest!==digest(core as Core))',
  replace:'false)',
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"canonical backup checksum covers records and preferences; size, IDs and timestamp are bounded"
 },
 {
  id:"pdf-eof-signature-check-skipped",
  path:"scripts/pdf-ingest.mjs",
  find:'!bytes.subarray(-2048).toString("ascii").includes("%%EOF")',
  replace:'false',
  testFile:"tests/p60e-pdf-ingest.test.mjs",
  testName:"P60-E CLI template is explicitly incomplete and does not reveal keys, audit uses byte-bound source, safe on corrupt PDFs"
 },
 {
  id:"fsrs-ratings-silently-rewritten",
  path:"src/learning/learning.ts",
  find:'reviews:[...item.reviews,{rating,at,duration:measured,state}],updatedAt:at}',
  replace:'reviews:[...item.reviews,{rating:1,at,duration:measured,state}],updatedAt:at}',
  testFile:"tests/learning-and-analytics.test.mjs",
  testName:"stable ts-fsrs 6.0.0 runs explicit FSRS-7 with evidence-rich replay, previews and retrievability"
 }
];
const sandbox=await mkdtemp(join(tmpdir(),"practice-desk-mutant-"));
const sha=buffer=>createHash("sha256").update(buffer).digest("hex");
const reEscape=text=>Array.from(text).map(ch=>".*+?^$()|[]{}\\".includes(ch)?"\\"+ch:ch).join("");
const summary=[];
function runNamed(test){
 const cmd=[ "--test","--test-reporter=tap",
  "--test-name-pattern=^"+reEscape(test.testName)+"$",
  test.testFile];
 const result=spawnSync(process.execPath,cmd,{
  cwd:sandbox,encoding:"utf8",timeout:120000,maxBuffer:3*1024*1024,
  env:{...process.env,PRACTICE_DESK_VISUAL_REVIEW:"0"}
 });
 return {...result,tap:(result.stdout??"")+"\n"+(result.stderr??"")};
}
function assertBaseline(test,run){
 if(run.error||run.signal||run.status!==0||
    !/^# pass 1\s*$/m.test(run.tap)||!/^# fail 0\s*$/m.test(run.tap)){
   throw Error("Baseline unavailable for "+test.id+" ("+String(run.status)+")\n"+run.tap.slice(-4500));
 }
}
function assertKilled(test,run){
 const namedFailure=new RegExp("^not ok [0-9]+ - "+reEscape(test.testName)+"\\s*$","m");
 if(run.error||run.signal||run.status===0||
   !namedFailure.test(run.tap)||!/^# fail 1\s*$/m.test(run.tap)||
   !/(?:ERR_ASSERTION|AssertionError)/.test(run.tap)){
  throw Error("Mutant escaped or failed for unrelated infrastructure: "+test.id+
   " ("+String(run.status)+")\n"+run.tap.slice(-5500));
 }
}
try{
 for(const dir of ["src","tests","scripts","examples","tools"])
  await cp(join(root,dir),join(sandbox,dir),{recursive:true});
 await cp(join(root,"package.json"),join(sandbox,"package.json"));
 await symlink(join(root,"node_modules"),join(sandbox,"node_modules"),"dir");
 for(const test of mutants){
  const target=join(sandbox,test.path);
  const bytes=await readFile(target);
  const original=bytes.toString("utf8");
  if(original.split(test.find).length!==2)
   throw Error("Unsafe/nonunique mutant anchor for "+test.id);
  const baseline=runNamed(test);
  assertBaseline(test,baseline);
  try{
   await writeFile(target,original.replace(test.find,test.replace),"utf8");
   const mutated=runNamed(test);
   assertKilled(test,mutated);
  }finally{
   await writeFile(target,bytes);
   if(sha(await readFile(target))!==sha(bytes))
    throw Error("Mutation sandbox restore failed for "+test.path);
  }
  summary.push({id:test.id,domain:test.path,test:test.testName,
   baseline:"pass",mutated:"assertion-failed",sourceRestored:true});
  console.log("MUTATION KILLED "+test.id);
 }
 if(summary.length!==mutants.length)throw Error("Mutation suite incomplete");
 console.log("MUTATION SENSITIVITY "+summary.length+"/"+mutants.length+
  " targeted, baseline-green, assertion-killed, source-isolated mutants");
 console.log(JSON.stringify({schema:"practice-desk-mutation-sensitivity/v1",
  result:"pass",cases:summary}));
}finally{
 await rm(sandbox,{recursive:true,force:true});
}
