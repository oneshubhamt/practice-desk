

import {isAttempt,type RecordItem} from "./stored-record-validator.ts";


import {builtinCglPackages} from "./exam-package.ts";
import type {ExamPackage,GenericAttempt,CglPracticeMode} from "./exam-package.ts";
import type {ExamCalculatorState} from "./exam-calculator.ts";

import type {OptionId} from "../domain/ids.js";
import type {SessionEvent} from "../engine/session.ts";


import {createSessionClock} from "../engine/clock.ts";

import {type DeletionIntent} from "../history/deletion-policy.ts";
import type {SourcePaperBank,ReviewPatchBank} from "../content/schema.js";
import {createLearningDesk} from "./learning-ui.ts";


import {type StorageHealth} from "./history-page.ts";
import {DEFAULT_HISTORY_QUERY,restoreHistoryQuery,type HistoryQuery} from "./history-query.ts";

import {SHARED_DB_NAME} from "../history/shared-store.ts";
import type {SharedSnapshot} from "../history/shared-store.ts";

import {type ResultTab,type ReviewFilter} from "./result-presentation.ts";

import {readPracticeSetups,type PracticeSetups} from "./practice-selection.ts";
import {examFamilyCatalog,BUILTIN_CGL_FAMILY} from "./exam-families.ts";

import {createScreenRenderer} from "./screen-renderer.ts";
import {createImageViewer} from "./image-viewer.ts";
import {createImagePreparation} from "./image-preparation.ts";
import {createQuestionAuthoringStudio} from "../authoring/authoring-studio.ts";

import {createNativeRouter,type AppRoute,type RouteContext,type NativeRouter} from "./navigation.ts";


import {createWorkspaceAuthoringStudio} from "./authoring-controller.ts";
import {createWorkspaceLearningDesk,addLearningNotebookCard,addLearningResultCards} from "./learning-controller.ts";
import {startWorkspaceTimer,handleWorkspaceVisibility,handleWorkspaceKeyboard,checkpointWorkspacePagehide,detectConcurrentStorageChange,dispatchWorkspaceVisibility,disposeWorkspace} from "./lifecycle-controller.ts";
import type {CoordinatorContext} from "./coordinator-context.ts";
import {renderLibraryHTML,applyLibraryFamily,persistLibrarySelection} from "./library-controller.ts";
import {packageForResult,renderCurrentResultHTML} from "./result-controller.ts";
import {renderCurrentExamHTML,dispatchExamEvent} from "./exam-controller.ts";
import {activateWorkspaceRoute,navigateWorkspace} from "./route-controller.ts";
import {drawWorkspaceScreen,reportWorkspaceNotice} from "./screen-controller.ts";
import {changeHistoryFilters} from "./history-controller.ts";
import {downloadHistoryBackup,importHistoryBackup,writeEmergencyMirror,saveWorkspaceRecord,removeWorkspaceAttempt,deleteCompletedWorkspaceAttempts,showWorkspaceStorageEstimate,requestWorkspacePersistentStorage,workspaceStorageHealth,updateWorkspaceStorageHealth,reportWorkspaceStorageFailure,hydrateWorkspaceStorage} from "./persistence-controller.ts";

