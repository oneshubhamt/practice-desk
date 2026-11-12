/** Untrusted frozen attempt, learning card and imported package validation. */
import {validateExamPackage,type ExamPackage} from "../domain/exam-package.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import {validateLearningCard,type LearningCard} from "../learning/learning.ts";
import {validateSectionTimingEvidence} from "../engine/session.ts";
import {assertFrozenContent} from "../history/frozen.ts";
import {isVerifiedSharedFrozen} from "../history/shared-store.ts";
import {validateResponse} from "../engine/response.ts";
import {scoreAttempt} from "../engine/scoring.ts";
import {validateManualGrades} from "../engine/manual-grading.ts";
import {validateSourceKeyReference} from "../engine/source-comparison.ts";
import {validateSourceReviewReference} from "../engine/review-source.ts";
import {validateNotebookLineage} from "../learning/revision-test.ts";
import {validatePracticeComposition} from "./practice-compose.ts";
export type PackageRecord={recordType:"generic-package";id:string;bundle:ExamPackage;saveRevision:number};
export type RecordItem=PackageRecord|GenericAttempt|LearningCard;
export const isAttempt=(x:unknown):x is GenericAttempt=>!!x&&typeof x==="object"&&(x as GenericAttempt).recordType==="generic-attempt";
export const isPackage=(x:unknown):x is PackageRecord=>!!x&&typeof x==="object"&&(x as PackageRecord).recordType==="generic-package";
export const isLearning=(x:unknown):x is LearningCard=>!!x&&typeof x==="object"&&(x as LearningCard).recordType==="learning-card";

/** P48-4: saved browser and backup records are untrusted, including mutable
 * session clocks and annotations outside the independently hashed paper/key.
 * Do not permit undeclared fields to masquerade as certified evidence.
 */
