/** P47-6 module: authoring-controller.ts */

import {validateExamPackage} from "./exam-package.ts";

import {familyIdFor} from "./exam-families.ts";

import {createQuestionAuthoringStudio} from "../authoring/authoring-studio.ts";


import type {CoordinatorContext} from "./coordinator-context.ts";

export function createWorkspaceAuthoringStudio(owner:CoordinatorContext):ReturnType<typeof createQuestionAuthoringStudio>{return createQuestionAuthoringStudio({
   existing:()=>[...owner.packages.values()],
   onClose:()=>{if(!owner.disposed&&owner.view==="library")owner.draw();},
   publish:async bundle=>{
     const signed=validateExamPackage(bundle);
     if(owner.loading||owner.fallbackConflict||owner.storageFault)
       throw Error("Library storage is not ready or another tab has changed it. Reopen before publishing.");
     if(owner.packages.has(signed.paper.id)||owner.records.has("generic-package:"+signed.paper.id))
       throw Error("This exact paper edition and revision is already published. Increase Revision rather than overwriting it.");
     // A newly published item uses the SAME source-validated, compare-and-save
     // path as ordinary imported papers. No separate mutable publication store.
     const persisted=await owner.save({recordType:"generic-package",saveRevision:0,
       id:"generic-package:"+signed.paper.id,bundle:signed});
     if(!persisted)throw Error("The validated paper could not be saved; no new edition is available.");
     owner.packages.set(signed.paper.id,signed);
     owner.applyFamily(familyIdFor(signed,owner.builtinPaperIds));
     owner.choice=signed.paper.id;owner.singleSection=0;
     if(signed.paper.edition==="source"||signed.paper.edition==="reviewed")
       owner.editionView=signed.paper.edition;
     owner.saveSelection();
     owner.warning="Published "+signed.questions.length+" user-authored questions as a new immutable "+
       signed.paper.edition+" revision. The paper is ready to practise; existing attempts are unchanged.";
     owner.authoringStudio.beforeRender();
     owner.draw();
   }
 });}
