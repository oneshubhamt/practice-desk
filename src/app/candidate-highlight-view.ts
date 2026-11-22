import type {
 CandidateHighlight,CandidateHighlightSurface,CandidateScratch
} from "../domain/candidate-scratch.ts";
import {candidateHighlightsForSurface} from "../domain/candidate-scratch.ts";
import type {RichRenderOptions,RichTextDecoration} from "./rich-content-view.ts";
import {escapeText} from "./html-escape.ts";

function surfaceField(value:string):string{return escapeText(value);}

export function candidateHighlightSurfaceAttributes(
 surface:CandidateHighlightSurface,mode:"plain"|"rich"
):string{
 let attrs=' data-highlight-surface="'+surface.kind+'" data-highlight-mode="'+mode+'"';
 switch(surface.kind){
  case "question-prompt":
   return attrs+' data-highlight-question="'+surfaceField(surface.questionRevisionId)+'"';
  case "option-text":
   return attrs+' data-highlight-question="'+surfaceField(surface.questionRevisionId)+
     '" data-highlight-option="'+surfaceField(surface.optionId)+'"';
  case "stimulus-passage":
  case "stimulus-caption":
   return attrs+' data-highlight-stimulus="'+surfaceField(surface.stimulusId)+'"';
  case "stimulus-table-cell":
   return attrs+' data-highlight-stimulus="'+surfaceField(surface.stimulusId)+
     '" data-highlight-row="'+surface.row+'" data-highlight-column="'+surface.column+'"';
 }
}

function nestedMarks(text:string,highlights:readonly CandidateHighlight[]):string{
 const boundaries=[0,text.length,...highlights.flatMap(item=>[item.anchor.start,item.anchor.end])]
  .filter((value,index,self)=>self.indexOf(value)===index).sort((a,b)=>a-b);
 let html="";
 for(let i=0;i<boundaries.length-1;i++){
  const start=boundaries[i]!,end=boundaries[i+1]!;
  if(end<=start)continue;
  let segment=escapeText(text.slice(start,end));
  const active=highlights.filter(item=>item.anchor.start<=start&&item.anchor.end>=end)
    .sort((a,b)=>a.id.localeCompare(b.id));
  for(const item of active)segment='<mark class="candidate-highlight" data-candidate-highlight-id="'+
    escapeText(item.id)+'" data-highlight-color="'+item.color+'">'+segment+'</mark>';
  html+=segment;
 }
 return html;
}

export function candidateAnnotatedPlainHTML(
 text:string,scratch:CandidateScratch,surface:CandidateHighlightSurface
):string{
 const highlights=candidateHighlightsForSurface(scratch,surface)
  .filter(item=>item.anchor.kind==="plain");
 return highlights.length?nestedMarks(text,highlights):escapeText(text);
}

export function candidateRichRenderOptions(
 scratch:CandidateScratch,surface:CandidateHighlightSurface
):RichRenderOptions{
 const highlights=candidateHighlightsForSurface(scratch,surface);
 return {
  annotatable:true,
  textDecorations:(path,text):readonly RichTextDecoration[]=>highlights.flatMap(item=>{
   if(item.anchor.kind!=="rich"||item.anchor.path.length!==path.length||
     item.anchor.path.some((part,i)=>part!==path[i]))return [];
   return [{id:item.id,start:item.anchor.start,end:item.anchor.end,color:item.color}];
  }).filter(item=>item.end<=text.length)
 };
}
