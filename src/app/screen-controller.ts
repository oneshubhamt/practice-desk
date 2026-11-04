/** P47-6 module: screen-controller.ts */


import {isAttempt} from "./stored-record-validator.ts";

import {historyHTML} from "./history-page.ts";

import type {CoordinatorContext} from "./coordinator-context.ts";
import {bindHistoryScreen} from "./history-controller.ts";
import {bindLibraryScreen} from "./library-controller.ts";
import {bindResultScreen} from "./result-controller.ts";
import {bindExamScreen} from "./exam-controller.ts";
export const reportWorkspaceNotice=(owner:CoordinatorContext,s:string)=>{owner.warning=s;owner.draw();};

export function drawWorkspaceScreen(owner:CoordinatorContext,):void{
   if(owner.disposed)return;
   // Do not destroy a live Wordgard editor for a background state notification.
   // Manual close or successful publication refreshes Library explicitly.
   if(owner.view==="library"&&owner.authoringStudio.isOpen())return;
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
