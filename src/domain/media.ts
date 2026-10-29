import type { ImageAsset, QuestionRevision, StimulusDefinition } from "./question.js";
import type { AssetId } from "./ids.js";
import { sha256 } from "./hash.ts";

type Obj=Record<string,unknown>;
const MAX_ASSET_BYTES=10*1024*1024;
const MAX_TOTAL_ASSET_BYTES=20*1024*1024;
const rec=(v:unknown,path:string):Obj=>{
 if(!v||typeof v!=="object"||Array.isArray(v))throw new Error(path+": expected an object");
 return v as Obj;
};
const txt=(v:unknown,path:string,allowEmpty=false):string=>{
 if(typeof v!=="string"||(!allowEmpty&&!v.trim()))throw new Error(path+": expected a string");
 return v;
};
const only=(o:Obj,keys:readonly string[],path:string)=>{
 for(const key of Object.keys(o))if(!keys.includes(key))throw new Error(path+"."+key+": unsupported field");
};
const stringList=(v:unknown,path:string):string[]=>{
 if(!Array.isArray(v))throw new Error(path+": expected an array");
 return v.map((x,i)=>txt(x,path+"["+i+"]"));
};
function decodeAsset(uri:string,path:string):Uint8Array{
 const comma=uri.indexOf(",");
 const encoded=comma>=0?uri.slice(comma+1):"";
 if(!encoded||!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw new Error(path+": invalid base64 image");
 if(Math.ceil(encoded.length*3/4)>MAX_ASSET_BYTES)throw new Error(path+": image exceeds 10 MiB");
 try{return Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));}
 catch{throw new Error(path+": invalid base64 image");}
}
export function validateMediaInventory(stimuliInput:unknown,assetsInput:unknown):{
 stimuli:readonly StimulusDefinition[];assets:readonly ImageAsset[]
}{
 if(!Array.isArray(stimuliInput)||stimuliInput.length>200)throw new Error("Invalid stimulus inventory");
 if(!Array.isArray(assetsInput)||assetsInput.length>1000)throw new Error("Invalid media inventory");
 const assetIds=new Set<string>();let total=0;
 for(const [i,value] of assetsInput.entries()){
   const path="assets["+i+"]",a=rec(value,path);
   only(a,["id","mediaType","dataUri","contentHash","altText"],path);
   const id=txt(a.id,path+".id");if(assetIds.has(id))throw new Error("Duplicate media asset");
   const media=txt(a.mediaType,path+".mediaType");
   if(!["image/png","image/jpeg","image/webp","image/avif","image/gif"].includes(media))throw new Error(path+": unsupported image type");
   const uri=txt(a.dataUri,path+".dataUri");
   if(!uri.startsWith("data:"+media+";base64,"))throw new Error(path+": media type and data URI mismatch");
   const bytes=decodeAsset(uri,path+".dataUri");total+=bytes.length;
   if(total>MAX_TOTAL_ASSET_BYTES)throw new Error("Embedded media exceeds 20 MiB");
   const digest=txt(a.contentHash,path+".contentHash");
   if(!/^[a-f0-9]{64}$/.test(digest)||sha256(bytes)!==digest)throw new Error(path+": embedded image digest mismatch");
   if(a.altText!==undefined)txt(a.altText,path+".altText",true);
   assetIds.add(id);
 }
 const stimulusIds=new Set<string>();
 for(const [i,value] of stimuliInput.entries()){
   const path="stimuli["+i+"]",s=rec(value,path);
   const id=txt(s.id,path+".id");if(stimulusIds.has(id))throw new Error("Duplicate stimulus");
   const kind=txt(s.kind,path+".kind");
   if(!["passage","case","table","chart","image"].includes(kind))throw new Error(path+": unsupported stimulus kind");
   if(kind==="passage"||kind==="case"){
     only(s,["id","kind","title","text","assetIds"],path);
     if(s.title!==undefined)txt(s.title,path+".title",true);
     txt(s.text,path+".text",true);
     const ids=s.assetIds===undefined?[]:stringList(s.assetIds,path+".assetIds");
     if(new Set(ids).size!==ids.length)throw new Error(path+".assetIds: duplicate asset");
     if(ids.some(x=>!assetIds.has(x)))throw new Error(path+": missing stimulus image");
   }else if(kind==="table"){
     only(s,["id","kind","title","columns","rows"],path);
     if(s.title!==undefined)txt(s.title,path+".title",true);
     const columns=stringList(s.columns,path+".columns");if(!columns.length)throw new Error(path+": table has no columns");
     if(!Array.isArray(s.rows))throw new Error(path+".rows: expected an array");
     for(const [ri,row] of s.rows.entries()){
       const cells=stringList(row,path+".rows["+ri+"]");
       if(cells.length!==columns.length)throw new Error(path+": table row width mismatch");
     }
   }else{
     only(s,["id","kind","title","assetId","altText","caption"],path);
     if(s.title!==undefined)txt(s.title,path+".title",true);
     const asset=txt(s.assetId,path+".assetId");if(!assetIds.has(asset))throw new Error(path+": missing stimulus image");
     txt(s.altText,path+".altText");
     if(s.caption!==undefined)txt(s.caption,path+".caption",true);
   }
   stimulusIds.add(id);
 }
 return {stimuli:stimuliInput as StimulusDefinition[],assets:assetsInput as ImageAsset[]};
}
function referencedAssets(question:QuestionRevision):string[]{
 const c=question.content,ids=[...(c.assetIds??[])];
 if(c.kind==="single-choice"||c.kind==="multiple-select")for(const o of c.options)ids.push(...(o.assetIds??[]));
 if(c.kind==="matching")for(const item of [...c.leftItems,...c.rightItems])ids.push(...(item.assetIds??[]));
 return ids;
}
export function validateQuestionMediaReferences(
 questions:readonly QuestionRevision[],stimuli:readonly StimulusDefinition[],assets:readonly ImageAsset[]
):void{
 const stimuliById=new Map(stimuli.map(s=>[s.id,s])),assetIds=new Set(assets.map(a=>a.id));
 for(const q of questions){
   if(q.content.stimulusId&&!stimuliById.has(q.content.stimulusId))throw new Error("Missing stimulus");
   if(referencedAssets(q).some(id=>!assetIds.has(id as AssetId)))throw new Error("Missing question image");
 }
}
export function selectDisplayResources(
 questions:readonly QuestionRevision[],stimuli:readonly StimulusDefinition[]=[],assets:readonly ImageAsset[]=[]
):{stimuli:readonly StimulusDefinition[];assets:readonly ImageAsset[]}{
 const wantedStimuli=new Set(questions.flatMap(q=>q.content.stimulusId?[q.content.stimulusId]:[]));
 const selectedStimuli=stimuli.filter(s=>wantedStimuli.has(s.id));
 const wantedAssets=new Set<string>();
 for(const q of questions)for(const id of referencedAssets(q))wantedAssets.add(id);
 for(const s of selectedStimuli){
   if(s.kind==="passage"||s.kind==="case")for(const id of s.assetIds??[])wantedAssets.add(id);
   else if(s.kind==="chart"||s.kind==="image")wantedAssets.add(s.assetId);
 }
 const selectedAssets=assets.filter(a=>wantedAssets.has(a.id));
 validateQuestionMediaReferences(questions,selectedStimuli,selectedAssets);
 validateMediaInventory(selectedStimuli,selectedAssets);
 return {stimuli:structuredClone(selectedStimuli),assets:structuredClone(selectedAssets)};
}
