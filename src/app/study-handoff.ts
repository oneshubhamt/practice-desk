import type {CorrectAnswer} from "../domain/answer-key.ts";
import {
 candidateHighlightSurfaceKey,candidateHighlightText,eliminatedOptionIdsForQuestion,
 type CandidateHighlight
} from "../domain/candidate-scratch.ts";
import type {CandidateResponse,QuestionRevision} from "../domain/question.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {Verdict} from "../engine/scoring.ts";
import {readableAnswer} from "./exam-package.ts";

export const STUDY_HANDOFF_MAX_QUESTIONS=2000;
export const STUDY_HANDOFF_MAX_PACKET_CHARS=6*1024*1024;
export const STUDY_HANDOFF_MAX_OUTPUT_CHARS=8*1024*1024;

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
 readonly number:number;readonly questionRevisionId:string;readonly questionId:string;
 readonly section:{readonly id:string;readonly title:string};
 readonly content?:{readonly kind:QuestionRevision["content"]["kind"];readonly text:string};
 readonly selected?:{readonly response:CandidateResponse;readonly text:string};
 readonly expected?:{readonly answer:CorrectAnswer;readonly text:string};
 readonly outcome?:{readonly verdict:Verdict;readonly marks:number};
 readonly timing?:{readonly foregroundMs:number};readonly flagged?:boolean;
 readonly annotations?:StudyHandoffAnnotations;
}
export interface StudyHandoffPacket{
 readonly format:"practice-desk-study-handoff";readonly version:1;
 readonly purpose:"completed-attempt-study-review";
 readonly source:{readonly examId:string;readonly paperId:string;readonly paperRevisionId:string;
  readonly edition:string;readonly mode:string;readonly completionReason:string|null;readonly reviewReleased:boolean};
 readonly inclusion:StudyHandoffSelection;
 readonly privacy:{readonly scope:"single-completed-attempt";readonly omitted:readonly string[]};
 readonly totalQuestions:number;readonly includedQuestions:number;readonly truncated:boolean;
 readonly questions:readonly StudyHandoffQuestion[];
}

