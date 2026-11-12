/** Composition-root workspace contract. Feature controllers consume explicit capability slices,
 * so cross-feature access is enforced by TypeScript rather than convention.
 */


import {type RecordItem} from "./stored-record-validator.ts";

import type {ExamPackage} from "../domain/exam-package.ts";
import type {CglPracticeMode} from "../workspace-settings.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {ExamCalculatorState} from "../domain/calculator.ts";

import type {OptionId} from "../domain/ids.js";
import type {SessionEvent} from "../engine/session.ts";

import {type DeletionIntent} from "../history/deletion-policy.ts";
import type {SourcePaperBank,ReviewPatchBank} from "../content/schema.js";

import type {StorageHealth} from "./storage-health.ts";
import {type HistoryQuery} from "./history-query.ts";


import type {WorkspaceStore} from "../history/workspace-store.ts";

import {type ResultTab,type ReviewFilter} from "./result-presentation.ts";

import {type PracticeSetups} from "./practice-selection.ts";

import {type AppRoute,type NativeRouter} from "./navigation.ts";
import type {ExamFamily} from "./exam-families.ts";
import type {PaperRevisionId} from "../domain/ids.ts";
import type {ScreenRenderer} from "./screen-renderer.ts";
import type {ImageViewer} from "./image-viewer.ts";
import type {ImagePreparation} from "./image-preparation.ts";
import type {AuthoringStudioController} from "../authoring/authoring-studio.ts";
export interface WorkspaceContext{
 activationGeneration:number;
 readonly addNotebookCard:(source: GenericAttempt, id: string) => void;
 readonly addResultCards:(source: GenericAttempt) => Promise<void>;
 readonly applyFamily:(id: string) => void;
 attempt:GenericAttempt | null;
 readonly authoringStudio:AuthoringStudioController;
 readonly builtinPaperIds:Set<PaperRevisionId>;
 readonly builtins:ExamPackage[];
 readonly calculatorStates:Map<string,ExamCalculatorState>;
 cglMode:CglPracticeMode;
 readonly changeHistoryQuery:(next: HistoryQuery, redraw?: boolean) => void;
 choice:string;
 readonly choiceDrafts:Map<string, { questionId: string; optionIds: OptionId[]; message: string; }>; 
 /** Unsaved self-assessment notes and marks are tab-local, never part of the frozen attempt. */
 readonly manualGradeDrafts:Map<string,{marks:string;note:string}>;
 composeCount:number;
 composeDifficulty:string;
 composeError:string;
 composeOpen:boolean;
 composePreview:string;
 composeSection:string;
 composeSeed:string;
 composeTopic:string;
 readonly deleteAllCompleted:() => Promise<void>;
 readonly dispatch:(event: SessionEvent) => void;
 readonly dispatchVisibility:(visible: boolean) => void;
 disposed:boolean;
 readonly downloadBackup:() => Promise<void>;
 readonly draw:() => void;
 editionView:"source" | "reviewed";
 readonly examHTML:() => string;
 fallbackConflict:boolean;
 readonly families:()=>ExamFamily[];
 freshlyStartedAttemptId:string | null;
 readonly go:(target: AppRoute, history?: "push" | "replace") => void;
 historyQuery:HistoryQuery;
 readonly historyQueryKey:string;
 readonly hydration:Promise<void>;
 hydrationDone:() => void;
 readonly imagePreparation:ImagePreparation;
 readonly imageViewer:ImageViewer;
 readonly importHistory:(file: File) => Promise<void>;
 readonly keyboard:(event: KeyboardEvent) => void;
 lastCommittedAt:number | null;
 lastStorageFailure:string | null;
 lastTimerSave:number;
 readonly learningDesk:{ show(): void; hide(): void; select(id: string): void; dispose(): void; };
 readonly listHTML:() => string;
 loading:boolean;
 readonly mirrorKey:string;
 readonly notice:(s: string) => void;
 readonly now:() => number;
 readonly openSaved:(id: string) => void;
 readonly packageForAttempt:(saved: GenericAttempt) => ExamPackage | undefined;
 readonly packages:Map<string, ExamPackage>;
 readonly pagehide:() => void;
 readonly patches:ReviewPatchBank;
 pendingWrites:number;
 readonly recordStorageFailure:(error: unknown) => void;
 readonly records:Map<string, RecordItem>;
 readonly removeSavedAttempt:(id: string, intent?: DeletionIntent) => Promise<void>;
 readonly requestPersistentStorage:() => Promise<void>;
 readonly resultHTML:() => string;
 resultTab:ResultTab;
 reviewFilter:ReviewFilter;
 readonly root:HTMLElement;
 routeHydrated:boolean;
 router:NativeRouter;
 readonly save:(record: RecordItem) => Promise<boolean>;
 readonly saveSelection:() => void;
 readonly screenRenderer:ScreenRenderer;
 selectedFamilyId:string;
 setups:PracticeSetups;
 readonly showStorageEstimate:() => Promise<void>;
 singleSection:number;
 readonly solutions:Readonly<Record<string, Readonly<Record<string, string>>>>;
 readonly sources:SourcePaperBank;
 readonly storage:(event: StorageEvent) => void;
 storageFault:boolean;
 storageBackend:WorkspaceStore | null;
 readonly storageSnapshot:() => StorageHealth;
 readonly storedSetups:PracticeSetups | null;
 readonly timer:number;
 untimedPractice:boolean;
 readonly updateStorageHealth:() => void;
 view:"result" | "exam" | "library" | "history" | "learning";
 readonly visibility:() => void;
 warning:string;
 readonly writeMirror:(record: GenericAttempt) => void;
 writeQueue:Promise<void>;
}


