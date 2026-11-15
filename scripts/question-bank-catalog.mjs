import {readFile} from "node:fs/promises";
import {dirname,join,resolve,sep} from "node:path";
import {validateExamPackage} from "../src/domain/exam-package.ts";

const plain=(value,label)=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(label+" must be an object");
 return value;
};
const str=(value,label)=>{
 if(typeof value!=="string"||!value.trim())throw Error(label+" must be a non-empty string");
 return value;
};
const arr=(value,label)=>{
 if(!Array.isArray(value))throw Error(label+" must be an array");
 return value;
};
const integer=(value,label)=>{
 if(!Number.isSafeInteger(value))throw Error(label+" must be an integer");
 return value;
};
const only=(record,allowed,label)=>{
 for(const key of Object.keys(record))if(!allowed.includes(key))
  throw Error(label+" contains unsupported field "+key);
};
const fileAt=(root,path)=>{
 const base=resolve(root),full=resolve(base,str(path,"Question-bank path"));
 if(full!==base&&!full.startsWith(base+sep))throw Error("Question-bank path escapes repository root: "+path);
 return full;
};
const readJson=async(root,path)=>JSON.parse(await readFile(fileAt(root,path),"utf8"));
const readText=(root,path)=>readFile(fileAt(root,path),"utf8");
const relativeTo=(manifestPath,child)=>join(dirname(manifestPath),str(child,"Manifest child path"));

function validateCatalog(value){
 const catalog=plain(value,"Question-bank catalog");
 only(catalog,["format","version","families"],"Question-bank catalog");
 if(catalog.format!=="practice-desk-question-bank-catalog"||catalog.version!==1)
  throw Error("Unsupported question-bank catalog");
 const seenIds=new Set(),seenExamIds=new Set();
 const families=arr(catalog.families,"Question-bank catalog families").map((raw,index)=>{
  const family=plain(raw,"Question-bank family "+index);
  only(family,["id","examId","title","manifest","preinstalled"],"Question-bank family "+index);
  const id=str(family.id,"Family id"),examId=str(family.examId,"Family examId");
  if(seenIds.has(id)||seenExamIds.has(examId))throw Error("Duplicate question-bank family");
  seenIds.add(id);seenExamIds.add(examId);
  if(typeof family.preinstalled!=="boolean")throw Error("Family preinstalled must be boolean");
  return {id,examId,title:str(family.title,"Family title"),
   manifest:str(family.manifest,"Family manifest"),preinstalled:family.preinstalled};
 });
 return {format:catalog.format,version:catalog.version,families};
}

function validateExamManifest(raw,family,path){
 const manifest=plain(raw,"Exam manifest "+path);
 only(manifest,["format","version","id","examId","title","representation","contentTypes","years","paths","currentPaperId"],
  "Exam manifest "+path);
 if(manifest.format!=="practice-desk-exam-bank-manifest"||manifest.version!==1)
  throw Error("Unsupported exam manifest "+path);
 if(str(manifest.id,"Exam manifest id")!==family.id||str(manifest.examId,"Exam manifest examId")!==family.examId)
  throw Error("Exam manifest identity mismatch for "+family.id);
 const representation=str(manifest.representation,"Exam representation");
 if(!["legacy-cgl","exam-packages"].includes(representation))
  throw Error("Unsupported exam representation "+representation);
 const years=arr(manifest.years,"Exam years").map((year,i)=>integer(year,"Exam year "+i));
 if(new Set(years).size!==years.length)throw Error("Duplicate exam year in "+path);
 const paths=plain(manifest.paths,"Exam year paths");
 for(const year of years)str(paths[String(year)],"Path for exam year "+year);
 return {id:manifest.id,examId:manifest.examId,title:str(manifest.title,"Exam title"),
  representation,years,paths,
  ...(manifest.currentPaperId===undefined?{}:{currentPaperId:str(manifest.currentPaperId,"Current paper id")})};
}

function validateYearManifest(raw,exam,year,path){
 const manifest=plain(raw,"Year manifest "+path);
 only(manifest,["format","version","id","examId","title","year","mocks","pyqs"],"Year manifest "+path);
 if(manifest.format!=="practice-desk-exam-year-manifest"||manifest.version!==1)
  throw Error("Unsupported year manifest "+path);
 if(str(manifest.examId,"Year manifest examId")!==exam.examId||integer(manifest.year,"Year")!==year)
  throw Error("Year manifest identity mismatch "+path);
 const readEntries=(value,kind)=>arr(value,kind+" entries").map((rawEntry,index)=>{
  const entry=plain(rawEntry,kind+" entry "+index);
  only(entry,["id","path"],kind+" entry "+index);
  return {id:str(entry.id,kind+" id"),path:str(entry.path,kind+" path"),kind};
 });
 const papers=[...readEntries(manifest.pyqs,"pyq"),...readEntries(manifest.mocks,"mock")];
 const ids=new Set();
 for(const paper of papers){if(ids.has(paper.id))throw Error("Duplicate paper entry "+paper.id);ids.add(paper.id);}
 return papers;
}

