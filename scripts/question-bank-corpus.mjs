#!/usr/bin/env node
/** Pass 5 corpus bridge: small transactional operations for maintained custom mocks.
 * It stages and validates the complete question-bank graph before mutating the repository.
 * It never overwrites an edition, bypasses quality/blueprint evidence, or publishes PYQ provenance.
 */
import {cp,mkdir,mkdtemp,open,readFile,rename,rm,stat,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {tmpdir} from "node:os";
import {basename,dirname,join,relative,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {compileExternalQuestionBank,bindExternalQuestionTaxonomy} from "../src/authoring/external-bank.ts";
import {validateExamPackage} from "../src/domain/exam-package.ts";
import {validateExamTaxonomy} from "../src/domain/taxonomy.ts";
import {auditQuestionQuality} from "./question-quality.mjs";
import {auditBlueprint,validateBlueprint} from "./content-blueprint.mjs";
import {loadQuestionBankCatalog,readQuestionBankManifestGraph} from "./question-bank-catalog.mjs";

const repoRoot=resolve(fileURLToPath(new URL("../",import.meta.url)));
const sha=value=>createHash("sha256").update(value).digest("hex");
const stableSlug=value=>{
 if(typeof value!=="string"||!/^[a-z0-9][a-z0-9-]{0,79}$/u.test(value))
  throw Error("paper-id must be a lowercase stable slug such as day-04");
 return value;
};
const whole=(value,label)=>{
 const n=Number(value);if(!Number.isSafeInteger(n)||n<1900||n>2200)throw Error(label+" must be a year");
 return n;
};
const exists=async path=>(await stat(path).catch(()=>null))!==null;
const json=async path=>JSON.parse(await readFile(path,"utf8"));
const input=path=>resolve(process.cwd(),path);
const atomicText=async(path,text)=>{
 const temp=join(dirname(path),"."+basename(path)+".corpus-"+process.pid+"-"+Date.now());
 await writeFile(temp,text,{flag:"wx"});
 try{await rename(temp,path);}catch(error){await rm(temp,{force:true});throw error;}
};
const atomicJson=(path,value)=>atomicText(path,JSON.stringify(value,null,2)+"\n");
const lockPath=root=>join(root,"question-banks",".corpus-operation.lock");
const journalPath=root=>join(root,"question-banks",".corpus-operation.json");
const relPath=(root,path)=>{
 const rel=relative(root,path).replaceAll("\\","/");
 if(!rel||rel===".."||rel.startsWith("../")||rel.startsWith("/"))throw Error("Corpus journal path escapes repository root");
 return rel;
};
const journalFile=(root,path)=>{
 const base=resolve(root),full=resolve(base,String(path));
 if(full!==base&&!full.startsWith(base+sep))throw Error("Corpus journal path escapes repository root");
 return full;
};
const journalText=value=>JSON.stringify(value,null,2)+"\n";
const journalManifest=(root,path,original,next)=>({path:relPath(root,path),original,next:journalText(next)});
async function writeJournal(root,value){await atomicJson(journalPath(root),value);}
async function clearJournal(root){await rm(journalPath(root),{force:true});}
async function withLock(root,task){
 await mkdir(join(root,"question-banks"),{recursive:true});
 let handle;
 const operationId=String(process.pid)+"-"+Date.now();
 try{
  handle=await open(lockPath(root),"wx");
  await handle.writeFile(JSON.stringify({format:"practice-desk-corpus-lock",version:1,operationId,pid:process.pid,
   startedAt:new Date().toISOString()})+"\n");
 }catch(error){
  if(error&&typeof error==="object"&&"code" in error&&error.code==="EEXIST"){
   const hasJournal=await exists(journalPath(root));
   throw Error(hasJournal?
    "An incomplete corpus transaction is recorded. If no corpus process is active, run question-bank-corpus.mjs recover --root <repo>.":
    "Another corpus operation is already active");
  }
  throw error;
 }
 try{return await task({operationId});}
 finally{await handle.close();await rm(lockPath(root),{force:true});}
}
const processAlive=pid=>{
 if(!Number.isSafeInteger(pid)||pid<=0)return false;
 try{process.kill(pid,0);return true;}catch(error){
  return Boolean(error&&typeof error==="object"&&"code" in error&&error.code==="EPERM");
 }
};
export async function recoverCorpus(options={}){
 const root=resolve(options.root??repoRoot),journalAbs=journalPath(root);
 if(!await exists(journalAbs))throw Error("No incomplete corpus transaction journal exists");
 const journal=await json(journalAbs);
 if(journal?.format!=="practice-desk-corpus-journal"||journal?.version!==1||
    !["add-paper","append-revision"].includes(journal.operation)||typeof journal.operationId!=="string"||
    typeof journal.phase!=="string"||typeof journal.createdPath!=="string"||!Array.isArray(journal.manifests))
  throw Error("Corpus recovery journal is invalid");
 if(await exists(lockPath(root))){
  const lock=await json(lockPath(root)).catch(()=>null);
  if(lock?.operationId===journal.operationId&&processAlive(lock.pid))
   throw Error("Corpus operation "+journal.operationId+" still appears active; recovery refused");
 }
 const created=journalFile(root,journal.createdPath),rows=journal.manifests.map((raw,index)=>{
  if(!raw||typeof raw!=="object"||typeof raw.path!=="string"||typeof raw.original!=="string"||typeof raw.next!=="string")
   throw Error("Corpus recovery journal manifest "+index+" is invalid");
  return {path:journalFile(root,raw.path),original:raw.original,next:raw.next};
 });
 for(const row of rows){
  const current=await readFile(row.path,"utf8");
  if(current!==row.original&&current!==row.next)
   throw Error("Corpus recovery refused because a manifest changed after the interrupted operation: "+row.path);
 }
 for(const row of rows)if(await readFile(row.path,"utf8")!==row.original)await atomicText(row.path,row.original);
 await rm(created,{recursive:true,force:true});
 await loadQuestionBankCatalog(root);
 await clearJournal(root);await rm(lockPath(root),{force:true});
 return operationResult("recover",{recoveredOperation:journal.operation,operationId:journal.operationId,
  recoveredFromPhase:journal.phase,createdPath:journal.createdPath},false);
}
function familyYear(graph,familyId,year){
 const family=graph.families.find(row=>row.family.id===familyId);
 if(!family)throw Error("Unknown maintained family "+familyId);
 if(!family.exam.years.includes(year))throw Error("Family "+familyId+" does not declare year "+year);
 const relative=family.exam.paths[String(year)];
 if(typeof relative!=="string")throw Error("Year path is missing from exam manifest");
 const yearManifestPath=join(dirname(family.family.manifest),relative);
 return {family,yearManifestPath};
}
async function taxonomyFor(root,yearManifestPath,yearManifest){
 if(!yearManifest.taxonomy)return undefined;
 const path=join(root,dirname(yearManifestPath),yearManifest.taxonomy);
 const taxonomy=validateExamTaxonomy(await json(path));
 return {path,taxonomy};
}
async function strictInputs(sourcePath,reviewPath,blueprintPath,taxonomy){
 const raw=await readFile(sourcePath,"utf8");
 if(Buffer.byteLength(raw)>25*1024*1024)throw Error("Source exceeds 25 MiB");
 const source=JSON.parse(raw);
 const pkg=compileExternalQuestionBank(source);
 if(pkg.paper.edition!=="custom")throw Error("Corpus add/append currently supports maintained custom mocks only");
 if(taxonomy)bindExternalQuestionTaxonomy(source,pkg,taxonomy);
 const review=await json(reviewPath);
 const quality=auditQuestionQuality(source,raw,review,{offset:0,limit:50});
 if(!quality.readyForPublication){
  const firstError=quality.issues?.items?.find(issue=>issue.severity==="error");
  throw Error("Quality review is not publication-ready: "+(firstError?.code??quality.issues?.items?.[0]?.code??"review-rejected"));
 }
 const blueprintRaw=await json(blueprintPath);
 const blueprint=validateBlueprint(blueprintRaw,taxonomy);
 const coverage=auditBlueprint(blueprint,[{value:source,raw,digest:sha(raw)}],undefined,{
  offset:0,limit:50,priorSources:[],coverageLimit:5000,taxonomy
 });
 if(!coverage.readyForPublication){
  const firstError=coverage.issues?.items?.find(issue=>issue.severity==="error");
  throw Error("Blueprint is not publication-ready: "+(firstError?.code??coverage.issues?.items?.[0]?.code??"blueprint-rejected"));
 }
 if(blueprint.examId!==source.examId||blueprint.paperId!==source.paperId||blueprint.revision!==source.revision)
  throw Error("Blueprint identity must match the authored source exactly");
 return {raw,source,pkg,reviewRaw:await readFile(reviewPath,"utf8"),
  blueprintRaw:await readFile(blueprintPath,"utf8"),quality,coverage};
}
async function stageRoot(root){
 const stage=await mkdtemp(join(tmpdir(),"practice-desk-corpus-"));
 await cp(join(root,"question-banks"),join(stage,"question-banks"),{recursive:true});
 return stage;
}
async function writeEdition(dir,data){
 await mkdir(dir,{recursive:true});
 await writeFile(join(dir,"bank.authoring.json"),data.raw);
 await writeFile(join(dir,"package.exam.json"),JSON.stringify(data.pkg,null,2)+"\n");
 await writeFile(join(dir,"quality-review.json"),data.reviewRaw);
 await writeFile(join(dir,"blueprint.json"),data.blueprintRaw);
}
async function validatedStage(stage){
 await loadQuestionBankCatalog(stage);
 return readQuestionBankManifestGraph(stage);
}
function editionDescriptor(name){
 return {authoring:name+"/bank.authoring.json",package:name+"/package.exam.json",
  qualityReview:name+"/quality-review.json",blueprint:name+"/blueprint.json"};
}
async function ensureUnchanged(path,expected){
 const actual=await readFile(path,"utf8");
 if(actual!==expected)throw Error("Corpus manifest changed during operation: "+path);
}
async function copyCreateDirectory(source,destination){
 if(await exists(destination))throw Error("Destination already exists: "+destination);
 const parent=dirname(destination),temp=join(parent,"."+basename(destination)+".corpus-"+process.pid+"-"+Date.now());
 await cp(source,temp,{recursive:true,errorOnExist:true,force:false});
 try{await rename(temp,destination);}catch(error){await rm(temp,{recursive:true,force:true});throw error;}
}
function operationResult(kind,fields,dryRun){
 return {format:"practice-desk-corpus-operation",version:1,valid:true,operation:kind,
  dryRun,transactional:"staged-validate-create-rollback",...fields};
}

export async function addPaper(options){
 const root=resolve(options.root??repoRoot),familyId=String(options.familyId??""),
  year=whole(options.year,"year"),paperSlug=stableSlug(options.paperId);
 const graph=await readQuestionBankManifestGraph(root),{family,yearManifestPath}=familyYear(graph,familyId,year);
 if(!family.exam.contentTypes.includes("mock"))throw Error("Family does not allow mock papers");
 const yearAbs=join(root,yearManifestPath),yearRaw=await readFile(yearAbs,"utf8"),yearManifest=JSON.parse(yearRaw);
 const taxonomyInfo=await taxonomyFor(root,yearManifestPath,yearManifest);
 const data=await strictInputs(input(options.sourcePath),input(options.qualityReviewPath),
  input(options.blueprintPath),taxonomyInfo?.taxonomy);
 if(data.source.examId!==family.family.examId)throw Error("Source examId does not match selected family");
 const entryId=yearManifest.id+"-"+paperSlug,relativePaper="mocks/"+paperSlug+"/manifest.json";
 if([...yearManifest.mocks,...yearManifest.pyqs].some(row=>row.id===entryId||row.path===relativePaper))
  throw Error("Paper already exists in year manifest: "+paperSlug);
 if(graph.families.flatMap(x=>x.papers).some(p=>p.paperId===data.source.paperId))
  throw Error("Logical paperId already exists in maintained corpus: "+data.source.paperId);
 const edition="r"+data.pkg.paper.revision;
 const paperManifest={format:"practice-desk-paper-manifest",version:1,id:entryId,
  examId:data.source.examId,paperId:data.source.paperId,kind:"mock",title:data.source.title,
  canonicalEdition:edition,editions:{[edition]:editionDescriptor(edition)}};
 const stage=await stageRoot(root);
 try{
  const stageYearAbs=join(stage,yearManifestPath),stageYear=await json(stageYearAbs);
  stageYear.mocks=[...stageYear.mocks,{id:entryId,path:relativePaper}];
  const stagePaperDir=join(stage,dirname(yearManifestPath),"mocks",paperSlug);
  await writeEdition(join(stagePaperDir,edition),data);
  await writeFile(join(stagePaperDir,"manifest.json"),JSON.stringify(paperManifest,null,2)+"\n");
  await writeFile(stageYearAbs,JSON.stringify(stageYear,null,2)+"\n");
  let examRaw=null,examNext=null,examAbs=null;
  if(options.setCurrent){
   examAbs=join(root,family.family.manifest);examRaw=await readFile(examAbs,"utf8");
   examNext=JSON.parse(examRaw);examNext.currentPaperRef=entryId;
   await writeFile(join(stage,family.family.manifest),JSON.stringify(examNext,null,2)+"\n");
  }
  await validatedStage(stage);
  const fields={familyId,year,paperId:paperSlug,manifestId:entryId,logicalPaperId:data.source.paperId,
   revision:data.pkg.paper.revision,edition,questionCount:data.pkg.questions.length,
   files:[relativePaper,"mocks/"+paperSlug+"/"+edition+"/bank.authoring.json",
    "mocks/"+paperSlug+"/"+edition+"/package.exam.json","mocks/"+paperSlug+"/"+edition+"/quality-review.json",
    "mocks/"+paperSlug+"/"+edition+"/blueprint.json"],setCurrent:Boolean(options.setCurrent)};
  if(options.dryRun)return operationResult("add-paper",fields,true);
  return await withLock(root,async({operationId})=>{
   await ensureUnchanged(yearAbs,yearRaw);
   if(options.setCurrent)await ensureUnchanged(examAbs,examRaw);
   const actualPaperDir=join(root,dirname(yearManifestPath),"mocks",paperSlug);
   const stagedPaperDir=join(stage,dirname(yearManifestPath),"mocks",paperSlug);
   let folderCreated=false,yearChanged=false,examChanged=false;
   const journal={format:"practice-desk-corpus-journal",version:1,operationId,operation:"add-paper",phase:"prepared",
    createdPath:relPath(root,actualPaperDir),manifests:[
     journalManifest(root,yearAbs,yearRaw,stageYear),
     ...(options.setCurrent?[journalManifest(root,examAbs,examRaw,examNext)]:[])
    ]};
   await writeJournal(root,journal);
   try{
    await copyCreateDirectory(stagedPaperDir,actualPaperDir);folderCreated=true;
    journal.phase="folder-created";await writeJournal(root,journal);
    await atomicJson(yearAbs,stageYear);yearChanged=true;
    journal.phase="year-manifest-written";await writeJournal(root,journal);
    if(options.setCurrent){
     await atomicJson(examAbs,examNext);examChanged=true;
     journal.phase="exam-manifest-written";await writeJournal(root,journal);
    }
    await loadQuestionBankCatalog(root);
    await clearJournal(root);
    return operationResult("add-paper",fields,false);
   }catch(error){
    let rollbackFailed=false;
    if(examChanged)try{await atomicText(examAbs,examRaw);}catch{rollbackFailed=true;}
    if(yearChanged)try{await atomicText(yearAbs,yearRaw);}catch{rollbackFailed=true;}
    if(folderCreated)try{await rm(actualPaperDir,{recursive:true,force:true});}catch{rollbackFailed=true;}
    if(!rollbackFailed)await clearJournal(root);
    if(rollbackFailed)throw Error("Corpus add-paper failed and rollback was incomplete; recovery journal retained. "+
     (error instanceof Error?error.message:String(error)));
    throw error;
   }
  });
 }finally{await rm(stage,{recursive:true,force:true});}
}

function resolvePaperEntry(yearManifest,paperId){
 const entries=[...yearManifest.mocks.map(row=>({...row,kind:"mock"})),
  ...yearManifest.pyqs.map(row=>({...row,kind:"pyq"}))];
 const matches=entries.filter(row=>row.id===paperId||basename(dirname(row.path))===paperId);
 if(matches.length!==1)throw Error(matches.length?"paper-id is ambiguous":"Unknown paper-id "+paperId);
 return matches[0];
}
export async function appendRevision(options){
 const root=resolve(options.root??repoRoot),familyId=String(options.familyId??""),
  year=whole(options.year,"year"),paperId=String(options.paperId??"");
 const graph=await readQuestionBankManifestGraph(root),{family,yearManifestPath}=familyYear(graph,familyId,year);
 const yearManifest=await json(join(root,yearManifestPath)),entry=resolvePaperEntry(yearManifest,paperId);
 if(entry.kind!=="mock")throw Error("append-revision currently supports maintained custom mocks only");
 const paperManifestPath=join(dirname(yearManifestPath),entry.path),paperAbs=join(root,paperManifestPath);
 const paperRaw=await readFile(paperAbs,"utf8"),paperManifest=JSON.parse(paperRaw);
 const taxonomyInfo=await taxonomyFor(root,yearManifestPath,yearManifest);
 const data=await strictInputs(input(options.sourcePath),input(options.qualityReviewPath),
  input(options.blueprintPath),taxonomyInfo?.taxonomy);
 if(data.source.examId!==family.family.examId||data.source.paperId!==paperManifest.paperId)
  throw Error("Revision source identity does not match the selected paper");
 const revisions=[];
 for(const edition of Object.values(paperManifest.editions)){
  const pkg=validateExamPackage(await json(join(root,dirname(paperManifestPath),edition.package)));
  if(pkg.paper.edition==="custom")revisions.push(pkg.paper.revision);
 }
 const highest=revisions.length?Math.max(...revisions):0,newRevision=data.pkg.paper.revision;
 if(newRevision<=highest)throw Error("New custom revision must be greater than current highest revision "+highest);
 const edition="r"+newRevision;
 if(Object.hasOwn(paperManifest.editions,edition))throw Error("Edition already exists: "+edition);
 const nextManifest=structuredClone(paperManifest);
 nextManifest.editions[edition]=editionDescriptor(edition);nextManifest.canonicalEdition=edition;
 const stage=await stageRoot(root);
 try{
  const stagePaperAbs=join(stage,paperManifestPath),stagePaperDir=dirname(stagePaperAbs);
  await writeEdition(join(stagePaperDir,edition),data);
  await writeFile(stagePaperAbs,JSON.stringify(nextManifest,null,2)+"\n");
  await validatedStage(stage);
  const fields={familyId,year,paperId:basename(dirname(entry.path)),manifestId:paperManifest.id,
   logicalPaperId:paperManifest.paperId,previousHighestRevision:highest,revision:newRevision,edition,
   questionCount:data.pkg.questions.length,files:[
    entry.path.replace(/manifest\.json$/u,edition+"/bank.authoring.json"),
    entry.path.replace(/manifest\.json$/u,edition+"/package.exam.json"),
    entry.path.replace(/manifest\.json$/u,edition+"/quality-review.json"),
    entry.path.replace(/manifest\.json$/u,edition+"/blueprint.json")
   ]};
  if(options.dryRun)return operationResult("append-revision",fields,true);
  return await withLock(root,async({operationId})=>{
   await ensureUnchanged(paperAbs,paperRaw);
   const actualEdition=join(root,dirname(paperManifestPath),edition);
   const stagedEdition=join(stage,dirname(paperManifestPath),edition);
   let folderCreated=false,manifestChanged=false;
   const journal={format:"practice-desk-corpus-journal",version:1,operationId,operation:"append-revision",phase:"prepared",
    createdPath:relPath(root,actualEdition),manifests:[journalManifest(root,paperAbs,paperRaw,nextManifest)]};
   await writeJournal(root,journal);
   try{
    await copyCreateDirectory(stagedEdition,actualEdition);folderCreated=true;
    journal.phase="folder-created";await writeJournal(root,journal);
    await atomicJson(paperAbs,nextManifest);manifestChanged=true;
    journal.phase="paper-manifest-written";await writeJournal(root,journal);
    await loadQuestionBankCatalog(root);
    await clearJournal(root);
    return operationResult("append-revision",fields,false);
   }catch(error){
    let rollbackFailed=false;
    if(manifestChanged)try{await atomicText(paperAbs,paperRaw);}catch{rollbackFailed=true;}
    if(folderCreated)try{await rm(actualEdition,{recursive:true,force:true});}catch{rollbackFailed=true;}
    if(!rollbackFailed)await clearJournal(root);
    if(rollbackFailed)throw Error("Corpus append-revision failed and rollback was incomplete; recovery journal retained. "+
     (error instanceof Error?error.message:String(error)));
    throw error;
   }
  });
 }finally{await rm(stage,{recursive:true,force:true});}
}

function parse(argv){
 const [operation,...rest]=argv;
 if(!["add-paper","append-revision","recover"].includes(operation))throw Error(
  "Usage: question-bank-corpus.mjs add-paper|append-revision ... | recover [--root <repo>]");
 const out={operation,dryRun:false,setCurrent:false};
 for(let i=0;i<rest.length;i++){
  const key=rest[i];
  if(key==="--dry-run"){if(operation==="recover")throw Error("--dry-run is not valid for recover");out.dryRun=true;continue;}
  if(key==="--set-current"){if(operation!=="add-paper")throw Error("--set-current is add-paper only");out.setCurrent=true;continue;}
  const allowed=operation==="recover"?["--root"]:
   ["--family","--year","--paper-id","--source","--quality-review","--blueprint","--root"];
  if(!allowed.includes(key))throw Error("Unknown corpus flag "+key);
  if(i+1>=rest.length)throw Error("Missing value after "+key);
  const value=rest[++i],name={"--family":"familyId","--year":"year","--paper-id":"paperId",
   "--source":"sourcePath","--quality-review":"qualityReviewPath","--blueprint":"blueprintPath","--root":"root"}[key];
  if(out[name]!==undefined)throw Error("Duplicate corpus flag "+key);out[name]=value;
 }
 if(operation!=="recover")for(const key of ["familyId","year","paperId","sourcePath","qualityReviewPath","blueprintPath"])
  if(out[key]===undefined)throw Error("Missing required corpus option "+key);
 return out;
}
async function main(){
 const args=parse(process.argv.slice(2));
 const result=args.operation==="add-paper"?await addPaper(args):
  args.operation==="append-revision"?await appendRevision(args):await recoverCorpus(args);
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(error){
  process.stderr.write(JSON.stringify({valid:false,code:"corpus-operation-failed",
   message:error instanceof Error?error.message:"Unknown corpus operation failure"},null,2)+"\n");
  process.exitCode=1;
 }
}
