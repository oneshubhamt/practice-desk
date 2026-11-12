import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {execFileSync} from "node:child_process";
import {toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {validateAuthoringDraft,defaultAuthoringShelf,validateAuthoringShelf,AUTHORING_KEY} from "../src/authoring/authoring-draft.ts";
import {createDraftExchange,readDraftExchange,inspectDraftExchange,
 createDraftShelfArchive,readDraftShelfArchive} from "../src/authoring/authoring-exchange.ts";
import {addStagedFiles,updateStagedTriage,stagedToAuthoringDraft,
 createStagingArchive,readStagingArchive,validateStagingWorkspace,STAGING_KEY} from "../src/authoring/authoring-staging.ts";
import {createAuthoringWorkspaceStore} from "../src/authoring/authoring-workspace-store.ts";

const fixture=async name=>JSON.parse(await readFile(new URL("../examples/ai-first-"+name+".json",import.meta.url),"utf8"));
const citation=(stance="supports")=>({publisher:"Illustrative government office",title:"Example document",
 url:"https://example.gov.in/notice.pdf",section:"Chapter II",page:"12",
 provision:"Section 4",publicationDate:"2026-01-02",asOfDate:"2026-11-05",stance});

test("P58-B F04: versioned exchange preserves source IDs, rich content, citations, keys and exact frozen policy",async()=>{
 const original=await fixture("cat"),draft=toAuthoringDraft(original);
 assert.equal(draft.questions[0].sourceOrigin?.bankId,original.bankId);
 assert.equal(draft.questions[0].sourceOrigin?.questionId,original.questions[0].id);
 const corrected=validateAuthoringDraft({...draft,
  questions:draft.questions.map((q,i)=>i? q:{...q,source:"Corrected after reading source",
   provenance:{...q.provenance,kind:"ai-original",sources:[citation()]}})
 });
 const archive=createDraftExchange(corrected);
 assert.equal(archive.format,"practice-desk-draft-exchange");
 const imported=readDraftExchange(JSON.parse(JSON.stringify(archive)));
 assert.deepEqual(imported,corrected);
 const report=inspectDraftExchange(archive);
 assert.equal(report.valid,true,JSON.stringify(report.issues));
 const published=report.compiled;
 assert.ok(published?.stimuli.length===2&&published.questions.length===original.questions.length);
 assert.equal(published?.questions[0].editorial.status,"caution");
 const note=published.questions[0].editorial.notes;
 for(const value of ["Chapter II","Section 4","2026-01-02","2026-11-05",
  "example.gov.in","page 12","stance supports","bank "+original.bankId])
  assert.ok(note.includes(value),"Frozen caution lost "+value);
 assert.deepEqual(inspectDraftExchange(JSON.parse(JSON.stringify(archive))).compiled,published);
});

test("P58-B F03: malicious dates and URLs never persist; source-disagreement remains unverified",async()=>{
 const draft=toAuthoringDraft(await fixture("apfc"));
 const base=validateAuthoringDraft({...draft,questions:draft.questions.map((q,i)=>i? q:
  {...q,provenance:{...q.provenance,sources:[citation(),citation("disputes")]}})});
 const report=inspectDraftExchange(createDraftExchange(base));
 assert.equal(report.valid,true);
 assert.ok(report.issues.some(i=>i.code==="source-disagreement"&&i.severity==="warning"));
 for(const invalid of [
  {...citation(),url:"http://example.gov.in/notice"},
  {...citation(),url:"https://evil@example.gov.in/notice"},
  {...citation(),publicationDate:"2026-02-30"},
  {...citation(),asOfDate:"2026-13-01"}
 ]){
  const mutated=structuredClone(base);mutated.questions[0].provenance.sources=[invalid];
  assert.throws(()=>validateAuthoringDraft(mutated),/URL|calendar date/);
 }
 const changed=structuredClone(base);
 changed.questions[0].provenance.sources=[citation("supports")];
 const corrected=inspectDraftExchange(createDraftExchange(changed));
 assert.ok(!corrected.issues.some(i=>i.code==="source-disagreement"));
});

test("P58-B F04/F12: strict shelf and staging archive reject malformed, oversize or spoofed data",async()=>{
 const draft=toAuthoringDraft(await fixture("apfc"));
 const shelf=validateAuthoringShelf({...defaultAuthoringShelf(),activeId:draft.id,
  drafts:[draft]});
 const archive=createDraftShelfArchive(shelf);
 assert.deepEqual(readDraftShelfArchive(JSON.parse(JSON.stringify(archive))),shelf);
 assert.throws(()=>readDraftShelfArchive({...archive,unexpected:true}),/archive/i);
 assert.throws(()=>readDraftShelfArchive({...archive,version:2}),/archive/i);
 const source=await fixture("apfc");
 const stage=addStagedFiles({schema:1,files:[],selected:[]},[{name:"ai.json",source}]);
 const withTriage=updateStagedTriage(stage,stage.selected[0],"potential-duplicate",
  "Duplicate text might differ in underlying sources","Reader name (author claim)");
 const stored=createStagingArchive(withTriage);
 assert.deepEqual(readStagingArchive(JSON.parse(JSON.stringify(stored))),withTriage);
 const handed=stagedToAuthoringDraft(withTriage);
 assert.match(handed.questions[0].qa.review.note,/NOT authenticated/);
 assert.equal(handed.questions[0].qa.review.reviewer,"Reader name (author claim)");
 assert.throws(()=>readStagingArchive({...stored,workspace:{...stage,selected:["unknown"]}}),/unknown/);
 assert.throws(()=>readStagingArchive({...stored,workspace:{...stage,triage:[
  {key:stage.selected[0],decision:"distinct",note:"Verified",updatedAt:"2026-02-30T00:00:00.000Z"}
 ]}}),/triage/);
 assert.throws(()=>readStagingArchive({...stored,surprise:"import-me"}),/archive/i);
 assert.throws(()=>readDraftShelfArchive({...archive,draft:"x".repeat(2000000)}),/archive/i);
});

test("P58-B F04: real headless CLI accepts lossless exchange, preserves source and fails closed for wrong keys",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pd-p58b-"));
 try{
  const draft=toAuthoringDraft(await fixture("apfc"));
  const exchanged=createDraftExchange(draft);
  const input=join(dir,"draft-exchange.json"),output=join(dir,"compiled.json");
  await writeFile(input,JSON.stringify(exchanged));
  const raw=execFileSync(process.execPath,["scripts/question-bank-cli.mjs","validate-bank",input],
   {encoding:"utf8",cwd:process.cwd()});
  assert.equal(JSON.parse(raw).valid,true);
  const compiled=JSON.parse(execFileSync(process.execPath,
   ["scripts/question-bank-cli.mjs","compile-bank",input,output],
   {encoding:"utf8",cwd:process.cwd()}));
  assert.equal(compiled.valid,true);
  const bundle=JSON.parse(await readFile(output,"utf8"));
  assert.equal(bundle.questions.length,draft.questions.length);
  assert.match(bundle.questions[0].editorial.notes,/Original AI input identity/);
  const corrupt=structuredClone(exchanged);
  corrupt.draft.questions[2].answer="B";
  await writeFile(input,JSON.stringify(corrupt));
  assert.throws(()=>execFileSync(process.execPath,
   ["scripts/question-bank-cli.mjs","compile-bank",input,join(dir,"should-not-create.json")],
   {encoding:"utf8",cwd:process.cwd(),stdio:"pipe"}));
  await assert.rejects(readFile(join(dir,"should-not-create.json"),"utf8"));
 }finally{await rm(dir,{recursive:true,force:true});}
});


