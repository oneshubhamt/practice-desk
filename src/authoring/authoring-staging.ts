/** P57-C: bounded, offline AI-bank staging. Nothing here writes scored packages.
 * Source claims and QA warnings remain unverified. Identity is stable per bank+item,
 * independent of file order, correction, and the publication revision.
 */
import {toAuthoringDraft,inspectExternalQuestionBank} from "./external-bank.ts";
import type {ExternalBankIssue} from "./external-bank.ts";
import type {QuestionQuality,DuplicateCandidate} from "./external-bank-qa.ts";
import {validateAuthoringDraft,AUTHORING_MAX_BYTES} from "./authoring-draft.ts";
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import {sha256} from "../domain/hash.ts";
import type {StimulusDefinition,ImageAsset} from "../domain/question.ts";
import type {StimulusId,AssetId} from "../domain/ids.ts";

export const STAGING_KEY="practiceDesk.authoring.staging.v1";
export const STAGING_MAX_BYTES=1700000;
/** Separate, strictly validated unpublished source backup; NOT History v4. */
export const STAGING_ARCHIVE_FORMAT="practice-desk-staging-archive";

export type StagedFile={readonly name:string;readonly source:unknown};
export type StagedTriage={
 readonly key:string;
 /** Reviewer decision is a claim, never an authenticated verdict. */
 readonly decision:"needs-review"|"distinct"|"potential-duplicate";
 readonly note:string;
 readonly reviewer?:string;
 readonly updatedAt:string;
};
export type StagingWorkspace={
 readonly schema:1;
 readonly files:readonly StagedFile[];
 /** Empty means everything deliberately excluded, not "select all". */
 readonly selected:readonly string[];
 readonly triage?:readonly StagedTriage[];
};
export type StagedQuestion={
 readonly key:string;
 readonly bankId:string;
 readonly id:string;
 readonly question:AuthoringQuestion;
 readonly issues:readonly ExternalBankIssue[];
 readonly selected:boolean;
 readonly quality?:QuestionQuality;
 readonly duplicates:readonly DuplicateCandidate[];
 readonly triage?:StagedTriage;
};
export type StagingInspection={
 readonly questions:readonly StagedQuestion[];
 readonly issues:readonly ExternalBankIssue[];
 readonly selectedCount:number;
 readonly errorCount:number;
 readonly warningCount:number;
 readonly duplicateCandidates:number;
 readonly duplicateTruncated:boolean;
 readonly duplicatePairsInspected:number;
 readonly duplicatePairsPossible:number;
 readonly topicCounts:readonly {label:string;count:number}[];
 readonly kinds:readonly {label:string;count:number}[];
 readonly sourceCount:number;
};
const bankId=(source:unknown):string=>{
 const id=(source as {bankId?:unknown}|null)?.bankId;
 if(typeof id!=="string"||!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id))
  throw Error("Staged source needs a valid stable bankId");
 return id;
};
const itemKey=(bank:string,id:string)=>bank+"::"+id;
const draftFor=(source:unknown)=>toAuthoringDraft(source);
/** Rewrite image references only, never source text, maths, figures or alt text.
 * Every source bank receives a deterministic namespace (even same digest media).
 * The canonical validator verifies all references and embedded SHA digests.
 */
function remapMediaRefs<T>(value:T,map:ReadonlyMap<string,string>):T{
 return JSON.parse(JSON.stringify(value),(key,entry:unknown)=>{
  if(key==="assetId"&&typeof entry==="string"){
   const renamed=map.get(entry);
   if(!renamed)throw Error("Unknown staged media asset reference "+entry);
   return renamed;
  }
  if(key==="assetIds"&&Array.isArray(entry)){
   return entry.map(id=>{
    const renamed=map.get(String(id));
    if(!renamed)throw Error("Unknown staged media asset reference "+String(id));
    return renamed;
   });
  }
  return entry;
 }) as T;
}

