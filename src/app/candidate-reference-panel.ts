import type {CandidateReferenceBinding,CandidateReferenceResource} from "../domain/candidate-reference.ts";
import {assertCandidateReferenceInventory} from "../domain/candidate-reference.ts";
import type {ImageAsset} from "../domain/question.js";
import type {RichBlock,RichDocument,RichInline} from "../domain/rich-document.ts";
import {richDocumentHTML} from "./rich-content-view.ts";
import {escapeText} from "./html-escape.ts";

export const CANDIDATE_REFERENCE_QUERY_MAX=120;

function inlineSearchText(items:readonly RichInline[]):string{
 return items.map(item=>item.type==="text"?item.text:item.type==="math"?item.linearText:item.altText).join(" ");
}
export function candidateReferenceDocumentText(document:RichDocument):string{
 const blocks=(block:RichBlock):string=>{
  switch(block.type){
   case "paragraph":
   case "heading":return inlineSearchText(block.content);
   case "list":return block.items.map(inlineSearchText).join(" ");
   case "table":return block.rows.flatMap(row=>row.map(inlineSearchText)).join(" ");
   case "display-math":return block.linearText;
   case "image":return block.altText;
  }
 };
 return document.blocks.map(blocks).join(" ").replace(/\s+/gu," ").trim();
}
function normalized(value:string):string{return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/gu," ").trim();}
export function candidateReferenceSearchText(resource:CandidateReferenceResource):string{
 return normalized([
  resource.title,resource.category??"",...(resource.keywords??[]),
  candidateReferenceDocumentText(resource.document)
 ].join(" "));
}
export function filterCandidateReferences(
 resources:readonly CandidateReferenceResource[],query:string,category:string|null
):readonly CandidateReferenceResource[]{
 const bounded=normalized(query.slice(0,CANDIDATE_REFERENCE_QUERY_MAX));
 const terms=bounded?bounded.split(" ").filter(Boolean):[];
 return resources.filter(resource=>
  (!category||resource.category===category)&&
  (!terms.length||terms.every(term=>candidateReferenceSearchText(resource).includes(term)))
 );
}
export function orderedCandidateReferences(
 bindings:readonly CandidateReferenceBinding[]|undefined,
 resources:readonly CandidateReferenceResource[]
):readonly CandidateReferenceResource[]{
 assertCandidateReferenceInventory(bindings,resources);
 if(!bindings?.length)return [];
 const byId=new Map(resources.map(resource=>[resource.id,resource]));
 return bindings.map(binding=>byId.get(binding.id)!);
}
function referenceImageHTML(assets:readonly ImageAsset[],id:string,alt:string):string{
 const asset=assets.find(item=>item.id===id);
 if(!asset)throw Error("Frozen candidate reference image missing: "+id);
 return '<span class="candidate-reference-media"><img class="candidate-reference-image" src="'+
  escapeText(asset.dataUri)+'" alt="'+escapeText(alt)+'" decoding="async"></span>';
}
export function candidateReferenceDocumentHTML(
 resource:CandidateReferenceResource,assets:readonly ImageAsset[]
):string{
 const knownAssets=new Set(resource.assetIds??[]);
 return richDocumentHTML(resource.document,knownAssets,
  (id,alt)=>referenceImageHTML(assets,id,alt),{tableLabel:"Reference table"});
}

export interface CandidateReferencePanelOpen{
 readonly attemptId:string;
 readonly bindings:readonly CandidateReferenceBinding[]|undefined;
 readonly resources:readonly CandidateReferenceResource[];
 readonly assets:readonly ImageAsset[];
 readonly trigger:HTMLElement;
}
export interface CandidateReferencePanel{
 isOpen():boolean;
 syncAttempt(attemptId:string|null):void;
 open(input:CandidateReferencePanelOpen):void;
 close():void;
 dispose():void;
}
type ActivePanel={
 readonly attemptId:string;
 readonly dialog:HTMLDialogElement;
 readonly trigger:HTMLElement;
 readonly search:HTMLInputElement;
 readonly category:HTMLSelectElement;
 readonly list:HTMLElement;
 readonly content:HTMLElement;
 readonly status:HTMLElement;
 readonly title:HTMLElement;
 readonly closeButton:HTMLButtonElement;
 readonly resources:readonly CandidateReferenceResource[];
 readonly assets:readonly ImageAsset[];
 selectedId:string;
 query:string;
 categoryValue:string|null;
 previousOverflow:string;
};

