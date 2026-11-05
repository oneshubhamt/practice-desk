import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {addStagedFiles,stagedToAuthoringDraft,updateStagedSelection,inspectStagingWorkspace} from "../src/authoring/authoring-staging.ts";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {publicationPlainText} from "../src/authoring/authoring-publisher.ts";

const load=async()=>JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
const blank={schema:1,files:[],selected:[]};
const staged=(s,name="ai.json")=>addStagedFiles(blank,[{name,source:s}]);
test("P58-B F05 red: changed selection forks without overwriting existing unpublished corrections",async()=>{
 const source=await load(),state=staged(source);
 const first=stagedToAuthoringDraft(state);
 const key=state.selected[1];
 const fork=stagedToAuthoringDraft(updateStagedSelection(state,key,false));
 assert.notEqual(first.id,fork.id,"different selected questions must have independent draft identities");
 assert.deepEqual(first.questions.filter(q=>!fork.questions.some(x=>x.id===q.id)).length,1);
 const reordered=stagedToAuthoringDraft({...state,selected:[...state.selected].reverse()});
 assert.equal(first.id,reordered.id,"selection ordering alone must not change draft identity");
});

test("P58-B F06 red: duplicate screening reports explicit incompleteness and pair count",async()=>{
 const source=await load();
 source.questions=Array.from({length:42},(_,i)=>({...source.questions[0],id:"repeat-"+i}));
 const report=inspectExternalQuestionBank(source);
 assert.equal(report.quality?.duplicates.length,500);
 assert.equal(report.quality?.summary.duplicateTruncated,true,
  "a full-looking 500-candidate list is an unsafe incomplete report");
 assert.ok((report.quality?.summary.duplicatePairsInspected??0)>500);
 assert.ok((report.quality?.summary.duplicatePairsPossible??0)>
  (report.quality?.summary.duplicatePairsInspected??Infinity));
 const inspection=inspectStagingWorkspace(staged(source));
 assert.equal(inspection.duplicateTruncated,true);
});

test("P58-B F08 red: independently generated shared media IDs get deterministic safe namespaces",async()=>{
 const a=await load(),b=structuredClone(a);
 const make=(src,bankId,byte)=>{
  src.bankId=bankId;src.questions=[{...src.questions[0],id:"figure-item",
   stimulusRef:"shared-chart",prompt:{format:"practice-desk-rich",version:1,
    blocks:[{type:"paragraph",content:[{type:"text",text:"Which caption is correct?"},
     {type:"image",assetId:"image1",altText:"Source-labelled figure"}]}]}}];
  src.media=[{id:"image1",altText:"Sample synthetic PNG",dataUri:
   "data:image/png;base64,"+Buffer.from([byte,byte+1,byte+2]).toString("base64")}];
  src.stimuli=[{id:"shared-chart",kind:"image",mediaRef:"image1",altText:"Shared chart"}];
  return src;
 };
 const first=make(a,"batchA",3),second=make(b,"batchB",6);
 const merged=stagedToAuthoringDraft(addStagedFiles(blank,[
  {name:"a.json",source:first},{name:"b.json",source:second}
 ]));
 assert.equal(merged.questions.length,2);
 assert.equal(merged.assets.length,2);
 assert.equal(new Set(merged.assets.map(x=>x.id)).size,2);
 for(const q of merged.questions){
  const ref=merged.stimuli.find(s=>s.id===q.stimulusRef);
  assert.equal(ref?.kind,"image");
  assert.ok(merged.assets.some(a=>a.id===ref.assetId));
  assert.match(publicationPlainText(q.prompt),/caption is correct/);
  assert.ok(JSON.stringify(q.prompt).includes(String(ref.assetId)));
 }
 const reverse=stagedToAuthoringDraft(addStagedFiles(blank,[
  {name:"b.json",source:second},{name:"a.json",source:first}
 ]));
 assert.deepEqual(merged.assets.map(x=>x.id).sort(),reverse.assets.map(x=>x.id).sort());
});
