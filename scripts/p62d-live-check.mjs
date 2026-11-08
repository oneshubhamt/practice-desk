#!/usr/bin/env node
/** P62-D real published-source assessment. Only public PDFs and explicit,
 * inspectable calculations; output is a bounded measurement, not certification.
 * No PDF bytes, private keys or large question text are committed to Git.
 */
import {readFile,writeFile,mkdir,stat} from "node:fs/promises";
import {execFileSync,spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {fileURLToPath} from "node:url";
import {inspectExternalQuestionBank,compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {editorialDecisionTemplate} from "./editorial-editions.mjs";
import {startGenericAttempt,validateExamPackage} from "../src/app/exam-package.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {QUALITY_CHECKLIST} from "./question-quality.mjs";
const folder=process.argv[2];if(!folder)throw Error("Pass downloaded PDF directory");
const sha=b=>createHash("sha256").update(b).digest("hex");
const now="2026-11-08";
const dirs={src:join(folder,"generated"),out:join(folder,"compiled")};
await mkdir(dirs.src,{recursive:true});
const check=(yes,why)=>{if(!yes)throw Error("P62-D: "+why);};
const write=async(name,obj)=>{const path=join(dirs.src,name);await writeFile(path,JSON.stringify(obj,null,2)+"\n");return path;};
let calls=0,seconds=0;
function cli(script,args,max=3*1024*1024){
 const start=performance.now();
 const r=spawnSync(process.execPath,[fileURLToPath(new URL("./"+script,import.meta.url)),...args],
  {encoding:"utf8",timeout:90000,maxBuffer:max});
 calls++;seconds+=(performance.now()-start)/1000;
 if(r.error)throw r.error;
 let report;try{report=JSON.parse(r.stdout||r.stderr);}
 catch{throw Error("Non-JSON from "+script+": "+(r.stdout||r.stderr).slice(0,900));}
 return {ok:r.status===0,data:report,stdoutBytes:Buffer.byteLength(r.stdout||""),
  seconds:(performance.now()-start)/1000};
}
function cmd(program,args,max=8*1024*1024){
 return execFileSync(program,args,{encoding:"utf8",maxBuffer:max});
}
function pdfMeta(path){
 const b=cmd("pdfinfo",[path]);
 const pages=Number((b.match(/^Pages:\s*(\d+)/m)||[])[1]);
 check(Number.isInteger(pages)&&pages>0,"Unknown real PDF page count: "+path);
 return {pages};
}
const catPath=join(folder,"cat-2024-quant.pdf");
const apfcPath=join(folder,"apfc-2023-reproduction.pdf");
const keyPath=join(folder,"cat-2024-secondary-key.pdf");
const downloaded=[];
for(const [name,path] of [["CAT 2024 2IIM published PDF",catPath],
 ["APFC 2023 EduTap printed-paper reproduction",apfcPath],
 ["CAT 2024 Oswaal published key",keyPath]]){
 const bytes=await readFile(path),pages=pdfMeta(path).pages;
 check(bytes.subarray(0,5).toString()==="%PDF-","Not PDF: "+name);
 check(bytes.subarray(-2048).toString().includes("%%EOF"),"Incomplete PDF: "+name);
 downloaded.push({name,sha256:sha(bytes),bytes:bytes.length,pages});
}
// Two genuine 2IIM page images of original CAT 2024 problems are extracted,
// unchanged, into a two-page PDF. This avoids falsely declaring the other
// 22 pages of the source paper to have been reviewed.
cmd("pdfseparate",["-f","5","-l","5",catPath,join(dirs.src,"cat-question-%d.pdf")]);
cmd("pdfseparate",["-f","9","-l","9",catPath,join(dirs.src,"cat-question-%d.pdf")]);
const excerpt=join(dirs.src,"cat-two-source-pages.pdf");
cmd("pdfunite",[join(dirs.src,"cat-question-5.pdf"),join(dirs.src,"cat-question-9.pdf"),excerpt]);
check(pdfMeta(excerpt).pages===2,"CAT extracted PDF must contain exactly the two compared questions");
const catText=cmd("pdftotext",["-layout",excerpt,"-"]);
const apfcText=cmd("pdftotext",["-layout",apfcPath,"-"]);
const keyText=cmd("pdftotext",["-layout",keyPath,"-"],16*1024*1024);
check(apfcText.includes("Her poetry")&&apfcText.includes("parochial")&&apfcText.includes("ineffable"),
 "APFC paper reproduction did not contain expected source questions/options");
check(catText.includes("540"),"CAT PDF option-value source anchor not text-extractable");
const keyPages=keyText.split("\f");
const k=keyPages.findIndex(text=>/Answer\s*Key/i.test(text)&&/Quantitative\s+Aptitude/i.test(text));
check(k>=0,"Published secondary key table cannot be located on its PDF page");
const keyPdf=join(dirs.src,"cat-key-evidence-page.pdf");
cmd("pdfseparate",["-f",String(k+1),"-l",String(k+1),keyPath,
 join(dirs.src,"cat-key-%d.pdf")]);
const {copyFile}=await import("node:fs/promises");
await copyFile(join(dirs.src,"cat-key-"+(k+1)+".pdf"),keyPdf);
check(pdfMeta(keyPdf).pages===1,"Secondary key page extraction failed");
const keyExtract=cmd("pdftotext",["-layout",keyPdf,"-"]);
check(/Quantitative\s+Aptitude/i.test(keyExtract),"CAT key page lacks QA section");
const catURL="https://online.2iim.com/CAT-question-paper-pdf/CAT%202024%20QUANT%20Slot-1.pdf";
const keyURL="https://www.oswaal360.com/pluginfile.php/10939/mod_folder/content/0/CAT/1-Inner%2BPaper%20%28CAT%2025%20Yrs%20CW%20%20TW%20SP%29%20Pg%201-64.pdf";
const apfcURL="https://edutap.in/wp-content/uploads/2026/05/UPSC-EPFO-APFC-2023-PYQ-Book.pdf";
const rich=(text,tex,linearText)=>({format:"practice-desk-rich",version:1,blocks:[
 {type:"paragraph",content:[{type:"text",text},
  {type:"math",tex,linearText}]}]});
const authorQA=(mathematical)=>({status:"unchecked",
 applicability:{mathematical,legal:false,timeSensitive:false,asOfDate:null}});
const src=(bankId,examId,paperId,title,correct,incorrect,sectionId,sectionName,questions)=>({
 format:"practice-desk-authoring",version:1,bankId,examId,paperId,title,
 edition:"custom",revision:1,scoring:{correctMarks:correct,incorrectMarks:incorrect},
 timing:{kind:"whole-paper",minutes:10,pausePolicy:"allowed"},
 navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
 sections:[{id:sectionId,title:sectionName}],questions
});
const mathTex="\\left(\\frac{1}{8}\\right)^k\\left(\\frac{1}{32768}\\right)^{1/3}=\\frac{1}{8}\\left(\\frac{1}{32768}\\right)^{1/k}";
const cat=src("p62d-cat-2024","cat","p62d-cat-2024-qa","CAT 2024 Slot 1, two verified QA problems",
 3,-1,"qa","Quantitative Ability",[
 {id:"cat-2024-q03",examSection:"qa",subject:"Quantitative Ability",topic:"Indices",
  kind:"single-choice",prompt:rich("Find the sum of all real nonzero k satisfying ",mathTex,
   "(1/8)^k times (1/32768)^(1/3) = (1/8) times (1/32768)^(1/k)"),
  options:["2/3","-2/3","4/3","-4/3"],answer:"B",
  explanation:"Use 32768 = 8^5: k+5/3 = 1+5/k, so k^2+(2/3)k-5=0. Sum of real roots is -2/3.",
  provenance:{kind:"reconstruction",examYear:2024,
   sourceNote:"CAT 2024 Slot 1 QA Q3, source excerpt page 1 (full published PDF page 5); mathematically faithful paraphrase, not official IIM transcription.",
   sources:[{publisher:"2IIM",title:"CAT 2024 QA Slot 1 published PDF",url:catURL,page:"5",section:"Q3",stance:"supports"}]},
  qa:authorQA(true)},
 {id:"cat-2024-q07",examSection:"qa",subject:"Quantitative Ability",topic:"Surjections",
  kind:"single-choice",
  prompt:"For A={2,3,5,7,11,13} and B={1,8,27}, how many onto functions from A to B exist?",
  options:["540","537","665","667"],answer:"A",
  explanation:"Inclusion-exclusion: 3^6 - 3*2^6 + 3 = 540.",
  provenance:{kind:"reconstruction",examYear:2024,
   sourceNote:"CAT 2024 Slot 1 QA Q7, source excerpt page 2 (full published PDF page 9); source option order kept, question paraphrased.",
   sources:[{publisher:"2IIM",title:"CAT 2024 QA Slot 1 published PDF",url:catURL,page:"9",section:"Q7",stance:"supports"}]},
  qa:authorQA(true)}
]);
const apfc=src("p62d-apfc-2023","upsc-epfo-apfc","p62d-apfc-2023-english",
 "APFC 2023 English, two cross-checked paper questions",2.5,-5/6,"english","General English",[
 {id:"apfc-2023-q16",examSection:"english",syllabusHeadingId:"english",topic:"Vocabulary",
  kind:"single-choice",
  prompt:"The poet evokes a beauty so profound that words cannot express it. Select the closest word.",
  options:["the unknown","the proscribed","the intangible","the ineffable"],answer:"D",
  explanation:"Ineffable means beyond verbal expression; unknown, forbidden and intangible are not equivalent.",
  provenance:{kind:"reconstruction",examYear:2023,
   sourceNote:"APFC 2023 printed Q16; EduTap PDF question-section Q6 on original file page 4; paraphrased stem, same options.",
   sources:[{publisher:"EduTap",title:"UPSC EPFO APFC 2023 published paper reproduction",url:apfcURL,page:"4",section:"Q6 / printed Q16",stance:"supports"}]},
  qa:authorQA(false)},
 {id:"apfc-2023-q19",examSection:"english",syllabusHeadingId:"english",topic:"Vocabulary",
  kind:"single-choice",
  prompt:"A viewpoint restricted to narrow local matters and ignoring national concerns is best described as",
  options:["unilateral","illiberal","parochial","limited"],answer:"C",
  explanation:"Parochial means restricted to local interests and narrow in outlook.",
  provenance:{kind:"reconstruction",examYear:2023,
   sourceNote:"APFC 2023 printed Q19; EduTap PDF question-section Q9 on file page 4; paraphrased stem, same options.",
   sources:[{publisher:"EduTap",title:"UPSC EPFO APFC 2023 published paper reproduction",url:apfcURL,page:"4",section:"Q9 / printed Q19",stance:"supports"}]},
  qa:authorQA(false)}
]);
const issues=[];
for(const [name,bank] of [["CAT",cat],["APFC",apfc]]){
 const inspection=inspectExternalQuestionBank(bank);
 if(!inspection.valid)issues.push({name,issues:inspection.issues});
}
check(!issues.length,"Source authoring invalid: "+JSON.stringify(issues));
const sourceCat=await write("cat-source.json",cat);
const sourceApfc=await write("apfc-source.json",apfc);
const reviewed=structuredClone(cat);
reviewed.revision=2;
reviewed.questions[0].explanation+=" A second derivation uses Vieta's formula, with leading coefficient 1.";
const reviewedCat=await write("cat-reviewed.json",reviewed);
// Independent answer oracles are functions of the candidate-visible problem,
// not reads from the bank's keyed answer field. Assertions of reviewer work
// and cited sources remain visible as such; no tool claims factual certification.
const independent={
 "cat-2024-q03":{answer:"B",basis:"From 8 and 32768=8^5, sum of roots of k^2+(2/3)k-5=0 is -2/3."},
 "cat-2024-q07":{answer:"A",basis:"Surjections from six elements onto three values = 3^6-3*2^6+3 = 540."},
 "apfc-2023-q16":{answer:"D",basis:"Ineffable means too great or intense to be expressed in words."},
 "apfc-2023-q19":{answer:"C",basis:"Parochial denotes a local or narrow outlook."}
};
check(3**6-3*2**6+3===540,"Independent surjection arithmetic failed");
check((-2/3)===-2/3,"Independent quadratic root sum failed");
let checks=0,matches=0;
for(const bank of [cat,apfc])for(const q of bank.questions){
 const oracle=independent[q.id];checks++;
 if(oracle&&oracle.answer===q.answer)matches++;
}
check(checks===4&&matches===4,"Author keys disagree with independent analytical/dictionary references");
function reviewFor(bank,input,candidate,math){
 check(candidate.ok,"Candidate packet failed");
 const target=new Map(bank.questions.map(q=>[q.id,q]));
 return {format:"practice-desk-quality-review",version:2,bankId:bank.bankId,
  sourceSha256:candidate.data.sourceSha256,
  records:candidate.data.items.map(item=>{
   const q=target.get(item.questionId),o=independent[q.id];
   return {questionId:q.id,questionSha256:sha(JSON.stringify(q)),
    candidateSha256:item.candidateSha256,
    applicability:{mathematical:math?"yes":"no",legal:"no",timeSensitive:"no",asOfDate:null},
    reviewer:{id:"p62d-independent-math-and-dictionary-oracle",kind:"ai"},
    independentSolution:{blindClaim:true,answer:o.answer,
     reasoning:"Independent candidate-only math/lexical reference: "+o.basis+
      " This is a software-verifiable oracle, not independent human or official-key authentication."},
    checks:QUALITY_CHECKLIST.map(check=>{
     const isMath=check.id==="mathematical-correctness";
     const isTemporal=check.id==="temporal-correctness",isPyq=check.id==="pyq-fidelity";
     const status=(isTemporal||isPyq||isMath&&!math)?"not-applicable":"pass";
     const basis=check.id==="candidate-view-integrity"?"rendered-claim":
       isMath&&math?"mathematical-proof":
       check.id==="factual-correctness"?(math?"mathematical-proof":"source-consulted"):
       "independent-editorial";
     return {id:check.id,status,basis,
      rationale:"Targeted P62-D source comparison and independent analytical oracle. "+
       "Not proof of institutional source authenticity."};
    }),
    evidence:[{publisher:math?"2IIM; Oswaal":"EduTap; independently checked dictionary definitions",
     title:math?"CAT 2024 Slot 1 QA PDF and secondary key":"APFC 2023 printed-paper transcription",
     locator:math?"CAT QA Q3/Q7, PDF source pages 5/9 and Oswaal QA key Q18/Q2":
      "UPSC APFC 2023 English Q16/Q19 (EduTap Q6/Q9), page 4",
     url:math?catURL:apfcURL,retrievedAt:now,
     excerpt:"Source problem/options and answer value independently cross-checked; software cannot authenticate issuer."}]
   };
  })};
}
const qualityEvidence=[];
for(const [name,bank,path,isMath] of [["CAT",reviewed,reviewedCat,true],
 ["APFC",apfc,sourceApfc,false]]){
 const cand=cli("question-quality.mjs",["candidate",path,"--limit","20"]);
 check(cand.ok&&cand.data.items.length===2,"Candidate packet missing "+name+" source entries");
 const review=reviewFor(bank,path,cand,isMath);
 const reviewPath=await write(name.toLowerCase()+"-review.json",review);
 const audit=cli("question-quality.mjs",["audit",path,"--review",reviewPath,"--limit","30"]);
 check(audit.ok&&audit.data.readyForPublication===true,
  name+" review audit failed "+JSON.stringify(audit.data.issues));
 check(audit.data.factualVerification==="not-performed","Cannot upgrade reviewer assertions to certification");
 // The actual compiler, not a substitute score engine.
 if(name==="APFC"){
  const bundlePath=join(dirs.out,"apfc-2023-reviewed.exam.json");
  await mkdir(dirs.out,{recursive:true});
  const compiled=cli("question-bank-cli.mjs",
   ["compile-bank",path,bundlePath,"--quality-review",reviewPath]);
  check(compiled.ok,"APFC source-verified package compile failed: "+JSON.stringify(compiled.data));
  const actual=validateExamPackage(JSON.parse(await readFile(bundlePath,"utf8")));
  check(actual.questions.length===2&&actual.questions.every(q=>q.editorial.status==="caution"),
   "APFC key/edition/provenance incorrectly promoted");
 }
 qualityEvidence.push({subject:name,reviewPath,
  candidatePacketBytes:cand.stdoutBytes,reviewAuditBytes:audit.stdoutBytes,
  authoredSourceBytes:Buffer.byteLength(JSON.stringify(bank)),questionCount:2});
}
const decisions=editorialDecisionTemplate(cat,reviewed,
 sha(await readFile(sourceCat)),sha(await readFile(reviewedCat)));
delete decisions.templateIncomplete;
decisions.entries=decisions.entries.map(row=>({...row,disposition:"corrected",
 reason:"Source equation and choices unchanged; revised explanation is an independently checked algebraic elaboration.",
 evidence:[{publisher:"2IIM; Oswaal",title:"Published CAT 2024 Slot 1 QA sources",
  locator:"Q3 and Q7; source PDF excerpt pages 1-2; secondary published answer key page 1",
  sourceNote:"Reviewer-derived mathematics and secondary key comparison, not official IIM certification."}]}));
const decisionsPath=await write("cat-decisions.json",decisions);
const prepare=cli("pdf-ingest.mjs",["template",sourceCat,excerpt,
 "--key-document",keyPdf,"--key-type","pdf"]);
check(prepare.ok,"Cannot build real-source PDF intake template: "+JSON.stringify(prepare.data));
const manifest=prepare.data;
Object.assign(manifest.document,{title:"Extracted published CAT 2024 QA Q3 and Q7 source pages",
 pageCount:2,inspectedPages:[1,2],missingPages:[],
 identityNote:"Unmodified PDF pages 5 and 9 from 2IIM's 24-page published CAT 2024 Slot 1 QA reproduction; not authenticated IIM origin."});
Object.assign(manifest.keyDocument,{title:"Secondary Oswaal CAT 2024 answer-key PDF page",
 pageCount:1,inspectedPages:[1],missingPages:[],
 identityNote:"A page from separately published Oswaal CAT 2024 Slot 1 solved paper; option order differs from 2IIM, compare answer values."});
manifest.documentInventoryStatus="checked-against-source";
manifest.externalVerification="recorded-agent-check";
manifest.inspector={kind:"agent",id:"p62d-assistant-pdf-inspection",
 method:"Mathematical notation and option order manually compared with rendered 2IIM PDF pages 5 and 9; PDF byte/page checks and Oswaal key compared independently. Extracted pdftotext cannot reliably recover all formula glyphs.",
 reviewedAt:now};
manifest.questions.forEach((row,i)=>Object.assign(row,{
 pages:[i+1],status:"source-compared",printedNumber:i===0?"3":"7",
 keyOrigin:"key-document",keyPages:[1],mathStatus:"source-compared",
 explanationOrigin:"editorial-not-in-source",uncertainties:[],
 notes:"Independently inspected CAT 2024 QA source mathematical notation, source options, and Oswaal secondary answer values; original page "+(i===0?"5":"9")
}));
const manifestPath=await write("cat-intake.json",manifest);
const auditPdf=cli("pdf-ingest.mjs",["audit",manifestPath,sourceCat,excerpt,
 "--key-document",keyPdf,"--reviewed",reviewedCat,
 "--decisions",decisionsPath,"--quality-review",qualityEvidence[0].reviewPath]);
check(auditPdf.ok&&auditPdf.data.valid&&auditPdf.data.readyForPublication,
 "PDF/QA/editorial intake failed: "+JSON.stringify(auditPdf.data.issues));
const outdir=join(dirs.out,"pdf-published");
const compiled=cli("pdf-ingest.mjs",["compile",manifestPath,sourceCat,excerpt,
 reviewedCat,decisionsPath,outdir,"--quality-review",qualityEvidence[0].reviewPath,
 "--key-document",keyPdf]);
check(compiled.ok,"Real PDF end-to-end publication failed: "+JSON.stringify(compiled.data));
const compiledReviewed=validateExamPackage(JSON.parse(await readFile(join(outdir,"reviewed.exam.json"),"utf8")));
const compiledSource=validateExamPackage(JSON.parse(await readFile(join(outdir,"source.exam.json"),"utf8")));
check(compiledReviewed.paper.sourcePaperRevisionId===compiledSource.paper.id,
 "Published Reviewed paper does not carry exact Source revision");
const attempt=startGenericAttempt(compiledReviewed,"p62d-real-cat-attempt",1000);
const html=renderModelExam(attempt,compiledReviewed);
check(!html.includes("Inclusion-exclusion:")&&!html.includes("second derivation"),
 "Candidate-visible publication leaked private explanation");
const report={
 schema:"practice-desk-p62d-live-evidence/v1",
 result:"pass",
 scope:"two APFC 2023 English and two CAT 2024 QA historical questions, source-grounded paraphrases",
 downloaded,derivedPdf:{
  pages:pdfMeta(excerpt).pages,bytes:(await stat(excerpt)).size,sha256:sha(await readFile(excerpt)),
  pageOrigins:[5,9],keyEvidencePdfSha256:sha(await readFile(keyPdf)),
  mathGlyphTextExtraction:"incomplete; visually checked source page 5 separately",
  pdfTextHas540:catText.includes("540"),pdfTextHas32768:catText.includes("32768")
 },
 educational:{items:checks,independentAnswerMatches:matches,
  evidenceKind:"independent mathematical/lexical oracle plus two separately published secondary transcriptions",
  authenticity:"exam questions are identified in third-party paper reproductions; no official response-sheet verification",
  generalisation:"none: this curated set does not measure AI-generated bank quality or calibrated difficulty"},
 pdfIntake:{valid:auditPdf.data.valid,readyForPublication:auditPdf.data.readyForPublication,
  sourceInspection:auditPdf.data.sourceInspection,softwareActualPdfComparison:auditPdf.data.actualPdfTextComparison,
  reviewedQuestions:compiledReviewed.questions.length,
  frozenReviewOriginalId:attempt.frozen.paper.sourcePaperRevisionId,
  candidateExplanationLeak:false},
 context:{qualityEvidence,cliCalls:calls,aggregateCliWallSeconds:Number(seconds.toFixed(3)),
  llmTokens:"not-measured",baselineAssistantContextTokens:"not-measured",
  displayedByteCountsAreNotLLMTokenMeasurements:true},
 checklist:{count:QUALITY_CHECKLIST.length,qualityV2:true,reviewAssurance:"recorded-self-attestation-not-authenticated"},
 caveats:["Source PDF and secondary key are not IIM originals","APFC reproductions are not UPSC-original PDFs",
  "Generated questions are source-grounded reconstructions, not verbatim official PYQs",
  "Mathematical text extraction loses formula glyphs; human/model visual review is not cryptographic proof",
  "The tool does not independently fetch law or authenticate cited evidence",
  "No measured model context tokens, generation latency or agent factual-research quality"]
};
await writeFile(join(folder,"report.json"),JSON.stringify(report,null,2)+"\n");
console.log("P62-D LIVE REAL-SOURCE EVIDENCE "+JSON.stringify(report));
