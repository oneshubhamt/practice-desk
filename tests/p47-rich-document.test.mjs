import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateRichDocument,plainRichDocument,canonicalRichDocument,RICH_LIMITS} from "../src/authoring/rich-document.ts";
const doc=blocks=>({format:"practice-desk-rich",version:1,blocks});
const txt=(text,marks)=>({type:"text",text,...(marks?{marks}:{})});
const assets={knownAssets:new Set(["fig-1"])};
test("P47-5A legacy text stays literal, including dollar notation and HTML",()=>{
  const s="√(a²+b²) $x+1$ <script>alert(1)</script>";
  assert.deepEqual(plainRichDocument(s).blocks,[{type:"paragraph",content:[txt(s)]}]);
});
test("P47-5A canonical immutable normalized marks and explicit math",()=>{
  const a=doc([{type:"paragraph",content:[txt("P",["emphasis","strong"])]},
    {type:"display-math",tex:"\\frac12",linearText:"one half"}]);
  const b=doc([{type:"paragraph",content:[txt("P",["strong","emphasis"])]},a.blocks[1]]);
  assert.equal(canonicalRichDocument(a),canonicalRichDocument(b));
  const result=validateRichDocument(a);
  a.blocks[0].content[0].text="mutated";
  assert.equal(result.blocks[0].content[0].text,"P");
  assert.ok(Object.isFrozen(result.blocks[0].content));
});
test("P47-5A rectangles, local assets and lists are canonical",()=>{
  const a=doc([
    {type:"table",rows:[[[txt("a")],[{type:"math",tex:"x^2",linearText:"x squared"}]]]},
    {type:"image",assetId:"fig-1",altText:"labelled diagram"},
    {type:"list",ordered:true,items:[[txt("i")],[txt("ii")]]}
  ]);
  assert.equal(validateRichDocument(a,assets).blocks.length,3);
  assert.throws(()=>validateRichDocument(a));
});
test("P47-5A rejects active HTML, remote assets and untrusted fields",()=>{
  const cases=[
    doc([{type:"paragraph",content:[{type:"text",text:"OK",onclick:"evil()"}]}]),
    doc([{type:"paragraph",content:[{type:"math",tex:"x",linearText:"x",html:"bad"}]}]),
    doc([{type:"image",assetId:"https://evil",altText:"bad"}]),
    doc([{type:"paragraph",content:[txt("x",["strong","strong"])]}]),
    doc([{type:"heading",level:1,content:[txt("No")]}]),
    doc([{type:"table",rows:[[[txt("a")]],[[txt("b")],[txt("c")]]]}])
  ];
  for(const value of cases)assert.throws(()=>validateRichDocument(value,assets));
});
test("P47-5A rejects budget overflow and prototype-inherited metadata",()=>{
  assert.throws(()=>validateRichDocument(doc([{type:"display-math",tex:"x".repeat(RICH_LIMITS.tex+1),linearText:"x"}])));
  assert.throws(()=>validateRichDocument(doc(Array.from({length:RICH_LIMITS.blocks+1},()=>({type:"paragraph",content:[]})))));
  assert.throws(()=>validateRichDocument(Object.assign(Object.create({unsafe:1}),doc([]))));
});
test("P47-5A app-owned ports do not import vendors, persist data or mutate application engines",async()=>{
  for(const path of ["src/authoring/vendor-ports.ts","src/learning/scheduler-port.ts","src/authoring/rich-document.ts"]){
    const content=await readFile(new URL("../"+path,import.meta.url),"utf8");
    for(const vendor of ["from \"wordgard","from \"katex","from \"ts-fsrs"])
      assert.ok(!content.includes(vendor),path+" imports vendor "+vendor);
    assert.ok(!content.includes("indexedDB")&&!content.includes("localStorage"));
  }
});
