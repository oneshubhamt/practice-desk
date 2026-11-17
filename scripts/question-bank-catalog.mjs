import {readFile,stat,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {basename,dirname,join,resolve,sep} from "node:path";
import {isDeepStrictEqual} from "node:util";
import {validateExamPackage} from "../src/domain/exam-package.ts";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {auditQuestionQuality} from "./question-quality.mjs";
import {validateBlueprint,auditBlueprint} from "./content-blueprint.mjs";

const sha=value=>createHash("sha256").update(value).digest("hex");

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
const readJsonSource=async(root,path)=>{
 const raw=await readFile(fileAt(root,path),"utf8");
 return {raw,value:JSON.parse(raw),digest:sha(raw)};
};
const readJson=async(root,path)=>(await readJsonSource(root,path)).value;
const childPath=(manifestPath,child,label="Manifest child path")=>{
 const value=str(child,label);
 if(value.startsWith("/")||value.includes("\\")||
    value.split("/").some(part=>!part||part==="."||part===".."))
  throw Error(label+" must be a normalized relative path");
 return join(dirname(manifestPath),value);
};
const requireFile=async(root,path,label)=>{
 const info=await stat(fileAt(root,path)).catch(()=>null);
 if(!info?.isFile())throw Error(label+" does not exist: "+path);
};

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
 only(manifest,["format","version","id","examId","title","representation","contentTypes","years","paths","currentPaperRef"],
  "Exam manifest "+path);
 if(manifest.format!=="practice-desk-exam-bank-manifest"||manifest.version!==1)
  throw Error("Unsupported exam manifest "+path);
 if(str(manifest.id,"Exam manifest id")!==family.id||str(manifest.examId,"Exam manifest examId")!==family.examId)
  throw Error("Exam manifest identity mismatch for "+family.id);
 if(str(manifest.representation,"Exam representation")!=="exam-packages")
  throw Error("Exam manifests must use canonical exam-packages: "+path);
 const contentTypes=arr(manifest.contentTypes,"Exam contentTypes").map((kind,index)=>{
  const value=str(kind,"Exam content type "+index);
  if(value!=="pyq"&&value!=="mock")throw Error("Unsupported exam content type "+value+" in "+path);
  return value;
 });
 if(!contentTypes.length||new Set(contentTypes).size!==contentTypes.length)
  throw Error("Exam contentTypes must be non-empty and unique in "+path);
 const years=arr(manifest.years,"Exam years").map((year,i)=>integer(year,"Exam year "+i));
 if(new Set(years).size!==years.length)throw Error("Duplicate exam year in "+path);
 const paths=plain(manifest.paths,"Exam year paths");
 only(paths,years.map(String),"Exam year paths");
 for(const year of years)childPath(path,paths[String(year)],"Path for exam year "+year);
 return {id:manifest.id,examId:manifest.examId,title:str(manifest.title,"Exam title"),
  representation:"exam-packages",contentTypes,years,paths,
  ...(manifest.currentPaperRef===undefined?{}:{currentPaperRef:str(manifest.currentPaperRef,"Current paper ref")})};
}

function validateYearManifest(raw,exam,year,path){
 const manifest=plain(raw,"Year manifest "+path);
 only(manifest,["format","version","id","examId","title","year","mocks","pyqs"],"Year manifest "+path);
 if(manifest.format!=="practice-desk-exam-year-manifest"||manifest.version!==1)
  throw Error("Unsupported year manifest "+path);
 if(str(manifest.examId,"Year manifest examId")!==exam.examId||integer(manifest.year,"Year")!==year)
  throw Error("Year manifest identity mismatch "+path);
 str(manifest.id,"Year manifest id");str(manifest.title,"Year manifest title");
 const readEntries=(value,kind)=>{
  const rows=arr(value,kind+" entries");
  if(rows.length&&!exam.contentTypes.includes(kind))
   throw Error("Exam contentTypes does not allow "+kind+" entries in "+path);
  return rows.map((rawEntry,index)=>{
   const entry=plain(rawEntry,kind+" entry "+index);
   only(entry,["id","path"],kind+" entry "+index);
   const child=str(entry.path,kind+" path");
   childPath(path,child,kind+" path");
   return {id:str(entry.id,kind+" id"),path:child,kind};
  });
 };
 const papers=[...readEntries(manifest.pyqs,"pyq"),...readEntries(manifest.mocks,"mock")];
 const ids=new Set();
 for(const paper of papers){if(ids.has(paper.id))throw Error("Duplicate paper entry "+paper.id);ids.add(paper.id);}
 return papers;
}

