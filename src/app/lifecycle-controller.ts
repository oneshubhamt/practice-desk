/** P47-6 module: lifecycle-controller.ts */
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

export function dispatchWorkspaceVisibility(owner:CoordinatorContext,visible:boolean):void{
   if(!owner.attempt||owner.storageFault||owner.attempt.finishedAt!==null)return;
   const current=owner.attempt;
   owner.attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:owner.now(),visible},
     new Map(current.frozen.questions.map(q=>[q.id,q])));
   void owner.save(owner.attempt);
   if(owner.attempt.finishedAt!==null&&owner.view==="exam"){
     owner.reviewFilter="all";owner.go({screen:"result",attemptId:owner.attempt.id,tab:"overview"},"replace");return;
   }
   owner.draw();
 }

export function disposeWorkspace(owner:CoordinatorContext){owner.imageViewer.dispose();owner.imagePreparation.dispose();owner.authoringStudio.dispose();owner.router.dispose();owner.learningDesk.dispose();owner.disposed=true;window.clearInterval(owner.timer);document.removeEventListener("visibilitychange",owner.visibility);
   window.removeEventListener("pagehide",owner.pagehide);window.removeEventListener("storage",owner.storage);
   window.removeEventListener("keydown",owner.keyboard);void owner.writeQueue.finally(()=>owner.db?.close());owner.root.classList.remove("generic-workspace");}

export const handleWorkspaceVisibility=(owner:CoordinatorContext)=>{
   if(!owner.attempt||owner.attempt.finishedAt!==null||owner.storageFault)return;
   owner.dispatchVisibility(owner.view==="exam"&&!document.hidden);
 };

export const handleWorkspaceKeyboard=(owner:CoordinatorContext,event:KeyboardEvent)=>{
   if(owner.disposed||owner.view!=="exam"||!owner.attempt||owner.attempt.finishedAt!==null||
      (owner.attempt.state.status!=="running"&&owner.attempt.state.status!=="paused")||document.hidden||
      event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
   const focused=event.target;
   const focusedRadio=focused instanceof HTMLInputElement&&focused.type==="radio"&&
     owner.root.contains(focused)&&(focused.name==="generic-answer"||focused.name==="generic-boolean");
   const editable=focused instanceof HTMLElement&&(
     focused.isContentEditable||Boolean(focused.closest('[contenteditable="true"]'))||
     focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement||
     (focused instanceof HTMLInputElement&&!focusedRadio));
   const displayPanel=document.getElementById("displayPanel");
   const command=resolveExamShortcut({key:event.key,alt:event.altKey,repeat:event.repeat,
     paused:owner.attempt.state.status==="paused",focusedRadio,editable,
     blocked:owner.imageViewer.isOpen()||Boolean(document.querySelector("dialog[open]"))||
       Boolean(displayPanel&&!displayPanel.hidden),
     allowFlagging:owner.attempt.frozen.paper.navigation.allowFlagging});
   if(!command)return;
   if(command.kind==="navigate"){
     event.preventDefault();
     const target=owner.attempt.state.questionIndex+command.delta;
     const section=owner.attempt.frozen.paper.sections[owner.attempt.state.sectionIndex];
     if(!section?.questionRevisionIds[target]||
       (command.delta<0&&owner.attempt.frozen.paper.navigation.questionNavigation==="forward-only"))return;
     owner.dispatch({type:"NAVIGATE",nowMs:owner.now(),sectionIndex:owner.attempt.state.sectionIndex,questionIndex:target});return;
   }
   if(command.kind==="fullscreen"){
     event.preventDefault();window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));return;
   }
   if(command.kind==="flag"){
     event.preventDefault();
     const id=owner.attempt.frozen.paper.sections[owner.attempt.state.sectionIndex]!
       .questionRevisionIds[owner.attempt.state.questionIndex]!;
     const marked=owner.attempt.state.responses.find(r=>r.questionRevisionId===id)?.flagged??false;
     owner.dispatch({type:"FLAG",nowMs:owner.now(),flagged:!marked});return;
   }
   const id=owner.attempt.frozen.paper.sections[owner.attempt.state.sectionIndex]!
     .questionRevisionIds[owner.attempt.state.questionIndex]!;
   const question=owner.attempt.frozen.questions.find(q=>q.id===id);
   if(question?.content.kind!=="single-choice")return;
   const option=question.content.options[command.index];if(!option)return;
   event.preventDefault();
   owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"single-choice",optionId:option.id}});
 };

export const checkpointWorkspacePagehide=(owner:CoordinatorContext)=>{
   if(owner.attempt&&owner.attempt.finishedAt===null&&!owner.storageFault){
     try{
       const current=owner.attempt;
       owner.attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:owner.now(),visible:false},
         new Map(current.frozen.questions.map(q=>[q.id,q])));
       owner.writeMirror(owner.attempt);
       void owner.save(owner.attempt);
     }catch(error){console.warn("Pagehide checkpoint failed",error);}
   }
 };

export const detectConcurrentStorageChange=(owner:CoordinatorContext,event:StorageEvent)=>{
   if(owner.db||event.key!==owner.storageKey||event.newValue===owner.fallbackStamp)return;
   owner.fallbackConflict=true;
   owner.warning="Fallback history changed in another tab. Reopen the file before continuing.";
   owner.recordStorageFailure(new Error("Concurrent fallback history change detected; writes blocked"));
   owner.attempt=null;owner.go({screen:"library"},"replace");
   if(!owner.disposed)owner.draw();
 };

export function startWorkspaceTimer(owner:CoordinatorContext):number{return window.setInterval(()=>{
   // Time limits still elapse outside exam view, but hidden/library time is
   // not charged to the last foreground question.
   if(owner.disposed||owner.storageFault||!owner.attempt||owner.attempt.finishedAt!==null||
      (owner.attempt.state.status==="paused"||owner.attempt.state.status==="section-expired"))return;
   const original=owner.attempt;
   const next=transitionGenericAttempt(original,{type:"TICK",nowMs:owner.now()},
     new Map(original.frozen.questions.map(q=>[q.id,q])));
   if(next!==original){
     owner.attempt=next;
     const changedSection=original.state.sectionIndex!==next.state.sectionIndex;
     if(next.finishedAt!==null||changedSection||original.state.status!==next.state.status||
       (owner.view==="exam"&&owner.now()-owner.lastTimerSave>=10000)){
       void owner.save(owner.attempt);owner.lastTimerSave=owner.now();
     }
     if(next.finishedAt!==null){
       if(owner.view==="exam"){
         owner.reviewFilter="all";owner.go({screen:"result",attemptId:owner.attempt.id,tab:"overview"},"replace");
       }else owner.draw();
       return;
     }
     if((changedSection||original.state.status!==next.state.status)&&owner.view==="exam"){owner.draw();return;}
   }
   if(owner.view==="exam"){
     const el=owner.root.querySelector("#g-timer");
     if(el&&owner.attempt){const time=examTimeRemaining(owner.attempt.frozen.paper,owner.attempt.state);
       el.textContent=time===null?"Untimed":minutes(time);}
   }
 },1000);}
