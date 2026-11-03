/** P47-5B canonical source document for authoring and frozen display; no active QuestionRevision uses this yet. */
export type RichMark="strong"|"emphasis"|"underline"|"subscript"|"superscript"|"code";
export type RichInline=
  | {type:"text";text:string;marks?:readonly RichMark[]}
  | {type:"math";tex:string;linearText:string}
  | {type:"image";assetId:string;altText:string};
export type RichBlock=
  | {type:"paragraph";content:readonly RichInline[]}
  | {type:"heading";level:2|3;content:readonly RichInline[]}
  | {type:"list";ordered:boolean;items:readonly (readonly RichInline[])[]}
  | {type:"table";rows:readonly (readonly (readonly RichInline[])[])[]}
  | {type:"display-math";tex:string;linearText:string}
  | {type:"image";assetId:string;altText:string};
export interface RichDocument{
  readonly format:"practice-desk-rich";readonly version:1;
  readonly blocks:readonly RichBlock[];
}
export type RichValidationOptions={readonly knownAssets?:ReadonlySet<string>};
export const RICH_LIMITS=Object.freeze({
  blocks:128,nodes:1500,textBytes:20000,eachText:5000,tex:2048,
  alt:500,tableRows:40,tableColumns:12,listItems:80
});
const marks:readonly RichMark[]=["strong","emphasis","underline","subscript","superscript","code"];
function record(v:unknown,allowed:readonly string[],label:string):Record<string,unknown>{
  if(!v||typeof v!=="object"||Array.isArray(v)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(v)))
    throw Error("Invalid "+label);
  const r=v as Record<string,unknown>;
  if(Object.keys(r).some(key=>!allowed.includes(key)))throw Error("Unknown "+label+" field");
  return r;
}
function list(v:unknown,max:number):unknown[]{
  if(!Array.isArray(v)||v.length>max)throw Error("Rich array limit");
  return v;
}
function field(v:unknown,max:number,required=false):string{
  if(typeof v!=="string"||v.length>max||(required&&!v.trim())||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v))throw Error("Invalid rich text field");
  return v;
}
function freezeDeep<T>(v:T):T{
  if(v&&typeof v==="object"){
    for(const child of Object.values(v))freezeDeep(child);
    Object.freeze(v);
  }
  return v;
}
export function validateRichDocument(input:unknown,opts:RichValidationOptions={}):RichDocument{
  const r=record(input,["format","version","blocks"],"document");
  if(r.format!=="practice-desk-rich"||r.version!==1)throw Error("Unsupported rich format");
  let nodes=0,total=0;
  const charge=(n:number):void=>{
    if(++nodes>RICH_LIMITS.nodes||(total+=n)>RICH_LIMITS.textBytes)
      throw Error("Rich document budget exceeded");
  };
  const math=(v:Record<string,unknown>)=>{
    const tex=field(v.tex,RICH_LIMITS.tex,true);
    const linearText=field(v.linearText,RICH_LIMITS.alt,true);
    charge(tex.length+linearText.length);
    return {tex,linearText};
  };
  const asset=(v:Record<string,unknown>)=>{
    const assetId=field(v.assetId,128,true),altText=field(v.altText,RICH_LIMITS.alt,true);
    if(!/^[A-Za-z0-9_.:-]+$/u.test(assetId)||!opts.knownAssets?.has(assetId))
      throw Error("Unverified image asset reference");
    charge(assetId.length+altText.length);
    return {assetId,altText};
  };
  const inline=(v:unknown):RichInline=>{
    const i=record(v,["type","text","marks","tex","linearText","assetId","altText"],"inline");
    if(i.type==="text"){
      record(v,["type","text","marks"],"text");
      const text=field(i.text,RICH_LIMITS.eachText);
      const raw=i.marks===undefined?[]:list(i.marks,marks.length);
      if(raw.some(m=>!marks.includes(m as RichMark))||new Set(raw).size!==raw.length)
        throw Error("Invalid text marks");
      const ordered=(raw as RichMark[]).slice().sort((a,b)=>marks.indexOf(a)-marks.indexOf(b));
      charge(text.length);
      return ordered.length?{type:"text",text,marks:ordered}:{type:"text",text};
    }
    if(i.type==="math"){record(v,["type","tex","linearText"],"math");return {type:"math",...math(i)};}
    if(i.type==="image"){record(v,["type","assetId","altText"],"image");return {type:"image",...asset(i)};}
    throw Error("Unknown inline type");
  };
  const content=(v:unknown):RichInline[]=>list(v,RICH_LIMITS.nodes).map(inline);
  const blocks=list(r.blocks,RICH_LIMITS.blocks).map(value=>{
    const b=record(value,["type","content","level","ordered","items","rows","tex","linearText","assetId","altText"],"block");
    charge(0);
    if(b.type==="paragraph"){record(value,["type","content"],"paragraph");return {type:"paragraph",content:content(b.content)};}
    if(b.type==="heading"){
      record(value,["type","level","content"],"heading");
      if(b.level!==2&&b.level!==3)throw Error("Heading level");
      return {type:"heading",level:b.level,content:content(b.content)};
    }
    if(b.type==="list"){
      record(value,["type","ordered","items"],"list");
      if(typeof b.ordered!=="boolean")throw Error("List ordering");
      return {type:"list",ordered:b.ordered,items:list(b.items,RICH_LIMITS.listItems).map(content)};
    }
    if(b.type==="table"){
      record(value,["type","rows"],"table");
      const rows=list(b.rows,RICH_LIMITS.tableRows).map(row=>list(row,RICH_LIMITS.tableColumns).map(content));
      if(!rows[0]?.length||rows.some(row=>row.length!==rows[0]!.length))throw Error("Table shape");
      return {type:"table",rows};
    }
    if(b.type==="display-math"){
      record(value,["type","tex","linearText"],"display math");
      return {type:"display-math",...math(b)};
    }
    if(b.type==="image"){
      record(value,["type","assetId","altText"],"block image");
      return {type:"image",...asset(b)};
    }
    throw Error("Unknown rich block");
  }) as RichBlock[];
  return freezeDeep({format:"practice-desk-rich",version:1,blocks});
}
export function plainRichDocument(text:string):RichDocument{
  return validateRichDocument({format:"practice-desk-rich",version:1,
    blocks:[{type:"paragraph",content:[{type:"text",text}]}]});
}
export function canonicalRichDocument(value:unknown,opts:RichValidationOptions={}):string{
  return JSON.stringify(validateRichDocument(value,opts));
}
