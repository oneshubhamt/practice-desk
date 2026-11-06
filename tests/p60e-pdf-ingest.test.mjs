/** P60-E: no-PDF-parser intake protocol; all semantic/page claims remain external.
 * Fixtures exercise the same canonical authoring, P60-C and P60-D CLIs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile,writeFile,mkdtemp,rm,readdir,access} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createHash} from "node:crypto";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {auditPdfIntake,buildPdfIntakeTemplate} from "../scripts/pdf-ingest.mjs";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";

const tool=fileURLToPath(new URL("../scripts/pdf-ingest.mjs",import.meta.url));
const editorial=fileURLToPath(new URL("../scripts/editorial-editions.mjs",import.meta.url));
const quality=fileURLToPath(new URL("../scripts/question-quality.mjs",import.meta.url));
const sha=v=>createHash("sha256").update(v).digest("hex");
const sandbox=async fn=>{const folder=await mkdtemp(join(tmpdir(),"pd-p60e-"));
 try{return await fn(folder);}finally{await rm(folder,{recursive:true,force:true});}};
const save=async(dir,name,v)=>{const f=join(dir,name);
 await writeFile(f,typeof v==="string"||Buffer.isBuffer(v)?v:JSON.stringify(v));return f;};
const run=(script,...args)=>{
 const p=spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:60000,maxBuffer:2*1024*1024});
 assert.equal(p.error,undefined,String(p.error));
 let data;try{data=JSON.parse(p.stdout||p.stderr);}
 catch{assert.fail("Invalid CLI JSON: "+p.stdout+" / "+p.stderr)}
 return {...p,data};
};
// Actually structured, small, two-page PDF fixture with a shared passage, a table,
// a TeX exercise and a figure; the software checks bytes, not visual equivalence.
function pdf(pages){
 const objects=[null,"<< /Type /Catalog /Pages 2 0 R >>",null];
 const content=[];
 let next=3,ids=[];
 for(const text of pages){
  const page=next++,stream=next++;
  ids.push(page);
  const escaped=text.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)");
  const line="BT /F1 12 Tf 48 700 Td ("+escaped+") Tj ET";
  objects[page]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 "+
    (3+pages.length*2)+" 0 R >> >> /Contents "+stream+" 0 R >>";
  objects[stream]="<< /Length "+Buffer.byteLength(line)+" >>\nstream\n"+line+"\nendstream";
 }
 const fontId=3+pages.length*2;
 objects[2]="<< /Type /Pages /Kids ["+ids.map(v=>v+" 0 R").join(" ")+"] /Count "+pages.length+" >>";
 objects[fontId]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
 let out="%PDF-1.4\n",offsets=[0];
 for(let i=1;i<objects.length;i++){
  offsets[i]=Buffer.byteLength(out);out+=i+" 0 obj\n"+objects[i]+"\nendobj\n";
 }
 const xref=Buffer.byteLength(out);out+="xref\n0 "+objects.length+"\n0000000000 65535 f \n";
 for(let i=1;i<objects.length;i++)out+=String(offsets[i]).padStart(10,"0")+" 00000 n \n";
 out+="trailer\n<< /Root 1 0 R /Size "+objects.length+" >>\nstartxref\n"+xref+"\n%%EOF\n";
 return Buffer.from(out);
}
async function fixture(){
 const bank=JSON.parse(await readFile(new URL("../examples/ai-first-cat.json",import.meta.url),"utf8"));
 bank.bankId="p60e-extraction-synthetic";
 bank.paperId="p60e-synthetic";
 for(let i=0;i<bank.questions.length;i++)bank.questions[i].provenance={
  kind:"reconstruction",sourceNote:"Synthetic two-page PDF fixture; printed item "+(i+1)+" on page "+(i<2?1:2)};
 const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
 bank.media=[{id:"diagram-1",dataUri:"data:image/png;base64,"+png,altText:"Schematic figure"}];
 bank.stimuli.push({id:"figure-one",kind:"image",mediaRef:"diagram-1",altText:"Schematic figure"});
 bank.questions.push({id:"figure-q",examSection:"qa",subject:"Quantitative Aptitude",
  kind:"single-choice",prompt:"What does the schematic depict?",stimulusRef:"figure-one",
  options:["A square","A circle","A triangle","A line"],answer:"A",
  explanation:"Synthetic image fixture; answer is test-only, not optically verified.",
  provenance:{kind:"reconstruction",sourceNote:"Synthetic two-page PDF figure, printed item 4 page 2"},
  qa:{status:"unchecked"}});
 bank.questions[2].prompt={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Evaluate "},{type:"math",tex:"2+2",linearText:"two plus two"}]}]};
 assert.equal(inspectExternalQuestionBank(bank).valid,true);
 const raw=JSON.stringify(bank),doc=pdf([
  "CAT practice fixture page 1: shared passage and DILR table; item 1 and item 2.",
  "CAT practice fixture page 2: mathematics 2+2, schematic figure, item 3 and item 4; printed key A B C A."
 ]);
 const bytes={sha256:sha(doc),byteLength:doc.length};
 const manifest=buildPdfIntakeTemplate(bank,raw,null,bytes);
 Object.assign(manifest.document,{title:"Synthetic CAT examination with passage/table/math/diagram",
  pageCount:2,inspectedPages:[1,2],
  identityNote:"Test-produced synthetic document; not a PYQ or institutional publisher"});
 manifest.documentInventoryStatus="checked-against-source";
 manifest.externalVerification="recorded-agent-check";
 manifest.inspector={kind:"agent",id:"synthetic-regression-agent",
  method:"Synthetic test compares page references, not independently verified PDF wording",
  reviewedAt:"2026-11-06"};
 manifest.questions.forEach((q,i)=>Object.assign(q,{
  pages:[i<2?1:2],status:"source-compared",printedNumber:String(i+1),
  keyOrigin:"source-document",keyPages:[2],mathStatus:"source-compared",explanationOrigin:"editorial-not-in-source",
  notes:"Synthetic fixture comparison claim; no actual OCR or source proof"}));
 manifest.stimuli.forEach((s,i)=>Object.assign(s,{pages:[i===0?1:i===1?1:2],
  status:"source-compared",notes:"Synthetic fixture page-linked stimulus"}));
 manifest.media.forEach(m=>Object.assign(m,{pages:[2],status:"source-compared",
  visualStatus:"source-compared",notes:"Synthetic figure visually compared in test claim"}));
 return {bank,raw,doc,bytes,manifest};
}
const audit=async x=>auditPdfIntake(x.manifest,x.bank,x.raw,x.bytes);
test("P60-E extracted mixed page, shared passage/table, TeX and embedded figure have complete page-bound ledger",async()=>{
 const x=await fixture(),r=await audit(x);
 assert.equal(r.valid,true,JSON.stringify(r.issues.items));
 assert.equal(r.readyForPublication,false,"No reviewed P60-C/D gate supplied");
 assert.equal(r.stage,"transcription-only");
 assert.equal(r.questionCount,4);
 assert.equal(r.sourceElementsChecked,8);
 assert.equal(r.factualVerification,"not-performed");
 assert.equal(r.actualPdfTextComparison,"not-performed-by-software");
 assert.ok(!JSON.stringify(r).includes("data:image"));
 assert.ok(!JSON.stringify(r).includes("answer"));
});
test("P60-E missing page, duplicate numbering and cropped/uncertain maths or figure fail closed",async()=>{
 const fresh=await fixture();
 for(const mutate of [
  m=>{m.document.inspectedPages=[1];m.document.missingPages=[2];},
  m=>{m.questions[3].printedNumber="3";},
  m=>{m.questions[2].mathStatus="not-applicable";},
  m=>{m.media[0].visualStatus="unchecked";},
  m=>{m.stimuli[1].uncertainties=["Table header cropped"];},
  m=>{m.questions[0].keyOrigin="unavailable";},
  m=>{m.original.omissions=["item-5"];},
  m=>{m.documentInventoryStatus="unchecked";},
  m=>{m.questions[1].pages=[3];},
  m=>{m.questions[0].explanationOrigin="unverified";},
  m=>{m.inspector.id="";},
  m=>{m.questions[0].pages=[2];},
  m=>{m.inspector.kind="human";},
  m=>{m.document.title="REPLACE WITH EXACT DOCUMENT TITLE";},
  m=>{m.stimuli[0].mathStatus="unchecked";}
 ]){
  const x=structuredClone(fresh);mutate(x.manifest);
  try{assert.equal((await audit(x)).valid,false);}
  catch(e){assert.match(e.message,/page|number|list|source|intake|key|math|figure|inspector|string/i);}
 }
});
test("P60-E original/source-document mismatch, stale individual revision and forged identity cannot silently pass",async()=>{
 const original=await fixture();
 for(const mutate of [
  x=>x.bytes.sha256="0".repeat(64),
  x=>{x.bank.questions[0].prompt="An unreviewed modified question";x.raw=JSON.stringify(x.bank);},
  x=>x.manifest.original.sourceSha256="f".repeat(64),
  x=>x.manifest.questions.pop(),
  x=>x.manifest.stimuli.push({...x.manifest.stimuli[0]}),
  x=>{x.manifest.questions[0].status="source-compared";x.manifest.questions[0].sha256="1".repeat(64);},
  x=>{x.bank.questions[0].provenance.kind="official-pyq";x.raw=JSON.stringify(x.bank);
   x.manifest.original.sourceSha256=sha(x.raw);x.manifest.questions[0].sha256=sha(JSON.stringify(x.bank.questions[0]));}
 ]){
  const x=structuredClone(original);mutate(x);
  assert.equal((await audit(x)).valid,false);
 }
});
test("P60-E CLI template is explicitly incomplete and does not reveal keys, audit uses byte-bound source, safe on corrupt PDFs",()=>sandbox(async dir=>{
 const x=await fixture();
 const paper=await save(dir,"paper.pdf",x.doc),original=await save(dir,"original.json",x.raw);
 const t=run(tool,"template",original,paper);
 assert.equal(t.status,0,t.stderr);
 assert.equal(t.data.questions[0].status,"unchecked");
 assert.equal(t.data.questions[0].keyOrigin,"unavailable");
 assert.ok(!t.stdout.includes("data:image"));
 assert.ok(!t.stdout.includes("A square"));
 const manifest=await save(dir,"intake.json",x.manifest);
 const a=run(tool,"audit",manifest,original,paper);
 assert.equal(a.status,0,a.stderr);
 assert.equal(a.data.valid,true);
 assert.equal(a.data.readyForPublication,false);
 const wrong=await save(dir,"wrong.pdf",pdf(["Different but still well-formed PDF"]));
 const mismatch=run(tool,"audit",manifest,original,wrong);
 assert.equal(mismatch.status,1);assert.ok(mismatch.data.issues.items.some(v=>v.code==="document-digest-mismatch"));
 const corrupt=await save(dir,"corrupt.pdf","%PDF-1.4\ncorrupted without trailer");
 const fail=run(tool,"audit",manifest,original,corrupt);
 assert.equal(fail.status,2);assert.equal(fail.data.code,"pdf-intake-input-invalid");
}));
test("P60-E strict compile delegates P60-D without rewriting original, and cannot publish stale decisions",()=>sandbox(async dir=>{
 const x=await fixture(),original=await save(dir,"original.json",x.raw);
 const pdfPath=await save(dir,"paper.pdf",x.doc),manifest=await save(dir,"intake.json",x.manifest);
 const reviewed=structuredClone(x.bank);
 reviewed.revision=2;
 reviewed.questions[0].answer="B";
 reviewed.questions[0].explanation="In the synthetic fixture, item 1 is intentionally disputed and has a reviewed choice.";
 const reviewedPath=await save(dir,"reviewed.json",reviewed);
 const d=run(editorial,"template",original,reviewedPath);
 assert.equal(d.status,0,d.stderr);
 const decisions=structuredClone(d.data);delete decisions.templateIncomplete;
 for(const row of decisions.entries){row.disposition="corrected";
  row.reason="Synthetic disputed answer adjudicated for software regression; no real source authenticated.";
  row.evidence=[{publisher:"Fixture",title:"Synthetic correction note",
   locator:"page 1 item "+row.questionId,sourceNote:"Test only; source paper not authenticated"}];}
 const decisionsPath=await save(dir,"decisions.json",decisions);
 const candidate=run(quality,"candidate",reviewedPath);
 assert.equal(candidate.status,0,candidate.stderr);
 const checklist=run(quality,"checklist");
 const review={format:"practice-desk-quality-review",version:1,bankId:reviewed.bankId,
  sourceSha256:candidate.data.sourceSha256,records:candidate.data.items.map(row=>{
   const q=reviewed.questions.find(q=>q.id===row.questionId);
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:row.candidateSha256,
    reviewer:{id:"synthetic-agent-reviewer",kind:"ai"},
    independentSolution:{blindClaim:true,answer:String(q.answer),
     reasoning:"Synthetic review assertion for software tests, not external proof."},
    checks:checklist.data.checklist.map((c,i)=>({id:c.id,status:"pass",
      basis:[11,12,13].includes(i)?"source-consulted":i===19?"rendered-claim":"independent-editorial",
      rationale:"Synthetic QA statement for a regression fixture, not source certification."})),
    evidence:[{publisher:"Fixture",title:"Synthetic sample",
      locator:"paper page 1",retrievedAt:"2026-11-06",
      excerpt:"Test-only statement; no external source content checked."}]};
  })};
 const reviewPath=await save(dir,"review.json",review);
 const out=join(dir,"compiled");
 const before=run(tool,"audit",manifest,original,pdfPath,"--reviewed",reviewedPath,
  "--decisions",decisionsPath,"--quality-review",reviewPath);
 assert.equal(before.status,0,JSON.stringify(before.data));
 assert.equal(before.data.readyForPublication,true);
 const result=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  decisionsPath,out,"--quality-review",reviewPath);
 assert.equal(result.status,0,JSON.stringify(result.data));
 assert.equal(result.data.compiled,true);
 assert.deepEqual((await readdir(out)).sort(),["editorial-lineage.json","original-source.json",
  "pdf-intake-provenance.json","reviewed-source.json","reviewed.exam.json","source.exam.json"]);
 assert.equal(await readFile(join(out,"original-source.json"),"utf8"),x.raw);
 const note=JSON.parse(await readFile(join(out,"pdf-intake-provenance.json"),"utf8"));
 assert.equal(note.document.sha256,x.bytes.sha256);
 const source=JSON.parse(await readFile(join(out,"source.exam.json"),"utf8"));
 const corrected=JSON.parse(await readFile(join(out,"reviewed.exam.json"),"utf8"));
 assert.equal(source.paper.edition,"source");assert.equal(corrected.paper.edition,"reviewed");
 const attempted=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  decisionsPath,out,"--quality-review",reviewPath);
 assert.notEqual(attempted.status,0,"Never overwrite published pair");
 const stale={...decisions,originalSha256:"e".repeat(64)};
 const stalePath=await save(dir,"stale.json",stale),notCreated=join(dir,"no-out");
 const rejected=run(tool,"compile",manifest,original,pdfPath,reviewedPath,
  stalePath,notCreated,"--quality-review",reviewPath);
 assert.equal(rejected.status,1);
 await assert.rejects(access(notCreated));
}));


test("P60-E source-page tokens do not accept page 10 as citation of page 1; shared TeX must be compared",async()=>{
 const x=await fixture();
 x.bank.questions[0].provenance.sourceNote="Synthetic transcription on printed item 1 of page 10.";
 x.raw=JSON.stringify(x.bank);
 x.manifest.original.sourceSha256=sha(x.raw);
 x.manifest.questions[0].sha256=sha(JSON.stringify(x.bank.questions[0]));
 const report=await audit(x);
 assert.equal(report.valid,false);
 assert.ok(report.issues.items.some(e=>e.code==="source-note-page-mismatch"),JSON.stringify(report.issues));
 const y=await fixture();
 y.bank.stimuli[0].text={format:"practice-desk-rich",version:1,blocks:[
  {type:"paragraph",content:[{type:"text",text:"Source text "},{type:"math",tex:"x^2+1",linearText:"x squared plus one"}]}]};
 y.raw=JSON.stringify(y.bank);
 y.manifest.original.sourceSha256=sha(y.raw);
 y.manifest.stimuli[0].sha256=sha(JSON.stringify(y.bank.stimuli[0]));
 const result=await audit(y);
 assert.equal(result.valid,false);
 assert.ok(result.issues.items.some(e=>e.code==="stimulus-math-unverified"),JSON.stringify(result.issues));
});
test("P60-E actual separate printed-key bytes and image document mode require explicit source/key identity",()=>sandbox(async dir=>{
 const x=await fixture(),original=await save(dir,"original.json",x.raw),
  source=await save(dir,"paper.pdf",x.doc);
 const separateKey=await save(dir,"printed-key.pdf",pdf(["Synthetic paper key A B C D"]));
 const templated=run(tool,"template",original,source,"--key-document",separateKey);
 assert.equal(templated.status,0,templated.stderr);
 assert.equal(templated.data.keyDocument.type,"pdf");
 assert.equal(templated.data.keyDocument.sha256,sha(await readFile(separateKey)));
 const manifest=structuredClone(x.manifest);
 manifest.keyDocument={...templated.data.keyDocument,title:"Synthetic separately printed key",
  pageCount:1,inspectedPages:[1],missingPages:[],identityNote:"Synthetic test key from a separate document"};
 for(const q of manifest.questions){q.keyOrigin="key-document";q.keyPages=[1];}
 const input=await save(dir,"separate-intake.json",manifest);
 const accepted=run(tool,"audit",input,original,source,"--key-document",separateKey);
 assert.equal(accepted.status,0,JSON.stringify(accepted.data));
 assert.equal(accepted.data.valid,true);
 const missingKey=run(tool,"audit",input,original,source);
 assert.equal(missingKey.status,1);
 assert.ok(missingKey.data.issues.items.some(e=>e.code==="key-file-required"));
 const corruptKey=await save(dir,"altered-key.pdf",pdf(["An entirely different printed key"]));
 const mismatch=run(tool,"audit",input,original,source,"--key-document",corruptKey);
 assert.equal(mismatch.status,1);
 assert.ok(mismatch.data.issues.items.some(e=>e.code==="document-digest-mismatch"));
 const png=Buffer.from(x.bank.media[0].dataUri.split(",")[1],"base64");
 const image=await save(dir,"scan.png",png);
 const imageTemplate=run(tool,"template",original,image,"--document-type","image");
 assert.equal(imageTemplate.status,0,JSON.stringify(imageTemplate.data));
 assert.equal(imageTemplate.data.document.type,"image");
 assert.equal(imageTemplate.data.document.sha256,sha(png));
 const fakeRiff=await save(dir,"bad.webp",Buffer.from("RIFFjunkjunk"));
 const rejected=run(tool,"template",original,fakeRiff,"--document-type","image");
 assert.equal(rejected.status,2);
 assert.ok(rejected.data.message.includes("signature"));
}));
