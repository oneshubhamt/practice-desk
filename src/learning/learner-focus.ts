import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {CandidateResponse,QuestionRevision} from "../domain/question.ts";
import type {LearningCard} from "./learning.ts";
import {parseTopicPathId} from "./syllabus-taxonomy.ts";
import {questionSpeed,questionTimingPhases} from "./question-analytics.ts";
import {isRevisionAttempt} from "./revision-selection.ts";
import {taxonomyPathNodes} from "../domain/taxonomy.ts";

export type LearnerFocusMode="focused"|"detailed";
export type AuthoringIntent="exam-simulation"|"targeted-practice";
export type LearnerFocusSignal=
 "repeated-misses"|"low-observed-accuracy"|"unanswered"|"slower-than-usual"|
 "revisited"|"flagged"|"bookmarked"|"fsrs-due";

export interface LearnerFocusObservation{
 readonly classificationSource:"exam-taxonomy"|"authored-path"|"learner-annotation";
 readonly taxonomyId?:string;
 readonly nodeId?:string;
 readonly subject:string;
 readonly topic?:string;
 readonly subtopic?:string;
 readonly attempts:number;
 readonly answered:number;
 readonly correct:number;
 readonly incorrect:number;
 readonly unanswered:number;
 readonly distinctQuestions:number;
 readonly repeatedMisses:number;
 readonly slowObservations:number;
 readonly revisitedAttempts:number;
 readonly flaggedAttempts:number;
 readonly bookmarkedQuestions:number;
 readonly dueQuestions:number;
 readonly observedAccuracy:number|null;
 readonly recent?:{readonly attempts:number;readonly correct:number;readonly incorrect:number;readonly unanswered:number};
 readonly signals:readonly LearnerFocusSignal[];
}
export interface LearnerFocusQuestionEvidence{
 readonly questionRevisionId:string;
 readonly questionId:string;
 readonly questionHash:string;
 readonly prompt:string;
 readonly classification?:{
  readonly classificationSource:"exam-taxonomy"|"authored-path"|"learner-annotation";
  readonly taxonomyId?:string;readonly nodeId?:string;
  readonly subject:string;readonly topic?:string;readonly subtopic?:string;
 };
 readonly observedAttempts:number;
 readonly wrongAttempts:number;
 readonly lastVerdict:"correct"|"incorrect"|"unanswered";
 readonly selectedResponse?:CandidateResponse;
 readonly foregroundMs:number|null;
 readonly visits:number|null;
 readonly revisited:boolean|null;
 readonly flagged:boolean;
 readonly reasons:readonly LearnerFocusSignal[];
 readonly selfReportedErrorLabel?:string;
 readonly bookmarked:boolean;
 readonly fsrsDue:boolean;
 readonly fsrsReviewCount:number;
 readonly explanation?:string;
}
export interface LearnerFocusPacket{
 readonly format:"practice-desk-learner-focus";
 readonly version:1;
 readonly purpose:"targeted-practice-authoring"|"exam-simulation-authoring";
 readonly mode:LearnerFocusMode;
 readonly intent:AuthoringIntent;
 readonly examId:string;
 readonly asOf:string;
 readonly compositionPolicy:"blueprint-first"|"focus-first-with-blueprint-guardrails";
 readonly privacy:{
  readonly scope:"exam-only";
  readonly omitted:readonly ["identity","device-information","unrelated-exams","unrestricted-history"];
 };
 readonly generationGuidance:readonly string[];
 readonly observations:readonly LearnerFocusObservation[];
 readonly questionEvidence?:readonly LearnerFocusQuestionEvidence[];
}
export interface LearnerFocusOptions{
 readonly examId:string;
 readonly mode:"off"|LearnerFocusMode;
 readonly intent:AuthoringIntent;
 readonly asOf:string;
 readonly maxObservations?:number;
 readonly maxQuestionEvidence?:number;
}

