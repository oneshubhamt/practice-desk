/** P48-2: retained-element reconciliation for repeated renders of ONE exam
 * question. Navigation between questions/screens keeps the existing full
 * replace + accessibility focus policy.
 *
 * HTML comes only from the same escaped, validated exam presenter used by
 * screen-renderer. This is not an HTML sanitizer and must not be used for
 * unvalidated external markup.
 */
const identityFields=["id","data-choice","data-bool","data-match",
  "data-q","data-section","data-attempt"] as const;
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
   const oldNodes=Array.from(a.childNodes),newNodes=Array.from(b.childNodes);
   const common=Math.min(oldNodes.length,newNodes.length);
   for(let i=0;i<common;i++)reconcile(oldNodes[i]!,newNodes[i]!);
   for(let i=common;i<oldNodes.length;i++)oldNodes[i]!.remove();
   for(let i=common;i<newNodes.length;i++)a.appendChild(newNodes[i]!);
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
