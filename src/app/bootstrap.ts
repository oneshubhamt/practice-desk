import { mountExamWorkspace } from "./generic-ui.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";

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
const settingsKey="practiceDesk.overhaul.settings.v1";
type Settings={dark:boolean;scale:number};
let settings:Settings={dark:false,scale:100};
try{
 const stored=JSON.parse(localStorage.getItem(settingsKey)??"null") as Partial<Settings>|null;
 if(typeof stored?.dark==="boolean")settings.dark=stored.dark;
 if(Number.isInteger(stored?.scale)&&stored!.scale!>=85&&stored!.scale!<=140)settings.scale=stored!.scale!;
}catch{/* Browser may block file:// preferences. */}
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
function persist(){apply();try{localStorage.setItem(settingsKey,JSON.stringify(settings));}catch{}}
document.getElementById("themeToggle")?.addEventListener("click",()=>{settings.dark=!settings.dark;persist();});
document.getElementById("fontLess")?.addEventListener("click",()=>{settings.scale=Math.max(85,settings.scale-5);persist();});
document.getElementById("fontMore")?.addEventListener("click",()=>{settings.scale=Math.min(140,settings.scale+5);persist();});
document.getElementById("fontReset")?.addEventListener("click",()=>{settings.scale=100;persist();});
apply();
