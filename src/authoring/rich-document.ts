/** P47-5A: neutral, versioned draft AST, not yet a published QuestionRevision. */
export type RichMark="strong"|"emphasis"|"underline"|"code"|"subscript"|"superscript";
export type RichInline=
 | {readonly type:"text";readonly text:string;readonly marks?:readonly RichMark[]}
 | {readonly type:"math";readonly tex:string;readonly linearText:string}
 | {readonly type:"image";readonly assetId:string;readonly altText:string};
export type RichBlock=
 | {readonly type:"paragraph";readonly content:readonly RichInline[]}
 | {readonly type:"heading";readonly level:2|3;readonly content:readonly RichInline[]}
 | {readonly type:"list";readonly ordered:boolean;readonly items:readonly (readonly RichInline[])[]}
 | {readonly type:"table";readonly rows:readonly (readonly (readonly RichInline[])[])[]}
 | {readonly type:"display-math";readonly tex:string;readonly linearText:string}
 | {readonly type:"image";readonly assetId:string;readonly altText:string};
export interface RichDocument{
 readonly format:"practice-desk-rich";
 readonly version:1;
 readonly blocks:readonly RichBlock[];
}
export interface RichValidationOptions{
 readonly knownAssetIds?:ReadonlySet<string>;
 readonly requireNonempty?:boolean;
}
export const RICH_DOCUMENT_LIMITS=Object.freeze({
 maxBlocks:128,maxNodes:1500,maxCharacters:20000,maxText:5000,
 maxTex:2048,maxAlt:500,maxTableRows:40,maxTableColumns:12,maxListItems:80
});
const MARKS:readonly RichMark[]=["strong","emphasis","underline","code","subscript","superscript"];
const L=RICH_DOCUMENT_LIMITS;
function obj(v:unknown,keys:readonly string[],label:string):Record<string,unknown>{
 if(!v||typeof v!=="object"||Array.isArray(v)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw Error("Invalid "+label+" object");
 const record=v as Record<string,unknown>;
 for(const k of Object.keys(record))if(!keys.includes(k))throw Error("Unexpected "+label+" property: "+k);
 return record;
}
function str(v:unknown,label:string,max:number,required=false):string{
 if(typeof v!=="string"||v.length>max||(required&&!v.trim())||
   /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(v))throw Error("Invalid "+label);
 return v;
}
function arr(v:unknown,label:string,max:number):unknown[]{
 if(!Array.isArray(v)||v.length>max)throw Error("Invalid "+label);
 return v;
}
function frozen<T>(v:T):T{
 if(v&&typeof v==="object"){
   for(const child of Object.values(v))frozen(child);
   Object.freeze(v);
 }
 return v;
}
/** Normalizes, clones and freezes. Rejects every unknown property, HTML and URL. */
export function validateRichDocument(input:unknown,options:RichValidationOptions={}):RichDocument{
 const source=obj(input,["format","version","blocks"],"rich document");
 if(source.format!=="practice-desk-rich"||source.version!==1)
   throw Error("Unsupported rich document version");
 const rawBlocks=arr(source.blocks,"rich blocks",L.maxBlocks);
 let nodes=0,characters=0,visible=false;
 const count=(value:string)=>{
   nodes++;
   characters+=value.length;
   if(nodes>L.maxNodes||characters>L.maxCharacters)throw Error("Rich document budget exceeded");
   if(value.trim())visible=true;
 };
 const localImage=(s:Record<string,unknown>)=>{
   const assetId=str(s.assetId,"local image ID",128,true);
   if(!/^[\w.:-]+$/u.test(assetId)||!options.knownAssetIds?.has(assetId))
     throw Error("Image must reference a verified local asset ID");
   const altText=str(s.altText,"image alt text",L.maxAlt,true);
   count(altText);
   return {assetId,altText};
 };
 const math=(s:Record<string,unknown>)=>{
   const tex=str(s.tex,"explicit TeX",L.maxTex,true);
   const linearText=str(s.linearText,"accessible math text",L.maxAlt,true);
   count(tex);count(linearText);
   return {tex,linearText};
 };
 const inline=(value:unknown):RichInline=>{
   const s=obj(value,["type","text","marks","tex","linearText","assetId","altText"],"inline");
   if(s.type==="text"){
     obj(value,["type","text","marks"],"text inline");
     const text=str(s.text,"inline text",L.maxText);
     const marks=s.marks===undefined?[]:arr(s.marks,"text marks",MARKS.length);
     if(marks.some(x=>!MARKS.includes(x as RichMark))||new Set(marks).size!==marks.length)
       throw Error("Unsupported or duplicate text marks");
     count(text);
     const normalized=[...marks] as RichMark[];
     normalized.sort((a,b)=>MARKS.indexOf(a)-MARKS.indexOf(b));
     return normalized.length?{type:"text",text,marks:normalized}:{type:"text",text};
   }
   if(s.type==="math"){
     obj(value,["type","tex","linearText"],"math inline");
     return {type:"math",...math(s)};
   }
   if(s.type==="image"){
     obj(value,["type","assetId","altText"],"image inline");
     return {type:"image",...localImage(s)};
   }
   throw Error("Unknown rich inline type");
 };
 const sequence=(value:unknown):readonly RichInline[]=>
   arr(value,"inline sequence",L.maxNodes).map(inline);
 const blocks=rawBlocks.map(value=>{
   const s=obj(value,["type","content","level","ordered","items","rows","tex","linearText","assetId","altText"],"block");
   if(++nodes>L.maxNodes)throw Error("Rich document budget exceeded");
   switch(s.type){
     case "paragraph":
       obj(value,["type","content"],"paragraph");
       return {type:"paragraph",content:sequence(s.content)};
     case "heading":
       obj(value,["type","level","content"],"heading");
       if(s.level!==2&&s.level!==3)throw Error("Invalid heading level");
       return {type:"heading",level:s.level,content:sequence(s.content)};
     case "list":
       obj(value,["type","ordered","items"],"list");
       if(typeof s.ordered!=="boolean")throw Error("Invalid list ordering");
       return {type:"list",ordered:s.ordered,items:
         arr(s.items,"list items",L.maxListItems).map(sequence)};
     case "table":{
       obj(value,["type","rows"],"table");
       const rows=arr(s.rows,"table rows",L.maxTableRows).map(row=>
         arr(row,"table cells",L.maxTableColumns).map(sequence));
       const width=rows[0]?.length??0;
       if(!width||rows.some(row=>row.length!==width))throw Error("Invalid table rectangle");
       return {type:"table",rows};
     }
     case "display-math":
       obj(value,["type","tex","linearText"],"display math");
       return {type:"display-math",...math(s)};
     case "image":
       obj(value,["type","assetId","altText"],"block image");
       return {type:"image",...localImage(s)};
     default:throw Error("Unknown rich block type");
   }
 }) as RichBlock[];
 if(options.requireNonempty&&!visible)throw Error("Publishable rich content is empty");
 return frozen({format:"practice-desk-rich",version:1,blocks});
}
/** Preserve every literal character, including Unicode and dollar symbols. */
export function plainRichDocument(text:string):RichDocument{
 return validateRichDocument({format:"practice-desk-rich",version:1,
   blocks:[{type:"paragraph",content:[{type:"text",text}]}]});
}
/** Deterministic serialized candidate for future content-hash construction. */
export function canonicalRichDocument(input:unknown,options:RichValidationOptions={}):string{
 return JSON.stringify(validateRichDocument(input,options));
}
