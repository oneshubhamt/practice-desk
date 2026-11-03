/** P47-6 module: route-controller.ts */
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

export async function activateWorkspaceRoute(owner:CoordinatorContext,target:AppRoute,ctx:RouteContext):Promise<void>{
   const requested=++owner.activationGeneration;
   if(!owner.routeHydrated)await owner.hydration;
   if(owner.disposed||ctx.signal?.aborted||requested!==owner.activationGeneration)return;
   const prevView=owner.view;
   const previousTab=owner.resultTab;
   const previousAttempt=owner.attempt;
   // Traversals cannot reliably be canceled. Checkpoint first, then display
   // the destination; question/answer changes never create URL entries.
   const leavesExam=prevView==="exam"&&previousAttempt?.finishedAt===null&&
     !(target.screen==="exam"&&target.attemptId===previousAttempt.id);
   if(leavesExam){
     try{
       const next=transitionGenericAttempt(previousAttempt,{
         type:"VISIBILITY",nowMs:owner.now(),visible:false},
         new Map(previousAttempt.frozen.questions.map(q=>[q.id,q])));
       owner.attempt=next;
       if(next!==previousAttempt)await owner.save(next);
     }catch(error){
       owner.warning="Unable to checkpoint the test before leaving: "+
         (error instanceof Error?error.message:"Unknown error");
     }
     if(owner.disposed||ctx.signal?.aborted||requested!==owner.activationGeneration)return;
   }
   if(target.screen==="exam"||target.screen==="result"){
     const saved=owner.records.get(target.attemptId);
     if(!isAttempt(saved)){
       owner.warning="The requested attempt is unavailable or has been deleted. Open a saved attempt from the library.";
       owner.go({screen:"library"},"replace");return;
     }
     if(target.screen==="exam"&&saved.finishedAt!==null){
       owner.go({screen:"result",attemptId:saved.id,tab:"overview"},"replace");return;
     }
     if(target.screen==="result"&&saved.finishedAt===null){
       owner.go({screen:"exam",attemptId:saved.id},"replace");return;
     }
     if(target.screen==="result"&&target.tab==="review"&&
         saved.frozen.paper.navigation.allowReview===false){
       owner.go({screen:"result",attemptId:saved.id,tab:"overview"},"replace");return;
     }
     const fresh=target.screen==="exam"&&saved.id===owner.freshlyStartedAttemptId;
     if(fresh)owner.freshlyStartedAttemptId=null;
     const switching=!fresh&&(owner.attempt?.id!==saved.id||prevView!=="exam");
     owner.attempt=saved;
     if(target.screen==="exam"&&switching){
       const restored=restoreSession(saved.frozen.paper,saved.state,owner.now(),!document.hidden);
       owner.attempt={...saved,state:restored.state,
         ...(restored.expired?{finishedAt:owner.now(),completionReason:"time-expired" as const,
           result:scoreAttempt(saved.frozen.paper,saved.frozen.key,
             saved.frozen.questions,restored.state.responses,new Date().toISOString())}:{})};
       if(owner.attempt!==saved)void owner.save(owner.attempt);
       if(owner.attempt.finishedAt!==null){
         owner.go({screen:"result",attemptId:owner.attempt.id,tab:"overview"},"replace");return;
       }
     }
     if(target.screen==="result"){
       if(owner.attempt.id!==previousAttempt?.id||prevView!=="result")owner.reviewFilter="all";
       owner.resultTab=target.tab;
     }
   }
   owner.view=target.screen;
   if(owner.disposed||ctx.signal?.aborted||requested!==owner.activationGeneration)return;
   owner.draw();
   if(ctx.kind!=="initial"&&(prevView!==owner.view||
      (owner.view==="result"&&owner.resultTab!==previousTab))) {
     window.scrollTo({top:0,behavior:"instant"});
   }
 }

export const navigateWorkspace=(owner:CoordinatorContext,target:AppRoute,history:"push"|"replace"="push"):void=>{
   void owner.router.navigate(target,history).catch(error=>{
     owner.warning=error instanceof Error?"Navigation failed: "+error.message:"Navigation failed";
     if(!owner.disposed)owner.draw();
   });
 };
