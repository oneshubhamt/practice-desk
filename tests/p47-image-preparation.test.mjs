/** P47-3B: authored image preparation/commit gate, independent of UI. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {validateExamPackage} from "../src/app/exam-package.ts";
import {sha256} from "../src/domain/hash.ts";
import {assessRasterCandidate,PREPARE_MAX_FILE_BYTES,PREPARE_MAX_COMPARE_PIXELS,
 PREPARE_WEBP_QUALITY,imageBytesLabel} from "../src/app/image-preparation.ts";
const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const richImage=(text,id)=>({format:"practice-desk-rich",version:1,blocks:[
 {type:"paragraph",content:[{type:"text",text},
  {type:"image",assetId:id,altText:"A mathematical diagram with fine labels"}]}
]});
const bank=()=>({
 format:"practice-desk-authoring",version:1,bankId:"cat-media-demo",examId:"cat",
 paperId:"cat-media-demo",title:"CAT authored diagram practice",revision:1,edition:"custom",
 scoring:{correctMarks:3,incorrectMarks:-1},
 timing:{kind:"untimed",pausePolicy:"allowed"},
 navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
 sections:[{id:"qa",title:"Quantitative Ability"}],
 media:[{id:"math-fig",dataUri:IMAGE,altText:"A mathematical diagram with fine labels"}],
 questions:[{id:"q1",examSection:"qa",subject:"Quantitative Aptitude",kind:"single-choice",
  prompt:richImage("Which picture represents the function?","math-fig"),
  options:[richImage("A","math-fig"),"B","C","D"],answer:"B",
  provenance:{kind:"manual"},qa:{status:"unchecked"}}]
});
test("P47-3B canonical authoring image is frozen with exact validated SHA-256 and all references",()=>{
 const original=bank(),snapshot=structuredClone(original);
 const pkg=compileExternalQuestionBank(original);
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
 const pkg=compileExternalQuestionBank(bank());
 const copy=structuredClone(pkg);
 assert.deepEqual(validateExamPackage(copy),copy);
 copy.assets[0].contentHash="a".repeat(64);
 assert.throws(()=>validateExamPackage(copy),/digest mismatch/);
});
test("P47-3B invalid image references and media metadata are rejected before freezing",()=>{
 const missing=bank();
 missing.questions[0].prompt.blocks[0].content[1].assetId="not-in-inventory";
 assert.throws(()=>compileExternalQuestionBank(missing),/asset|image/i);
 const badOption=bank();
 badOption.questions[0].options[0].blocks[0].content[1].assetId="missing-option-image";
 assert.throws(()=>compileExternalQuestionBank(badOption),/asset|image/i);
 const svg=bank();svg.media[0].dataUri="data:image/svg+xml;base64,PHN2Zz4=";
 assert.throws(()=>compileExternalQuestionBank(svg),/embedded data:image|dataUri|image/i);
 const malicious=bank();malicious.media[0].extra="script";
 assert.throws(()=>compileExternalQuestionBank(malicious),/unsupported field/i);
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
 assert.match(s,/canonical authoring/i);
});
