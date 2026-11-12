/** P47-6 module: result-controller.ts */
import {escapeText} from "./html-escape.ts";
import {minutes,readablePracticeMode} from "./exam-view.ts";

import {frozenReviewMedia,sourceReviewHTML} from "./review-media-view.ts";
import {renderAuthoredText} from "./question-content-view.ts";
import {readableAnswer} from "./exam-package.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {QuestionRevision} from "../domain/question.js";
import type {QuestionRevisionId} from "../domain/ids.js";

import {scoreAttempt} from "../engine/scoring.ts";
import {manualGradeLimit,manualGradeSummary,setManualGrade} from "../engine/manual-grading.ts";
import {sourceKeyScore} from "../engine/source-comparison.ts";

import {scoreableMaximum,scoreableLowerBound,sectionScoreSummaries} from "../engine/score-ceiling.ts";

import {questionSpeed} from "../learning/question-analytics.ts";

import {editorialStatusLabel} from "./editorial-labels.ts";


import {reviewMatch,reviewFiltersHTML,resultTabsHTML,timingLedgerHTML,resultInsightsHTML,type ResultTab,type ReviewFilter} from "./result-presentation.ts";

import type {ResultControllerContext} from "./coordinator-context.ts";

export function packageForResult(owner:ResultControllerContext,saved:GenericAttempt):ExamPackage|undefined{
   return owner.packages.get(saved.packageId)??[...owner.packages.values()].find(p=>
     p.paper.paperId===saved.frozen.paper.paperId&&p.paper.edition===saved.frozen.paper.edition);
 }

