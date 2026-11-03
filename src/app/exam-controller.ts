/** P47-6 module: exam-controller.ts */
import {escapeText} from "./html-escape.ts";
import {minutes,readablePracticeMode,examTimeRemaining,renderModelExam} from "./exam-view.ts";
import {validateGenericStoredRecord,isAttempt,isPackage,isLearning,type RecordItem} from "./stored-record-validator.ts";
import {frozenReviewMedia,sourceReviewHTML} from "./review-media-view.ts";
import {renderAuthoredText} from "./question-content-view.ts";
import { builtinCglPackages, configureCglPractice, configureUntimedPractice, validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "./exam-package.ts";
import type { ExamPackage, GenericAttempt, CglPracticeMode } from "./exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { QuestionRevisionId,OptionId } from "../domain/ids.js";
import type { SessionEvent } from "../engine/session.ts";
import { restoreSession, chooseRecovered } from "../history/frozen.ts";
import { createSessionClock } from "../engine/clock.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { manualGradeLimit, manualGradeSummary, setManualGrade } from "../engine/manual-grading.ts";
import { createSourceKeyReference,sourceKeyScore } from "../engine/source-comparison.ts";
import { composePracticeSet,practiceInventory } from "./practice-compose.ts";
import { createSourceReviewReference } from "../engine/review-source.ts";
import { scoreableMaximum, scoreableLowerBound, sectionScoreSummaries } from "../engine/score-ceiling.ts";
import { serializeVerifiedBackup, verifyBackup, planBackupMerge } from "../history/backup.ts";
import { assertWriteVersion, nextWriteVersion } from "../history/concurrency.ts";
import { assertDeletionAllowed, deletionWarning, type DeletionIntent } from "../history/deletion-policy.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import { createLearningDesk } from "./learning-ui.ts";
import { makeRevisionPackage,createNotebookLineage } from "../learning/revision-test.ts";
import { questionSpeed } from "../learning/question-analytics.ts";
import { historyHTML,historyRowsHTML,healthSummary,type StorageHealth } from "./history-page.ts";
import {DEFAULT_HISTORY_QUERY,restoreHistoryQuery,filteredHistory,historyQueryError,activeHistoryFilterCount,type HistoryQuery} from "./history-query.ts";
import {backupDownload,readBackupFile} from "../history/backup-file.ts";
import {SHARED_DB_NAME,ATTEMPTS_STORE,SNAPSHOTS_STORE,compactAttempt,expandAttempt,
 isSharedAttempt,verifiedSnapshot,reconstructRecords,pruneSharedSnapshots} from "../history/shared-store.ts";
import type {SharedSnapshot,SlimAttempt} from "../history/shared-store.ts";
import { frozenScoreSummary } from "./history-score.ts";
import { editorialStatusLabel } from "./editorial-labels.ts";
import { multipleDraftMessage,duplicateMatchingTargets } from "./response-drafts.ts";
import { examPreflight,preflightHTML,examRulesHTML } from "./exam-preflight.ts";
import { reviewMatch, reviewFiltersHTML, resultTabsHTML, timingLedgerHTML, resultInsightsHTML, type ResultTab, type ReviewFilter } from "./result-presentation.ts";
import { addLearningCard } from "../learning/learning.ts";
import type { LearningCard } from "../learning/learning.ts";
import { readDisplayPreferences, writeDisplayPreferences, SETTINGS_EVENT } from "./preferences.ts";
import { readPracticeSetups,writePracticeSetups,type PracticeSetups } from "./practice-selection.ts";
import { examFamilyCatalog,familyIdFor,pairedEdition,BUILTIN_CGL_FAMILY } from "./exam-families.ts";
import { importAuthoredExam, APFC_NAT_BANK_TEMPLATE } from "./bank-import.ts";
import { createScreenRenderer } from "./screen-renderer.ts";
import { createImageViewer } from "./image-viewer.ts";
import { createImagePreparation } from "./image-preparation.ts";
import { createQuestionAuthoringStudio } from "../authoring/authoring-studio.ts";
import { resolveExamShortcut } from "./exam-shortcuts.ts";
import { createNativeRouter, type AppRoute, type RouteContext, type NativeRouter } from "./navigation.ts";
import type {CoordinatorContext} from "./coordinator-context.ts";

export function renderCurrentExamHTML(owner:CoordinatorContext):string {
   if(!owner.attempt)return "";
   const qid=owner.attempt.frozen.paper.sections[owner.attempt.state.sectionIndex]
     ?.questionRevisionIds[owner.attempt.state.questionIndex];
   const draft=qid?owner.choiceDrafts.get(owner.attempt.id+"|"+qid):undefined;
   return renderModelExam(owner.attempt,owner.packageForAttempt(owner.attempt),owner.warning,draft,{
     focused:Boolean(document.fullscreenElement||
       document.documentElement.classList.contains("immersive"))
   });
 }

export const dispatchExamEvent=(owner:CoordinatorContext,event:SessionEvent)=>{
   if(!owner.attempt||owner.storageFault)return;
   try{
     const ids=new Map(owner.attempt.frozen.questions.map(q=>[q.id,q]));
     const before=owner.attempt;
     owner.attempt=transitionGenericAttempt(owner.attempt,event,ids);
     if(owner.attempt!==before)void owner.save(owner.attempt);
     if(owner.attempt.finishedAt!==null){
       owner.reviewFilter="all";owner.go({screen:"result",attemptId:owner.attempt.id,tab:"overview"},"replace");return;
     }
     owner.warning="";
   }catch(error){owner.warning=error instanceof Error?error.message:"Invalid response";}
   owner.draw();
 };

export function bindExamScreen(owner:CoordinatorContext):void{
owner.root.querySelector<HTMLButtonElement>("#g-exam-full")!.onclick=()=>
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));
const section=owner.attempt!.frozen.paper.sections[owner.attempt!.state.sectionIndex];
const q=owner.attempt!.frozen.questions.find(x=>x.id===section?.questionRevisionIds[owner.attempt!.state.questionIndex]);
if(!q)return;
owner.root.querySelectorAll<HTMLInputElement>("[data-choice]").forEach(input=>input.onchange=()=>{
     if(q.content.kind==="single-choice"){
       const option=q.content.options.find(x=>x.id===input.dataset.choice);
       if(!option){owner.notice("Unknown question option.");return;}
       owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"single-choice",optionId:option.id}});
     }else if(q.content.kind==="multiple-select"){
       const raw=[...owner.root.querySelectorAll<HTMLInputElement>("[data-choice]:checked")].map(x=>x.dataset.choice);
       const chosen=q.content.options.filter(option=>raw.includes(option.id)).map(option=>option.id);
       if(raw.length!==chosen.length){owner.notice("Unknown question option.");return;}
       const draftKey=owner.attempt!.id+"|"+q.id;
       const min=q.content.minSelections??1,max=q.content.maxSelections;
       const message=chosen.length?multipleDraftMessage(chosen.length,min,max):"";
       if(message){
         // Preserve the visible draft while clearing any previously committed
         // response. A half-edited old answer must not silently count as saved.
         owner.choiceDrafts.set(draftKey,{questionId:q.id,optionIds:chosen,message});
         owner.dispatch({type:"CLEAR",nowMs:owner.now()});
       }else{
         owner.choiceDrafts.delete(draftKey);
         owner.dispatch(!chosen.length?{type:"CLEAR",nowMs:owner.now()}:
           {type:"ANSWER",nowMs:owner.now(),response:{kind:"multiple-select",optionIds:chosen}});
       }
     }
   });