test("Authoring workspace store owns draft/staging CAS, corruption lockout and explicit reset",async()=>{
 class MemoryStorage{
  values=new Map();
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
  clear(){this.values.clear();}
  key(index){return [...this.values.keys()][index]??null;}
  get length(){return this.values.size;}
 }
 const storage=new MemoryStorage();
 const store=createAuthoringWorkspaceStore(storage);
 const initial=store.load();
 assert.equal(initial.shelfBlocked,false);
 assert.equal(initial.stagingBlocked,false);
 assert.equal(initial.staging,null);
 const saved=store.saveShelf(initial.shelf);
 assert.equal(JSON.parse(storage.getItem(AUTHORING_KEY)).activeId,saved.activeId);

 const source=await fixture("apfc");
 const staged=addStagedFiles({schema:1,files:[],selected:[]},[{name:"one.json",source}]);
 assert.deepEqual(store.saveStaging(staged),staged);
 assert.equal(JSON.parse(storage.getItem(STAGING_KEY)).selected.length,staged.selected.length);

 storage.setItem(AUTHORING_KEY,JSON.stringify({...saved,activeId:"external-change"}));
 assert.throws(()=>store.saveShelf(saved),/Another tab changed authoring drafts/);
 const event={key:AUTHORING_KEY};
 assert.equal(store.externalChange(event).shelfChanged,true);

 const corruptStorage=new MemoryStorage();
 corruptStorage.setItem(AUTHORING_KEY,"{broken");
 corruptStorage.setItem(STAGING_KEY,"{broken");
 const corruptStore=createAuthoringWorkspaceStore(corruptStorage);
 const corrupt=corruptStore.load();
 assert.equal(corrupt.shelfBlocked,true);
 assert.equal(corrupt.stagingBlocked,true);
 assert.equal(corruptStorage.getItem(AUTHORING_KEY),"{broken");
 assert.equal(corruptStorage.getItem(STAGING_KEY),"{broken");
 assert.throws(()=>corruptStore.saveShelf(corrupt.shelf),/Damaged saved draft data/);
 assert.throws(()=>corruptStore.saveStaging(null),/unreadable/);
 assert.deepEqual(corruptStore.resetUnreadableShelf(corrupt.shelf),corrupt.shelf);
 assert.equal(JSON.parse(corruptStorage.getItem(AUTHORING_KEY)).activeId,corrupt.shelf.activeId);
 corruptStore.resetUnreadableStaging();
 assert.equal(corruptStorage.getItem(STAGING_KEY),null);
});

test("Authoring workspace explicit reset refuses to erase bytes changed after corruption was observed",()=>{
 class MemoryStorage{
  values=new Map();
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
  clear(){this.values.clear();}
  key(index){return [...this.values.keys()][index]??null;}
  get length(){return this.values.size;}
 }
 const storage=new MemoryStorage();
 storage.setItem(AUTHORING_KEY,"{broken");
 storage.setItem(STAGING_KEY,"{broken");
 const store=createAuthoringWorkspaceStore(storage);
 const snapshot=store.load();
 storage.setItem(AUTHORING_KEY,"{changed-elsewhere");
 storage.setItem(STAGING_KEY,"{changed-elsewhere");
 assert.throws(()=>store.resetUnreadableShelf(snapshot.shelf),/Another tab changed authoring drafts/);
 assert.throws(()=>store.resetUnreadableStaging(),/Another tab changed AI staging/);
 assert.equal(storage.getItem(AUTHORING_KEY),"{changed-elsewhere");
 assert.equal(storage.getItem(STAGING_KEY),"{changed-elsewhere");
});
