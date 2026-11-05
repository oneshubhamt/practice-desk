import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newAuthoringDraft,validateAuthoringDraft,requiresExternalQuality} from "../src/authoring/authoring-draft.ts";
import {toAuthoringDraft} from "../src/authoring/external-bank.ts";

test("P58-A F01: external QA is bound to a validated ingestion mode, not a draft ID",async()=>{
 const source=JSON.parse(await readFile(new URL("../examples/ai-first-apfc.json",import.meta.url),"utf8"));
 const imported=toAuthoringDraft(source);
 assert.equal(imported.ingestionMode,"external-source");
 assert.equal(requiresExternalQuality(imported),true);
 const renamed=validateAuthoringDraft({...imported,id:"renamed-by-local-author"});
 assert.equal(requiresExternalQuality(renamed),true);
 const otherClaim=validateAuthoringDraft({...renamed,ingestionMode:"manual"});
 assert.equal(requiresExternalQuality(otherClaim),true,
  "Question provenance must prevent downgrading mandatory QA by toggling workflow mode");
});

test("P58-A F01: genuine manual drafts preserve existing publication validation path",()=>{
 const original=newAuthoringDraft();
 assert.equal(original.ingestionMode,"manual");
 assert.equal(requiresExternalQuality(original),false);
 assert.equal(requiresExternalQuality(validateAuthoringDraft(original)),false);
 assert.equal(requiresExternalQuality(validateAuthoringDraft({
  ...original,id:"stage:misleading-text-prefix"
 })),false,"A staged-looking ID must not spuriously trigger AI-only restrictions");
 assert.throws(()=>validateAuthoringDraft({...original,ingestionMode:"unverified"}),/Invalid authoring ingestion mode/);
 assert.throws(()=>validateAuthoringDraft({...original,ingestionMode:"verified"}),/Invalid authoring ingestion mode/);
});
