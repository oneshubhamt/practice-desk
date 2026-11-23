import type {CorrectAnswer} from "../domain/answer-key.ts";
import {
 candidateHighlightText,eliminatedOptionIdsForQuestion,
 type CandidateHighlight,type CandidateHighlightColor,type CandidateHighlightSurface,type CandidateTextAnchor
} from "../domain/candidate-scratch.ts";
import type {CandidateResponse,QuestionRevision,StimulusDefinition} from "../domain/question.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import type {Verdict} from "../engine/scoring.ts";
import {readableAnswer} from "./exam-package.ts";

export const STUDY_HANDOFF_MAX_QUESTIONS=2000;
export const STUDY_HANDOFF_MAX_PACKET_CHARS=6*1024*1024;
export const STUDY_HANDOFF_MAX_OUTPUT_CHARS=8*1024*1024;

export interface StudyHandoffSelection{
 readonly questionContent:boolean;
 readonly candidateResponses:boolean;
 readonly expectedResponses:boolean;
 readonly outcomes:boolean;
 readonly timing:boolean;
 readonly flags:boolean;
 readonly annotations:boolean;
}
export const DEFAULT_STUDY_HANDOFF_SELECTION:StudyHandoffSelection={
 questionContent:true,candidateResponses:true,expectedResponses:true,
 outcomes:true,timing:true,flags:true,annotations:false
};

export type StudyHandoffStimulus=
 | {readonly kind:"passage"|"case";readonly title?:string;readonly text:string}
 | {readonly kind:"table";readonly title?:string;readonly columns:readonly string[];
    readonly rows:readonly (readonly string[])[]}
 | {readonly kind:"chart"|"image";readonly title?:string;readonly altText:string;readonly caption?:string};

export interface StudyHandoffQuestionContent{
 readonly kind:QuestionRevision["content"]["kind"];
 readonly prompt:string;
 readonly stimulus?:StudyHandoffStimulus;
 readonly options?:readonly {readonly id:string;readonly text:string}[];
 readonly leftItems?:readonly {readonly id:string;readonly text:string}[];
 readonly rightItems?:readonly {readonly id:string;readonly text:string}[];
 readonly numericRules?:Readonly<{
  minimum?:number;maximum?:number;decimalPlaces?:number;allowNegative?:boolean;
 }>;
 readonly responseRules?:Readonly<{minWords?:number;maxWords?:number;wordLimit?:number}>;
 readonly selectionRules?:Readonly<{minSelections?:number;maxSelections?:number}>;
}
export interface StudyHandoffResponse{
 readonly response:CandidateResponse;
 readonly text:string;
}
export interface StudyHandoffExpected{
 readonly answer:CorrectAnswer;
 readonly text:string;
}
export interface StudyHandoffOutcome{
 readonly verdict:Verdict;
 readonly marks:number;
}
export interface StudyHandoffHighlight{
 readonly color:CandidateHighlightColor;
 readonly surface:CandidateHighlightSurface;
 readonly anchor:CandidateTextAnchor;
 readonly excerpt:string;
}
export interface StudyHandoffAnnotations{
 readonly eliminatedOptions:readonly {readonly optionId:string;readonly text:string}[];
 readonly highlights:readonly StudyHandoffHighlight[];
}
export interface StudyHandoffQuestion{
 readonly number:number;
 readonly questionRevisionId:string;
 readonly questionId:string;
 readonly section:{readonly id:string;readonly title:string};
 readonly content?:StudyHandoffQuestionContent;
 readonly selected?:StudyHandoffResponse;
 readonly expected?:StudyHandoffExpected;
 readonly outcome?:StudyHandoffOutcome;
 readonly timing?:{readonly foregroundMs:number};
 readonly flagged?:boolean;
 readonly annotations?:StudyHandoffAnnotations;
}
export interface StudyHandoffPacket{
 readonly format:"practice-desk-study-handoff";
 readonly version:1;
 readonly purpose:"completed-attempt-study-review";
 readonly source:{
  readonly examId:string;
  readonly paperId:string;
  readonly paperRevisionId:string;
  readonly edition:string;
  readonly mode:string;
  readonly completionReason:string|null;
  readonly reviewReleased:boolean;
 };
 readonly inclusion:StudyHandoffSelection;
 readonly privacy:{
  readonly scope:"single-completed-attempt";
  readonly omitted:readonly string[];
 };
 readonly totalQuestions:number;
 readonly includedQuestions:number;
 readonly truncated:boolean;
 readonly questions:readonly StudyHandoffQuestion[];
}