function focusable(dialog:HTMLDialogElement):HTMLElement[]{
 return [...dialog.querySelectorAll<HTMLElement>(
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),[href],[tabindex]:not([tabindex="-1"])'
 )].filter(element=>!element.hidden&&element.getAttribute("aria-hidden")!=="true");
}

export function createCandidateReferencePanel():CandidateReferencePanel{
 let active:ActivePanel|null=null,disposed=false;

 const close=():void=>{
  const current=active;
  if(!current)return;
  active=null;
  if(current.dialog.open)current.dialog.close();
  current.dialog.remove();
  document.body.style.overflow=current.previousOverflow;
  if(current.trigger.isConnected)current.trigger.focus({preventScroll:true});
  else document.getElementById("g-references")?.focus({preventScroll:true});
 };

 const selectResource=(state:ActivePanel,id:string):void=>{
  state.selectedId=id;
  const resource=state.resources.find(item=>item.id===id);
  if(!resource)return;
  for(const button of state.list.querySelectorAll<HTMLButtonElement>("[data-reference-id]")){
   const selected=button.dataset.referenceId===id;
   button.classList.toggle("selected",selected);
   button.setAttribute("aria-selected",String(selected));
   if(selected)button.setAttribute("aria-current","true");
   else button.removeAttribute("aria-current");
  }
  state.title.textContent=resource.title;
  const meta=document.createElement("p");
  meta.className="candidate-reference-meta";
  meta.textContent=[
   resource.category??"",
   ...(resource.keywords?.length?["Keywords: "+resource.keywords.join(", ")]:[])
  ].filter(Boolean).join(" · ");
  const body=document.createElement("div");
  body.className="candidate-reference-document";
  body.innerHTML=candidateReferenceDocumentHTML(resource,state.assets);
  state.content.replaceChildren(meta,body);
 };

 const renderList=(state:ActivePanel):void=>{
  const filtered=filterCandidateReferences(state.resources,state.query,state.categoryValue);
  state.list.replaceChildren();
  state.status.textContent=filtered.length+" of "+state.resources.length+
    " reference"+(state.resources.length===1?"":"s")+" shown.";
  if(!filtered.length){
   const empty=document.createElement("p");
   empty.className="fine candidate-reference-empty";
   empty.textContent="No matching reference material.";
   state.list.appendChild(empty);
   state.title.textContent="No reference selected";
   const message=document.createElement("p");
   message.textContent="Change the search or category filter to view authorised reference material.";
   state.content.replaceChildren(message);
   state.selectedId="";
   return;
  }
  if(!filtered.some(item=>item.id===state.selectedId))state.selectedId=filtered[0]!.id;
  for(const resource of filtered){
   const button=document.createElement("button");
   button.type="button";
   button.className="candidate-reference-item";
   button.dataset.referenceId=resource.id;
   button.setAttribute("role","option");
   button.setAttribute("aria-selected",String(resource.id===state.selectedId));
   if(resource.id===state.selectedId){
    button.classList.add("selected");button.setAttribute("aria-current","true");
   }
   const name=document.createElement("b");name.textContent=resource.title;
   button.appendChild(name);
   if(resource.category){
    const category=document.createElement("small");category.textContent=resource.category;
    button.appendChild(category);
   }
   button.onclick=()=>selectResource(state,resource.id);
   state.list.appendChild(button);
  }
  selectResource(state,state.selectedId);
 };

 const open=(input:CandidateReferencePanelOpen):void=>{
  if(disposed)return;
  const resources=orderedCandidateReferences(input.bindings,input.resources);
  if(!resources.length)return;
  close();

  const dialog=document.createElement("dialog");
  dialog.className="candidate-reference-dialog generic-workspace";
  dialog.setAttribute("aria-labelledby","candidate-reference-panel-title");
  dialog.setAttribute("aria-describedby","candidate-reference-panel-help");

  const shell=document.createElement("div");shell.className="candidate-reference-shell";
  const header=document.createElement("div");header.className="candidate-reference-head";
  const heading=document.createElement("div");
  heading.innerHTML='<span class="eyebrow">Candidate tool</span><h2 id="candidate-reference-panel-title">Reference materials</h2>';
  const closeButton=document.createElement("button");
  closeButton.type="button";closeButton.className="btn candidate-reference-close";closeButton.textContent="Close";
  closeButton.setAttribute("aria-label","Close reference materials");
  header.append(heading,closeButton);

  const help=document.createElement("p");
  help.id="candidate-reference-panel-help";help.className="fine candidate-reference-help";
  help.textContent="Search and browse only the reference material supplied with this paper. Ctrl/⌘+F focuses search; Escape closes.";

  const controls=document.createElement("div");controls.className="candidate-reference-controls";
  const searchLabel=document.createElement("label");searchLabel.className="picker";searchLabel.textContent="Search references";
  const search=document.createElement("input");search.type="search";search.maxLength=CANDIDATE_REFERENCE_QUERY_MAX;
  search.placeholder="Title, keyword, table text, maths…";search.setAttribute("aria-label","Search candidate references");
  searchLabel.appendChild(search);
  const categoryLabel=document.createElement("label");categoryLabel.className="picker";categoryLabel.textContent="Category";
  const category=document.createElement("select");category.setAttribute("aria-label","Filter candidate references by category");
  const all=document.createElement("option");all.value="";all.textContent="All categories";category.appendChild(all);
  const categories=[...new Set(resources.map(resource=>resource.category).filter((value):value is string=>Boolean(value)))]
   .sort((a,b)=>a.localeCompare(b));
  for(const value of categories){const option=document.createElement("option");option.value=value;option.textContent=value;category.appendChild(option);}
  categoryLabel.appendChild(category);
  controls.append(searchLabel,categoryLabel);

  const status=document.createElement("p");status.className="fine candidate-reference-status";
  status.setAttribute("role","status");status.setAttribute("aria-live","polite");

  const layout=document.createElement("div");layout.className="candidate-reference-layout";
  const list=document.createElement("div");list.className="candidate-reference-list";
  list.setAttribute("role","listbox");list.setAttribute("aria-label","Available candidate references");
  const article=document.createElement("article");article.className="candidate-reference-content";
  article.setAttribute("aria-live","polite");
  const title=document.createElement("h3");title.className="candidate-reference-current-title";
  const content=document.createElement("div");
  article.append(title,content);layout.append(list,article);

  shell.append(header,help,controls,status,layout);dialog.append(shell);document.body.append(dialog);
  const state:ActivePanel={attemptId:input.attemptId,dialog,trigger:input.trigger,search,category,list,
   content,title,status,closeButton,resources,assets:input.assets,selectedId:resources[0]!.id,
   query:"",categoryValue:null,previousOverflow:document.body.style.overflow};
  active=state;

  const refresh=():void=>{
   state.query=search.value.slice(0,CANDIDATE_REFERENCE_QUERY_MAX);
   state.categoryValue=category.value||null;
   renderList(state);
  };
  search.addEventListener("input",refresh);
  category.addEventListener("change",refresh);
  closeButton.addEventListener("click",close);
  dialog.addEventListener("cancel",event=>{event.preventDefault();close();});
  dialog.addEventListener("keydown",event=>{
   if(event.key==="Escape"){event.preventDefault();close();return;}
   if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="f"){
    event.preventDefault();search.focus({preventScroll:true});search.select();return;
   }
   if(event.target instanceof HTMLButtonElement&&event.target.dataset.referenceId&&
      ["ArrowDown","ArrowUp","Home","End"].includes(event.key)){
    const buttons=[...list.querySelectorAll<HTMLButtonElement>("[data-reference-id]")];
    const index=buttons.indexOf(event.target);
    if(index>=0){
     event.preventDefault();
     const next=event.key==="Home"?0:event.key==="End"?buttons.length-1:
      event.key==="ArrowDown"?Math.min(buttons.length-1,index+1):Math.max(0,index-1);
     const target=buttons[next];if(target){target.focus({preventScroll:true});selectResource(state,target.dataset.referenceId!);}
    }
    return;
   }
   if(event.key==="Tab"){
    const controls=focusable(dialog),index=controls.indexOf(document.activeElement as HTMLElement);
    if(!controls.length)return;
    if(index<0||(event.shiftKey&&index===0)||(!event.shiftKey&&index===controls.length-1)){
     event.preventDefault();controls[event.shiftKey?controls.length-1:0]?.focus({preventScroll:true});
    }
   }
  });

  renderList(state);
  try{dialog.showModal();}
  catch{active=null;dialog.remove();return;}
  document.body.style.overflow="hidden";
  search.focus({preventScroll:true});
 };

 return {
  isOpen:()=>active!==null,
  syncAttempt:(attemptId:string|null)=>{if(active&&active.attemptId!==attemptId)close();},
  open,close,
  dispose:()=>{if(disposed)return;disposed=true;close();}
 };
}