interface Classification{
 classificationSource:"exam-taxonomy"|"authored-path"|"learner-annotation";
 taxonomyId?:string;nodeId?:string;subject:string;topic?:string;subtopic?:string;
}
interface MutableObservation{
 classification:Classification;
 attemptIds:Set<string>;questionIds:Set<string>;
 answered:number;correct:number;incorrect:number;unanswered:number;
 recentAttemptIds:Set<string>;recentCorrect:number;recentIncorrect:number;recentUnanswered:number;
 wrongByRevision:Map<string,Set<string>>;
 slowObservations:number;revisitedAttemptIds:Set<string>;flaggedAttemptIds:Set<string>;
 bookmarkedQuestions:Set<string>;dueQuestions:Set<string>;
}
interface MutableQuestion{
 questionRevisionId:string;questionId:string;questionHash:string;prompt:string;
 classification?:Classification;observedAttemptIds:Set<string>;wrongAttemptIds:Set<string>;
 lastFinishedAt:number;lastVerdict:"correct"|"incorrect"|"unanswered";
 selectedResponse?:CandidateResponse;foregroundMs:number|null;visits:number|null;
 revisited:boolean|null;flagged:boolean;slow:boolean;
 selfReportedErrorLabel?:string;bookmarked:boolean;fsrsDue:boolean;fsrsReviewCount:number;
 explanation?:string;
}

const RECENT_MS=30*24*60*60*1000;
const text=(value:unknown,label:string,max:number):string=>{
 if(typeof value!=="string"||!value.trim()||value!==value.trim()||value.length>max||
   /[\u0000-\u001f\u007f]/u.test(value))throw Error("Invalid "+label);
 return value;
};
const dateTime=(value:unknown,label:string):string=>{
 const x=text(value,label,40),ms=Date.parse(x);
 if(!Number.isFinite(ms))throw Error("Invalid "+label);
 return new Date(ms).toISOString();
};
const boundedInt=(value:unknown,label:string,min:number,max:number):number=>{
 if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw Error("Invalid "+label);
 return Number(value);
};
const plain=(value:unknown,label:string):Record<string,unknown>=>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error(label+" must be a plain object");
 return value as Record<string,unknown>;
};
const only=(row:Record<string,unknown>,allowed:readonly string[],label:string):void=>{
 for(const key of Object.keys(row))if(!allowed.includes(key))throw Error(label+" contains unsupported field "+key);
};
const cloneResponse=(response:CandidateResponse|undefined):CandidateResponse|undefined=>
 response===undefined?undefined:structuredClone(response);

function attemptClassification(a:GenericAttempt,q:QuestionRevision):Classification|undefined{
 const nodeId=a.frozen.taxonomyAssignments?.[q.id];
 if(a.frozen.taxonomy&&nodeId){
  const path=taxonomyPathNodes(a.frozen.taxonomy,nodeId);
  const labels=path.map(x=>x.label);
  return {classificationSource:"exam-taxonomy",taxonomyId:a.frozen.taxonomy.id,nodeId,
   subject:labels[0]!,...(labels[1]?{topic:labels[1]}:{}),...(labels[2]?{subtopic:labels[2]}:{})};
 }
 const paths=(q.content.topicIds??[]).map(parseTopicPathId)
  .filter((path):path is readonly string[]=>path!==null).sort((a,b)=>b.length-a.length);
 const path=paths[0];
 if(path?.length)return {classificationSource:"authored-path",subject:path[0]!,
   ...(path[1]?{topic:path[1]}:{}),...(path[2]?{subtopic:path[2]}:{})};
 return undefined;
}
function cardClassification(card:LearningCard,known?:Classification):Classification|undefined{
 if(known)return known;
 const subject=card.customSubject?.trim()??"",topic=card.customTopic.trim(),
  subtopic=card.customSubtopic?.trim()??"";
 if(!subject&&!topic)return undefined;
 return {classificationSource:"learner-annotation",subject:subject||"Unclassified",
  ...(topic?{topic}:{}),...(subtopic?{subtopic}:{})};
}
const classificationKey=(c:Classification)=>c.taxonomyId&&c.nodeId?
 "taxonomy:"+c.taxonomyId+":"+c.nodeId:
 "path:"+[c.subject,c.topic??"",c.subtopic??""].join("\u001f");
