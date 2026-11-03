import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {sha256} from "../src/domain/hash.ts";
import {validateRichDocument,plainRichDocument,canonicalRichDocument,
  RICH_DOCUMENT_LIMITS} from "../src/authoring/rich-document.ts";
const txt=(text,marks)=>({type:"text",text,...(marks?{marks}:{})});
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const options={knownAssetIds:new Set(["fig.01","diagram:2"]),requireNonempty:true};
test("P47-5A original Unicode, HTML-looking strings and TeX dollar markers stay plain",()=>{
 const raw="√(a²+b²), $x+1$, <script>alert(1)</script>";
 const result=plainRichDocument(raw);
 assert.deepEqual(result.blocks,[{type:"paragraph",content:[txt(raw)]}]);
 assert.ok(Object.isFrozen(result.blocks[0]));
});
test("P47-5A normalized source is identical regardless of mark order and input mutation",()=>{
 const original=doc([{type:"paragraph",content:[txt("Probability",["emphasis","strong"])]},
  {type:"display-math",tex:"P(A|B)=P(B|A)P(A)/P(B)",
    linearText:"Probability of A given B"}]);
 const canonical=canonicalRichDocument(original,options);
 assert.equal(canonical,canonicalRichDocument(doc([
  {type:"paragraph",content:[txt("Probability",["strong","emphasis"])]},original.blocks[1]]),options));
 const result=validateRichDocument(original,options);
 original.blocks[0].content[0].text="changed";
 assert.equal(result.blocks[0].content[0].text,"Probability");
 assert.ok(Object.isFrozen(result.blocks[0].content[0].marks));
 assert.equal(sha256(canonical).length,64);
});
test("P47-5A unknown HTML, remote image, malformed node and missing alt are rejected",()=>{
 const cases=[
  doc([{type:"paragraph",content:[{type:"text",text:"ok",onclick:"x()"}]}]),
  doc([{type:"paragraph",content:[{type:"image",assetId:"fig.01",altText:"x",src:"https://evil.invalid/1"}]}]),
  doc([{type:"paragraph",content:[{type:"image",assetId:"fig.01",altText:"x"}]}]),
  doc([{type:"paragraph",content:[{type:"text",text:"ok",marks:["strong","strong"]}]}]),
  doc([{type:"paragraph",content:[{type:"math",tex:"x",linearText:"x",html:"<svg>"}]}]),
  doc([{type:"paragraph",content:[{type:"math",tex:"x",linearText:""}]}]),
  doc([{type:"html",html:"<script>alert(1)</script>"}]),
  doc([{type:"heading",level:1,content:[txt("unsafe")]}]),
  doc([{type:"image",assetId:"https://evil.invalid/a",altText:"x"}])
 ];
 for(const candidate of cases)assert.throws(()=>validateRichDocument(candidate,options));
});
test("P47-5A tables, lists, math nodes and asset IDs form bounded semantic data",()=>{
 const model=doc([
  {type:"table",rows:[[[txt("A")],[{type:"math",tex:"x^2",linearText:"x squared"}]],
    [[txt("B")],[txt("2")]]]},
  {type:"list",ordered:false,items:[[txt("one")],[txt("two")]]},
  {type:"image",assetId:"diagram:2",altText:"labelled geometry diagram"}
 ]);
 const result=validateRichDocument(model,options);
 assert.equal(result.blocks[0].rows[0].length,2);
 assert.equal(result.blocks[2].assetId,"diagram:2");
 assert.throws(()=>validateRichDocument(doc([{type:"table",rows:[[[txt("A")]],[[txt("B")],[txt("C")]]]}])));
});
test("P47-5A budgets and malformed prototypes cannot enter app canonical content",()=>{
 assert.throws(()=>validateRichDocument(doc([{type:"paragraph",content:[txt("x".repeat(RICH_DOCUMENT_LIMITS.maxText+1))]}])));
 assert.throws(()=>validateRichDocument(doc(Array.from({length:RICH_DOCUMENT_LIMITS.maxBlocks+1},
  ()=>({type:"paragraph",content:[]})))));
 assert.throws(()=>validateRichDocument(doc([{type:"display-math",tex:"x".repeat(RICH_DOCUMENT_LIMITS.maxTex+1),
   linearText:"x"}])));
 assert.throws(()=>validateRichDocument(doc([{type:"paragraph",content:[txt(" ")]}]),{requireNonempty:true}));
 assert.throws(()=>validateRichDocument({...doc([]),extra:true}));
 assert.throws(()=>validateRichDocument(Object.assign(Object.create({evil:true}),doc([]))));
});
test("P47-5A app-owned ports import no external vendor or persistence APIs",async()=>{
 for(const path of ["src/authoring/rich-document.ts","src/authoring/vendor-ports.ts",
   "src/learning/scheduler-port.ts"]){
  const source=await readFile(new URL("../"+path,import.meta.url),"utf8");
  for(const vendor of ["from \"wordgard","from \"katex","from \"mathjax","from \"ts-fsrs"]){
   assert.ok(!source.includes(vendor),path+" may not import "+vendor);
  }
  assert.ok(!source.includes("indexedDB")&&!source.includes("localStorage"),path);
 }
});
