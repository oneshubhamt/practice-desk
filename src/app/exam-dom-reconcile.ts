/** P48-2/P48-3: retain native controls when the screen identity is unchanged.
 * New questions, Result panes, and route transitions still replace markup;
 *
 * HTML comes only from the same escaped, validated exam presenter used by
 * screen-renderer. This is not an HTML sanitizer and must not be used for
 * unvalidated external markup.
 */
const identityFields=["id","data-choice","data-bool","data-match",
  "data-q","data-section","data-attempt","data-review-id",
  "data-manual-marks","data-manual-note","data-manual-save","data-add-card",
  "data-active-question","data-learning-card","data-learning-id"] as const;
function sameIdentity(a:Element,b:Element):boolean{
 if(a.localName!==b.localName||a.namespaceURI!==b.namespaceURI)return false;
 if(a instanceof HTMLInputElement&&b instanceof HTMLInputElement&&a.type!==b.type)
   return false;
 for(const key of identityFields)
   if(a.getAttribute(key)!==b.getAttribute(key))return false;
 return true;
}
function reconcile(a:Node,b:Node):void{
 if(a.nodeType!==b.nodeType){a.parentNode?.replaceChild(b,a);return;}
 if(a instanceof Element&&b instanceof Element){
   if(!sameIdentity(a,b)){a.replaceWith(b);return;}
   // The common case is unchanged static question text/figures/palette.
   // Leave the exact real DOM objects in place, including image decoding,
   // active focus, caret, scroll positions and attached native state.
   if(a.isEqualNode(b))return;
   for(const old of Array.from(a.attributes))
     // <details open> is transient, explicitly user-controlled state. Do not
     // collapse keyboard help simply because an answer/flag was saved.
     if(!b.hasAttribute(old.name)&&
       !(a instanceof HTMLDetailsElement&&old.name==="open"))
       a.removeAttribute(old.name);
   for(const next of Array.from(b.attributes))
     if(a.getAttribute(next.name)!==next.value)a.setAttribute(next.name,next.value);
   const newNodes=Array.from(b.childNodes);
   // Learning notebook cards have stable record identities, not positional
   // identities. Reuse live buttons across selection, filtering and reorder.
   // This is deliberately scoped to this list: never reuse answer controls
   // across different exam questions or notebook-detail card identities.
   if(a.hasAttribute("data-learning-list")&&b.hasAttribute("data-learning-list")){
     const oldById=new Map(Array.from(a.children)
       .filter(el=>el.hasAttribute("data-learning-id"))
       .map(el=>[el.getAttribute("data-learning-id")!,el]));
     for(let i=0;i<newNodes.length;i++){
       const next=newNodes[i]!;
       const key=next instanceof Element?next.getAttribute("data-learning-id"):null;
       const prior=key?oldById.get(key):undefined;
       const live=prior&&next instanceof Element&&sameIdentity(prior,next)?prior:next;
       if(live===prior)reconcile(prior!,next);
       if(a.childNodes[i]!==live)a.insertBefore(live,a.childNodes[i]??null);
     }
     while(a.childNodes.length>newNodes.length)a.lastChild?.remove();
     return;
   }
   // Reuse a Result article by frozen question revision ID across filters.
   for(let i=0;i<newNodes.length;i++){
     const next=newNodes[i]!;
     if(a.id==="result-review"&&next instanceof Element&&next.hasAttribute("data-review-id")){
       const id=next.getAttribute("data-review-id");
       const existing=Array.from(a.children).find(el=>el.getAttribute("data-review-id")===id);
       if(existing){
         if(existing!==a.childNodes[i])a.insertBefore(existing,a.childNodes[i]??null);
         reconcile(existing,next);
       }else{
         // Insert new filtered-in articles before still-live keyed siblings;
         // replacing by index would discard those siblings' native drafts.
         a.insertBefore(next,a.childNodes[i]??null);
       }
       continue;
     }
     const current=a.childNodes[i];
     if(current)reconcile(current,next);
     else a.appendChild(next);
   }
   while(a.childNodes.length>newNodes.length)a.lastChild?.remove();
   // HTML form control properties can diverge from HTML attributes through
   // browser actions. Apply *scored model* check states, without replacing
   // focused inputs or discarding unsaved text/IME composition.
   if(a instanceof HTMLInputElement&&b instanceof HTMLInputElement){
     if(a.type==="radio"||a.type==="checkbox")a.checked=b.checked;
     else if(document.activeElement!==a)a.value=b.value;
   }else if(a instanceof HTMLSelectElement&&b instanceof HTMLSelectElement&&
     document.activeElement!==a)a.value=b.value;
   else if(a instanceof HTMLTextAreaElement&&b instanceof HTMLTextAreaElement&&
     document.activeElement!==a)a.value=b.value;
   return;
 }
 if(a.nodeType===Node.TEXT_NODE&&a.nodeValue!==b.nodeValue)
   a.nodeValue=b.nodeValue;
 else if(a.nodeType===Node.COMMENT_NODE&&a.nodeValue!==b.nodeValue)
   a.nodeValue=b.nodeValue;
}
export function reconcileSameExamQuestion(root:HTMLElement,html:string):void{
 const template=document.createElement("template");
 template.innerHTML=html;
 const oldNodes=Array.from(root.childNodes);
 const nextNodes=Array.from(template.content.childNodes);
 const common=Math.min(oldNodes.length,nextNodes.length);
 for(let i=0;i<common;i++)reconcile(oldNodes[i]!,nextNodes[i]!);
 for(let i=common;i<oldNodes.length;i++)oldNodes[i]!.remove();
 for(let i=common;i<nextNodes.length;i++)root.appendChild(nextNodes[i]!);
}
