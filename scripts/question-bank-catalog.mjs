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
 if(str(manifest.representation,"Exam representation")!=="exam-packages")
  throw Error("Exam manifests must use canonical exam-packages: "+path);
 const years=arr(manifest.years,"Exam years").map((year,i)=>integer(year,"Exam year "+i));
 if(new Set(years).size!==years.length)throw Error("Duplicate exam year in "+path);
 const paths=plain(manifest.paths,"Exam year paths");
 for(const year of years)str(paths[String(year)],"Path for exam year "+year);
 return {id:manifest.id,examId:manifest.examId,title:str(manifest.title,"Exam title"),
  representation:"exam-packages",years,paths,
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
 for(const [name,rawEdition] of Object.entries(editions)){
  const edition=plain(rawEdition,"Paper edition "+name+" in "+path);
  only(edition,["authoring","package"],"Paper edition "+name+" in "+path);
  str(edition.package,"Package path for "+name+" in "+path);
  if(edition.authoring!==undefined)str(edition.authoring,"Authoring path for "+name+" in "+path);
 }
 return {id:manifest.id,examId:manifest.examId,paperId:str(manifest.paperId,"Paper id"),
  kind:manifest.kind,title:str(manifest.title,"Paper title"),canonicalEdition,editions,
  ...(manifest.archive===undefined?{}:{archive:manifest.archive}),
  ...(manifest.audit===undefined?{}:{audit:manifest.audit}),
  ...(manifest.identityPolicy===undefined?{}:{identityPolicy:manifest.identityPolicy}),path};
}

async function manifestPapers(root,family){
 const examPath=family.manifest,exam=validateExamManifest(await readJson(root,examPath),family,examPath);
 const papers=[],manifestIds=new Set(),logicalPaperIds=new Set();
 for(const year of exam.years){
  const yearPath=relativeTo(examPath,exam.paths[String(year)]);
  const entries=validateYearManifest(await readJson(root,yearPath),exam,year,yearPath);
  for(const entry of entries){
   const paperPath=relativeTo(yearPath,entry.path);
   const paper=validatePaperManifest(await readJson(root,paperPath),exam,entry,paperPath);
   if(manifestIds.has(paper.id)||logicalPaperIds.has(paper.paperId))
    throw Error("Duplicate paper identity in manifest graph: "+paper.id);
   manifestIds.add(paper.id);logicalPaperIds.add(paper.paperId);papers.push(paper);
  }
 }
 if(exam.currentPaperId&&!papers.some(p=>p.id===exam.currentPaperId))
  throw Error("Current paper id is absent from manifest chain: "+exam.currentPaperId);
 return {exam,papers};
}

async function loadExamPackages(root,family,manifestSet,seenPaperIds){
 const packages=[],paperIds=[],manifestToCanonical=new Map();
 for(const paper of manifestSet.papers){
  const paperPackages=[];
  for(const [editionName,rawEdition] of Object.entries(paper.editions)){
   const edition=plain(rawEdition,"Edition "+editionName+" "+paper.id);
   const packagePath=relativeTo(paper.path,str(edition.package,"Package path "+paper.id+" "+editionName));
   const pkg=validateExamPackage(await readJson(root,packagePath));
   if(pkg.examId!==family.examId)throw Error("Package examId mismatch for "+paper.id+" "+editionName);
   if(pkg.paper.paperId!==paper.paperId&&!pkg.paper.paperId.endsWith(":"+paper.paperId))
    throw Error("Package paperId mismatch for "+paper.id+" "+editionName);
   if((pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")&&editionName!==pkg.paper.edition)
    throw Error("Manifest edition role "+editionName+" disagrees with package "+pkg.paper.edition+" for "+paper.id);
   if(seenPaperIds.has(pkg.paper.id))throw Error("Duplicate preinstalled paper revision "+pkg.paper.id);
   seenPaperIds.add(pkg.paper.id);paperIds.push(pkg.paper.id);packages.push(pkg);paperPackages.push(pkg);
   if(editionName===paper.canonicalEdition)manifestToCanonical.set(paper.id,pkg.paper.id);
  }
  const source=paperPackages.filter(pkg=>pkg.paper.edition==="source");
  const reviewed=paperPackages.filter(pkg=>pkg.paper.edition==="reviewed");
  if(source.length>1||reviewed.length>1)
   throw Error("Paper manifest has ambiguous Source/Reviewed editions: "+paper.id);
  if(reviewed.length){
   if(source.length!==1)throw Error("Reviewed package requires Source in the same paper manifest: "+paper.id);
   const target=reviewed[0],origin=source[0];
   if(target.paper.sourcePaperRevisionId!==origin.paper.id||
      target.paper.sourceAnswerKeyRevisionId!==origin.answerKey.id)
    throw Error("Reviewed package lineage does not pin the exact Source package/key: "+paper.id);
  }
  if(!manifestToCanonical.has(paper.id))throw Error("Canonical edition did not resolve for "+paper.id);
 }
 const currentPaperId=manifestSet.exam.currentPaperId?
  manifestToCanonical.get(manifestSet.exam.currentPaperId):undefined;
 if(manifestSet.exam.currentPaperId&&!currentPaperId)
  throw Error("Current paper manifest does not resolve to a canonical package");
 return {packages,paperIds,currentPaperId};
}

export async function loadQuestionBankCatalog(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[],packages=[],seenPaperIds=new Set();
 for(const family of catalog.families){
  if(!family.preinstalled)continue;
  const manifestSet=await manifestPapers(root,family);
  const loaded=await loadExamPackages(root,family,manifestSet,seenPaperIds);
  packages.push(...loaded.packages);
  families.push(Object.freeze({id:family.id,examId:family.examId,title:family.title,
   paperIds:Object.freeze(loaded.paperIds),...(loaded.currentPaperId?{currentPaperId:loaded.currentPaperId}:{})}));
 }
 return {catalog,preinstalled:Object.freeze({format:"practice-desk-preinstalled-exams",
  version:1,families:Object.freeze(families),packages:Object.freeze(packages)})};
}

export async function readQuestionBankManifestGraph(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[];
 for(const family of catalog.families){
  const manifests=await manifestPapers(root,family);
  families.push({family,exam:manifests.exam,papers:manifests.papers.map(p=>({
   id:p.id,paperId:p.paperId,kind:p.kind,title:p.title,canonicalEdition:p.canonicalEdition,
   editions:p.editions,path:p.path,...(p.archive===undefined?{}:{archive:p.archive})
  }))});
 }
 return {catalog,families};
}