function observationRow(c:Classification):MutableObservation{
 return {classification:c,attemptIds:new Set(),questionIds:new Set(),answered:0,correct:0,incorrect:0,unanswered:0,
  recentAttemptIds:new Set(),recentCorrect:0,recentIncorrect:0,recentUnanswered:0,
  wrongByRevision:new Map(),slowObservations:0,revisitedAttemptIds:new Set(),flaggedAttemptIds:new Set(),
  bookmarkedQuestions:new Set(),dueQuestions:new Set()};
}
function signals(row:MutableObservation):LearnerFocusSignal[]{
 const out:LearnerFocusSignal[]=[];
 const answered=row.correct+row.incorrect;
 const repeated=[...row.wrongByRevision.values()].filter(ids=>ids.size>=2).length;
 if(repeated)out.push("repeated-misses");
 if(answered>=3&&row.incorrect/answered>=.4)out.push("low-observed-accuracy");
 if(row.unanswered)out.push("unanswered");
 if(row.slowObservations)out.push("slower-than-usual");
 if(row.revisitedAttemptIds.size)out.push("revisited");
 if(row.flaggedAttemptIds.size)out.push("flagged");
 if(row.bookmarkedQuestions.size)out.push("bookmarked");
 if(row.dueQuestions.size)out.push("fsrs-due");
 return out;
}
const priority=(row:MutableObservation)=>[
 [...row.wrongByRevision.values()].filter(ids=>ids.size>=2).length,
 row.dueQuestions.size,row.incorrect,row.unanswered,row.slowObservations,row.flaggedAttemptIds.size,
 row.revisitedAttemptIds.size,row.bookmarkedQuestions.size,row.attemptIds.size
] as const;
function comparePriority(a:MutableObservation,b:MutableObservation):number{
 const aa=priority(a),bb=priority(b);
 for(let i=0;i<aa.length;i++)if(aa[i]!==bb[i])return bb[i]!-aa[i]!;
 return classificationKey(a.classification).localeCompare(classificationKey(b.classification));
}
const guidance=(intent:AuthoringIntent):readonly string[]=>intent==="exam-simulation"?[
 "Preserve the declared exam/blueprint composition; learner evidence must not distort required coverage or weighting.",
 "Use learner signals only to choose or frame otherwise blueprint-compliant items.",
 "Use fresh wording and transfer where useful; do not reproduce previously attempted questions."
]:[
 "Prioritize observed weak, due and repeated-error areas while remaining within the declared syllabus/blueprint guardrails.",
 "Use fresh transfer questions: same concept may use a different framing and realistic distractors rather than near-duplicates.",
 "Treat timing, flags, revisits and errors as observations, not diagnoses of why the learner struggled.",
 "Do not reproduce previously attempted questions."
];

