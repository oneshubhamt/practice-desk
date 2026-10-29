import type { GenericAttempt, ExamPackage } from "./exam-package.ts";
import { attemptEvidence } from "../learning/attempt-evidence.ts";
import { comparableTrends } from "../learning/learning.ts";

export type HistoryStatus="all"|"complete"|"progress";
export type HistorySort="newest"|"oldest";
export interface HistoryQuery { readonly status:HistoryStatus;readonly sort:HistorySort;readonly search:string; }
const esc=(x:unknown):string=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
const percent=(n:number)=>Math.max(0,Math.min(100,n));
const stamp=(ms:number)=>new Date(ms).toLocaleString();
const label=(a:GenericAttempt,packages:ReadonlyMap<string,ExamPackage>)=>packages.get(a.packageId)?.title??
 a.frozen.paper.paperId+(a.frozen.paper.edition==="custom"?" · Practice":" · "+a.frozen.paper.edition);
export function filteredHistory(attempts:readonly GenericAttempt[],packages:ReadonlyMap<string,ExamPackage>,query:HistoryQuery):GenericAttempt[]{
 const search=query.search.trim().toLocaleLowerCase();
 return attempts.filter(a=>(query.status==="all"||query.status==="complete"&&a.finishedAt!==null||
  query.status==="progress"&&a.finishedAt===null)&&
  (!search||[label(a,packages),a.frozen.paper.paperId,a.frozen.snapshot.mode,a.frozen.paper.edition]
   .some(s=>s.toLocaleLowerCase().includes(search))))
 .sort((a,b)=>query.sort==="oldest"?a.startedAt-b.startedAt:b.startedAt-a.startedAt);
}
interface Priority { readonly examId:string; readonly title:string; readonly answered:number;readonly correct:number;readonly attempts:number }
export function sectionPriorities(attempts:readonly GenericAttempt[]):Priority[]{
 const map=new Map<string,Priority>();
 for(const a of attempts){
  if(a.finishedAt===null||!a.result)continue;
  const p=a.frozen.paper;
  // Independently preserve exam identity. Repeated question observations are disclosed.
  for(const s of attemptEvidence(a)?.sections??[]){
   const id=a.frozen.snapshot.examId+"|"+s.title;
   const prior=map.get(id)??{examId:a.frozen.snapshot.examId,title:s.title,answered:0,correct:0,attempts:0};
   map.set(id,{...prior,answered:prior.answered+s.answered,correct:prior.correct+s.correct,attempts:prior.attempts+1});
  }
 }
 return [...map.values()].filter(x=>x.answered>=5).sort((a,b)=>
  a.correct/a.answered-b.correct/b.answered||a.examId.localeCompare(b.examId));
}
function trendSVG(values:readonly number[]):string{
 if(values.length<2)return "";
 const width=600,height=105,left=20,top=10;
 const min=Math.min(0,...values),max=Math.max(100,...values),span=max-min||1;
 const points=values.map((v,i)=>[left+i*(width-left*2)/(values.length-1),height-top-(v-min)*(height-top*2)/span]);
 const path=points.map(([x,y],i)=>(i?"L ":"M ")+x!.toFixed(1)+" "+y!.toFixed(1)).join(" ");
 return '<svg class="history-sparkline" viewBox="0 0 600 105" role="img" aria-label="Comparable attempt accuracy sequence">'+
  '<path d="'+path+'" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>'+
  points.map(([x,y])=>'<circle cx="'+x!.toFixed(1)+'" cy="'+y!.toFixed(1)+'" r="4" fill="currentColor"/>').join("")+'</svg>';
}
/** A dedicated history route, not a second exam store or a v11 runtime. */
export function historyHTML(attempts:readonly GenericAttempt[],packages:ReadonlyMap<string,ExamPackage>,
 query:HistoryQuery,loading:boolean,storageLocked:boolean,warning:string):string{
 const visible=filteredHistory(attempts,packages,query);
 const done=attempts.filter(a=>a.finishedAt!==null&&a.result);
 const progressing=attempts.filter(a=>a.finishedAt===null);
 const accurate=done.reduce((n,a)=>n+a.result!.snapshot.correctCount,0);
 const answered=done.reduce((n,a)=>n+a.result!.snapshot.correctCount+a.result!.snapshot.incorrectCount,0);
 const mostRecent=[...done].sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0))[0];
 const matching=mostRecent?comparableTrends(done).find(t=>t.paperRevisionId===mostRecent.frozen.paper.id):undefined;
 const trendPoints=matching?.points.filter(p=>p.accuracy!==null)??[];
 const priorities=sectionPriorities(done).slice(0,5);
 const pCount=attempts.length;
 return '<div class="generic-heading page-heading"><div><span class="eyebrow">ATTEMPT ARCHIVE</span>'+
  '<h1>History & insights</h1><p class="muted">Review your work, compare like-for-like papers and safeguard offline records.</p></div>'+
  '<button class="btn quiet" id="g-library">← Test library</button></div>'+
  (warning?'<p role="status" class="generic-warning">'+esc(warning)+'</p>':"")+
  '<div class="history-summary">'+
  [['Total attempts',pCount],['Completed',done.length],['In progress',progressing.length],
   ['Observed accuracy',answered?Math.round(100*accurate/answered)+"%":"—"]]
   .map(([t,v])=>'<div class="summary-stat"><small>'+esc(t)+'</small><b>'+esc(v)+'</b></div>').join("")+
  '</div>'+
  '<div class="history-panels">'+
  '<section class="panel pad history-trend"><div class="row between"><div><h2>Comparable progression</h2>'+
  '<p class="fine">Latest completed exact paper revision — identical questions, key and policy only.</p></div></div>'+
  (matching&&trendPoints.length>=2?'<div class="history-trend-chart">'+trendSVG(trendPoints.map(p=>100*p.accuracy!))+'</div>'+
   '<p class="fine">'+esc(matching.label)+' · '+matching.count+' attempts · '+
   trendPoints.map(x=>Math.round(x.accuracy!*100)+"%").join(" → ")+
   ' observed accuracy</p>':'<p class="empty-state">Complete the same frozen paper twice to unlock a defensible trend. Different papers are not assumed equally difficult.</p>')+
  '</section>'+
  '<section class="panel pad history-priorities"><h2>Section priorities</h2><p class="fine">Observed accuracy across completed attempts; repeated questions count as repeated observations, not mastery.</p>'+
  (priorities.length?priorities.map(p=>{
   const n=Math.round(100*p.correct/p.answered);
   return '<div class="priority-line"><div class="row between"><b>'+esc(p.title)+'</b><span class="fine">'+n+'% · '+p.answered+' answers</span></div>'+
    '<div class="progress-track"><span style="width:'+percent(n)+'%"></span></div></div>';
  }).join(""):'<p class="empty-state">More scored section answers are needed.</p>')+'</section></div>'+
  '<section class="panel pad history-archive"><div class="row between"><div><h2>Saved attempts</h2><p class="fine">'+visible.length+' of '+pCount+' records shown</p></div>'+
  '<div class="row generic-actions"><button class="btn" id="g-export-history"'+(loading?" disabled":"")+'>Export backup</button>'+
  '<button class="btn" id="g-import-history"'+(loading||storageLocked?" disabled":"")+'>Import backup</button></div></div>'+
  '<input type="file" id="g-history-file" accept=".json,application/json" hidden>'+
  '<div class="history-filters"><label class="filter-label" for="g-history-search">Find a paper'+
    '<input type="search" id="g-history-search" placeholder="Search paper, mode or edition" value="'+esc(query.search)+'"></label>'+
  '<label class="filter-label" for="g-filter">Status<select id="g-filter">'+
  ([["all","All attempts"],["progress","In progress"],["complete","Completed"]] as const)
   .map(([id,t])=>'<option value="'+id+'"'+(query.status===id?" selected":"")+'>'+t+'</option>').join("")+
  '</select></label><label class="filter-label" for="g-history-sort">Order<select id="g-history-sort">'+
  ([["newest","Newest first"],["oldest","Oldest first"]] as const)
   .map(([id,t])=>'<option value="'+id+'"'+(query.sort===id?" selected":"")+'>'+t+'</option>').join("")+
  '</select></label></div>'+
  (visible.length?'<div class="history-entries">'+visible.map(a=>{
   const s=a.result?.snapshot;
   const count=a.frozen.paper.sections.reduce((n,z)=>n+z.questionRevisionIds.length,0);
   const answered=a.state.responses.filter(z=>z.response).length;
   const status=a.finishedAt?"Completed":"Resume";
   return '<div class="archive-entry"><button class="history-open" data-attempt="'+esc(a.id)+'">'+
    '<span class="archive-title">'+esc(label(a,packages))+'</span><span class="archive-meta">'+
    esc(stamp(a.startedAt))+' · '+esc(a.frozen.snapshot.mode)+' · '+count+' questions</span>'+
    '<span class="archive-numbers">'+(a.finishedAt?(s?esc(s.earnedMarks.toFixed(1))+' marks · '+s.correctCount+' correct':'Completed'):
     answered+'/'+count+' answered · In progress')+'</span></button>'+
    '<span class="history-status '+(a.finishedAt?"complete":"active")+'">'+status+'</span>'+
    '<button class="btn danger generic-delete" data-delete="'+esc(a.id)+'" aria-label="Delete saved attempt">Delete</button></div>';
  }).join("")+'</div>':'<p class="empty-state">No attempts match these filters. Your saved records have not been deleted.</p>')+
  '</section>';
}
