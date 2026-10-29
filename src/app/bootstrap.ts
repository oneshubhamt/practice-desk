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
 if(theme){theme.textContent=settings.dark?"Light theme":"Dark theme";theme.setAttribute("aria-pressed",String(settings.dark));}
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
document.getElementById("fontLess")?.addEventListener("click",()=>persist({...settings,scale:Math.max(85,settings.scale-5)}));
document.getElementById("fontMore")?.addEventListener("click",()=>persist({...settings,scale:Math.min(140,settings.scale+5)}));
document.getElementById("fontReset")?.addEventListener("click",()=>persist({...settings,scale:100}));
window.addEventListener(SETTINGS_EVENT,()=>{
 settings=readDisplayPreferences();apply();
});
apply();
