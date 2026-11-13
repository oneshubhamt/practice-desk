import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {isAttempt,type RecordItem} from "./stored-record-validator.ts";
import {builtinCglPackages} from "./exam-package.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {CglPracticeMode} from "../workspace-settings.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {ExamCalculatorState} from "../domain/calculator.ts";
import type {OptionId} from "../domain/ids.js";
import type {SessionEvent} from "../engine/session.ts";
import {createSessionClock} from "../engine/clock.ts";
import type {DeletionIntent} from "../history/deletion-policy.ts";
import type {SourcePaperBank,ReviewPatchBank} from "../content/schema.js";
import type {StorageHealth} from "./storage-health.ts";
import {DEFAULT_HISTORY_QUERY,restoreHistoryQuery,type HistoryQuery} from "./history-query.ts";
import type {ResultTab,ReviewFilter} from "./result-presentation.ts";
import {readPracticeSetups,type PracticeSetups} from "./practice-selection.ts";
import {examFamilyCatalog,BUILTIN_CGL_FAMILY} from "./exam-families.ts";
import {createScreenRenderer} from "./screen-renderer.ts";
import {createImageViewer} from "./image-viewer.ts";
import {createImagePreparation} from "./image-preparation.ts";
import {createNativeRouter,type AppRoute,type RouteContext,type NativeRouter} from "./navigation.ts";
import {createWorkspaceAuthoringStudio} from "./authoring-controller.ts";
import {createWorkspaceLearningDesk,addLearningNotebookCard,addLearningResultCards} from "./learning-controller.ts";
import {createWorkspaceCalendarController} from "./calendar-controller.ts";
import {startWorkspaceTimer,handleWorkspaceVisibility,handleWorkspaceKeyboard,
 checkpointWorkspacePagehide,detectConcurrentStorageChange,dispatchWorkspaceVisibility,
 disposeWorkspace} from "./lifecycle-controller.ts";
import type {WorkspaceContext} from "./coordinator-context.ts";
import {renderLibraryHTML,applyLibraryFamily,persistLibrarySelection} from "./library-controller.ts";
import {packageForResult,renderCurrentResultHTML} from "./result-controller.ts";
import {renderCurrentExamHTML,dispatchExamEvent} from "./exam-controller.ts";
import {activateWorkspaceRoute,navigateWorkspace} from "./route-controller.ts";
import {drawWorkspaceScreen,reportWorkspaceNotice} from "./screen-controller.ts";
import {changeHistoryFilters} from "./history-controller.ts";
import {downloadHistoryBackup,importHistoryBackup,writeEmergencyMirror,saveWorkspaceRecord,
 removeWorkspaceAttempt,deleteCompletedWorkspaceAttempts,hydrateWorkspaceStorage}
 from "./persistence-controller.ts";
import {showWorkspaceStorageEstimate,requestWorkspacePersistentStorage,
 workspaceStorageHealth,updateWorkspaceStorageHealth,reportWorkspaceStorageFailure}
 from "./storage-health-controller.ts";

let builtinCache:{
 sources:SourcePaperBank;patches:ReviewPatchBank;
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>;bundles:ExamPackage[]
}|null=null;

function cachedCglPackages(
 sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>
):ExamPackage[]{
 if(builtinCache&&builtinCache.sources===sources&&builtinCache.patches===patches&&
   builtinCache.solutions===solutions)return builtinCache.bundles;
 const bundles=builtinCglPackages(sources,patches,solutions);
 builtinCache={sources,patches,solutions,bundles};
 return bundles;
}