function handoffStimulus(stimulus:StimulusDefinition|undefined):StudyHandoffStimulus|undefined{
 if(!stimulus)return undefined;
 if(stimulus.kind==="passage"||stimulus.kind==="case")
  return {kind:stimulus.kind,...(stimulus.title!==undefined?{title:stimulus.title}:{}),text:stimulus.text};
 if(stimulus.kind==="table")
  return {kind:"table",...(stimulus.title!==undefined?{title:stimulus.title}:{}),
   columns:[...stimulus.columns],rows:stimulus.rows.map(row=>[...row])};
 return {kind:stimulus.kind,...(stimulus.title!==undefined?{title:stimulus.title}:{}),
  altText:stimulus.altText,...(stimulus.caption!==undefined?{caption:stimulus.caption}:{})};
}

function handoffContent(attempt:GenericAttempt,question:QuestionRevision):StudyHandoffQuestionContent{
 const content=question.content;
 const stimulus=content.stimulusId?
  handoffStimulus(attempt.frozen.stimuli.find(item=>item.id===content.stimulusId)):undefined;
 const base={kind:content.kind,prompt:content.prompt,...(stimulus?{stimulus}:{})};
 switch(content.kind){
  case "single-choice":
   return {...base,options:content.options.map(option=>({id:option.id,text:option.text}))};
  case "multiple-select":
   return {...base,options:content.options.map(option=>({id:option.id,text:option.text})),
    selectionRules:{
     ...(content.minSelections!==undefined?{minSelections:content.minSelections}:{}),
     ...(content.maxSelections!==undefined?{maxSelections:content.maxSelections}:{})
    }};
  case "numeric-entry":
   return {...base,numericRules:structuredClone(content.numericRules)};
  case "true-false":
   return base;
  case "matching":
   return {...base,leftItems:content.leftItems.map(item=>({id:item.id,text:item.text})),
    rightItems:content.rightItems.map(item=>({id:item.id,text:item.text}))};
  case "free-response":
   return {...base,responseRules:structuredClone(content.responseRules)};
 }
}

function highlightBelongsToQuestion(highlight:CandidateHighlight,question:QuestionRevision):boolean{
 const surface=highlight.surface;
 if(surface.kind==="question-prompt"||surface.kind==="option-text")
  return surface.questionRevisionId===question.id;
 const stimulusId=question.content.stimulusId;
 return stimulusId!==undefined&&surface.stimulusId===stimulusId;
}

function handoffAnnotations(attempt:GenericAttempt,question:QuestionRevision):StudyHandoffAnnotations{
 const eliminatedOptions:{optionId:string;text:string}[]=[];
 const eliminated=eliminatedOptionIdsForQuestion(attempt.candidateScratch,question.id);
 if(eliminated.length){
  if(question.content.kind!=="single-choice"&&question.content.kind!=="multiple-select")
   throw Error("Candidate elimination no longer resolves to a choice question");
  for(const optionId of eliminated){
   const option=question.content.options.find(item=>item.id===optionId);
   if(!option)throw Error("Candidate elimination no longer resolves to a frozen option");
   eliminatedOptions.push({optionId:option.id,text:option.text});
  }
 }
 const context={questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli};
 const highlights=attempt.candidateScratch.highlights.filter(item=>highlightBelongsToQuestion(item,question))
  .map(item=>({
   color:item.color,
   surface:structuredClone(item.surface),
   anchor:structuredClone(item.anchor),
   excerpt:candidateHighlightText(item,context)
  }));
 return {eliminatedOptions,highlights};
}

