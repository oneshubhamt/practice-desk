import type { GenericAttempt } from "./exam-package.ts";
import { attemptEvidence } from "../learning/attempt-evidence.ts";
import { questionSpeed,isAuditQuestion,longestQuestionExposure,studySuggestions } from "../learning/question-analytics.ts";
import type { ItemScore } from "../engine/scoring.ts";

export type ResultTab="overview"|"review"|"timing";
export type ReviewFilter="all"|"incorrect"|"unanswered"|"correct"|"excluded"|"pending"|"flagged"|"audit"|"fastwrong"|"typicalwrong"|"slowwrong";
const esc=(x:unknown)=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
const duration=(ms:number)=>{const t=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");};
export function reviewMatch(a:GenericAttempt,item:ItemScore,filter:ReviewFilter):boolean {
 if(filter==="all")return true;
 if(["correct","incorrect","unanswered","excluded","pending"].includes(filter))return item.verdict===filter;
 const answer=a.state.responses.find(x=>x.questionRevisionId===item.questionRevisionId);
 if(filter==="flagged")return Boolean(answer?.flagged);
 if(filter==="audit")return isAuditQuestion(a,item.questionRevisionId);
 if(item.verdict!=="incorrect")return false;
 const speed=questionSpeed(a,item.questionRevisionId);
 return filter==="fastwrong"?speed==="Fast":filter==="slowwrong"?speed==="Slow":
   filter==="typicalwrong"&&speed==="Typical";
}
export function resultTabsHTML(active:ResultTab):string{
 return '<nav class="result-tabs" role="tablist" aria-label="Result views">'+
  (["overview","review","timing"] as const).map((id,i)=>
   '<button id="result-tab-'+id+'" type="button" role="tab" tabindex="'+(id===active?"0":"-1")+'" class="result-tab '+(id===active?"active":"")+
   '" aria-controls="result-'+id+'" aria-selected="'+(id===active)+'" data-result-tab="'+id+'">'+
   ["Insights","Question review","Time ledger"][i]+'</button>').join("")+'</nav>';
}
export function reviewFiltersHTML(active:ReviewFilter):string{
 return '<label class="filter-label" for="g-review-filter">Show questions<select id="g-review-filter">'+
  ([["all","All questions"],["incorrect","Incorrect"],["unanswered","Unanswered"],["correct","Correct"],
    ["excluded","Excluded"],["pending","Awaiting assessment"],["flagged","Flagged"],
    ["audit","Key-audit notes"],["fastwrong","Fast incorrect"],
    ["typicalwrong","Typical-speed incorrect"],["slowwrong","Slow incorrect"]] as const)
   .map(([id,label])=>'<option value="'+id+'"'+(id===active?" selected":"")+'>'+label+'</option>').join("")+'</select></label>';
}
export function timingLedgerHTML(a:GenericAttempt,active:boolean):string{
 if(!a.result)return "";
 return '<section class="panel pad result-pane" id="result-timing" role="tabpanel" aria-labelledby="result-tab-timing"'+(!active?' hidden':'')+'>'+
  '<h2>Question timing ledger</h2><p class="fine">Time is cumulative foreground question exposure, not thinking time or an uninterrupted visit. Speed is relative to each section’s median only when at least five answered, scored items have measurable time. Older attempts may not have recorded visits.</p>'+
  '<div class="scroll-table"><table><thead><tr><th>Question</th><th>Section</th><th>Verdict</th><th>Time</th><th>Speed</th><th>Visits</th><th>Changes</th><th>Review</th></tr></thead><tbody>'+
  a.result.items.map((x,i)=>{
    const response=a.state.responses.find(r=>r.questionRevisionId===x.questionRevisionId);
    const section=a.frozen.paper.sections.find(s=>s.questionRevisionIds.includes(x.questionRevisionId));
    const visit=a.state.questionVisits?.find(v=>v.questionRevisionId===x.questionRevisionId)?.count;
    const speed=questionSpeed(a,x.questionRevisionId);
    return '<tr><td>'+(i+1)+'</td><td>'+esc(section?.title??"—")+'</td>'+
    '<td><span class="verdict '+esc(x.verdict)+'">'+esc(x.verdict)+'</span></td>'+
    '<td>'+duration(response?.timeSpentMs??0)+'</td>'+
    '<td><span class="tag speed-'+speed.toLowerCase().replace(/[^a-z]+/g,"-")+'">'+esc(speed)+'</span></td>'+
    '<td>'+(a.state.questionVisits===undefined?"Not recorded":visit??0)+'</td>'+
    '<td>'+(response?.answerChangeCount??0)+'</td>'+
    '<td><button class="textlink" data-ledger-q="'+esc(x.questionRevisionId)+'" aria-label="Review question '+(i+1)+'">Review →</button></td></tr>';
  }).join("")+'</tbody></table></div></section>';
}
export function sectionPaceHTML(a:GenericAttempt):string{
 const evidence=attemptEvidence(a);
 if(!evidence)return "";
 return '<section class="panel pad section-bars"><h2>Section pacing & coverage</h2>'+
  '<p class="fine">Section progress is based on scoreable questions. Time is recorded foreground exposure.</p>'+
  evidence.sections.map(e=>'<div class="pace-row"><div class="row between"><b>'+esc(e.title)+
   '</b><span class="fine">'+e.answered+' answered · '+(e.accuracy===null?"—":Math.round(e.accuracy*100)+"% accuracy")+
   ' · '+duration(e.foregroundMs)+'</span></div><div class="progress-track"><span style="width:'+Math.round(100*e.coverage)+'%"></span></div></div>').join("")+'</section>';
}

/** Source-backed question exposure rankings and conditional coaching. */
export function questionCoachingHTML(a:GenericAttempt):string{
 const longest=longestQuestionExposure(a);
 const suggestions=studySuggestions(a);
 return '<div class="result-coaching">'+
  '<section class="panel pad" id="g-longest-questions"><h2>Longest recorded question exposure</h2>'+
  '<p class="fine">Five highest cumulative foreground viewing times, including any measured unanswered items. These are not uninterrupted visit durations or evidence of difficulty.</p>'+
  (longest.length?'<div class="slow-list">'+longest.map(row=>
   '<button type="button" class="slow-link" data-ledger-q="'+esc(row.id)+
   '" aria-label="Review question '+row.paperNumber+'"><span><b>Q'+row.paperNumber+
   '</b> · '+esc(row.section)+' · '+esc(row.verdict)+'</span><span>'+
   duration(row.milliseconds)+' · Review →</span></button>').join("")+'</div>':
   '<p class="fine">No positive foreground question time was recorded.</p>')+
  '</section><section class="panel pad" id="g-next-work"><h2>What to work on next</h2>'+
  '<p class="fine">Suggestions are based on answers and measured timing in this attempt, not predictions or diagnoses of why mistakes occurred.</p>'+
  '<ul class="plainlist">'+suggestions.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul>'+
  '</section></div>';
}