export function buildLearnerFocusPacket(
 attempts:readonly GenericAttempt[],cards:readonly LearningCard[],dueCardIds:ReadonlySet<string>,options:LearnerFocusOptions
):LearnerFocusPacket|null{
 const examId=text(options.examId,"learner-focus examId",120);
 if(options.mode==="off")return null;
 if(!["focused","detailed"].includes(options.mode))throw Error("Invalid learner-focus mode");
 if(!["exam-simulation","targeted-practice"].includes(options.intent))throw Error("Invalid authoring intent");
 const asOf=dateTime(options.asOf,"learner-focus asOf"),asOfMs=Date.parse(asOf);
 const maxObservations=options.maxObservations===undefined?12:
  boundedInt(options.maxObservations,"maxObservations",1,30);
 const maxDetails=options.maxQuestionEvidence===undefined?12:
  boundedInt(options.maxQuestionEvidence,"maxQuestionEvidence",1,30);
 const groups=new Map<string,MutableObservation>();
 const questions=new Map<string,MutableQuestion>();
 const classificationByRevision=new Map<string,Classification>();
 const sourceAttempts=attempts.filter(a=>a.finishedAt!==null&&a.finishedAt<=asOfMs&&a.result&&
  !isRevisionAttempt(a)&&a.frozen.snapshot.examId===examId);

 for(const a of sourceAttempts){
  const scored=new Map(a.result!.items.map(item=>[item.questionRevisionId,item]));
  const responses=new Map(a.state.responses.map(row=>[row.questionRevisionId,row]));
  for(const q of a.frozen.questions){
   const item=scored.get(q.id);
   if(!item||!["correct","incorrect","unanswered"].includes(item.verdict))continue;
   const classification=attemptClassification(a,q);
   if(classification)classificationByRevision.set(q.id+"|"+q.contentHash,classification);
   const response=responses.get(q.id);
   const phases=questionTimingPhases(a,q.id);
   const verdict=item.verdict as "correct"|"incorrect"|"unanswered";
   if(classification){
    const key=classificationKey(classification),row=groups.get(key)??observationRow(classification);
    row.attemptIds.add(a.id);row.questionIds.add(q.questionId);
    if(verdict==="correct"){row.correct++;row.answered++;}
    if(verdict==="incorrect"){
     row.incorrect++;row.answered++;
     const set=row.wrongByRevision.get(q.id)??new Set<string>();set.add(a.id);row.wrongByRevision.set(q.id,set);
    }
    if(verdict==="unanswered")row.unanswered++;
    if(a.finishedAt!>=asOfMs-RECENT_MS){
     row.recentAttemptIds.add(a.id);
     if(verdict==="correct")row.recentCorrect++;
     if(verdict==="incorrect")row.recentIncorrect++;
     if(verdict==="unanswered")row.recentUnanswered++;
    }
    if(questionSpeed(a,q.id)==="Slow")row.slowObservations++;
    if((phases?.visits??0)>1)row.revisitedAttemptIds.add(a.id);
    if(response?.flagged)row.flaggedAttemptIds.add(a.id);
    groups.set(key,row);
   }
   const signature=q.id+"|"+q.contentHash;
   let detail=questions.get(signature);
   if(!detail){
    detail={questionRevisionId:q.id,questionId:q.questionId,questionHash:q.contentHash,prompt:q.content.prompt,
     ...(classification?{classification}:{}),observedAttemptIds:new Set(),wrongAttemptIds:new Set(),
     lastFinishedAt:-Infinity,lastVerdict:verdict,foregroundMs:null,visits:null,revisited:null,flagged:false,
     slow:false,bookmarked:false,fsrsDue:false,fsrsReviewCount:0};
    questions.set(signature,detail);
   }
   detail.observedAttemptIds.add(a.id);
   if(verdict==="incorrect")detail.wrongAttemptIds.add(a.id);
   if(a.finishedAt!>=detail.lastFinishedAt){
    detail.lastFinishedAt=a.finishedAt!;detail.lastVerdict=verdict;
    detail.selectedResponse=cloneResponse(response?.response);
    detail.foregroundMs=response?.timeSpentMs??null;detail.visits=phases?.visits??null;
    detail.revisited=phases?phases.visits>1:null;detail.flagged=response?.flagged??false;
    detail.slow=questionSpeed(a,q.id)==="Slow";
    detail.explanation=a.explanations?.[q.id];
   }
  }
 }

 for(const card of cards.filter(c=>c.examId===examId&&Date.parse(c.updatedAt)<=asOfMs)){
  const signature=card.question.id+"|"+card.question.contentHash;
  const classification=cardClassification(card,classificationByRevision.get(signature));
  if(classification){
   const key=classificationKey(classification),row=groups.get(key)??observationRow(classification);
   if(card.bookmarked)row.bookmarkedQuestions.add(card.question.questionId);
   if(dueCardIds.has(card.id))row.dueQuestions.add(card.question.questionId);
   groups.set(key,row);
  }
  let detail=questions.get(signature);
  if(!detail){
   detail={questionRevisionId:card.question.id,questionId:card.question.questionId,
    questionHash:card.question.contentHash,prompt:card.question.content.prompt,
    ...(classification?{classification}:{}),observedAttemptIds:new Set(),wrongAttemptIds:new Set(),
    lastFinishedAt:Date.parse(card.updatedAt),lastVerdict:"unanswered",foregroundMs:null,visits:null,
    revisited:null,flagged:false,slow:false,bookmarked:false,fsrsDue:false,fsrsReviewCount:0};
   questions.set(signature,detail);
  }else if(!detail.classification&&classification)detail.classification=classification;
  detail.bookmarked=detail.bookmarked||card.bookmarked;
  detail.fsrsDue=detail.fsrsDue||dueCardIds.has(card.id);
  detail.fsrsReviewCount=Math.max(detail.fsrsReviewCount,card.reviews.length);
  if(card.errorLabel)detail.selfReportedErrorLabel=card.errorLabel;
  if(!detail.explanation&&card.explanation)detail.explanation=card.explanation;
 }

 const selected=[...groups.values()].filter(row=>signals(row).length>0).sort(comparePriority).slice(0,maxObservations);
 const observations:LearnerFocusObservation[]=selected.map(row=>{
  const repeatedMisses=[...row.wrongByRevision.values()].filter(ids=>ids.size>=2).length;
  const answered=row.correct+row.incorrect;
  const recentCount=row.recentCorrect+row.recentIncorrect+row.recentUnanswered;
  return {...row.classification,attempts:row.attemptIds.size,answered,correct:row.correct,incorrect:row.incorrect,
   unanswered:row.unanswered,distinctQuestions:row.questionIds.size,repeatedMisses,
   slowObservations:row.slowObservations,revisitedAttempts:row.revisitedAttemptIds.size,
   flaggedAttempts:row.flaggedAttemptIds.size,bookmarkedQuestions:row.bookmarkedQuestions.size,
   dueQuestions:row.dueQuestions.size,observedAccuracy:answered?row.correct/answered:null,
   ...(recentCount?{recent:{attempts:row.recentAttemptIds.size,correct:row.recentCorrect,
    incorrect:row.recentIncorrect,unanswered:row.recentUnanswered}}:{}),signals:signals(row)};
 });
 const relevantKeys=new Set(selected.map(row=>classificationKey(row.classification)));
 const detailRows=options.mode==="detailed"?[...questions.values()].filter(row=>{
   const sig=row.classification?classificationKey(row.classification):null;
   return row.wrongAttemptIds.size||row.lastVerdict==="unanswered"||row.slow||row.flagged||
    row.bookmarked||row.fsrsDue||(sig!==null&&relevantKeys.has(sig));
  }).sort((a,b)=>
   Number(b.wrongAttemptIds.size>=2)-Number(a.wrongAttemptIds.size>=2)||
   Number(b.fsrsDue)-Number(a.fsrsDue)||b.wrongAttemptIds.size-a.wrongAttemptIds.size||
   b.lastFinishedAt-a.lastFinishedAt||a.questionRevisionId.localeCompare(b.questionRevisionId)
  ).slice(0,maxDetails).map(row=>{
   const reasons:LearnerFocusSignal[]=[];
   if(row.wrongAttemptIds.size>=2)reasons.push("repeated-misses");
   if(row.lastVerdict==="unanswered")reasons.push("unanswered");
   if(row.slow)reasons.push("slower-than-usual");
   if(row.revisited)reasons.push("revisited");
   if(row.flagged)reasons.push("flagged");
   if(row.bookmarked)reasons.push("bookmarked");
   if(row.fsrsDue)reasons.push("fsrs-due");
   return {questionRevisionId:row.questionRevisionId,questionId:row.questionId,questionHash:row.questionHash,
    prompt:row.prompt,...(row.classification?{classification:row.classification}:{}),
    observedAttempts:row.observedAttemptIds.size,wrongAttempts:row.wrongAttemptIds.size,
    lastVerdict:row.lastVerdict,...(row.selectedResponse?{selectedResponse:row.selectedResponse}:{}),
    foregroundMs:row.foregroundMs,visits:row.visits,revisited:row.revisited,flagged:row.flagged,reasons,
    ...(row.selfReportedErrorLabel?{selfReportedErrorLabel:row.selfReportedErrorLabel}:{}),
    bookmarked:row.bookmarked,fsrsDue:row.fsrsDue,fsrsReviewCount:row.fsrsReviewCount,
    ...(row.explanation?{explanation:row.explanation}:{})};
  }):undefined;

 return {format:"practice-desk-learner-focus",version:1,
  purpose:options.intent==="exam-simulation"?"exam-simulation-authoring":"targeted-practice-authoring",
  mode:options.mode,intent:options.intent,examId,asOf,
  compositionPolicy:options.intent==="exam-simulation"?"blueprint-first":"focus-first-with-blueprint-guardrails",
  privacy:{scope:"exam-only",omitted:["identity","device-information","unrelated-exams","unrestricted-history"]},
  generationGuidance:guidance(options.intent),observations,
  ...(detailRows?{questionEvidence:detailRows}:{})};
}