export function buildStudyHandoffPacket(
 attempt:GenericAttempt,selection:StudyHandoffSelection=DEFAULT_STUDY_HANDOFF_SELECTION
):StudyHandoffPacket{
 if(attempt.finishedAt===null||!attempt.result)throw Error("Study Handoff requires a completed attempt");
 const reviewReleased=attempt.frozen.paper.navigation.allowReview!==false;
 const inclusion:StudyHandoffSelection={...selection,
  expectedResponses:selection.expectedResponses&&reviewReleased};
 const omitted=[
  "identity","device-information","attempt-id","calendar-timestamps","unrestricted-history",
  "other-attempts","learning-history","worked-explanations","reviewer-notes","source-urls","binary-media"
 ];
 if(!inclusion.candidateResponses)omitted.push("candidate-responses");
 if(!inclusion.expectedResponses)omitted.push("expected-responses");
 if(!inclusion.annotations)omitted.push("candidate-scratch");
 if(!reviewReleased)omitted.push("unreleased-answer-key");

 const ordered=attempt.frozen.paper.sections.flatMap(section=>
  section.questionRevisionIds.map(questionRevisionId=>({section,questionRevisionId})));
 if(ordered.length>STUDY_HANDOFF_MAX_QUESTIONS)
  throw Error("Study Handoff question count exceeds the bounded export contract");
 const responses=new Map(attempt.state.responses.map(row=>[row.questionRevisionId,row]));
 const answers=new Map(attempt.frozen.key.entries.map(row=>[row.questionRevisionId,row.answer]));
 const outcomes=new Map(attempt.result.items.map(row=>[row.questionRevisionId,row]));
 const base= {
  format:"practice-desk-study-handoff" as const,version:1 as const,
  purpose:"completed-attempt-study-review" as const,
  source:{
   examId:attempt.frozen.snapshot.examId,
   paperId:attempt.frozen.paper.paperId,
   paperRevisionId:attempt.frozen.paper.id,
   edition:attempt.frozen.paper.edition,
   mode:attempt.frozen.snapshot.mode,
   completionReason:attempt.completionReason,
   reviewReleased
  },
  inclusion,
  privacy:{scope:"single-completed-attempt" as const,omitted},
  totalQuestions:ordered.length
 };
 let budget=JSON.stringify({...base,includedQuestions:0,truncated:false,questions:[]}).length;
 const questions:StudyHandoffQuestion[]=[];
 for(let index=0;index<ordered.length;index++){
  const entry=ordered[index]!;
  const question=attempt.frozen.questions.find(item=>item.id===entry.questionRevisionId);
  if(!question)throw Error("Study Handoff cannot resolve a frozen question");
  const response=responses.get(question.id);
  const answer=answers.get(question.id);
  const outcome=outcomes.get(question.id);
  if(inclusion.expectedResponses&&!answer)throw Error("Study Handoff cannot resolve a frozen expected response");
  if(inclusion.outcomes&&!outcome)throw Error("Study Handoff cannot resolve a frozen score item");
  const row:StudyHandoffQuestion={
   number:index+1,questionRevisionId:question.id,questionId:question.questionId,
   section:{id:entry.section.id,title:entry.section.title},
   ...(inclusion.questionContent?{content:handoffContent(attempt,question)}:{}),
   ...(inclusion.candidateResponses&&response?.response?{selected:{
    response:structuredClone(response.response),text:readableAnswer(question,response.response)
   }}:{}),
   ...(inclusion.expectedResponses&&answer?{expected:{
    answer:structuredClone(answer),text:readableAnswer(question,answer)
   }}:{}),
   ...(inclusion.outcomes&&outcome?{outcome:{verdict:outcome.verdict,marks:outcome.marks}}:{}),
   ...(inclusion.timing?{timing:{foregroundMs:response?.timeSpentMs??0}}:{}),
   ...(inclusion.flags?{flagged:Boolean(response?.flagged)}:{}),
   ...(inclusion.annotations?{annotations:handoffAnnotations(attempt,question)}:{})
  };
  const cost=JSON.stringify(row).length+1;
  if(budget+cost>STUDY_HANDOFF_MAX_PACKET_CHARS)break;
  questions.push(row);budget+=cost;
 }
 return {...base,includedQuestions:questions.length,
  truncated:questions.length<ordered.length,questions};
}

