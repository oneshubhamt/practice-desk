import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm,mkdir} from "node:fs/promises";
import {gunzipSync} from "node:zlib";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadQuestionBankCatalog,readQuestionBankManifestGraph} from "../scripts/question-bank-catalog.mjs";
import {buildPracticeDeskHtml} from "../scripts/build-target.mjs";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {shouldShowWordCount} from "../src/domain/word-count.ts";
import {renderGenericControls} from "../src/app/question-content-view.ts";
import {packPreinstalledExamCatalog,unpackPreinstalledExamCatalog} from "../src/app/preinstalled-pack.ts";
import {archiveCglPackages} from "../tools/cgl-archive-converter.ts";
import {loadCglFixture} from "./fixtures/cgl-bank.mjs";

const root=resolve(fileURLToPath(new URL("../",import.meta.url)));
const sha=value=>createHash("sha256").update(value).digest("hex");
const baseCatalog=async()=>JSON.parse(await readFile(join(root,"question-banks","catalog.json"),"utf8"));
const withPreinstall=async enabled=>{
 const catalog=await baseCatalog();
 for(const family of catalog.families)family.preinstalled=enabled[family.id]??family.preinstalled;
 return catalog;
};
const embedded=(html,id)=>{
 const match=html.match(new RegExp('<script id="'+id+'" type="application/json">([\\s\\S]*?)<\\/script>'));
 assert.ok(match,"Missing embedded payload "+id);
 return JSON.parse(match[1]);
};
const embeddedPreinstalled=html=>{
 const wrapper=embedded(html,"preinstalled-exams");
 assert.equal(wrapper.format,"practice-desk-preinstalled-exams-gzip");
 const unpacked=JSON.parse(gunzipSync(Buffer.from(wrapper.data,"base64")).toString("utf8"));
 return unpackPreinstalledExamCatalog(unpacked);
};

test("manifest graph is authoritative for five CGL PYQs and current PFRDA",async()=>{
 const graph=await readQuestionBankManifestGraph(root);
 assert.equal(graph.families.length,2);
 const cgl=graph.families.find(x=>x.family.id==="ssc-cgl");
 const pfrda=graph.families.find(x=>x.family.id==="pfrda-grade-a-2026-phase-ii");
 assert.equal(cgl?.exam.representation,"exam-packages");
 assert.equal(cgl?.papers.length,5);
 for(const paper of cgl?.papers??[]){
  assert.equal(paper.canonicalEdition,"reviewed");
  assert.deepEqual(Object.keys(paper.editions).sort(),["reviewed","source"]);
 }
 assert.deepEqual(cgl?.papers.map(x=>x.id),[
  "cgl-2026-09-30","cgl-2026-10-05","cgl-2026-10-06","cgl-2026-10-07","cgl-2026-10-08"
 ]);
 assert.equal(pfrda?.exam.representation,"exam-packages");
 assert.equal(pfrda?.exam.currentPaperId,"pfrda-grade-a-2026-day-01");
 assert.equal(pfrda?.papers.length,1);
 for(const family of graph.catalog.families)
  assert.deepEqual(Object.keys(family).sort(),["examId","id","manifest","preinstalled","title"]);
 const loaded=await loadQuestionBankCatalog(root);
 assert.equal(loaded.preinstalled.packages.filter(x=>x.examId==="ssc-cgl").length,10);
 assert.equal(loaded.preinstalled.packages.filter(x=>x.examId==="pfrda-grade-a-2026-phase-ii").length,2);
 const cglFamily=loaded.preinstalled.families.find(x=>x.id==="ssc-cgl");
 const pfrdaFamily=loaded.preinstalled.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 assert.equal(cglFamily.paperIds.length,10);
 assert.ok(cglFamily.paperIds.includes(cglFamily.currentPaperId));
 assert.equal(loaded.preinstalled.packages.find(x=>x.paper.id===cglFamily.currentPaperId)?.paper.edition,"reviewed");
 assert.equal(pfrdaFamily.paperIds.length,2);
 assert.ok(pfrdaFamily.paperIds.includes(pfrdaFamily.currentPaperId));
});


test("materialized CGL canonical packages are exactly equivalent to archived source/review conversion",async()=>{
 const {sources,patches,solutions}=await loadCglFixture();
 const expected=archiveCglPackages(sources,patches,solutions);
 const actual=(await loadQuestionBankCatalog(root)).preinstalled.packages.filter(x=>x.examId==="ssc-cgl");
 assert.equal(actual.length,10);
 const byId=new Map(actual.map(pkg=>[pkg.paper.id,pkg]));
 for(const pkg of expected){
  assert.deepEqual(byId.get(pkg.paper.id),pkg,
   "canonical CGL package diverged from archived source/review evidence: "+pkg.paper.id);
 }
});

