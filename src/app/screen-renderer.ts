import {reconcileSameExamQuestion} from "./exam-dom-reconcile.ts";
/** Presentation-only screen renderer.
 * No URL/history, persistent storage, exam policy or navigation decisions.
 */
export type DisplayScreen="library"|"history"|"learning"|"exam"|"result";
export type ResultPane="overview"|"review"|"timing";
export type ScreenPresentation={
  readonly screen:DisplayScreen;
  readonly screenKey:string;
  readonly announcement:string;
  readonly resultPane:ResultPane;
  readonly html:()=>string;
};
type LearningDisplay={show():void;hide():void};
export interface ScreenRenderer{
  render(presentation:ScreenPresentation,learning:LearningDisplay):void;
}
export function createScreenRenderer(root:HTMLElement):ScreenRenderer{
  let lastScreenKey="";
  let lastView:DisplayScreen|null=null;
  let lastPane:ResultPane="overview";
  return {render(p,learning){
    const previous=document.activeElement;
    const focusKey=previous instanceof HTMLElement&&root.contains(previous)?
      {id:previous.id,attributes:["data-choice","data-bool","data-match","data-q",
        "data-section","data-attempt","data-result-tab","data-manual-marks",
        "data-manual-note","data-manual-save","data-add-card"].filter(name=>previous.hasAttribute(name))
        .map(name=>[name,previous.getAttribute(name)] as const)}:null;
    root.classList.add("generic-workspace");
    const priorView=lastView,priorPane=lastPane;
    if(p.screen==="learning"){
      lastView="learning";lastPane=p.resultPane;
      const entering=lastScreenKey!=="learning";
      lastScreenKey="learning";
      learning.show();
      if(entering){
        const announcement=document.getElementById("screen-announcement");
        if(announcement)announcement.textContent=p.announcement;
        const heading=root.querySelector<HTMLElement>("h1");
        if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      }
      return;
    }
    learning.hide();
    // Retain controls/focus on the same Exam question, Result pane or Library.
    // Route changes still use the heading-focus/full-replacement policy.
    // Active Wordgard sessions suspend background Library redraws.
    if(lastView===p.screen&&lastScreenKey===p.screenKey&&
       (p.screen==="exam"||p.screen==="result"||p.screen==="library"))
      reconcileSameExamQuestion(root,p.html());
    else root.innerHTML=p.html();
    if(lastScreenKey!==p.screenKey){
      lastScreenKey=p.screenKey;
      const announcer=document.getElementById("screen-announcement");
      if(announcer)announcer.textContent=p.announcement;
    }
    lastView=p.screen;lastPane=p.resultPane;
    if(focusKey){
      const controls=[...root.querySelectorAll<HTMLElement>("button,input,select,textarea")];
      const target=focusKey.id?controls.find(item=>item.id===focusKey.id):
        controls.find(item=>focusKey.attributes.some(([name,value])=>
          item.hasAttribute(name)&&item.getAttribute(name)===value));
      if(target&&!("disabled" in target&&target.disabled)){
        target.focus({preventScroll:true});
        // Preserve edit cursor and scroll, never stale values from earlier state.
        if((target instanceof HTMLInputElement&&previous instanceof HTMLInputElement&&
            ["search","text"].includes(target.type)&&target.type===previous.type)||
           (target instanceof HTMLTextAreaElement&&previous instanceof HTMLTextAreaElement)){
          const current=target as HTMLInputElement|HTMLTextAreaElement;
          const former=previous as HTMLInputElement|HTMLTextAreaElement;
          try{current.setSelectionRange(former.selectionStart??current.value.length,
            former.selectionEnd??current.value.length,former.selectionDirection??"none");
            current.scrollTop=former.scrollTop;current.scrollLeft=former.scrollLeft;
          }catch{/* Unsupported input selection must not interrupt redraw. */}
        }
      }
    }
    // Native routing owns URL; this module owns visible focus and announcements.
    if(priorView!==null&&priorView!==p.screen){
      const heading=root.querySelector<HTMLElement>("h1");
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
    }else if(p.screen==="result"&&priorView==="result"&&priorPane!==p.resultPane){
      root.querySelector<HTMLElement>("#result-tab-"+p.resultPane)?.focus({preventScroll:true});
    }
  }};
}
