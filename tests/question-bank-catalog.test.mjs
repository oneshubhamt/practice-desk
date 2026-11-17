import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdtemp,writeFile,rm,mkdir,cp} from "node:fs/promises";
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
import {SEMANTIC_CHECKLIST,BANK_CHECKLIST} from "../scripts/question-quality.mjs";
import {loadCglFixture} from "./fixtures/cgl-bank.mjs";
import {practiceInventory,composePracticeSet} from "../src/app/practice-compose.ts";
import {taxonomyPathNodes} from "../src/domain/taxonomy.ts";

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

const writeSyntheticMaintainedEvidence=async(sourcePath,paperBase,label="catalog-regression-fixture")=>{
 const source=JSON.parse(await readFile(sourcePath,"utf8"));
 const reviewWork=join(dirname(paperBase),".review-"+label+"-"+Date.now());
 execFileSync(process.execPath,[join(root,"scripts","question-quality.mjs"),"prepare",sourcePath,reviewWork],{cwd:root});
 const review=JSON.parse(await readFile(join(reviewWork,"review.json"),"utf8"));
 review.reviewMode="clean-context";review.candidateOnlyContextClaim=true;
 review.reviewer={id:label,kind:"ai"};
 for(const record of review.records){
  const question=source.questions.find(q=>q.id===record.questionId);
  const asOf=question.qa?.applicability?.asOfDate??"2026-11-15";
  record.applicability={mathematical:"yes",legal:"yes",timeSensitive:"yes",visual:"no",asOfDate:asOf};
  record.solution={status:"completed",answer:String(question.answer??""),
   reasoning:"Synthetic software-contract second pass; no external factual certification is asserted."};
  record.semanticChecks=SEMANTIC_CHECKLIST.map(check=>({
   id:check.id,status:"pass",
   basis:check.id==="mathematical-correctness"?"mathematical-proof":
    ["factual-correctness","temporal-correctness","pyq-fidelity"].includes(check.id)?"source-consulted":
    check.id==="visual-integrity"?"rendered-claim":"semantic-editorial",
   rationale:"Synthetic regression witness exercises the maintained-evidence contract only."
  }));
  record.evidence=[{publisher:"Fixture",title:"Synthetic maintained-evidence witness",
   locator:"question:"+question.id,retrievedAt:"2026-11-16",asOfDate:asOf,
   excerpt:"Synthetic evidence exercises source freshness and manifest binding; it is not factual certification."}];
 }
 review.bankReview={checks:BANK_CHECKLIST.map(check=>({id:check.id,status:"pass",
  basis:"bank-editorial",rationale:"Synthetic bank-level regression witness only."}))};
 const reviewPath=join(paperBase,"quality-review.json");
 await writeFile(reviewPath,JSON.stringify(review,null,2));
 const blueprint={format:"practice-desk-content-blueprint",version:1,id:label,
  examId:source.examId,paperId:source.paperId,revision:source.revision,targetCount:source.questions.length,
  allowPartial:false,syllabus:{basis:"inferred-practice",asOfDate:"2026-11-16",
   reference:"Synthetic maintained-evidence binding regression plan"},
  requirements:{},quotas:{}};
 const blueprintPath=join(paperBase,"blueprint.json");
 await writeFile(blueprintPath,JSON.stringify(blueprint,null,2));
 await rm(reviewWork,{recursive:true,force:true});
 return {source,review,blueprint,reviewPath,blueprintPath};
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
 assert.equal(pfrda?.exam.currentPaperRef,"pfrda-grade-a-2026-day-01");
 assert.equal(pfrda?.papers.length,1);
 for(const family of graph.catalog.families)
  assert.deepEqual(Object.keys(family).sort(),["examId","id","manifest","preinstalled","title"]);
 const loaded=await loadQuestionBankCatalog(root);
 assert.equal(loaded.preinstalled.packages.filter(x=>x.examId==="ssc-cgl").length,10);
 assert.equal(loaded.preinstalled.packages.filter(x=>x.examId==="pfrda-grade-a-2026-phase-ii").length,2);
 const cglFamily=loaded.preinstalled.families.find(x=>x.id==="ssc-cgl");
 const pfrdaFamily=loaded.preinstalled.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 assert.equal(cglFamily.paperIds.length,10);
 assert.ok(cglFamily.paperIds.includes(cglFamily.currentPaperRevisionId));
 assert.equal(loaded.preinstalled.packages.find(x=>x.paper.id===cglFamily.currentPaperRevisionId)?.paper.edition,"reviewed");
 assert.equal(pfrdaFamily.paperIds.length,2);
 assert.ok(pfrdaFamily.paperIds.includes(pfrdaFamily.currentPaperRevisionId));
});


