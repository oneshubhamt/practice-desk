import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {sha256} from "../src/domain/hash.ts";
import {questionRevisionHash,answerKeyRevisionHash,paperRevisionHash} from "../src/domain/integrity.ts";
import {validateExamPackage,startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
import {validateGenericStoredRecord} from "../src/app/generic-ui.ts";
import {addLearningCard,validateLearningCard} from "../src/learning/learning.ts";
import {readDisplayPreferences,writeDisplayPreferences} from "../src/app/preferences.ts";

const clone=structuredClone;
const image="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WsSlz8AAAAASUVORK5CYII=";
const decoded=Uint8Array.from(atob(image.slice(image.indexOf(",")+1)),c=>c.charCodeAt(0));
const asset={id:"figure",mediaType:"image/png",dataUri:image,contentHash:sha256(decoded),altText:"A diagram"};
const baseQuestion=pkg.questions[0];
const withVisual=(()=>{
 const q={...baseQuestion,content:{...baseQuestion.content,assetIds:["figure"],stimulusId:"shared"}};
 return {...q,contentHash:questionRevisionHash(q)};
})();
const visualBundle={...pkg,questions:[withVisual,...pkg.questions.slice(1)],
 stimuli:[{id:"shared",kind:"passage",text:"Examine the diagram.",assetIds:["figure"]}],
 assets:[asset]};
test("canonical hashes prevent unreviewed edits to question, answer key or paper",()=>{
 assert.equal(validateExamPackage(pkg),pkg);
 const q=clone(pkg);
 q.questions[0].content.prompt="Edited without a new revision";
 assert.throws(()=>validateExamPackage(q),/Question revision content hash mismatch/);
 const key=clone(pkg);key.answerKey.entries[0].answer.optionId="b";
 assert.throws(()=>validateExamPackage(key),/Answer-key revision content hash mismatch/);
 const paper=clone(pkg);paper.paper.scoring.defaultRule.correctMarks=12;
 assert.throws(()=>validateExamPackage(paper),/Paper revision content hash mismatch/);
 assert.equal(answerKeyRevisionHash(pkg.answerKey),pkg.answerKey.contentHash);
 assert.equal(paperRevisionHash(pkg.paper),pkg.paper.contentHash);
});
test("stimuli and assets reject unsupported fields, missing images, bad media and malformed tables",()=>{
 assert.equal(validateExamPackage(visualBundle),visualBundle);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"passage",text:"Passage",assetIds:["missing"]}]}),/missing stimulus image/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"table",columns:["X","Y"],rows:[["only one"]]}]}),/row width mismatch/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"image",assetId:"missing",altText:"Figure"}]}),/missing stimulus image/);
 assert.throws(()=>validateExamPackage({...visualBundle,stimuli:[{id:"shared",kind:"passage",text:"OK",script:"alert(1)"}]}),/unsupported field/);
 assert.throws(()=>validateExamPackage({...visualBundle,assets:[{...asset,contentHash:"0".repeat(64)}]}),/digest mismatch/);
 assert.throws(()=>validateExamPackage({...visualBundle,assets:[{...asset,dataUri:"data:image/png;base64,not real"}]}),/invalid base64/);
});
test("frozen attempt and learning notebook retain media after original package is unavailable",()=>{
 const bundle=validateExamPackage(visualBundle);
 const started=startGenericAttempt(bundle,"historical-visual",1000);
 const question=started.frozen.questions[0];
 assert.deepEqual(started.frozen.stimuli.map(s=>s.id),["shared"]);
 assert.deepEqual(started.frozen.assets.map(a=>a.id),["figure"]);
 assert.equal(started.frozen.assets[0].contentHash,asset.contentHash);
 const completed=transitionGenericAttempt(started,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
 const card=addLearningCard(completed,question.id,new Date(3000).toISOString());
 const archived=JSON.parse(JSON.stringify(card));
 assert.equal(validateLearningCard(archived).assets[0].dataUri,image);
 const saved=JSON.parse(JSON.stringify(completed));
 assert.equal(validateGenericStoredRecord(saved).frozen.assets[0].dataUri,image);
 assert.throws(()=>validateLearningCard({...archived,question:{...question,content:{...question.content,prompt:"Modified"}}}),/hash mismatch/);
});
test("stored result rejects tampered item verdict even with untouched totals",()=>{
 const bundle=validateExamPackage(pkg);
 const initial=startGenericAttempt(bundle,"completed",1000);
 const done=transitionGenericAttempt(initial,{type:"SUBMIT_ATTEMPT",nowMs:2000},
   new Map(bundle.questions.map(q=>[q.id,q])));
 assert.equal(validateGenericStoredRecord(done),done);
 const changed={...done,result:{...done.result,items:[{...done.result.items[0],verdict:"correct"},...done.result.items.slice(1)]}};
 assert.throws(()=>validateGenericStoredRecord(changed),/item verdict/);
 const changedMarks={...done,result:{...done.result,items:[{...done.result.items[0],marks:999},...done.result.items.slice(1)]}};
 assert.throws(()=>validateGenericStoredRecord(changedMarks),/item verdict/);
});
test("display preferences are validated and round-trip through storage",()=>{
 const values=new Map();
 const store={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);}};
 assert.deepEqual(readDisplayPreferences(store),{schema:1,dark:false,scale:100});
 const p=writeDisplayPreferences({schema:1,dark:true,scale:120},store);
 assert.deepEqual(readDisplayPreferences(store),p);
 values.set("practiceDesk.overhaul.settings.v1",'{"schema":1,"dark":false,"scale":500}');
 assert.deepEqual(readDisplayPreferences(store),{schema:1,dark:false,scale:100});
});