function validateResponse(value:unknown):CandidateResponse{
 const row=plain(value,"selectedResponse"),kind=text(row.kind,"selectedResponse.kind",40);
 if(kind==="single-choice"){
  only(row,["kind","optionId"],"selectedResponse");return {kind,optionId:text(row.optionId,"optionId",120)} as CandidateResponse;
 }
 if(kind==="multiple-select"){
  only(row,["kind","optionIds"],"selectedResponse");
  if(!Array.isArray(row.optionIds)||row.optionIds.length>26)throw Error("Invalid selectedResponse.optionIds");
  return {kind,optionIds:row.optionIds.map((x,i)=>text(x,"optionIds["+i+"]",120))} as CandidateResponse;
 }
 if(kind==="numeric-entry"){only(row,["kind","value"],"selectedResponse");if(typeof row.value!=="number"||!Number.isFinite(row.value))throw Error("Invalid numeric response");return {kind,value:row.value};}
 if(kind==="true-false"){only(row,["kind","value"],"selectedResponse");if(typeof row.value!=="boolean")throw Error("Invalid true-false response");return {kind,value:row.value};}
 if(kind==="free-response"){only(row,["kind","text"],"selectedResponse");return {kind,text:text(row.text,"free response",20000)};}
 if(kind==="matching"){
  only(row,["kind","pairs"],"selectedResponse");
  if(!Array.isArray(row.pairs)||row.pairs.length>26)throw Error("Invalid matching response");
  return {kind,pairs:row.pairs.map((pair,i)=>{const p=plain(pair,"pair "+i);only(p,["leftId","rightId"],"pair "+i);
   return {leftId:text(p.leftId,"leftId",120),rightId:text(p.rightId,"rightId",120)};})} as CandidateResponse;
 }
 throw Error("Unsupported selectedResponse kind");
}
function validateClassification(value:unknown,label:string):Classification{
 const row=plain(value,label);
 only(row,["classificationSource","taxonomyId","nodeId","subject","topic","subtopic"],label);
 if(!["exam-taxonomy","authored-path","learner-annotation"].includes(String(row.classificationSource)))
  throw Error("Invalid classificationSource");
 const source=row.classificationSource as Classification["classificationSource"];
 const subject=text(row.subject,label+".subject",160);
 const taxonomyId=row.taxonomyId===undefined?undefined:text(row.taxonomyId,label+".taxonomyId",120);
 const nodeId=row.nodeId===undefined?undefined:text(row.nodeId,label+".nodeId",120);
 if(source==="exam-taxonomy"&&(!taxonomyId||!nodeId))throw Error("Exam taxonomy classification needs taxonomyId/nodeId");
 if(source!=="exam-taxonomy"&&(taxonomyId||nodeId))throw Error("Only exam taxonomy classification may carry taxonomyId/nodeId");
 return {classificationSource:source,...(taxonomyId?{taxonomyId}:{}),...(nodeId?{nodeId}:{}),subject,
  ...(row.topic===undefined?{}:{topic:text(row.topic,label+".topic",160)}),
  ...(row.subtopic===undefined?{}:{subtopic:text(row.subtopic,label+".subtopic",160)})};
}
const SIGNALS:readonly LearnerFocusSignal[]=["repeated-misses","low-observed-accuracy","unanswered",
 "slower-than-usual","revisited","flagged","bookmarked","fsrs-due"];
