import type {ExamPackage} from "../domain/exam-package.ts";
import {
 validateAuthoringDraft,validateAuthoringShelf,requiresExternalQuality,
 type AuthoringDraft,type AuthoringDraftShelf
} from "./authoring-draft.ts";
import {
 addStagedFiles,stagedToAuthoringDraft,type StagedFile,type StagingWorkspace
} from "./authoring-staging.ts";
import {
 inspectAuthoringPublication,type PublicationIssue
} from "./authoring-publisher.ts";
import {inspectExternalQuality,type QualityIssue} from "./external-bank-qa.ts";

export interface AuthoringPublicationInspection {
 readonly report:ReturnType<typeof inspectAuthoringPublication>;
 readonly errors:readonly PublicationIssue[];
 readonly warnings:readonly QualityIssue[];
}

export interface PublicationAcceptance {
 readonly confirmed:boolean;
 readonly acceptWarnings:boolean;
 readonly reviewer:string;
 readonly reviewNote:string;
 readonly acceptedAt:string;
}

export interface PreparedPublication {
 readonly draft:AuthoringDraft;
 readonly packageValue:ExamPackage;
 readonly inspection:AuthoringPublicationInspection;
 readonly draftChanged:boolean;
}

export async function ingestStagedFiles(
 current:StagingWorkspace|null,files:readonly File[]
):Promise<StagingWorkspace>{
 if(!files.length)return current??{schema:1,files:[],selected:[]};
 const inputs:StagedFile[]=[];
 for(const file of files){
  if(file.size>1700000)
   throw new Error(file.name+" is too large for a safely staged source; split the bank");
  inputs.push({name:file.name,source:JSON.parse(await file.text())});
 }
 return addStagedFiles(current??{schema:1,files:[],selected:[]},inputs);
}

export function handoffStagingToDraftShelf(
 staging:StagingWorkspace,shelf:AuthoringDraftShelf
):{readonly shelf:AuthoringDraftShelf;readonly draft:AuthoringDraft}{
 const current=validateAuthoringShelf(shelf);
 if(current.drafts.length>=20)
  throw new Error("20 local drafts already exist. Export and clear an older draft.");
 const incoming=stagedToAuthoringDraft(staging);
 if(current.drafts.some(draft=>draft.id===incoming.id))
  throw new Error("This stage already has a Wordgard draft. Open the saved draft to preserve its edits. Staged files cannot overwrite it.");
 const next=validateAuthoringShelf({
  schema:1,activeId:incoming.id,drafts:[...current.drafts,incoming]
 });
 return {shelf:next,draft:incoming};
}

export function inspectPublicationWorkflow(
 draft:AuthoringDraft,existing:readonly ExamPackage[]
):AuthoringPublicationInspection{
 const report=inspectAuthoringPublication(draft,existing);
 const quality=report.compiled&&requiresExternalQuality(draft)?
  inspectExternalQuality(draft,report.compiled,draft.id):null;
 const errors:PublicationIssue[]=[
  ...report.issues,
  ...(quality?.issues.filter(issue=>issue.severity==="error").map(issue=>({
   field:issue.path,
   reason:issue.code+": "+issue.message,
   ...(issue.questionId?{questionId:issue.questionId}:{})
  }))??[])
 ];
 const warnings=quality?.issues.filter(issue=>issue.severity==="warning")??[];
 return {report,errors,warnings};
}

function attachPublicationAcknowledgement(
 draft:AuthoringDraft,warnings:readonly QualityIssue[],acceptance:PublicationAcceptance
):AuthoringDraft{
 if(!requiresExternalQuality(draft))return draft;
 const reviewer=acceptance.reviewer.trim(),reviewNote=acceptance.reviewNote.trim();
 if(Boolean(reviewer)!==Boolean(reviewNote))
  throw new Error("To attribute an independent review, provide both a reviewer name and an evidence note.");
 if(!warnings.length&&!reviewer)return draft;
 const warningNote=
  "Author acknowledges displayed QA warnings; factual and source verification were NOT performed.";
 return validateAuthoringDraft({...draft,questions:draft.questions.map((question,index)=>{
  const codes=[...new Set(warnings.filter(issue=>
   issue.questionId===question.id||(!issue.questionId&&index===0)).map(issue=>issue.code))];
  if(!codes.length&&!reviewer)return question;
  const previous=question.qa?.review;
  const priorLine=previous?
   "Earlier attributed review by "+previous.reviewer+" ("+previous.reviewedAt+"): "+
    previous.note+"; ":"";
  const note=(priorLine+(reviewNote||warningNote)).slice(0,500);
  return {...question,qa:{status:question.qa?.status??"needs-review",review:{
   reviewer:reviewer||previous?.reviewer||"Author",
   reviewedAt:acceptance.acceptedAt,
   note,
   acceptedWarningCodes:[...new Set([...(previous?.acceptedWarningCodes??[]),...codes])]
  }}};
 })});
}

export function preparePublicationWorkflow(
 draft:AuthoringDraft,existing:readonly ExamPackage[],acceptance:PublicationAcceptance
):PreparedPublication{
 const first=inspectPublicationWorkflow(draft,existing);
 if(!first.report.valid||first.errors.length||!first.report.compiled)
  throw new Error("Publication is not ready; resolve blocking validation errors first.");
 if(first.warnings.length&&!acceptance.acceptWarnings)
  throw new Error("Explicitly acknowledge all remaining QA warnings for this staged draft before publication.");
 if(!acceptance.confirmed)
  throw new Error("Confirm your source, answer keys and marking rules before publishing.");

 const acknowledged=attachPublicationAcknowledgement(draft,first.warnings,acceptance);
 if(acknowledged===draft)
  return {draft,packageValue:first.report.compiled,inspection:first,draftChanged:false};

 const checked=inspectPublicationWorkflow(acknowledged,existing);
 if(!checked.report.valid||checked.errors.length||!checked.report.compiled)
  throw new Error("Publication invalid after review evidence was attached");
 return {
  draft:acknowledged,
  packageValue:checked.report.compiled,
  inspection:checked,
  draftChanged:true
 };
}
