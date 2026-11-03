/** P47-6 module: learning-controller.ts */
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

export const addLearningNotebookCard=(owner:CoordinatorContext,source:GenericAttempt,id:string):void=>{
   if(owner.records.has("learning-card:"+id))return;
   try{
     const record=addLearningCard(source,id as QuestionRevisionId,new Date(owner.now()).toISOString());
     void owner.save(record).then(ok=>{if(ok){owner.warning="Question added to the notebook.";owner.draw();}});
   }catch(error){owner.notice(error instanceof Error?error.message:"Unable to add notebook card");}
 };

export const addLearningResultCards=async (owner:CoordinatorContext,source:GenericAttempt):Promise<void>=>{
   const ids=source.result?.items.filter(item=>item.verdict==="incorrect"||item.verdict==="unanswered")
     .map(item=>item.questionRevisionId).filter(id=>!owner.records.has("learning-card:"+id))??[];
   let saved=0;
   for(const id of ids){
     if(!await owner.save(addLearningCard(source,id,new Date(owner.now()).toISOString())))break;
     saved++;
   }
   if(!owner.storageFault)owner.warning=saved?saved+" mistake/skipped cards saved to the revision notebook.":"All mistakes/skips are already in the notebook.";
   owner.draw();
 };

export function createWorkspaceLearningDesk(owner:CoordinatorContext):ReturnType<typeof createLearningDesk>{return createLearningDesk(owner.root,{
   cards:()=>[...owner.records.values()].filter(isLearning),
   attempts:()=>[...owner.records.values()].filter(isAttempt),
   save:(item)=>owner.save(item),
   remove:(id)=>owner.removeSavedAttempt(id,"learning-card"),
   startRevision:async (selected,selection)=>{
     if(owner.storageFault||owner.fallbackConflict||owner.loading){owner.notice("Storage unavailable; cannot start a revision exam.");return false;}
     try{
       const nonce=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "revision-"+owner.now()+"-"+Math.floor(Math.random()*100000);
       const paper=makeRevisionPackage(selected,nonce);
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "attempt-"+owner.now()+"-"+Math.floor(Math.random()*100000);
       const generated={...startGenericAttempt(paper,id,owner.now()),notebookLineage:createNotebookLineage(selected,selection)};
       if(!await owner.save(generated))return false;
       owner.attempt=generated;owner.freshlyStartedAttemptId=generated.id;
       owner.warning="Untimed notebook revision · +1 correct, 0 incorrect. This is not a source-exam score.";
       owner.go({screen:"exam",attemptId:generated.id});return true;
     }catch(error){owner.notice(error instanceof Error?error.message:"Cannot create revision test");return false;}
   },
   close:()=>owner.go({screen:"library"})
 });}