let builtinCache:{
 sources:SourcePaperBank;patches:ReviewPatchBank;
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>;bundles:ExamPackage[]
}|null=null;
function cachedCglPackages(sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):ExamPackage[]{
 if(builtinCache&&builtinCache.sources===sources&&builtinCache.patches===patches&&builtinCache.solutions===solutions)
   return builtinCache.bundles;
 const bundles=builtinCglPackages(sources,patches,solutions);
 builtinCache={sources,patches,solutions,bundles};
 return bundles;
}
export function mountExamWorkspace(root:HTMLElement,sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):()=>void{
 const builtins=cachedCglPackages(sources,patches,solutions);
 const builtinPaperIds=new Set(builtins.map(p=>p.paper.id));
 const packages=new Map<string,ExamPackage>(builtins.map(p=>[p.paper.id,p]));
 const records=new Map<string,RecordItem>();
 const storedSnapshots=new Map<string,SharedSnapshot>();
 let choice=[...packages.values()].reverse().find(p=>p.paper.edition==="reviewed")?.paper.id??(packages.keys().next().value as string);
 let cglMode:CglPracticeMode="strict", singleSection=0, untimedPractice=false;
 let editionView:"source"|"reviewed"=packages.get(choice)?.paper.edition==="source"?"source":"reviewed";
 const storedSetups=readPracticeSetups();
 let selectedFamilyId=BUILTIN_CGL_FAMILY;
 let setups:PracticeSetups=storedSetups??{
   schema:2,selectedFamilyId:BUILTIN_CGL_FAMILY,
   families:{[BUILTIN_CGL_FAMILY]:{
     paperRevisionId:choice,mode:cglMode,section:singleSection,
     untimed:untimedPractice,edition:editionView
   }}
 };
 const families=()=>examFamilyCatalog(packages.values(),builtinPaperIds);
 const applyFamily=(id:string):void=>applyLibraryFamily(owner,id);
 const saveSelection=():void=>persistLibrarySelection(owner);
  const historyQueryKey="practiceDesk.history.view.v1";
  let historyQuery:HistoryQuery=(()=>{
    try{return restoreHistoryQuery(JSON.parse(sessionStorage.getItem(historyQueryKey)??"null"));}
    catch{return DEFAULT_HISTORY_QUERY;}
  })();
  // This is session-only archive UI state, never a frozen attempt or backup.
  const changeHistoryQuery=(next:HistoryQuery,redraw=true):void=>changeHistoryFilters(owner,next,redraw);
  // Builder-only UI state, independent of every exam's saved standard mode.
  let composeOpen=false,composeSection="",composeTopic="",composeDifficulty="";
  let composeCount=10,composeSeed="practice-1";
  let composePreview="";
  let composeError="";
  let resultTab:ResultTab="overview";
  let reviewFilter:ReviewFilter="all";
 let attempt:GenericAttempt|null=null, view:"library"|"history"|"exam"|"result"|"learning"="library";
 // Transient incomplete multi-select selections are NEVER part of the scored
 // response; saved answers are cleared when a draft becomes invalid.
 const choiceDrafts=new Map<string,{questionId:string;optionIds:OptionId[];message:string}>();
 const calculatorStates=new Map<string,ExamCalculatorState>();
 const manualGradeDrafts=new Map<string,{marks:string;note:string}>();
 // Live-region updates depend on actual route/question changes, not timer ticks.
 const screenRenderer=createScreenRenderer(root);
 // One transient dialog/handler set for the entire mounted workspace.
 const imageViewer=createImageViewer(root);
 const imagePreparation=createImagePreparation();
 let authoringStudio:ReturnType<typeof createQuestionAuthoringStudio>;
 let router:NativeRouter;
 let activationGeneration=0;
 // A newly created frozen session is already foreground/clock-initialized.
 // Do not restore or persist it a second time while its first save is pending.
 let freshlyStartedAttemptId:string|null=null;
 let routeHydrated=false;
 let hydrationDone:()=>void=()=>{};
 const hydration=new Promise<void>(resolve=>{hydrationDone=resolve;});
 const go=(target:AppRoute,history:"push"|"replace"="push"):void=>navigateWorkspace(owner,target,history);
 let db:IDBDatabase|null=null, warning="",disposed=false, loading=true, writeQueue=Promise.resolve();
 let lastTimerSave=0;
 let fallbackStamp:string|null=null, fallbackConflict=false, storageFault=false;
 let pendingWrites=0,lastCommittedAt:number|null=null,lastStorageFailure:string|null=null;
 const storageSnapshot=():StorageHealth=>workspaceStorageHealth(owner);
 const updateStorageHealth=():void=>updateWorkspaceStorageHealth(owner);
 const recordStorageFailure=(error:unknown):void=>reportWorkspaceStorageFailure(owner,error);
 const storageKey="practiceDesk.overhaul.fallback.v1", mirrorKey="practiceDesk.overhaul.active.v1";
 const dbName=SHARED_DB_NAME;
 const downloadBackup=():Promise<void>=>downloadHistoryBackup(owner);
 const importHistory=(file:File)=>importHistoryBackup(owner,file);
 const writeMirror=(record:GenericAttempt)=>writeEmergencyMirror(owner,record);
 const notice=(s:string)=>reportWorkspaceNotice(owner,s);
 const now=createSessionClock(Date.now(),performance.now(),()=>performance.now());
 const save=(record:RecordItem):Promise<boolean>=>saveWorkspaceRecord(owner,record);
 const removeSavedAttempt=(id:string,intent:DeletionIntent="completed"):Promise<void>=>removeWorkspaceAttempt(owner,id,intent);
 const deleteAllCompleted=():Promise<void>=>deleteCompletedWorkspaceAttempts(owner);
 const showStorageEstimate=():Promise<void>=>showWorkspaceStorageEstimate(owner);
 const requestPersistentStorage=():Promise<void>=>requestWorkspacePersistentStorage(owner);
 let learningDesk:ReturnType<typeof createLearningDesk>;
 const addNotebookCard=(source:GenericAttempt,id:string):void=>addLearningNotebookCard(owner,source,id);
 const addResultCards=(source:GenericAttempt):Promise<void>=>addLearningResultCards(owner,source);
 const dispatch=(event:SessionEvent)=>dispatchExamEvent(owner,event);
 function listHTML():string{return renderLibraryHTML(owner);}
 function packageForAttempt(saved:GenericAttempt):ExamPackage|undefined{return packageForResult(owner,saved);}
 function examHTML():string{return renderCurrentExamHTML(owner);}
 /** Result presentation must use the frozen media, not a mutable current package. */
 function resultHTML():string{return renderCurrentResultHTML(owner);}
 const openSaved=(id:string):void=>{
   const saved=records.get(id);
   if(!isAttempt(saved))return;
   go(saved.finishedAt===null?{screen:"exam",attemptId:id}:
     {screen:"result",attemptId:id,tab:"overview"});
 };
 /** The only coordinator allowed to change the visible screen.
  * URL/history policy lives in navigation.ts, DOM focus lives in the renderer.
  */
 async function activateRoute(target:AppRoute,ctx:RouteContext):Promise<void>{return activateWorkspaceRoute(owner,target,ctx);}
 function draw():void{drawWorkspaceScreen(owner);}
 let timer:number=0;
 const visibility=()=>handleWorkspaceVisibility(owner);
 function dispatchVisibility(visible:boolean):void{return dispatchWorkspaceVisibility(owner,visible);}
 document.addEventListener("visibilitychange",visibility);
 const keyboard=(event:KeyboardEvent)=>handleWorkspaceKeyboard(owner,event);
 window.addEventListener("keydown",keyboard);
 const shortcutSettingsChanged=()=>{if(!disposed&&view==="exam")draw();};
 window.addEventListener("practice-desk:shortcuts-changed",shortcutSettingsChanged);
 const pagehide=()=>checkpointWorkspacePagehide(owner);
 window.addEventListener("pagehide",pagehide);
 const storage=(event:StorageEvent)=>detectConcurrentStorageChange(owner,event);
 window.addEventListener("storage",storage);
 function cleanup():void{
   window.removeEventListener("practice-desk:shortcuts-changed",shortcutSettingsChanged);
   calculatorStates.clear();
   return disposeWorkspace(owner);
 }

 const owner:CoordinatorContext={
 get activationGeneration(){return activationGeneration;},set activationGeneration(value){activationGeneration=value;},
 get addNotebookCard(){return addNotebookCard;},
 get addResultCards(){return addResultCards;},
 get applyFamily(){return applyFamily;},
 get attempt(){return attempt;},set attempt(value){attempt=value;},
 get authoringStudio(){return authoringStudio;},
 get builtinPaperIds(){return builtinPaperIds;},
 get builtins(){return builtins;},
 get calculatorStates(){return calculatorStates;},
 get cglMode(){return cglMode;},set cglMode(value){cglMode=value;},
 get changeHistoryQuery(){return changeHistoryQuery;},
 get choice(){return choice;},set choice(value){choice=value;},
 get choiceDrafts(){return choiceDrafts;},
 get manualGradeDrafts(){return manualGradeDrafts;},
 get composeCount(){return composeCount;},set composeCount(value){composeCount=value;},
 get composeDifficulty(){return composeDifficulty;},set composeDifficulty(value){composeDifficulty=value;},
 get composeError(){return composeError;},set composeError(value){composeError=value;},
 get composeOpen(){return composeOpen;},set composeOpen(value){composeOpen=value;},
 get composePreview(){return composePreview;},set composePreview(value){composePreview=value;},
 get composeSection(){return composeSection;},set composeSection(value){composeSection=value;},
 get composeSeed(){return composeSeed;},set composeSeed(value){composeSeed=value;},
 get composeTopic(){return composeTopic;},set composeTopic(value){composeTopic=value;},
 get db(){return db;},set db(value){db=value;},
 get dbName(){return dbName;},
 get deleteAllCompleted(){return deleteAllCompleted;},
 get dispatch(){return dispatch;},
 get dispatchVisibility(){return dispatchVisibility;},
 get disposed(){return disposed;},set disposed(value){disposed=value;},
 get downloadBackup(){return downloadBackup;},
 get draw(){return draw;},
 get editionView(){return editionView;},set editionView(value){editionView=value;},
 get examHTML(){return examHTML;},
 get fallbackConflict(){return fallbackConflict;},set fallbackConflict(value){fallbackConflict=value;},
 get fallbackStamp(){return fallbackStamp;},set fallbackStamp(value){fallbackStamp=value;},
 get families(){return families;},
 get freshlyStartedAttemptId(){return freshlyStartedAttemptId;},set freshlyStartedAttemptId(value){freshlyStartedAttemptId=value;},
 get go(){return go;},
 get historyQuery(){return historyQuery;},set historyQuery(value){historyQuery=value;},
 get historyQueryKey(){return historyQueryKey;},
 get hydration(){return hydration;},
 get hydrationDone(){return hydrationDone;},set hydrationDone(value){hydrationDone=value;},
 get imagePreparation(){return imagePreparation;},
 get imageViewer(){return imageViewer;},
 get importHistory(){return importHistory;},
 get keyboard(){return keyboard;},
 get lastCommittedAt(){return lastCommittedAt;},set lastCommittedAt(value){lastCommittedAt=value;},
 get lastStorageFailure(){return lastStorageFailure;},set lastStorageFailure(value){lastStorageFailure=value;},
 get lastTimerSave(){return lastTimerSave;},set lastTimerSave(value){lastTimerSave=value;},
 get learningDesk(){return learningDesk;},
 get listHTML(){return listHTML;},
 get loading(){return loading;},set loading(value){loading=value;},
 get mirrorKey(){return mirrorKey;},
 get notice(){return notice;},
 get now(){return now;},
 get openSaved(){return openSaved;},
 get packageForAttempt(){return packageForAttempt;},
 get packages(){return packages;},
 get pagehide(){return pagehide;},
 get patches(){return patches;},
 get pendingWrites(){return pendingWrites;},set pendingWrites(value){pendingWrites=value;},
 get recordStorageFailure(){return recordStorageFailure;},
 get records(){return records;},
 get removeSavedAttempt(){return removeSavedAttempt;},
 get requestPersistentStorage(){return requestPersistentStorage;},
 get resultHTML(){return resultHTML;},
 get resultTab(){return resultTab;},set resultTab(value){resultTab=value;},
 get reviewFilter(){return reviewFilter;},set reviewFilter(value){reviewFilter=value;},
 get root(){return root;},
 get routeHydrated(){return routeHydrated;},set routeHydrated(value){routeHydrated=value;},
 get router(){return router;},set router(value){router=value;},
 get save(){return save;},
 get saveSelection(){return saveSelection;},
 get screenRenderer(){return screenRenderer;},
 get selectedFamilyId(){return selectedFamilyId;},set selectedFamilyId(value){selectedFamilyId=value;},
 get setups(){return setups;},set setups(value){setups=value;},
 get showStorageEstimate(){return showStorageEstimate;},
 get singleSection(){return singleSection;},set singleSection(value){singleSection=value;},
 get solutions(){return solutions;},
 get sources(){return sources;},
 get storage(){return storage;},
 get storageFault(){return storageFault;},set storageFault(value){storageFault=value;},
 get storageKey(){return storageKey;},
 get storageSnapshot(){return storageSnapshot;},
 get storedSetups(){return storedSetups;},
 get storedSnapshots(){return storedSnapshots;},
 get timer(){return timer;},
 get untimedPractice(){return untimedPractice;},set untimedPractice(value){untimedPractice=value;},
 get updateStorageHealth(){return updateStorageHealth;},
 get view(){return view;},set view(value){view=value;},
 get visibility(){return visibility;},
 get warning(){return warning;},set warning(value){warning=value;},
 get writeMirror(){return writeMirror;},
 get writeQueue(){return writeQueue;},set writeQueue(value){writeQueue=value;},
 };
 authoringStudio=createWorkspaceAuthoringStudio(owner);
 learningDesk=createWorkspaceLearningDesk(owner);
 timer=startWorkspaceTimer(owner);
 router=createNativeRouter(activateRoute);
 draw();
 hydrateWorkspaceStorage(owner);
 return cleanup;
}
