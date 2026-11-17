import type {ExamId,QuestionRevisionId} from "./ids.js";

export type TaxonomyBasis="official-source-attributed"|"inferred-practice"|"user-defined";
export type TaxonomyNodeKind="subject"|"topic"|"subtopic";

export interface ExamTaxonomyNode{
 readonly id:string;
 readonly label:string;
 readonly kind:TaxonomyNodeKind;
 readonly parentId?:string;
 /** Optional printed/source code such as A, B, C. */
 readonly code?:string;
 /** Exact alternate labels accepted only while binding authored source data. */
 readonly aliases?:readonly string[];
}
export interface ExamTaxonomy{
 readonly format:"practice-desk-taxonomy";
 readonly version:1;
 readonly id:string;
 readonly examId:string;
 readonly title:string;
 readonly basis:TaxonomyBasis;
 readonly asOfDate:string;
 readonly reference:string;
 readonly nodes:readonly ExamTaxonomyNode[];
}
export type TaxonomyAssignments=Readonly<Record<QuestionRevisionId,string>>;

const idPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/u;
const printable=(value:unknown,label:string,max:number):string=>{
 if(typeof value!=="string"||!value.trim()||value!==value.trim()||value.length>max||
    /[\u0000-\u001f\u007f]/u.test(value))throw Error("Invalid "+label);
 return value;
};
const stableId=(value:unknown,label:string,max=120):string=>{
 const id=printable(value,label,max);
 if(!idPattern.test(id))throw Error(label+" must use stable letters/numbers/._:-");
 return id;
};
const isoDate=(value:unknown,label:string):string=>{
 const date=printable(value,label,10);
 if(!/^\d{4}-\d{2}-\d{2}$/u.test(date)||Number.isNaN(Date.parse(date+"T00:00:00.000Z"))||
    new Date(date+"T00:00:00.000Z").toISOString().slice(0,10)!==date)
  throw Error("Invalid "+label);
 return date;
};
const plain=(value:unknown,label:string):Record<string,unknown>=>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error(label+" must be a plain object");
 return value as Record<string,unknown>;
};
const only=(value:Record<string,unknown>,fields:readonly string[],label:string):void=>{
 for(const field of Object.keys(value))if(!fields.includes(field))
  throw Error(label+"."+field+": unsupported field");
};
const normalizedLabel=(value:string)=>value.normalize("NFKC").toLocaleLowerCase("en");