function assertOutputBound(text:string):string{
 if(text.length>STUDY_HANDOFF_MAX_OUTPUT_CHARS)
  throw Error("Study Handoff exceeds the bounded export size; deselect question content or responses");
 return text;
}
export function serializeStudyHandoffJson(packet:StudyHandoffPacket):string{
 return assertOutputBound(JSON.stringify(packet)+"\n");
}
function inline(value:string):string{
 return value.replace(/\r\n?/gu,"\n").replace(/\s+/gu," ").trim()
  .replace(/\\/gu,"\\\\");
}
function quoted(value:string):string{
 const normalized=value.replace(/\r\n?/gu,"\n").trim();
 return normalized.split("\n").map(line=>"> "+line).join("\n");
}
function surfaceLabel(surface:CandidateHighlightSurface):string{
 switch(surface.kind){
  case "question-prompt":return "question prompt";
  case "option-text":return "option "+surface.optionId;
  case "stimulus-passage":return "stimulus passage";
  case "stimulus-table-cell":return "stimulus table "+surface.row+":"+surface.column;
  case "stimulus-caption":return "stimulus caption";
 }
}
function contentMarkdown(content:StudyHandoffQuestionContent):string[]{
 const lines=["**Kind:** "+content.kind,"","**Question**","",quoted(content.prompt)];
 if(content.stimulus){
  lines.push("","**Stimulus**");
  if(content.stimulus.title)lines.push("Title: "+inline(content.stimulus.title));
  if(content.stimulus.kind==="passage"||content.stimulus.kind==="case")
   lines.push("",quoted(content.stimulus.text));
  else if(content.stimulus.kind==="table"){
   lines.push("Columns: "+content.stimulus.columns.map(inline).join(" | "));
   for(const row of content.stimulus.rows)lines.push("- "+row.map(inline).join(" | "));
  }else{
   lines.push("Image description: "+inline(content.stimulus.altText));
   if(content.stimulus.caption)lines.push("Caption: "+inline(content.stimulus.caption));
  }
 }
 if(content.options?.length){
  lines.push("","**Options**");
  for(const option of content.options)lines.push("- "+inline(option.id)+" — "+inline(option.text));
 }
 if(content.leftItems?.length&&content.rightItems?.length){
  lines.push("","**Matching items**","Left: "+
   content.leftItems.map(item=>inline(item.id)+" "+inline(item.text)).join("; "),
   "Right: "+content.rightItems.map(item=>inline(item.id)+" "+inline(item.text)).join("; "));
 }
 if(content.selectionRules)lines.push("Selection rules: "+inline(JSON.stringify(content.selectionRules)));
 if(content.numericRules)lines.push("Numeric rules: "+inline(JSON.stringify(content.numericRules)));
 if(content.responseRules)lines.push("Response rules: "+inline(JSON.stringify(content.responseRules)));
 return lines;
}
export function serializeStudyHandoffMarkdown(packet:StudyHandoffPacket):string{
 const lines=[
  "# Practice Desk — Attempt / Study Handoff","",
  "Single completed-attempt export. It does not contain account identity, device information, other History, worked explanations, source URLs or binary media.","",
  "- Exam: "+inline(packet.source.examId),
  "- Paper: "+inline(packet.source.paperId),
  "- Paper revision: "+inline(packet.source.paperRevisionId),
  "- Edition: "+inline(packet.source.edition),
  "- Mode: "+inline(packet.source.mode),
  "- Detailed review released: "+(packet.source.reviewReleased?"yes":"no"),
  "- Questions included: "+packet.includedQuestions+" / "+packet.totalQuestions+
    (packet.truncated?" (bounded export truncated)":""),
  ""
 ];
 for(const row of packet.questions){
  lines.push("---","","## Q"+row.number+" · "+inline(row.section.title),"",
   "Question revision: "+inline(row.questionRevisionId));
  if(row.content)lines.push("",...contentMarkdown(row.content));
  if(row.selected)lines.push("","**My response:** "+inline(row.selected.text));
  if(row.expected)lines.push("","**Expected response:** "+inline(row.expected.text));
  if(row.outcome)lines.push("","**Outcome:** "+inline(row.outcome.verdict)+" · "+row.outcome.marks+" marks");
  if(row.timing)lines.push("","**Foreground time:** "+row.timing.foregroundMs+" ms");
  if(row.flagged!==undefined)lines.push("","**Flagged for review:** "+(row.flagged?"yes":"no"));
  if(row.annotations){
   lines.push("","**Candidate annotations**");
   if(!row.annotations.eliminatedOptions.length&&!row.annotations.highlights.length)lines.push("- None");
   for(const option of row.annotations.eliminatedOptions)
    lines.push("- Eliminated "+inline(option.optionId)+" — "+inline(option.text));
   for(const highlight of row.annotations.highlights)
    lines.push("- Highlight "+inline(highlight.color)+" · "+surfaceLabel(highlight.surface)+
     " — “"+inline(highlight.excerpt)+"”");
  }
  lines.push("");
 }
 return assertOutputBound(lines.join("\n")+"\n");
}
export function studyHandoffFileName(attempt:GenericAttempt,extension:"md"|"json"):string{
 const safe=attempt.frozen.paper.paperId.replace(/[^A-Za-z0-9._-]+/gu,"-")
  .replace(/^-+|-+$/gu,"").slice(0,80)||"paper";
 return "Practice_Desk_Study_Handoff_"+safe+"."+extension;
}