owner.root.querySelectorAll<HTMLInputElement>("[data-bool]").forEach(input=>input.onchange=()=>{
     owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"true-false",value:input.dataset.bool==="true"}});
   });
const saveButton=owner.root.querySelector<HTMLButtonElement>("#g-save");
if(q.content.kind==="matching"&&saveButton){
     const matching=q.content;
     const controls=[...owner.root.querySelectorAll<HTMLSelectElement>("[data-match]")];
     const feedback=owner.root.querySelector<HTMLElement>("#g-match-feedback");
     const updateConflicts=(dirty:boolean):readonly string[]=>{
       const duplicates=duplicateMatchingTargets(controls.map(control=>control.value));
       for(const control of controls){
         const conflict=Boolean(control.value&&duplicates.includes(control.value));
         control.classList.toggle("match-conflict",conflict);
         if(conflict){
           control.setAttribute("aria-invalid","true");
           control.setAttribute("aria-describedby","g-match-feedback");
         }else{
           control.removeAttribute("aria-invalid");
           control.removeAttribute("aria-describedby");
         }
       }
       saveButton.disabled=duplicates.length>0;
       if(feedback){
         const labels=duplicates.map(id=>matching.rightItems.find(item=>item.id===id)?.text??id);
         feedback.textContent=duplicates.length?
           "Conflicting matches: "+labels.join(", ")+
           " selected for multiple left items. Each right option may be used once; correct the highlighted rows before saving.":
           dirty?"Matching changes not yet saved. Select Save matches to commit.":"";
       }
       return duplicates;
     };
     controls.forEach(control=>control.onchange=()=>{updateConflicts(true);});
     updateConflicts(false);
   }
