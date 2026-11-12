/** P47-6 module: route-controller.ts */


import {isAttempt} from "./stored-record-validator.ts";


import {transitionGenericAttempt} from "../engine/generic-attempt.ts";

import {restoreSession} from "../history/frozen.ts";

import {scoreAttempt} from "../engine/scoring.ts";

import {type AppRoute,type RouteContext} from "./navigation.ts";
import type {RouteControllerContext} from "./coordinator-context.ts";

export async function activateWorkspaceRoute(owner:RouteControllerContext,target:AppRoute,ctx:RouteContext):Promise<void>{
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
       const restoredAt=owner.now();
       const restored=restoreSession(saved.frozen.paper,saved.state,restoredAt,!document.hidden);
       owner.attempt={...saved,state:restored.state,updatedAt:restoredAt,
         ...(restored.expired?{finishedAt:restoredAt,completionReason:"time-expired" as const,
           result:scoreAttempt(saved.frozen.paper,saved.frozen.key,
             saved.frozen.questions,restored.state.responses,new Date(restoredAt).toISOString())}:{})};
       void owner.save(owner.attempt);
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

export const navigateWorkspace=(owner:RouteControllerContext,target:AppRoute,history:"push"|"replace"="push"):void=>{
   void owner.router.navigate(target,history).catch(error=>{
     owner.warning=error instanceof Error?"Navigation failed: "+error.message:"Navigation failed";
     if(!owner.disposed)owner.draw();
   });
 };
