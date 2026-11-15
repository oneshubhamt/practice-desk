import type { GenericAttempt } from "../engine/generic-attempt.ts";
import { attemptEvidence,type AttemptEvidence } from "../learning/attempt-evidence.ts";
import { answerRevisionEvidence } from "../learning/answer-revisions.ts";
import {attemptQuestionLookup,questionSpeed,isAuditQuestion,longestQuestionExposure,
 studySuggestions,questionTimingPhases,type AttemptQuestionLookup} from "../learning/question-analytics.ts";
import { sectionTimerDuration } from "../engine/session.ts";
import type { ItemScore } from "../engine/scoring.ts";
import {escapeText as esc} from "./html-escape.ts";
import {paperTimeBudgetMs,overtimeMs,sectionTimeBudgetMs,timeEnforcementForMode} from "../domain/timing.ts";
import {writtenAnswerEvidence,type WrittenAnswerEvidence} from "../learning/written-answer-analytics.ts";

export type ResultTab="overview"|"review"|"timing";
export type ReviewFilter="all"|"incorrect"|"unanswered"|"correct"|"excluded"|"pending"|"flagged"|"audit"|"fastwrong"|"typicalwrong"|"slowwrong";
const duration=(ms:number)=>{const t=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0");};
const mark=(a:GenericAttempt,value:number)=>value.toFixed(a.frozen.paper.scoring.decimalPlaces??2);
export function resultCompletionLabel(a:GenericAttempt):string{
 return a.completionReason==="time-expired"?"Time expired":
   a.completionReason==="section-submitted"?"Section submitted by user":
   a.completionReason==="submitted"?"Submitted by user":"Not recorded";
}
export function writtenWordSummary(row:WrittenAnswerEvidence):string{
 if(!row.answered)return row.wordLimit===null?"Unanswered":"0 / "+row.wordLimit+" words · unanswered";
 if(row.wordLimit===null)return row.wordCount+" words · no advisory limit";
 const delta=row.wordCount-row.wordLimit;
 if(delta===0)return row.wordCount+" / "+row.wordLimit+" words · at limit";
 const percent=(Math.abs(delta)/row.wordLimit*100).toFixed(1);
 return row.wordCount+" / "+row.wordLimit+" words · "+
   (delta>0?"+"+delta+" ("+percent+"% over)":Math.abs(delta)+" below ("+percent+"% below)");
}

export function reviewMatch(
 a:GenericAttempt,item:ItemScore,filter:ReviewFilter,
 lookup:AttemptQuestionLookup=attemptQuestionLookup(a)
):boolean{
 if(filter==="all")return true;
 if(["correct","incorrect","unanswered","excluded","pending"].includes(filter))return item.verdict===filter;
 const answer=lookup.responses.get(item.questionRevisionId);
 if(filter==="flagged")return Boolean(answer?.flagged);
 if(filter==="audit")return isAuditQuestion(a,item.questionRevisionId,lookup);
 if(item.verdict!=="incorrect")return false;
 const speed=questionSpeed(a,item.questionRevisionId,lookup);
 return filter==="fastwrong"?speed==="Fast":filter==="slowwrong"?speed==="Slow":
   filter==="typicalwrong"&&speed==="Typical";
}
export function resultTabsHTML(active:ResultTab,allowReview=true):string{
 return '<nav class="result-tabs" role="tablist" aria-label="Result views">'+
  (["overview","review","timing"] as const).filter(id=>id!=="review"||allowReview).map(id=>
   '<button id="result-tab-'+id+'" type="button" role="tab" tabindex="'+(id===active?"0":"-1")+'" class="result-tab '+(id===active?"active":"")+
   '" aria-controls="result-'+id+'" aria-selected="'+(id===active)+'" data-result-tab="'+id+'">'+
   ({overview:"Insights",review:"Answer review",timing:"Question times"} as const)[id]+'</button>').join("")+'</nav>';
}
export function reviewFiltersHTML(active:ReviewFilter):string{
 return '<label class="filter-label" for="g-review-filter">Show questions<select id="g-review-filter">'+
  ([["all","All questions"],["incorrect","Incorrect"],["unanswered","Unanswered"],["correct","Correct"],
    ["excluded","Excluded"],["pending","Awaiting assessment"],["flagged","Flagged"],
    ["audit","Key-audit notes"],["fastwrong","Fast incorrect"],
    ["typicalwrong","Typical-speed incorrect"],["slowwrong","Slow incorrect"]] as const)
   .map(([id,label])=>'<option value="'+id+'"'+(id===active?" selected":"")+'>'+label+'</option>').join("")+'</select></label>';
}
export function timingLedgerHTML(a:GenericAttempt,active:boolean,allowReview=true):string{
 if(!a.result)return "";
 const lookup=attemptQuestionLookup(a);
 return '<section class="panel pad result-pane" id="result-timing" role="tabpanel" aria-labelledby="result-tab-timing"'+(!active?' hidden':'')+'>'+
  '<h2>Question timing ledger</h2><p class="fine">Time is cumulative foreground question exposure, not thinking time or an uninterrupted visit. After deadline is foreground exposure recorded beyond an advisory practice budget; hard exam simulations cannot accrue it. Missing phase evidence is shown as unavailable. First visit ends on the first departure, revisits measure exposure after returning, and before first answer accumulates across visits until the first committed response. Displayed seconds are rounded up while source milliseconds remain exact.</p>'+
  '<div class="scroll-table"><table><thead><tr><th>Question</th><th>Section</th><th>Verdict</th><th>Time</th><th>After deadline</th><th>Speed</th><th>Visits</th><th>Changes</th><th>First visit</th><th>Revisits</th><th>Before first answer</th><th>Review</th></tr></thead><tbody>'+
  a.result.items.map((x,i)=>{
    const response=lookup.responses.get(x.questionRevisionId);
    const section=lookup.sections.get(x.questionRevisionId);
    const visit=lookup.visits.get(x.questionRevisionId)?.count;
    const speed=questionSpeed(a,x.questionRevisionId,lookup);
    const phases=questionTimingPhases(a,x.questionRevisionId,lookup);
    return '<tr><td>'+(i+1)+'</td><td>'+esc(section?.title??"—")+'</td>'+
    '<td><span class="verdict '+esc(x.verdict)+'">'+esc(x.verdict)+'</span></td>'+
    '<td>'+duration(response?.timeSpentMs??0)+'</td>'+
    '<td>'+((response?.postDeadlineMs??0)>0?"+": "")+((response?.postDeadlineMs??0)>0?duration(response!.postDeadlineMs):"—")+'</td>'+
    '<td><span class="tag speed-'+speed.toLowerCase().replace(/[^a-z]+/g,"-")+'">'+esc(speed)+'</span></td>'+
    '<td>'+(visit??0)+'</td>'+
    '<td>'+(response?.answerChangeCount??0)+'</td>'+
    '<td>'+(phases?duration(phases.firstVisitMs):"Not measured")+'</td>'+
    '<td>'+(phases?duration(phases.revisitMs):"Not measured")+'</td>'+
    '<td>'+(phases?(phases.beforeFirstAnswerMs===null?"No first answer":duration(phases.beforeFirstAnswerMs)):"Not measured")+'</td>'+
    '<td>'+(allowReview?'<button class="textlink" data-ledger-q="'+esc(x.questionRevisionId)+'" aria-label="Review question '+(i+1)+'">Review →</button>':"Not released")+'</td></tr>';
  }).join("")+'</tbody></table></div></section>';
}

/** Pacing composition backed by the canonical frozen evidence model. */
export function resultPacingHTML(
 a:GenericAttempt,evidence:AttemptEvidence|null=attemptEvidence(a),lookup?:AttemptQuestionLookup
):string{
 if(!evidence||!a.result)return "";
 const index=lookup??attemptQuestionLookup(a,evidence);
 const scored=a.result.snapshot.correctCount+a.result.snapshot.incorrectCount;
 const accuracy=scored?a.result.snapshot.correctCount/scored:null;
 const phases=a.frozen.questions.map(q=>questionTimingPhases(a,q.id,index))
   .filter((x):x is NonNullable<typeof x>=>x!==null&&x.totalMs>0);
 const revisits=phases.reduce((total,row)=>total+row.revisitMs,0);
 const budget=paperTimeBudgetMs(a.frozen.paper),over=overtimeMs(evidence.timing.elapsedMs,budget);
 const hard=timeEnforcementForMode(a.frozen.snapshot.mode)==="hard";
 return '<div class="insight-grid result-insight-grid">'+
  '<section class="panel pad result-time-pacing"><h2>Time &amp; pacing</h2>'+
  '<div class="metriclist">'+
   '<div><span>'+(hard?"Time limit":"Time budget")+'</span><b>'+(budget===null?"Untimed":duration(budget))+'</b></div>'+
   '<div><span>Actual timer used</span><b>'+duration(evidence.timing.elapsedMs)+'</b></div>'+
   '<div><span>Overtime</span><b>'+(budget===null?"—":over>0?"+"+duration(over):"None")+'</b></div>'+
   '<div><span>Completion</span><b>'+esc(resultCompletionLabel(a))+'</b></div>'+
   '<div><span>Median per scored answer</span><b>'+
     (evidence.timing.overallMedianAnsweredMs===null?"Not recorded":duration(evidence.timing.overallMedianAnsweredMs))+'</b></div>'+
   '<div><span>Question time captured</span><b>'+duration(evidence.timing.questionMeasuredMs)+'</b></div>'+
   '<div><span>Attempt rate</span><b>'+
     (evidence.timing.attemptRate===null?"—":Math.round(evidence.timing.attemptRate*100)+"%")+'</b></div>'+
   '<div><span>Accuracy (valid scored attempts)</span><b>'+(accuracy===null?"—":Math.round(accuracy*100)+"%")+'</b></div>'+
  '</div><p class="fine result-method-note">Timer time follows the frozen paper budget. Practice modes may continue into advisory overtime; exam simulation stops at its hard deadline. Per-question time and after-deadline attribution are foreground exposure, so hidden-page time can make paper overtime larger than recorded question overtime. Revisit exposure: '+
    (phases.length?duration(revisits):"not measured")+'.</p></section>'+
  '<section class="panel pad result-section-diagnostics"><h2>Section diagnostics</h2>'+
   evidence.sections.map(e=>{
     const eligible=Math.max(0,e.total-e.excluded);
     const attempted=e.answered+e.pending;
     const coverage=eligible?attempted/eligible:0;
     const sectionIndex=a.frozen.paper.sections.findIndex(s=>s.id===e.sectionId);
     const timer=sectionTimerDuration(a.state,sectionIndex);
     const sectionBudget=sectionTimeBudgetMs(a.frozen.paper,sectionIndex);
     const sectionOver=timer===null?0:overtimeMs(timer,sectionBudget);
     const timerText=timer===null?"Not recorded":duration(timer)+
       (sectionBudget===null?"":" / "+duration(sectionBudget)+(sectionOver>0?" · +"+duration(sectionOver)+" overtime":""));
     return '<div class="metric-bar"><div class="row between"><b>'+esc(e.title)+'</b><span>'+
       attempted+'/'+eligible+' attempted · '+(e.accuracy===null?"—":Math.round(e.accuracy*100)+"% accuracy")+
       '</span></div><div class="bartrack" role="progressbar" aria-label="'+esc(e.title)+' coverage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+
       Math.round(coverage*100)+'"><div style="width:'+Math.round(coverage*100)+'%"></div></div>'+
       '<p class="fine">Section time: '+timerText+' · Foreground: '+duration(e.foregroundMs)+'</p></div>';
   }).join("")+
  '</section></div>';
}

export function writtenAnswerAnalysisHTML(a:GenericAttempt):string{
 const evidence=writtenAnswerEvidence(a);
 if(!evidence.rows.length)return "";
 const paperOver=evidence.paperBudgetMs===null?"—":
   evidence.paperOvertimeMs>0?"+"+duration(evidence.paperOvertimeMs):"None";
 const attributed=evidence.attributedOvertimeMs>0?"+"+duration(evidence.attributedOvertimeMs):"None";
 return '<section class="panel pad result-written-answers"><h2>Written answers</h2>'+
  '<p class="fine">Objective measurements only. Word count and timing do not grade relevance, factual accuracy, structure or language; substantive quality remains a human/self assessment.</p>'+
  '<div class="written-answer-summary">'+
   '<div><b>'+evidence.answered+' / '+evidence.rows.length+'</b><span>Saved responses</span></div>'+
   '<div><b>'+(evidence.limited?evidence.withinLimit+' / '+evidence.limited:"—")+'</b><span>Within advisory word limit</span></div>'+
   '<div><b>'+paperOver+'</b><span>Paper overtime</span></div>'+
   '<div><b>'+attributed+'</b><span>Recorded question overtime</span></div>'+
  '</div><div class="scroll-table written-answer-table"><table><thead><tr><th>Question</th><th>Words</th><th>Foreground time</th><th>After deadline</th><th>Self-assessment</th></tr></thead><tbody>'+
  evidence.rows.map(row=>'<tr><td>Q'+row.paperNumber+' · '+esc(row.section)+'</td>'+
   '<td class="'+(row.wordLimit!==null&&row.wordCount>row.wordLimit?"written-over":"")+'">'+esc(writtenWordSummary(row))+'</td>'+
   '<td>'+duration(row.foregroundMs)+'</td>'+
   '<td>'+(row.postDeadlineMs>0?"+"+duration(row.postDeadlineMs):"—")+'</td>'+
   '<td>'+(row.selfAssessedMarks===null?"Not yet assessed":
      esc(String(row.selfAssessedMarks))+(row.selfAssessedMaximum===null?"":" / "+esc(String(row.selfAssessedMaximum)))+
      (row.assessmentNote?'<small>'+esc(row.assessmentNote)+'</small>':""))+'</td></tr>').join("")+
  '</tbody></table></div>'+
  '<p class="fine result-method-note">Paper overtime is timer time. Recorded question overtime is foreground exposure after the advisory budget and can therefore be smaller when the page was hidden.</p></section>';
}

/** Generic arithmetic presented as a compact opportunity summary. */
export function scoreOpportunityHTML(
 a:GenericAttempt,allowReview=true,evidence:AttemptEvidence|null=attemptEvidence(a)
):string{
 if(!evidence)return "";
 const penalty=evidence.opportunity.observedPenalty;
 const actions=[
   evidence.opportunity.countWrong&&allowReview?
    '<button class="btn" data-review-preset="incorrect">Review '+evidence.opportunity.countWrong+' incorrect →</button>':"",
   evidence.opportunity.countSkipped&&allowReview?
    '<button class="btn" data-review-preset="unanswered">Review '+evidence.opportunity.countSkipped+' skipped →</button>':""
 ].filter(Boolean).join("");
 return '<section class="panel pad result-opportunities"><h2>Score improvement opportunities</h2>'+
  '<p class="fine">Exact marking arithmetic from this frozen paper, not predictions of future performance. Excluded items are omitted.</p>'+
  '<div class="coach-cards">'+
   '<div class="coach-card"><b>'+(penalty>0?'−'+mark(a,penalty):mark(a,0))+'</b><span>Negative marks incurred</span><small>'+
     evidence.opportunity.countWrong+' incorrect scored item'+(evidence.opportunity.countWrong===1?"":"s")+'</small></div>'+
   '<div class="coach-card"><b>+'+mark(a,evidence.opportunity.wrongToCorrect)+'</b><span>If every wrong answer became correct</span><small>Hypothetical turnaround across '+
     evidence.opportunity.countWrong+' item'+(evidence.opportunity.countWrong===1?"":"s")+'</small></div>'+
   '<div class="coach-card"><b>+'+mark(a,evidence.opportunity.skippedToCorrect)+'</b><span>If every unanswered valid item were correct</span><small>Hypothetical opportunity across '+
     evidence.opportunity.countSkipped+' item'+(evidence.opportunity.countSkipped===1?"":"s")+'</small></div>'+
  '</div>'+(actions?'<div class="coach-actions">'+actions+'</div>':"")+'</section>';
}

/** Suppress analytical machinery until section-relative speed evidence exists. */
export function speedAccuracyHTML(
 a:GenericAttempt,allowReview=true,evidence:AttemptEvidence|null=attemptEvidence(a)
):string{
 if(!evidence)return "";
 if(evidence.speed.classified<5){
   return '<section class="panel pad result-speed-accuracy"><h2>Speed × accuracy</h2>'+
    '<p class="fine">Five or more measurable answered responses in a section are needed to classify relative speed. Continue practising to unlock reliable labels.</p></section>';
 }
 return '<section class="panel pad result-speed-accuracy"><h2>Speed × accuracy</h2>'+
  '<p class="fine">Speed is relative to each section’s own median, not a universal ideal. Use it to distinguish quick mistakes from time-consuming ones.</p>'+
  '<div class="result-speed-grid">'+evidence.speed.buckets.map(bucket=>{
    const accuracy=bucket.items?Math.round(100*bucket.correct/bucket.items):null;
    const preset=bucket.label==="Fast"?"fastwrong":bucket.label==="Slow"?"slowwrong":"typicalwrong";
    return '<div class="result-speed-cell"><b>'+esc(bucket.label)+'</b><div class="result-speed-count"><span>'+bucket.correct+' correct</span><span>'+
      bucket.incorrect+' wrong</span></div><small>'+(accuracy===null?"No classified answers":accuracy+"% accuracy")+'</small>'+
      (bucket.incorrect&&allowReview?'<button class="textlink" data-review-preset="'+preset+'">Review '+bucket.incorrect+' '+
       bucket.label.toLowerCase()+' miss'+(bucket.incorrect===1?"":"es")+' →</button>':"")+'</div>';
  }).join("")+'</div><p class="fine">'+(evidence.speed.measured-evidence.speed.classified)+
  ' measured answer'+(evidence.speed.measured-evidence.speed.classified===1?"":"s")+
  ' remain unclassified because their section did not meet the evidence threshold.</p></section>';
}

export function answerRevisionHTML(a:GenericAttempt):string{
 const revisions=answerRevisionEvidence(a);
 if(!revisions.recorded){
   return '<section class="panel pad answer-revision-panel"><h2>Answer revisions</h2>'+
    '<p class="fine">No saved answer-revision sequence is available for this attempt.</p></section>';
 }
 return '<section class="panel pad answer-revision-panel"><h2>Answer revisions</h2>'+
  '<div class="revision-chips"><span class="revision-chip">'+revisions.changed+' revised</span>'+
   '<span class="revision-chip revision-good">'+revisions.rescued+' ended correct after an initial wrong answer</span>'+
   '<span class="revision-chip revision-bad">'+revisions.lost+' ended wrong after an initial correct answer</span>'+
   (revisions.other?'<span class="revision-chip">'+revisions.other+' other change'+(revisions.other===1?"":"s")+'</span>':"")+
  '</div><p class="fine">Tracks recorded successive single-choice replacements. Clear-and-reselect and unverified items are not classified as rescued/lost; these are observed changes, not proof that revision caused improvement.</p></section>';
}

/** Compact question-speed and coaching presentation retaining direct review links. */
export function questionCoachingHTML(
 a:GenericAttempt,allowReview=true,evidence:AttemptEvidence|null=attemptEvidence(a),
 lookup?:AttemptQuestionLookup
):string{
 const index=lookup??attemptQuestionLookup(a,evidence);
 const longest=longestQuestionExposure(a,5,index);
 const suggestions=studySuggestions(a,evidence);
 const fast=evidence?.speed.buckets.find(x=>x.label==="Fast")?.items??0;
 const slow=evidence?.speed.buckets.find(x=>x.label==="Slow")?.items??0;
 const measured=evidence?.speed.measured??0;
 return '<section class="panel pad result-question-speed" id="g-longest-questions">'+
  '<div class="row between"><h2>Question-speed insights</h2><span class="fine">Relative to each section’s median</span></div>'+
  '<div class="insight-stats"><div><strong>'+slow+'</strong><span>Slow responses</span></div>'+
   '<div><strong>'+fast+'</strong><span>Fast responses</span></div><div><strong>'+measured+'</strong><span>Timed answers</span></div></div>'+
  '<p class="fine">Speed labels appear only when a section has enough measured, valid answers. These are relative signals, not fixed ideal times.</p>'+
  (longest.length?'<h3 class="subhead">Longest question visits</h3><div class="slow-list">'+longest.map(row=>
   (allowReview?'<button type="button" class="slow-link" data-ledger-q="'+esc(row.id)+
   '" aria-label="Review question '+row.paperNumber+'">':'<div class="slow-link">')+
   '<span><b>Q'+row.paperNumber+'</b> · '+esc(row.section)+' · '+esc(row.verdict)+'</span><span>'+
   duration(row.milliseconds)+(allowReview?' · Review →':'')+'</span>'+
   (allowReview?'</button>':'</div>')).join("")+'</div>':
   '<p class="fine">No positive foreground question time was recorded.</p>')+
  '</section><section class="panel pad" id="g-next-work"><h2>What to work on next</h2>'+
  '<p class="fine">Suggestions use answers and measured timing from this attempt; they are not predictions or diagnoses of why mistakes occurred.</p>'+
  '<ul class="plainlist">'+suggestions.map(t=>'<li>'+esc(t)+'</li>').join("")+'</ul></section>';
}

export function resultInsightsHTML(a:GenericAttempt,allowReview=true):string{
 const evidence=attemptEvidence(a),lookup=attemptQuestionLookup(a,evidence);
 return resultPacingHTML(a,evidence,lookup)+writtenAnswerAnalysisHTML(a)+
   scoreOpportunityHTML(a,allowReview,evidence)+speedAccuracyHTML(a,allowReview,evidence)+answerRevisionHTML(a)+
   questionCoachingHTML(a,allowReview,evidence,lookup);
}
