import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {sha256} from "../src/domain/hash.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {createCandidateReferenceResource} from "../src/domain/candidate-reference.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {
 CANDIDATE_REFERENCE_QUERY_MAX,candidateReferenceDocumentHTML,candidateReferenceDocumentText,
 candidateReferenceSearchText,filterCandidateReferences,orderedCandidateReferences
} from "../src/app/candidate-reference-panel.ts";

const IMAGE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/4NwAAAAASUVORK5CYII=";
const bytes=Uint8Array.from(atob(IMAGE.split(",")[1]),c=>c.charCodeAt(0));
const asset={id:"reference-diagram",mediaType:"image/png",dataUri:IMAGE,
 contentHash:sha256(bytes),altText:"Verified reference diagram"};
const document={format:"practice-desk-rich",version:1,blocks:[
 {type:"heading",level:2,content:[{type:"text",text:"Conversion reference",marks:["strong"]}]},
 {type:"paragraph",content:[{type:"text",text:"Use the supplied constants exactly as printed."}]},
 {type:"table",rows:[
  [[{type:"text",text:"Quantity"}],[{type:"text",text:"Value"}]],
  [[{type:"text",text:"Length"}],[{type:"text",text:"100 centimetres = 1 metre"}]]
 ]},
 {type:"display-math",tex:"A=\\pi r^2",linearText:"Area equals pi r squared"},
 {type:"image",assetId:"reference-diagram",altText:"Circle radius reference diagram"}
 ]};
const reference=createCandidateReferenceResource({
 id:"quant-reference",title:"Formula and conversion sheet",category:"Quantitative",
 keywords:["formula","conversion","constants"],document,assetIds:["reference-diagram"]
},[asset]);
const law=createCandidateReferenceResource({
 id:"law-reference",title:"Permitted statutory extract",category:"Law",
 keywords:["statute","section"],document:{format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Section 10: candidate-visible statutory wording."}]}
 ]}
});
const clinical=createCandidateReferenceResource({
 id:"clinical-reference",title:"Laboratory ranges",category:"Clinical",
 keywords:["laboratory","range"],document:{format:"practice-desk-rich",version:1,blocks:[
  {type:"table",rows:[
   [[{type:"text",text:"Analyte"}],[{type:"text",text:"Reference range"}]],
   [[{type:"text",text:"Example marker"}],[{type:"text",text:"10–20 units"}]]
  ]}
 ]}
});
function referenceBundle(){
 const refs=[reference,law,clinical];
 const candidateTools={...(pkg.paper.candidateTools??{}),references:[
  {id:law.id,contentHash:law.contentHash},
  {id:reference.id,contentHash:reference.contentHash},
  {id:clinical.id,contentHash:clinical.contentHash}
 ]};
 const base={...pkg.paper,candidateTools};
 const paper={...base,contentHash:paperRevisionHash(base)};
 return validateExamPackage({...pkg,title:"Domain-generic reference paper",paper,assets:[asset],
  candidateReferences:refs,explanations:{...(pkg.explanations??{}),"rev-0":"REVIEWER ONLY SECRET"}});
}

test("reference panel orders by paper bindings and rejects mismatched inventories",()=>{
 const bundle=referenceBundle();
 const ordered=orderedCandidateReferences(bundle.paper.candidateTools.references,bundle.candidateReferences);
 assert.deepEqual(ordered.map(item=>item.id),["law-reference","quant-reference","clinical-reference"]);
 assert.throws(()=>orderedCandidateReferences(bundle.paper.candidateTools.references,[reference,law]),/inventory/);
 assert.throws(()=>orderedCandidateReferences(undefined,[reference]),/inventory/);
});

test("bounded local reference search covers metadata, rich table text, maths and image alternatives",()=>{
 const resources=[reference,law,clinical];
 assert.deepEqual(filterCandidateReferences(resources,"statutory",null).map(x=>x.id),["law-reference"]);
 assert.deepEqual(filterCandidateReferences(resources,"centimetres metre",null).map(x=>x.id),["quant-reference"]);
 assert.deepEqual(filterCandidateReferences(resources,"pi squared",null).map(x=>x.id),["quant-reference"]);
 assert.deepEqual(filterCandidateReferences(resources,"radius diagram",null).map(x=>x.id),["quant-reference"]);
 assert.deepEqual(filterCandidateReferences(resources,"", "Clinical").map(x=>x.id),["clinical-reference"]);
 assert.equal(filterCandidateReferences(resources,"x".repeat(CANDIDATE_REFERENCE_QUERY_MAX+50),null).length,0);
 assert.match(candidateReferenceSearchText(reference),/quantitative/);
 assert.match(candidateReferenceDocumentText(reference.document),/100 centimetres = 1 metre/);
 assert.match(candidateReferenceDocumentText(reference.document),/Area equals pi r squared/);
});

test("reference rich rendering supports authored marks, tables, KaTeX and frozen local images",()=>{
 const html=candidateReferenceDocumentHTML(reference,[asset]);
 assert.match(html,/<strong>Conversion reference<\/strong>/);
 assert.match(html,/aria-label="Reference table"/);
 assert.match(html,/100 centimetres = 1 metre/);
 assert.match(html,/katex/);
 assert.match(html,/data:image\/png;base64,/);
 assert.match(html,/alt="Circle radius reference diagram"/);
 for(const remote of ['src="http://','src="https://','href="http://','href="https://'])
  assert.equal(html.includes(remote),false,"reference renderer must not emit remote image/link resources");
});

test("reference trigger is authored paper policy and is never inferred from an exam title",()=>{
 const bundle=referenceBundle();
 const attempt=startGenericAttempt(bundle,"reference-ui",1000);
 const html=renderModelExam(attempt,bundle);
 assert.match(html,/id="g-references"/);
 assert.match(html,/References <span aria-hidden="true">\(3\)<\/span>/);

 const named={...pkg,title:"USMLE CAT PFRDA reference-looking title only"};
 const plainAttempt=startGenericAttempt(validateExamPackage(named),"no-reference-ui",1000);
 const plain=renderModelExam(plainAttempt,named);
 assert.doesNotMatch(plain,/id="g-references"/);
 assert.equal(plainAttempt.frozen.candidateReferences.length,0);
});
