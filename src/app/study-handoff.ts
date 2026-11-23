import type {CorrectAnswer} from "../domain/answer-key.ts";
import {
 candidateHighlightSurfaceKey,candidateHighlightText,eliminatedOptionIdsForQuestion,type CandidateHighlight
} from "../domain/candidate-scratch.ts";
import type {CandidateResponse,QuestionRevision} from "../domain/question.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {Verdict} from "../engine/scoring.ts";
import {readableAnswer} from "./exam-package.ts";

export const STUDY_HANDOFF_MAX_QUESTIONS=2000;
const PACKET_LIMIT=5*1024*1024;
export const STUDY_HANDOFF_MAX_OUTPUT_CHARS=6*1024*1024;
export interface StudyHandoffSelection{
 readonly questionContent:boolean;readonly candidateResponses:boolean;readonly expectedResponses:boolean;
 readonly outcomes:boolean;readonly timing:boolean;readonly flags:boolean;readonly annotations:boolean;
}
export const DEFAULT_STUDY_HANDOFF_SELECTION:StudyHandoffSelection={
 questionContent:true,candidateResponses:true,expectedResponses:true,outcomes:true,timing:true,flags:true,annotations:false
};
export interface StudyHandoffAnnotations{
 readonly eliminatedOptions:readonly {readonly optionId:string;readonly text:string}[];
 readonly highlights:readonly {readonly color:string;readonly surface:string;readonly excerpt:string}[];
}
export interface StudyHandoffQuestion{
 readonly number:number;readonly questionRevisionId:string;readonly section:string;
 readonly content?:{readonly kind:QuestionRevision["content"]["kind"];readonly text:string};
 readonly selected?:{readonly response:CandidateResponse;readonly text:string};
 readonly expected?:{readonly answer:CorrectAnswer;readonly text:string};
 readonly outcome?:{readonly verdict:Verdict;readonly marks:number};
 readonly timing?:{readonly foregroundMs:number};readonly flagged?:boolean;readonly annotations?:StudyHandoffAnnotations;
}
export interface StudyHandoffPacket{
 readonly format:"practice-desk-study-handoff";readonly version:1;
 readonly source:{readonly examId:string;readonly paperId:string;readonly paperRevisionId:string;
  readonly edition:string;readonly mode:string;readonly reviewReleased:boolean};
 readonly inclusion:StudyHandoffSelection;
 readonly privacy:{readonly scope:"single-completed-attempt";readonly omitted:readonly string[]};
 readonly totalQuestions:number;readonly includedQuestions:number;readonly truncated:boolean;
 readonly questions:readonly StudyHandoffQuestion[];
}

