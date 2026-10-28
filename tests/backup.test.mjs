import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importCglBank, sha256 } from "../src/content/import-cgl.ts";
import { archiveDisplayRevision, makeBackup, verifyBackup } from "../src/history/backup.ts";

const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));

test("SHA-256 returns the standard digest, including UTF-8",()=>{
 assert.equal(sha256("abc"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 assert.equal(sha256(""),"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});
test("a frozen display revision is not mutated by changes to the library",()=>{
 const raw=sources[Object.keys(sources)[0]];
 const id=importCglBank(sources,patches)[0].paper.id;
 const archived=archiveDisplayRevision(id,raw.id,raw);
 const original=archived.displayPaper.questions[0].stem;
 raw.questions[0].stem="Changed later";
 assert.equal(archived.displayPaper.questions[0].stem,original);
 raw.questions[0].stem=original;
});
test("versioned backup includes unfinished tests and checks data integrity",()=>{
 const raw=sources[Object.keys(sources)[0]];
 const archive=archiveDisplayRevision("revision-1",raw.id,raw);
 const backup=makeBackup([{id:"unfinished",finishedAt:null},{id:"finished",finishedAt:42}],
   [archive],{paper:raw.id},"2026-10-28T05:00:00Z");
 assert.equal(backup.attempts.length,2);
 assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(backup))),backup);
 const tampered=JSON.parse(JSON.stringify(backup));tampered.attempts[0].finishedAt=100;
 assert.throws(()=>verifyBackup(tampered),/integrity/);
 const duplicate=makeBackup([{id:"x"},{id:"x"}],[],{},backup.exportedAt);
 assert.throws(()=>verifyBackup(duplicate),/records/);
});