if(saveButton)saveButton.onclick=()=>{
     if(q.content.kind==="numeric-entry"){
       const field=owner.root.querySelector<HTMLInputElement>("#g-number")!;
       if(!field.value||!Number.isFinite(field.valueAsNumber)){owner.notice("Enter a finite numeric answer.");return;}
       owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"numeric-entry",value:field.valueAsNumber}});
     }else if(q.content.kind==="free-response"){
       const value=owner.root.querySelector<HTMLTextAreaElement>("#g-text")!.value;
       owner.dispatch(value.trim()?{type:"ANSWER",nowMs:owner.now(),response:{kind:"free-response",text:value}}:{type:"CLEAR",nowMs:owner.now()});
     }else if(q.content.kind==="matching"){
       const matching=q.content;
       const controls=[...owner.root.querySelectorAll<HTMLSelectElement>("[data-match]")];
       const duplicate=duplicateMatchingTargets(controls.map(control=>control.value));
       if(duplicate.length){
         owner.notice("Conflicting right-side matches must be corrected before saving.");return;
       }
       const pairs=controls.filter(x=>x.value)
         .map(x=>{
           const left=matching.leftItems.find(item=>item.id===x.dataset.match);
           const right=matching.rightItems.find(item=>item.id===x.value);
           return left&&right?{leftId:left.id,rightId:right.id}:null;
         });
       if(pairs.some(x=>x===null)){owner.notice("Unknown matching option.");return;}
       const validPairs=pairs.filter((pair):pair is NonNullable<typeof pair>=>pair!==null);
       owner.dispatch(validPairs.length?{type:"ANSWER",nowMs:owner.now(),response:{kind:"matching",pairs:validPairs}}:{type:"CLEAR",nowMs:owner.now()});
     }
   };
owner.root.querySelector<HTMLButtonElement>("#g-clear")!.onclick=()=>owner.dispatch({type:"CLEAR",nowMs:owner.now()});
owner.root.querySelector<HTMLButtonElement>("#g-flag")!.onclick=()=>owner.dispatch({type:"FLAG",nowMs:owner.now(),
     flagged:!owner.attempt!.state.responses.find(r=>r.questionRevisionId===q.id)?.flagged});
const navigate=(s:number,i:number)=>owner.dispatch({type:"NAVIGATE",nowMs:owner.now(),sectionIndex:s,questionIndex:i});
owner.root.querySelector<HTMLButtonElement>("#g-prev")!.onclick=()=>navigate(owner.attempt!.state.sectionIndex,owner.attempt!.state.questionIndex-1);
owner.root.querySelector<HTMLButtonElement>("#g-next")!.onclick=()=>navigate(owner.attempt!.state.sectionIndex,owner.attempt!.state.questionIndex+1);
owner.root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach(b=>b.onclick=()=>navigate(owner.attempt!.state.sectionIndex,Number(b.dataset.q)));
owner.root.querySelectorAll<HTMLButtonElement>("[data-section]").forEach(b=>b.onclick=()=>navigate(Number(b.dataset.section),0));
const pause=owner.root.querySelector<HTMLButtonElement>("#g-pause");
if(pause)pause.onclick=()=>owner.dispatch({type:owner.attempt!.state.status==="paused"?"RESUME":"PAUSE",nowMs:owner.now()});
owner.root.querySelector<HTMLButtonElement>("#g-submit")!.onclick=()=>{
     const p=owner.attempt!.frozen.paper, st=owner.attempt!.state;
     const sectional=p.timing.kind==="sectional";
     const lockedWhole=p.timing.kind!=="sectional"&&p.navigation.sectionNavigation==="sequential-locked";
     const continuing=(sectional||lockedWhole)&&st.sectionIndex<p.sections.length-1;
     const expired=st.status==="section-expired";
     if(!expired&&!confirm(continuing?"Close this section and advance? You cannot return.":"Submit this exam and view results?"))return;
     owner.dispatch({type:sectional||continuing?"SUBMIT_SECTION":"SUBMIT_ATTEMPT",nowMs:owner.now()});
   };
}