function questionText(attempt:GenericAttempt,question:QuestionRevision):string{
 const c=question.content,p=[c.prompt],s=c.stimulusId&&attempt.frozen.stimuli.find(row=>row.id===c.stimulusId);
 if(s){
  if("text" in s)p.push(s.text);
  else if("columns" in s)p.push(s.columns.join(" | "),...s.rows.map(row=>row.join(" | ")));
  else p.push(s.altText,...(s.caption?[s.caption]:[]));
 }
 if("options" in c)p.push(...c.options.map(o=>o.id+". "+o.text));
 else if(c.kind==="matching")p.push(...c.leftItems.map(x=>x.id+". "+x.text),...c.rightItems.map(x=>x.id+". "+x.text));
 return p.filter(Boolean).join("\n");
}
function belongs(h:CandidateHighlight,q:QuestionRevision):boolean{
 return "questionRevisionId" in h.surface?h.surface.questionRevisionId===q.id:
  q.content.stimulusId!==undefined&&h.surface.stimulusId===q.content.stimulusId;
}
function annotations(a:GenericAttempt,q:QuestionRevision):StudyHandoffAnnotations{
 const eliminatedOptions=eliminatedOptionIdsForQuestion(a.candidateScratch,q.id).map(optionId=>{
  const option="options" in q.content?q.content.options.find(row=>row.id===optionId):undefined;
  if(!option)throw Error("Candidate elimination does not resolve to a frozen option");
  return {optionId:option.id,text:option.text};
 });
 const context={questions:a.frozen.questions,stimuli:a.frozen.stimuli};
 const highlights=a.candidateScratch.highlights.filter(h=>belongs(h,q)).map(h=>({
  color:h.color,surface:candidateHighlightSurfaceKey(h.surface),excerpt:candidateHighlightText(h,context)
 }));
 return {eliminatedOptions,highlights};
}
export function buildStudyHandoffPacket(
 a:GenericAttempt,selection:StudyHandoffSelection=DEFAULT_STUDY_HANDOFF_SELECTION
):StudyHandoffPacket{
 if(a.finishedAt===null||!a.result)throw Error("Study Handoff requires a completed attempt");
 const reviewReleased=a.frozen.paper.navigation.allowReview!==false;
 const inclusion={...selection,expectedResponses:selection.expectedResponses&&reviewReleased};
 const omitted=["identity","device-information","attempt-id","calendar-timestamps","unrestricted-history",
  "worked-explanations","binary-media"];
 if(!inclusion.candidateResponses)omitted.push("candidate-responses");
 if(!inclusion.expectedResponses)omitted.push("expected-responses");
 if(!inclusion.annotations)omitted.push("candidate-scratch");
 if(!reviewReleased)omitted.push("unreleased-answer-key");
 const ordered=a.frozen.paper.sections.flatMap(section=>section.questionRevisionIds.map(id=>({section,id})));
 if(ordered.length>STUDY_HANDOFF_MAX_QUESTIONS)throw Error("Study Handoff exceeds the question limit");
 const qs=new Map(a.frozen.questions.map(x=>[x.id,x])),rs=new Map(a.state.responses.map(x=>[x.questionRevisionId,x])),
  keys=new Map(a.frozen.key.entries.map(x=>[x.questionRevisionId,x.answer])),
  scores=new Map(a.result.items.map(x=>[x.questionRevisionId,x]));
 const base={format:"practice-desk-study-handoff" as const,version:1 as const,
  source:{examId:a.frozen.snapshot.examId,paperId:a.frozen.paper.paperId,paperRevisionId:a.frozen.paper.id,
   edition:a.frozen.paper.edition,mode:a.frozen.snapshot.mode,reviewReleased},
  inclusion,privacy:{scope:"single-completed-attempt" as const,omitted},totalQuestions:ordered.length};
 const rows:StudyHandoffQuestion[]=[];let size=JSON.stringify(base).length;
 for(let i=0;i<ordered.length;i++){
  const item=ordered[i]!,q=qs.get(item.id);if(!q)throw Error("Missing frozen question");
  const r=rs.get(q.id),key=keys.get(q.id),score=scores.get(q.id);
  if(inclusion.expectedResponses&&!key)throw Error("Missing frozen key");
  if(inclusion.outcomes&&!score)throw Error("Missing frozen score");
  const row:StudyHandoffQuestion={number:i+1,questionRevisionId:q.id,section:item.section.title,
   ...(inclusion.questionContent?{content:{kind:q.content.kind,text:questionText(a,q)}}:{}),
   ...(inclusion.candidateResponses&&r?.response?{selected:{response:structuredClone(r.response),text:readableAnswer(q,r.response)}}:{}),
   ...(inclusion.expectedResponses&&key?{expected:{answer:structuredClone(key),text:readableAnswer(q,key)}}:{}),
   ...(inclusion.outcomes&&score?{outcome:{verdict:score.verdict,marks:score.marks}}:{}),
   ...(inclusion.timing?{timing:{foregroundMs:r?.timeSpentMs??0}}:{}),
   ...(inclusion.flags?{flagged:Boolean(r?.flagged)}:{}),
   ...(inclusion.annotations?{annotations:annotations(a,q)}:{})};
  const cost=JSON.stringify(row).length+1;if(size+cost>PACKET_LIMIT)break;
  rows.push(row);size+=cost;
 }
 return {...base,includedQuestions:rows.length,truncated:rows.length<ordered.length,questions:rows};
}
export function serializeStudyHandoffJson(packet:StudyHandoffPacket):string{return JSON.stringify(packet)+"\n";}
export function serializeStudyHandoffMarkdown(packet:StudyHandoffPacket):string{
 return "# Practice Desk — Attempt / Study Handoff\n\n```json\n"+JSON.stringify(packet)+"\n```\n";
}
export function studyHandoffFileName(a:GenericAttempt,extension:"md"|"json"):string{
 const id=a.frozen.paper.paperId.replace(/[^A-Za-z0-9._-]+/gu,"-").slice(0,80)||"paper";
 return "Practice_Desk_Study_Handoff_"+id+"."+extension;
}
function option(k:keyof StudyHandoffSelection,label:string,checked:boolean,disabled=false):string{
 return '<label class="mode"><input type="checkbox" data-study-handoff-option="'+k+'"'+
  (checked?" checked":"")+(disabled?" disabled":"")+'><strong>'+label+'</strong></label>';
}
export function studyHandoffPanelHTML(reviewReleased:boolean):string{
 return '<section class="panel pad"><h2>Attempt / Study Handoff</h2>'+
  '<p class="fine">Single completed-attempt export; identity, other History, explanations and binary media stay out. Saved response text may contain what you typed.</p>'+
  '<div class="generic-modes">'+option("questionContent","Question text & context",true)+
   option("candidateResponses","My responses",true)+option("expectedResponses","Expected responses",reviewReleased,!reviewReleased)+
   option("outcomes","Marks & verdict",true)+option("timing","Foreground time",true)+option("flags","Review flags",true)+
   option("annotations","Eliminations & highlights (opt-in)",false)+'</div>'+
  (reviewReleased?"":'<p class="fine">This paper does not release detailed answers.</p>')+
  '<div class="row"><button class="btn" type="button" data-study-handoff-format="markdown">Download Markdown</button>'+
  '<button class="btn" type="button" data-study-handoff-format="json">Download JSON</button></div>'+
  '<p class="fine" id="g-study-handoff-status" role="status" aria-live="polite"></p></section>';
}
