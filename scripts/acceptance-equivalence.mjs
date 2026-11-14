import assert from "node:assert/strict";
import {access,readFile,writeFile,mkdir} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {scenarioRegistry} from "./acceptance/registry.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const dir=process.argv[2]??join(root,"artifacts/equivalence");
const map={
 "acceptance-authoring-publication":{browser:["authoring-publication"],node:["authoring-domain.test.mjs"],direct:true},
 "acceptance-authoring-visual":{browser:["authoring-publication","responsive-ui"],node:["authoring-domain.test.mjs","ui-and-navigation.test.mjs"]},
 "acceptance-bank-modes":{browser:["candidate-core"],node:["exam-bank-and-policy.test.mjs"]},
 "acceptance-calendar":{browser:["calendar-integration"],node:["calendar-integration.test.mjs"],direct:true},
 "acceptance-critical":{browser:["candidate-core"],node:["exam-scoring-and-policy.test.mjs"],direct:true},
 "acceptance-drafts":{browser:["candidate-core"],node:["exam-package-and-import.test.mjs","ui-and-navigation.test.mjs"]},
 "acceptance-editorial-provenance":{browser:["external-bank-authoring"],node:["content-and-provenance.test.mjs","editorial-lineage-and-pdf.test.mjs"]},
 "acceptance-flag-palette":{browser:["status-palette"],node:["flag-palette.test.mjs"],direct:true},
 "acceptance-history-evidence":{browser:["candidate-core"],node:["history-and-persistence.test.mjs","attempt-provenance.test.mjs"]},
 "acceptance-history-filters":{browser:["candidate-core"],node:["history-record-integrity.test.mjs"]},
 "acceptance-image-preparation":{browser:["image-preparation"],node:["media-rendering.test.mjs"],direct:true},
 "acceptance-image-viewer":{browser:["image-viewer"],node:["media-rendering.test.mjs"],direct:true,cross:true},
 "acceptance-learning-lifecycle":{browser:["candidate-core"],node:["learning-and-analytics.test.mjs","revision-evidence.test.mjs"]},
 "acceptance-navigation":{browser:["file-navigation"],node:["ui-and-navigation.test.mjs"],direct:true,cross:true},
 "acceptance-p47-math":{browser:["math-rendering"],node:["media-rendering.test.mjs"],direct:true},
 "acceptance-p48-architecture":{browser:["file-navigation","storage-resilience"],node:["architecture-boundaries.test.mjs"]},
 "acceptance-p48-security":{browser:["csp-security"],node:["build-security.test.mjs"],direct:true,cross:true},
 "acceptance-p48-ux":{browser:["responsive-ui"],node:["ui-and-navigation.test.mjs"]},
 "acceptance-p49-p52-enhancements":{browser:["candidate-core"],node:["taxonomy-and-workspace-policy.test.mjs"]},
 "acceptance-p53-taxonomy":{browser:["external-bank-authoring"],node:["taxonomy-and-workspace-policy.test.mjs"]},
 "acceptance-p54-authoring":{browser:["authoring-publication"],node:["authoring-domain.test.mjs","exam-scoring-and-policy.test.mjs"]},
 "acceptance-p55-learning":{browser:["candidate-core"],node:["learning-and-analytics.test.mjs","fsrs-scheduler-contract.test.mjs"]},
 "acceptance-p56-integration":{browser:["storage-resilience","partial-recovery"],node:["cross-domain-integration.test.mjs"]},
 "acceptance-p57a-bank":{browser:["external-bank-authoring"],node:["external-bank-authoring.test.mjs"],direct:true},
 "acceptance-p58a-integrity":{browser:["authoring-publication"],node:["content-and-provenance.test.mjs","authoring-workspace-integrity.test.mjs"]},
 "acceptance-p58b-editorial":{browser:["external-bank-authoring"],node:["editorial-lineage-and-pdf.test.mjs"]},
 "acceptance-p58c-scale":{browser:["result-stress"],node:["authoring-scale.test.mjs","result-scale.test.mjs"]},
 "acceptance-partial-recovery":{browser:["partial-recovery"],node:["history-record-integrity.test.mjs"],direct:true,cross:true},
 "acceptance-recovery":{browser:["storage-resilience","partial-recovery"],node:["history-and-persistence.test.mjs","history-record-integrity.test.mjs"]},
 "acceptance-resilience":{browser:["storage-resilience"],node:["history-and-persistence.test.mjs"],direct:true},
 "acceptance-session-policy":{browser:["candidate-core"],node:["session-and-timing.test.mjs","question-timing-phases.test.mjs"]},
 "acceptance-stress":{browser:["result-stress"],node:["result-scale.test.mjs"],direct:true},
 "acceptance-ui":{browser:["responsive-ui"],node:["ui-and-navigation.test.mjs"],direct:true}
};
const registryIds=new Set(scenarioRegistry.map(x=>x.id));
for(const entry of Object.values(map)){
 for(const id of entry.browser)assert.ok(registryIds.has(id),"Unknown new browser witness "+id);
 for(const file of entry.node)await access(join(root,"tests",file));
}
const results=[];
for(const engine of ["chromium","firefox","webkit"]){
 const legacy=JSON.parse(await readFile(join(dir,"legacy-"+engine+".json"),"utf8"));
 const modern=JSON.parse(await readFile(join(dir,"new-"+engine+".json"),"utf8"));
 assert.equal(legacy.complete,true,engine+" legacy suite incomplete");
 assert.equal(modern.complete,true,engine+" new suite incomplete");
 const oldFiles=new Set(legacy.executed.map(x=>x.file)),newIds=new Set(modern.executed.map(x=>x.id));
 assert.equal(oldFiles.size,engine==="chromium"?33:21,engine+" legacy count drift");
 assert.equal(newIds.size,engine==="chromium"?14:4,engine+" new count drift");
 for(const old of oldFiles){
  const entry=map[old];assert.ok(entry,"Unmapped legacy scenario "+engine+" "+old);
  assert.ok(entry.browser.length||entry.node.length,"Witnessless legacy scenario "+old);
  if(engine==="chromium"&&entry.direct)
   assert.ok(entry.browser.some(id=>newIds.has(id)),"Direct browser witness absent for "+old);
  if(engine!=="chromium"&&entry.cross)
   assert.ok(entry.browser.some(id=>newIds.has(id)),"Cross-browser witness absent for "+old+" on "+engine);
 }
 const legacyMs=legacy.executed.reduce((s,x)=>s+(x.elapsedMs??0),0);
 const modernMs=modern.executed.reduce((s,x)=>s+(x.elapsedMs??0),0);
 results.push({engine,legacyScenarios:oldFiles.size,newScenarios:newIds.size,
  legacyElapsedMs:legacyMs,newElapsedMs:modernMs,
  reductionPct:Number((100*(1-modernMs/legacyMs)).toFixed(1))});
}
assert.deepEqual(new Set(Object.keys(map)),
 new Set(JSON.parse(await readFile(join(dir,"legacy-chromium.json"),"utf8")).executed.map(x=>x.file)),
 "Equivalence map must cover exactly the complete legacy Chromium suite");
const report={schema:"practice-desk-browser-equivalence/v1",baseline:"Pass-B 33/21 manifest",
 result:"pass",mappedLegacyScenarios:Object.keys(map).length,newRegistryScenarios:scenarioRegistry.length,engines:results};
await mkdir(dir,{recursive:true});await writeFile(join(dir,"equivalence-audit.json"),JSON.stringify(report,null,2));
console.log("BROWSER EQUIVALENCE PASS "+JSON.stringify(report));
