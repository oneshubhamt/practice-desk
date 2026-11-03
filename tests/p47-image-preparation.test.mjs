/** P47-3B: authored image preparation/commit gate, independent of UI. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {importAuthoredExam} from "../src/app/bank-import.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {sha256} from "../src/domain/hash.ts";
import {assessRasterCandidate,PREPARE_MAX_FILE_BYTES,PREPARE_MAX_COMPARE_PIXELS,
 PREPARE_WEBP_QUALITY,imageBytesLabel} from "../src/app/image-preparation.ts";
const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const bank=()=>({
 format:"practice-desk-bank",version:1,bankId:"cat-media-demo",examId:"cat",
 title:"CAT authored diagram practice",revision:1,edition:"custom",
 scoring:{correctMarks:3,incorrectMarks:-1,unansweredMarks:0},
 media:[{id:"math-fig",dataUri:IMAGE,altText:"A mathematical diagram with fine labels"}],
 questions:[{id:"q1",section:"Quantitative Ability",type:"mcq",
  question:"Which picture represents the function?",options:["A","B","C","D"],
  imageIds:["math-fig"],optionImageIds:[["math-fig"],[],[],[]],
  answer:"B"}]
});
test("P47-3B prepared simple-bank image is frozen with exact validated SHA-256 and all references",()=>{
 const original=bank(),snapshot=structuredClone(original);
 const pkg=importAuthoredExam(original);
 assert.equal(pkg.examId,"cat");
 assert.equal(pkg.assets.length,1);
 const asset=pkg.assets[0];
 assert.equal(asset.id,"math-fig");
 assert.equal(asset.altText,"A mathematical diagram with fine labels");
 assert.equal(asset.mediaType,"image/png");
 assert.equal(asset.dataUri,IMAGE,"source bytes must not be silently recompressed");
 assert.equal(asset.contentHash,sha256(Uint8Array.from(atob(IMAGE.split(",")[1]),c=>c.charCodeAt(0))));
 assert.deepEqual(pkg.questions[0].content.assetIds,["math-fig"]);
 assert.deepEqual(pkg.questions[0].content.options[0].assetIds,["math-fig"]);
 assert.deepEqual(validateExamPackage(pkg),pkg);
 assert.deepEqual(original,snapshot,"authoring import must not mutate input");
});
test("P47-3B advanced already-hashed package imports without altering authenticated images",()=>{
 const pkg=importAuthoredExam(bank());
 const copy=structuredClone(pkg);
 assert.deepEqual(importAuthoredExam(copy),copy);
 copy.assets[0].contentHash="a".repeat(64);
 assert.throws(()=>importAuthoredExam(copy),/digest mismatch/);
});
test("P47-3B invalid or mismatched image references are rejected before freezing",()=>{
 const missing=bank();missing.questions[0].imageIds=["not-in-inventory"];
 assert.throws(()=>importAuthoredExam(missing),/unknown or repeated image ID/);
 const badOption=bank();badOption.questions[0].optionImageIds=[["math-fig"],[]];
 assert.throws(()=>importAuthoredExam(badOption),/must align/);
 const repeated=bank();repeated.questions[0].imageIds=["math-fig","math-fig"];
 assert.throws(()=>importAuthoredExam(repeated),/unknown or repeated image ID/);
 const svg=bank();svg.media[0].dataUri="data:image/svg+xml;base64,PHN2Zz4=";
 assert.throws(()=>importAuthoredExam(svg),/malformed/);
 const malicious=bank();malicious.media[0].extra="script";
 assert.throws(()=>importAuthoredExam(malicious),/allow only/);
});
test("P47-3B choose smaller WebP only with strong fidelity and meaningful savings",()=>{
 const good={sourceBytes:550000,candidateBytes:240000,width:1600,height:1200,
  psnrDb:45,maxChannelError:12,significantErrorFraction:0};
 const accepted=assessRasterCandidate(good);
 assert.equal(accepted.accepted,true);
 assert.ok(accepted.smallerBy>0.5);
 assert.equal(assessRasterCandidate({...good,candidateBytes:525000}).accepted,false);
 assert.equal(assessRasterCandidate({...good,psnrDb:32}).accepted,false);
 assert.equal(assessRasterCandidate({...good,maxChannelError:80}).accepted,false);
 assert.equal(assessRasterCandidate({...good,significantErrorFraction:0.1}).accepted,false);
 assert.equal(assessRasterCandidate({...good,width:5000,height:5000}).accepted,false);
 assert.equal(assessRasterCandidate({...good,candidateBytes:0}).accepted,false);
 assert.equal(PREPARE_MAX_FILE_BYTES,10*1024*1024);
 assert.equal(PREPARE_MAX_COMPARE_PIXELS,8*1024*1024);
 assert.equal(PREPARE_WEBP_QUALITY,0.98);
 assert.equal(imageBytesLabel(1024*1024),"1.00 MiB");
});
test("P47-3B image preparation is separate from verified package, persistence and network",async()=>{
 const s=await readFile(new URL("../src/app/image-preparation.ts",import.meta.url),"utf8");
 assert.doesNotMatch(s,/\b(?:indexedDB|fetch|localStorage|sessionStorage)\s*\(/);
 assert.doesNotMatch(s,/from ["']\.\/generic-ui\.ts/);
 assert.match(s,/showModal\(\)/);
 assert.match(s,/approval\.checked/);
 assert.match(s,/PREPARE_WEBP_QUALITY/);
 assert.match(s,/imageIds or optionImageIds/);
});