export function mountExamWorkspace(
 root:HTMLElement,sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>
):()=>void{
 const builtins=cachedCglPackages(sources,patches,solutions);
 const builtinPaperIds=new Set(builtins.map(p=>p.paper.id));
 const packages=new Map<string,ExamPackage>(builtins.map(p=>[p.paper.id,p]));
 const records=new Map<string,RecordItem>();
 const initialChoice=[...packages.values()].reverse().find(p=>p.paper.edition==="reviewed")?.paper.id??
   (packages.keys().next().value as string);
 const storedSetups=readPracticeSetups();
 const initialSetups:PracticeSetups=storedSetups??{
   schema:2,selectedFamilyId:BUILTIN_CGL_FAMILY,
   families:{[BUILTIN_CGL_FAMILY]:{
     paperRevisionId:initialChoice,mode:"strict",section:0,
     untimed:false,edition:packages.get(initialChoice)?.paper.edition==="source"?"source":"reviewed"
   }}
 };
 const historyQueryKey=STORAGE_TOPOLOGY.historyView;
 const initialHistoryQuery:HistoryQuery=(()=>{
   try{return restoreHistoryQuery(JSON.parse(sessionStorage.getItem(historyQueryKey)??"null"));}
   catch{return DEFAULT_HISTORY_QUERY;}
 })();

 const choiceDrafts=new Map<string,{questionId:string;optionIds:OptionId[];message:string}>();
 const calculatorStates=new Map<string,ExamCalculatorState>();
 const manualGradeDrafts=new Map<string,{marks:string;note:string}>();
 const screenRenderer=createScreenRenderer(root);
 const imageViewer=createImageViewer(root);
 const imagePreparation=createImagePreparation();
 const now=createSessionClock(Date.now(),performance.now(),()=>performance.now());
 const mirrorKey=STORAGE_TOPOLOGY.activeAttemptMirror;
 let hydrationDone:()=>void=()=>{};
 const hydration=new Promise<void>(resolve=>{hydrationDone=resolve;});

 let owner!:WorkspaceContext;
 let authoringStudio!:WorkspaceContext["authoringStudio"];
 let learningDesk!:WorkspaceContext["learningDesk"];
 let calendarController!:WorkspaceContext["calendarController"];
 let router!:NativeRouter;
 let timer=0;

 const families=()=>examFamilyCatalog(packages.values(),builtinPaperIds);
 const applyFamily=(id:string):void=>applyLibraryFamily(owner,id);
 const saveSelection=():void=>persistLibrarySelection(owner);
 const changeHistoryQuery=(next:HistoryQuery,redraw=true):void=>changeHistoryFilters(owner,next,redraw);
 const go=(target:AppRoute,history:"push"|"replace"="push"):void=>
   navigateWorkspace(owner,target,history);
 const storageSnapshot=():StorageHealth=>workspaceStorageHealth(owner);
 const updateStorageHealth=():void=>updateWorkspaceStorageHealth(owner);
 const recordStorageFailure=(error:unknown):void=>reportWorkspaceStorageFailure(owner,error);
 const downloadBackup=():Promise<void>=>downloadHistoryBackup(owner);
 const importHistory=async(file:File)=>{
   await importHistoryBackup(owner,file);
   calendarController?.invalidate();
 };
 const writeMirror=(record:GenericAttempt)=>writeEmergencyMirror(owner,record);
 const notice=(message:string)=>reportWorkspaceNotice(owner,message);
 const save=async(record:RecordItem):Promise<boolean>=>{
   const ok=await saveWorkspaceRecord(owner,record);
   if(ok)calendarController?.invalidate();
   return ok;
 };
 const removeSavedAttempt=async(id:string,intent:DeletionIntent="completed"):Promise<void>=>{
   await removeWorkspaceAttempt(owner,id,intent);
   calendarController?.invalidate();
 };
 const deleteAllCompleted=():Promise<void>=>deleteCompletedWorkspaceAttempts(owner);
 const showStorageEstimate=():Promise<void>=>showWorkspaceStorageEstimate(owner);
 const requestPersistentStorage=():Promise<void>=>requestWorkspacePersistentStorage(owner);
 const addNotebookCard=(source:GenericAttempt,id:string):void=>addLearningNotebookCard(owner,source,id);
 const addResultCards=(source:GenericAttempt):Promise<void>=>addLearningResultCards(owner,source);
 const dispatch=(event:SessionEvent)=>dispatchExamEvent(owner,event);
 const listHTML=():string=>renderLibraryHTML(owner);
 const packageForAttempt=(saved:GenericAttempt):ExamPackage|undefined=>packageForResult(owner,saved);
 const examHTML=():string=>renderCurrentExamHTML(owner);
 const resultHTML=():string=>renderCurrentResultHTML(owner);
 const openSaved=(id:string):void=>{
   const saved=records.get(id);
   if(!isAttempt(saved))return;
   go(saved.finishedAt===null?{screen:"exam",attemptId:id}:
     {screen:"result",attemptId:id,tab:"overview"});
 };
 const activateRoute=(target:AppRoute,ctx:RouteContext):Promise<void>=>
   activateWorkspaceRoute(owner,target,ctx);
 const draw=():void=>drawWorkspaceScreen(owner);
 const visibility=()=>handleWorkspaceVisibility(owner);
 const dispatchVisibility=(visible:boolean):void=>dispatchWorkspaceVisibility(owner,visible);
 const keyboard=(event:KeyboardEvent)=>handleWorkspaceKeyboard(owner,event);
 const pagehide=()=>checkpointWorkspacePagehide(owner);
 const storage=(event:StorageEvent)=>detectConcurrentStorageChange(owner,event);

 owner={
   activationGeneration:0,
   addNotebookCard,addResultCards,applyFamily,
   attempt:null,
   get authoringStudio(){return authoringStudio;},
   builtinPaperIds,builtins,calculatorStates,
   cglMode:"strict" as CglPracticeMode,
   changeHistoryQuery,
   choice:initialChoice,
   choiceDrafts,manualGradeDrafts,
   composeCount:10,composeDifficulty:"",composeError:"",composeOpen:false,composePreview:"",
   composeSection:"",composeSeed:"practice-1",composeTopic:"",
   deleteAllCompleted,dispatch,dispatchVisibility,
   disposed:false,downloadBackup,draw,
   editionView:packages.get(initialChoice)?.paper.edition==="source"?"source":"reviewed",
   examHTML,
   fallbackConflict:false,
   families,
   freshlyStartedAttemptId:null,
   go,
   historyQuery:initialHistoryQuery,historyQueryKey,hydration,hydrationDone,
   imagePreparation,imageViewer,importHistory,keyboard,
   lastCommittedAt:null,lastStorageFailure:null,lastTimerSave:0,
   get learningDesk(){return learningDesk;},
   get calendarController(){return calendarController;},
   listHTML,loading:true,mirrorKey,notice,now,openSaved,packageForAttempt,packages,pagehide,patches,
   pendingWrites:0,recordStorageFailure,records,removeSavedAttempt,requestPersistentStorage,resultHTML,
   resultTab:"overview" as ResultTab,reviewFilter:"all" as ReviewFilter,root,
   routeHydrated:false,
   get router(){return router;},set router(value){router=value;},
   save,saveSelection,screenRenderer,
   selectedFamilyId:BUILTIN_CGL_FAMILY,
   setups:initialSetups,showStorageEstimate,singleSection:0,solutions,sources,
   storage,storageBackend:null,storageFault:false,storageSnapshot,storedSetups,
   get timer(){return timer;},
   untimedPractice:false,updateStorageHealth,
   view:"library",visibility,warning:"",writeMirror,writeQueue:Promise.resolve()
 };

 authoringStudio=createWorkspaceAuthoringStudio(owner);
 learningDesk=createWorkspaceLearningDesk(owner);
 calendarController=createWorkspaceCalendarController(owner);
 timer=startWorkspaceTimer(owner);
 router=createNativeRouter(activateRoute);

 document.addEventListener("visibilitychange",visibility);
 window.addEventListener("keydown",keyboard);
 const shortcutSettingsChanged=()=>{if(!owner.disposed&&owner.view==="exam")draw();};
 window.addEventListener("practice-desk:shortcuts-changed",shortcutSettingsChanged);
 window.addEventListener("pagehide",pagehide);
 window.addEventListener("storage",storage);

 function cleanup():void{
   window.removeEventListener("practice-desk:shortcuts-changed",shortcutSettingsChanged);
   calculatorStates.clear();
   disposeWorkspace(owner);
 }

 draw();
 hydrateWorkspaceStorage(owner);
 return cleanup;
}
