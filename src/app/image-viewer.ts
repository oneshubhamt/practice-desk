/** P47-3: offline image inspection for source-verified frozen exam media.
 *
 * Mounts ONE transient dialog outside #app so normal screen redraws never
 * retain extra asset copies. The only image URL is the existing data: URI from
 * the immutable HTML thumbnail; no OPFS, IndexedDB, fetch, URL.createObjectURL,
 * encoder, raster edit or persistent state is introduced here.
 */
export const IMAGE_MIN_ZOOM=1;
export const IMAGE_MAX_ZOOM=8;
export type ImageGeometry={
 readonly width:number;readonly height:number;
};
export type ImageOffset={readonly x:number;readonly y:number};
export function fittedImage(
 natural:ImageGeometry,viewport:ImageGeometry
):ImageGeometry{
 if(!Number.isFinite(natural.width)||!Number.isFinite(natural.height)||
   natural.width<=0||natural.height<=0||
   !Number.isFinite(viewport.width)||!Number.isFinite(viewport.height)||
   viewport.width<=0||viewport.height<=0)return {width:0,height:0};
 // No implicit upscaling. A small diagram is drawn at native resolution.
 const ratio=Math.min(1,viewport.width/natural.width,viewport.height/natural.height);
 return {width:natural.width*ratio,height:natural.height*ratio};
}
export function boundedImageOffset(
 offset:ImageOffset,zoom:number,fit:ImageGeometry,viewport:ImageGeometry
):ImageOffset{
 const extentX=Math.max(0,(fit.width*zoom-viewport.width)/2);
 const extentY=Math.max(0,(fit.height*zoom-viewport.height)/2);
 return {x:extentX===0?0:Math.max(-extentX,Math.min(extentX,offset.x)),
   y:extentY===0?0:Math.max(-extentY,Math.min(extentY,offset.y))};
}
export function boundedImageZoom(value:number):number{
 return Number.isFinite(value)?Math.max(IMAGE_MIN_ZOOM,Math.min(IMAGE_MAX_ZOOM,value)):IMAGE_MIN_ZOOM;
}
/** Pin the displayed image coordinate below a pointer or keyboard anchor. */
export function anchoredImageOffset(
 previous:ImageOffset,oldZoom:number,nextZoom:number,anchor:ImageOffset
):ImageOffset{
 const ratio=nextZoom/oldZoom;
 return {x:anchor.x-(anchor.x-previous.x)*ratio,
   y:anchor.y-(anchor.y-previous.y)*ratio};
}
export function isLocalVerifiedImageUri(uri:string):boolean{
 return ["png","jpeg","webp","avif","gif"].some(type=>
   uri.startsWith("data:image/"+type+";base64,"));
}
export interface ImageViewer{
 isOpen():boolean;
 /** Close before a screen redraw changes the element that launched the viewer. */
 beforeRender():void;
 close():void;
 dispose():void;
}
type Pointer={x:number;y:number};
type ActiveView={
 dialog:HTMLDialogElement;
 thumbnail:HTMLImageElement;
 image:HTMLImageElement;
 viewport:HTMLElement;
 zoomLabel:HTMLElement;
 zoomOut:HTMLButtonElement;
 zoomIn:HTMLButtonElement;
 reset:HTMLButtonElement;
 trigger:HTMLElement;
 previousOverflow:string;
 zoom:number;
 pan:ImageOffset;
 fit:ImageGeometry;
 pointers:Map<number,Pointer>;
 cleanup:()=>void;
};
const create=(tag:string,className?:string):HTMLElement=>{
 const element=document.createElement(tag);
 if(className)element.className=className;
 return element;
};
const action=(label:string,className=""):HTMLButtonElement=>{
 const button=document.createElement("button");
 button.type="button";button.className="btn "+className;
 button.textContent=label;return button;
};
export function createImageViewer(root:HTMLElement):ImageViewer{
 let active:ActiveView|null=null,disposed=false;
 const close=():void=>{
   const current=active;
   if(!current)return;
   active=null;
   current.cleanup();
   if(current.dialog.open)current.dialog.close();
   // Release the transient second data URI and decoded enlarged bitmap.
   current.image.removeAttribute("src");
   current.dialog.remove();
   document.body.style.overflow=current.previousOverflow;
   if(current.trigger.isConnected)current.trigger.focus({preventScroll:true});
   else{
     const heading=root.querySelector<HTMLElement>("h1");
     if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
   }
 };
 const update=(state:ActiveView):void=>{
   const v={width:state.viewport.clientWidth,height:state.viewport.clientHeight};
   const size=fittedImage({width:state.image.naturalWidth,height:state.image.naturalHeight},v);
   state.fit=size;
   state.pan=boundedImageOffset(state.pan,state.zoom,size,v);
   state.image.style.width=size.width+"px";
   state.image.style.height=size.height+"px";
   state.image.style.transform="translate("+state.pan.x+"px, "+state.pan.y+"px) scale("+state.zoom+")";
   state.zoomLabel.textContent=Math.round(state.zoom*100)+"%";
   state.zoomOut.disabled=state.zoom<=IMAGE_MIN_ZOOM;
   state.zoomIn.disabled=state.zoom>=IMAGE_MAX_ZOOM;
   state.reset.disabled=state.zoom===1&&state.pan.x===0&&state.pan.y===0;
 };
 const open=(thumbnail:HTMLImageElement,trigger:HTMLElement):void=>{
   if(disposed)return;
   const uri=thumbnail.currentSrc||thumbnail.src;
   if(!isLocalVerifiedImageUri(uri))return;
   close();
   const dialog=document.createElement("dialog");
   dialog.className="generic-image-dialog";
   dialog.setAttribute("aria-label","Enlarged examination image");
   const container=create("div","generic-image-shell");
   const header=create("div","generic-image-head");
   const label=create("div","generic-image-title");label.textContent="Image detail";
   const closeButton=action("Close","generic-image-close");
   closeButton.setAttribute("aria-label","Close enlarged image");
   header.append(label,closeButton);
   const toolbar=create("div","generic-image-toolbar");
   const out=action("−","generic-image-control");
   out.setAttribute("aria-label","Zoom out");out.title="Zoom out (−)";
   const zoomText=create("output","generic-image-zoom");
   zoomText.setAttribute("aria-live","polite");zoomText.setAttribute("aria-label","Image zoom");
   const inside=action("+","generic-image-control");
   inside.setAttribute("aria-label","Zoom in");inside.title="Zoom in (+)";
   const reset=action("Fit","generic-image-control");
   reset.setAttribute("aria-label","Reset zoom and position");
   toolbar.append(out,zoomText,inside,reset);
   const viewport=create("div","generic-image-viewport");
   viewport.tabIndex=0;
   viewport.setAttribute("role","region");
   viewport.setAttribute("aria-label","Image canvas. Use plus and minus to zoom, arrow keys to pan, and Escape to close.");
   const image=document.createElement("img");
   image.className="generic-image-large";
   image.alt=thumbnail.alt;image.draggable=false;image.decoding="async";
   viewport.append(image);
   const caption=create("p","generic-image-caption");
   caption.textContent=thumbnail.alt||"Examination image";
   const help=create("p","generic-image-help");
   help.textContent="Drag or pinch to pan · scroll to zoom · double-click to magnify · arrow keys to pan";
   container.append(header,toolbar,viewport,caption,help);
   dialog.append(container);
   document.body.append(dialog);
   const state:ActiveView={dialog,thumbnail,image,viewport,zoomLabel:zoomText,
     zoomOut:out,zoomIn:inside,reset,trigger,
     previousOverflow:document.body.style.overflow,zoom:1,pan:{x:0,y:0},
     fit:{width:0,height:0},pointers:new Map(),cleanup:()=>{}};
   const zoomTo=(next:number,anchor:ImageOffset={x:0,y:0}):void=>{
     const value=boundedImageZoom(next);
     state.pan=anchoredImageOffset(state.pan,state.zoom,value,anchor);
     state.zoom=value;update(state);
   };
   const resetZoom=()=>{state.zoom=1;state.pan={x:0,y:0};update(state);};
   const at=(x:number,y:number):ImageOffset=>{
     const r=viewport.getBoundingClientRect();
     return {x:x-r.left-r.width/2,y:y-r.top-r.height/2};
   };
   const onKey=(event:KeyboardEvent):void=>{
     // Exam shortcuts, fullscreen Escape and background document controls
     // must never run while the modal has focus.
     event.stopPropagation();
     if(event.key==="Escape"){event.preventDefault();close();return;}
     if(event.key==="Tab"){
       // Some file:// browser engines do not keep a native dialog's focus
       // fully cyclic at the viewport edge. Close, toolbar and canvas form
       // a deterministic focus loop without relying on that engine detail.
       const available=[closeButton,out,inside,reset,viewport].filter(x=>
         !(x instanceof HTMLButtonElement&&x.disabled));
       const index=available.indexOf(document.activeElement as HTMLElement);
       if(index<0||(event.shiftKey&&index===0)||
         (!event.shiftKey&&index===available.length-1)){
         event.preventDefault();
         available[event.shiftKey?available.length-1:0]?.focus({preventScroll:true});
       }
       return;
     }
     if(event.ctrlKey||event.metaKey||event.altKey)return;
     const key=event.key;
     if(key==="+"||key==="="){event.preventDefault();zoomTo(state.zoom*1.3);}
     else if(key==="-"){event.preventDefault();zoomTo(state.zoom/1.3);}
     else if(key==="0"){event.preventDefault();resetZoom();}
     else if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(key)){
       event.preventDefault();
       const delta=key==="ArrowLeft"?{x:50,y:0}:key==="ArrowRight"?{x:-50,y:0}:
         key==="ArrowUp"?{x:0,y:50}:{x:0,y:-50};
       state.pan={x:state.pan.x+delta.x,y:state.pan.y+delta.y};update(state);
     }
   };
   const onCancel=(event:Event)=>{event.preventDefault();close();};
   const onWheel=(event:WheelEvent)=>{
     event.preventDefault();
     zoomTo(state.zoom*Math.exp(-Math.sign(event.deltaY)*.16),at(event.clientX,event.clientY));
   };
   const onPointerDown=(event:PointerEvent)=>{
     if(event.button!==0&&event.pointerType==="mouse")return;
     event.preventDefault();
     state.pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
     viewport.setPointerCapture(event.pointerId);
   };
   const onPointerMove=(event:PointerEvent)=>{
     if(!state.pointers.has(event.pointerId))return;
     const before=state.pointers.get(event.pointerId)!;
     const after={x:event.clientX,y:event.clientY};
     const prior=[...state.pointers.values()];
     state.pointers.set(event.pointerId,after);
     if(prior.length===1){
       state.pan={x:state.pan.x+after.x-before.x,y:state.pan.y+after.y-before.y};
       update(state);return;
     }
     if(prior.length===2){
       const now=[...state.pointers.values()];
       const oldDist=Math.hypot(prior[0]!.x-prior[1]!.x,prior[0]!.y-prior[1]!.y);
       const newDist=Math.hypot(now[0]!.x-now[1]!.x,now[0]!.y-now[1]!.y);
       const oldMid={x:(prior[0]!.x+prior[1]!.x)/2,y:(prior[0]!.y+prior[1]!.y)/2};
       const newMid={x:(now[0]!.x+now[1]!.x)/2,y:(now[0]!.y+now[1]!.y)/2};
       state.pan={x:state.pan.x+newMid.x-oldMid.x,y:state.pan.y+newMid.y-oldMid.y};
       if(oldDist>0&&newDist>0)zoomTo(state.zoom*newDist/oldDist,at(newMid.x,newMid.y));
       else update(state);
     }
   };
   const endPointer=(event:PointerEvent)=>{
     state.pointers.delete(event.pointerId);
     if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
   };
   const onResize=()=>update(state);
   state.cleanup=()=>{
     window.removeEventListener("resize",onResize);
     dialog.removeEventListener("keydown",onKey);
     dialog.removeEventListener("cancel",onCancel);
     viewport.removeEventListener("wheel",onWheel);
     viewport.removeEventListener("pointerdown",onPointerDown);
     viewport.removeEventListener("pointermove",onPointerMove);
     viewport.removeEventListener("pointerup",endPointer);
     viewport.removeEventListener("pointercancel",endPointer);
     state.pointers.clear();
   };
   dialog.addEventListener("keydown",onKey);
   dialog.addEventListener("cancel",onCancel);
   viewport.addEventListener("wheel",onWheel,{passive:false});
   viewport.addEventListener("pointerdown",onPointerDown);
   viewport.addEventListener("pointermove",onPointerMove);
   viewport.addEventListener("pointerup",endPointer);
   viewport.addEventListener("pointercancel",endPointer);
   window.addEventListener("resize",onResize);
   closeButton.addEventListener("click",close);
   out.addEventListener("click",()=>zoomTo(state.zoom/1.3));
   inside.addEventListener("click",()=>zoomTo(state.zoom*1.3));
   reset.addEventListener("click",resetZoom);
   viewport.addEventListener("dblclick",event=>{
     event.preventDefault();zoomTo(state.zoom>=2?1:2,at(event.clientX,event.clientY));
   });
   try{
     dialog.showModal();
   }catch{
     state.cleanup();dialog.remove();return;
   }
   active=state;
   document.body.style.overflow="hidden";
   image.addEventListener("load",()=>{if(active===state)update(state);});
   image.addEventListener("error",()=>{
     if(active===state){help.textContent="Image could not be decoded. Close and check the original exam file.";update(state);}
   });
   image.src=uri;
   // The title, zoom controls and close button remain in the native focus trap.
   closeButton.focus({preventScroll:true});
   update(state);
 };
 const click=(event:MouseEvent):void=>{
   const target=event.target;
   if(!(target instanceof Element))return;
   const hit=target.closest<HTMLElement>("[data-image-open],img.generic-figure");
   if(!hit||!root.contains(hit))return;
   const frame=hit.closest<HTMLElement>(".generic-media-frame");
   const image=frame?.querySelector<HTMLImageElement>("img.generic-figure");
   if(!image)return;
   const trigger=frame?.querySelector<HTMLElement>("[data-image-open]")??hit;
   // Critical: opening a thumbnail inside an answer label must NOT activate
   // the label's radio/checkbox by default, nor advance an exam.
   event.preventDefault();event.stopPropagation();
   open(image,trigger);
 };
 const key=(event:KeyboardEvent):void=>{
   if(event.key!=="Enter"&&event.key!==" ")return;
   const t=event.target;
   if(!(t instanceof HTMLElement)||!t.matches("[data-image-open]")||!root.contains(t))return;
   event.preventDefault();event.stopPropagation();
   const image=t.closest(".generic-media-frame")?.querySelector<HTMLImageElement>("img.generic-figure");
   if(image)open(image,t);
 };
 root.addEventListener("click",click,true);
 root.addEventListener("keydown",key,true);
 return {
   isOpen:()=>active!==null,
   beforeRender:()=>{if(active)close();},
   close,
   dispose:()=>{if(disposed)return;disposed=true;close();
     root.removeEventListener("click",click,true);
     root.removeEventListener("keydown",key,true);
   }
 };
}
