import type {ExamPackage,GenericAttempt} from "./exam-package.ts";

/** The archive query is VIEW-ONLY. Filters never alter saved attempts or
 * all-time mock/learning statistics. All identities come from frozen attempts,
 * not current installed-paper catalogues.
 */
export type HistoryStatus="all"|"complete"|"progress";
export type HistorySort="newest"|"oldest";
export interface HistoryQuery{
 readonly status:HistoryStatus;
 readonly sort:HistorySort;
 readonly search:string;
 readonly paperRevisionId?:string;
 /** Frozen exam ID; do not infer a family from a currently installed paper. */
 readonly examId?:string;
 /** Exact frozen attempt practice-mode identity, not an editable display label. */
 readonly mode?:string;
 /** Inclusive LOCAL calendar dates of attempt START (YYYY-MM-DD). */
 readonly startedFrom?:string;
 readonly startedTo?:string;
}
export const DEFAULT_HISTORY_QUERY:HistoryQuery=Object.freeze({
 status:"all",sort:"newest",search:"",paperRevisionId:"all",
 examId:"all",mode:"all",startedFrom:"",startedTo:""
});
/** Never treat UTC date truncation as local attempt date (including across DST). */
export function localAttemptDate(timestamp:number):string{
 const d=new Date(timestamp);
 return String(d.getFullYear()).padStart(4,"0")+"-"+
   String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
}
const validDate=(value:string):boolean=>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [year,month,day]=value.split("-").map(Number);
 if(!year||!month||!day||month>12||day>31)return false;
 const d=new Date(0);d.setUTCFullYear(year,month-1,day);
 return d.getUTCFullYear()===year&&d.getUTCMonth()===month-1&&d.getUTCDate()===day;
};
/** Invalid filters yield zero results AND a visible explanation, never a
 * silently weakened filter or a mismatched count.
 */
export function historyQueryError(query:HistoryQuery):string|null{
 if(query.startedFrom&&!validDate(query.startedFrom))return "Invalid From date. Use a valid calendar date.";
 if(query.startedTo&&!validDate(query.startedTo))return "Invalid To date. Use a valid calendar date.";
 if(query.startedFrom&&query.startedTo&&query.startedFrom>query.startedTo)
   return "From date must not be later than To date.";
 return null;
}
export function activeHistoryFilterCount(query:HistoryQuery):number{
 return Number(query.status!=="all")+
  Number(Boolean(query.search.trim()))+
  Number(Boolean(query.paperRevisionId&&query.paperRevisionId!=="all"))+
  Number(Boolean(query.examId&&query.examId!=="all"))+
  Number(Boolean(query.mode&&query.mode!=="all"))+
  Number(Boolean(query.startedFrom))+Number(Boolean(query.startedTo));
}
export function historyAttemptLabel(a:GenericAttempt,packages:ReadonlyMap<string,ExamPackage>):string{
 return packages.get(a.packageId)?.title??
  a.frozen.paper.paperId+(a.frozen.paper.edition==="custom"?" · Practice":" · "+a.frozen.paper.edition);
}
export function filteredHistory(attempts:readonly GenericAttempt[],packages:ReadonlyMap<string,ExamPackage>,
 query:HistoryQuery):GenericAttempt[]{
 if(historyQueryError(query))return [];
 const search=query.search.trim().toLocaleLowerCase();
 const paper=query.paperRevisionId??"all",exam=query.examId??"all",mode=query.mode??"all";
 return attempts.filter(a=>
   (paper==="all"||a.frozen.paper.id===paper)&&
   (exam==="all"||a.frozen.snapshot.examId===exam)&&
   (mode==="all"||a.frozen.snapshot.mode===mode)&&
   (query.status==="all"||query.status==="complete"&&a.finishedAt!==null||
     query.status==="progress"&&a.finishedAt===null)&&
   (!query.startedFrom||localAttemptDate(a.startedAt)>=query.startedFrom)&&
   (!query.startedTo||localAttemptDate(a.startedAt)<=query.startedTo)&&
   (!search||[historyAttemptLabel(a,packages),a.frozen.paper.paperId,
     a.frozen.snapshot.mode,a.frozen.paper.edition]
    .some(t=>t.toLocaleLowerCase().includes(search))))
  .sort((a,b)=>(query.sort==="oldest"?a.startedAt-b.startedAt:b.startedAt-a.startedAt)||
    a.id.localeCompare(b.id));
}
/** Session-only UI state, never included in a record or backup. Restore only
 * a small well-formed query; hostile/stale sessionStorage is ignored.
 */
export function restoreHistoryQuery(value:unknown):HistoryQuery{
 if(!value||typeof value!=="object"||Array.isArray(value))return DEFAULT_HISTORY_QUERY;
 const raw=value as Record<string,unknown>;
 if(!["all","complete","progress"].includes(raw.status as string)||
   !["newest","oldest"].includes(raw.sort as string)||
   typeof raw.search!=="string"||raw.search.length>200||
   ["paperRevisionId","examId","mode","startedFrom","startedTo"].some(key=>
     raw[key]!==undefined&&(typeof raw[key]!=="string"||(raw[key] as string).length>256)))
   return DEFAULT_HISTORY_QUERY;
 const q:HistoryQuery={status:raw.status as HistoryStatus,sort:raw.sort as HistorySort,
  search:raw.search,
  paperRevisionId:typeof raw.paperRevisionId==="string"?raw.paperRevisionId:"all",
  examId:typeof raw.examId==="string"?raw.examId:"all",
  mode:typeof raw.mode==="string"?raw.mode:"all",
  startedFrom:typeof raw.startedFrom==="string"?raw.startedFrom:"",
  startedTo:typeof raw.startedTo==="string"?raw.startedTo:""};
 return historyQueryError(q)?DEFAULT_HISTORY_QUERY:q;
}