function validateSignalList(value:unknown,label:string):LearnerFocusSignal[]{
 if(!Array.isArray(value)||value.length>SIGNALS.length)throw Error("Invalid "+label);
 const out=value.map(x=>text(x,label,40) as LearnerFocusSignal);
 if(out.some(x=>!SIGNALS.includes(x))||new Set(out).size!==out.length)throw Error("Invalid "+label);
 return out;
}
export function validateLearnerFocusPacket(value:unknown):LearnerFocusPacket{
 const raw=plain(value,"learner focus");
 only(raw,["format","version","purpose","mode","intent","examId","asOf","compositionPolicy","privacy",
  "generationGuidance","observations","questionEvidence"],"learner focus");
 if(raw.format!=="practice-desk-learner-focus"||raw.version!==1)throw Error("Unsupported learner-focus format");
 if(!["focused","detailed"].includes(String(raw.mode)))throw Error("Invalid learner-focus mode");
 if(!["exam-simulation","targeted-practice"].includes(String(raw.intent)))throw Error("Invalid learner-focus intent");
 const mode=raw.mode as LearnerFocusMode,intent=raw.intent as AuthoringIntent;
 const expectedPurpose=intent==="exam-simulation"?"exam-simulation-authoring":"targeted-practice-authoring";
 if(raw.purpose!==expectedPurpose)throw Error("Learner-focus purpose/intent mismatch");
 const policy=intent==="exam-simulation"?"blueprint-first":"focus-first-with-blueprint-guardrails";
 if(raw.compositionPolicy!==policy)throw Error("Learner-focus composition policy mismatch");
 const privacy=plain(raw.privacy,"learner focus privacy");
 only(privacy,["scope","omitted"],"learner focus privacy");
 if(privacy.scope!=="exam-only"||!Array.isArray(privacy.omitted)||
   JSON.stringify(privacy.omitted)!==JSON.stringify(["identity","device-information","unrelated-exams","unrestricted-history"]))
  throw Error("Learner-focus privacy contract mismatch");
 if(!Array.isArray(raw.generationGuidance)||raw.generationGuidance.length<1||raw.generationGuidance.length>8)
  throw Error("Invalid learner-focus guidance");
 const generationGuidance=raw.generationGuidance.map((x,i)=>text(x,"generationGuidance["+i+"]",500));
 if(!Array.isArray(raw.observations)||raw.observations.length>30)throw Error("Invalid learner-focus observations");
 const observations=raw.observations.map((value,index)=>{
  const row=plain(value,"observation "+index);
  only(row,["classificationSource","taxonomyId","nodeId","subject","topic","subtopic","attempts","answered",
   "correct","incorrect","unanswered","distinctQuestions","repeatedMisses","slowObservations","revisitedAttempts",
   "flaggedAttempts","bookmarkedQuestions","dueQuestions","observedAccuracy","recent","signals"],"observation "+index);
  const c=validateClassification(row,"observation "+index);
  const attempts=boundedInt(row.attempts,"attempts",0,100000),answered=boundedInt(row.answered,"answered",0,100000);
  const correct=boundedInt(row.correct,"correct",0,100000),incorrect=boundedInt(row.incorrect,"incorrect",0,100000);
  const unanswered=boundedInt(row.unanswered,"unanswered",0,100000);
  if(correct+incorrect!==answered)throw Error("Learner-focus answered count mismatch");
  const observedAccuracy=row.observedAccuracy===null?null:
   typeof row.observedAccuracy==="number"&&Number.isFinite(row.observedAccuracy)&&row.observedAccuracy>=0&&row.observedAccuracy<=1?row.observedAccuracy:
   (()=>{throw Error("Invalid observedAccuracy");})();
  if((answered===0)!==(observedAccuracy===null))throw Error("Learner-focus accuracy evidence mismatch");
  let recent;
  if(row.recent!==undefined){
   const r=plain(row.recent,"recent");only(r,["attempts","correct","incorrect","unanswered"],"recent");
   recent={attempts:boundedInt(r.attempts,"recent.attempts",0,100000),
    correct:boundedInt(r.correct,"recent.correct",0,100000),
    incorrect:boundedInt(r.incorrect,"recent.incorrect",0,100000),
    unanswered:boundedInt(r.unanswered,"recent.unanswered",0,100000)};
  }
  return {...c,attempts,answered,correct,incorrect,unanswered,
   distinctQuestions:boundedInt(row.distinctQuestions,"distinctQuestions",0,100000),
   repeatedMisses:boundedInt(row.repeatedMisses,"repeatedMisses",0,100000),
   slowObservations:boundedInt(row.slowObservations,"slowObservations",0,100000),
   revisitedAttempts:boundedInt(row.revisitedAttempts,"revisitedAttempts",0,100000),
   flaggedAttempts:boundedInt(row.flaggedAttempts,"flaggedAttempts",0,100000),
   bookmarkedQuestions:boundedInt(row.bookmarkedQuestions,"bookmarkedQuestions",0,100000),
   dueQuestions:boundedInt(row.dueQuestions,"dueQuestions",0,100000),observedAccuracy,
   ...(recent?{recent}:{}),signals:validateSignalList(row.signals,"observation signals")};
 });
 let questionEvidence:LearnerFocusQuestionEvidence[]|undefined;
 if(raw.questionEvidence!==undefined){
  if(mode!=="detailed")throw Error("Question evidence is detailed-mode only");
  if(!Array.isArray(raw.questionEvidence)||raw.questionEvidence.length>30)throw Error("Invalid question evidence");
  questionEvidence=raw.questionEvidence.map((value,index)=>{
   const row=plain(value,"questionEvidence "+index);
   only(row,["questionRevisionId","questionId","questionHash","prompt","classification","observedAttempts","wrongAttempts",
    "lastVerdict","selectedResponse","foregroundMs","visits","revisited","flagged","reasons","selfReportedErrorLabel",
    "bookmarked","fsrsDue","fsrsReviewCount","explanation"],"questionEvidence "+index);
   if(!["correct","incorrect","unanswered"].includes(String(row.lastVerdict)))throw Error("Invalid detailed verdict");
   const foregroundMs=row.foregroundMs===null?null:
    typeof row.foregroundMs==="number"&&Number.isFinite(row.foregroundMs)&&row.foregroundMs>=0?row.foregroundMs:
    (()=>{throw Error("Invalid foregroundMs");})();
   const visits=row.visits===null?null:boundedInt(row.visits,"visits",0,100000);
   if(row.revisited!==null&&typeof row.revisited!=="boolean")throw Error("Invalid revisited");
   if(typeof row.flagged!=="boolean"||typeof row.bookmarked!=="boolean"||typeof row.fsrsDue!=="boolean")
    throw Error("Invalid detailed boolean evidence");
   return {questionRevisionId:text(row.questionRevisionId,"questionRevisionId",160),
    questionId:text(row.questionId,"questionId",160),questionHash:text(row.questionHash,"questionHash",160),
    prompt:text(row.prompt,"prompt",20000),
    ...(row.classification===undefined?{}:{classification:validateClassification(row.classification,"question classification")}),
    observedAttempts:boundedInt(row.observedAttempts,"observedAttempts",0,100000),
    wrongAttempts:boundedInt(row.wrongAttempts,"wrongAttempts",0,100000),
    lastVerdict:row.lastVerdict as LearnerFocusQuestionEvidence["lastVerdict"],
    ...(row.selectedResponse===undefined?{}:{selectedResponse:validateResponse(row.selectedResponse)}),
    foregroundMs,visits,revisited:row.revisited as boolean|null,flagged:row.flagged,
    reasons:validateSignalList(row.reasons,"question reasons"),
    ...(row.selfReportedErrorLabel===undefined?{}:{selfReportedErrorLabel:text(row.selfReportedErrorLabel,"error label",80)}),
    bookmarked:row.bookmarked,fsrsDue:row.fsrsDue,
    fsrsReviewCount:boundedInt(row.fsrsReviewCount,"fsrsReviewCount",0,100000),
    ...(row.explanation===undefined?{}:{explanation:text(row.explanation,"explanation",20000)})};
  });
 }
 if(mode==="focused"&&raw.questionEvidence!==undefined)throw Error("Focused learner focus cannot contain question evidence");
 return {format:"practice-desk-learner-focus",version:1,purpose:expectedPurpose,mode,intent,
  examId:text(raw.examId,"learner-focus examId",120),asOf:dateTime(raw.asOf,"learner-focus asOf"),
  compositionPolicy:policy,privacy:{scope:"exam-only",
   omitted:["identity","device-information","unrelated-exams","unrestricted-history"]},
  generationGuidance,observations,...(questionEvidence?{questionEvidence}:{})};
}
