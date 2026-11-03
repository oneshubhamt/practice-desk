import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {newAuthoringDraft,newAuthoringQuestion,validateAuthoringDraft,validateAuthoringShelf,AUTHORING_KEY} from "../src/authoring/authoring-draft.ts";
import {plainRichDocument} from "../src/domain/rich-document.ts";
import {decodeAuthorAtom,encodeAuthorAtom,richToWordgardHTML} from "../src/authoring/wordgard-document-bridge.ts";
test("P47-5C draft is not a published paper or answer key and covers six kinds",()=>{
 const kinds=["single-choice","multiple-select","numeric-entry","true-false","matching","free-response"];
 const a=newAuthoringDraft();
 const s=validateAuthoringDraft({...a,questions:kinds.map(kind=>newAuthoringQuestion(kind))});
 assert.equal(s.questions.length,6);
 assert.ok(!("contentHash" in s));
 assert.ok(!("frozen" in s));
 assert.ok(!("score" in s));
 assert.equal(AUTHORING_KEY,"practiceDesk.authoring.drafts.v1");
});
test("P47-5C app-owned draft rejects malicious, duplicate and malformed content",()=>{
 const a=newAuthoringDraft();
 const q=a.questions[0];
 for(const x of [
  {...a,unexpected:"<script>"},
  {...a,questions:[]},
  {...a,questions:[q,q]},
  {...a,questions:[{...q,kind:"custom-script"}]},
  {...a,questions:[{...q,prompt:{...q.prompt,html:"<iframe>"}}]},
  {...a,marksIncorrect:Infinity},
  {...a,assets:[{id:"url",dataUri:"https://external.example/image"}]}
 ])assert.throws(()=>validateAuthoringDraft(x));
});
test("P47-5C shelf is independent of exam attempts and blocks unknown active IDs",()=>{
 const d=newAuthoringDraft();
 const s=validateAuthoringShelf({schema:1,activeId:d.id,drafts:[d]});
 assert.equal(s.drafts[0].questions[0].kind,"single-choice");
 assert.throws(()=>validateAuthoringShelf({schema:1,activeId:"unknown",drafts:[d]}));
});
test("P47-5C math and local image tokens never contain remote URLs or execute HTML",()=>{
 const a={type:"math",tex:"x^2",linearText:"x squared"};
 assert.deepEqual(decodeAuthorAtom(encodeAuthorAtom(a)),a);
 assert.throws(()=>decodeAuthorAtom(encodeAuthorAtom({type:"xss",code:"evil"})));
 assert.throws(()=>decodeAuthorAtom("invalid percent %"));
 const doc=plainRichDocument("<script>alert(1)</script>");
 const html=richToWordgardHTML(doc,new Set());
 assert.ok(html.includes("&lt;script&gt;"));
 assert.ok(!html.includes("<script>"));
});
test("P47-5C vendor is quarantined to adapter; no global published schema or FSRS changes",async()=>{
 const paths=["src/authoring/authoring-draft.ts","src/authoring/authoring-studio.ts",
  "src/authoring/wordgard-document-bridge.ts","src/authoring/vendor-ports.ts"];
 for(const path of paths){
  const source=await readFile(new URL("../"+path,import.meta.url),"utf8");
  assert.doesNotMatch(source,/from "wordgard\//,path+" may not reach vendor code");
 }
 const adapter=await readFile(new URL("../src/authoring/wordgard-adapter.ts",import.meta.url),"utf8");
 assert.match(adapter,/from "wordgard\/editor"/);
 assert.doesNotMatch(adapter,/indexedDB|createExamPackage|scoreAttempt|localStorage/);
});
