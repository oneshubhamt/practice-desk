/** P47-6 module: history-controller.ts */


import {isAttempt} from "./stored-record-validator.ts";

import {historyRowsHTML} from "./history-page.ts";
import {DEFAULT_HISTORY_QUERY,filteredHistory,historyQueryError,activeHistoryFilterCount,type HistoryQuery} from "./history-query.ts";

import type {HistoryControllerContext} from "./coordinator-context.ts";

export const changeHistoryFilters=(owner:HistoryControllerContext,next:HistoryQuery,redraw=true):void=>{
    owner.historyQuery=next;
    try{sessionStorage.setItem(owner.historyQueryKey,JSON.stringify(next));}catch{}
    if(redraw)owner.draw();
  };

export function bindHistoryScreen(owner:HistoryControllerContext):void{

     owner.root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>owner.go({screen:"library"});
     // Filter edits keep #app, controls, and all-time metrics mounted.
     const bindHistoryRows=():void=>{
       owner.root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(b=>b.onclick=()=>{void owner.removeSavedAttempt(b.dataset.delete??"","completed");});
       owner.root.querySelectorAll<HTMLButtonElement>("[data-discard]").forEach(b=>b.onclick=()=>{void owner.removeSavedAttempt(b.dataset.discard??"","discard-unfinished");});
       owner.root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(b=>b.onclick=()=>owner.openSaved(b.dataset.attempt??""));
     };
     const refreshHistoryRows=():void=>{
       const attempts=[...owner.records.values()].filter(isAttempt);
       const visible=filteredHistory(attempts,owner.packages,owner.historyQuery);
       const results=owner.root.querySelector<HTMLElement>("#g-history-records");
       if(!results)return;
       results.innerHTML=historyRowsHTML(visible,owner.packages);
       owner.root.querySelector<HTMLElement>("#g-history-count")!.textContent=
         visible.length+" of "+attempts.length+" records shown";
       const count=activeHistoryFilterCount(owner.historyQuery);
       owner.root.querySelector<HTMLElement>(".history-filter-footer .fine")!.textContent=
         count+" active filter"+(count===1?"":"s")+
         " · Dates use the local calendar day when each attempt started; both endpoints are inclusive.";
       owner.root.querySelector<HTMLButtonElement>("#g-history-reset")!.disabled=
         count===0&&owner.historyQuery.sort==="newest";
       const error=historyQueryError(owner.historyQuery);
       let alert=owner.root.querySelector<HTMLElement>("#g-history-filter-error");
       if(error){if(!alert){alert=document.createElement("p");alert.id="g-history-filter-error";
           alert.className="generic-warning";alert.setAttribute("role","alert");
           owner.root.querySelector(".history-filter-footer")!.after(alert);}
         alert.textContent=error;
       }else alert?.remove();
       bindHistoryRows();
     };
     const setFilter=(patch:Partial<HistoryQuery>)=>{
       owner.changeHistoryQuery({...owner.historyQuery,...patch},false);refreshHistoryRows();
     };
     owner.root.querySelector<HTMLSelectElement>("#g-filter")!.onchange=e=>
       setFilter({status:(e.target as HTMLSelectElement).value as HistoryQuery["status"]});
     owner.root.querySelector<HTMLSelectElement>("#g-history-paper")!.onchange=e=>
       setFilter({paperRevisionId:(e.target as HTMLSelectElement).value});
     owner.root.querySelector<HTMLSelectElement>("#g-history-exam")!.onchange=e=>
       setFilter({examId:(e.target as HTMLSelectElement).value});
     owner.root.querySelector<HTMLSelectElement>("#g-history-mode")!.onchange=e=>
       setFilter({mode:(e.target as HTMLSelectElement).value});
     owner.root.querySelector<HTMLInputElement>("#g-history-from")!.onchange=e=>
       setFilter({startedFrom:(e.target as HTMLInputElement).value});
     owner.root.querySelector<HTMLInputElement>("#g-history-to")!.onchange=e=>
       setFilter({startedTo:(e.target as HTMLInputElement).value});
     owner.root.querySelector<HTMLSelectElement>("#g-history-sort")!.onchange=e=>
       setFilter({sort:(e.target as HTMLSelectElement).value as HistoryQuery["sort"]});
     owner.root.querySelector<HTMLInputElement>("#g-history-search")!.oninput=e=>
       setFilter({search:(e.target as HTMLInputElement).value});
     owner.root.querySelector<HTMLButtonElement>("#g-history-reset")!.onclick=()=>
       owner.changeHistoryQuery(DEFAULT_HISTORY_QUERY);
     owner.root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void owner.downloadBackup();};
     owner.root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>owner.root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     owner.root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await owner.importHistory(file);}catch(error){owner.notice(error instanceof Error?error.message:"History import failed");}
     };
     bindHistoryRows();
     owner.root.querySelector<HTMLButtonElement>("#g-delete-completed")!.onclick=()=>{void owner.deleteAllCompleted();};
     owner.root.querySelector<HTMLButtonElement>("#g-storage-persist")!.onclick=()=>{void owner.requestPersistentStorage();};
     void owner.showStorageEstimate();
     return;
   
}