function questionText(attempt:GenericAttempt,question:QuestionRevision):string{
 const content=question.content,parts=[content.prompt];
 if(content.stimulusId){
  const stimulus=attempt.frozen.stimuli.find(row=>row.id===content.stimulusId);
  if(stimulus){
   if("text" in stimulus)parts.push(stimulus.text);
   else if("columns" in stimulus)parts.push(stimulus.columns.join(" | "),
    ...stimulus.rows.map(row=>row.join(" | ")));
   else parts.push(stimulus.altText,...(stimulus.caption?[stimulus.caption]:[]));
  }
 }
 if("options" in content)parts.push(...content.options.map(option=>option.id+". "+option.text));
 else if(content.kind==="matching")parts.push(
  ...content.leftItems.map(item=>item.id+". "+item.text),
  ...content.rightItems.map(item=>item.id+". "+item.text));
 return parts.filter(Boolean).join("\n");
}
function belongs(highlight:CandidateHighlight,question:QuestionRevision):boolean{
 const surface=highlight.surface;
 return "questionRevisionId" in surface?surface.questionRevisionId===question.id:
  question.content.stimulusId!==undefined&&surface.stimulusId===question.content.stimulusId;
}
function annotations(attempt:GenericAttempt,question:QuestionRevision):StudyHandoffAnnotations{
 const eliminatedOptions=eliminatedOptionIdsForQuestion(attempt.candidateScratch,question.id).map(optionId=>{
  const option="options" in question.content?question.content.options.find(row=>row.id===optionId):undefined;
  if(!option)throw Error("Candidate elimination does not resolve to a frozen option");
  return {optionId:option.id,text:option.text};
 });
 const context={questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli};
 const highlights=attempt.candidateScratch.highlights.filter(row=>belongs(row,question)).map(row=>({
  color:row.color,surface:candidateHighlightSurfaceKey(row.surface),excerpt:candidateHighlightText(row,context)
 }));
 return {eliminatedOptions,highlights};
}
export function buildStudyHandoffPacket(
 attempt:GenericAttempt,selection:StudyHandoffSelection=DEFAULT_STUDY_HANDOFF_SELECTION
):StudyHandoffPacket{
 if(attempt.finishedAt===null||!attempt.result)throw Error("Study Handoff requires a completed attempt");
 const reviewReleased=attempt.frozen.paper.navigation.allowReview!==false;
 const inclusion={...selection,expectedResponses:selection.expectedResponses&&reviewReleased};
 const omitted=["identity","device-information","attempt-id","calendar-timestamps","unrestricted-history",
  "other-attempts","learning-history","worked-explanations","reviewer-notes","source-urls","binary-media"];
 if(!inclusion.candidateResponses)omitted.push("candidate-responses");
 if(!inclusion.expectedResponses)omitted.push("expected-responses");
 if(!inclusion.annotations)omitted.push("candidate-scratch");
 if(!reviewReleased)omitted.push("unreleased-answer-key");
 const ordered=attempt.frozen.paper.sections.flatMap(section=>
  section.questionRevisionIds.map(questionRevisionId=>({section,questionRevisionId})));
 if(ordered.length>STUDY_HANDOFF_MAX_QUESTIONS)throw Error("Study Handoff exceeds the question limit");
 const questionsById=new Map(attempt.frozen.questions.map(row=>[row.id,row]));
 const responses=new Map(attempt.state.responses.map(row=>[row.questionRevisionId,row]));
 const answers=new Map(attempt.frozen.key.entries.map(row=>[row.questionRevisionId,row.answer]));
 const outcomes=new Map(attempt.result.items.map(row=>[row.questionRevisionId,row]));
 const base={format:"practice-desk-study-handoff" as const,version:1 as const,
  purpose:"completed-attempt-study-review" as const,
  source:{examId:attempt.frozen.snapshot.examId,paperId:attempt.frozen.paper.paperId,
   paperRevisionId:attempt.frozen.paper.id,edition:attempt.frozen.paper.edition,mode:attempt.frozen.snapshot.mode,
   completionReason:attempt.completionReason,reviewReleased},
  inclusion,privacy:{scope:"single-completed-attempt" as const,omitted},totalQuestions:ordered.length};
 const rows:StudyHandoffQuestion[]=[];
 let size=JSON.stringify(base).length;
 for(let i=0;i<ordered.length;i++){
  const item=ordered[i]!,question=questionsById.get(item.questionRevisionId);
  if(!question)throw Error("Study Handoff cannot resolve a frozen question");
  const response=responses.get(question.id),answer=answers.get(question.id),outcome=outcomes.get(question.id);
  if(inclusion.expectedResponses&&!answer)throw Error("Study Handoff cannot resolve the frozen key");
  if(inclusion.outcomes&&!outcome)throw Error("Study Handoff cannot resolve the frozen score");
  const row:StudyHandoffQuestion={
   number:i+1,questionRevisionId:question.id,questionId:question.questionId,
   section:{id:item.section.id,title:item.section.title},
   ...(inclusion.questionContent?{content:{kind:question.content.kind,text:questionText(attempt,question)}}:{}),
   ...(inclusion.candidateResponses&&response?.response?{selected:{
    response:structuredClone(response.response),text:readableAnswer(question,response.response)}}:{}),
   ...(inclusion.expectedResponses&&answer?{expected:{
    answer:structuredClone(answer),text:readableAnswer(question,answer)}}:{}),
   ...(inclusion.outcomes&&outcome?{outcome:{verdict:outcome.verdict,marks:outcome.marks}}:{}),
   ...(inclusion.timing?{timing:{foregroundMs:response?.timeSpentMs??0}}:{}),
   ...(inclusion.flags?{flagged:Boolean(response?.flagged)}:{}),
   ...(inclusion.annotations?{annotations:annotations(attempt,question)}:{})
  };
  const cost=JSON.stringify(row).length+1;
  if(size+cost>STUDY_HANDOFF_MAX_PACKET_CHARS)break;
  rows.push(row);size+=cost;
 }
 return {...base,includedQuestions:rows.length,truncated:rows.length<ordered.length,questions:rows};
}
function bounded(text:string):string{
 if(text.length>STUDY_HANDOFF_MAX_OUTPUT_CHARS)throw Error("Study Handoff exceeds the export size limit");
 return text;
}
export function serializeStudyHandoffJson(packet:StudyHandoffPacket):string{
 return bounded(JSON.stringify(packet)+"\n");
}
function oneLine(text:string):string{return text.replace(/\s+/gu," ").trim();}
function quote(text:string):string{return text.replace(/\r/gu,"").split("\n").map(line=>"> "+line).join("\n");}
export function serializeStudyHandoffMarkdown(packet:StudyHandoffPacket):string{
 const out=["# Practice Desk — Attempt / Study Handoff","",
  "Single completed-attempt export; identity, other History, explanations, source URLs and binary media are omitted.","",
  "Paper: "+oneLine(packet.source.paperId)+" · "+oneLine(packet.source.edition),
  "Questions: "+packet.includedQuestions+" / "+packet.totalQuestions+(packet.truncated?" (truncated)":"")];
 for(const row of packet.questions){
  out.push("","## Q"+row.number+" · "+oneLine(row.section.title));
  if(row.content)out.push("",quote(row.content.text));
  if(row.selected)out.push("","**My response:** "+oneLine(row.selected.text));
  if(row.expected)out.push("**Expected response:** "+oneLine(row.expected.text));
  if(row.outcome)out.push("**Outcome:** "+row.outcome.verdict+" · "+row.outcome.marks+" marks");
  if(row.timing)out.push("**Foreground time:** "+row.timing.foregroundMs+" ms");
  if(row.flagged!==undefined)out.push("**Flagged:** "+(row.flagged?"yes":"no"));
  if(row.annotations){
   for(const option of row.annotations.eliminatedOptions)out.push("**Eliminated:** "+option.optionId+" — "+oneLine(option.text));
   for(const mark of row.annotations.highlights)out.push("**Highlight:** "+mark.color+" · "+mark.surface+" — “"+oneLine(mark.excerpt)+"”");
  }
 }
 return bounded(out.join("\n")+"\n");
}
export function studyHandoffFileName(attempt:GenericAttempt,extension:"md"|"json"):string{
 const id=attempt.frozen.paper.paperId.replace(/[^A-Za-z0-9._-]+/gu,"-").slice(0,80)||"paper";
 return "Practice_Desk_Study_Handoff_"+id+"."+extension;
}
function option(key:keyof StudyHandoffSelection,label:string,checked:boolean,disabled=false,small=""):string{
 return '<label class="mode"><input type="checkbox" data-study-handoff-option="'+key+'"'+
  (checked?" checked":"")+(disabled?" disabled":"")+'><strong>'+label+'</strong>'+
  (small?'<small>'+small+'</small>':"")+'</label>';
}
export function studyHandoffPanelHTML(reviewReleased:boolean):string{
 return '<section class="panel pad"><h2>Attempt / Study Handoff</h2>'+
  '<p class="fine">Export only this completed attempt as bounded Markdown or JSON. Identity, other History, explanations and binary media are omitted.</p>'+
  '<fieldset class="generic-response-group"><legend class="picker">Include in export</legend><div class="generic-modes">'+
   option("questionContent","Question text & context",true)+
   option("candidateResponses","My responses",true,false,"May include text you typed.")+
   option("expectedResponses","Expected responses",reviewReleased,!reviewReleased,
    reviewReleased?"":"This paper does not release detailed answers.")+
   option("outcomes","Marks & verdict",true)+option("timing","Foreground time",true)+
   option("flags","Review flags",true)+option("annotations","Eliminations & highlights",false,false,"Off by default.")+
  '</div></fieldset><div class="row"><button class="btn" type="button" data-study-handoff-format="markdown">Download Markdown</button>'+
  '<button class="btn" type="button" data-study-handoff-format="json">Download JSON</button></div>'+
  '<p class="fine" id="g-study-handoff-status" role="status" aria-live="polite">This export does not modify the attempt.</p></section>';
}