function validatePaperManifest(raw,exam,entry,path){
 const manifest=plain(raw,"Paper manifest "+path);
 only(manifest,["format","version","id","examId","paperId","kind","title","canonicalEdition","editions",
  "archive","audit"],"Paper manifest "+path);
 if(manifest.format!=="practice-desk-paper-manifest"||manifest.version!==1)
  throw Error("Unsupported paper manifest "+path);
 if(str(manifest.id,"Paper manifest id")!==entry.id||
    str(manifest.examId,"Paper manifest examId")!==exam.examId||
    str(manifest.kind,"Paper kind")!==entry.kind)
  throw Error("Paper manifest identity mismatch "+path);
 const rawEditions=plain(manifest.editions,"Paper editions"),editions={};
 const canonicalEdition=str(manifest.canonicalEdition,"Canonical edition");
 if(!Object.hasOwn(rawEditions,canonicalEdition))throw Error("Canonical edition missing from "+path);
 for(const [name,rawEdition] of Object.entries(rawEditions)){
  const edition=plain(rawEdition,"Paper edition "+name+" in "+path);
  only(edition,["authoring","package","qualityReview","blueprint"],"Paper edition "+name+" in "+path);
  const packagePath=str(edition.package,"Package path for "+name+" in "+path);
  childPath(path,packagePath,"Package path for "+name+" in "+path);
  if(basename(packagePath)!=="package.exam.json")
   throw Error("Canonical runtime package must be named package.exam.json in "+path);
  let authoring;
  if(edition.authoring!==undefined){
   authoring=str(edition.authoring,"Authoring path for "+name+" in "+path);
   childPath(path,authoring,"Authoring path for "+name+" in "+path);
   if(basename(authoring)!=="bank.authoring.json")
    throw Error("Canonical maintained authoring source must be named bank.authoring.json in "+path);
  }
  const normalized={...(authoring?{authoring}:{}),package:packagePath};
  for(const [field,fileName] of [["qualityReview","quality-review.json"],["blueprint","blueprint.json"]]){
   if(!Object.hasOwn(edition,field))continue;
   if(edition[field]===null){normalized[field]=null;continue;}
   const binding=str(edition[field],field+" path for "+name+" in "+path);
   childPath(path,binding,field+" path for "+name+" in "+path);
   if(basename(binding)!==fileName)
    throw Error(field+" binding must be named "+fileName+" in "+path);
   normalized[field]=binding;
  }
  if((normalized.qualityReview!==undefined||normalized.blueprint!==undefined)&&!authoring)
   throw Error("Quality/blueprint bindings require a canonical bank.authoring.json source in "+path+" "+name);
  editions[name]=normalized;
 }
 let archive;
 if(manifest.archive!==undefined){
  const rawArchive=plain(manifest.archive,"Paper archive "+path);
  archive={};
  for(const [name,rawPath] of Object.entries(rawArchive)){
   if(!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name))throw Error("Invalid archive label "+name+" in "+path);
   const archivePath=str(rawPath,"Archive path "+name+" in "+path);
   if(!archivePath.startsWith("archive/"))throw Error("Archive path must stay under archive/ in "+path);
   childPath(path,archivePath,"Archive path "+name+" in "+path);
   archive[name]=archivePath;
  }
 }
 let audit;
 if(manifest.audit!==undefined){
  audit=str(manifest.audit,"Audit path in "+path);
  childPath(path,audit,"Audit path in "+path);
  if(!audit.endsWith(".md"))throw Error("Paper audit must be a Markdown file in "+path);
 }
 return {id:manifest.id,examId:manifest.examId,paperId:str(manifest.paperId,"Paper id"),
  kind:manifest.kind,title:str(manifest.title,"Paper title"),canonicalEdition,editions,
  ...(archive===undefined?{}:{archive}),...(audit===undefined?{}:{audit}),path};
}