test("PFRDA year taxonomy is data-owned, fully bound and drives stable practice filtering",async()=>{
 const loaded=await loadQuestionBankCatalog(root);
 const family=loaded.preinstalled.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const pkg=loaded.preinstalled.packages.find(x=>x.paper.id===family.currentPaperRevisionId);
 assert.ok(pkg?.taxonomy,"PFRDA canonical package must carry its year taxonomy");
 assert.equal(pkg.taxonomy.id,"pfrda-grade-a-2026-general");
 assert.equal(pkg.taxonomy.basis,"official-source-attributed");
 assert.equal(pkg.taxonomy.nodes.length,142);
 assert.equal(Object.keys(pkg.taxonomyAssignments??{}).length,pkg.questions.length);
 const counts=new Map();
 for(const q of pkg.questions){
  const nodeId=pkg.taxonomyAssignments[q.id];
  assert.ok(nodeId,"Every maintained PFRDA question must have a stable taxonomy assignment");
  const rootNode=taxonomyPathNodes(pkg.taxonomy,nodeId)[0];
  counts.set(rootNode.id,(counts.get(rootNode.id)??0)+1);
 }
 assert.deepEqual(Object.fromEntries([...counts.entries()].sort()),{
  "ai-ml":3,"budget-survey":5,"commerce-accountancy":4,"companies-act":7,
  "costing":4,"economics":5,"english-writing":1,"finance":5,"management":4,
  "marketing-communication":2,"media":2,"pension-sector":5,"pfrda-act":4
 });
 const inventory=practiceInventory(pkg);
 const rootId="taxonomy:"+pkg.taxonomy.id+":english-writing";
 const precisId="taxonomy:"+pkg.taxonomy.id+":english-writing.precis";
 assert.equal(inventory.topics.find(x=>x.id===rootId)?.count,1);
 assert.equal(inventory.topics.find(x=>x.id===precisId)?.count,1);
 assert.deepEqual(inventory.topics.find(x=>x.id===precisId)?.path,
  ["English Writing Skills","Précis writing"]);
 const subset=composePracticeSet(pkg,{count:1,seed:"taxonomy-parent",
  filters:{topicId:rootId}}).bundle;
 assert.equal(subset.questions.length,1);
 assert.equal(Object.keys(subset.taxonomyAssignments??{}).length,1);
 assert.equal(subset.taxonomy?.id,pkg.taxonomy.id);
});