export function renderCurrentResultHTML(owner:ResultControllerContext):string {
   if(!owner.attempt)return "";
   const paper=owner.attempt.frozen.paper,s=owner.attempt.result??scoreAttempt(paper,owner.attempt.frozen.key,owner.attempt.frozen.questions,
      owner.attempt.state.responses,new Date().toISOString());
   const qs=owner.resultTab==="review"?new Map(owner.attempt.frozen.questions.map(q=>[q.id,q])):new Map<string,QuestionRevision>();
   // allowReview controls post-completion detailed question/solution disclosure,
   // not question navigation during the attempt or numerical score visibility.
   const revealReview=paper.navigation.allowReview!==false;
   if(!revealReview&&owner.resultTab==="review")owner.resultTab="overview";
   // Current attempts pin source review data at attempt creation. Never
   // reconstruct evidence from a mutable Library at result render time.
   const reviewSource=owner.resultTab==="review"?
     owner.attempt.sourceReviewReference??null:null;
   const frozenTarget:ExamPackage={format:"practice-desk-exam",version:1,
     examId:owner.attempt.frozen.snapshot.examId,title:"Frozen attempt",
     paper:owner.attempt.frozen.paper,answerKey:owner.attempt.frozen.key,
     questions:owner.attempt.frozen.questions,stimuli:owner.attempt.frozen.stimuli,
     assets:owner.attempt.frozen.assets};
   const grades=owner.resultTab==="overview"?manualGradeSummary(owner.attempt):{graded:0,pending:0,total:0};
   const selfAssessed=s.snapshot.earnedMarks+grades.total;
   const originalKey=owner.resultTab==="overview"?sourceKeyScore(owner.attempt):null;
   const sourceKeyText=paper.edition==="reviewed"&&!owner.attempt.sourceKeyReference?
     "Original-source comparison unavailable: no unambiguous original revision was frozen at attempt start":
     originalKey&&originalKey.comparable>0?
     (originalKey.unavailable>0?"Comparable original-source subset only":"Original-source key comparison")+
     ": "+originalKey.marks.toFixed(1)+" / "+originalKey.maxMarks.toFixed(1)+
     " marks ("+originalKey.comparable+" of "+originalKey.total+" comparable; "+
     originalKey.unavailable+" unavailable)":null;
   const scorePrecision=paper.scoring.decimalPlaces??2;
   const markLabel=(value:number)=>value.toFixed(scorePrecision);
   const eligibleMax=owner.resultTab==="overview"?scoreableMaximum(paper,owner.attempt.frozen.key,owner.attempt.frozen.questions):0;
   const conservativeFloor=owner.resultTab==="overview"?scoreableLowerBound(paper,owner.attempt.frozen.key,owner.attempt.frozen.questions):0;
   const resultPackage=owner.packageForAttempt(owner.attempt);
   const resultName=owner.attempt.practiceComposition?
     "Custom practice · "+owner.attempt.practiceComposition.sourcePaperRevisionId:
     resultPackage?.title??paper.paperId;
   const resultDate=owner.attempt.finishedAt?new Date(owner.attempt.finishedAt).toLocaleString():"";
   const resultMeta=escapeText(resultName)+' · '+escapeText(readablePracticeMode(owner.attempt.frozen.snapshot.mode))+
     (resultDate?' · '+escapeText(resultDate):"");
   const paperSectionRows=owner.resultTab==="overview"?sectionScoreSummaries(owner.attempt,s).map(row=>
     '<tr><td>'+escapeText(row.title)+'</td><td>'+row.attempted+'/'+
       (row.questions-row.excluded)+'</td><td>'+row.correct+'</td><td>'+row.incorrect+
       '</td><td>'+escapeText(markLabel(row.marks))+' / '+
       escapeText(markLabel(row.eligibleMax))+'</td><td>'+
       (row.timerMs===null?"Not recorded":minutes(row.timerMs)+
         (row.timerReason==="time-expired"?" · Expired":" · Submitted"))+'</td></tr>').join(""):"";
   const completionLabel=owner.attempt.completionReason?
     owner.attempt.completionReason==="time-expired"?"Time expired":
     owner.attempt.completionReason==="section-submitted"?"Submitted early":"Submitted by user":"";
   const scoreExplainer=owner.resultTab==="overview"?
     '<p class="fine score-explainer">+'+escapeText(markLabel(s.snapshot.positiveMarks))+
       ' positive marks · −'+escapeText(markLabel(s.snapshot.penaltyMarks))+
       ' penalties · adjusted score '+escapeText(markLabel(s.snapshot.earnedMarks))+
       ' / '+escapeText(markLabel(eligibleMax))+
       (sourceKeyText?' · '+escapeText(sourceKeyText):"")+'.</p>':"";
   const scoringDetails=owner.resultTab==="overview"?'<details class="result-scoring-details">'+
     '<summary>Scoring details</summary><div class="result-scoring-detail-body">'+
     (owner.attempt.practiceComposition?'<p class="fine"><b>Custom selection provenance:</b> source paper '+
       escapeText(owner.attempt.practiceComposition.sourcePaperRevisionId)+
       ' · source key '+escapeText(owner.attempt.practiceComposition.sourceAnswerKeyRevisionId)+
       ' · '+owner.attempt.practiceComposition.selectedQuestionRevisionIds.length+' of '+
       owner.attempt.practiceComposition.eligibleCount+' eligible · seed '+
       escapeText(owner.attempt.practiceComposition.seed)+
       ' · frozen selection '+escapeText(owner.attempt.practiceComposition.contentHash.slice(0,12))+
       '. Scores use the actual retained source rules; this is not an independent official exam score.</p>':"")+
     (originalKey&&originalKey.comparable>0?
       '<p class="fine"><b>'+escapeText(originalKey.unavailable?
         "Original-source key — comparable subset only":"Original-source key comparison")+
       ':</b> '+escapeText(originalKey.marks.toFixed(1))+' / '+
       escapeText(originalKey.maxMarks.toFixed(1))+' marks · '+
       originalKey.correct+' correct · '+originalKey.incorrect+' incorrect · '+
       originalKey.unanswered+' unanswered · '+originalKey.comparable+' of '+
       originalKey.total+' questions comparable; '+originalKey.unavailable+
       ' unavailable. Only source/reviewed questions with identical verified wording, option identities and media are included; this subset is not a full-paper or official score. The actual reviewed score above is unchanged.</p>':
       originalKey&&originalKey.total>0?
       '<p class="fine"><b>Original-source key comparison unavailable:</b> None of the '+
       originalKey.total+' source/reviewed questions had defensible comparable semantics. Original text and key remain as post-test provenance; your actual frozen score is unchanged.</p>':"")+
     '<p class="fine"><b>Scoring envelope:</b> nominal full-credit ceiling '+
       escapeText(markLabel(eligibleMax))+'; conservative lower bound '+
       escapeText(markLabel(conservativeFloor))+
       '. The lower bound need not be attainable; written responses are assessed separately.</p>'+
     (!revealReview?'<p class="fine"><b>Detailed answers withheld:</b> this exam releases numerical results and timing feedback but not its question-by-question answer key or worked solutions.</p>':"")+
     (grades.graded||grades.pending?'<p class="fine"><b>Separate self-assessment:</b> '+escapeText(grades.graded)+
       ' of '+escapeText(grades.graded+grades.pending)+' written responses marked; self-assessed total '+
       escapeText(selfAssessed.toFixed(2))+'. The automated score above remains unchanged.</p>':
       '<p class="fine">Automated marks reflect only scoreable questions.</p>')+
     '</div></details>':"";
   return '<div class="generic-heading results-heading"><div>'+
     '<h1>Attempt analysis</h1><p class="muted">'+resultMeta+'</p></div>'+
     '<div class="row"><button class="btn quiet" id="g-history-results">History</button>'+
     '<button class="btn" id="g-library">Library</button></div></div>'+
    (owner.warning?'<p class="generic-warning" role="status">'+escapeText(owner.warning)+'</p>':"")+
    resultTabsHTML(owner.resultTab,revealReview)+
    (owner.resultTab==="overview"?'<div class="result-pane" id="result-overview" role="tabpanel" aria-labelledby="result-tab-overview">'+
    '<section class="panel pad result-performance-overview"><div class="row between result-overview-heading"><div>'+
     '<h2>Performance overview</h2><p class="fine">'+resultMeta+'</p></div>'+
     (completionLabel?'<span class="tag">'+escapeText(completionLabel)+'</span>':"")+'</div>'+
    '<div class="scoregrid"><div class="score standout"><b>'+
     escapeText(markLabel(s.snapshot.earnedMarks))+
     ' <small>/ '+escapeText(markLabel(eligibleMax))+'</small></b>'+
     '<small>Audit-adjusted automated marks</small></div><div class="score"><b>'+s.snapshot.correctCount+
    '</b><small>Correct</small></div><div class="score"><b>'+s.snapshot.incorrectCount+
    '</b><small>Incorrect</small></div><div class="score"><b>'+s.snapshot.unansweredCount+
    '</b><small>Unanswered</small></div><div class="score"><b>'+s.snapshot.excludedCount+
    '</b><small>Excluded</small></div></div>'+
    scoreExplainer+
    '<div class="scroll-table result-section-table"><table><thead><tr><th>Section</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Marks</th><th>Time used</th></tr></thead><tbody>'+
     paperSectionRows+'</tbody></table></div>'+scoringDetails+'</section>'+
     resultInsightsHTML(owner.attempt,revealReview)+
    '<div class="row result-footer-actions">'+
      (revealReview?'<button class="btn" id="g-view-question-review">View question-by-question review →</button>':"")+
      '<button class="btn" id="g-result-library">Test library</button></div></div>':
    '<div class="result-pane" id="result-overview" role="tabpanel" aria-labelledby="result-tab-overview" hidden></div>')+
    (revealReview&&owner.resultTab==="review"?'<section class="panel pad result-pane" id="result-review" role="tabpanel" aria-labelledby="result-tab-review">'+
    '<div class="row between"><h2>Question review</h2>'+
      '<div class="row"><button class="btn" id="g-review-top">Top ↑</button>'+
      '<button class="btn primary" id="g-revision-set">Add mistakes &amp; skips to notebook</button></div></div>'+
      reviewFiltersHTML(owner.reviewFilter)+
      '<p class="fine">Review frozen questions, actual responses, solutions and foreground time. Mock scores never become FSRS ratings.</p>'+
      '<p class="fine">'+s.items.filter(it=>reviewMatch(owner.attempt!,it,owner.reviewFilter)).length+' of '+s.items.length+' items</p>'+
      s.items.filter(it=>reviewMatch(owner.attempt!,it,owner.reviewFilter)).map((it,i)=>{
      const q=qs.get(it.questionRevisionId);
      const response=owner.attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.response;
      const answer=owner.attempt!.frozen.key.entries.find(e=>e.questionRevisionId===it.questionRevisionId)?.answer;
      const explanation=owner.attempt!.explanations?.[it.questionRevisionId];
      const richExplanation=q?.content.richExplanation;
      const seconds=owner.attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.timeSpentMs??0;
      const visitCount=owner.attempt!.state.questionVisits.find(r=>r.questionRevisionId===it.questionRevisionId)?.count;
      const speed=questionSpeed(owner.attempt!,it.questionRevisionId);
      if(!q)return "";
      const prior=owner.attempt!.manualGrades?.find(g=>g.questionRevisionId===q.id);
      const draft=owner.manualGradeDrafts.get(owner.attempt!.id+"|"+q.id);
      const limit=manualGradeLimit(owner.attempt!,q.id);
      const provenance=q.editorial.sources??[];
      const origin=owner.attempt!.notebookLineage?.entries.find(x=>x.questionRevisionId===q.id);
      return '<article class="generic-review" data-review-id="'+escapeText(q.id)+'" data-verdict="'+escapeText(it.verdict)+'"><div class="pd-review-question"><strong>'+
       (paper.sections.flatMap(z=>z.questionRevisionIds).indexOf(q.id)+1)+'.</strong> '+
       renderAuthoredText(frozenTarget,q.content.prompt,q.content.richPrompt)+'</div>'+
       '<p class="fine editorial-meta"><span class="editorial-status editorial-status-'+escapeText(q.editorial.status)+'">'+
         escapeText(editorialStatusLabel(q.editorial))+'</span>'+
         (q.editorial.sourcePage?' · Source page '+q.editorial.sourcePage:"")+
         ' · '+minutes(seconds)+' foreground exposure · Speed: '+escapeText(speed)+
         ' · Visits: '+(visitCount??0)+'</p>'+
       frozenReviewMedia(owner.attempt!,q,response,answer,it.verdict)+
       (origin?'<p class="fine">Notebook source: '+escapeText(origin.sourcePaperId)+
         ' · '+escapeText(origin.sourcePaperEdition)+' · '+escapeText(origin.sourceSectionTitle)+
         ' · source attempt '+escapeText(origin.sourceAttemptId)+'</p>':"")+
       '<p class="fine"><span class="verdict '+escapeText(it.verdict)+'">'+
        escapeText(it.verdict)+'</span> · '+it.marks+' automated marks</p>'+
       '<p class="fine">Your answer: '+escapeText(readableAnswer(q,response))+'</p>'+
       '<p class="fine">'+(it.verdict==="excluded"?"Frozen answer key (not scored): ":
         it.verdict==="pending"?"Manual assessment: ":"Expected: ")+
         escapeText(readableAnswer(q,answer))+'</p>'+
       (q.editorial.notes?'<p class="fine">Editorial note: '+escapeText(q.editorial.notes)+'</p>':"")+
       (explanation||richExplanation?'<details class="worked-solution"'+
         (it.verdict==="incorrect"||it.verdict==="unanswered"?" open":"")+'>'+
         '<summary>'+((q.content.assetIds?.length||(
          (q.content.kind==="single-choice"||q.content.kind==="multiple-select")&&
          q.content.options.some(o=>o.assetIds?.length)))?
          "Visual solving method":"Solving approach & worked reasoning")+
         '</summary><div class="worked-solution-body">'+
         renderAuthoredText(frozenTarget,explanation??"",richExplanation)+'</div></details>':"")+
       sourceReviewHTML(owner.attempt!,q,reviewSource)+
       (provenance.length?'<p class="fine">Sources: '+provenance.map(source=>
         '<a href="'+escapeText(source.url)+'" target="_blank" rel="noopener noreferrer">'+
         escapeText(source.title)+'</a>').join(' · ')+'</p>':"")+
       (limit!==null?'<div class="generic-manual-grade"><p class="fine">Written response requires explicit human assessment. Self-marked results are separate from exam scores. Unsaved drafts stay in this tab only and are not included in backups.</p>'+ 
          '<p class="fine" data-manual-status="'+escapeText(q.id)+'" role="status">'+(draft?"Unsaved changes — select Save self-assessment to commit.":"No unsaved assessment changes.")+'</p>'+
          '<label>Self-assessed marks (0–'+limit+')<input type="number" step="0.01" min="0" max="'+limit+'" data-manual-marks="'+escapeText(q.id)+'" value="'+escapeText(draft?.marks??prior?.marks??"")+'"></label>'+
          '<label>Assessment note (optional)<textarea maxlength="2000" rows="2" data-manual-note="'+escapeText(q.id)+'">'+escapeText(draft?.note??prior?.note??"")+'</textarea></label>'+
          '<button class="btn" data-manual-save="'+escapeText(q.id)+'">Save self-assessment</button></div>':"")+
       '<button class="btn" data-add-card="'+escapeText(q.id)+'"'+
         (owner.records.has("learning-card:"+q.id)?" disabled":"")+'>'
         +(owner.records.has("learning-card:"+q.id)?"In notebook":"Add to notebook")+
       '</button></article>';
    }).join("")+'</section>':revealReview?
       '<section class="result-pane" id="result-review" role="tabpanel" aria-labelledby="result-tab-review" hidden></section>':"")+
    (owner.resultTab==="timing"?timingLedgerHTML(owner.attempt,true,revealReview):
      '<section class="result-pane" id="result-timing" role="tabpanel" aria-labelledby="result-tab-timing" hidden></section>')+
    '<footer class="result-device-footer">Saved on this device · Review, export and manage your data from History</footer>';
 }