async function manifestPapers(root,family){
 const examPath=family.manifest,exam=validateExamManifest(await readJson(root,examPath),family,examPath);
 const activePaths=new Set([examPath.replaceAll("\\","/")]);
 const papers=[],manifestIds=new Set(),logicalPaperIds=new Set();
 for(const year of exam.years){
  const yearPath=childPath(examPath,exam.paths[String(year)],"Exam year manifest path");
  activePaths.add(yearPath.replaceAll("\\","/"));
  const entries=validateYearManifest(await readJson(root,yearPath),exam,year,yearPath);
  for(const entry of entries){
   const paperPath=childPath(yearPath,entry.path,"Paper manifest path");
   activePaths.add(paperPath.replaceAll("\\","/"));
   const paper=validatePaperManifest(await readJson(root,paperPath),exam,entry,paperPath);
   const canonical=paper.editions[paper.canonicalEdition];
   if(family.preinstalled&&paper.kind==="mock"&&canonical.authoring){
    for(const [field,fileName] of [["qualityReview","quality-review.json"],["blueprint","blueprint.json"]])
     if(typeof canonical[field]!=="string"||!canonical[field])
      throw Error("Preinstalled canonical maintained mock requires passing bound "+fileName+": "+paper.id);
   }
   if(manifestIds.has(paper.id)||logicalPaperIds.has(paper.paperId))
    throw Error("Duplicate paper identity in manifest graph: "+paper.id);
   for(const [name,edition] of Object.entries(paper.editions)){
    const packagePath=childPath(paperPath,edition.package,"Package path");
    activePaths.add(packagePath.replaceAll("\\","/"));
    await requireFile(root,packagePath,"Package "+paper.id+" "+name);
    if(edition.authoring){
     const authoringPath=childPath(paperPath,edition.authoring,"Authoring path");
     activePaths.add(authoringPath.replaceAll("\\","/"));
     await requireFile(root,authoringPath,"Authoring source "+paper.id+" "+name);
    }
    for(const [field,label] of [["qualityReview","Quality review"],["blueprint","Blueprint"]])
     if(Object.hasOwn(edition,field)&&edition[field]!==null){
      const evidencePath=childPath(paperPath,edition[field],field+" path");
      activePaths.add(evidencePath.replaceAll("\\","/"));
      await requireFile(root,evidencePath,label+" "+paper.id+" "+name);
     }
   }
   if(paper.archive)for(const [name,archivePath] of Object.entries(paper.archive))
    await requireFile(root,childPath(paperPath,archivePath,"Archive path"),
     "Archive evidence "+paper.id+" "+name);
   if(paper.audit)await requireFile(root,childPath(paperPath,paper.audit,"Audit path"),
    "Paper audit "+paper.id);
   manifestIds.add(paper.id);logicalPaperIds.add(paper.paperId);papers.push(paper);
  }
 }
 if(exam.currentPaperRef&&!papers.some(p=>p.id===exam.currentPaperRef))
  throw Error("Current paper ref is absent from manifest chain: "+exam.currentPaperRef);
 return {exam,papers,activePaths};
}

async function assertNoOrphanActiveContent(root,reachable){
 const names=await readdir(fileAt(root,"question-banks"),{recursive:true});
 const active=names.map(name=>"question-banks/"+String(name).replaceAll("\\","/"))
  .filter(path=>!path.includes("/archive/")&&
    (path.endsWith("/manifest.json")||path.endsWith("/bank.authoring.json")||
     path.endsWith("/package.exam.json")||path.endsWith("/quality-review.json")||
     path.endsWith("/blueprint.json")));
 const orphans=active.filter(path=>!reachable.has(path)).sort();
 if(orphans.length)throw Error("Orphan active question-bank content is not reachable from catalog manifests: "+orphans.join(", "));
}

