import type { ExamPackage } from "../domain/exam-package.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {PracticeComposition,PracticeFilters} from "../domain/attempt.js";
export type {PracticeComposition,PracticeFilters} from "../domain/attempt.js";
import { validateExamPackage } from "../domain/exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { PaperRevision,SectionDefinition } from "../domain/exam.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { PaperId,PaperRevisionId,AnswerKeyRevisionId,QuestionRevisionId } from "../domain/ids.js";
import { answerKeyRevisionHash,paperRevisionHash } from "../domain/integrity.ts";
import { selectDisplayResources } from "../domain/media.ts";
import { hashJson,sha256 } from "../domain/hash.ts";

/** This is a composition of ONE already validated, precisely selected paper.
 * No cross-exam mixing, guessed topics, or new scoring engine. */
export const PRACTICE_ELIGIBLE_STATUSES = ["verified","corrected","caution"] as const;
export interface PracticeRequest {
 readonly count:number;
 readonly seed:string;
 readonly filters:PracticeFilters;
}
export interface PracticeInventory {
 readonly eligible:number;
 readonly sectionChoices:readonly {id:string;title:string;count:number}[];
 readonly topics:readonly {id:string;count:number}[];
 readonly difficulties:readonly {id:string;count:number}[];
 readonly excluded:number;
 readonly cautions:number;
}
interface Candidate {readonly question:QuestionRevision;readonly section:SectionDefinition}
function candidates(source:ExamPackage,filters:PracticeFilters):Candidate[]{
 const byId=new Map(source.questions.map(q=>[q.id,q]));
 const eligible:Candidate[]=[];
 for(const section of source.paper.sections){
  for(const id of section.questionRevisionIds){
   const q=byId.get(id);
   if(!q)throw Error("Invalid source question inventory");
   if(!PRACTICE_ELIGIBLE_STATUSES.some(s=>s===q.editorial.status))continue;
   if(filters.sectionId&&section.id!==filters.sectionId)continue;
   if(filters.topicId&&!(q.content.topicIds??[]).includes(filters.topicId as never))continue;
   if(filters.difficulty&&!(q.content.tags??[]).includes("difficulty:"+filters.difficulty))continue;
   eligible.push({question:q,section});
  }
 }
 return eligible;
}

export function practiceInventory(source:ExamPackage,filters:PracticeFilters={}):PracticeInventory{
 validateExamPackage(source);
 const all=candidates(source,{});
 const scoped=candidates(source,filters);
 const count=(values:readonly string[])=>[...new Set(values)].sort().map(id=>({
   id,count:scoped.filter(({question})=>(
     (question.content.topicIds??[]).includes(id as never)||
     (question.content.tags??[]).includes("difficulty:"+id))).length
 }));
 const sectionChoices=source.paper.sections.map(s=>({
   id:s.id,title:s.title,
   count:scoped.filter(q=>q.section.id===s.id).length
 })).filter(s=>s.count>0);
 const topics=count(scoped.flatMap(({question})=>[...(question.content.topicIds??[])]));
 const difficulties=count(scoped.flatMap(({question})=>
   (question.content.tags??[]).filter(t=>/^difficulty:(easy|medium|hard)$/.test(t))
     .map(t=>t.slice("difficulty:".length))));
 return {eligible:scoped.length,excluded:source.questions.length-all.length,
   cautions:scoped.filter(c=>c.question.editorial.status==="caution").length,
   sectionChoices,topics,difficulties};
}

function draw(items:readonly Candidate[],seed:string):Candidate[]{
 // SHA-256 derives the state; Fisher-Yates is deterministic across engines.
 let state=parseInt(sha256(seed).slice(0,8),16)>>>0;
 if(!state)state=0x9e3779b9;
 const next=()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return state>>>0};
 const out=[...items];
 for(let i=out.length-1;i>0;i--){
   const j=next()%(i+1),hold=out[i]!;
   out[i]=out[j]!;out[j]=hold;
 }
 return out;
}