const config=(d:AuthoringDraft)=>JSON.stringify([
 d.examId,d.paperId,d.edition,d.revision,d.marksCorrect,d.marksIncorrect,
 d.durationMinutes,d.timingKind,d.pausePolicy,d.questionNavigation,
 d.sectionNavigation,d.sectionTransition,d.allowEarlySubmit,d.allowReview
]);
export function validateStagingWorkspace(value:unknown):StagingWorkspace{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid staging workspace");
 const raw=value as Record<string,unknown>;
 if(Object.keys(raw).some(k=>!["schema","files","selected","triage"].includes(k))||raw.schema!==1||
  !Array.isArray(raw.files)||raw.files.length>8||!Array.isArray(raw.selected))
  throw Error("Unsupported staged-source collection");
 const files:StagedFile[]=[];
 const known=new Set<string>();
 const selections=new Set<string>();
 let questions=0;
 let expected="";
 const sections=new Map<string,number>();
 for(const entry of raw.files){
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||
   Object.keys(entry).some(k=>!["name","source"].includes(k)))
   throw Error("Invalid staged file entry");
  const row=entry as {name:unknown;source:unknown};
  if(typeof row.name!=="string"||row.name.length>150||!row.name.trim())
   throw Error("Invalid staged file name");
  const draft=draftFor(row.source),id=bankId(row.source);
  if(known.has(id))throw Error("Bank ID "+id+" already staged; choose a distinct ID or replace deliberately");
  known.add(id);
  const signature=config(draft);
  if(expected&&signature!==expected)
   throw Error("Staged files must use the same exam, paper, revision, marking, timing and navigation rules");
  expected=signature;
  for(const section of draft.sections){
   const existing=sections.get(section.name);
   if(existing!==undefined&&existing!==section.minutes)
    throw Error("Conflicting section timer in staged files: "+section.name);
   sections.set(section.name,section.minutes);
  }
  for(const q of draft.questions)selections.add(itemKey(id,q.id));
  questions+=draft.questions.length;
  if(questions>400)throw Error("Staging is bounded to 400 source questions; split the batch");
  files.push({name:row.name,source:row.source});
 }
 const selected=raw.selected as unknown[];
 if(selected.length>400||selected.some(x=>typeof x!=="string"||!selections.has(x))||
  new Set(selected).size!==selected.length)
  throw Error("Staged selection references unknown or repeated questions");
 const triageRaw=raw.triage??[];
 if(!Array.isArray(triageRaw)||triageRaw.length>400)
  throw Error("Invalid staged triage entries");
 const triage:StagedTriage[]=[],usedTriage=new Set<string>();
 for(const item of triageRaw){
  if(!item||typeof item!=="object"||Array.isArray(item))throw Error("Invalid staged triage");
  const row=item as Record<string,unknown>;
  if(Object.keys(row).some(k=>!["key","decision","note","reviewer","updatedAt"].includes(k))||
   typeof row.key!=="string"||!selections.has(row.key)||usedTriage.has(row.key)||
   !["needs-review","distinct","potential-duplicate"].includes(String(row.decision))||
   typeof row.note!=="string"||row.note.length>500||
   (row.decision!=="needs-review"&&!row.note.trim())||
   (row.reviewer!==undefined&&(typeof row.reviewer!=="string"||row.reviewer.length>120||!row.reviewer.trim()))||
   typeof row.updatedAt!=="string"||
   !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(row.updatedAt)||
   Number.isNaN(Date.parse(row.updatedAt))||
   new Date(row.updatedAt).toISOString()!==row.updatedAt)
    throw Error("Invalid staged triage decision or attribution");
  usedTriage.add(row.key);
  triage.push({key:row.key,decision:row.decision as StagedTriage["decision"],
   note:row.note,updatedAt:row.updatedAt,
   ...(row.reviewer?{reviewer:row.reviewer as string}:{})});
 }
 const state:StagingWorkspace={schema:1,files,selected:selected as string[],
  ...(raw.triage===undefined?{}:{triage})};
 if(JSON.stringify(state).length>STAGING_MAX_BYTES)
  throw Error("Staging exceeds the safe local storage budget; split or reduce media");
 return state;
}
export function createStagingArchive(value:StagingWorkspace){
 return {format:STAGING_ARCHIVE_FORMAT,version:1 as const,
  factualVerification:"not-performed" as const,workspace:validateStagingWorkspace(value)};
}
export function readStagingArchive(value:unknown):StagingWorkspace{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error("Invalid staging archive envelope");
 const row=value as Record<string,unknown>;
 if(Object.keys(row).some(k=>!["format","version","factualVerification","workspace"].includes(k))||
  row.format!==STAGING_ARCHIVE_FORMAT||row.version!==1||
  row.factualVerification!=="not-performed"||
  JSON.stringify(value).length>STAGING_MAX_BYTES+512)
  throw Error("Invalid, unsupported or oversized staging archive");
 return validateStagingWorkspace(row.workspace);
}
export function addStagedFiles(
 prior:StagingWorkspace,files:readonly StagedFile[]
):StagingWorkspace{
 if(!files.length)return validateStagingWorkspace(prior);
 const fresh=files.flatMap(f=>draftFor(f.source).questions.map(q=>itemKey(bankId(f.source),q.id)));
 return validateStagingWorkspace({...prior,files:[...prior.files,...files],
  selected:[...prior.selected,...fresh]});
}
export function updateStagedSelection(
 state:StagingWorkspace,key:string,enabled:boolean
):StagingWorkspace{
 const selected=new Set(state.selected);
 if(enabled)selected.add(key);else selected.delete(key);
 return validateStagingWorkspace({...state,selected:[...selected]});
}
export function updateStagedTriage(state:StagingWorkspace,key:string,
 decision:StagedTriage["decision"],note:string,reviewer=""):StagingWorkspace{
 const current=validateStagingWorkspace(state);
 const other=(current.triage??[]).filter(t=>t.key!==key);
 const candidate={key,decision,note,updatedAt:new Date().toISOString(),
  ...(reviewer.trim()?{reviewer:reviewer.trim()}:{})};
 return validateStagingWorkspace({...current,triage:[...other,candidate]});
}
export function inspectStagingWorkspace(state:StagingWorkspace):StagingInspection{
 const valid=validateStagingWorkspace(state),rows:StagedQuestion[]=[],issues:ExternalBankIssue[]=[];
 const subjects=new Map<string,number>(),kinds=new Map<string,number>();
 let duplicates=0,sourceCount=0,duplicateTruncated=false;
 let duplicatePairsInspected=0,duplicatePairsPossible=0;
 const selected=new Set(valid.selected);
 for(const file of valid.files){
  const id=bankId(file.source),draft=draftFor(file.source);
  const prior=valid.files.filter(f=>f!==file).map(f=>f.source);
  const report=inspectExternalQuestionBank(file.source,[],prior);
  const assigned=report.issues.map(issue=>({...issue,
   path:file.name+": "+issue.path,
   ...(issue.questionId?{questionId:itemKey(id,issue.questionId)}:{})}));
  issues.push(...assigned);
  duplicates+=report.quality?.duplicates.length??0;
  duplicateTruncated ||= report.quality?.summary.duplicateTruncated??false;
  duplicatePairsInspected+=report.quality?.summary.duplicatePairsInspected??0;
  duplicatePairsPossible+=report.quality?.summary.duplicatePairsPossible??0;
  for(const q of draft.questions){
   const key=itemKey(id,q.id),picked=selected.has(key);
   const related=report.quality?.duplicates.filter(candidate=>
    (candidate.first.bankId===id&&candidate.first.questionId===q.id)||
    (candidate.second.bankId===id&&candidate.second.questionId===q.id))??[];
   const quality=report.quality?.questions.find(result=>result.questionId===q.id);
   const triage=valid.triage?.find(row=>row.key===key);
   rows.push({key,bankId:id,id:q.id,question:q,
    issues:assigned.filter(issue=>issue.questionId===key),
    selected:picked,duplicates:related,
    ...(quality?{quality}:{}),...(triage?{triage}:{})});
   if(picked){
    const topic=q.syllabusHeadingId||q.subject||"Unclassified";
    subjects.set(topic,(subjects.get(topic)??0)+1);
    kinds.set(q.kind,(kinds.get(q.kind)??0)+1);
    sourceCount+=q.provenance?.sources?.length??0;
   }
  }
 }
 const sorted=(map:Map<string,number>)=>[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))
  .map(([label,count])=>({label,count}));
 return {questions:rows,issues,selectedCount:valid.selected.length,
  errorCount:issues.filter(i=>i.severity==="error").length,
  warningCount:issues.filter(i=>i.severity==="warning").length,
  duplicateCandidates:duplicates,duplicateTruncated,
  duplicatePairsInspected,duplicatePairsPossible,
  topicCounts:sorted(subjects),kinds:sorted(kinds),sourceCount};
}
/** Handoff to *unpublished* Wordgard. A wrong answer key can be corrected there.
 * The selected paper must still pass full publisher + P57-B QA before publication.
 */
