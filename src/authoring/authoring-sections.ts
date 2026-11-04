/** P54 physical-section editing, without a second persisted section schema.
 * The already-published format stores one timer per section; the draft's
 * per-question legacy fields are a denormalised, strictly validated view.
 */
import type {AuthoringDraft} from "./authoring-draft.ts";

export interface AuthoringSection {
 readonly name:string;
 readonly count:number;
 readonly minutes:number;
 readonly conflict:boolean;
}
export function authoringSections(d:Pick<AuthoringDraft,"questions">):AuthoringSection[]{
 const rows=new Map<string,AuthoringSection>();
 for(const q of d.questions){
  const duration=q.sectionMinutes??15;
  const row=rows.get(q.section);
  rows.set(q.section,row?{...row,count:row.count+1,conflict:row.conflict||row.minutes!==duration}:
   {name:q.section,count:1,minutes:duration,conflict:false});
 }
 return [...rows.values()];
}
export function setAuthoringSectionMinutes<T extends AuthoringDraft>(draft:T,section:string,minutes:number):T{
 if(!Number.isSafeInteger(minutes)||minutes<0||minutes>600)
  throw Error("Section timer must be a whole number of minutes from 0 to 600");
 if(!draft.questions.some(q=>q.section===section))throw Error("Unknown exam section");
 return {...draft,questions:draft.questions.map(q=>
  q.section===section?{...q,sectionMinutes:minutes}:q)};
}
export function assignAuthoringQuestionSection<T extends AuthoringDraft>(
 draft:T,questionId:string,newSection:string
):T{
 const title=newSection.trim();
 if(!title||title.length>100||/[\u0000-\u001f\u007f]/u.test(title))
  throw Error("Invalid actual exam section name");
 const source=draft.questions.find(q=>q.id===questionId);
 if(!source)throw Error("Unknown authoring question");
 const existing=draft.questions.find(q=>q.section===title&&q.id!==questionId);
 return {...draft,questions:draft.questions.map(q=>q.id===questionId?
  {...q,section:title,sectionMinutes:existing?.sectionMinutes??q.sectionMinutes??15}:q)};
}