export function bindResultScreen(owner:ResultControllerContext):void{

     owner.root.querySelector<HTMLButtonElement>("#g-history-results")!.onclick=()=>owner.go({screen:"history"});
     const resultLibrary=owner.root.querySelector<HTMLButtonElement>("#g-result-library");
     if(resultLibrary)resultLibrary.onclick=()=>owner.go({screen:"library"});
     const viewReview=owner.root.querySelector<HTMLButtonElement>("#g-view-question-review");
     if(viewReview)viewReview.onclick=()=>owner.go({screen:"result",attemptId:owner.attempt!.id,tab:"review"});
     const tabs=[...owner.root.querySelectorAll<HTMLButtonElement>("[data-result-tab]")];
     tabs.forEach((button,index)=>{
       button.onclick=()=>owner.go({screen:"result",attemptId:owner.attempt!.id,tab:button.dataset.resultTab as ResultTab});
       button.onkeydown=event=>{
         if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
         event.preventDefault();
         const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:
           (index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
         owner.go({screen:"result",attemptId:owner.attempt!.id,tab:tabs[next]!.dataset.resultTab as ResultTab});
       };
     });
     const reviewFilterControl=owner.root.querySelector<HTMLSelectElement>("#g-review-filter");
     if(reviewFilterControl)reviewFilterControl.onchange=e=>{
       owner.reviewFilter=(e.target as HTMLSelectElement).value as ReviewFilter;owner.draw();
     };
     owner.root.querySelectorAll<HTMLButtonElement>("[data-review-preset]").forEach(button=>button.onclick=()=>{
       if(!owner.attempt?.frozen.paper.navigation.allowReview)return;
       owner.reviewFilter=(button.dataset.reviewPreset??"all") as ReviewFilter;
       if(owner.resultTab==="review")owner.draw();
       else owner.go({screen:"result",attemptId:owner.attempt!.id,tab:"review"});
     });
     owner.root.querySelectorAll<HTMLButtonElement>("[data-ledger-q]").forEach(button=>button.onclick=()=>{
       if(!owner.attempt?.frozen.paper.navigation.allowReview)return;
       const question=button.dataset.ledgerQ;owner.reviewFilter="all";
       void owner.router.navigate({screen:"result",attemptId:owner.attempt!.id,tab:"review"}).then(()=>{
         if(owner.disposed)return;
         if(owner.resultTab==="review")owner.draw();
         const target=[...owner.root.querySelectorAll<HTMLElement>("[data-review-id]")].find(node=>node.dataset.reviewId===question);
         target?.scrollIntoView({block:"start"});
       }).catch(error=>owner.notice(error instanceof Error?error.message:"Review navigation failed"));
     });
     const revisionSet=owner.root.querySelector<HTMLButtonElement>("#g-revision-set");
     if(revisionSet)revisionSet.onclick=()=>{void owner.addResultCards(owner.attempt!);};
     const reviewTop=owner.root.querySelector<HTMLButtonElement>("#g-review-top");
     if(reviewTop)reviewTop.onclick=()=>{
       document.getElementById("result-tab-review")?.focus({preventScroll:true});
       window.scrollTo({top:0,behavior:"smooth"});
     };
     const captureManualDraft=(id:string):void=>{
       if(!owner.attempt)return;
       const marks=[...owner.root.querySelectorAll<HTMLInputElement>("[data-manual-marks]")].find(x=>x.dataset.manualMarks===id);
       const note=[...owner.root.querySelectorAll<HTMLTextAreaElement>("[data-manual-note]")].find(x=>x.dataset.manualNote===id);
       if(!marks||!note)return;
       owner.manualGradeDrafts.set(owner.attempt.id+"|"+id,{marks:marks.value,note:note.value});
       const status=[...owner.root.querySelectorAll<HTMLElement>("[data-manual-status]")].find(x=>x.dataset.manualStatus===id);
       if(status)status.textContent="Unsaved changes — select Save self-assessment to commit.";
     };
     owner.root.querySelectorAll<HTMLInputElement>("[data-manual-marks]").forEach(node=>{
       node.oninput=()=>captureManualDraft(node.dataset.manualMarks??"");
     });
     owner.root.querySelectorAll<HTMLTextAreaElement>("[data-manual-note]").forEach(node=>{
       node.oninput=()=>captureManualDraft(node.dataset.manualNote??"");
     });
     owner.root.querySelectorAll<HTMLButtonElement>("[data-manual-save]").forEach(button=>button.onclick=async()=>{
       if(!owner.attempt||owner.storageFault)return;
       const id=button.dataset.manualSave as QuestionRevisionId|undefined;
       if(!id)return;
       const marksField=[...owner.root.querySelectorAll<HTMLInputElement>("[data-manual-marks]")].find(x=>x.dataset.manualMarks===id);
       const noteField=[...owner.root.querySelectorAll<HTMLTextAreaElement>("[data-manual-note]")].find(x=>x.dataset.manualNote===id);
       if(!marksField?.value||!Number.isFinite(marksField.valueAsNumber)){owner.notice("Enter a finite assessment mark.");return;}
       try{
         const assessed=setManualGrade(owner.attempt,id,marksField.valueAsNumber,noteField?.value??"",new Date(owner.now()).toISOString());
         if(await owner.save(assessed)){
           owner.manualGradeDrafts.delete(assessed.id+"|"+id);
           owner.warning="Self-assessment committed separately from original exam score.";
           owner.draw();
         }
       }catch(error){owner.notice(error instanceof Error?error.message:"Invalid manual assessment");}
     });
     owner.root.querySelectorAll<HTMLButtonElement>("[data-add-card]").forEach(button=>button.onclick=()=>{
       if(owner.attempt)owner.addNotebookCard(owner.attempt,button.dataset.addCard??"");
     });
     return;
   
}