export function stagedToAuthoringDraft(state:StagingWorkspace):AuthoringDraft{
 const valid=validateStagingWorkspace(state);
 if(!valid.files.length)throw Error("Stage an AI authoring source first");
 if(!valid.selected.length)throw Error("Select at least one question");
 if(valid.selected.length>200)throw Error("Wordgard drafts support 200 questions; reduce selection or split into revisions");
 const base=draftFor(valid.files[0]!.source);
 const selected=new Set(valid.selected);
 const questions:AuthoringQuestion[]=[],stimuli:StimulusDefinition[]=[],assets:ImageAsset[]=[];
 const assetIds=new Set<string>();
 const stimulusIds=new Set<string>();
 for(const file of valid.files){
  const draft=draftFor(file.source),id=bankId(file.source);
  const chosen=draft.questions.filter(q=>selected.has(itemKey(id,q.id)));
  if(!chosen.length)continue;
  const mediaIds=new Map(draft.assets.map(a=>[String(a.id),
   "m_"+sha256(id+"|"+a.id).slice(0,28)]));
  for(const q of chosen){
   const idStable="q_"+sha256(id+"|"+q.id).slice(0,28);
   const stimulusRef=q.stimulusRef?
    "s_"+sha256(id+"|"+q.stimulusRef).slice(0,28):undefined;
   const triage=valid.triage?.find(row=>row.key===itemKey(id,q.id));
   const attributed=triage&&triage.decision!=="needs-review"?{
    status:"needs-review" as const,review:{
     reviewer:triage.reviewer??"Author (unverified)",
     reviewedAt:triage.updatedAt,
     note:"AI staging duplicate triage — author decision "+triage.decision+
      ": "+triage.note+"; identity and factual findings NOT authenticated.",
     acceptedWarningCodes:[] as string[]
    }
   }:undefined;
   questions.push({...remapMediaRefs(q,mediaIds),id:idStable,
    ...(stimulusRef?{stimulusRef}:{}),
    ...(attributed?{qa:attributed}:{})});
  }
  for(const s of draft.stimuli??[]){
   if(!chosen.some(q=>q.stimulusRef===s.id))continue;
   const renamed=("s_"+sha256(id+"|"+s.id).slice(0,28)) as StimulusId;
   if(stimulusIds.has(renamed))throw Error("Staged stimulus identity collision");
   stimulusIds.add(renamed);
   stimuli.push({...remapMediaRefs(s,mediaIds),id:renamed} as StimulusDefinition);
  }
  for(const a of draft.assets){
   const renamed=mediaIds.get(a.id)! as AssetId;
   if(assetIds.has(renamed))throw Error("Staged media namespace collision");
   assetIds.add(renamed);
   assets.push({...a,id:renamed});
  }
 }
 const draft:AuthoringDraft={...base,
  id:"stage:"+sha256(base.examId+"|"+base.paperId+"|"+base.revision+"|"+
   valid.files.map(f=>bankId(f.source)).sort().join("|")+"|"+
   [...valid.selected].sort().join("|")).slice(0,24),
  updatedAt:new Date().toISOString(),questions,stimuli,assets};
 if(JSON.stringify(draft).length>AUTHORING_MAX_BYTES)
  throw Error("Selected draft exceeds local authoring budget; reduce source images or questions");
 return validateAuthoringDraft(draft);
}
