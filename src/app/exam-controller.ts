/** P47-6 module: exam-controller.ts */

import {renderModelExam} from "./exam-view.ts";

import {transitionGenericAttempt} from "./exam-package.ts";

import type {SessionEvent} from "../engine/session.ts";

import {multipleDraftMessage,duplicateMatchingTargets} from "./response-drafts.ts";

import type {CoordinatorContext} from "./coordinator-context.ts";

export function renderCurrentExamHTML(owner:CoordinatorContext):string {
   if(!owner.attempt)return "";
   const qid=owner.attempt.frozen.paper.sections[owner.attempt.state.sectionIndex]
     ?.questionRevisionIds[owner.attempt.state.questionIndex];
   const draft=qid?owner.choiceDrafts.get(owner.attempt.id+"|"+qid):undefined;
   return renderModelExam(owner.attempt,owner.packageForAttempt(owner.attempt),owner.warning,draft,{
     focused:Boolean(document.fullscreenElement||
       document.documentElement.classList.contains("immersive"))
   });
 }

export const dispatchExamEvent=(owner:CoordinatorContext,event:SessionEvent)=>{
   if(!owner.attempt||owner.storageFault)return;
   try{
     const ids=new Map(owner.attempt.frozen.questions.map(q=>[q.id,q]));
     const before=owner.attempt;
     owner.attempt=transitionGenericAttempt(owner.attempt,event,ids);
     if(owner.attempt!==before)void owner.save(owner.attempt);
     if(owner.attempt.finishedAt!==null){
       owner.reviewFilter="all";owner.go({screen:"result",attemptId:owner.attempt.id,tab:"overview"},"replace");return;
     }
     owner.warning="";
   }catch(error){owner.warning=error instanceof Error?error.message:"Invalid response";}
   owner.draw();
 };

export function bindExamScreen(owner:CoordinatorContext):void{
owner.root.querySelector<HTMLButtonElement>("#g-exam-full")!.onclick=()=>
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));
const section=owner.attempt!.frozen.paper.sections[owner.attempt!.state.sectionIndex];
const q=owner.attempt!.frozen.questions.find(x=>x.id===section?.questionRevisionIds[owner.attempt!.state.questionIndex]);
if(!q)return;
owner.root.querySelectorAll<HTMLInputElement>("[data-choice]").forEach(input=>input.onchange=()=>{
     if(q.content.kind==="single-choice"){
       const option=q.content.options.find(x=>x.id===input.dataset.choice);
       if(!option){owner.notice("Unknown question option.");return;}
       owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"single-choice",optionId:option.id}});
     }else if(q.content.kind==="multiple-select"){
       const raw=[...owner.root.querySelectorAll<HTMLInputElement>("[data-choice]:checked")].map(x=>x.dataset.choice);
       const chosen=q.content.options.filter(option=>raw.includes(option.id)).map(option=>option.id);
       if(raw.length!==chosen.length){owner.notice("Unknown question option.");return;}
       const draftKey=owner.attempt!.id+"|"+q.id;
       const min=q.content.minSelections??1,max=q.content.maxSelections;
       const message=chosen.length?multipleDraftMessage(chosen.length,min,max):"";
       if(message){
         // Preserve the visible draft while clearing any previously committed
         // response. A half-edited old answer must not silently count as saved.
         owner.choiceDrafts.set(draftKey,{questionId:q.id,optionIds:chosen,message});
         owner.dispatch({type:"CLEAR",nowMs:owner.now()});
       }else{
         owner.choiceDrafts.delete(draftKey);
         owner.dispatch(!chosen.length?{type:"CLEAR",nowMs:owner.now()}:
           {type:"ANSWER",nowMs:owner.now(),response:{kind:"multiple-select",optionIds:chosen}});
       }
     }
   });
owner.root.querySelectorAll<HTMLInputElement>("[data-bool]").forEach(input=>input.onchange=()=>{
     owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"true-false",value:input.dataset.bool==="true"}});
   });
const saveButton=owner.root.querySelector<HTMLButtonElement>("#g-save");
if(q.content.kind==="matching"&&saveButton){
     const matching=q.content;
     const controls=[...owner.root.querySelectorAll<HTMLSelectElement>("[data-match]")];
     const feedback=owner.root.querySelector<HTMLElement>("#g-match-feedback");
     const updateConflicts=(dirty:boolean):readonly string[]=>{
       const duplicates=duplicateMatchingTargets(controls.map(control=>control.value));
       for(const control of controls){
         const conflict=Boolean(control.value&&duplicates.includes(control.value));
         control.classList.toggle("match-conflict",conflict);
         if(conflict){
           control.setAttribute("aria-invalid","true");
           control.setAttribute("aria-describedby","g-match-feedback");
         }else{
           control.removeAttribute("aria-invalid");
           control.removeAttribute("aria-describedby");
         }
       }
       saveButton.disabled=duplicates.length>0;
       if(feedback){
         const labels=duplicates.map(id=>matching.rightItems.find(item=>item.id===id)?.text??id);
         feedback.textContent=duplicates.length?
           "Conflicting matches: "+labels.join(", ")+
           " selected for multiple left items. Each right option may be used once; correct the highlighted rows before saving.":
           dirty?"Matching changes not yet saved. Select Save matches to commit.":"";
       }
       return duplicates;
     };
     controls.forEach(control=>control.onchange=()=>{updateConflicts(true);});
     updateConflicts(false);
   }
