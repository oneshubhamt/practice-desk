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
import {transformSync} from "esbuild";

const root=fileURLToPath(new URL("../",import.meta.url));
const mutants=[
 {
  id:"scoring-unanswered-confused-with-wrong",
  path:"src/engine/scoring.ts",
  testFile:"tests/exam-scoring-and-policy.test.mjs",
  testName:"seeded independent scoring reference: precedence, marks ledger, verdicts, exclusions and bounds"
 },
 {
  id:"stored-recovery-equal-version-not-protected",
  path:"src/history/frozen.ts",
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"Recovery reference: 576 persisted/mirror precedence combinations, missing IDs, terminal and revision boundaries"
 },
 {
  id:"CAS-next-write-skips-one-revision",
  path:"src/history/concurrency.ts",
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"seeded two-tab compare-and-swap interleavings reject stale writes, preserve stored revision"
 },
 {
  id:"publisher-unilaterally-inflates-correct-marks",
  path:"src/authoring/authoring-publisher.ts",
  testFile:"tests/authoring-domain.test.mjs",
  testName:"P47-5D all six kinds publish as source-validated frozen rich package, with correct hashes"
 },
 {
  id:"rich-source-silently-trims-candidate-text",
  path:"src/domain/rich-document.ts",
  testFile:"tests/authoring-domain.test.mjs",
  testName:"Authoring property: literal Unicode/math/HTML-like strings survive rich validation unchanged"
 },
 {
  id:"learning-incorrect-evidence-threshold",
  path:"src/learning/attempt-evidence.ts",
  testFile:"tests/learning-and-analytics.test.mjs",
  testName:"seeded evidence classifications require independent sample size and question diversity"
 },
 {
  id:"six-kind-multi-select-matches-on-overlap-instead-of-exact-set",
  path:"src/engine/scoring.ts",
  testFile:"tests/exam-scoring-and-policy.test.mjs",
  testName:"P61-H six-kind independent ledger survives answer-ID bijections and input permutations"
 },
 {
  id:"backup-sha256-payload-integrity-skipped",
  path:"src/history/backup.ts",
  testFile:"tests/history-and-persistence.test.mjs",
  testName:"canonical backup checksum covers records and preferences; size, IDs and timestamp are bounded"
 },
 {
  id:"pdf-eof-signature-check-skipped",
  path:"scripts/pdf-ingest.mjs",
  testFile:"tests/editorial-lineage-and-pdf.test.mjs",
  testName:"P60-E CLI template is explicitly incomplete and does not reveal keys, audit uses byte-bound source, safe on corrupt PDFs"
 },
 {
  id:"fsrs-ratings-silently-rewritten",
  path:"src/learning/learning.ts",
  testFile:"tests/learning-and-analytics.test.mjs",
  testName:"stable ts-fsrs 6.0.0 runs explicit FSRS-7 with evidence-rich replay, previews and retrievability"
 }
];
const sandbox=await mkdtemp(join(tmpdir(),"practice-desk-mutant-"));
const sha=buffer=>createHash("sha256").update(buffer).digest("hex");
const reEscape=text=>Array.from(text).map(ch=>".*+?^$()|[]{}\\".includes(ch)?"\\"+ch:ch).join("");
const summary=[];

/**
 * Apply one intentional *semantic* fault to a uniquely selected syntax node.
 * Formatting, whitespace and unrelated helper renames are not mutation anchors.
 * Each predicate also identifies the target operation/function or owned property.
 * A missing or ambiguous node aborts the gate, never counts as a killed mutant.
 */
/**
 * Mutation selectors express an operation and its owning context, tolerate
 * whitespace/formatting, and require a *unique* match. esbuild parses the
 * original and mutated TS/JS, so parse failures cannot count as killed mutants.
 * This avoids dependency on the unavailable TypeScript 7 JavaScript AST API.
 * A true rename of the semantic operation requires updating its contract here.
 */
const mutations={
 "scoring-unanswered-confused-with-wrong":{
  pattern:/\bmarks\s*=\s*rule\s*\.\s*unansweredMarks\s*;/g,
  edit:s=>s.replace(/\bunansweredMarks\b/,"incorrectMarks")
 },
 "stored-recovery-equal-version-not-protected":{
  pattern:/\bstored\s*\.\s*saveRevision\s*>=\s*mirror\s*\.\s*saveRevision\b/g,
  edit:s=>s.replace(">=",">")
 },
 "CAS-next-write-skips-one-revision":{
  pattern:/\breturn\s+expected\s*\+\s*1\s*;/g,
  edit:s=>s.replace(/\b1\b/,"2")
 },
 "publisher-unilaterally-inflates-correct-marks":{
  pattern:/\bscoring\s*:\s*\{\s*defaultRule\s*:\s*\{\s*correctMarks\s*:\s*d\s*\.\s*marksCorrect\b/g,
  edit:s=>s+"+0.5"
 },
 "rich-source-silently-trims-candidate-text":{
  pattern:/\bblocks\s*:\s*\[\s*\{\s*type\s*:\s*["']paragraph["']\s*,\s*content\s*:\s*\[\s*\{\s*type\s*:\s*["']text["']\s*,\s*text\s*\}\s*\]\s*\}\s*\]/g,
  edit:s=>s.replace(/\btext(?=\s*\}\s*\]\s*\}\s*\]$)/,"text:text.trim()")
 },
 "learning-incorrect-evidence-threshold":{
  pattern:/\br\s*\.\s*answered\s*<\s*10\b/g,
  edit:s=>s.replace(/\b10\b/,"100")
 },
 "six-kind-multi-select-matches-on-overlap-instead-of-exact-set":{
  pattern:/\ba\s*\.\s*optionIds\s*\.\s*every\s*\(/g,
  edit:s=>s.replace(/\bevery\b/,"some")
 },
 "backup-sha256-payload-integrity-skipped":{
  pattern:/\bmanifest\s*\.\s*digest\s*!==\s*digest\s*\(\s*core\s+as\s+Core\s*\)/g,
  edit:()=> "false"
 },
 "pdf-eof-signature-check-skipped":{
  pattern:/!\s*bytes\s*\.\s*subarray\s*\(\s*-2048\s*\)\s*\.\s*toString\s*\(\s*["']ascii["']\s*\)\s*\.\s*includes\s*\(\s*["']%%EOF["']\s*\)/g,
  edit:()=> "false"
 },
 "fsrs-ratings-silently-rewritten":{
  pattern:/\breviews\s*:\s*\[\s*\.\.\.\s*item\s*\.\s*reviews\s*,\s*\{\s*rating(?=\s*[},])/g,
  edit:s=>s.replace(/\brating$/,"rating:1")
 }
};
function mutateSource(source,spec){
 const rule=mutations[spec.id];
 if(!rule)throw Error("No semantic mutation rule for "+spec.id);
 const loader=spec.path.endsWith(".ts")?"ts":"js";
 const parse=code=>transformSync(code,{loader,target:"esnext",logLevel:"silent"});
 parse(source);
 const hits=[...source.matchAll(rule.pattern)];
 if(hits.length!==1)throw Error("Expected one semantic operation for "+
   spec.id+"; found "+hits.length);
 const hit=hits[0],edited=rule.edit(hit[0]);
 if(edited===hit[0])throw Error("Semantic mutant did not change source: "+spec.id);
 const changed=source.slice(0,hit.index)+edited+source.slice(hit.index+hit[0].length);
 parse(changed);
 return changed;
}

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
  const mutatedSource=mutateSource(original,test);
  const baseline=runNamed(test);
  assertBaseline(test,baseline);
  try{
   await writeFile(target,mutatedSource,"utf8");
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