test("generic preinstalled packing round-trips canonical packages without semantic drift",async()=>{
 const loaded=(await loadQuestionBankCatalog(root)).preinstalled;
 assert.deepEqual(unpackPreinstalledExamCatalog(packPreinstalledExamCatalog(loaded)),loaded);
});

test("PFRDA Original and Revised packages retain distinct immutable identities",async()=>{
 const base=join(root,"question-banks","pfrda","2026","mocks","day-01");
 const packages=await Promise.all(["original","revised"].map(async edition=>
  JSON.parse(await readFile(join(base,edition,"package.exam.json"),"utf8"))));
 assert.equal(new Set(packages.map(x=>x.paper.id)).size,2);
 assert.equal(new Set(packages.map(x=>x.answerKey.id)).size,2);
 assert.deepEqual(packages.map(x=>x.paper.revision),[1,4]);
 for(const pkg of packages){
  assert.equal(pkg.questions.length,51);
  assert.deepEqual(pkg.paper.scoring.defaultRule,{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0});
  assert.equal(pkg.answerKey.entries[0].scoringOverride?.correctMarks,20);
 }
 const catalog=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=catalog.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const installed=catalog.packages.filter(x=>x.examId==="pfrda-grade-a-2026-phase-ii");
 assert.equal(installed.length,2);
 assert.equal(family.currentPaperId,packages[1].paper.id);
});

test("preinstalled PFRDA précis follows Auto: hidden in strict and shown in practice",async()=>{
 const base=join(root,"question-banks","pfrda","2026","mocks","day-01","revised");
 const source=JSON.parse(await readFile(join(base,"bank.authoring.json"),"utf8"));
 const pkg=JSON.parse(await readFile(join(base,"package.exam.json"),"utf8"));
 assert.deepEqual(pkg,compileExternalQuestionBank(source),"checked-in package must match authored source");
 const catalog=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=catalog.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const installed=catalog.packages.find(x=>x.paper.id===family.currentPaperId);
 const precis=installed.questions.find(q=>q.content.kind==="free-response");
 assert.ok(precis,"PFRDA précis must be present");
 assert.equal(installed.paper.candidateTools?.wordCount,undefined);
 assert.equal(precis.content.responseRules.wordLimit,120);
 for(const [mode,expected] of [["exam-simulation",false],["full-paper-practice",true],
  ["section-practice",true],["custom-practice",true]]){
  const show=shouldShowWordCount(installed.paper.candidateTools?.wordCount,mode);
  assert.equal(show,expected,mode);
  const html=renderGenericControls(installed,precis,undefined,{showWordCount:show});
  if(expected){assert.match(html,/id="g-word-count"/);assert.match(html,/0 \/ 120 words/);}
  else assert.doesNotMatch(html,/id="g-word-count"/);
 }
});

