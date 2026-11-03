/** P47-6 module: authoring-controller.ts */
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

export function createWorkspaceAuthoringStudio(owner:CoordinatorContext):ReturnType<typeof createQuestionAuthoringStudio>{return createQuestionAuthoringStudio({
   existing:()=>[...owner.packages.values()],
   publish:async bundle=>{
     const signed=validateExamPackage(bundle);
     if(owner.loading||owner.fallbackConflict||owner.storageFault)
       throw Error("Library storage is not ready or another tab has changed it. Reopen before publishing.");
     if(owner.packages.has(signed.paper.id)||owner.records.has("generic-package:"+signed.paper.id))
       throw Error("This exact paper edition and revision is already published. Increase Revision rather than overwriting it.");
     // A newly published item uses the SAME source-validated, compare-and-save
     // path as ordinary imported papers. No separate mutable publication store.
     const persisted=await owner.save({recordType:"generic-package",
       id:"generic-package:"+signed.paper.id,bundle:signed});
     if(!persisted)throw Error("The authenticated paper could not be committed; no new edition is available.");
     owner.packages.set(signed.paper.id,signed);
     owner.applyFamily(familyIdFor(signed,owner.builtinPaperIds));
     owner.choice=signed.paper.id;owner.singleSection=0;
     if(signed.paper.edition==="source"||signed.paper.edition==="reviewed")
       owner.editionView=signed.paper.edition;
     owner.saveSelection();
     owner.warning="Published "+signed.questions.length+" user-authored questions as a new immutable "+
       signed.paper.edition+" revision. The paper is ready to practise; existing attempts are unchanged.";
     owner.draw();
   }
 });}
