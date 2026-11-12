/** P58-B: exact versioned unpublished Wordgard exchange.
 * Deliberately separate from narrow AI producer source v1 and from History backup.
 * No publisher hash, source authenticity or reviewer identity is implied.
 */
import {AUTHORING_MAX_BYTES,requiresExternalQuality,validateAuthoringDraft,
 validateAuthoringShelf,type AuthoringDraft,type AuthoringDraftShelf} from "./authoring-draft.ts";
import {inspectAuthoringPublication} from "./authoring-publisher.ts";
import {inspectExternalQuality} from "./external-bank-qa.ts";
import type {ExternalBankReport,ExternalBankIssue} from "./external-bank.ts";
import type {ExamPackage} from "../domain/exam-package.ts";

export const DRAFT_EXCHANGE_FORMAT="practice-desk-draft-exchange";
export const DRAFT_SHELF_ARCHIVE_FORMAT="practice-desk-draft-shelf-archive";
/** Optional separate backup for all unpublished Wordgard drafts, never History. */
export function createDraftShelfArchive(shelf:AuthoringDraftShelf){
 return {format:DRAFT_SHELF_ARCHIVE_FORMAT,version:1 as const,
  factualVerification:"not-performed" as const,shelf:validateAuthoringShelf(shelf)};
}
export function readDraftShelfArchive(value:unknown):AuthoringDraftShelf{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error("Invalid draft shelf archive");
 const raw=value as Record<string,unknown>;
 if(Object.keys(raw).some(k=>!["format","version","factualVerification","shelf"].includes(k))||
  raw.format!==DRAFT_SHELF_ARCHIVE_FORMAT||raw.version!==1||
  raw.factualVerification!=="not-performed"||
  JSON.stringify(value).length>AUTHORING_MAX_BYTES+512)
  throw Error("Invalid, unsupported or oversized draft shelf archive");
 return validateAuthoringShelf(raw.shelf);
}

export type DraftExchange={
 readonly format:typeof DRAFT_EXCHANGE_FORMAT;
 readonly version:1;
 readonly factualVerification:"not-performed";
 readonly draft:AuthoringDraft;
};
export function createDraftExchange(input:AuthoringDraft):DraftExchange{
 return {format:DRAFT_EXCHANGE_FORMAT,version:1,factualVerification:"not-performed",
  draft:validateAuthoringDraft(input)};
}
export function isDraftExchange(value:unknown):boolean{
 return Boolean(value)&&typeof value==="object"&&
  (value as {format?:unknown}).format===DRAFT_EXCHANGE_FORMAT;
}
export function readDraftExchange(value:unknown):AuthoringDraft{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error("Invalid unpublished draft exchange envelope");
 const row=value as Record<string,unknown>;
 if(Object.keys(row).some(k=>!["format","version","factualVerification","draft"].includes(k))||
  row.format!==DRAFT_EXCHANGE_FORMAT||row.version!==1||
  row.factualVerification!=="not-performed")
  throw Error("Unsupported draft exchange envelope");
 if(JSON.stringify(value).length>AUTHORING_MAX_BYTES+512)
  throw Error("Unpublished draft exchange exceeds the local authoring budget");
 return validateAuthoringDraft(row.draft);
}
/** CLI and browser share the exact same Wordgard publisher/QA path. */
export function inspectDraftExchange(value:unknown,existing:readonly ExamPackage[]=[]):ExternalBankReport{
 let questionCount=0;
 try{
  const draft=readDraftExchange(value);questionCount=draft.questions.length;
  const report=inspectAuthoringPublication(draft,existing);
  if(!report.valid||!report.compiled){
   return {valid:false,questionCount,editorialStatus:"caution",factualVerification:"not-performed",
    issues:report.issues.map(issue=>({
     path:issue.questionId?"$.draft.questions[id="+issue.questionId+"]."+issue.field:
      "$.draft."+issue.field,code:"publication-invalid",severity:"error",
     message:issue.reason,...(issue.questionId?{questionId:issue.questionId}:{})
    }))};
  }
  const quality=requiresExternalQuality(draft)?
   inspectExternalQuality(draft,report.compiled,"exchange:"+draft.id):undefined;
  const issues=quality?.issues??[];
  return {valid:!issues.some(issue=>issue.severity==="error"),questionCount,
   editorialStatus:"caution",factualVerification:"not-performed",issues,
   ...(quality?{quality}:{}),
   ...(!issues.some(issue=>issue.severity==="error")?{compiled:report.compiled}:{})};
 }catch(error){
  const issues:ExternalBankIssue[]=[{path:"$.draft",code:"exchange-invalid",
   severity:"error",message:error instanceof Error?error.message:"Invalid draft exchange"}];
  return {valid:false,questionCount,editorialStatus:"caution",
   factualVerification:"not-performed",issues};
 }
}