test("maintained corpus fails closed when taxonomy aliases drift away from authored classifications",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pd-taxonomy-drift-"));
 try{
  await cp(join(root,"question-banks"),join(dir,"question-banks"),{recursive:true});
  const path=join(dir,"question-banks","pfrda","2026","taxonomy.json");
  const taxonomy=JSON.parse(await readFile(path,"utf8"));
  const node=taxonomy.nodes.find(x=>x.id==="pfrda-act");
  node.aliases=[];
  await writeFile(path,JSON.stringify(taxonomy,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),
   /Authored classification is absent from taxonomy.*day1-general-01/);
 }finally{await rm(dir,{recursive:true,force:true});}
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

test("active question-bank content is reciprocally reachable from the catalog graph",async()=>{
 await readQuestionBankManifestGraph(root);
 const dir=await mkdtemp(join(tmpdir(),"pd-bank-orphan-"));
 try{
  await cp(join(root,"question-banks"),join(dir,"question-banks"),{recursive:true});
  await mkdir(join(dir,"question-banks","orphan"),{recursive:true});
  await writeFile(join(dir,"question-banks","orphan","package.exam.json"),"{}");
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/Orphan active question-bank content/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("custom revision identity is unique and the canonical custom edition is the highest maintained revision",async()=>{
 const loaded=(await loadQuestionBankCatalog(root)).preinstalled;
 const groups=new Map();
 for(const pkg of loaded.packages.filter(x=>x.paper.edition==="custom")){
  const rows=groups.get(pkg.paper.paperId)??[];rows.push(pkg.paper.revision);groups.set(pkg.paper.paperId,rows);
 }
 for(const revisions of groups.values())assert.equal(new Set(revisions).size,revisions.length);
 const family=loaded.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const current=loaded.packages.find(x=>x.paper.id===family.currentPaperRevisionId);
 const pfrda=loaded.packages.filter(x=>x.examId==="pfrda-grade-a-2026-phase-ii"&&x.paper.edition==="custom");
 assert.deepEqual(pfrda.map(x=>x.paper.revision).sort((a,b)=>a-b),[1,4]);
 assert.equal(current.paper.revision,Math.max(...pfrda.map(x=>x.paper.revision)));
});

test("generic preinstalled packing round-trips canonical packages without semantic drift",async()=>{
 const loaded=(await loadQuestionBankCatalog(root)).preinstalled;
 assert.deepEqual(unpackPreinstalledExamCatalog(packPreinstalledExamCatalog(loaded)),loaded);
});

test("every manifest-declared authoring source deterministically reproduces its checked-in package",async()=>{
 const graph=await readQuestionBankManifestGraph(root);
 let authored=0;
 for(const family of graph.families)for(const paper of family.papers)
  for(const edition of Object.values(paper.editions))if(edition.authoring){
   const base=dirname(join(root,paper.path));
   const source=JSON.parse(await readFile(join(base,edition.authoring),"utf8"));
   const pkg=JSON.parse(await readFile(join(base,edition.package),"utf8"));
   assert.deepEqual(compileExternalQuestionBank(source),pkg,
    "Maintained bank.authoring.json drifted from package "+paper.id);
   authored++;
  }
 assert.equal(authored,2,"Current corpus should expose both maintained PFRDA authoring editions");
});

test("PFRDA Original and Revised packages retain distinct immutable identities",async()=>{
 const base=join(root,"question-banks","pfrda","2026","mocks","day-01");
 const packages=await Promise.all(["original","revised"].map(async edition=>
  JSON.parse(await readFile(join(base,edition,"package.exam.json"),"utf8"))));
 assert.equal(new Set(packages.map(x=>x.paper.id)).size,2);
 assert.equal(new Set(packages.map(x=>x.answerKey.id)).size,2);
 assert.deepEqual(packages.map(x=>x.paper.revision),[1,4]);
 assert.deepEqual(packages.map(x=>x.paper.edition),["custom","custom"],
  "workflow labels Original/Revised must not be misrepresented as Source/Reviewed provenance");
 for(const pkg of packages){
  assert.equal(pkg.questions.length,51);
  assert.deepEqual(pkg.paper.scoring.defaultRule,{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0});
  assert.equal(pkg.answerKey.entries[0].scoringOverride?.correctMarks,20);
 }
 const catalog=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=catalog.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const installed=catalog.packages.filter(x=>x.examId==="pfrda-grade-a-2026-phase-ii");
 assert.equal(installed.length,2);
 assert.equal(family.currentPaperRevisionId,packages[1].paper.id);
});

test("maintained authoring evidence bindings are required, source-bound and fail closed when stale",async()=>{
 const graph=await readQuestionBankManifestGraph(root);
 const pfrda=graph.families.find(x=>x.family.id==="pfrda-grade-a-2026-phase-ii");
 const paper=pfrda.papers.find(x=>x.id==="pfrda-grade-a-2026-day-01");
 assert.equal(paper.editions.revised.qualityReview,"revised/quality-review.json");
 assert.equal(paper.editions.revised.blueprint,"revised/blueprint.json");
 await loadQuestionBankCatalog(root);

 const dir=await mkdtemp(join(tmpdir(),"pd-maintained-evidence-"));
 try{
  await cp(join(root,"question-banks"),join(dir,"question-banks"),{recursive:true});
  const paperBase=join(dir,"question-banks","pfrda","2026","mocks","day-01");
  const manifestPath=join(paperBase,"manifest.json");
  const reviewPath=join(paperBase,"revised","quality-review.json");
  const blueprintPath=join(paperBase,"revised","blueprint.json");
  const manifest=JSON.parse(await readFile(manifestPath,"utf8"));
  const review=JSON.parse(await readFile(reviewPath,"utf8"));
  const blueprint=JSON.parse(await readFile(blueprintPath,"utf8"));

  manifest.editions.revised.qualityReview=null;
  await writeFile(manifestPath,JSON.stringify(manifest,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/requires passing bound quality-review\.json/);
  manifest.editions.revised.qualityReview="revised/quality-review.json";
  await writeFile(manifestPath,JSON.stringify(manifest,null,2));

  manifest.editions.revised.qualityReview="original/quality-review.json";
  await writeFile(manifestPath,JSON.stringify(manifest,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/must be colocated with bank\.authoring\.json/);
  manifest.editions.revised.qualityReview="revised/quality-review.json";
  await writeFile(manifestPath,JSON.stringify(manifest,null,2));

  const staleReview=structuredClone(review);staleReview.sourceSha256="0".repeat(64);
  await writeFile(reviewPath,JSON.stringify(staleReview,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/Declared quality review is not publication-ready/);
  await writeFile(reviewPath,JSON.stringify(review,null,2));

  const incompleteBlueprint=structuredClone(blueprint);
  incompleteBlueprint.quotas.subjects.targets[0].count+=1;
  incompleteBlueprint.quotas.subjects.targets[1].count-=1;
  await writeFile(blueprintPath,JSON.stringify(incompleteBlueprint,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/Declared blueprint is not publication-ready/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("preinstalled PFRDA précis follows Auto: hidden in strict and shown in practice",async()=>{
 const base=join(root,"question-banks","pfrda","2026","mocks","day-01","revised");
 const source=JSON.parse(await readFile(join(base,"bank.authoring.json"),"utf8"));
 const pkg=JSON.parse(await readFile(join(base,"package.exam.json"),"utf8"));
 assert.deepEqual(pkg,compileExternalQuestionBank(source),"checked-in package must match authored source");
 const catalog=(await loadQuestionBankCatalog(root)).preinstalled;
 const family=catalog.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii");
 const installed=catalog.packages.find(x=>x.paper.id===family.currentPaperRevisionId);
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
 const makeSource=(paperId,title)=>({...source,
  bankId:"synthetic-"+paperId,examId:"upsc-epfo-apfc",paperId,title,revision:1});
 const make=(paperId,title)=>compileExternalQuestionBank(makeSource(paperId,title));
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
   contentTypes:["mock"],years:[2026],paths:{"2026":"2026/manifest.json"},currentPaperRef:"paper-two-manifest"});
  await write("question-banks/synthetic/2026/manifest.json",{format:"practice-desk-exam-year-manifest",version:1,
   id:"synthetic-2026",examId:"upsc-epfo-apfc",title:"Synthetic 2026",year:2026,pyqs:[],mocks:[
    {id:"paper-one-manifest",path:"mocks/paper-one/manifest.json"},
    {id:"paper-two-manifest",path:"mocks/paper-two/manifest.json"}
   ]});
  for(const [slug,pkg] of [["paper-one",first],["paper-two",second]]){
   await write("question-banks/synthetic/2026/mocks/"+slug+"/manifest.json",{
    format:"practice-desk-paper-manifest",version:1,id:slug+"-manifest",examId:"upsc-epfo-apfc",
    paperId:slug,kind:"mock",title:pkg.title,canonicalEdition:"revised",
    editions:{revised:{authoring:"revised/bank.authoring.json",package:"revised/package.exam.json",
     qualityReview:"revised/quality-review.json",blueprint:"revised/blueprint.json"}}});
   const sourcePath=join(dir,"question-banks/synthetic/2026/mocks/"+slug+"/revised/bank.authoring.json");
   const revisedBase=join(dir,"question-banks/synthetic/2026/mocks/"+slug+"/revised");
   await write("question-banks/synthetic/2026/mocks/"+slug+"/revised/bank.authoring.json",makeSource(slug,pkg.title));
   await write("question-banks/synthetic/2026/mocks/"+slug+"/revised/package.exam.json",pkg);
   await writeSyntheticMaintainedEvidence(sourcePath,revisedBase,"append-"+slug);
  }
  // Align the manifest IDs referenced by the year/current fields.
  const yearPath=join(dir,"question-banks/synthetic/2026/manifest.json");
  const year=JSON.parse(await readFile(yearPath,"utf8"));
  year.mocks[0].id="paper-one-manifest";year.mocks[1].id="paper-two-manifest";
  await writeFile(yearPath,JSON.stringify(year,null,2));
  const loaded=await loadQuestionBankCatalog(dir);
  assert.deepEqual(loaded.preinstalled.packages.map(x=>x.title),["Synthetic paper one","Synthetic paper two"]);
  assert.equal(loaded.preinstalled.families[0].currentPaperRevisionId,second.paper.id);

  const examPath=join(dir,"question-banks/synthetic/manifest.json");
  const paperPath=join(dir,"question-banks/synthetic/2026/mocks/paper-two/manifest.json");
  const packagePath=join(dir,"question-banks/synthetic/2026/mocks/paper-two/revised/package.exam.json");
  const canonicalPackage=JSON.parse(await readFile(packagePath,"utf8"));
  await writeFile(packagePath,JSON.stringify({...canonicalPackage,title:"Drifted generated package"},null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/diverges from canonical bank\.authoring\.json/);
  await writeFile(packagePath,JSON.stringify(canonicalPackage,null,2));

  const exam=JSON.parse(await readFile(examPath,"utf8"));
  exam.contentTypes=["pyq"];await writeFile(examPath,JSON.stringify(exam,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/contentTypes does not allow mock/);
  exam.contentTypes=["mock"];await writeFile(examPath,JSON.stringify(exam,null,2));

  const paper=JSON.parse(await readFile(paperPath,"utf8"));
  paper.identityPolicy="Narrative policy must not be executable";
  await writeFile(paperPath,JSON.stringify(paper,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/unsupported field identityPolicy/);
  delete paper.identityPolicy;
  paper.archive={bad:"../outside.txt"};await writeFile(paperPath,JSON.stringify(paper,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/Archive path must stay under archive\//);
  delete paper.archive;
  paper.audit="missing.md";await writeFile(paperPath,JSON.stringify(paper,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir),/Paper audit .* does not exist/);
 }finally{await rm(dir,{recursive:true,force:true});}
});

test("preinstalled false never exempts an installed family from corpus validation",async()=>{
 const dir=await mkdtemp(join(tmpdir(),"pd-disabled-family-"));
 try{
  await cp(join(root,"question-banks"),join(dir,"question-banks"),{recursive:true});
  const catalog=JSON.parse(await readFile(join(dir,"question-banks/catalog.json"),"utf8"));
  catalog.families.find(x=>x.id==="pfrda-grade-a-2026-phase-ii").preinstalled=false;
  const packagePath=join(dir,"question-banks/pfrda/2026/mocks/day-01/revised/package.exam.json");
  const pkg=JSON.parse(await readFile(packagePath,"utf8"));
  pkg.title+=" — corrupted while disabled";
  await writeFile(packagePath,JSON.stringify(pkg,null,2));
  await assert.rejects(()=>loadQuestionBankCatalog(dir,catalog),
   /diverges from canonical bank\.authoring\.json/);
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
