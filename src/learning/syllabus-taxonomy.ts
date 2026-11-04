/** Explicit, versioned syllabus labels. This catalogue never infers a question's topic.
 * Broad APFC headings are supplied as an authoring aid; author/user attribution
 * must be explicit, and official status is not inferred for imported papers.
 */
export interface SyllabusHeading {readonly id:string;readonly label:string}
export interface SyllabusTaxonomy {
 readonly id:string;readonly version:number;readonly examId:string;
 readonly headings:readonly SyllabusHeading[];
}
export const APFC_SYLLABUS_V1:SyllabusTaxonomy={
 id:"apfc-broad",version:1,examId:"upsc-epfo-apfc",
 headings:[
  {id:"english",label:"General English"},
  {id:"culture",label:"Indian Culture, Heritage and Freedom Movements"},
  {id:"economy",label:"Developmental Issues and Present Trends in Indian Economy"},
  {id:"governance",label:"Governance and Constitution of India"},
  {id:"science-computers",label:"General Science and Basic Knowledge of Computer Applications"},
  {id:"maths",label:"Elementary Mathematics, Statistics and General Mental Ability"},
  {id:"labour",label:"Industrial Relations, Labour Codes and Social Security in India"},
  {id:"accountancy",label:"Principles of Accountancy, Auditing and Insurance"},
  {id:"current-events",label:"Current Events of National and International Importance"}
 ]
};
export const SUPPORTED_TAXONOMIES:readonly SyllabusTaxonomy[]=[APFC_SYLLABUS_V1];
export function syllabusForExam(examId:string):SyllabusTaxonomy|undefined{
 return SUPPORTED_TAXONOMIES.find(t=>t.examId===examId);
}
export function syllabusHeading(examId:string,headingId:string):SyllabusHeading|undefined{
 return syllabusForExam(examId)?.headings.find(h=>h.id===headingId);
}


/** P49: explicit user/publisher-attributed hierarchy, never inferred from
 * question prose or treated as an official syllabus endorsement.
 * IDs encode the FULL path to avoid joining homonymous topics under
 * different examination subjects. Each ancestor has its own stable key. */
export interface TopicPathNode{
 readonly id:string;readonly parentId:string|null;
 readonly label:string;readonly path:readonly string[];readonly depth:number;
}
export function validateTopicPath(input:readonly string[]):readonly string[]{
 if(!Array.isArray(input)||input.length<1||input.length>3)
   throw Error("A topic path needs 1–3 hierarchical labels");
 const path=input.map((item,index)=>{
   if(typeof item!=="string"||!item.trim()||item!==item.trim()||
      item.length>120||/[\u0000-\u001f\u007f]/u.test(item))
     throw Error("Invalid hierarchical topic level "+(index+1));
   return item;
 });
 return path;
}
export function topicPathId(input:readonly string[]):string{
 const path=validateTopicPath(input);
 return "topic:"+path.map(encodeURIComponent).join("/");
}
export function parseTopicPathId(value:string):readonly string[]|null{
 if(typeof value!=="string"||!value.startsWith("topic:"))return null;
 try{
   const path=value.slice(6).split("/").map(decodeURIComponent);
   return topicPathId(path)===value?path:null;
 }catch{return null;}
}
export function topicAncestors(input:readonly string[]):readonly TopicPathNode[]{
 const path=validateTopicPath(input);
 return path.map((label,index)=>{
   const prefix=path.slice(0,index+1);
   return {id:topicPathId(prefix),parentId:index?topicPathId(path.slice(0,index)):null,
     label,path:prefix,depth:index+1};
 });
}
/** Broad APFC heading is user-chosen; for all other exams an explicit
 * section/source label supplies the root. No model-assigned subject. */
export function attributedTopicPath(examId:string,sectionTitle:string,
 headingId:string|undefined,topic:string,subtopic:string):readonly string[]{
 if(subtopic.trim()&&!topic.trim())throw Error("Choose a topic before a subtopic");
 const heading=headingId?syllabusHeading(examId,headingId):undefined;
 if(headingId&&!heading)throw Error("Unknown syllabus heading");
 const root=heading?.label??sectionTitle.trim();
 const result=[root,...(topic.trim()?[topic.trim()]:[]),
   ...(subtopic.trim()?[subtopic.trim()]:[])];
 return validateTopicPath(result);
}
