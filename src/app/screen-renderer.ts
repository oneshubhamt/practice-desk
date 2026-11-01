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
        "data-section","data-attempt","data-result-tab"].filter(name=>previous.hasAttribute(name))
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
    root.innerHTML=p.html();
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
        if(target instanceof HTMLInputElement&&previous instanceof HTMLInputElement&&
            target.type==="search"&&previous.type==="search"){
          try{target.setSelectionRange(previous.selectionStart??target.value.length,
            previous.selectionEnd??target.value.length);}
          catch{/* Search input may not expose selection ranges. */}
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
