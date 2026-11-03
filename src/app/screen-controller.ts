/** P47-6 module: screen-controller.ts */
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
import {bindHistoryScreen} from "./history-controller.ts";
import {bindLibraryScreen} from "./library-controller.ts";
import {bindResultScreen} from "./result-controller.ts";
import {bindExamScreen} from "./exam-controller.ts";
export const reportWorkspaceNotice=(owner:CoordinatorContext,s:string)=>{owner.warning=s;owner.draw();};

export function drawWorkspaceScreen(owner:CoordinatorContext,):void{
   if(owner.disposed)return;
   owner.imageViewer.beforeRender();owner.imagePreparation.beforeRender();owner.authoringStudio.beforeRender();
   const currentSection=owner.attempt?.frozen.paper.sections[owner.attempt.state.sectionIndex];
   const currentQuestion=owner.attempt?.state.questionIndex;
   const screenKey=owner.view==="exam"?
     "exam|"+owner.attempt?.id+"|"+owner.attempt?.state.sectionIndex+"|"+currentQuestion:
     owner.view==="result"?"result|"+owner.attempt?.id+"|"+owner.resultTab:owner.view;
   const announcement=owner.view==="exam"?
     "Exam. "+(currentSection?.title??"Section")+", question "+((currentQuestion??0)+1)+
       " of "+(currentSection?.questionRevisionIds.length??0)+".":
     owner.view==="result"?"Results. "+(owner.resultTab==="overview"?"Performance overview":
       owner.resultTab==="review"?"Question review":"Question timing ledger")+".": 
     owner.view==="history"?"History and insights.":
     owner.view==="learning"?"Learning and spaced revision.":"Test library.";
   owner.screenRenderer.render({
     screen:owner.view,screenKey,announcement,resultPane:owner.resultTab,
     html:()=>owner.view==="library"?owner.listHTML():owner.view==="history"?
       historyHTML([...owner.records.values()].filter(isAttempt),owner.packages,
         owner.historyQuery,
         owner.loading,owner.fallbackConflict||owner.storageFault,owner.warning,owner.db?"indexeddb":"fallback",owner.storageSnapshot()):
       owner.view==="exam"?owner.examHTML():owner.resultHTML()
   },owner.learningDesk);
   if(owner.view==="learning")return;
   if(owner.view==="history"){bindHistoryScreen(owner);return;}
   if(owner.view==="library"){bindLibraryScreen(owner);return;}
   owner.root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>{
     if(owner.view==="exam"&&owner.attempt?.finishedAt===null){
       if(!confirm("Return to library? Your test timer will keep running and the attempt can be resumed."))return;
     }
     owner.go({screen:"library"});
   };
   if(owner.view==="result"&&owner.attempt){bindResultScreen(owner);return;}
   if(owner.view!=="exam"||!owner.attempt)return;
   bindExamScreen(owner);
 }
