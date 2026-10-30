import { mountExamWorkspace } from "./generic-ui.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import { readDisplayPreferences, writeDisplayPreferences, SETTINGS_EVENT } from "./preferences.ts";
import type { DisplayPreferences } from "./preferences.ts";

function readEmbedded<T>(id:string):T {
 const element=document.getElementById(id);
 if(!element?.textContent)throw new Error("Missing offline exam bank: "+id);
 return JSON.parse(element.textContent) as T;
}
const sources=readEmbedded<SourcePaperBank>("paper-bank");
const patches=readEmbedded<ReviewPatchBank>("review-patches");
const solutions=readEmbedded<Readonly<Record<string,Readonly<Record<string,string>>>>>("solution-bank");
const root=document.getElementById("app");
if(!root)throw new Error("Practice Desk mount missing");
mountExamWorkspace(root,sources,patches,solutions);
let settings:DisplayPreferences=readDisplayPreferences();
function apply(){
 document.documentElement.dataset.theme=settings.dark?"dark":"light";
 document.documentElement.style.setProperty("--type-scale",String(settings.scale/100));
 const theme=document.getElementById("themeToggle");
 if(theme){theme.textContent=settings.dark?"Switch to light":"Switch to dark";theme.setAttribute("aria-pressed",String(settings.dark));}
 for(const [id,pressed] of [["themeLight",!settings.dark],["themeDark",settings.dark]] as const){
   const control=document.getElementById(id);
   control?.setAttribute("aria-pressed",String(pressed));
 }
 const size=document.getElementById("fontReset");if(size)size.textContent=settings.scale+"%";
 const less=document.getElementById("fontLess") as HTMLButtonElement|null;
 const more=document.getElementById("fontMore") as HTMLButtonElement|null;
 if(less)less.disabled=settings.scale<=85;
 if(more)more.disabled=settings.scale>=140;
}
function persist(next:DisplayPreferences){
 try{settings=writeDisplayPreferences(next);apply();}
 catch{const status=document.getElementById("preferences-warning");if(status)status.textContent="Display preference could not be saved.";}
}
document.getElementById("themeToggle")?.addEventListener("click",()=>persist({...settings,dark:!settings.dark}));
document.getElementById("themeLight")?.addEventListener("click",()=>persist({...settings,dark:false}));
document.getElementById("themeDark")?.addEventListener("click",()=>persist({...settings,dark:true}));
document.getElementById("fontLess")?.addEventListener("click",()=>persist({...settings,scale:Math.max(85,settings.scale-5)}));
document.getElementById("fontMore")?.addEventListener("click",()=>persist({...settings,scale:Math.min(140,settings.scale+5)}));
document.getElementById("fontReset")?.addEventListener("click",()=>persist({...settings,scale:100}));
window.addEventListener(SETTINGS_EVENT,()=>{
 settings=readDisplayPreferences();apply();
});
apply();

const displayTrigger=document.getElementById("displayTrigger") as HTMLButtonElement|null;
const displayPanel=document.getElementById("displayPanel") as HTMLElement|null;
function setDisplayOpen(open:boolean):void{
 if(!displayPanel||!displayTrigger)return;
 displayPanel.hidden=!open;
 displayTrigger.setAttribute("aria-expanded",String(open));
 if(open)document.getElementById("fontReset")?.focus();
}
displayTrigger?.addEventListener("click",()=>setDisplayOpen(displayPanel?.hidden===true));
document.getElementById("displayClose")?.addEventListener("click",()=>{setDisplayOpen(false);displayTrigger?.focus();});
document.addEventListener("pointerdown",event=>{
 if(displayPanel&&!displayPanel.hidden&&!((event.target instanceof Node)&&
   (displayPanel.contains(event.target)||displayTrigger?.contains(event.target))))setDisplayOpen(false);
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&displayPanel&&!displayPanel.hidden){setDisplayOpen(false);displayTrigger?.focus();}
});
const fullButton=document.getElementById("displayFullscreen") as HTMLButtonElement|null;
const isFullscreen=()=>Boolean(document.fullscreenElement||
 document.documentElement.classList.contains("immersive"));
function updateFullscreen():void{
 const active=isFullscreen();
 if(fullButton){
   fullButton.textContent=active?"Exit full screen":"Enter full screen";
   fullButton.setAttribute("aria-pressed",String(active));
 }
 const examButton=document.getElementById("g-exam-full");
 if(examButton){
   examButton.textContent=active?"⛶ Exit full screen":"⛶ Full screen";
   examButton.setAttribute("aria-pressed",String(active));
 }
}
function setImmersive(active:boolean):void{
 document.documentElement.classList.toggle("immersive",active);
 updateFullscreen();
}
async function toggleFullscreen():Promise<void>{
 if(document.fullscreenElement){
   try{await document.exitFullscreen();}
   catch{setImmersive(false);}
   updateFullscreen();return;
 }
 if(document.documentElement.classList.contains("immersive")){
   setImmersive(false);return;
 }
 try{
   if(!document.documentElement.requestFullscreen)throw new Error("Fullscreen unsupported");
   await document.documentElement.requestFullscreen();
   setImmersive(true);
 }catch{
   setImmersive(true);
   const message="Focus layout enabled. Browser full screen is unavailable here.";
   const globalStatus=document.getElementById("preferences-warning");
   if(globalStatus)globalStatus.textContent=message;
   const examStatus=document.getElementById("g-fullscreen-status");
   if(examStatus)examStatus.textContent=message;
 }
}
fullButton?.addEventListener("click",()=>{void toggleFullscreen();});
window.addEventListener("practice-desk:toggle-fullscreen",()=>{void toggleFullscreen();});
document.addEventListener("fullscreenchange",()=>{
 setImmersive(Boolean(document.fullscreenElement));
});
document.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&!document.fullscreenElement&&
    document.documentElement.classList.contains("immersive")&&
    (!displayPanel||displayPanel.hidden))setImmersive(false);
});
updateFullscreen();