function validatePaperManifest(raw,exam,entry,path){
 const manifest=plain(raw,"Paper manifest "+path);
 only(manifest,["format","version","id","examId","paperId","kind","title","canonicalEdition","editions",
  "archive","audit","identityPolicy"],"Paper manifest "+path);
 if(manifest.format!=="practice-desk-paper-manifest"||manifest.version!==1)
  throw Error("Unsupported paper manifest "+path);
 if(str(manifest.id,"Paper manifest id")!==entry.id||
    str(manifest.examId,"Paper manifest examId")!==exam.examId||
    str(manifest.kind,"Paper kind")!==entry.kind)
  throw Error("Paper manifest identity mismatch "+path);
 const editions=plain(manifest.editions,"Paper editions");
 const canonicalEdition=str(manifest.canonicalEdition,"Canonical edition");
 if(!Object.hasOwn(editions,canonicalEdition))throw Error("Canonical edition missing from "+path);
 return {id:manifest.id,examId:manifest.examId,paperId:str(manifest.paperId,"Paper id"),
  kind:manifest.kind,title:str(manifest.title,"Paper title"),canonicalEdition,editions,path};
}

async function manifestPapers(root,family){
 const examPath=family.manifest,exam=validateExamManifest(await readJson(root,examPath),family,examPath);
 const papers=[];
 for(const year of exam.years){
  const yearPath=relativeTo(examPath,exam.paths[String(year)]);
  const entries=validateYearManifest(await readJson(root,yearPath),exam,year,yearPath);
  for(const entry of entries){
   const paperPath=relativeTo(yearPath,entry.path);
   papers.push(validatePaperManifest(await readJson(root,paperPath),exam,entry,paperPath));
  }
 }
 if(exam.currentPaperId&&!papers.some(p=>p.id===exam.currentPaperId))
  throw Error("Current paper id is absent from manifest chain: "+exam.currentPaperId);
 return {exam,papers};
}

async function loadLegacyCgl(root,family,manifestSet){
 const sourceBank={},patchBank={},solutionBank={};
 for(const paper of manifestSet.papers){
  if(paper.kind!=="pyq")throw Error("legacy-cgl supports PYQ papers only");
  const original=plain(paper.editions.original,"CGL original edition "+paper.id);
  const revised=plain(paper.editions.revised,"CGL revised edition "+paper.id);
  only(original,["source"],"CGL original edition "+paper.id);
  only(revised,["patches","solutions"],"CGL revised edition "+paper.id);
  const sourcePath=relativeTo(paper.path,str(original.source,"CGL original source"));
  const source=plain(await readJson(root,sourcePath),"CGL source paper "+paper.id);
  if(str(source.id,"CGL source id")!==paper.paperId)throw Error("CGL source id mismatch "+paper.id);
  if(Object.hasOwn(sourceBank,source.id))throw Error("Duplicate CGL paper "+source.id);
  sourceBank[source.id]=source;
  const patchPath=relativeTo(paper.path,str(revised.patches,"CGL revised patches"));
  const solutionPath=relativeTo(paper.path,str(revised.solutions,"CGL revised solutions"));
  patchBank[source.id]=plain(await readJson(root,patchPath),"CGL patches "+paper.id);
  solutionBank[source.id]=plain(await readJson(root,solutionPath),"CGL solutions "+paper.id);
 }
 return {papersRaw:JSON.stringify(sourceBank),patchesRaw:JSON.stringify(patchBank),
  solutionsRaw:JSON.stringify(solutionBank)};
}

async function loadExamPackages(root,family,manifestSet,seenPaperIds){
 const packages=[],paperIds=[],manifestToPackage=new Map();
 for(const paper of manifestSet.papers){
  const edition=plain(paper.editions[paper.canonicalEdition],"Canonical edition "+paper.id);
  const packagePath=relativeTo(paper.path,str(edition.package,"Canonical package path"));
  const pkg=validateExamPackage(await readJson(root,packagePath));
  if(pkg.examId!==family.examId)throw Error("Package examId mismatch for "+paper.id);
  if(seenPaperIds.has(pkg.paper.id))throw Error("Duplicate preinstalled paper revision "+pkg.paper.id);
  seenPaperIds.add(pkg.paper.id);paperIds.push(pkg.paper.id);packages.push(pkg);
  manifestToPackage.set(paper.id,pkg.paper.id);
 }
 const currentPaperId=manifestSet.exam.currentPaperId?
  manifestToPackage.get(manifestSet.exam.currentPaperId):undefined;
 if(manifestSet.exam.currentPaperId&&!currentPaperId)
  throw Error("Current paper manifest does not resolve to a canonical package");
 return {packages,paperIds,currentPaperId};
}

export async function loadQuestionBankCatalog(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[],packages=[],seenPaperIds=new Set();let legacy=null;
 for(const family of catalog.families){
  if(!family.preinstalled)continue;
  const manifestSet=await manifestPapers(root,family);
  if(manifestSet.exam.representation==="legacy-cgl"){
   if(legacy)throw Error("Only one legacy CGL bank may be preinstalled");
   legacy=await loadLegacyCgl(root,family,manifestSet);
   continue;
  }
  const loaded=await loadExamPackages(root,family,manifestSet,seenPaperIds);
  packages.push(...loaded.packages);
  families.push(Object.freeze({id:family.id,examId:family.examId,title:family.title,
   paperIds:Object.freeze(loaded.paperIds),...(loaded.currentPaperId?{currentPaperId:loaded.currentPaperId}:{})}));
 }
 return {catalog,legacy,preinstalled:Object.freeze({format:"practice-desk-preinstalled-exams",
  version:1,families:Object.freeze(families),packages:Object.freeze(packages)})};
}

export async function readQuestionBankManifestGraph(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[];
 for(const family of catalog.families){
  const manifests=await manifestPapers(root,family);
  families.push({family,exam:manifests.exam,papers:manifests.papers.map(p=>({
   id:p.id,paperId:p.paperId,kind:p.kind,title:p.title,canonicalEdition:p.canonicalEdition,path:p.path
  }))});
 }
 return {catalog,families};
}
