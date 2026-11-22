import type {
 CandidateHighlight,CandidateHighlightColor,CandidateScratch,CandidateScratchContext
} from "../domain/candidate-scratch.ts";
import {
 addCandidateHighlights,candidateHighlightIdsOverlapping,removeCandidateHighlights
} from "../domain/candidate-scratch.ts";
import {
 captureCandidateHighlightSelection,type CandidateHighlightSelection
} from "./candidate-highlight-selection.ts";

export interface CandidateHighlightBinding{
 readonly root:HTMLElement;
 readonly scratch:CandidateScratch;
 readonly context:CandidateScratchContext;
 readonly canAnnotate:boolean;
 readonly now:()=>number;
 readonly onChange:(scratch:CandidateScratch,now:number)=>void;
}

function highlightId(scratch:CandidateScratch,seed:number,index:number):string{
 const used=new Set(scratch.highlights.map(item=>item.id));
 let suffix=index,id="h-"+Math.max(0,Math.floor(seed)).toString(36)+"-"+suffix;
 while(used.has(id)){suffix++;id="h-"+Math.max(0,Math.floor(seed)).toString(36)+"-"+suffix;}
 return id;
}

export function bindCandidateHighlighting(binding:CandidateHighlightBinding):void{
 const {root}=binding;
 const status=root.querySelector<HTMLElement>("#g-highlight-status");
 const colorButtons=[...root.querySelectorAll<HTMLButtonElement>("[data-highlight-color]")];
 const removeButton=root.querySelector<HTMLButtonElement>("#g-highlight-remove");
 let pending:CandidateHighlightSelection={fragments:[],characters:0};
 let overlapping:readonly string[]=[];

 const setAvailability=(selection:CandidateHighlightSelection)=>{
  pending=selection;
  overlapping=candidateHighlightIdsOverlapping(binding.scratch,selection.fragments);
  const hasSelection=binding.canAnnotate&&selection.fragments.length>0;
  colorButtons.forEach(button=>{button.disabled=!hasSelection;});
  if(removeButton)removeButton.disabled=!hasSelection||overlapping.length===0;
  if(!status)return;
  if(!binding.canAnnotate)status.textContent="Highlighting is unavailable while this section is locked.";
  else if(!selection.fragments.length)status.textContent=
    "Select text in the question or an eligible stimulus.";
  else if(overlapping.length)status.textContent=
    "Selection overlaps an existing highlight. Remove it before applying another color.";
  else status.textContent="Selected "+selection.characters+" character"+
    (selection.characters===1?"":"s")+". Choose a highlight color.";
 };

 const capture=()=>{
  const question=root.querySelector<HTMLElement>(".exam-question");
  setAvailability(question?captureCandidateHighlightSelection(question):{fragments:[],characters:0});
 };
 if(!binding.canAnnotate){setAvailability(pending);return;}

 root.onpointerup=event=>{
  if((event.target as Element|null)?.closest?.(".candidate-highlight-tools"))return;
  capture();
 };
 root.onkeyup=event=>{
  if((event.target as Element|null)?.closest?.(".candidate-highlight-tools"))return;
  capture();
 };

 for(const button of colorButtons)button.onclick=()=>{
  if(!pending.fragments.length)return;
  if(overlapping.length){
   if(status)status.textContent="Remove the overlapping highlight before applying another color.";
   return;
  }
  const color=button.dataset.highlightColor as CandidateHighlightColor;
  const now=binding.now();
  const highlights:CandidateHighlight[]=pending.fragments.map((fragment,i)=>({
   id:highlightId(binding.scratch,now,i),surface:fragment.surface,anchor:fragment.anchor,color
  }));
  const next=addCandidateHighlights(binding.scratch,highlights,binding.context);
  window.getSelection()?.removeAllRanges();
  binding.onChange(next,now);
 };
 if(removeButton)removeButton.onclick=()=>{
  if(!overlapping.length)return;
  const now=binding.now();
  const next=removeCandidateHighlights(binding.scratch,overlapping);
  window.getSelection()?.removeAllRanges();
  binding.onChange(next,now);
 };
 setAvailability(pending);
}