export function composePracticeSet(source:ExamPackage,request:PracticeRequest):{
 readonly bundle:ExamPackage;
 readonly manifest:PracticeComposition;
}{
 validateExamPackage(source);
 if(!Number.isSafeInteger(request.count)||request.count<1||request.count>2000)
   throw Error("Choose 1–2000 practice questions");
 if(typeof request.seed!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(request.seed))
   throw Error("Practice seed must contain 1–80 letters, digits, underscores or hyphens");
 const f=request.filters;
 if(!f||typeof f!=="object"||
   [f.sectionId,f.topicId,f.difficulty].some(v=>v!==undefined&&
      (typeof v!=="string"||!v||v.length>512)))
   throw Error("Invalid practice filters");
 const pool=candidates(source,f);
 if(pool.length<request.count)
   throw Error("Only "+pool.length+" eligible question"+(pool.length===1?"":"s")+
     " available for these filters; requested "+request.count+". Reduce the count or change the filters.");
 const sourceFingerprint=hashJson({paper:source.paper.id,paperHash:source.paper.contentHash,
   key:source.answerKey.id,keyHash:source.answerKey.contentHash,
   questions:source.questions.map(q=>[q.id,q.contentHash]),seed:request.seed,filters:f,count:request.count});
 const picked=draw(pool,sourceFingerprint).slice(0,request.count);
 const ids=picked.map(c=>c.question.id);
 if(new Set(ids).size!==ids.length)throw Error("Duplicate question revisions in selection");
 const included=new Set(ids);
 const sections=source.paper.sections.map(section=>({
   ...section,questionRevisionIds:ids.filter(id=>
     section.questionRevisionIds.includes(id as QuestionRevisionId)) as QuestionRevisionId[]
 })).filter(s=>s.questionRevisionIds.length>0);
 const entries=source.answerKey.entries.filter(e=>included.has(e.questionRevisionId));
 if(entries.length!==ids.length)throw Error("Selected questions have incomplete answer keys");
 const paperId=("practice-set:"+sourceFingerprint.slice(0,32)) as PaperId;
 const keyId=(paperId+":key") as AnswerKeyRevisionId;
 const answerKey:AnswerKeyRevision={id:keyId,paperId,revision:1,entries,
   contentHash:answerKeyRevisionHash({entries})};
 const timing=source.paper.timing.kind==="sectional"?
   {...source.paper.timing,sectionLimits:source.paper.timing.sectionLimits.filter(limit=>
     sections.some(s=>s.id===limit.sectionId))}:source.paper.timing;
 const paperBase:Omit<PaperRevision,"contentHash">={
   id:(paperId+":paper") as PaperRevisionId,paperId,revision:1,
   edition:source.paper.edition,answerKeyRevisionId:keyId,
   ...(source.paper.edition==="reviewed"?{
     sourcePaperRevisionId:source.paper.sourcePaperRevisionId,
     sourceAnswerKeyRevisionId:source.paper.sourceAnswerKeyRevisionId
   }:{}),
   sections,timing,navigation:source.paper.navigation,
   ...(source.paper.candidateTools?{candidateTools:source.paper.candidateTools}:{}),
   scoring:source.paper.scoring
 };
 const paper:PaperRevision={...paperBase,contentHash:paperRevisionHash(paperBase)};
 const questions=picked.map(c=>c.question);
 const resources=selectDisplayResources(questions,source.stimuli??[],source.assets??[]);
 const explanations=Object.fromEntries(Object.entries(source.explanations??{}).filter(([id])=>included.has(id as QuestionRevisionId)));
 const bundle:ExamPackage={format:"practice-desk-exam",version:1,
   examId:source.examId,title:source.title+" · Custom set ("+request.count+")",
   paper,answerKey,questions,...resources,explanations,
   ...(source.practiceMode?{practiceMode:source.practiceMode}:{})};
 validateExamPackage(bundle);
 const core:Omit<PracticeComposition,"contentHash">={
   schema:1,sourceExamId:source.examId,sourcePaperRevisionId:source.paper.id,
   sourcePaperHash:source.paper.contentHash,sourceAnswerKeyRevisionId:source.answerKey.id,
   sourceAnswerKeyHash:source.answerKey.contentHash,seed:request.seed,filters:{...f},
   eligibleCount:pool.length,selectedQuestionRevisionIds:ids,
   selectedQuestionHashes:questions.map(q=>q.contentHash),
   generatedPaperRevisionId:paper.id,generatedAnswerKeyRevisionId:answerKey.id
 };
 return {bundle,manifest:{...core,contentHash:hashJson(core)}};
}

/** Frozen provenance: no source bank or mutation-prone external lookup needed. */
export function validatePracticeComposition(attempt:GenericAttempt):void{
 const c=attempt.practiceComposition;
 if(!c)return;
 if(c.schema!==1||typeof c.seed!=="string"||
    !/^[A-Za-z0-9_-]{1,80}$/.test(c.seed)||
    !Array.isArray(c.selectedQuestionRevisionIds)||
    !Array.isArray(c.selectedQuestionHashes)||
    !Number.isSafeInteger(c.eligibleCount)||
    c.eligibleCount<c.selectedQuestionRevisionIds.length||
    c.selectedQuestionRevisionIds.length<1||
    c.selectedQuestionRevisionIds.length!==attempt.frozen.questions.length||
    c.selectedQuestionHashes.length!==attempt.frozen.questions.length||
    ![c.sourceExamId,c.sourcePaperRevisionId,c.sourceAnswerKeyRevisionId]
      .every(v=>typeof v==="string"&&v.length>0&&v.length<=512)||
    ![c.sourcePaperHash,c.sourceAnswerKeyHash].every(v=>
      typeof v==="string"&&/^[a-f0-9]{64}$/.test(v))||
    !c.filters||typeof c.filters!=="object"||Array.isArray(c.filters)||
    Object.keys(c.filters).some(k=>!["sectionId","topicId","difficulty"].includes(k))||
    Object.values(c.filters).some(v=>typeof v!=="string"||!v||v.length>512)||
    c.eligibleCount>2000||
    c.sourceExamId!==attempt.frozen.snapshot.examId||
    c.generatedPaperRevisionId!==attempt.frozen.paper.id||
    c.generatedAnswerKeyRevisionId!==attempt.frozen.key.id||
    !attempt.frozen.paper.paperId.startsWith("practice-set:"))
   throw Error("Invalid custom practice manifest");
 const {contentHash,...core}=c;
 if(contentHash!==hashJson(core))throw Error("Custom practice manifest hash mismatch");
 const frozenIds=attempt.frozen.questions.map(q=>q.id);
 if(JSON.stringify(c.selectedQuestionRevisionIds)!==JSON.stringify(frozenIds)||
    JSON.stringify(c.selectedQuestionHashes)!==
      JSON.stringify(attempt.frozen.questions.map(q=>q.contentHash)))
   throw Error("Custom practice question provenance differs from frozen content");
}
