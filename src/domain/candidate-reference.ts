import type {AssetId,ContentHash} from "./ids.js";
import type {ImageAsset} from "./question.js";
import type {RichDocument,RichInline} from "./rich-document.ts";
import {validateRichDocument} from "./rich-document.ts";
import {hashJson} from "./hash.ts";

export interface CandidateReferenceBinding{
 readonly id:string;
 readonly contentHash:ContentHash;
}

export interface CandidateReferenceSource{
 readonly id:string;
 readonly title:string;
 readonly category?:string;
 readonly keywords?:readonly string[];
 readonly document:RichDocument;
 readonly assetIds?:readonly AssetId[];
}

export interface CandidateReferenceResource extends CandidateReferenceSource{
 readonly contentHash:ContentHash;
}

const MAX_REFERENCES=64;
const MAX_REFERENCE_ASSETS=64;
const MAX_KEYWORDS=24;

function plain(value:unknown,label:string):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error("Invalid "+label);
 return value as Record<string,unknown>;
}
function only(row:Record<string,unknown>,allowed:readonly string[],label:string):void{
 for(const key of Object.keys(row))if(!allowed.includes(key))
  throw Error(label+"."+key+": unsupported field");
}
function text(value:unknown,label:string,max:number):string{
 if(typeof value!=="string"||!value.trim()||value!==value.trim()||value.length>max||
   /[\u0000-\u001f\u007f]/u.test(value))
  throw Error("Invalid "+label);
 return value;
}
function strings(value:unknown,label:string,max:number,itemMax:number):string[]{
 if(!Array.isArray(value)||value.length>max)throw Error("Invalid "+label);
 const out=value.map((item,i)=>text(item,label+"["+i+"]",itemMax));
 if(new Set(out).size!==out.length)throw Error(label+": duplicate value");
 return out;
}
function richAssetIds(doc:RichDocument):Set<string>{
 const ids=new Set<string>();
 const inline=(items:readonly RichInline[])=>{
  for(const item of items)if(item.type==="image")ids.add(item.assetId);
 };
 for(const block of doc.blocks){
  if(block.type==="paragraph"||block.type==="heading")inline(block.content);
  else if(block.type==="list")block.items.forEach(inline);
  else if(block.type==="table")block.rows.forEach(row=>row.forEach(inline));
  else if(block.type==="image")ids.add(block.assetId);
 }
 return ids;
}

export function candidateReferenceHash(value:CandidateReferenceSource):ContentHash{
 return hashJson({
  id:value.id,title:value.title,
  ...(value.category?{category:value.category}:{}),
  ...(value.keywords?.length?{keywords:value.keywords}:{}),
  document:value.document,
  ...(value.assetIds?.length?{assetIds:value.assetIds}:{})
 }) as ContentHash;
}

export function createCandidateReferenceResource(value:CandidateReferenceSource):CandidateReferenceResource{
 return {...value,contentHash:candidateReferenceHash(value)};
}

export function validateCandidateReferenceBindings(value:unknown):readonly CandidateReferenceBinding[]{
 if(!Array.isArray(value)||value.length>MAX_REFERENCES)
  throw Error("paperRevision.candidateTools.references: expected at most "+MAX_REFERENCES+" references");
 const seen=new Set<string>();
 return value.map((item,i)=>{
  const path="paperRevision.candidateTools.references["+i+"]",row=plain(item,path);
  only(row,["id","contentHash"],path);
  const id=text(row.id,path+".id",128);
  const contentHash=text(row.contentHash,path+".contentHash",64) as ContentHash;
  if(!/^[a-f0-9]{64}$/.test(contentHash))throw Error(path+".contentHash: expected SHA-256");
  if(seen.has(id))throw Error(path+": duplicate reference ID");
  seen.add(id);
  return {id,contentHash};
 });
}

export function validateCandidateReferenceResources(
 value:unknown,assets:readonly ImageAsset[]
):readonly CandidateReferenceResource[]{
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>MAX_REFERENCES)
  throw Error("candidateReferences: expected at most "+MAX_REFERENCES+" resources");
 const available=new Set(assets.map(asset=>asset.id as string));
 const seen=new Set<string>();
 return value.map((item,i)=>{
  const path="candidateReferences["+i+"]",row=plain(item,path);
  only(row,["id","title","category","keywords","document","assetIds","contentHash"],path);
  const id=text(row.id,path+".id",128);
  if(seen.has(id))throw Error(path+": duplicate reference ID");
  seen.add(id);
  const title=text(row.title,path+".title",180);
  const category=row.category===undefined?undefined:text(row.category,path+".category",120);
  const keywords=row.keywords===undefined?undefined:strings(row.keywords,path+".keywords",MAX_KEYWORDS,80);
  const assetIds=row.assetIds===undefined?[]:strings(
   row.assetIds,path+".assetIds",MAX_REFERENCE_ASSETS,128
  );
  if(assetIds.some(assetId=>!available.has(assetId)))
   throw Error(path+": missing reference image");
  const knownAssets=new Set(assetIds);
  const document=validateRichDocument(row.document,{knownAssets});
  if(JSON.stringify(row.document)!==JSON.stringify(document))
   throw Error(path+".document: noncanonical rich document");
  const used=richAssetIds(document);
  if(used.size!==knownAssets.size||assetIds.some(assetId=>!used.has(assetId)))
   throw Error(path+".assetIds: must exactly match images used by the reference document");
  const source:CandidateReferenceSource={
   id,title,...(category?{category}:{}),...(keywords?.length?{keywords}:{}),document,
   ...(assetIds.length?{assetIds:assetIds as AssetId[]}:{})
  };
  const contentHash=text(row.contentHash,path+".contentHash",64) as ContentHash;
  if(!/^[a-f0-9]{64}$/.test(contentHash)||candidateReferenceHash(source)!==contentHash)
   throw Error(path+": content hash mismatch");
  return {...source,contentHash};
 });
}

export function assertCandidateReferenceInventory(
 bindings:readonly CandidateReferenceBinding[]|undefined,
 resources:readonly CandidateReferenceResource[]
):void{
 const declared=bindings??[];
 if(declared.length!==resources.length)
  throw Error("Candidate reference inventory does not match paper bindings");
 const byId=new Map(resources.map(resource=>[resource.id,resource]));
 for(const binding of declared){
  const resource=byId.get(binding.id);
  if(!resource||resource.contentHash!==binding.contentHash)
   throw Error("Candidate reference binding does not match packaged resource: "+binding.id);
 }
}

export function candidateReferenceAssetIds(
 resources:readonly CandidateReferenceResource[]
):readonly AssetId[]{
 return [...new Set(resources.flatMap(resource=>resource.assetIds??[]))] as AssetId[];
}