if(saveButton)saveButton.onclick=()=>{
     if(q.content.kind==="numeric-entry"){
       const field=owner.root.querySelector<HTMLInputElement>("#g-number")!;
       if(!field.value||!Number.isFinite(field.valueAsNumber)){owner.notice("Enter a finite numeric answer.");return;}
       owner.dispatch({type:"ANSWER",nowMs:owner.now(),response:{kind:"numeric-entry",value:field.valueAsNumber}});
     }else if(q.content.kind==="free-response"){
       const value=owner.root.querySelector<HTMLTextAreaElement>("#g-text")!.value;
       owner.dispatch(value.trim()?{type:"ANSWER",nowMs:owner.now(),response:{kind:"free-response",text:value}}:{type:"CLEAR",nowMs:owner.now()});
     }else if(q.content.kind==="matching"){
       const matching=q.content;
       const controls=[...owner.root.querySelectorAll<HTMLSelectElement>("[data-match]")];
       const duplicate=duplicateMatchingTargets(controls.map(control=>control.value));
       if(duplicate.length){
         owner.notice("Conflicting right-side matches must be corrected before saving.");return;
       }
       const pairs=controls.filter(x=>x.value)
         .map(x=>{
           const left=matching.leftItems.find(item=>item.id===x.dataset.match);
           const right=matching.rightItems.find(item=>item.id===x.value);
           return left&&right?{leftId:left.id,rightId:right.id}:null;
         });
       if(pairs.some(x=>x===null)){owner.notice("Unknown matching option.");return;}
       const validPairs=pairs.filter((pair):pair is NonNullable<typeof pair>=>pair!==null);
       owner.dispatch(validPairs.length?{type:"ANSWER",nowMs:owner.now(),response:{kind:"matching",pairs:validPairs}}:{type:"CLEAR",nowMs:owner.now()});
     }
   };
owner.root.querySelector<HTMLButtonElement>("#g-clear")!.onclick=()=>owner.dispatch({type:"CLEAR",nowMs:owner.now()});
owner.root.querySelector<HTMLButtonElement>("#g-flag")!.onclick=()=>owner.dispatch({type:"FLAG",nowMs:owner.now(),
     flagged:!owner.attempt!.state.responses.find(r=>r.questionRevisionId===q.id)?.flagged});
const navigate=(s:number,i:number)=>owner.dispatch({type:"NAVIGATE",nowMs:owner.now(),sectionIndex:s,questionIndex:i});
owner.root.querySelector<HTMLButtonElement>("#g-prev")!.onclick=()=>navigate(owner.attempt!.state.sectionIndex,owner.attempt!.state.questionIndex-1);
owner.root.querySelector<HTMLButtonElement>("#g-next")!.onclick=()=>navigate(owner.attempt!.state.sectionIndex,owner.attempt!.state.questionIndex+1);
owner.root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach(b=>b.onclick=()=>navigate(owner.attempt!.state.sectionIndex,Number(b.dataset.q)));
owner.root.querySelectorAll<HTMLButtonElement>("[data-section]").forEach(b=>b.onclick=()=>navigate(Number(b.dataset.section),0));
const pause=owner.root.querySelector<HTMLButtonElement>("#g-pause");
if(pause)pause.onclick=()=>owner.dispatch({type:owner.attempt!.state.status==="paused"?"RESUME":"PAUSE",nowMs:owner.now()});
owner.root.querySelector<HTMLButtonElement>("#g-submit")!.onclick=()=>{
     const p=owner.attempt!.frozen.paper, st=owner.attempt!.state;
     const sectional=p.timing.kind==="sectional";
     const lockedWhole=p.timing.kind!=="sectional"&&p.navigation.sectionNavigation==="sequential-locked";
     const continuing=(sectional||lockedWhole)&&st.sectionIndex<p.sections.length-1;
     const expired=st.status==="section-expired";
     if(!expired&&!confirm(continuing?"Close this section and advance? You cannot return.":"Submit this exam and view results?"))return;
     owner.dispatch({type:sectional||continuing?"SUBMIT_SECTION":"SUBMIT_ATTEMPT",nowMs:owner.now()});
   };
}
