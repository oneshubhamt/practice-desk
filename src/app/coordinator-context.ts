/** Single typed capability owner; mutable backing state is never cloned. */


import {type RecordItem} from "./stored-record-validator.ts";

import type {ExamPackage,GenericAttempt,CglPracticeMode} from "./exam-package.ts";
import type {ExamCalculatorState} from "./exam-calculator.ts";

import type {OptionId} from "../domain/ids.js";
import type {SessionEvent} from "../engine/session.ts";

import {type DeletionIntent} from "../history/deletion-policy.ts";
import type {SourcePaperBank,ReviewPatchBank} from "../content/schema.js";

import {type StorageHealth} from "./history-page.ts";
import {type HistoryQuery} from "./history-query.ts";


import type {SharedSnapshot} from "../history/shared-store.ts";

import {type ResultTab,type ReviewFilter} from "./result-presentation.ts";

import {type PracticeSetups} from "./practice-selection.ts";

import {type AppRoute,type NativeRouter} from "./navigation.ts";
import type {ExamFamily} from "./exam-families.ts";
import type {PaperRevisionId} from "../domain/ids.ts";
import type {ScreenRenderer} from "./screen-renderer.ts";
import type {ImageViewer} from "./image-viewer.ts";
import type {ImagePreparation} from "./image-preparation.ts";
import type {AuthoringStudioController} from "../authoring/authoring-studio.ts";
export interface CoordinatorContext{
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
 db:IDBDatabase | null;
 readonly dbName:string;
 readonly deleteAllCompleted:() => Promise<void>;
 readonly dispatch:(event: SessionEvent) => void;
 readonly dispatchVisibility:(visible: boolean) => void;
 disposed:boolean;
 readonly downloadBackup:() => Promise<void>;
 readonly draw:() => void;
 editionView:"source" | "reviewed";
 readonly examHTML:() => string;
 fallbackConflict:boolean;
 fallbackStamp:string | null;
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
 readonly storageKey:string;
 readonly storageSnapshot:() => StorageHealth;
 readonly storedSetups:PracticeSetups | null;
 readonly storedSnapshots:Map<string, SharedSnapshot>;
 readonly timer:number;
 untimedPractice:boolean;
 readonly updateStorageHealth:() => void;
 view:"result" | "exam" | "library" | "history" | "learning";
 readonly visibility:() => void;
 warning:string;
 readonly writeMirror:(record: GenericAttempt) => void;
 writeQueue:Promise<void>;
}
