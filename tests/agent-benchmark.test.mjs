/** P60-F: actual matched CLI measurements, not invented LLM/perceptual quality. */
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const script=fileURLToPath(new URL("../scripts/benchmark-p60f-agent.mjs",import.meta.url));
test("P60-F independently measures matched synthetic agent tasks and preserves all unmeasured source/truth caveats",()=>{
 const r=spawnSync(process.execPath,[script],{encoding:"utf8",timeout:110000,maxBuffer:2*1024*1024});
 assert.equal(r.error,undefined,String(r.error));
 assert.equal(r.status,0,r.stderr);
 const d=JSON.parse(r.stdout);
 assert.equal(d.format,"practice-desk-agent-handoff-benchmark");
 assert.equal(d.version,1);
 assert.deepEqual(d.tests.map(x=>x.fixture),["apfc","cat"]);
 assert.equal(d.sampleRunsPerFixture,3);
 for(const item of d.tests){
  assert.equal(item.qaGateValid,true);
  assert.ok(item.questions>=3);
  assert.deepEqual(item.callerInvocations,{baseline:3,integrated:1});
  assert.ok(item.medianAgentVisibleJsonBytes.baseline>0);
  assert.ok(item.medianAgentVisibleJsonBytes.integrated>0);
  assert.ok(item.medianWallMs.integrated>0);
  assert.ok(item.medianWallMs.baseline>0);
  assert.equal(item.sourceAnswerOracle.checked,item.sourceAnswerOracle.correct);
  assert.equal(item.sourceEvidence.primaryDocumentFetches,0);
  assert.equal(item.sourceEvidence.reviewerIndependentIdentityAuthenticated,false);
  assert.equal(item.modelTokens,"not-measured");
  assert.equal(item.actualHumanAccuracy,"not-measured");
  assert.equal(item.endUserStudyQuality,"not-measured");
 }
 assert.equal(d.adversarialIndependentOracle.defectDetected,true,
  "Software should not misrepresent self-attested incorrect key as independently true");
 assert.equal(d.factualVerification,"not-performed");
 assert.equal(d.agentDeviceBridge,false);
 assert.ok(r.stdout.length<12000,"Benchmark report must stay compact");
 console.log("P60-F MATCHED-AGENT-MEASUREMENT "+JSON.stringify({
  calls:"baseline 3; integrated 1",
  actualResults:d.tests.map(x=>({fixture:x.fixture,wallMs:x.medianWallMs,
   visibleBytes:x.medianAgentVisibleJsonBytes,independentlyChecked:x.sourceAnswerOracle})),
  caveat:"No LLM tokens, authentic question factual quality, or independent reviewer were measured"
 }));
});
