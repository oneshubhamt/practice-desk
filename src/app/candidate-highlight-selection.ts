import type {
 CandidateHighlightSurface,CandidateTextAnchor
} from "../domain/candidate-scratch.ts";
import type {OptionId,QuestionRevisionId,StimulusId} from "../domain/ids.js";

export interface CandidateHighlightFragment{
 readonly surface:CandidateHighlightSurface;
 readonly anchor:CandidateTextAnchor;
}
export interface CandidateHighlightSelection{
 readonly fragments:readonly CandidateHighlightFragment[];
 readonly characters:number;
}

function surfaceFromElement(element:HTMLElement):CandidateHighlightSurface|null{
 const kind=element.dataset.highlightSurface;
 if(kind==="question-prompt"){
  const questionRevisionId=element.dataset.highlightQuestion;
  return questionRevisionId?{kind,questionRevisionId:questionRevisionId as QuestionRevisionId}:null;
 }
 if(kind==="option-text"){
  const questionRevisionId=element.dataset.highlightQuestion,optionId=element.dataset.highlightOption;
  return questionRevisionId&&optionId?{
   kind,questionRevisionId:questionRevisionId as QuestionRevisionId,optionId:optionId as OptionId
  }:null;
 }
 if(kind==="stimulus-passage"||kind==="stimulus-caption"){
  const stimulusId=element.dataset.highlightStimulus;
  return stimulusId?{kind,stimulusId:stimulusId as StimulusId}:null;
 }
 if(kind==="stimulus-table-cell"){
  const stimulusId=element.dataset.highlightStimulus,rowRaw=element.dataset.highlightRow;
  const column=Number(element.dataset.highlightColumn);
  if(!stimulusId||rowRaw===undefined||!Number.isSafeInteger(column)||column<0)return null;
  const row=rowRaw==="header"?"header":Number(rowRaw);
  if(row!=="header"&&(!Number.isSafeInteger(row)||row<0))return null;
  return {kind,stimulusId:stimulusId as StimulusId,row,column};
 }
 return null;
}

function intersects(range:Range,node:Node):boolean{
 try{return range.intersectsNode(node);}catch{return false;}
}

function localOffset(container:HTMLElement,node:Node,offset:number):number|null{
 try{
  const local=document.createRange();
  local.selectNodeContents(container);
  local.setEnd(node,offset);
  return local.toString().length;
 }catch{return null;}
}

function clippedOffsets(container:HTMLElement,range:Range):{start:number;end:number;text:string}|null{
 if(!intersects(range,container))return null;
 const text=container.textContent??"";
 const start=container.contains(range.startContainer)?
   localOffset(container,range.startContainer,range.startOffset):0;
 const end=container.contains(range.endContainer)?
   localOffset(container,range.endContainer,range.endOffset):text.length;
 if(start===null||end===null||end<=start||start<0||end>text.length)return null;
 if(!text.slice(start,end).trim())return null;
 return {start,end,text};
}

function richFragments(
 surfaceElement:HTMLElement,surface:CandidateHighlightSurface,range:Range
):CandidateHighlightFragment[]{
 const fragments:CandidateHighlightFragment[]=[];
 for(const node of surfaceElement.querySelectorAll<HTMLElement>("[data-rich-path]")){
  const offsets=clippedOffsets(node,range);
  if(!offsets)continue;
  const path=(node.dataset.richPath??"").split(".").map(Number);
  if(path.length<2||path.length>4||path.some(part=>!Number.isSafeInteger(part)||part<0))continue;
  fragments.push({surface,anchor:{kind:"rich",path,start:offsets.start,end:offsets.end}});
 }
 return fragments;
}

/** Converts the browser selection into frozen-source anchors only.
 * Rich math/images have no data-rich-path leaf and therefore cannot become
 * character-offset annotations even when the user drags across them.
 */
export function captureCandidateHighlightSelection(
 root:HTMLElement,selection:Selection|null=window.getSelection()
):CandidateHighlightSelection{
 if(!selection||selection.rangeCount!==1||selection.isCollapsed)return {fragments:[],characters:0};
 const range=selection.getRangeAt(0);
 if(!root.contains(range.startContainer)&&!root.contains(range.endContainer))
  return {fragments:[],characters:0};
 const fragments:CandidateHighlightFragment[]=[];
 for(const element of root.querySelectorAll<HTMLElement>("[data-highlight-surface]")){
  if(!intersects(range,element))continue;
  const surface=surfaceFromElement(element);
  if(!surface)continue;
  if(element.dataset.highlightMode==="rich")fragments.push(...richFragments(element,surface,range));
  else if(element.dataset.highlightMode==="plain"){
   const offsets=clippedOffsets(element,range);
   if(offsets)fragments.push({surface,anchor:{kind:"plain",start:offsets.start,end:offsets.end}});
  }
 }
 return {fragments,characters:fragments.reduce((sum,item)=>sum+(item.anchor.end-item.anchor.start),0)};
}
