/** Canonical physical-section editing for authoring drafts.
 * Section timer budgets live only in AuthoringDraft.sections; questions carry
 * section assignment only.
 */
import type {AuthoringDraft} from "./authoring-draft.ts";

export interface AuthoringSection {
 readonly name:string;
 readonly count:number;
 readonly minutes:number;
}
export function authoringSections(d:Pick<AuthoringDraft,"questions"|"sections">):AuthoringSection[]{
 const counts=new Map<string,number>();
 for(const q of d.questions)counts.set(q.section,(counts.get(q.section)??0)+1);
 return d.sections.map(section=>({
  name:section.name,minutes:section.minutes,count:counts.get(section.name)??0
 }));
}
export function setAuthoringSectionMinutes<T extends AuthoringDraft>(
 draft:T,section:string,minutes:number
):T{
 if(!Number.isSafeInteger(minutes)||minutes<0||minutes>600)
  throw Error("Section timer must be a whole number of minutes from 0 to 600");
 if(!draft.sections.some(row=>row.name===section))throw Error("Unknown exam section");
 return {...draft,sections:draft.sections.map(row=>
  row.name===section?{...row,minutes}:row)};
}
export function assignAuthoringQuestionSection<T extends AuthoringDraft>(
 draft:T,questionId:string,newSection:string
):T{
 const title=newSection.trim();
 if(!title||title.length>100||/[\u0000-\u001f\u007f]/u.test(title))
  throw Error("Invalid actual exam section name");
 const source=draft.questions.find(q=>q.id===questionId);
 if(!source)throw Error("Unknown authoring question");
 const sourceSection=draft.sections.find(row=>row.name===source.section);
 if(!sourceSection)throw Error("Question references unknown exam section");
 const sections=draft.sections.some(row=>row.name===title)?
  draft.sections:[...draft.sections,{name:title,minutes:sourceSection.minutes}];
 const questions=draft.questions.map(q=>q.id===questionId?{...q,section:title}:q);
 const used=new Set(questions.map(q=>q.section));
 return {...draft,questions,sections:sections.filter(row=>used.has(row.name))};
}
