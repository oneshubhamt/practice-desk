/** Generic semantic topic-path helpers.
 * Exam-specific syllabus/taxonomy knowledge belongs in data sidecars, never here.
 */
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
/** Author- or learner-attributed custom classification, not an exam section.
 * Official/data-backed classification is resolved through the separate taxonomy contract.
 */
export const UNCLASSIFIED_SUBJECT="Unclassified";
export function attributedTopicPath(subject:string,topic:string,subtopic:string):readonly string[]{
 if(typeof subject!=="string"||typeof topic!=="string"||typeof subtopic!=="string")
  throw Error("Invalid topic classification");
 if(subtopic.trim()&&!topic.trim())throw Error("Choose a topic before a subtopic");
 const root=subject.trim()||UNCLASSIFIED_SUBJECT;
 return validateTopicPath([root,...(topic.trim()?[topic.trim()]:[]),
   ...(subtopic.trim()?[subtopic.trim()]:[])]);
}
export function topicPathLabel(id:string):string{
 const path=parseTopicPathId(id);
 return path?path.join(" › "):id;
}