function handoffOption(
 key:keyof StudyHandoffSelection,label:string,detail:string,checked:boolean,disabled=false
):string{
 return '<label class="study-handoff-option"><input type="checkbox" data-study-handoff-option="'+key+'"'+
  (checked?" checked":"")+(disabled?" disabled":"")+'><span><b>'+label+'</b><small>'+detail+
  '</small></span></label>';
}
export function studyHandoffPanelHTML(reviewReleased:boolean):string{
 return '<section class="panel pad result-study-handoff"><div class="row between"><div>'+
  '<h2>Attempt / Study Handoff</h2><p class="fine">Create a bounded Markdown or JSON packet from this completed attempt only.</p>'+
  '</div><span class="tag">Single attempt only</span></div>'+
  '<fieldset class="study-handoff-options"><legend>Include in export</legend>'+
  '<div class="study-handoff-option-grid">'+
   handoffOption("questionContent","Question text & context","Plain frozen question/stimulus content; binary images are never embedded.",true)+
   handoffOption("candidateResponses","My responses","Includes saved response text/choices. This can contain text you typed.",true)+
   handoffOption("expectedResponses","Expected responses",reviewReleased?
    "Uses the frozen key because this paper permits detailed post-attempt review.":
    "Unavailable: this paper does not release detailed answers.",reviewReleased,!reviewReleased)+
   handoffOption("outcomes","Marks & verdict","Immutable per-question marks and correct/incorrect/unanswered/pending status.",true)+
   handoffOption("timing","Foreground time","Measured foreground exposure per question.",true)+
   handoffOption("flags","Review flags","Whether each question was marked for review.",true)+
   handoffOption("annotations","Eliminations & highlights","Explicit opt-in. Includes eliminated stable options and exact highlighted excerpts.",false)+
  '</div></fieldset>'+
  '<p class="fine">Account identity, device information, attempt ID, calendar timestamps, other History, learning history, worked explanations, reviewer notes, source URLs and binary media are omitted. Candidate annotations are off by default.</p>'+
  '<div class="row study-handoff-actions">'+
   '<button class="btn" type="button" data-study-handoff-format="markdown">Download Markdown</button>'+
   '<button class="btn" type="button" data-study-handoff-format="json">Download JSON</button>'+
  '</div><p class="fine" id="g-study-handoff-status" role="status" aria-live="polite">Choose what to include; this does not modify the attempt.</p></section>';
}