async function loadExamPackages(root,family,manifestSet,seenPaperIds){
 const packages=[],paperIds=[],manifestToCanonical=new Map();
 for(const paper of manifestSet.papers){
  const paperPackages=[];let canonicalPackage=null;
  for(const [editionName,rawEdition] of Object.entries(paper.editions)){
   const edition=plain(rawEdition,"Edition "+editionName+" "+paper.id);
   const packagePath=childPath(paper.path,str(edition.package,"Package path "+paper.id+" "+editionName),
    "Package path "+paper.id+" "+editionName);
   const pkg=validateExamPackage(await readJson(root,packagePath));
   let sourceFile=null;
   if(edition.authoring){
    const authoringPath=childPath(paper.path,edition.authoring,"Authoring path "+paper.id+" "+editionName);
    sourceFile=await readJsonSource(root,authoringPath);
    const generated=compileExternalQuestionBank(sourceFile.value);
    if(!isDeepStrictEqual(generated,pkg))
     throw Error("Generated package diverges from canonical bank.authoring.json: "+paper.id+" "+editionName);
   }
   if(Object.hasOwn(edition,"qualityReview")&&edition.qualityReview!==null){
    if(!sourceFile)throw Error("Quality review binding has no authoring source: "+paper.id+" "+editionName);
    const reviewPath=childPath(paper.path,edition.qualityReview,"Quality review path "+paper.id+" "+editionName);
    const review=await readJson(root,reviewPath);
    const quality=auditQuestionQuality(sourceFile.value,sourceFile.raw,review,{offset:0,limit:50});
    if(!quality.readyForPublication)
     throw Error("Declared quality review is not publication-ready for "+paper.id+" "+editionName+
      ": "+(quality.issues?.items?.[0]?.code??"quality-review-rejected"));
   }
   if(Object.hasOwn(edition,"blueprint")&&edition.blueprint!==null){
    if(!sourceFile)throw Error("Blueprint binding has no authoring source: "+paper.id+" "+editionName);
    const blueprintPath=childPath(paper.path,edition.blueprint,"Blueprint path "+paper.id+" "+editionName);
    const blueprint=validateBlueprint(await readJson(root,blueprintPath));
    const coverage=auditBlueprint(blueprint,[sourceFile],undefined,{
     offset:0,limit:50,priorSources:[],coverageLimit:5000
    });
    if(!coverage.readyForPublication)
     throw Error("Declared blueprint is not publication-ready for "+paper.id+" "+editionName+
      ": "+(coverage.issues?.items?.[0]?.code??"blueprint-rejected"));
   }
   if(pkg.examId!==family.examId)throw Error("Package examId mismatch for "+paper.id+" "+editionName);
   if(pkg.paper.paperId!==paper.paperId&&!pkg.paper.paperId.endsWith(":"+paper.paperId))
    throw Error("Package paperId mismatch for "+paper.id+" "+editionName);
   if((pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")&&editionName!==pkg.paper.edition)
    throw Error("Manifest edition role "+editionName+" disagrees with package "+pkg.paper.edition+" for "+paper.id);
   if(seenPaperIds.has(pkg.paper.id))throw Error("Duplicate preinstalled paper revision "+pkg.paper.id);
   seenPaperIds.add(pkg.paper.id);paperIds.push(pkg.paper.id);packages.push(pkg);paperPackages.push(pkg);
   if(editionName===paper.canonicalEdition){
    manifestToCanonical.set(paper.id,pkg.paper.id);canonicalPackage=pkg;
   }
  }
  const custom=paperPackages.filter(pkg=>pkg.paper.edition==="custom");
  if(custom.length>1){
   const revisions=custom.map(pkg=>pkg.paper.revision);
   if(new Set(revisions).size!==revisions.length)
    throw Error("Custom package revisions must be unique within a paper manifest: "+paper.id);
   if(canonicalPackage?.paper.edition==="custom"&&canonicalPackage.paper.revision!==Math.max(...revisions))
    throw Error("Canonical custom edition must be the highest maintained revision: "+paper.id);
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
 const currentPaperRevisionId=manifestSet.exam.currentPaperRef?
  manifestToCanonical.get(manifestSet.exam.currentPaperRef):undefined;
 if(manifestSet.exam.currentPaperRef&&!currentPaperRevisionId)
  throw Error("Current paper ref does not resolve to a canonical package revision");
 return {packages,paperIds,currentPaperRevisionId};
}

export async function loadQuestionBankCatalog(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[],packages=[],seenPaperIds=new Set(),reachable=new Set();
 for(const family of catalog.families){
  const manifestSet=await manifestPapers(root,family);
  for(const path of manifestSet.activePaths)reachable.add(path);
  // Registered corpus validity is independent of packaging policy: disabled
  // families are still source/package/lineage validated, then omitted from the payload.
  const loaded=await loadExamPackages(root,family,manifestSet,seenPaperIds);
  if(!family.preinstalled)continue;
  packages.push(...loaded.packages);
  families.push(Object.freeze({id:family.id,examId:family.examId,title:family.title,
   paperIds:Object.freeze(loaded.paperIds),
   ...(loaded.currentPaperRevisionId?{currentPaperRevisionId:loaded.currentPaperRevisionId}:{})}));
 }
 await assertNoOrphanActiveContent(root,reachable);
 return {catalog,preinstalled:Object.freeze({format:"practice-desk-preinstalled-exams",
  version:1,families:Object.freeze(families),packages:Object.freeze(packages)})};
}

export async function readQuestionBankManifestGraph(root,catalogOverride){
 const catalog=validateCatalog(catalogOverride??await readJson(root,"question-banks/catalog.json"));
 const families=[],reachable=new Set();
 for(const family of catalog.families){
  const manifests=await manifestPapers(root,family);
  for(const path of manifests.activePaths)reachable.add(path);
  families.push({family,exam:manifests.exam,papers:manifests.papers.map(p=>({
   id:p.id,paperId:p.paperId,kind:p.kind,title:p.title,canonicalEdition:p.canonicalEdition,
   editions:p.editions,path:p.path,...(p.archive===undefined?{}:{archive:p.archive}),
   ...(p.audit===undefined?{}:{audit:p.audit})
  }))});
 }
 await assertNoOrphanActiveContent(root,reachable);
 return {catalog,families};
}
