import {createRevisionScheduler} from "../learning/fsrs-scheduler-adapter.ts";
import {DEFAULT_REVISION_SETTINGS,readRevisionSettings,revisionSchedulerOptions,
 validateRevisionSettings,writeRevisionSettings} from "../learning/revision-settings.ts";
import {fsrsOptimizerCsv,optimizerEvidenceSummary,serializeFsrsOptimizerProfile,
 validateFsrsOptimizerProfile,type FsrsOptimizerProfile} from "../learning/fsrs-optimizer.ts";
import {browserFsrsOptimizerAvailability,FsrsOptimizerRejectedError,startBrowserFsrsOptimizer,
 type BrowserFsrsOptimizerProgress,type BrowserFsrsOptimizerRun} from "../learning/fsrs-browser-optimizer.ts";
import {reconcileSameExamQuestion} from "./exam-dom-reconcile.ts";
import type {RevisionSchedulerPort} from "../learning/revision-scheduler-port.ts";
import type { ExamPackage, GenericAttempt } from "./exam-package.ts";
import { readableAnswer } from "./exam-package.ts";
import { ERROR_LABELS, comparableTrends, inspectLearningCard, previewLearningCard, rateLearningCard, scheduledCard, topicMetrics, validateLearningCard } from "../learning/learning.ts";
import { evidenceProgression } from "../learning/attempt-evidence.ts";
import { REVISION_MAX_QUESTIONS, type RevisionSelectionProvenance } from "../learning/revision-test.ts";
import { REVISION_REASONS,revisionInventory,revisionTake,mockEvidenceAttempts,type RevisionReason } from "../learning/revision-selection.ts";
import { syllabusForExam } from "../learning/syllabus-taxonomy.ts";
import type { ErrorLabel, LearningCard, ReviewGrade } from "../learning/learning.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {authoredTextHTML} from "./rich-content-view.ts";