function onlyFields(value:unknown,fields:readonly string[],location:string):void{
 if(!value||typeof value!=="object"||Array.isArray(value)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
   throw Error("Invalid "+location+" object");
 for(const key of Object.keys(value))
   if(!fields.includes(key))throw Error(location+"."+key+": unsupported field");
}
function validateSavedSessionEvidence(attempt:GenericAttempt):void{
 const state=attempt.state,paper=attempt.frozen.paper;
 onlyFields(state,["status","sectionIndex","questionIndex","elapsedMs","sectionElapsedMs",
  "foregroundMs","responses","questionVisits","timingEvidenceVersion","completedSections",
  "completedSectionTimings","visible","clockMs"],"saved session");
 const validTime=(n:unknown):n is number=>typeof n==="number"&&Number.isFinite(n)&&n>=0;
 if(!validTime(state.elapsedMs)||!validTime(state.sectionElapsedMs)||
    !validTime(state.foregroundMs)||!Number.isFinite(state.clockMs)||
    typeof state.visible!=="boolean"||
    state.sectionElapsedMs>state.elapsedMs+0.001||
    state.foregroundMs>state.elapsedMs+0.001)
   throw Error("Invalid saved session clock/timing totals");
 if(paper.timing.kind==="whole-paper"&&state.elapsedMs>paper.timing.durationMs+0.001)
   throw Error("Invalid saved whole-paper timer duration");
 if(paper.timing.kind==="sectional"){
   const sectionId=paper.sections[state.sectionIndex]?.id;
   const limit=paper.timing.sectionLimits.find(item=>item.sectionId===sectionId);
   if(!limit||limit.durationMs!==null&&state.sectionElapsedMs>limit.durationMs+0.001)
     throw Error("Invalid saved sectional timer duration");
 }
 if(!Array.isArray(state.completedSections)||state.completedSections.length>paper.sections.length||
    state.completedSections.some((n,i)=>n!==i))
   throw Error("Invalid saved completed-section sequence");
 if(state.status==="paused"&&(paper.timing.kind==="untimed"||
     paper.timing.pausePolicy==="forbidden"))
   throw Error("Invalid saved paused exam policy");
 if(state.timingEvidenceVersion!==1||
    !Array.isArray(state.questionVisits)||!Array.isArray(state.completedSectionTimings))
   throw Error("Missing canonical saved timing evidence");
 for(const entry of state.questionVisits)
   onlyFields(entry,["questionRevisionId","count"],"saved question visit");
 for(const entry of state.completedSectionTimings)
   onlyFields(entry,["sectionId","sectionIndex","durationMs","reason"],"saved section timing");
 let accumulated=0;
 for(const row of state.responses){
   onlyFields(row,["questionRevisionId","response","flagged","timeSpentMs",
     "firstVisitMs","preFirstAnswerMs","firstAnsweredAt",
     "answerChangeCount","answerEvents"],"saved response row");
   if(typeof row.flagged!=="boolean")
     throw Error("Invalid saved response flag");
   accumulated+=row.timeSpentMs;
   if(row.answerEvents!==undefined)
     for(const event of row.answerEvents)
       onlyFields(event,["at","from","to"],"saved answer change");
 }
 if(!Number.isFinite(accumulated)||accumulated>state.foregroundMs+0.001)
   throw Error("Invalid saved foreground question-time total");
 if(attempt.explanations!==undefined){
   onlyFields(attempt.explanations,
     paper.sections.flatMap(section=>section.questionRevisionIds),"saved explanations");
   for(const explanation of Object.values(attempt.explanations))
     if(typeof explanation!=="string"||explanation.length>20000)
       throw Error("Invalid saved explanation text");
 }
 if(attempt.manualGrades!==undefined)
   for(const grade of attempt.manualGrades)
     onlyFields(grade,["questionRevisionId","marks","note","gradedAt"],"saved manual grade");
 if(attempt.result!==undefined){
   onlyFields(attempt.result,["items","snapshot"],"saved score");
   onlyFields(attempt.result.snapshot,["earnedMarks","positiveMarks","penaltyMarks",
    "correctCount","incorrectCount","unansweredCount","excludedCount","calculatedAt"],
    "saved score snapshot");
 }
}


/** Treat browser records and exported JSON as untrusted until their frozen inputs and responses validate. */
export function validateGenericStoredRecord(value:unknown):RecordItem {
 if(!value||typeof value!=="object"||!("saveRevision" in value))
   throw new Error("Stored record requires a CAS revision");
 const n=(value as {saveRevision:unknown}).saveRevision;
 if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0)
   throw new Error("Invalid stored write revision");
 if(isLearning(value)){
   onlyFields(value,["recordType","id","saveRevision","question","answer","stimuli","assets",
     "examId","paperId","paperEdition","sectionTitle","sourceTitle","sourceAttemptId",
     "explanation","note","errorLabel","customSubject","customTopic","customSubtopic","syllabusTopicId","bookmarked",
     "revisionDisposition","createdAt","updatedAt","reviews"],"learning card");
   return validateLearningCard(value);
 }
 if(isPackage(value)){
   onlyFields(value,["recordType","id","bundle","saveRevision"],"saved package");
   if(typeof value.id!=="string" || value.id!=="generic-package:"+value.bundle?.paper?.id)
     throw new Error("Invalid imported package record identity");
   validateExamPackage(value.bundle);
   return value;
 }
 if(!isAttempt(value))throw new Error("Unsupported generic history record");
 onlyFields(value,["recordType","saveRevision","id","packageId","startedAt","updatedAt",
   "finishedAt","frozen","state","result","manualGrades","sourceKeyReference",
   "sourceReviewReference","completionReason","notebookLineage","practiceComposition",
   "explanations"],"saved attempt");
 if(typeof value.id!=="string"||!value.id||value.id.length>200||
    typeof value.packageId!=="string"||
    !Number.isFinite(value.startedAt)||!Number.isFinite(value.updatedAt)||
    (value.finishedAt!==null&&!Number.isFinite(value.finishedAt))||
    !value.state||!Array.isArray(value.state.responses)||
    !Number.isFinite(value.state.clockMs)||
    !Number.isInteger(value.state.sectionIndex)||!Number.isInteger(value.state.questionIndex))
   throw new Error("Invalid generic attempt record");
 if(!isVerifiedSharedFrozen(value.frozen))assertFrozenContent(value.frozen);
 const paper=value.frozen.paper;
 if(value.packageId!==paper.id)throw new Error("Attempt references an incorrect revision");
 validateSavedSessionEvidence(value);
 const current=paper.sections[value.state.sectionIndex]?.questionRevisionIds[value.state.questionIndex];
 if(!current)throw new Error("Attempt cursor references an unknown question");
 if(value.finishedAt!==null && value.state.status!=="completed")
   throw new Error("Completed attempt has an unfinished session");
 if(value.finishedAt===null && value.state.status==="completed")
   throw new Error("Unfinished attempt has a completed session");
 if(value.finishedAt===null){
   if(value.completionReason!==null||value.result!==undefined)
     throw new Error("Unfinished attempt cannot contain completion provenance or a score");
 }else{
   if(!["time-expired","submitted","section-submitted"].includes(value.completionReason??""))
     throw new Error("Completed attempt requires valid completion provenance");
 }
 if(!["running","paused","section-expired","completed"].includes(value.state.status))
   throw new Error("Invalid saved session status");
 validateSectionTimingEvidence(paper,value.state);
 if(value.state.status==="section-expired"){
   if(paper.timing.kind!=="sectional"||paper.timing.transition!=="manual")
     throw new Error("Expired-section state requires manual sectional timing");
   const limit=paper.timing.sectionLimits.find(x=>x.sectionId===paper.sections[value.state.sectionIndex]?.id);
   if(limit?.durationMs==null||value.state.sectionElapsedMs!==limit.durationMs)
     throw new Error("Expired-section state must be exactly at its section time limit");
 }
 const questionMap=new Map(value.frozen.questions.map(q=>[q.id,q]));
 const allowed=new Set(paper.sections.flatMap(section=>section.questionRevisionIds));
 if(value.state.timingEvidenceVersion!==1)
   throw new Error("Invalid question timing evidence version");
 const visits=value.state.questionVisits;
 if(!Array.isArray(visits)||visits.length===0||visits.length>allowed.size||
    new Set(visits.map(row=>row?.questionRevisionId)).size!==visits.length||
    visits.some(row=>!row||!allowed.has(row.questionRevisionId)||
      !Number.isSafeInteger(row.count)||row.count<1||row.count>1000000))
   throw new Error("Invalid saved question visit history");
 const seen=new Set<string>();
 for(const row of value.state.responses){
   if(!row || typeof row.questionRevisionId!=="string" ||
      !allowed.has(row.questionRevisionId) || seen.has(row.questionRevisionId)||
      !Number.isFinite(row.timeSpentMs)||row.timeSpentMs<0 ||
      !Number.isInteger(row.answerChangeCount)||row.answerChangeCount<0)
     throw new Error("Invalid saved response");
   seen.add(row.questionRevisionId);
   const first=row.firstVisitMs,pre=row.preFirstAnswerMs;
   if(!Number.isFinite(first)||!Number.isFinite(pre)||
      first<0||pre<0||first>row.timeSpentMs||pre>row.timeSpentMs||
      !Number.isSafeInteger(first)||!Number.isSafeInteger(pre))
     throw new Error("Invalid saved question timing phase evidence");
   if(row.firstAnsweredAt!==undefined&&
      (typeof row.firstAnsweredAt!=="string"||
       !Number.isFinite(Date.parse(row.firstAnsweredAt))||
       Date.parse(row.firstAnsweredAt)<value.startedAt||
       Date.parse(row.firstAnsweredAt)>value.updatedAt))
     throw new Error("Invalid saved first-answer timing");
   if(row.response)validateResponse(questionMap.get(row.questionRevisionId)!,row.response);
   if(row.firstAnsweredAt!==undefined){
     const firstCommit=row.answerEvents?.find((x:{readonly at:string;readonly to?:unknown})=>x.to!==undefined);
     if(!firstCommit||firstCommit.at!==row.firstAnsweredAt)
       throw new Error("Inconsistent saved first-answer timing");
   }
   if(row.answerEvents!==undefined){
     if(!Array.isArray(row.answerEvents)||row.answerEvents.length>1000)
       throw new Error("Invalid saved answer revision history");
     let previousEvent:typeof row.answerEvents[number]|undefined;
     let previousTime=value.startedAt;
     for(const event of row.answerEvents){
       if(!event||typeof event.at!=="string"||!Number.isFinite(Date.parse(event.at))||
          Date.parse(event.at)<previousTime||Date.parse(event.at)>value.updatedAt||
          (!event.from&&!event.to))throw new Error("Invalid saved answer revision event");
       if(event.from)validateResponse(questionMap.get(row.questionRevisionId)!,event.from);
       if(event.to)validateResponse(questionMap.get(row.questionRevisionId)!,event.to);
       if(previousEvent&&JSON.stringify(previousEvent.to??null)!==JSON.stringify(event.from??null))
         throw new Error("Disconnected saved answer revision history");
       previousTime=Date.parse(event.at);previousEvent=event;
     }
     if(previousEvent&&JSON.stringify(previousEvent.to??null)!==JSON.stringify(row.response??null))
       throw new Error("Saved answer revision does not match final response");
   }
 }
 if(value.finishedAt!==null){
   if(!value.result)throw new Error("Completed attempt has no immutable score");
   const recalculated=scoreAttempt(paper,value.frozen.key,value.frozen.questions,value.state.responses,
     value.result.snapshot.calculatedAt);
   const fields=["earnedMarks","positiveMarks","penaltyMarks","correctCount","incorrectCount","unansweredCount","excludedCount"] as const;
   if(fields.some(field=>value.result!.snapshot[field]!==recalculated.snapshot[field])||
      JSON.stringify(value.result.items)!==JSON.stringify(recalculated.items)||
      typeof value.result.snapshot.calculatedAt!=="string"||
      !Number.isFinite(Date.parse(value.result.snapshot.calculatedAt)))
     throw new Error("Completed attempt score does not match its frozen inputs (summary or item verdict)");
 }
 validateManualGrades(value);
 validateSourceKeyReference(value);
 validateSourceReviewReference(value);
 if(value.finishedAt!==null){
   const lastSection=value.state.completedSectionTimings.at(-1);
   if(value.completionReason==="time-expired"){
     const wholeExpired=paper.timing.kind==="whole-paper"&&
       Math.abs(value.state.elapsedMs-paper.timing.durationMs)<0.001;
     const sectionExpired=paper.timing.kind==="sectional"&&lastSection?.reason==="time-expired";
     if(!wholeExpired&&!sectionExpired)
       throw new Error("Time-expired completion does not match recorded timer evidence");
   }else if(value.completionReason==="section-submitted"){
     if(paper.timing.kind!=="sectional"||lastSection?.reason!=="submitted")
       throw new Error("Section-submitted completion does not match section evidence");
   }else if(value.completionReason==="submitted"&&paper.timing.kind==="sectional"){
     throw new Error("Sectional completion must use section completion provenance");
   }
 }
 validateNotebookLineage(value);
 validatePracticeComposition(value);
 return value;
}