type Slice<K extends keyof WorkspaceContext>=Pick<WorkspaceContext,K>;

export type StorageHealthControllerContext=Slice<
 "fallbackConflict"|"lastCommittedAt"|"lastStorageFailure"|"loading"|"pendingWrites"|
 "records"|"root"|"storageFault"|"storageSnapshot"|"updateStorageHealth"
>;

export type AuthoringControllerContext=Slice<
 "applyFamily"|"builtinPaperIds"|"choice"|"disposed"|"draw"|
 "editionView"|"fallbackConflict"|"loading"|"packages"|"records"|"save"|
 "saveSelection"|"singleSection"|"storageFault"|"view"|"warning"
>;

export type LearningControllerContext=Slice<
 "attempt"|"draw"|"fallbackConflict"|"freshlyStartedAttemptId"|"go"|"loading"|
 "notice"|"now"|"records"|"removeSavedAttempt"|"root"|"save"|"storageFault"|"warning"
>;

export type ExamControllerContext=Slice<
 "attempt"|"calculatorStates"|"choiceDrafts"|"dispatch"|"draw"|"go"|"notice"|"now"|
 "packageForAttempt"|"reviewFilter"|"root"|"save"|"storageFault"|"warning"
>;

export type ResultControllerContext=Slice<
 "addNotebookCard"|"addResultCards"|"attempt"|"disposed"|"draw"|"go"|
 "manualGradeDrafts"|"notice"|"now"|"packageForAttempt"|"packages"|"records"|
 "resultTab"|"reviewFilter"|"root"|"router"|"save"|"storageFault"|"warning"
>;

export type HistoryControllerContext=Slice<
 "changeHistoryQuery"|"deleteAllCompleted"|"downloadBackup"|"draw"|"go"|"historyQuery"|
 "historyQueryKey"|"importHistory"|"notice"|"openSaved"|"packages"|"records"|
 "removeSavedAttempt"|"requestPersistentStorage"|"root"|"showStorageEstimate"
>;

export type LibraryControllerContext=Slice<
 "applyFamily"|"attempt"|"authoringStudio"|"builtinPaperIds"|"cglMode"|
 "changeHistoryQuery"|"choice"|"composeCount"|"composeDifficulty"|"composeError"|
 "composeOpen"|"composePreview"|"composeSection"|"composeSeed"|"composeTopic"|
 "downloadBackup"|"draw"|"editionView"|"fallbackConflict"|"families"|
 "freshlyStartedAttemptId"|"go"|"imagePreparation"|"importHistory"|"loading"|
 "notice"|"now"|"openSaved"|"packages"|"patches"|"records"|"removeSavedAttempt"|
 "root"|"save"|"saveSelection"|"selectedFamilyId"|"setups"|"singleSection"|
 "storageFault"|"untimedPractice"|"warning"
>;

export type RouteControllerContext=Slice<
 "activationGeneration"|"attempt"|"disposed"|"draw"|"freshlyStartedAttemptId"|"go"|
 "hydration"|"now"|"records"|"resultTab"|"reviewFilter"|"routeHydrated"|"router"|
 "save"|"view"|"warning"
>;

export type PersistenceControllerContext=Slice<
 "applyFamily"|"attempt"|"calculatorStates"|"choiceDrafts"|"disposed"|"draw"|"fallbackConflict"|
 "go"|"hydrationDone"|"lastCommittedAt"|"loading"|"mirrorKey"|"notice"|"packages"|
 "pendingWrites"|"recordStorageFailure"|"records"|"routeHydrated"|"router"|"save"|
 "saveSelection"|"setups"|"storageBackend"|"storageFault"|"storedSetups"|
 "updateStorageHealth"|"warning"|"writeMirror"|"writeQueue"
>;

export type LifecycleControllerContext=Slice<
 "attempt"|"authoringStudio"|"calculatorStates"|"dispatch"|"dispatchVisibility"|
 "disposed"|"draw"|"fallbackConflict"|"go"|"imagePreparation"|"imageViewer"|
 "keyboard"|"lastTimerSave"|"learningDesk"|"now"|"pagehide"|"recordStorageFailure"|
 "reviewFilter"|"root"|"router"|"save"|"storage"|"storageBackend"|"storageFault"|
 "timer"|"view"|"visibility"|"warning"|"writeMirror"|"writeQueue"
>;

export type ScreenControllerContext=Slice<
 "attempt"|"authoringStudio"|"disposed"|"draw"|"examHTML"|"fallbackConflict"|
 "go"|"historyQuery"|"imagePreparation"|"imageViewer"|"learningDesk"|"listHTML"|
 "loading"|"packages"|"records"|"resultHTML"|"resultTab"|"root"|"screenRenderer"|
 "storageBackend"|"storageFault"|"storageSnapshot"|"view"|"warning"
> & HistoryControllerContext & LibraryControllerContext & ResultControllerContext & ExamControllerContext;