export interface LearningDeskHost {
  cards:()=>LearningCard[];
  attempts:()=>GenericAttempt[];
  save:(record:LearningCard)=>Promise<boolean>;
  remove:(id:string)=>Promise<void>;
  startRevision:(cards:readonly LearningCard[],selection?:RevisionSelectionProvenance)=>Promise<boolean>;
  close:()=>void;
}
const esc=(v:unknown):string=>String(v??"").replace(/[&<>"']/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
const fsrsInterval=(days:number):string=>{
 const seconds=Math.max(0,Math.round(days*86400));
 if(seconds<60)return seconds+"s";
 if(seconds<3600)return Math.round(seconds/60)+"m";
 if(seconds<86400)return Math.round(seconds/3600)+"h";
 if(days<30)return (days<10?Number(days.toFixed(1)):Math.round(days))+"d";
 if(days<365)return Math.round(days/30.4375)+"mo";
 return Number((days/365.25).toFixed(days<730?1:0))+"y";
};
const downloadText=(name:string,text:string,type:string):void=>{
 const url=URL.createObjectURL(new Blob([text],{type})),link=document.createElement("a");
 link.href=url;link.download=name;link.click();window.setTimeout(()=>URL.revokeObjectURL(url),0);
};
function figures(assets:LearningCard["assets"],ids:readonly string[]|undefined):string{
 return (ids??[]).map(id=>{
  const a=assets.find(x=>x.id===id);
  return a?'<img class="generic-figure" src="'+esc(a.dataUri)+'" alt="'+esc(a.altText??"Question figure")+'">':"";
 }).join("");
}
function learningRich(record:LearningCard,plain:string,rich:RichDocument|undefined):string{
 return authoredTextHTML(plain,rich,new Set(record.assets.map(a=>a.id)),
   (id)=>figures(record.assets,[id]));
}
function questionHTML(record:LearningCard):string{
 const q=record.question,c=q.content,assets=record.assets;
 const stimulus=record.stimuli.find(s=>s.id===c.stimulusId);
 let stimulusHtml="";
 if(stimulus?.kind==="passage"||stimulus?.kind==="case")
   stimulusHtml='<section class="generic-stimulus"><strong>'+esc(stimulus.title??"Source passage")+
     '</strong>'+(stimulus.richText?learningRich(record,stimulus.text,stimulus.richText):
     '<p>'+esc(stimulus.text)+'</p>')+figures(assets,stimulus.assetIds)+'</section>';
 else if(stimulus?.kind==="table")
   stimulusHtml='<section class="generic-stimulus"><strong>'+esc(stimulus.title??"Table")+
     '</strong><div class="scroll-table"><table><tr>'+
     stimulus.columns.map((x,i)=>'<th>'+learningRich(record,x,stimulus.richColumns?.[i])+'</th>').join("")+
     '</tr>'+stimulus.rows.map((row,i)=>'<tr>'+row.map((x,j)=>'<td>'+
       learningRich(record,x,stimulus.richRows?.[i]?.[j])+'</td>').join("")+'</tr>').join("")+
     '</table></div></section>';
 else if(stimulus&&(stimulus.kind==="chart"||stimulus.kind==="image"))
   stimulusHtml='<section class="generic-stimulus">'+figures(assets,[stimulus.assetId])+
     '<div>'+learningRich(record,stimulus.caption??stimulus.altText,stimulus.richCaption)+'</div></section>';
 const choices=(c.kind==="single-choice"||c.kind==="multiple-select")?
   '<div class="generic-choices">'+c.options.map((o,i)=>'<label class="generic-choice"><input type="'+
   (c.kind==="single-choice"?"radio":"checkbox")+'" name="learning-answer"><div class="pd-rich-choice-text">'+
   String.fromCharCode(65+i)+'. '+learningRich(record,o.text,o.richText)+
   figures(assets,o.assetIds)+'</div></label>').join("")+'</div>':
   c.kind==="true-false"?'<div class="generic-choices"><label><input type="radio" name="learning-true"> True</label> '+
      '<label><input type="radio" name="learning-true"> False</label></div>':
   '<textarea aria-label="Recall your response" rows="3" placeholder="Think through or write your answer before revealing it."></textarea>';
 return stimulusHtml+(c.richPrompt?
   '<div class="generic-prompt" role="heading" aria-level="2">'+learningRich(record,c.prompt,c.richPrompt)+'</div>':
   '<h2 class="generic-prompt">'+esc(c.prompt)+'</h2>')+
   figures(assets,c.assetIds)+choices;
}

export function createLearningDesk(root:HTMLElement,host:LearningDeskHost){
 let scheduler:RevisionSchedulerPort|null=null,revisionSettings=readRevisionSettings();
 let selectedId:string|null=null,reviewId:string|null=null,revealed=false,revealedStartedAt:number|null=null;
 let filter:"all"|"due"|"remediation"|"bookmarked"="all",hierarchyRoot="",message="",closed=false,opened=false;
 let previousLearningView="";
 const optimizerAvailability=browserFsrsOptimizerAvailability();
 let optimizerStatus=optimizerAvailability.reason;
 let optimizerRun:BrowserFsrsOptimizerRun|null=null;
 const optimizerProgress=(progress:BrowserFsrsOptimizerProgress)=>{
   const percent=progress.total>0?Math.round(progress.current*100/progress.total):0;
   optimizerStatus=progress.stage+" · "+progress.current+"/"+progress.total+(progress.total>0?" · "+percent+"%":"");
   const status=root.querySelector<HTMLElement>("#learning-optimizer-status");
   if(status)status.textContent=optimizerStatus;
 };
 type NotebookDraft={note:string;customSubject:string;customTopic:string;customSubtopic:string;
   syllabusTopicId:string;errorLabel:string;bookmarked:boolean;revisionDisposition:"active"|"suspended"};
 const notebookDrafts=new Map<string,NotebookDraft>();
 const present=(html:string,identity:string)=>{
   const same=previousLearningView===identity;
   // Keep a selected card's native dirty fields when unrelated Learning
   // evidence/filter state changes. Card-to-card transitions deliberately
   // replace the detail editor, never transferring A's values into B.
   const oldDetail=same&&identity==="main"?
     root.querySelector<HTMLElement>("[data-learning-card]"):null;
   const cardId=oldDetail?.dataset.learningCard;
   const active=document.activeElement;
   const activeEdit=active instanceof HTMLElement&&oldDetail?.contains(active)&&
     ["learning-note","learning-subject","learning-topic","learning-subtopic",
       "learning-error","learning-syllabus","learning-bookmark","learning-suspend"].includes(active.id);
   const preserve=oldDetail&&cardId&&(notebookDrafts.has(cardId)||activeEdit);
   type NativeField=HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement;
   const editor=preserve?Array.from(oldDetail.querySelectorAll<NativeField>(
     "input[id],textarea[id],select[id]")).filter(el=>el.id.startsWith("learning-")).map(el=>({
       element:el,id:el.id,value:el.value,
       checked:el instanceof HTMLInputElement?el.checked:null,
       focused:active===el,
       start:el instanceof HTMLTextAreaElement||
         el instanceof HTMLInputElement&&["text","search"].includes(el.type)?
         el.selectionStart:null,
       end:el instanceof HTMLTextAreaElement||
         el instanceof HTMLInputElement&&["text","search"].includes(el.type)?
         el.selectionEnd:null,
       scrollTop:el.scrollTop,scrollLeft:el.scrollLeft
     })):[];

   if(same)reconcileSameExamQuestion(root,html);
   else root.innerHTML=html;

   if(oldDetail?.isConnected&&root.querySelector("[data-learning-card]")===oldDetail)
     for(const prior of editor){
       const el=oldDetail.querySelector<NativeField>("#"+prior.id);
       if(el!==prior.element)continue;
       if(el.value!==prior.value)el.value=prior.value;
       if(prior.checked!==null&&el instanceof HTMLInputElement)
         el.checked=prior.checked;
       if(prior.focused){
         el.focus({preventScroll:true});
         try{
           if(prior.start!==null&&prior.end!==null&&
             (el instanceof HTMLInputElement||el instanceof HTMLTextAreaElement))
             el.setSelectionRange(prior.start,prior.end);
         }catch{/* Native selection on incompatible inputs must not break redraw. */}
         el.scrollTop=prior.scrollTop;el.scrollLeft=prior.scrollLeft;
       }
     }
   previousLearningView=identity;
 };
 let evidenceExam="",evidenceCount=10;
 let evidenceReasons:RevisionReason[]=["wrong","blank"];
 const cache=new Map<string,{record:LearningCard;scheduled:ReturnType<typeof scheduledCard>}>();
 const schedule=(card:LearningCard)=>{
   const current=cache.get(card.id);
   if(current?.record===card)return current.scheduled;
   const computed=scheduledCard(card,scheduler!);
   cache.set(card.id,{record:card,scheduled:computed});
   return computed;
 };
 const invalidate=(all:readonly LearningCard[])=>{
   const active=new Map(all.map(card=>[card.id,card]));
   for(const [id,entry] of cache)if(active.get(id)!==entry.record)cache.delete(id);
 };
 const now=()=>new Date(),clock=()=>typeof performance!=="undefined"?performance.now():Date.now();
 const cards=()=>host.cards().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const effectiveStatus=(card:LearningCard)=>card.revisionDisposition==="suspended"?"suspended":schedule(card).leechStatus;
 const due=(card:LearningCard)=>scheduler!==null&&effectiveStatus(card)!=="suspended"&&schedule(card).dueAt.getTime()<=Date.now();
 const dueCards=()=>cards().filter(due).sort((a,b)=>{
   const aa=schedule(a),bb=schedule(b),ap=effectiveStatus(a)==="remediation"?0:1,bp=effectiveStatus(b)==="remediation"?0:1;
   return ap-bp||aa.dueAt.getTime()-bb.dueAt.getTime();
 });
 const policySummary=()=>!scheduler?"Scheduler initializing":scheduler.configuration.retentionPolicy==="fixed"
   ?Math.round(scheduler.configuration.desiredRetention*100)+"% fixed retention"
   :"Cost-ADR · cost weight "+scheduler.configuration.costAdrGoalWeight;
 function draw(){
  if(closed||!opened)return;
  const all=cards();
  invalidate(all);
  const dueNow=dueCards();
  const visible=all.filter(c=>filter==="all"||filter==="due"&&due(c)||
    filter==="remediation"&&scheduler!==null&&effectiveStatus(c)==="remediation"||filter==="bookmarked"&&c.bookmarked);
  // Selection never displays an invisible card from another list filter.
  // Any unfinished edit is still held by its immutable card ID in this tab.
  const selected=visible.find(c=>c.id===selectedId)??visible[0];
  const selectedDraft=selected?notebookDrafts.get(selected.id):undefined;
  if(reviewId){
    const item=all.find(c=>c.id===reviewId);
    if(!item){reviewId=null;revealed=false;}
    else{
     const inspectionAt=now().toISOString();
     const snapshot=scheduler&&revealed?inspectLearningCard(item,inspectionAt,scheduler):null;
     const previews=scheduler&&revealed?previewLearningCard(item,inspectionAt,scheduler):[];
     const previewByRating=new Map(previews.map(value=>[value.rating,value]));
     const reviewStatus=scheduler?effectiveStatus(item):"normal";
     const fsrsDetail=snapshot&&scheduler?
       '<p class="fine"><strong>FSRS-7 memory</strong> · '+esc(policySummary())+' · '+
       (scheduler.configuration.weights==="FSRS-7-custom"?'personalized 34-weight model':'default 34-weight model')+
       ' · '+(scheduler.configuration.enableFuzz?'reproducible fuzz on':'fuzz off')+
       ' · state '+esc(snapshot.state)+(snapshot.retrievability===null?'':' · recall now '+Math.round(snapshot.retrievability*1000)/10+'%')+
       ' · stability '+Number(snapshot.stability.toFixed(2))+'d · fast '+Number(snapshot.stabilityFast.toFixed(2))+
       'd · difficulty '+Number(snapshot.difficulty.toFixed(2))+' · '+snapshot.reps+' reviews · '+snapshot.lapses+' lapses</p>'+
       (reviewStatus==="normal"?'':'<p class="generic-warning"><strong>Persistent weakness:</strong> '+
        (reviewStatus==="remediation"?'prioritized for remediation':'suspended from the automatic queue')+
        (item.errorLabel?' · self-reported error: '+esc(item.errorLabel):'')+(item.note?' · review your saved note below':'')+'.</p>'):"";
     const html='<div class="generic-heading"><div><h1>Spaced revision</h1><p class="muted">'+
       esc(item.sectionTitle)+' · '+esc(scheduler?.provider??"FSRS-7")+' · rate your recall, not your exam mark</p></div>'+
       '<button class="btn" id="learning-back">Learning desk</button></div>'+
       '<section class="panel pad">'+questionHTML(item)+
       (revealed?'<div class="learning-answer"><h3>Expected answer</h3><p>'+esc(readableAnswer(item.question,item.answer))+'</p>'+
         (item.question.content.richExplanation?
           learningRich(item,"",item.question.content.richExplanation):
           item.explanation?'<p>'+esc(item.explanation)+'</p>':"")+
         (item.note?'<p class="fine">Your note: '+esc(item.note)+'</p>':"")+fsrsDetail+
         '<h3>How well did you recall it?</h3><div class="row generic-actions">'+
         ([[1,"Again"],[2,"Hard"],[3,"Good"],[4,"Easy"]] as const)
          .map(([grade,label])=>{
            const projected=previewByRating.get(grade);
            return '<button class="btn" data-grade="'+grade+'">'+label+
              (projected?' · '+esc(fsrsInterval(projected.scheduledDays)):'')+'</button>';
          }).join("")+'</div></div>':
         '<button class="btn primary" id="learning-reveal">Reveal answer</button>')+'</section>'+
       (message?'<p role="status" class="generic-warning">'+esc(message)+'</p>':"");
     present(html,"review:"+item.id);
     root.querySelector<HTMLButtonElement>("#learning-back")!.onclick=()=>{reviewId=null;revealed=false;revealedStartedAt=null;draw();};
     root.querySelector<HTMLButtonElement>("#learning-reveal")?.addEventListener("click",()=>{revealedStartedAt=clock();revealed=true;draw();});
     root.querySelectorAll<HTMLButtonElement>("[data-grade]").forEach(button=>button.onclick=async()=>{
       if(!revealed||!scheduler)return;
       try{
         const durationMs=revealedStartedAt===null?0:Math.max(0,Math.round(clock()-revealedStartedAt));
         if(!await host.save(rateLearningCard(item,Number(button.dataset.grade) as ReviewGrade,now().toISOString(),durationMs,scheduler))){
           message="Review not durably saved. Export a recovery backup from the library.";draw();return;
         }
         message="Review recorded. The next due date is scheduled by FSRS-7.";
         reviewId=dueCards().find(c=>c.id!==item.id)?.id??null;revealed=false;revealedStartedAt=null;draw();
       }catch(error){message=error instanceof Error?error.message:"Scheduling failed";draw();}
     });
     return;
    }
  }
  const done=host.attempts().filter(a=>a.finishedAt!==null&&a.result);
  const topics=topicMetrics(done,all),cohorts=comparableTrends(done).filter(x=>x.count>=2);
  const subjectRoots=topics.filter(t=>t.kind==="hierarchy"&&t.depth===1);
  if(hierarchyRoot&&!subjectRoots.some(t=>t.id===hierarchyRoot))hierarchyRoot="";
  const shownTopics=hierarchyRoot?topics.filter(t=>t.kind==="hierarchy"&&
    (t.id===hierarchyRoot||t.id.startsWith(hierarchyRoot+"/"))):topics;
  const reviewedCount=all.filter(c=>c.reviews.length>0).length;
  const bookmarkedCount=all.filter(c=>c.bookmarked).length;
  const remediationCount=scheduler?all.filter(c=>effectiveStatus(c)==="remediation").length:0;
  const suspendedCount=scheduler?all.filter(c=>effectiveStatus(c)==="suspended").length:0;
  const optimizerEvidence=optimizerEvidenceSummary(all);
  const reports=new Map<string,number>();
  for(const card of all)if(card.errorLabel)reports.set(card.errorLabel,(reports.get(card.errorLabel)??0)+1);
  const commonReports=[...reports].sort((a,b)=>b[1]-a[1]).slice(0,4);
  const progress=evidenceProgression(topics);
  const sourceAttempts=mockEvidenceAttempts(done);
  const availableExams=[...new Set([...sourceAttempts.map(a=>a.frozen.snapshot.examId),...all.map(c=>c.examId)])].sort();
  if(!availableExams.includes(evidenceExam))evidenceExam=availableExams[0]??"";
  const assembled=revisionInventory(sourceAttempts,all,new Set(dueNow.map(c=>c.id)),evidenceExam,evidenceReasons);
  const preview=assembled.selected.slice(0,REVISION_MAX_QUESTIONS);
  const exam=visible.find(c=>c.id===selectedId)?.examId??visible[0]?.examId;
  const candidates=visible.filter(c=>c.examId===exam&&
    ["verified","corrected","caution"].includes(c.question.editorial.status)).slice(0,REVISION_MAX_QUESTIONS);
  const html='<div class="generic-heading"><div><h1>Learning & revision</h1><p class="muted">Error notebook · FSRS-7 spaced review · Topic evidence</p></div>'+
    '<button class="btn" id="learning-close">← Test library</button></div>'+
    '<p class="generic-warning" role="status" id="learning-message"'+
      (message?'':' hidden')+'>'+esc(message)+'</p>'+
    '<div class="learning-summary">'+
    [['Notebook cards',all.length],['Due for revision',dueNow.length],['Remediation',remediationCount],['Suspended',suspendedCount],
      ['Reviewed with FSRS',reviewedCount],['Bookmarked',bookmarkedCount]]
      .map(([label,value])=>'<div class="summary-stat"><small>'+esc(label)+'</small><b>'+esc(value)+'</b></div>').join("")+
    '</div>'+
    '<section class="panel pad learning-scheduler-policy"><h2>FSRS-7 scheduling policy</h2>'+
    '<p class="fine">Fixed retention remains the default. Cost-ADR is an explicit alternative. Repeated review lapses become leeches; remediation is the default response and automatic suspension is optional.</p>'+
    '<div class="learning-evidence-controls"><label>Retention policy <select id="learning-retention-policy">'+
    '<option value="fixed"'+(revisionSettings.retentionPolicy==="fixed"?' selected':'')+'>Fixed retention</option>'+
    '<option value="cost-adr"'+(revisionSettings.retentionPolicy==="cost-adr"?' selected':'')+'>Cost-adaptive retention (Cost-ADR)</option></select></label>'+
    '<label>Fixed target <input id="learning-retention-target" type="number" min="0.01" max="0.99" step="0.01" value="'+revisionSettings.desiredRetention+'"></label>'+
    '<label>Cost-ADR goal weight <input id="learning-cost-adr-weight" type="number" min="0" max="1024" step="1" value="'+revisionSettings.costAdrGoalWeight+'"></label>'+
    '<label>Leech threshold <input id="learning-leech-threshold" type="number" min="1" max="1000" step="1" value="'+revisionSettings.leechThreshold+'"></label>'+
    '<label>Leech action <select id="learning-leech-action"><option value="remediate"'+(revisionSettings.leechAction==="remediate"?' selected':'')+'>Prioritize remediation</option>'+
    '<option value="suspend"'+(revisionSettings.leechAction==="suspend"?' selected':'')+'>Suspend automatically</option></select></label></div>'+
    '<div class="row generic-actions"><button class="btn primary" id="learning-policy-apply">Apply scheduling policy</button></div>'+
    '<h3>Personalized FSRS-7 weights</h3><p class="fine">'+(revisionSettings.optimizerProfile?
      'Active held-out-validated profile · trained '+esc(new Date(revisionSettings.optimizerProfile.trainedAt).toLocaleDateString())+
      ' · '+revisionSettings.optimizerProfile.evidenceItems+' optimizer items · holdout log loss '+
      Number(revisionSettings.optimizerProfile.evaluation.holdout.default.logLoss.toFixed(4))+' → '+
      Number(revisionSettings.optimizerProfile.evaluation.holdout.personalized.logLoss.toFixed(4))+
      ' · holdout RMSE '+Number(revisionSettings.optimizerProfile.evaluation.holdout.default.rmseBins.toFixed(4))+' → '+
      Number(revisionSettings.optimizerProfile.evaluation.holdout.personalized.rmseBins.toFixed(4))+
      ' · cross-validation log loss '+Number(revisionSettings.optimizerProfile.evaluation.crossValidation.logLoss.toFixed(4)):
      'Using upstream FSRS-7 default weights.')+
    ' Raw evidence: '+optimizerEvidence.reviews+' reviews across '+optimizerEvidence.cards+' cards.</p>'+
    '<p class="fine">The static Practice Desk build can train FSRS-7 locally in a dedicated WebAssembly Worker; no optimizer backend or review-log upload is used. Optimizer intervals use explicit fixed elapsed 24-hour days, matching the runtime <code>dateChrono</code> scheduler; timezone/DST study-day normalization is intentionally not used. Personalized weights activate only after a later chronological holdout beats stock FSRS-7 on log loss without RMSE-bins regression; final 34 weights are then retrained on all evidence. The 64/64/16 evidence floors are reliability guards, not a claim of statistical significance. The Node optimizer remains the native CI/reference path. <code>computeOptimalSteps</code> remains advisory only because upstream does not consider its single-decay fit FSRS-7 model-consistent.</p>'+
    '<p class="fine" id="learning-optimizer-status" role="status">'+esc(optimizerStatus)+'</p>'+
    '<div class="row generic-actions"><button class="btn primary" id="learning-optimizer-run"'+
      (!optimizerAvailability.available||!optimizerEvidence.reviews||optimizerRun?' disabled':'')+'>Optimize FSRS-7 locally</button>'+
    '<button class="btn" id="learning-optimizer-cancel"'+(optimizerRun?'':' disabled')+'>Cancel optimization</button>'+
    '<button class="btn" id="learning-optimizer-export"'+(optimizerEvidence.reviews?'':' disabled')+'>Export optimizer evidence</button>'+
    '<button class="btn" id="learning-optimizer-import">Import evaluated profile</button><input id="learning-optimizer-file" type="file" accept="application/json,.json" hidden>'+
    '<button class="btn" id="learning-optimizer-export-profile"'+(revisionSettings.optimizerProfile?'':' disabled')+'>Export active profile</button>'+
    '<button class="btn" id="learning-optimizer-reset"'+(revisionSettings.optimizerProfile?'':' disabled')+'>Use default weights</button></div></section>'+
    '<section class="panel pad learning-revision-callout"><div class="row between"><div><h2>Revision queue</h2>'+
    '<p class="fine">'+all.length+' cards · '+(scheduler?dueNow.length+" due now":"Scheduler initializing")+
      (scheduler?' · '+esc(scheduler.provider)+' · '+esc(policySummary())+' · '+
       (scheduler.configuration.weights==="FSRS-7-custom"?'personalized weights':'default weights'):'')+
      ' · Mock results do not automatically count as spaced-repetition reviews</p></div>'+
    '<div class="row generic-actions"><button class="btn primary" id="learning-due"'+(!scheduler||!dueNow.length?" disabled":"")+'>Review due cards</button>'+
    '<button class="btn" id="learning-test"'+(!candidates.length?" disabled":"")+'>Start revision test ('+candidates.length+')</button></div></div>'+
    '<p class="fine">Practice test uses the selected exam and current notebook filter (up to '+REVISION_MAX_QUESTIONS+
    ' eligible cards). Untimed; +1 correct, 0 incorrect/unanswered. It is not the source exam score and does not rate FSRS cards.</p></section>'+
    '<section class="panel pad learning-evidence-builder"><h2>Build a targeted revision test</h2>'+
    '<p class="fine">Select an exam and observed evidence; questions are taken from exact frozen completed sources or your notebook. No guessed syllabus labels, cognitive causes or exam marks. Revision marking is +1 / 0, separate from mock results and FSRS ratings.</p>'+
    '<div class="learning-evidence-controls"><label>Exam <select id="learning-evidence-exam" aria-label="Revision exam">'+
    availableExams.map(id=>'<option value="'+esc(id)+'"'+(id===evidenceExam?' selected':'')+'>'+esc(id)+'</option>').join("")+
    '</select></label><label>Questions (1–'+REVISION_MAX_QUESTIONS+') <input id="learning-evidence-count" type="number" min="1" max="'+REVISION_MAX_QUESTIONS+'" value="'+evidenceCount+'"></label></div>'+
    '<fieldset class="learning-evidence-reasons"><legend>Include evidence types</legend>'+
    REVISION_REASONS.map(reason=>'<label><input type="checkbox" data-evidence-reason="'+reason+'"'+
      (evidenceReasons.includes(reason)?' checked':'')+'> '+esc(reason==='repeated'?'Repeated wrong':reason==='blank'?'Unanswered':reason==='slow'?'Measured slow':reason)+
      '</label>').join("")+'</fieldset>'+
    '<p class="fine" id="learning-evidence-summary" role="status">'+assembled.eligibleCount+' unique eligible questions · '+Math.min(evidenceCount,preview.length)+
      ' previewed · '+sourceAttempts.filter(a=>a.frozen.snapshot.examId===evidenceExam).length+
      ' completed source attempts. Reused questions and repeated exposure are not independent difficulty-adjusted evidence.</p>'+
    (assembled.insufficient.length?'<p class="fine">'+assembled.insufficient.map(esc).join(' ')+'</p>':'')+
    (preview.length?'<ol class="learning-evidence-preview">'+preview.map((item,index)=>
       '<li'+(index>=evidenceCount?' hidden':'')+'><strong>'+esc(item.reasons.join(', '))+'</strong> · '+esc(item.prompt.slice(0,140))+
       ' <small>· '+esc(item.sourcePaperId)+' · '+item.wrongAttempts+' wrong of '+item.observedAttempts+
       ' observed source attempts'+(item.measuredForegroundMs===null?'':', '+Math.round(item.measuredForegroundMs/1000)+'s cumulative foreground')+
       (item.visits===null?'':', '+item.visits+' visits')+
       (item.firstVisitMs===null?'':', first visit '+Math.round(item.firstVisitMs/1000)+'s')+
       (item.revisitMs===null?'':', revisit '+Math.round(item.revisitMs/1000)+'s')+
       (item.beforeFirstAnswerMs===null?'':', before first answer '+Math.round(item.beforeFirstAnswerMs/1000)+'s')+
       '</small></li>').join("")+'</ol>':
       '<p class="fine">No eligible questions for the chosen filters. Try another evidence type or exam.</p>')+
    '<p class="fine">New sessions record first-visit, revisit and pre-first-answer foreground exposure. Unmeasured phases remain unavailable. These are not continuous wall-clock intervals or evidence of why an answer changed.</p>'+
    '<button class="btn primary" id="learning-build-evidence"'+(!evidenceReasons.length||assembled.eligibleCount<evidenceCount||evidenceCount<1?' disabled':'')+
      '>Start targeted revision ('+Math.min(evidenceCount,assembled.eligibleCount)+')</button></section>'+
    '<div class="generic-layout learning-layout"><section class="panel pad"><div class="row between"><h2>Error notebook</h2>'+
      '<select id="learning-filter" aria-label="Filter notebook" class="learning-filter">'+
      [["all","All cards"],["due","Due now"],["remediation","Remediation"],["bookmarked","Bookmarked"]].map(([key,label])=>
       '<option value="'+key+'"'+(filter===key?" selected":"")+'>'+label+'</option>').join("")+'</select></div>'+
    '<div class="learning-card-list" data-learning-list>'+
    (visible.length?visible.map(c=>{
      const next=scheduler?schedule(c):null,status=scheduler?effectiveStatus(c):"normal";
      return '<button type="button" class="generic-history '+(selected?.id===c.id?"learning-selected":"")+
        '" data-learning-id="'+esc(c.id)+'" aria-controls="learning-notebook-detail" aria-pressed="'+String(selected?.id===c.id)+'">'+
        esc(c.sectionTitle)+' · '+esc(c.question.content.prompt.slice(0,92))+'<small>'+esc(c.errorLabel??"Unclassified")+' · '+
        (status==="suspended"?"Suspended":status==="remediation"?"Remediation priority":
         next?(next.dueAt.getTime()<=Date.now()?"Due now":"Due "+next.dueAt.toLocaleDateString()):"Unscheduled")+
        ' · '+c.reviews.length+' ratings</small></button>';
    }).join(""):'<p class="fine">No cards in this view. Add a question from a completed test result.</p>')+
    '</div></section>'+
    '<section class="panel pad" id="learning-notebook-detail" aria-label="Notebook detail" data-learning-card="'+
      esc(selected?.id??"none")+'"><h2>Notebook detail</h2>'+
     (selected?'<h3>'+esc(selected.question.content.prompt)+'</h3>'+
       '<p class="fine">'+esc(selected.paperId)+' · '+esc(selected.sectionTitle)+
         ' · captured from completed attempt '+esc(selected.sourceAttemptId)+'</p>'+
       '<p>Expected: <strong>'+esc(readableAnswer(selected.question,selected.answer))+'</strong></p>'+
       (selected.question.content.richExplanation?
         learningRich(selected,"",selected.question.content.richExplanation):
         selected.explanation?'<p class="fine">'+esc(selected.explanation)+'</p>':"")+
       '<label class="picker" for="learning-error">Error type (self-reported)</label>'+
       '<select id="learning-error"><option value="">Not classified</option>'+
       ERROR_LABELS.map(label=>'<option value="'+label+'"'+((selectedDraft?.errorLabel??selected.errorLabel)===label?" selected":"")+'>'+
         esc(label)+'</option>').join("")+'</select>'+
       '<label class="picker" for="learning-subject">Academic subject (optional; independent of the exam section)</label>'+
       '<input id="learning-subject" maxlength="120" value="'+esc(selectedDraft?.customSubject??selected.customSubject??"")+'" placeholder="Leave blank for Unclassified">'+
       '<label class="picker" for="learning-topic">Topic (your own label, optional)</label>'+
       '<input id="learning-topic" maxlength="120" value="'+esc(selectedDraft?.customTopic??selected.customTopic)+'" placeholder="e.g. Labour Codes">'+
       '<label class="picker" for="learning-subtopic">Subtopic (optional; requires Topic)</label>'+
       '<input id="learning-subtopic" maxlength="120" value="'+esc(selectedDraft?.customSubtopic??selected.customSubtopic??"")+'" placeholder="e.g. Wage definitions">'+
       (syllabusForExam(selected.examId)?'<label class="picker" for="learning-syllabus">Subject / broad syllabus heading (optional, manually chosen)</label>'+
         '<select id="learning-syllabus"><option value="">No heading assigned</option>'+
         syllabusForExam(selected.examId)!.headings.map(h=>'<option value="'+esc(h.id)+'"'+
           ((selectedDraft?.syllabusTopicId??selected.syllabusTopicId)===h.id?' selected':'')+'>'+esc(h.label)+'</option>').join("")+'</select>':'')+
       '<label class="picker" for="learning-note">Notes</label>'+
       '<textarea id="learning-note" maxlength="8000" rows="5">'+esc(selectedDraft?.note??selected.note)+'</textarea>'+
       '<label class="learning-bookmark"><input id="learning-bookmark" type="checkbox"'+
         ((selectedDraft?.bookmarked??selected.bookmarked)?" checked":"")+'> Bookmark</label>'+
       '<label class="learning-bookmark"><input id="learning-suspend" type="checkbox"'+
         ((selectedDraft?.revisionDisposition??selected.revisionDisposition)==="suspended"?" checked":"")+
         '> Suspend this card from automatic revision queues</label>'+
       (selectedDraft?'<p class="fine" role="status">Unsaved notebook edits · saved only when you select Save note.</p>':"")+
        '<div class="row generic-actions"><button class="btn primary" id="learning-save">Save note</button>'+
       '<button class="btn" id="learning-one">Review this card</button>'+
       '<button class="btn danger" id="learning-delete">Delete</button></div>':
       '<p class="fine">No card matches the current notebook filter.</p>')+'</section></div>'+
    '<p id="learning-selection-status" class="sr-only" role="status" aria-live="polite">'+
    (selected?'Selected notebook card: '+esc(selected.question.content.prompt.slice(0,140)):
      'No notebook cards in this filter')+'</p>'+
    '<section class="panel pad learning-reports"><div class="row between"><div><h2>Reported error patterns</h2>'+
      '<p class="fine">Self-labelled notebook observations, not inferred diagnoses.</p></div></div>'+
      (commonReports.length?'<div class="learning-report-list">'+commonReports.map(([label,count])=>
        '<div><span>'+esc(label)+'</span><b>'+count+' card'+(count===1?"":"s")+'</b></div>').join("")+'</div>':
        '<p class="fine">Label errors in your notebook to see recurring patterns here.</p>')+'</section>'+
    '<section class="panel pad learning-insights"><h2>Topic performance</h2>'+
    '<label class="picker" for="learning-hierarchy-root">Explore subject and descendants</label>'+
    '<select id="learning-hierarchy-root"><option value="">All sections, source tags and subjects</option>'+
    subjectRoots.map(t=>'<option value="'+esc(t.id)+'"'+(hierarchyRoot===t.id?" selected":"")+'>'+
      esc(t.examId+" · "+t.label)+" ("+t.distinctQuestions+" underlying questions)"+'</option>').join("")+
    '</select>'+
    '<p class="fine">Section, source tags and user-assigned Subject › Topic › Subtopic paths are displayed separately. Parent levels roll up observed answers; sibling labels in different subjects remain distinct. Five answered observations minimum for measured evidence; no topic is inferred from text and no proficiency is assumed. Skips are excluded from accuracy.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Exam</th><th>Type</th><th>Topic</th><th>Answered / total</th><th>Distinct underlying answered</th><th>Answered revisions</th><th>Answering attempts</th><th>Accuracy</th><th>Evidence</th></tr></thead><tbody>'+
     (shownTopics.length?shownTopics.map(t=>'<tr><td>'+esc(t.examId)+'</td><td>'+esc(t.kind)+'</td><td>'+
      (t.kind==="hierarchy"?'<span class="learning-hierarchy-level" data-depth="'+t.depth+'" title="'+esc(t.label)+'">'+
        esc(t.label)+'</span>':esc(t.label))+'</td><td>'+
       t.answered+' / '+t.total+'</td><td>'+t.distinctAnsweredQuestions+'</td><td>'+
        t.distinctAnsweredRevisions+'</td><td>'+t.answeredAttempts+
       '</td><td>'+(t.accuracy===null?"—":Math.round(t.accuracy*100)+"%")+
       '</td><td>'+(t.evidence==="measured"?"Observed":"Insufficient")+'</td></tr>').join(""):
       '<tr><td colspan="9">Complete an exam to view topic performance.</td></tr>')+'</tbody></table></div>'+
    '<h2>Observed topic consistency</h2><p class="fine">Requires at least two attempts, ten answered observations and five distinct question revisions. Repeated questions are tracked separately; these are descriptive bands, not predictions of mastery.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Exam</th><th>Topic</th><th>Evidence</th></tr></thead><tbody>'+
      (progress.length?progress.map(p=>'<tr><td>'+esc(p.examId)+'</td><td>'+esc(p.topic)+'</td><td>'+esc(p.label)+'</td></tr>').join(""):
      '<tr><td colspan="3">No completed practice evidence yet.</td></tr>')+'</tbody></table></div>'+
    '<h2>Comparable attempt trends</h2>'+
    '<p class="fine">Only identical frozen paper revisions, including their rules and answer keys, are compared.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Paper revision</th><th>Attempts</th><th>Accuracy sequence</th><th>Marks sequence</th></tr></thead><tbody>'+
     (cohorts.length?cohorts.map(g=>'<tr><td>'+esc(g.label)+'</td><td>'+g.count+'</td><td>'+
       g.points.map(p=>p.accuracy===null?"—":Math.round(p.accuracy*100)+"%").join(" → ")+
       '</td><td>'+g.points.map(p=>p.marks.toFixed(1)).join(" → ")+'</td></tr>').join(""):
       '<tr><td colspan="4">Complete the same paper revision twice to see a valid comparison.</td></tr>')+
    '</tbody></table></div></section>';
  present(html,"main");
  root.querySelector<HTMLButtonElement>("#learning-policy-apply")!.onclick=async()=>{
    try{
      const next=validateRevisionSettings({...revisionSettings,
       retentionPolicy:root.querySelector<HTMLSelectElement>("#learning-retention-policy")!.value,
       desiredRetention:Number(root.querySelector<HTMLInputElement>("#learning-retention-target")!.value),
       costAdrGoalWeight:Number(root.querySelector<HTMLInputElement>("#learning-cost-adr-weight")!.value),
       leechThreshold:Number(root.querySelector<HTMLInputElement>("#learning-leech-threshold")!.value),
       leechAction:root.querySelector<HTMLSelectElement>("#learning-leech-action")!.value});
      const nextScheduler=await createRevisionScheduler(revisionSchedulerOptions(next));
      revisionSettings=writeRevisionSettings(next);scheduler=nextScheduler;cache.clear();message="FSRS-7 scheduling policy applied.";draw();
    }catch(error){message=error instanceof Error?error.message:"Invalid scheduling policy";draw();}
  };
  const activateOptimizerProfile=async(profile:FsrsOptimizerProfile)=>{
    const next=validateRevisionSettings({...revisionSettings,optimizerProfile:profile});
    const nextScheduler=await createRevisionScheduler(revisionSchedulerOptions(next));
    revisionSettings=writeRevisionSettings(next);scheduler=nextScheduler;cache.clear();
  };
  root.querySelector<HTMLButtonElement>("#learning-optimizer-run")!.onclick=async()=>{
    if(optimizerRun)return;
    try{
      optimizerStatus="Preparing FSRS-7 optimizer evidence…";
      optimizerRun=startBrowserFsrsOptimizer(fsrsOptimizerCsv(all),{onProgress:optimizerProgress});
      draw();
      const profile=await optimizerRun.promise;
      await activateOptimizerProfile(profile);
      optimizerStatus="Personalized FSRS-7 passed the later holdout gate and is active.";
      message="Held-out-validated personalized FSRS-7 weights trained locally and activated.";
    }catch(error){
      if(error instanceof FsrsOptimizerRejectedError)
        optimizerStatus="Stock FSRS-7 retained · "+error.reasons.join("; ");
      else if(error instanceof DOMException&&error.name==="AbortError")
        optimizerStatus="Optimization cancelled; active weights were not changed.";
      else optimizerStatus=error instanceof Error?error.message:"FSRS optimizer failed";
    }finally{optimizerRun=null;draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-optimizer-cancel")!.onclick=()=>{
    optimizerRun?.cancel();
  };
  root.querySelector<HTMLButtonElement>("#learning-optimizer-export")!.onclick=()=>downloadText(
    "practice-desk-fsrs-reviews.csv",fsrsOptimizerCsv(all),"text/csv;charset=utf-8");
  const optimizerFile=root.querySelector<HTMLInputElement>("#learning-optimizer-file")!;
  root.querySelector<HTMLButtonElement>("#learning-optimizer-import")!.onclick=()=>optimizerFile.click();
  optimizerFile.onchange=async()=>{
    const file=optimizerFile.files?.[0];optimizerFile.value="";if(!file)return;
    try{
      const profile=validateFsrsOptimizerProfile(JSON.parse(await file.text()));
      await activateOptimizerProfile(profile);
      optimizerStatus="Imported profile passed Practice Desk's v3 chronology and holdout validation.";
      message="Held-out-validated personalized FSRS-7 profile imported and activated.";draw();
    }catch(error){message=error instanceof Error?error.message:"Invalid optimizer profile";draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-optimizer-export-profile")!.onclick=()=>{
    if(revisionSettings.optimizerProfile)downloadText("practice-desk-fsrs-profile.json",
      serializeFsrsOptimizerProfile(revisionSettings.optimizerProfile),"application/json;charset=utf-8");
  };
  root.querySelector<HTMLButtonElement>("#learning-optimizer-reset")!.onclick=async()=>{
    try{
      const next=validateRevisionSettings({...revisionSettings,optimizerProfile:null});
      const nextScheduler=await createRevisionScheduler(revisionSchedulerOptions(next));
      revisionSettings=writeRevisionSettings(next);scheduler=nextScheduler;cache.clear();
      optimizerStatus=optimizerAvailability.reason;message="Upstream FSRS-7 default weights restored.";draw();
    }catch(error){message=error instanceof Error?error.message:"Could not restore default weights";draw();}
  };
  root.querySelector<HTMLSelectElement>("#learning-hierarchy-root")!.onchange=e=>{
    hierarchyRoot=(e.target as HTMLSelectElement).value;draw();
  };
  root.querySelector<HTMLSelectElement>("#learning-evidence-exam")!.onchange=e=>{
    evidenceExam=(e.target as HTMLSelectElement).value;draw();
  };
  // Update the preview/eligibility in place: full redraw on blur could swallow Start.
  root.querySelector<HTMLInputElement>("#learning-evidence-count")!.oninput=e=>{
    const input=e.target as HTMLInputElement;
    const proposed=Number(input.value);
    evidenceCount=input.value!==""&&Number.isSafeInteger(proposed)&&proposed>=1&&
      proposed<=REVISION_MAX_QUESTIONS?proposed:0;
    root.querySelectorAll<HTMLLIElement>(".learning-evidence-preview li").forEach((li,i)=>{
      li.hidden=i>=evidenceCount;
    });
    const summary=root.querySelector<HTMLElement>("#learning-evidence-summary");
    if(summary)summary.textContent=assembled.eligibleCount+" unique eligible questions · "+
      Math.min(evidenceCount,preview.length)+" previewed · "+
      sourceAttempts.filter(a=>a.frozen.snapshot.examId===evidenceExam).length+
      " completed source attempts. Reused questions and repeated exposure are not independent difficulty-adjusted evidence.";
    const button=root.querySelector<HTMLButtonElement>("#learning-build-evidence");
    if(button){
      button.disabled=!evidenceReasons.length||evidenceCount<1||evidenceCount>assembled.eligibleCount;
      button.textContent="Start targeted revision ("+Math.min(evidenceCount,assembled.eligibleCount)+")";
    }
  };
  root.querySelectorAll<HTMLInputElement>("[data-evidence-reason]").forEach(el=>el.onchange=()=>{
    const reason=el.dataset.evidenceReason as RevisionReason;
    evidenceReasons=el.checked?[...evidenceReasons,reason]:
      evidenceReasons.filter(x=>x!==reason);
    draw();
  });
  root.querySelector<HTMLButtonElement>("#learning-build-evidence")!.onclick=async()=>{
    const button=root.querySelector<HTMLButtonElement>("#learning-build-evidence")!;
    button.disabled=true;
    try{
      const chosen=revisionTake(assembled,evidenceCount);
      const provenance:RevisionSelectionProvenance={schema:1,examId:evidenceExam,
        reasons:[...evidenceReasons],eligibleCount:assembled.eligibleCount,
        selectedQuestionIds:chosen.map(x=>x.questionId)};
      const ok=await host.startRevision(chosen.map(x=>x.card),provenance);
      if(!ok){message="Targeted revision could not be durably saved. Verify storage and retry.";draw();}
    }catch(error){message=error instanceof Error?error.message:"Cannot assemble revision";draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-close")!.onclick=host.close;
  root.querySelector<HTMLButtonElement>("#learning-test")!.onclick=async()=>{
    const button=root.querySelector<HTMLButtonElement>("#learning-test");
    if(button)button.disabled=true;
    const ok=await host.startRevision(candidates);
    if(!ok){message="Revision exam was not saved. Check storage and retry.";draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-due")!.onclick=()=>{
    reviewId=dueCards()[0]?.id??null;revealed=false;revealedStartedAt=null;message="";draw();
  };
  root.querySelector<HTMLSelectElement>("#learning-filter")!.onchange=e=>{
    filter=(e.target as HTMLSelectElement).value as typeof filter;draw();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-learning-id]").forEach(b=>b.onclick=()=>{
    selectedId=b.dataset.learningId??null;draw();
  });
  if(!selected)return;
  const captureNotebook=()=>{
    const value:NotebookDraft={
      note:root.querySelector<HTMLTextAreaElement>("#learning-note")!.value,
      customSubject:root.querySelector<HTMLInputElement>("#learning-subject")!.value,
      customTopic:root.querySelector<HTMLInputElement>("#learning-topic")!.value,
      customSubtopic:root.querySelector<HTMLInputElement>("#learning-subtopic")!.value,
      syllabusTopicId:root.querySelector<HTMLSelectElement>("#learning-syllabus")?.value??"",
      errorLabel:root.querySelector<HTMLSelectElement>("#learning-error")!.value,
      bookmarked:root.querySelector<HTMLInputElement>("#learning-bookmark")!.checked,
      revisionDisposition:root.querySelector<HTMLInputElement>("#learning-suspend")!.checked?"suspended":"active"
    };
    notebookDrafts.set(selected.id,value);
    const button=root.querySelector<HTMLButtonElement>("#learning-save");
    if(button)button.textContent="Save note · unsaved changes";
  };
  for(const id of ["learning-note","learning-topic","learning-subtopic"])
    (root.querySelector<HTMLInputElement|HTMLTextAreaElement>("#"+id)!).oninput=captureNotebook;
  root.querySelector<HTMLInputElement>("#learning-subject")!.oninput=()=>{
    if(root.querySelector<HTMLInputElement>("#learning-subject")!.value.trim()){
      const heading=root.querySelector<HTMLSelectElement>("#learning-syllabus");
      if(heading)heading.value="";
    }
    captureNotebook();
  };
  const officialHeading=root.querySelector<HTMLSelectElement>("#learning-syllabus");
  if(officialHeading)officialHeading.onchange=()=>{
    if(officialHeading.value)root.querySelector<HTMLInputElement>("#learning-subject")!.value="";
    captureNotebook();
  };
  for(const id of ["learning-error","learning-bookmark","learning-suspend"]){
    const field=root.querySelector<HTMLInputElement|HTMLSelectElement>("#"+id);
    if(field)field.onchange=captureNotebook;
  }
  root.querySelector<HTMLButtonElement>("#learning-save")!.onclick=async()=>{
    try{
      const note=root.querySelector<HTMLTextAreaElement>("#learning-note")!.value;
      const customSubject=root.querySelector<HTMLInputElement>("#learning-subject")!.value.trim();
      const customTopic=root.querySelector<HTMLInputElement>("#learning-topic")!.value.trim();
      const customSubtopic=root.querySelector<HTMLInputElement>("#learning-subtopic")!.value.trim();
      const syllabusTopicId=root.querySelector<HTMLSelectElement>("#learning-syllabus")?.value||undefined;
      const errorLabel=root.querySelector<HTMLSelectElement>("#learning-error")!.value as ErrorLabel|"";
      const bookmarked=root.querySelector<HTMLInputElement>("#learning-bookmark")!.checked;
      const revisionDisposition=root.querySelector<HTMLInputElement>("#learning-suspend")!.checked?"suspended" as const:"active" as const;
      if(!await host.save(validateLearningCard({...selected,note,customSubject,customTopic,customSubtopic,
         ...(syllabusForExam(selected.examId)?{syllabusTopicId}:{}),errorLabel:errorLabel||null,
         bookmarked,revisionDisposition,updatedAt:now().toISOString()}))){
        message="Notebook changes could not be durably saved. Export a recovery backup.";draw();return;
      }
      notebookDrafts.delete(selected.id);
      message="Notebook saved.";draw();
    }catch(e){message=e instanceof Error?e.message:"Cannot save notebook";draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-one")!.onclick=()=>{
    reviewId=selected.id;revealed=false;revealedStartedAt=null;message="";draw();
  };
  root.querySelector<HTMLButtonElement>("#learning-delete")!.onclick=async()=>{
    await host.remove(selected.id);
    if(!host.cards().some(c=>c.id===selected.id))notebookDrafts.delete(selected.id);
    selectedId=null;draw();
  };
 }
 void createRevisionScheduler(revisionSchedulerOptions(revisionSettings))
.then(value=>{scheduler=value;cache.clear();draw();})
  .catch(async e=>{
    console.error(e);
    try{
      revisionSettings=DEFAULT_REVISION_SETTINGS;scheduler=await createRevisionScheduler(revisionSchedulerOptions(revisionSettings));
      cache.clear();message="Saved FSRS settings were invalid; safe defaults were restored.";draw();
    }catch(fallback){message="FSRS scheduler failed to initialize.";console.error(fallback);draw();}
  });
 return {show(){opened=true;draw();},hide(){opened=false;previousLearningView="";},
  select(id:string){selectedId=id;},
   dispose(){optimizerRun?.cancel();optimizerRun=null;closed=true;previousLearningView="";notebookDrafts.clear();}};
}
