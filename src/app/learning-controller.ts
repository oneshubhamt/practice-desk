/** P47-6 module: learning-controller.ts */


import {isAttempt,isLearning} from "./stored-record-validator.ts";


import {startGenericAttempt} from "./exam-package.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";

import type {QuestionRevisionId} from "../domain/ids.js";

import {createLearningDesk} from "./learning-ui.ts";
import {makeRevisionPackage,createNotebookLineage} from "../learning/revision-test.ts";

import {addLearningCard} from "../learning/learning.ts";

import type {LearningControllerContext} from "./coordinator-context.ts";

export const addLearningNotebookCard=(owner:LearningControllerContext,source:GenericAttempt,id:string):void=>{
   if(owner.records.has("learning-card:"+id))return;
   try{
     const record=addLearningCard(source,id as QuestionRevisionId,new Date(owner.now()).toISOString());
     void owner.save(record).then(ok=>{if(ok){owner.warning="Question added to the notebook.";owner.draw();}});
   }catch(error){owner.notice(error instanceof Error?error.message:"Unable to add notebook card");}
 };

export const addLearningResultCards=async (owner:LearningControllerContext,source:GenericAttempt):Promise<void>=>{
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

export function createWorkspaceLearningDesk(owner:LearningControllerContext):ReturnType<typeof createLearningDesk>{return createLearningDesk(owner.root,{
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