export function validateExamTaxonomy(value:unknown):ExamTaxonomy{
 const raw=plain(value,"taxonomy");
 only(raw,["format","version","id","examId","title","basis","asOfDate","reference","nodes"],"taxonomy");
 if(raw.format!=="practice-desk-taxonomy"||raw.version!==1)throw Error("Unsupported taxonomy format");
 const id=stableId(raw.id,"taxonomy id");
 const examId=stableId(raw.examId,"taxonomy examId");
 const title=printable(raw.title,"taxonomy title",180);
 if(!["official-source-attributed","inferred-practice","user-defined"].includes(String(raw.basis)))
  throw Error("Invalid taxonomy basis");
 const basis=raw.basis as TaxonomyBasis;
 const asOfDate=isoDate(raw.asOfDate,"taxonomy asOfDate");
 const reference=printable(raw.reference,"taxonomy reference",2048);
 if(!Array.isArray(raw.nodes)||raw.nodes.length<1||raw.nodes.length>500)
  throw Error("Taxonomy needs 1–500 nodes");
 const ids=new Set<string>();
 const nodes:ExamTaxonomyNode[]=raw.nodes.map((item,index)=>{
  const node=plain(item,"taxonomy node "+index);
  only(node,["id","label","kind","parentId","code","aliases"],"taxonomy node "+index);
  const nodeId=stableId(node.id,"taxonomy node id");
  if(ids.has(nodeId))throw Error("Duplicate taxonomy node id "+nodeId);
  ids.add(nodeId);
  const label=printable(node.label,"taxonomy node label",160);
  if(!["subject","topic","subtopic"].includes(String(node.kind)))throw Error("Invalid taxonomy node kind");
  const parentId=node.parentId===undefined?undefined:stableId(node.parentId,"taxonomy parent id");
  const code=node.code===undefined?undefined:printable(node.code,"taxonomy node code",24);
  const aliases=node.aliases===undefined?undefined:(()=>{
   if(!Array.isArray(node.aliases)||node.aliases.length>20)throw Error("Invalid taxonomy aliases");
   const values=node.aliases.map((alias,i)=>printable(alias,"taxonomy alias "+i,160));
   if(new Set(values.map(normalizedLabel)).size!==values.length)throw Error("Duplicate taxonomy alias");
   if(values.some(alias=>normalizedLabel(alias)===normalizedLabel(label)))
    throw Error("Taxonomy alias duplicates canonical label");
   return values;
  })();
  return {id:nodeId,label,kind:node.kind as TaxonomyNodeKind,
   ...(parentId?{parentId}:{}),...(code?{code}:{}),...(aliases?.length?{aliases}:{})};
 });
 const byId=new Map(nodes.map(node=>[node.id,node]));
 for(const node of nodes){
  const parent=node.parentId?byId.get(node.parentId):undefined;
  if(node.parentId&&!parent)throw Error("Unknown taxonomy parent "+node.parentId);
  if(node.kind==="subject"&&node.parentId)throw Error("Taxonomy subject must be a root");
  if(node.kind==="topic"&&parent?.kind!=="subject")throw Error("Taxonomy topic must belong to a subject");
  if(node.kind==="subtopic"&&parent?.kind!=="topic")throw Error("Taxonomy subtopic must belong to a topic");
 }
 const siblings=new Map<string,Set<string>>();
 for(const node of nodes){
  const key=node.parentId??"<root>",seen=siblings.get(key)??new Set<string>();
  for(const label of [node.label,...(node.aliases??[])]){
   const normalized=normalizedLabel(label);
   if(seen.has(normalized))throw Error("Ambiguous taxonomy sibling label "+label);
   seen.add(normalized);
  }
  siblings.set(key,seen);
 }
 return {format:"practice-desk-taxonomy",version:1,id,examId,title,basis,asOfDate,reference,nodes};
}
export function taxonomyNode(taxonomy:ExamTaxonomy,id:string):ExamTaxonomyNode|undefined{
 return taxonomy.nodes.find(node=>node.id===id);
}
export function taxonomyPathNodes(taxonomy:ExamTaxonomy,nodeId:string):readonly ExamTaxonomyNode[]{
 const byId=new Map(taxonomy.nodes.map(node=>[node.id,node]));
 const out:ExamTaxonomyNode[]=[];
 let current=byId.get(nodeId);
 const seen=new Set<string>();
 while(current){
  if(seen.has(current.id))throw Error("Taxonomy cycle");
  seen.add(current.id);out.push(current);
  current=current.parentId?byId.get(current.parentId):undefined;
 }
 if(!out.length)throw Error("Unknown taxonomy node "+nodeId);
 return out.reverse();
}
export const taxonomyPathLabels=(taxonomy:ExamTaxonomy,nodeId:string):readonly string[] =>
 taxonomyPathNodes(taxonomy,nodeId).map(node=>node.label);
export const taxonomyRoots=(taxonomy:ExamTaxonomy):readonly ExamTaxonomyNode[] =>
 taxonomy.nodes.filter(node=>node.kind==="subject");
export function resolveTaxonomyPath(taxonomy:ExamTaxonomy,labels:readonly string[]):ExamTaxonomyNode|undefined{
 if(!Array.isArray(labels)||labels.length<1||labels.length>3)return undefined;
 let parentId: string|undefined;
 let found:ExamTaxonomyNode|undefined;
 for(const raw of labels){
  if(typeof raw!=="string"||!raw.trim())return undefined;
  const wanted=normalizedLabel(raw.trim());
  const matches=taxonomy.nodes.filter(node=>(node.parentId??undefined)===parentId&&
    [node.label,...(node.aliases??[])].some(label=>normalizedLabel(label)===wanted));
  if(matches.length!==1)return undefined;
  found=matches[0]!;parentId=found.id;
 }
 return found;
}
export function validateTaxonomyAssignments(
 taxonomy:ExamTaxonomy|undefined,assignments:unknown,questionIds:ReadonlySet<string>
):TaxonomyAssignments|undefined{
 if(assignments===undefined)return undefined;
 if(!taxonomy)throw Error("Taxonomy assignments require a taxonomy");
 const raw=plain(assignments,"taxonomyAssignments");
 const out:Record<string,string>={};
 for(const [questionId,nodeValue] of Object.entries(raw)){
  if(!questionIds.has(questionId))throw Error("Unknown taxonomy assignment question "+questionId);
  const nodeId=stableId(nodeValue,"taxonomy assignment node");
  if(!taxonomyNode(taxonomy,nodeId))throw Error("Unknown taxonomy assignment node "+nodeId);
  out[questionId]=nodeId;
 }
 return out as TaxonomyAssignments;
}
export function assertTaxonomyExam(taxonomy:ExamTaxonomy,examId:ExamId|string):void{
 if(taxonomy.examId!==examId)throw Error("Taxonomy examId does not match package examId");
}
