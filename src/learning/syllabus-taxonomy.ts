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