test("manifest-only append discovers a synthetic second generic paper without root-catalog edits",async()=>{
 const source=JSON.parse(await readFile(join(root,"examples","ai-first-apfc.json"),"utf8"));
 const make=(paperId,title)=>compileExternalQuestionBank({...source,
  bankId:"synthetic-"+paperId,examId:"upsc-epfo-apfc",paperId,title,revision:1});
 const first=make("paper-one","Synthetic paper one"),second=make("paper-two","Synthetic paper two");
 const dir=await mkdtemp(join(tmpdir(),"pd-bank-append-"));
 const write=async(relative,value)=>{
  const path=join(dir,relative);await mkdir(dirname(path),{recursive:true});
  await writeFile(path,typeof value==="string"?value:JSON.stringify(value,null,2));
 };
 try{
  await write("question-banks/catalog.json",{format:"practice-desk-question-bank-catalog",version:1,families:[
   {id:"synthetic",examId:"upsc-epfo-apfc",title:"Synthetic",manifest:"question-banks/synthetic/manifest.json",preinstalled:true}
  ]});
  await write("question-banks/synthetic/manifest.json",{format:"practice-desk-exam-bank-manifest",version:1,
   id:"synthetic",examId:"upsc-epfo-apfc",title:"Synthetic",representation:"exam-packages",
   contentTypes:["mock"],years:[2026],paths:{"2026":"2026/manifest.json"},currentPaperId:"paper-two-manifest"});
  await write("question-banks/synthetic/2026/manifest.json",{format:"practice-desk-exam-year-manifest",version:1,
   id:"synthetic-2026",examId:"upsc-epfo-apfc",title:"Synthetic 2026",year:2026,pyqs:[],mocks:[
    {id:"paper-one-manifest",path:"mocks/paper-one/manifest.json"},
    {id:"paper-two-manifest",path:"mocks/paper-two/manifest.json"}
   ]});
  for(const [slug,pkg] of [["paper-one",first],["paper-two",second]]){
   await write("question-banks/synthetic/2026/mocks/"+slug+"/manifest.json",{
    format:"practice-desk-paper-manifest",version:1,id:slug+"-manifest",examId:"upsc-epfo-apfc",
    paperId:slug,kind:"mock",title:pkg.title,canonicalEdition:"revised",
    editions:{revised:{package:"revised/package.exam.json"}}});
   await write("question-banks/synthetic/2026/mocks/"+slug+"/revised/package.exam.json",pkg);
  }
  // Align the manifest IDs referenced by the year/current fields.
  const yearPath=join(dir,"question-banks/synthetic/2026/manifest.json");
  const year=JSON.parse(await readFile(yearPath,"utf8"));
  year.mocks[0].id="paper-one-manifest";year.mocks[1].id="paper-two-manifest";
  await writeFile(yearPath,JSON.stringify(year,null,2));
  const loaded=await loadQuestionBankCatalog(dir);
  assert.deepEqual(loaded.preinstalled.packages.map(x=>x.title),["Synthetic paper one","Synthetic paper two"]);
  assert.equal(loaded.preinstalled.families[0].currentPaperId,second.paper.id);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("catalog switches independently remove PFRDA, CGL, or every bundled bank",async()=>{
 const noPfrda=await loadQuestionBankCatalog(root,await withPreinstall({"pfrda-grade-a-2026-phase-ii":false}));
 assert.equal(noPfrda.preinstalled.packages.length,10);
 assert.ok(noPfrda.preinstalled.packages.every(x=>x.examId==="ssc-cgl"));
 const noCgl=await loadQuestionBankCatalog(root,await withPreinstall({"ssc-cgl":false}));
 assert.equal(noCgl.preinstalled.packages.length,2);
 assert.ok(noCgl.preinstalled.packages.every(x=>x.examId==="pfrda-grade-a-2026-phase-ii"));
 const empty=await loadQuestionBankCatalog(root,await withPreinstall({"ssc-cgl":false,"pfrda-grade-a-2026-phase-ii":false}));
 assert.deepEqual(empty.preinstalled.families,[]);assert.deepEqual(empty.preinstalled.packages,[]);
});

test("standalone builds honor each removal switch without stale embedded banks",async()=>{
 const noPfrda=await buildPracticeDeskHtml("standalone",{catalogOverride:await withPreinstall({"pfrda-grade-a-2026-phase-ii":false})});
 assert.equal(embeddedPreinstalled(noPfrda.html).packages.length,10);
 assert.doesNotMatch(noPfrda.html,/id="paper-bank"|id="review-patches"|id="solution-bank"/);
 const noCgl=await buildPracticeDeskHtml("standalone",{catalogOverride:await withPreinstall({"ssc-cgl":false})});
 assert.equal(embeddedPreinstalled(noCgl.html).packages.length,2);
 assert.doesNotMatch(noCgl.html,/id="paper-bank"|id="review-patches"|id="solution-bank"/);
 const empty=await buildPracticeDeskHtml("standalone",{catalogOverride:await withPreinstall({"ssc-cgl":false,"pfrda-grade-a-2026-phase-ii":false})});
 assert.deepEqual(embeddedPreinstalled(empty.html).packages,[]);
 assert.doesNotMatch(empty.html,/id="paper-bank"|id="review-patches"|id="solution-bank"/);
});

test("agent patch accepts scoringOverride",async()=>{
 const sourcePath=join(root,"examples","ai-first-apfc.json"),raw=await readFile(sourcePath,"utf8"),
  source=JSON.parse(raw),q=source.questions[0],dir=await mkdtemp(join(tmpdir(),"pd-agent-marks-"));
 try{
  const patch=join(dir,"p.json"),out=join(dir,"out.json");
  await writeFile(patch,JSON.stringify({format:"practice-desk-agent-patch",version:1,
   baseSha256:sha(raw),nextRevision:source.revision+1,
   updates:[{id:q.id,expectedQuestionSha256:sha(JSON.stringify(q)),
    set:{scoringOverride:{correctMarks:7,incorrectMarks:0,unansweredMarks:0}}}],add:[],remove:[]}));
  execFileSync(process.execPath,[join(root,"scripts","question-bank-agent.mjs"),"patch",sourcePath,patch,out],{cwd:root});
  const next=JSON.parse(await readFile(out,"utf8"));
  assert.equal(next.questions[0].scoringOverride.correctMarks,7);
  assert.equal(next.questions[0].qa.status,"needs-review");
 }finally{await rm(dir,{recursive:true,force:true});}
});
