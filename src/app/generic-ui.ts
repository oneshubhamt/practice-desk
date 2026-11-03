import {escapeText} from "./html-escape.ts";
import {minutes,readablePracticeMode,examTimeRemaining,renderModelExam} from "./exam-view.ts";
import {validateGenericStoredRecord,isAttempt,isPackage,isLearning,type RecordItem} from "./stored-record-validator.ts";
import {frozenReviewMedia,sourceReviewHTML} from "./review-media-view.ts";
import { builtinCglPackages, configureCglPractice, configureUntimedPractice, validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "./exam-package.ts";
import type { ExamPackage, GenericAttempt, CglPracticeMode } from "./exam-package.ts";
import type { QuestionRevision } from "../domain/question.js";
import type { QuestionRevisionId,OptionId } from "../domain/ids.js";
import type { SessionEvent } from "../engine/session.ts";

import { restoreSession, chooseRecovered } from "../history/frozen.ts";
import { createSessionClock } from "../engine/clock.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { manualGradeLimit, manualGradeSummary, setManualGrade } from "../engine/manual-grading.ts";
import { createSourceKeyReference,sourceKeyScore } from "../engine/source-comparison.ts";
import { composePracticeSet,practiceInventory } from "./practice-compose.ts";
import { createSourceReviewReference } from "../engine/review-source.ts";
import { scoreableMaximum, scoreableLowerBound, sectionScoreSummaries } from "../engine/score-ceiling.ts";
import { serializeVerifiedBackup, verifyBackup, planBackupMerge } from "../history/backup.ts";
import { assertWriteVersion, nextWriteVersion } from "../history/concurrency.ts";
import { assertDeletionAllowed, deletionWarning, type DeletionIntent } from "../history/deletion-policy.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import { createLearningDesk } from "./learning-ui.ts";
import { makeRevisionPackage,createNotebookLineage } from "../learning/revision-test.ts";
import { questionSpeed } from "../learning/question-analytics.ts";
import { historyHTML,healthSummary,type StorageHealth } from "./history-page.ts";
import {DEFAULT_HISTORY_QUERY,restoreHistoryQuery,type HistoryQuery} from "./history-query.ts";
import {backupDownload,readBackupFile} from "../history/backup-file.ts";
import {SHARED_DB_NAME,ATTEMPTS_STORE,SNAPSHOTS_STORE,compactAttempt,expandAttempt,
 isSharedAttempt,verifiedSnapshot,reconstructRecords,pruneSharedSnapshots} from "../history/shared-store.ts";
import type {SharedSnapshot,SlimAttempt} from "../history/shared-store.ts";
import { frozenScoreSummary } from "./history-score.ts";
import { editorialStatusLabel } from "./editorial-labels.ts";
import { multipleDraftMessage,duplicateMatchingTargets } from "./response-drafts.ts";
import { examPreflight,preflightHTML,examRulesHTML } from "./exam-preflight.ts";
import { reviewMatch, reviewFiltersHTML, resultTabsHTML, timingLedgerHTML, resultInsightsHTML, type ResultTab, type ReviewFilter } from "./result-presentation.ts";
import { addLearningCard } from "../learning/learning.ts";
import type { LearningCard } from "../learning/learning.ts";
import { readDisplayPreferences, writeDisplayPreferences, SETTINGS_EVENT } from "./preferences.ts";
import { readPracticeSetups,writePracticeSetups,type PracticeSetups } from "./practice-selection.ts";
import { examFamilyCatalog,familyIdFor,pairedEdition,BUILTIN_CGL_FAMILY } from "./exam-families.ts";
import { importAuthoredExam, APFC_NAT_BANK_TEMPLATE } from "./bank-import.ts";
import { createScreenRenderer } from "./screen-renderer.ts";
import { createImageViewer } from "./image-viewer.ts";
import { createNativeRouter, type AppRoute, type RouteContext, type NativeRouter } from "./navigation.ts";


let builtinCache:{
 sources:SourcePaperBank;patches:ReviewPatchBank;
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>;bundles:ExamPackage[]
}|null=null;
function cachedCglPackages(sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):ExamPackage[]{
 if(builtinCache&&builtinCache.sources===sources&&builtinCache.patches===patches&&builtinCache.solutions===solutions)
   return builtinCache.bundles;
 const bundles=builtinCglPackages(sources,patches,solutions);
 builtinCache={sources,patches,solutions,bundles};
 return bundles;
}
export function mountExamWorkspace(root:HTMLElement,sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):()=>void{
 const builtins=cachedCglPackages(sources,patches,solutions);
 const builtinPaperIds=new Set(builtins.map(p=>p.paper.id));
 const packages=new Map<string,ExamPackage>(builtins.map(p=>[p.paper.id,p]));
 const records=new Map<string,RecordItem>();
 const storedSnapshots=new Map<string,SharedSnapshot>();
 let choice=[...packages.values()].reverse().find(p=>p.paper.edition==="reviewed")?.paper.id??(packages.keys().next().value as string);
 let cglMode:CglPracticeMode="strict", singleSection=0, untimedPractice=false;
 let editionView:"source"|"reviewed"=packages.get(choice)?.paper.edition==="source"?"source":"reviewed";
 const storedSetups=readPracticeSetups();
 let selectedFamilyId=BUILTIN_CGL_FAMILY;
 let setups:PracticeSetups=storedSetups??{
   schema:2,selectedFamilyId:BUILTIN_CGL_FAMILY,
   families:{[BUILTIN_CGL_FAMILY]:{
     paperRevisionId:choice,mode:cglMode,section:singleSection,
     untimed:untimedPractice,edition:editionView
   }}
 };
 const families=()=>examFamilyCatalog(packages.values(),builtinPaperIds);
 const applyFamily=(id:string):void=>{
   selectedFamilyId=id;
   const previous=setups.families[id];
   if(previous){
     choice=previous.paperRevisionId;cglMode=previous.mode;
     singleSection=previous.section;untimedPractice=previous.untimed;
     editionView=previous.edition;
   }else{
     const family=families().find(f=>f.id===id);
     const paper=family?.papers.find(p=>p.paper.edition==="reviewed")??family?.papers[0];
     choice=paper?.paper.id??"";cglMode="strict";singleSection=0;
     untimedPractice=false;editionView=paper?.paper.edition==="source"?"source":"reviewed";
   }
   if(packages.has(choice))
     singleSection=Math.min(singleSection,Math.max(0,packages.get(choice)!.paper.sections.length-1));
 };
 const saveSelection=():void=>{
   const next:PracticeSetups={schema:2,selectedFamilyId,
     families:{...setups.families,[selectedFamilyId]:{
       paperRevisionId:choice,mode:cglMode,section:singleSection,
       untimed:untimedPractice,edition:editionView
     }}};
   setups=next;
   try{writePracticeSetups(next);}
   catch{warning="Exam setup could not be saved on this device; current selection still works.";}
 };
  const historyQueryKey="practiceDesk.history.view.v1";
  let historyQuery:HistoryQuery=(()=>{
    try{return restoreHistoryQuery(JSON.parse(sessionStorage.getItem(historyQueryKey)??"null"));}
    catch{return DEFAULT_HISTORY_QUERY;}
  })();
  // This is session-only archive UI state, never a frozen attempt or backup.
  const changeHistoryQuery=(next:HistoryQuery,redraw=true):void=>{
    historyQuery=next;
    try{sessionStorage.setItem(historyQueryKey,JSON.stringify(next));}catch{}
    if(redraw)draw();
  };
  // Builder-only UI state, independent of every exam's saved standard mode.
  let composeOpen=false,composeSection="",composeTopic="",composeDifficulty="";
  let composeCount=10,composeSeed="practice-1";
  let composePreview="";
  let composeError="";
  let resultTab:ResultTab="overview";
  let reviewFilter:ReviewFilter="all";
 let attempt:GenericAttempt|null=null, view:"library"|"history"|"exam"|"result"|"learning"="library";
 // Transient incomplete multi-select selections are NEVER part of the scored
 // response; saved answers are cleared when a draft becomes invalid.
 const choiceDrafts=new Map<string,{questionId:string;optionIds:OptionId[];message:string}>();
 // Live-region updates depend on actual route/question changes, not timer ticks.
 const screenRenderer=createScreenRenderer(root);
 // One transient dialog/handler set for the entire mounted workspace.
 const imageViewer=createImageViewer(root);
 let router:NativeRouter;
 let activationGeneration=0;
 // A newly created frozen session is already foreground/clock-initialized.
 // Do not restore or persist it a second time while its first save is pending.
 let freshlyStartedAttemptId:string|null=null;
 let routeHydrated=false;
 let hydrationDone:()=>void=()=>{};
 const hydration=new Promise<void>(resolve=>{hydrationDone=resolve;});
 const go=(target:AppRoute,history:"push"|"replace"="push"):void=>{
   void router.navigate(target,history).catch(error=>{
     warning=error instanceof Error?"Navigation failed: "+error.message:"Navigation failed";
     if(!disposed)draw();
   });
 };
 let db:IDBDatabase|null=null, warning="",disposed=false, loading=true, writeQueue=Promise.resolve();
 let lastTimerSave=0;
 let fallbackStamp:string|null=null, fallbackConflict=false, storageFault=false;
 let pendingWrites=0,lastCommittedAt:number|null=null,lastStorageFailure:string|null=null;
 const storageSnapshot=():StorageHealth=>({pendingWrites,lastCommittedAt,
   lastFailure:lastStorageFailure,locked:storageFault||fallbackConflict,
   loading,inMemoryRecords:records.size});
 const updateStorageHealth=():void=>{
   const snapshot=storageSnapshot();
   const status=root.querySelector<HTMLElement>("#g-storage-health");
   if(status)status.textContent=healthSummary(snapshot);
   const saved=root.querySelector<HTMLElement>("#g-storage-last-commit");
   if(saved)saved.textContent="Last completed write in this tab: "+
     (lastCommittedAt===null?"none observed since opening":new Date(lastCommittedAt).toLocaleString());
   const failed=root.querySelector<HTMLElement>("#g-storage-last-failure");
   if(failed)failed.textContent="Last storage failure in this tab: "+
     (lastStorageFailure??"none reported since opening");
   const count=root.querySelector<HTMLElement>("#g-storage-records");
   if(count)count.textContent="Loaded in this tab: "+records.size+
     " records (attempts, imported banks and learning cards). This is not a durable backup count.";
 };
 const recordStorageFailure=(error:unknown):void=>{
   lastStorageFailure=String(error instanceof Error?error.message:error).slice(0,240);
   updateStorageHealth();
 };
 const storageKey="practiceDesk.overhaul.fallback.v1", mirrorKey="practiceDesk.overhaul.active.v1";
 const dbName=SHARED_DB_NAME;
 const downloadBackup=async():Promise<void>=>{
   await writeQueue;
   try{
     let toExport:RecordItem[]=[...records.values()];
     if(db&&!storageFault){
       try{
         const snapshot=await new Promise<unknown[]>((resolve,reject)=>{
           const request=db!.transaction(ATTEMPTS_STORE,"readonly").objectStore(ATTEMPTS_STORE).getAll();
           request.onsuccess=()=>resolve(request.result);
           request.onerror=()=>reject(request.error??new Error("Database snapshot failed"));
         });
         toExport=reconstructRecords(snapshot,[...storedSnapshots.values()])
           .map(value=>validateGenericStoredRecord(value));
       }catch(error){
         storageFault=true;
         recordStorageFailure(error);
         console.warn("Cannot read authoritative backup snapshot; exporting working-memory recovery",error);
       }
     }else if(fallbackConflict&&!storageFault){
       const latest=JSON.parse(localStorage.getItem(storageKey)??"[]") as unknown;
       if(!Array.isArray(latest))throw new Error("Invalid fallback history");
       toExport=latest.map(value=>validateGenericStoredRecord(value));
     }
     // DB rows above have been validated once. The fallback branch is
     // verified here; no second full frozen-record copy or parse/stringify.
     if(!db||storageFault)toExport=toExport.map(value=>validateGenericStoredRecord(value));
     const serialized=serializeVerifiedBackup(toExport as unknown as readonly Record<string,unknown>[],
       readDisplayPreferences(),new Date().toISOString(),setups);
     const exportFile=await backupDownload(serialized);
     const url=URL.createObjectURL(exportFile.blob);
     const link=document.createElement("a");link.href=url;
     link.download="Practice_Desk_Backup_"+new Date().toISOString().slice(0,10)+
       (storageFault?"_UNSAVED_RECOVERY":"")+exportFile.extension;
     document.body.append(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),2000);
     if(storageFault){warning="Emergency recovery file exported. Some records were not committed to browser storage. Keep this file and reopen before editing.";draw();}
   }catch(error){warning=error instanceof Error?"Backup failed: "+error.message:"Backup failed";draw();}
 };
 const importHistory=async(file:File)=>{
   if(storageFault||fallbackConflict)throw new Error("Storage is unavailable or changed in another tab. Reopen before importing.");
   const archive=verifyBackup(await readBackupFile(file));
   const imported=reconstructRecords(archive.records,archive.snapshots)
     .map(record=>validateGenericStoredRecord(record));
   const incoming=planBackupMerge([...records.values()],imported,attempt?.id);
   if(!confirm("Import "+incoming.length+" new saved records and restore available display/exam setup preferences? Existing records will not be overwritten."))return;
   await writeQueue;
   if(incoming.length){
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const transaction=db!.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
         const store=transaction.objectStore(ATTEMPTS_STORE),snapshotStore=transaction.objectStore(SNAPSHOTS_STORE);
         const toInsert=new Map<string,SharedSnapshot>();
         for(const record of incoming){
           if(isAttempt(record)){
             const packed=compactAttempt(record);
             store.add(packed.row);toInsert.set(packed.snapshot.id,packed.snapshot);
           }else store.add(record);
         }
         for(const [id,snapshot] of toInsert){
           if(!storedSnapshots.has(id))snapshotStore.add(snapshot);
         }
         transaction.oncomplete=()=>resolve();
         transaction.onerror=()=>reject(transaction.error??new Error("Import failed"));
         transaction.onabort=()=>reject(transaction.error??new Error("Import aborted"));
       });
     }else{
       if(localStorage.getItem(storageKey)!==fallbackStamp)
         throw new Error("Another tab changed fallback history; reopen before importing");
       const encoded=JSON.stringify([...records.values(),...incoming]);
       localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;
     }
     for(const record of incoming){
       records.set(record.id,record);
       if(isAttempt(record)){const sh=compactAttempt(record).snapshot;storedSnapshots.set(sh.id,sh);}
       if(isPackage(record)&&!packages.has(record.bundle.paper.id))
         packages.set(record.bundle.paper.id,record.bundle);
     }
   }
   try{
     writeDisplayPreferences(archive.preferences);
     window.dispatchEvent(new Event(SETTINGS_EVENT));
     if(archive.setups){
       setups=archive.setups;applyFamily(setups.selectedFamilyId);saveSelection();
     }
     warning="Imported "+incoming.length+" records; available display/exam setup preferences restored.";
   }catch{
     warning="Imported "+incoming.length+" records. Display preferences could not be stored by this browser.";
   }
   draw();
 };
 const writeMirror=(record:GenericAttempt)=>{
   try{localStorage.setItem(mirrorKey,JSON.stringify(record));}
   catch{warning="Emergency session mirror could not be saved. Use a history export.";}
 };
 const notice=(s:string)=>{warning=s;draw();};
 const now=createSessionClock(Date.now(),performance.now(),()=>performance.now());
 const save=(record:RecordItem):Promise<boolean>=>{
   if(fallbackConflict||storageFault){
     warning="Storage is unavailable or changed in another tab. Export a recovery backup and reopen before editing.";
     draw();return Promise.resolve(false);
   }
   const previous=records.get(record.id);
   const expected=previous?previous.saveRevision??0:null;
   const versioned={...record,saveRevision:nextWriteVersion(expected)};
   const packed=isAttempt(versioned)?compactAttempt(versioned):null;
   records.set(record.id,versioned);
   if(isAttempt(versioned)){
     if(attempt?.id===versioned.id)attempt=versioned;
     writeMirror(versioned);
   }
   pendingWrites++;
   updateStorageHealth();
   const pending=writeQueue.then(()=>new Promise<void>((resolve,reject)=>{
     if(storageFault){reject(new Error("A previous storage operation failed"));return;}
     if(!db){
       try{
         if(fallbackConflict||localStorage.getItem(storageKey)!==fallbackStamp)
           throw new Error("Another tab changed fallback history; reopen before editing");
         const encoded=JSON.stringify([...records.values()]);
         localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;resolve();
       }catch(error){reject(error);}
       return;
     }
     try{
       const tx=db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
       const store=tx.objectStore(ATTEMPTS_STORE);
       const snapshotsStore=tx.objectStore(SNAPSHOTS_STORE);
       let conflict:Error|null=null;
       const read=store.get(record.id);
       read.onsuccess=()=>{
         try{
           assertWriteVersion(read.result as RecordItem|undefined,expected);
           if(packed){
             const existing=snapshotsStore.get(packed.snapshot.id);
             existing.onsuccess=()=>{
               try{
                 if(!existing.result)snapshotsStore.add(packed.snapshot);
                 store.put(packed.row);
               }catch(error){conflict=error as Error;tx.abort();}
             };
           }else store.put(versioned);
         }catch(error){conflict=error as Error;tx.abort();}
       };
       tx.oncomplete=()=>{
         if(packed)storedSnapshots.set(packed.snapshot.id,packed.snapshot);
         resolve();
       };
       tx.onerror=()=>reject(conflict??tx.error??new Error("Write failed"));
       tx.onabort=()=>reject(conflict??tx.error??new Error("Write aborted"));
     }catch(error){reject(error);}
   }));
   writeQueue=pending.catch(()=>{});
   return pending.then(()=>{lastCommittedAt=Date.now();return true;}).catch(async e=>{
     recordStorageFailure(e);
     const conflict=e instanceof Error&&e.message.startsWith("Another tab");
     storageFault=true;
     if(conflict){
       warning=e.message+"; changes in this tab were not saved. Reopen before editing.";
       if(isAttempt(versioned)&&attempt?.id===versioned.id){attempt=null;go({screen:"library"},"replace");}
       try{localStorage.removeItem(mirrorKey);}catch{}
       records.delete(versioned.id);
       try{
         let latest:unknown;
         if(db){
           const req=db.transaction(ATTEMPTS_STORE,"readonly").objectStore(ATTEMPTS_STORE).get(versioned.id);
           latest=await new Promise<unknown>((resolve,reject)=>{
             req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
           });
           if(isSharedAttempt(latest)){
             const snap=storedSnapshots.get(latest.frozenRef);
             latest=snap?expandAttempt(latest,snap):undefined;
           }
         }else{
           fallbackConflict=true;
           const stored=JSON.parse(localStorage.getItem(storageKey)??"[]") as unknown[];
           latest=stored.find(x=>x&&typeof x==="object"&&(x as {id?:string}).id===versioned.id);
         }
         if(latest)records.set(versioned.id,validateGenericStoredRecord(latest));
       }catch(error){console.warn("Could not reload changed record",error);}
     }else{
       warning="SAVE FAILED — changes in this tab are not safely stored. Export an UNSAVED recovery backup now, then reopen. "+
         (e instanceof Error?e.message:"");
     }
     console.warn("Exam workspace save",e);
     if(!disposed)draw();
     return false;
   }).finally(()=>{pendingWrites--;updateStorageHealth();});
 };
 const removeSavedAttempt=async(id:string,intent:DeletionIntent="completed"):Promise<void>=>{
   const chosen=records.get(id);
   if(storageFault||fallbackConflict){notice("Storage locked. Export recovery backup and reopen before deleting.");return;}
   // The action's label and the stored record must agree before confirmation.
   try{assertDeletionAllowed(chosen,intent);}
   catch(error){notice(error instanceof Error?error.message:"Deletion action no longer matches this record");return;}
   const answers=isAttempt(chosen)?chosen.state.responses.filter(row=>row.response!==undefined).length:0;
   if(!confirm(deletionWarning(intent,answers)))return;
   if(intent==="discard-unfinished"&&!confirm(
     "Final confirmation: permanently discard this unfinished test, including "+
     answers+" saved answer"+(answers===1?"":"s")+
     "? This cannot be undone without a previously exported backup."))return;
   try{
     await writeQueue;
     if(storageFault||fallbackConflict)throw Error("Storage changed while deleting; reopen first");
     const current=records.get(id);
     assertDeletionAllowed(current,intent);
     if(!current||current.saveRevision!==chosen?.saveRevision)
       throw Error("Record was updated while confirming deletion. Reopen and try again.");
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const tx=db!.transaction(ATTEMPTS_STORE,"readwrite");
         const store=tx.objectStore(ATTEMPTS_STORE);
         let conflict:Error|null=null;
         const request=store.get(id);
         request.onsuccess=()=>{
           try{
             const stored=request.result as RecordItem|undefined;
             assertWriteVersion(stored,current.saveRevision??0);
             assertDeletionAllowed(stored,intent);
             store.delete(id);
           }catch(error){conflict=error as Error;tx.abort();}
         };
         tx.oncomplete=()=>resolve();
         tx.onerror=()=>reject(conflict??tx.error);
         tx.onabort=()=>reject(conflict??tx.error);
       });
     }else{
       if(fallbackConflict||localStorage.getItem(storageKey)!==fallbackStamp)
         throw new Error("Another tab changed fallback history");
       const encoded=JSON.stringify([...records.values()].filter(r=>r.id!==id));
       localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;
     }
     records.delete(id);
     if(db&&isAttempt(current)){
       for(const key of await pruneSharedSnapshots(db))storedSnapshots.delete(key);
     }
     // A deleted active attempt must not be revived from its emergency mirror.
     try{
       const raw=localStorage.getItem(mirrorKey);
       if(raw&&JSON.parse(raw)?.id===id)localStorage.removeItem(mirrorKey);
     }catch(error){console.warn("Could not clear the discarded attempt mirror",error);}
     if(attempt?.id===id){attempt=null;go({screen:"library"},"replace");}
     warning=intent==="discard-unfinished"?"Unfinished test discarded. Other saved work was preserved.":
       intent==="completed"?"Completed result deleted.":"Learning card deleted.";
     draw();
   }catch(error){notice(error instanceof Error?error.message:"Deletion failed");}
 };
 const deleteAllCompleted=async():Promise<void>=>{
   if(storageFault||fallbackConflict){notice("Storage is locked. Export recovery data and reopen before deletion.");return;}
   const completed=[...records.values()].filter((r):r is GenericAttempt=>
     isAttempt(r)&&r.finishedAt!==null);
   if(!completed.length)return;
   if(!confirm("Delete all "+completed.length+" completed attempts? Export a backup first. This cannot be undone."))return;
   if(!confirm("Confirm permanent deletion of completed test history. In-progress attempts, imported papers and learning cards will remain."))return;
   try{
     await writeQueue;
     if(storageFault||fallbackConflict)throw Error("Storage changed during deletion; reopen before editing.");
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const tx=db!.transaction(ATTEMPTS_STORE,"readwrite");
         const store=tx.objectStore(ATTEMPTS_STORE);
         let conflict:Error|null=null;
         for(const saved of completed){
           const request=store.get(saved.id);
           request.onsuccess=()=>{
             try{
               const current=request.result as SlimAttempt|undefined;
               assertWriteVersion(current,saved.saveRevision??0);
               if(!isSharedAttempt(current)||current.finishedAt===null)
                 throw Error("Completed status changed in another tab; deletion cancelled");
               store.delete(saved.id);
             }catch(error){conflict=error as Error;tx.abort();}
           };
         }
         tx.oncomplete=()=>resolve();
         tx.onerror=()=>reject(conflict??tx.error??Error("Bulk deletion failed"));
         tx.onabort=()=>reject(conflict??tx.error??Error("Bulk deletion aborted"));
       });
     }else{
       if(localStorage.getItem(storageKey)!==fallbackStamp)
         throw Error("Another tab changed fallback history; reopen before deleting");
       const ids=new Set(completed.map(r=>r.id));
       const updated=JSON.stringify([...records.values()].filter(r=>!ids.has(r.id)));
       localStorage.setItem(storageKey,updated);fallbackStamp=updated;
     }
     for(const record of completed)records.delete(record.id);
     if(db)for(const key of await pruneSharedSnapshots(db))storedSnapshots.delete(key);
     try{
       const mirror=localStorage.getItem(mirrorKey);
       if(mirror&&completed.some(row=>row.id===JSON.parse(mirror)?.id))
         localStorage.removeItem(mirrorKey);
     }catch(error){console.warn("Could not clear a deleted completed attempt mirror",error);}
     if(attempt&&completed.some(r=>r.id===attempt!.id))attempt=null;
     notice("Deleted "+completed.length+" completed attempts. Other saved data was preserved.");
   }catch(error){
     notice("No completed history was cleared: "+(error instanceof Error?error.message:"Storage failed"));
   }
 };
 const showStorageEstimate=async():Promise<void>=>{
   const node=root.querySelector<HTMLElement>("#g-storage-quota");
   if(!node)return;
   try{
     if(!navigator.storage?.estimate){node.textContent="Storage estimate unavailable in this browser or file context.";return;}
     const estimate=await navigator.storage.estimate();
     if(!node.isConnected)return;
     const miB=(n:number)=>(n/1048576).toFixed(1)+" MiB";
     node.textContent="Browser storage: "+(typeof estimate.usage==="number"?miB(estimate.usage):"unknown usage")+
       (typeof estimate.quota==="number"?" of approximately "+miB(estimate.quota):" (quota unknown)")+
       ". This is browser-wide, not just Practice Desk.";
   }catch{if(node.isConnected)node.textContent="Storage estimate unavailable in this browser or file context.";}
 };
 const requestPersistentStorage=async():Promise<void>=>{
   const node=root.querySelector<HTMLElement>("#g-storage-persist-status");
   if(!node)return;
   try{
     if(!navigator.storage?.persist){node.textContent="Persistent storage requests are unavailable here. Keep exported backups.";return;}
     const granted=await navigator.storage.persist();
     if(node.isConnected)node.textContent=granted?"Browser granted persistent storage. Still export backups.":
       "Persistent storage was not granted. Keep exported backups.";
   }catch{
     if(node.isConnected)node.textContent="Browser could not request persistent storage. Keep exported backups.";
   }
 };
 const learningDesk=createLearningDesk(root,{
   cards:()=>[...records.values()].filter(isLearning),
   attempts:()=>[...records.values()].filter(isAttempt),
   save:(item)=>save(item),
   remove:(id)=>removeSavedAttempt(id,"learning-card"),
   startRevision:async (selected,selection)=>{
     if(storageFault||fallbackConflict||loading){notice("Storage unavailable; cannot start a revision exam.");return false;}
     try{
       const nonce=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "revision-"+now()+"-"+Math.floor(Math.random()*100000);
       const paper=makeRevisionPackage(selected,nonce);
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "attempt-"+now()+"-"+Math.floor(Math.random()*100000);
       const generated={...startGenericAttempt(paper,id,now()),notebookLineage:createNotebookLineage(selected,selection)};
       if(!await save(generated))return false;
       attempt=generated;freshlyStartedAttemptId=generated.id;
       warning="Untimed notebook revision · +1 correct, 0 incorrect. This is not a source-exam score.";
       go({screen:"exam",attemptId:generated.id});return true;
     }catch(error){notice(error instanceof Error?error.message:"Cannot create revision test");return false;}
   },
   close:()=>go({screen:"library"})
 });
 const addNotebookCard=(source:GenericAttempt,id:string):void=>{
   if(records.has("learning-card:"+id))return;
   try{
     const record=addLearningCard(source,id as QuestionRevisionId,new Date(now()).toISOString());
     void save(record).then(ok=>{if(ok){warning="Question added to the notebook.";draw();}});
   }catch(error){notice(error instanceof Error?error.message:"Unable to add notebook card");}
 };
 const addResultCards=async(source:GenericAttempt):Promise<void>=>{
   const ids=source.result?.items.filter(item=>item.verdict==="incorrect"||item.verdict==="unanswered")
     .map(item=>item.questionRevisionId).filter(id=>!records.has("learning-card:"+id))??[];
   let saved=0;
   for(const id of ids){
     if(!await save(addLearningCard(source,id,new Date(now()).toISOString())))break;
     saved++;
   }
   if(!storageFault)warning=saved?saved+" mistake/skipped cards saved to the revision notebook.":"All mistakes/skips are already in the notebook.";
   draw();
 };
 const dispatch=(event:SessionEvent)=>{
   if(!attempt||storageFault)return;
   try{
     const ids=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
     const before=attempt;
     attempt=transitionGenericAttempt(attempt,event,ids);
     if(attempt!==before)void save(attempt);
     if(attempt.finishedAt!==null){
       reviewFilter="all";go({screen:"result",attemptId:attempt.id,tab:"overview"},"replace");return;
     }
     warning="";
   }catch(error){warning=error instanceof Error?error.message:"Invalid response";}
   draw();
 };
 function listHTML():string {
   const all=[...records.values()].filter(isAttempt).sort((a,b)=>b.startedAt-a.startedAt);
   const complete=all.filter(a=>a.finishedAt!==null);
   const pending=all.filter(a=>a.finishedAt===null);
   // Completed results and resumable tests are separate workflows.
   // A recent unfinished attempt must not evict an older completed result.
   const latest=[...complete].sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0)||
     b.startedAt-a.startedAt).slice(0,3);
   const catalog=families(),family=catalog.find(f=>f.id===selectedFamilyId);
   const selected=family?.papers.find(p=>p.paper.id===choice);
   const cgl=selectedFamilyId===BUILTIN_CGL_FAMILY&&Boolean(selected);
   const configured=selected?configureUntimedPractice(
     cgl?configureCglPractice(selected,cglMode,singleSection):selected,untimedPractice):null;
   const selectedNumbers=new Set(configured?.questions.map(q=>q.questionId.split(":").at(-1))??[]);
   const preflight=configured?examPreflight(configured,{
     builtinCgl:cgl,
     ...(cgl?{reviewedPatchCount:Object.keys(patches[selected!.paper.paperId]??{})
       .filter(id=>selectedNumbers.has(id)).length}:{})
   }):null;
   const count=selected?.paper.sections.reduce((n,z)=>n+z.questionRevisionIds.length,0)??0;
   const modeLabel=cgl?cglMode==="strict"?"Exam simulation":cglMode==="free"?"Full paper practice":"Section practice":"Custom examination";
   const time=configured?.paper.timing.kind==="untimed"?"Untimed":cgl?
     cglMode==="strict"?"15 min per section":cglMode==="single"?"15 minutes":"60 minutes":
     configured?.paper.timing.kind==="whole-paper"?minutes(configured.paper.timing.durationMs):
     "Section timers";
   const questionCount=cgl&&cglMode==="single"?selected?.paper.sections[singleSection]?.questionRevisionIds.length??0:count;
   const previewSections=cgl&&cglMode==="single"?1:selected?.paper.sections.length??0;
   const previewNavigation=cgl?cglMode==="free"?"Free":cglMode==="single"?"One section":"Section locked":
     selected?.paper.navigation.sectionNavigation==="free"?"Free":"Sequential";
   // Edition switches filter only the active family; custom papers remain visible.
   const available=family?.papers??[];
   const published=available.filter(p=>p.paper.edition===editionView);
   const custom=available.filter(p=>p.paper.edition==="custom");
   const option=(p:ExamPackage):string=>'<option value="'+escapeText(p.paper.id)+'"'+
     (choice===p.paper.id?" selected":"")+'>'+escapeText(p.title)+'</option>';
   const missing=!selected&&choice?
     '<option value="'+escapeText(choice)+'" selected disabled>Saved paper unavailable — re-import or choose another</option>':"";
   const options=missing+
     (published.length?'<optgroup label="'+(editionView==="reviewed"?"Reviewed papers":"Original papers")+'">'+
       published.map(option).join("")+'</optgroup>':"")+
     (custom.length?'<optgroup label="Imported / custom examinations">'+
       custom.map(option).join("")+'</optgroup>':"")+
     (!selected&&!missing?'<option value="" selected disabled>Choose a paper</option>':"");
   const hasEditions=available.some(p=>p.paper.edition==="source")&&
     available.some(p=>p.paper.edition==="reviewed");
   const familyOptions=(selectedFamilyId&&!family?
     '<option value="'+escapeText(selectedFamilyId)+'" selected disabled>Saved exam family unavailable — re-import</option>':"")+
     catalog.map(f=>'<option value="'+escapeText(f.id)+'"'+
       (f.id===selectedFamilyId?" selected":"")+'>'+escapeText(f.title)+
       ' ('+f.papers.length+' paper edition'+(f.papers.length===1?"":"s")+')</option>').join("");
   const composeInventory=composeOpen&&configured?practiceInventory(configured):null;
   const filterOption=(value:string,label:string,current:string):string=>
     '<option value="'+escapeText(value)+'"'+(value===current?" selected":"")+'>'+
     escapeText(label)+'</option>';
   const builder=selected?'<section class="panel pad practice-builder" id="g-compose">'+
     '<details id="g-compose-details"'+(composeOpen?' open':'')+'>'+
     '<summary>Create a custom practice set from this paper</summary>'+
     '<p class="fine">Draw from this paper and edition only. Preserve marking, navigation and timers. Excluded questions are not drawn; tags are never inferred.</p>'+
     '<div class="practice-compose-fields">'+
     '<label>Section<select id="g-compose-section">'+filterOption("","All sections",composeSection)+
     (composeInventory?.sectionChoices??[]).map(x=>filterOption(x.id,x.title+" ("+x.count+")",composeSection)).join("")+
     '</select></label>'+
     '<label>Source topic<select id="g-compose-topic">'+filterOption("","Any topic",composeTopic)+
     (composeInventory?.topics??[]).map(x=>filterOption(x.id,x.id+" ("+x.count+")",composeTopic)).join("")+
     '</select></label>'+
     '<label>Supplied difficulty<select id="g-compose-difficulty">'+filterOption("","Any difficulty",composeDifficulty)+
     (composeInventory?.difficulties??[]).map(x=>filterOption(x.id,x.id+" ("+x.count+")",composeDifficulty)).join("")+
     '</select></label>'+
     '<label>Questions<input type="number" id="g-compose-count" min="1" max="2000" step="1" value="'+composeCount+'"></label>'+
     '<label>Repeatable seed<input type="text" id="g-compose-seed" maxlength="80" value="'+escapeText(composeSeed)+'"></label>'+
     '</div><p class="fine">'+(composeInventory?
      composeInventory.eligible+' eligible of '+configured!.questions.length+
      ' questions · '+composeInventory.excluded+' excluded · '+composeInventory.cautions+' caution.':
      "Expand to inspect source metadata.")+'</p>'+
     (composePreview?'<p class="fine compose-preview" role="status">'+escapeText(composePreview)+'</p>':"")+
     (composeError?'<p class="generic-warning" role="alert">'+escapeText(composeError)+'</p>':"")+
     '<div class="row generic-actions"><button type="button" class="btn" id="g-compose-preview">Preview draw</button>'+
     '<button type="button" class="btn primary" id="g-compose-start"'+
     (loading||fallbackConflict||storageFault?" disabled":"")+
     '>Start custom set</button></div></details></section>':"";
   return '<div class="generic-heading home-heading"><div><span class="eyebrow">OFFLINE PRACTICE STUDIO</span>'+
     '<h1>Test library</h1><p class="muted">Choose a paper, work in exam conditions and learn from every attempt.</p></div>'+
     '<button class="btn quiet" id="g-history">History & insights →</button></div>'+
     (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
     (pending.length?'<section class="panel pad pending-panel" id="g-pending-attempts">'+
      '<div class="row between"><div><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span>'+
      '<h2>Unfinished attempts</h2><p class="fine">'+pending.length+' saved, resumable test'+(pending.length===1?"":"s")+
      '. Section timers follow the frozen exam policy; leaving the app does not pause a running clock.</p></div>'+
      (pending.length>5?'<button type="button" class="textlink" id="g-pending-history">View all '+pending.length+' →</button>':"")+
      '</div><div class="pending-attempt-list">'+pending.slice(0,5).map(a=>
        '<button class="recent-attempt" data-attempt="'+escapeText(a.id)+'" aria-label="Resume '+escapeText(packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'">'+
        '<b>'+escapeText(packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'</b>'+
        '<small>'+new Date(a.startedAt).toLocaleString()+' · '+
          escapeText(a.frozen.snapshot.mode.replaceAll("-"," "))+' · '+
          a.state.responses.filter(z=>z.response!==undefined).length+' answers · Resume →</small></button>').join("")+
      '</div>'+(pending.length>5?'<p class="fine">Showing the five most recent unfinished tests; all others are preserved in History.</p>':"")+
      '</section>':"")+
     '<div class="generic-layout home-grid"><section class="panel pad home-picker"><h2 class="sr-only">Start a practice session</h2>'+
     '<div class="family-paper-row">'+
     '<div class="family-field"><label class="picker" for="g-family">Examination family</label>'+
     '<select id="g-family" aria-label="Examination family">'+familyOptions+'</select></div>'+
     '<div class="paper-field"><label class="picker" for="g-papers">Paper</label>'+
     '<select id="g-papers">'+options+'</select></div></div>'+
     (!selected?'<p class="generic-warning" role="status">Saved paper unavailable. Re-import its revision or select an installed paper.</p>':"")+
     (hasEditions?'<div class="edition-row"><span class="picker" id="editionLabel">Paper edition</span>'+
       '<div class="edition-toggle" id="g-edition" role="group" aria-labelledby="editionLabel">'+
       (["reviewed","source"] as const).map(edition=>
         '<button type="button" class="edition-choice '+(editionView===edition?"active":"")+
         '" data-edition="'+edition+'" aria-pressed="'+(editionView===edition)+'">'+
         (cgl?(edition==="reviewed"?"Reviewed &amp; Corrected":"Original PDF"):
           edition==="reviewed"?"Imported reviewed":"Imported source")+'</button>').join("")+
       '</div><p class="fine edition-note">'+(family?.imported?
         "User-supplied edition; Practice Desk does not certify its questions or keys.":
         editionView==="reviewed"?
           "Independently reviewed wording and answer keys; disputed items are labelled after submission.":
           "Original publisher transcription; no independent key changes applied.")+
       '</p></div>':"")+
     (cgl?'<h3 class="subhead">Practice mode</h3><div class="generic-modes" role="group" aria-label="SSC CGL practice mode">'+
      ([["strict","Exam simulation","4 locked sections · 15 minutes each"],["free","Flexible full paper","60 minutes · move between sections"],
       ["single","Section practice","25 questions · 15 minutes"]] as const).map(([key,title,detail])=>
      '<button type="button" class="mode '+(cglMode===key?"on":"")+'" data-mode="'+key+'" aria-pressed="'+(cglMode===key)+'">'+
      '<span class="radio-dot"></span><span><strong>'+title+'</strong><small>'+detail+'</small></span></button>').join("")+'</div>'+
      (cglMode==="single"?'<label class="picker" for="g-single-section">Choose section</label><select id="g-single-section">'+
       selected!.paper.sections.map((z,i)=>'<option value="'+i+'"'+(singleSection===i?" selected":"")+'>'+escapeText(z.title)+'</option>').join("")+'</select>':""):"")+
     '<label class="untimed-option" for="g-untimed"><input type="checkbox" id="g-untimed"'+
        (untimedPractice?" checked":"")+'><span><strong>Untimed practice</strong>'+
        '<small>No countdown or automatic expiry. Keep the selected navigation and scoring rules; finish when ready.</small></span></label>'+
     '<div class="row generic-actions home-start"><button class="btn primary" id="g-start"'+
      (loading||fallbackConflict||storageFault||!selected?' disabled':'')+'>Start '+escapeText(modeLabel)+' →</button>'+
      '<button class="btn" id="g-import"'+(loading||fallbackConflict||storageFault?' disabled':'')+'>Import question bank</button></div>'+
      '<input type="file" id="g-file" accept=".json,.gz,application/json,application/gzip" hidden>'+
      '<p class="fine">Start with an editable <button type="button" class="textlink" id="g-bank-template">Download APFC/NAT bank template</button> (JSON). '+
      'Source and reviewed editions remain distinct. Answers, keys and solutions are hidden until the attempt ends.</p></section>'+
     '<aside class="home-side"><section class="panel pad paper-preview"><span class="eyebrow">SELECTED PAPER</span>'+
      '<h2>'+escapeText(selected?.title??"Choose a paper")+'</h2>'+
      '<p class="fine family-provenance">'+(family?.imported?
        "Imported/user-supplied content; not an official exam bank.":
        family?"Included SSC CGL papers. Original and reviewed versions remain distinct.":
        "Saved examination unavailable. Re-import the bank or select another.")+'</p>'+
      '<p class="fine">'+escapeText(selected?.paper.paperId??"")+' · '+escapeText(selected?.paper.edition??"")+'</p>'+
      '<div class="preview-metrics"><div><b>'+questionCount+'</b><small>Questions</small></div>'+
      '<div><b>'+escapeText(time)+'</b><small>Time</small></div><div><b>'+escapeText(previewSections)+'</b><small>Sections</small></div>'+
      '<div><b>'+escapeText(previewNavigation)+
      '</b><small>Navigation</small></div></div>'+
      '<p class="fine">Scoring and timer rules are frozen when you start; later paper edits cannot change a saved result.</p>'+
      (preflight?preflightHTML(preflight):"")+'</section>'+
      '<section class="panel pad recent-panel"><div class="row between"><h2>Recent completed results</h2>'+
      '<button class="textlink" id="g-history-recent">View all →</button></div>'+
      (latest.length?latest.map(a=>'<button class="recent-attempt" data-attempt="'+escapeText(a.id)+'">'+
       '<b>'+escapeText(packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'</b>'+
       '<small>'+new Date(a.finishedAt??a.startedAt).toLocaleDateString()+' · '+
         escapeText(a.frozen.snapshot.mode.replaceAll("-"," "))+' · '+
         escapeText(frozenScoreSummary(a)?.text??"Score unavailable")+'</small></button>').join(""):
       '<p class="fine">Your three most recent completed results will appear here; unfinished attempts stay in their own Resume area.</p>')+
      '</section></aside></div>'+builder+
      '<div class="home-utilities"><section class="panel pad learning-entry"><div><span class="eyebrow">REVISE & IMPROVE</span>'+
       '<h2>Learning & revision</h2><p class="fine">Error notebook, FSRS-7 spaced review, source-linked revision tests and topic evidence.</p></div>'+
       '<button class="btn primary" id="g-learning">Open learning desk →</button></section>'+
      '<section class="panel pad backup-home"><div><span class="eyebrow">YOUR DATA</span><h2>Portable offline history</h2>'+
       '<p class="fine">Stored in this browser. Export a backup to protect your history and notes.</p></div>'+
       '<div class="row generic-actions"><button class="btn" id="g-export-history"'+(loading?" disabled":"")+'>Export backup</button>'+
       '<button class="btn" id="g-import-history"'+(loading||fallbackConflict||storageFault?" disabled":"")+'>Import backup</button></div>'+
       '<input type="file" id="g-history-file" accept=".json,.gz,application/json,application/gzip" hidden></section></div>'+
       // At desktop widths the user should see the exam setup, not four
       // dashboard totals, first. Retain all counts after primary workflows.
     '<div class="home-stats">'+
       [['Paper editions',packages.size],['Completed tests',complete.length],['Attempts in progress',pending.length],['Notebook cards',[...records.values()].filter(isLearning).length]]
         .map(([name,value])=>'<div class="home-stat"><small>'+escapeText(name)+'</small><b>'+escapeText(value)+'</b></div>').join("")+
     '</div>'+
       (preflight?examRulesHTML(preflight):"");
 }
 function packageForAttempt(saved:GenericAttempt):ExamPackage|undefined{
   return packages.get(saved.packageId)??[...packages.values()].find(p=>
     p.paper.paperId===saved.frozen.paper.paperId&&p.paper.edition===saved.frozen.paper.edition);
 }
 function examHTML():string {
   if(!attempt)return "";
   const qid=attempt.frozen.paper.sections[attempt.state.sectionIndex]
     ?.questionRevisionIds[attempt.state.questionIndex];
   const draft=qid?choiceDrafts.get(attempt.id+"|"+qid):undefined;
   return renderModelExam(attempt,packageForAttempt(attempt),warning,draft,{
     focused:Boolean(document.fullscreenElement||
       document.documentElement.classList.contains("immersive"))
   });
 }
 /** Result presentation must use the frozen media, not a mutable current package. */
 function resultHTML():string {
   if(!attempt)return "";
   const paper=attempt.frozen.paper,s=attempt.result??scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
      attempt.state.responses,new Date().toISOString());
   const qs=resultTab==="review"?new Map(attempt.frozen.questions.map(q=>[q.id,q])):new Map<string,QuestionRevision>();
   // allowReview controls post-completion detailed question/solution disclosure,
   // not question navigation during the attempt or numerical score visibility.
   const revealReview=paper.navigation.allowReview!==false;
   if(!revealReview&&resultTab==="review")resultTab="overview";
   // New attempts carry a frozen original-text/media snapshot. For older
   // overhaul CGL attempts only, permit a read-only comparison if the immutable
   // bundled source paper AND source key revision exactly match the previously
   // saved original-key reference. Never fabricate or persist this fallback.
   const originalReference=attempt.sourceKeyReference;
   const pinnedOriginal= resultTab==="review"&&!attempt.sourceReviewReference&&
     attempt.frozen.snapshot.examId==="ssc-cgl"&&originalReference?
       cachedCglPackages(sources,patches,solutions).find(p=>
         p.paper.edition==="source"&&p.paper.id===originalReference.sourcePaperRevisionId&&
         p.answerKey.id===originalReference.sourceAnswerKeyRevisionId&&
         p.paper.paperId===attempt!.frozen.paper.paperId):undefined;
   const frozenTarget:ExamPackage={format:"practice-desk-exam",version:1,
     examId:attempt.frozen.snapshot.examId,title:"Frozen reviewed attempt",
     paper:attempt.frozen.paper,answerKey:attempt.frozen.key,
     questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli,
     assets:attempt.frozen.assets};
   const reviewSource=resultTab==="review"?
     (attempt.sourceReviewReference??(pinnedOriginal?createSourceReviewReference(frozenTarget,pinnedOriginal):null)):null;
   const grades=resultTab==="overview"?manualGradeSummary(attempt):{graded:0,pending:0,total:0};
   const selfAssessed=s.snapshot.earnedMarks+grades.total;
   const originalKey=resultTab==="overview"?sourceKeyScore(attempt):null;
   const legacySourceKey=resultTab==="overview"&&attempt.sourceKeyReference?.schema===1;
   const sourceKeyText=originalKey&&originalKey.comparable>0?
     (originalKey.unavailable>0?"Comparable original-source subset only":"Original-source key comparison")+
     ": "+originalKey.marks.toFixed(1)+" / "+originalKey.maxMarks.toFixed(1)+
     " marks ("+originalKey.comparable+" of "+originalKey.total+" comparable; "+
     originalKey.unavailable+" unavailable)":null;
   const scorePrecision=paper.scoring.decimalPlaces??2;
   const markLabel=(value:number)=>value.toFixed(scorePrecision);
   const eligibleMax=resultTab==="overview"?scoreableMaximum(paper,attempt.frozen.key,attempt.frozen.questions):0;
   const conservativeFloor=resultTab==="overview"?scoreableLowerBound(paper,attempt.frozen.key,attempt.frozen.questions):0;
   const resultPackage=packageForAttempt(attempt);
   const resultName=attempt.practiceComposition?
     "Custom practice · "+attempt.practiceComposition.sourcePaperRevisionId:
     resultPackage?.title??paper.paperId;
   const resultDate=attempt.finishedAt?new Date(attempt.finishedAt).toLocaleString():"";
   const resultMeta=escapeText(resultName)+' · '+escapeText(readablePracticeMode(attempt.frozen.snapshot.mode))+
     (resultDate?' · '+escapeText(resultDate):"");
   const paperSectionRows=resultTab==="overview"?sectionScoreSummaries(attempt,s).map(row=>
     '<tr><td>'+escapeText(row.title)+'</td><td>'+row.attempted+'/'+
       (row.questions-row.excluded)+'</td><td>'+row.correct+'</td><td>'+row.incorrect+
       '</td><td>'+escapeText(markLabel(row.marks))+' / '+
       escapeText(markLabel(row.eligibleMax))+'</td><td>'+
       (row.timerMs===null?"Not recorded":minutes(row.timerMs)+
         (row.timerReason==="time-expired"?" · Expired":" · Submitted"))+'</td></tr>').join(""):"";
   const completionLabel=attempt.completionReason?
     attempt.completionReason==="time-expired"?"Time expired":
     attempt.completionReason==="section-submitted"?"Submitted early":"Submitted by user":"";
   const scoreExplainer=resultTab==="overview"?
     '<p class="fine score-explainer">+'+escapeText(markLabel(s.snapshot.positiveMarks))+
       ' positive marks · −'+escapeText(markLabel(s.snapshot.penaltyMarks))+
       ' penalties · adjusted score '+escapeText(markLabel(s.snapshot.earnedMarks))+
       ' / '+escapeText(markLabel(eligibleMax))+
       (sourceKeyText?' · '+escapeText(sourceKeyText):"")+'.</p>':"";
   const scoringDetails=resultTab==="overview"?'<details class="result-scoring-details">'+
     '<summary>Scoring details</summary><div class="result-scoring-detail-body">'+
     (attempt.practiceComposition?'<p class="fine"><b>Custom selection provenance:</b> source paper '+
       escapeText(attempt.practiceComposition.sourcePaperRevisionId)+
       ' · source key '+escapeText(attempt.practiceComposition.sourceAnswerKeyRevisionId)+
       ' · '+attempt.practiceComposition.selectedQuestionRevisionIds.length+' of '+
       attempt.practiceComposition.eligibleCount+' eligible · seed '+
       escapeText(attempt.practiceComposition.seed)+
       ' · frozen selection '+escapeText(attempt.practiceComposition.contentHash.slice(0,12))+
       '. Scores use the actual retained source rules; this is not an independent official exam score.</p>':"")+
     (legacySourceKey?
       '<p class="fine"><b>Original-source key comparison unavailable:</b> This older saved attempt has a positional-only publisher-key snapshot. When revised options change meaning, matching answer letters are not proof of an equivalent answer. Its actual frozen result remains unchanged; original key and wording remain available for provenance.</p>':
       originalKey&&originalKey.comparable>0?
       '<p class="fine"><b>'+escapeText(originalKey.unavailable?
         "Original-source key — comparable subset only":"Original-source key comparison")+
       ':</b> '+escapeText(originalKey.marks.toFixed(1))+' / '+
       escapeText(originalKey.maxMarks.toFixed(1))+' marks · '+
       originalKey.correct+' correct · '+originalKey.incorrect+' incorrect · '+
       originalKey.unanswered+' unanswered · '+originalKey.comparable+' of '+
       originalKey.total+' questions comparable; '+originalKey.unavailable+
       ' unavailable. Only source/reviewed questions with identical verified wording, option identities and media are included; this subset is not a full-paper or official score. The actual reviewed score above is unchanged.</p>':
       originalKey&&originalKey.total>0?
       '<p class="fine"><b>Original-source key comparison unavailable:</b> None of the '+
       originalKey.total+' source/reviewed questions had defensible comparable semantics. Original text and key remain as post-test provenance; your actual frozen score is unchanged.</p>':"")+
     '<p class="fine"><b>Scoring envelope:</b> nominal full-credit ceiling '+
       escapeText(markLabel(eligibleMax))+'; conservative lower bound '+
       escapeText(markLabel(conservativeFloor))+
       '. The lower bound need not be attainable; written responses are assessed separately.</p>'+
     (!revealReview?'<p class="fine"><b>Detailed answers withheld:</b> this exam releases numerical results and timing feedback but not its question-by-question answer key or worked solutions.</p>':"")+
     (grades.graded||grades.pending?'<p class="fine"><b>Separate self-assessment:</b> '+escapeText(grades.graded)+
       ' of '+escapeText(grades.graded+grades.pending)+' written responses marked; self-assessed total '+
       escapeText(selfAssessed.toFixed(2))+'. The automated score above remains unchanged.</p>':
       '<p class="fine">Automated marks reflect only scoreable questions.</p>')+
     '</div></details>':"";
   return '<div class="generic-heading results-heading"><div>'+
     '<h1>Attempt analysis</h1><p class="muted">'+resultMeta+'</p></div>'+
     '<div class="row"><button class="btn quiet" id="g-history-results">History</button>'+
     '<button class="btn" id="g-library">Library</button></div></div>'+
    (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
    resultTabsHTML(resultTab,revealReview)+
    (resultTab==="overview"?'<div class="result-pane" id="result-overview" role="tabpanel" aria-labelledby="result-tab-overview">'+
    '<section class="panel pad result-performance-overview"><div class="row between result-overview-heading"><div>'+
     '<h2>Performance overview</h2><p class="fine">'+resultMeta+'</p></div>'+
     (completionLabel?'<span class="tag">'+escapeText(completionLabel)+'</span>':"")+'</div>'+
    '<div class="scoregrid"><div class="score standout"><b>'+
     escapeText(markLabel(s.snapshot.earnedMarks))+
     ' <small>/ '+escapeText(markLabel(eligibleMax))+'</small></b>'+
     '<small>Audit-adjusted automated marks</small></div><div class="score"><b>'+s.snapshot.correctCount+
    '</b><small>Correct</small></div><div class="score"><b>'+s.snapshot.incorrectCount+
    '</b><small>Incorrect</small></div><div class="score"><b>'+s.snapshot.unansweredCount+
    '</b><small>Unanswered</small></div><div class="score"><b>'+s.snapshot.excludedCount+
    '</b><small>Excluded</small></div></div>'+
    scoreExplainer+
    '<div class="scroll-table result-section-table"><table><thead><tr><th>Section</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Marks</th><th>Time used</th></tr></thead><tbody>'+
     paperSectionRows+'</tbody></table></div>'+scoringDetails+'</section>'+
     resultInsightsHTML(attempt,revealReview)+
    '<div class="row result-footer-actions">'+
      (revealReview?'<button class="btn" id="g-view-question-review">View question-by-question review →</button>':"")+
      '<button class="btn" id="g-result-library">Test library</button></div></div>':
    '<div class="result-pane" id="result-overview" role="tabpanel" aria-labelledby="result-tab-overview" hidden></div>')+
    (revealReview&&resultTab==="review"?'<section class="panel pad result-pane" id="result-review" role="tabpanel" aria-labelledby="result-tab-review">'+
    '<div class="row between"><h2>Question review</h2>'+
      '<div class="row"><button class="btn" id="g-review-top">Top ↑</button>'+
      '<button class="btn primary" id="g-revision-set">Add mistakes &amp; skips to notebook</button></div></div>'+
      reviewFiltersHTML(reviewFilter)+
      '<p class="fine">Review frozen questions, actual responses, solutions and foreground time. Mock scores never become FSRS ratings.</p>'+
      '<p class="fine">'+s.items.filter(it=>reviewMatch(attempt!,it,reviewFilter)).length+' of '+s.items.length+' items</p>'+
      s.items.filter(it=>reviewMatch(attempt!,it,reviewFilter)).map((it,i)=>{
      const q=qs.get(it.questionRevisionId);
      const response=attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.response;
      const answer=attempt!.frozen.key.entries.find(e=>e.questionRevisionId===it.questionRevisionId)?.answer;
      const explanation=attempt!.explanations?.[it.questionRevisionId];
      const seconds=attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.timeSpentMs??0;
      const visitCount=attempt!.state.questionVisits?.find(r=>r.questionRevisionId===it.questionRevisionId)?.count;
      const speed=questionSpeed(attempt!,it.questionRevisionId);
      if(!q)return "";
      const prior=attempt!.manualGrades?.find(g=>g.questionRevisionId===q.id);
      const limit=manualGradeLimit(attempt!,q.id);
      const provenance=q.editorial.sources??[];
      const origin=attempt!.notebookLineage?.entries.find(x=>x.questionRevisionId===q.id);
      return '<article class="generic-review" data-review-id="'+escapeText(q.id)+'" data-verdict="'+escapeText(it.verdict)+'"><strong>'+
       (paper.sections.flatMap(z=>z.questionRevisionIds).indexOf(q.id)+1)+'. '+escapeText(q.content.prompt)+'</strong>'+
       '<p class="fine editorial-meta"><span class="editorial-status editorial-status-'+escapeText(q.editorial.status)+'">'+
         escapeText(editorialStatusLabel(q.editorial))+'</span>'+
         (q.editorial.sourcePage?' · Source page '+q.editorial.sourcePage:"")+
         ' · '+minutes(seconds)+' foreground exposure · Speed: '+escapeText(speed)+
         ' · Visits: '+(attempt!.state.questionVisits===undefined?"Not recorded":visitCount??0)+'</p>'+
       frozenReviewMedia(attempt!,q,response,answer,it.verdict)+
       (origin?'<p class="fine">Notebook source: '+escapeText(origin.sourcePaperId)+
         ' · '+escapeText(origin.sourcePaperEdition)+' · '+escapeText(origin.sourceSectionTitle)+
         ' · source attempt '+escapeText(origin.sourceAttemptId)+'</p>':"")+
       '<p class="fine"><span class="verdict '+escapeText(it.verdict)+'">'+
        escapeText(it.verdict)+'</span> · '+it.marks+' automated marks</p>'+
       '<p class="fine">Your answer: '+escapeText(readableAnswer(q,response))+'</p>'+
       '<p class="fine">'+(it.verdict==="excluded"?"Frozen answer key (not scored): ":
         it.verdict==="pending"?"Manual assessment: ":"Expected: ")+
         escapeText(readableAnswer(q,answer))+'</p>'+
       (q.editorial.notes?'<p class="fine">Editorial note: '+escapeText(q.editorial.notes)+'</p>':"")+
       (explanation?'<details class="worked-solution"'+
         (it.verdict==="incorrect"||it.verdict==="unanswered"?" open":"")+'>'+
         '<summary>'+((q.content.assetIds?.length||(
          (q.content.kind==="single-choice"||q.content.kind==="multiple-select")&&
          q.content.options.some(o=>o.assetIds?.length)))?
          "Visual solving method":"Solving approach & worked reasoning")+
         '</summary><div class="worked-solution-body">'+
         escapeText(explanation)+'</div></details>':"")+
       sourceReviewHTML(attempt!,q,reviewSource)+
       (provenance.length?'<p class="fine">Sources: '+provenance.map(source=>
         '<a href="'+escapeText(source.url)+'" target="_blank" rel="noopener noreferrer">'+
         escapeText(source.title)+'</a>').join(' · ')+'</p>':"")+
       (limit!==null?'<div class="generic-manual-grade"><p class="fine">Written response requires explicit human assessment. Self-marked results are separate from exam scores.</p>'+
          '<label>Self-assessed marks (0–'+limit+')<input type="number" step="0.01" min="0" max="'+limit+'" data-manual-marks="'+escapeText(q.id)+'" value="'+escapeText(prior?.marks??"")+'"></label>'+
          '<label>Assessment note (optional)<textarea maxlength="2000" rows="2" data-manual-note="'+escapeText(q.id)+'">'+escapeText(prior?.note??"")+'</textarea></label>'+
          '<button class="btn" data-manual-save="'+escapeText(q.id)+'">Save self-assessment</button></div>':"")+
       '<button class="btn" data-add-card="'+escapeText(q.id)+'"'+
         (records.has("learning-card:"+q.id)?" disabled":"")+'>'
         +(records.has("learning-card:"+q.id)?"In notebook":"Add to notebook")+
       '</button></article>';
    }).join("")+'</section>':revealReview?
       '<section class="result-pane" id="result-review" role="tabpanel" aria-labelledby="result-tab-review" hidden></section>':"")+
    (resultTab==="timing"?timingLedgerHTML(attempt,true,revealReview):
      '<section class="result-pane" id="result-timing" role="tabpanel" aria-labelledby="result-tab-timing" hidden></section>')+
    '<footer class="result-device-footer">Saved on this device · Review, export and manage your data from History</footer>';
 }
 const openSaved=(id:string):void=>{
   const saved=records.get(id);
   if(!isAttempt(saved))return;
   go(saved.finishedAt===null?{screen:"exam",attemptId:id}:
     {screen:"result",attemptId:id,tab:"overview"});
 };
 /** The only coordinator allowed to change the visible screen.
  * URL/history policy lives in navigation.ts, DOM focus lives in the renderer.
  */
 async function activateRoute(target:AppRoute,ctx:RouteContext):Promise<void>{
   const requested=++activationGeneration;
   if(!routeHydrated)await hydration;
   if(disposed||ctx.signal?.aborted||requested!==activationGeneration)return;
   const prevView=view;
   const previousTab=resultTab;
   const previousAttempt=attempt;
   // Traversals cannot reliably be canceled. Checkpoint first, then display
   // the destination; question/answer changes never create URL entries.
   const leavesExam=prevView==="exam"&&previousAttempt?.finishedAt===null&&
     !(target.screen==="exam"&&target.attemptId===previousAttempt.id);
   if(leavesExam){
     try{
       const next=transitionGenericAttempt(previousAttempt,{
         type:"VISIBILITY",nowMs:now(),visible:false},
         new Map(previousAttempt.frozen.questions.map(q=>[q.id,q])));
       attempt=next;
       if(next!==previousAttempt)await save(next);
     }catch(error){
       warning="Unable to checkpoint the test before leaving: "+
         (error instanceof Error?error.message:"Unknown error");
     }
     if(disposed||ctx.signal?.aborted||requested!==activationGeneration)return;
   }
   if(target.screen==="exam"||target.screen==="result"){
     const saved=records.get(target.attemptId);
     if(!isAttempt(saved)){
       warning="The requested attempt is unavailable or has been deleted. Open a saved attempt from the library.";
       go({screen:"library"},"replace");return;
     }
     if(target.screen==="exam"&&saved.finishedAt!==null){
       go({screen:"result",attemptId:saved.id,tab:"overview"},"replace");return;
     }
     if(target.screen==="result"&&saved.finishedAt===null){
       go({screen:"exam",attemptId:saved.id},"replace");return;
     }
     if(target.screen==="result"&&target.tab==="review"&&
         saved.frozen.paper.navigation.allowReview===false){
       go({screen:"result",attemptId:saved.id,tab:"overview"},"replace");return;
     }
     const fresh=target.screen==="exam"&&saved.id===freshlyStartedAttemptId;
     if(fresh)freshlyStartedAttemptId=null;
     const switching=!fresh&&(attempt?.id!==saved.id||prevView!=="exam");
     attempt=saved;
     if(target.screen==="exam"&&switching){
       const restored=restoreSession(saved.frozen.paper,saved.state,now(),!document.hidden);
       attempt={...saved,state:restored.state,
         ...(restored.expired?{finishedAt:now(),completionReason:"time-expired" as const,
           result:scoreAttempt(saved.frozen.paper,saved.frozen.key,
             saved.frozen.questions,restored.state.responses,new Date().toISOString())}:{})};
       if(attempt!==saved)void save(attempt);
       if(attempt.finishedAt!==null){
         go({screen:"result",attemptId:attempt.id,tab:"overview"},"replace");return;
       }
     }
     if(target.screen==="result"){
       if(attempt.id!==previousAttempt?.id||prevView!=="result")reviewFilter="all";
       resultTab=target.tab;
     }
   }
   view=target.screen;
   if(disposed||ctx.signal?.aborted||requested!==activationGeneration)return;
   draw();
   if(ctx.kind!=="initial"&&(prevView!==view||
      (view==="result"&&resultTab!==previousTab))) {
     window.scrollTo({top:0,behavior:"instant"});
   }
 }
 function draw():void{
   if(disposed)return;
   imageViewer.beforeRender();
   const currentSection=attempt?.frozen.paper.sections[attempt.state.sectionIndex];
   const currentQuestion=attempt?.state.questionIndex;
   const screenKey=view==="exam"?
     "exam|"+attempt?.id+"|"+attempt?.state.sectionIndex+"|"+currentQuestion:
     view==="result"?"result|"+attempt?.id+"|"+resultTab:view;
   const announcement=view==="exam"?
     "Exam. "+(currentSection?.title??"Section")+", question "+((currentQuestion??0)+1)+
       " of "+(currentSection?.questionRevisionIds.length??0)+".":
     view==="result"?"Results. "+(resultTab==="overview"?"Performance overview":
       resultTab==="review"?"Question review":"Question timing ledger")+".": 
     view==="history"?"History and insights.":
     view==="learning"?"Learning and spaced revision.":"Test library.";
   screenRenderer.render({
     screen:view,screenKey,announcement,resultPane:resultTab,
     html:()=>view==="library"?listHTML():view==="history"?
       historyHTML([...records.values()].filter(isAttempt),packages,
         historyQuery,
         loading,fallbackConflict||storageFault,warning,db?"indexeddb":"fallback",storageSnapshot()):
       view==="exam"?examHTML():resultHTML()
   },learningDesk);
   if(view==="learning")return;
   if(view==="history"){
     root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>go({screen:"library"});
     const setFilter=(patch:Partial<HistoryQuery>)=>
       changeHistoryQuery({...historyQuery,...patch});
     root.querySelector<HTMLSelectElement>("#g-filter")!.onchange=e=>
       setFilter({status:(e.target as HTMLSelectElement).value as HistoryQuery["status"]});
     root.querySelector<HTMLSelectElement>("#g-history-paper")!.onchange=e=>
       setFilter({paperRevisionId:(e.target as HTMLSelectElement).value});
     root.querySelector<HTMLSelectElement>("#g-history-exam")!.onchange=e=>
       setFilter({examId:(e.target as HTMLSelectElement).value});
     root.querySelector<HTMLSelectElement>("#g-history-mode")!.onchange=e=>
       setFilter({mode:(e.target as HTMLSelectElement).value});
     root.querySelector<HTMLInputElement>("#g-history-from")!.onchange=e=>
       setFilter({startedFrom:(e.target as HTMLInputElement).value});
     root.querySelector<HTMLInputElement>("#g-history-to")!.onchange=e=>
       setFilter({startedTo:(e.target as HTMLInputElement).value});
     root.querySelector<HTMLSelectElement>("#g-history-sort")!.onchange=e=>
       setFilter({sort:(e.target as HTMLSelectElement).value as HistoryQuery["sort"]});
     root.querySelector<HTMLInputElement>("#g-history-search")!.oninput=e=>
       setFilter({search:(e.target as HTMLInputElement).value});
     root.querySelector<HTMLButtonElement>("#g-history-reset")!.onclick=()=>
       changeHistoryQuery(DEFAULT_HISTORY_QUERY);
     root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void downloadBackup();};
     root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await importHistory(file);}catch(error){notice(error instanceof Error?error.message:"History import failed");}
     };
     root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(button=>button.onclick=()=>{void removeSavedAttempt(button.dataset.delete??"","completed");});
     root.querySelectorAll<HTMLButtonElement>("[data-discard]").forEach(button=>button.onclick=()=>{void removeSavedAttempt(button.dataset.discard??"","discard-unfinished");});
     root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>openSaved(button.dataset.attempt??""));
     root.querySelector<HTMLButtonElement>("#g-delete-completed")!.onclick=()=>{void deleteAllCompleted();};
     root.querySelector<HTMLButtonElement>("#g-storage-persist")!.onclick=()=>{void requestPersistentStorage();};
     void showStorageEstimate();
     return;
   }
   if(view==="library"){
     root.querySelector<HTMLButtonElement>("#g-learning")!.onclick=()=>go({screen:"learning"});
     root.querySelector<HTMLSelectElement>("#g-family")!.onchange=e=>{
       const id=(e.target as HTMLSelectElement).value;
       if(!families().some(f=>f.id===id))return;
       applyFamily(id);saveSelection();draw();
     };
     root.querySelector<HTMLSelectElement>("#g-papers")!.onchange=e=>{
       choice=(e.target as HTMLSelectElement).value;
       const chosen=packages.get(choice);
       if(chosen?.paper.edition==="source"||chosen?.paper.edition==="reviewed")
         editionView=chosen.paper.edition;
       singleSection=Math.min(singleSection,Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
       saveSelection();draw();
     };
     root.querySelectorAll<HTMLButtonElement>("[data-edition]").forEach(button=>button.onclick=()=>{
       const next=button.dataset.edition;
       if(next!=="source"&&next!=="reviewed")return;
       if(next===editionView)return;
       const current=packages.get(choice);
       editionView=next;
       const family=families().find(f=>f.id===selectedFamilyId);
       const same=current&&family?pairedEdition(family,current,next):undefined;
       const first=family?.papers.find(p=>p.paper.edition===next);
       choice=(same??first??current)?.paper.id??choice;
       singleSection=Math.min(singleSection,Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
       saveSelection();draw();
     });
     root.querySelector<HTMLButtonElement>("#g-history")!.onclick=()=>go({screen:"history"});
     root.querySelector<HTMLButtonElement>("#g-history-recent")!.onclick=()=>{
       changeHistoryQuery({...DEFAULT_HISTORY_QUERY,status:"complete"},false);
       go({screen:"history"});
     };
     const pendingHistory=root.querySelector<HTMLButtonElement>("#g-pending-history");
     if(pendingHistory)pendingHistory.onclick=()=>{
       changeHistoryQuery({...DEFAULT_HISTORY_QUERY,status:"progress"},false);
       go({screen:"history"});
     };
     root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button=>button.onclick=()=>{
       cglMode=button.dataset.mode as CglPracticeMode;saveSelection();draw();
     });
     root.querySelector<HTMLInputElement>("#g-untimed")!.onchange=e=>{
       untimedPractice=(e.target as HTMLInputElement).checked;saveSelection();draw();
     };
     const single=root.querySelector<HTMLSelectElement>("#g-single-section");
     if(single)single.onchange=()=>{singleSection=Number(single.value);saveSelection();};
     const builderDetails=root.querySelector<HTMLDetailsElement>("#g-compose-details");
     if(builderDetails){
       builderDetails.ontoggle=()=>{
         if(composeOpen!==builderDetails.open){composeOpen=builderDetails.open;draw();}
       };
       // Preserve in-progress field edits if an asynchronous details toggle
       // triggers a Library redraw before the Preview/Start click.
       root.querySelector<HTMLInputElement>("#g-compose-seed")!.oninput=e=>{
         composeSeed=(e.target as HTMLInputElement).value;
       };
       root.querySelector<HTMLInputElement>("#g-compose-count")!.oninput=e=>{
         composeCount=Number((e.target as HTMLInputElement).value);
       };
       for(const [id,assign] of [
         ["#g-compose-section",(v:string)=>{composeSection=v;}],
         ["#g-compose-topic",(v:string)=>{composeTopic=v;}],
         ["#g-compose-difficulty",(v:string)=>{composeDifficulty=v;}]
       ] as const){
         root.querySelector<HTMLSelectElement>(id)!.onchange=e=>{
           assign((e.target as HTMLSelectElement).value);
         };
       }
       const capture=()=>{
         composeSection=root.querySelector<HTMLSelectElement>("#g-compose-section")!.value;
         composeTopic=root.querySelector<HTMLSelectElement>("#g-compose-topic")!.value;
         composeDifficulty=root.querySelector<HTMLSelectElement>("#g-compose-difficulty")!.value;
         composeCount=Number(root.querySelector<HTMLInputElement>("#g-compose-count")!.value);
         composeSeed=root.querySelector<HTMLInputElement>("#g-compose-seed")!.value.trim();
       };
       const make=()=>{
         capture();
         const p=packages.get(choice);
         if(!p||familyIdFor(p,builtinPaperIds)!==selectedFamilyId)throw Error("Selected paper unavailable");
         const base=configureUntimedPractice(
           selectedFamilyId===BUILTIN_CGL_FAMILY?
             configureCglPractice(p,cglMode,singleSection):p,untimedPractice);
         return composePracticeSet(base,{count:composeCount,seed:composeSeed,
           filters:{...(composeSection?{sectionId:composeSection}:{}),
             ...(composeTopic?{topicId:composeTopic}:{}),
             ...(composeDifficulty?{difficulty:composeDifficulty}:{})}});
       };
       root.querySelector<HTMLButtonElement>("#g-compose-preview")!.onclick=()=>{
         try{
           const {bundle,manifest}=make();
           const pf=examPreflight(bundle,{builtinCgl:selectedFamilyId===BUILTIN_CGL_FAMILY});
           composePreview=manifest.selectedQuestionRevisionIds.length+" selected from "+
             manifest.eligibleCount+" eligible · maximum "+pf.maximum.toFixed(pf.decimals)+
             " marks · "+(bundle.paper.timing.kind==="untimed"?"untimed":bundle.paper.timing.kind)+
             " · "+bundle.paper.sections.length+" sections · seed "+composeSeed+". Source revision is frozen.";
           composeError="";
         }catch(error){
           composePreview="";composeError=error instanceof Error?error.message:"Invalid custom set";
         }
         composeOpen=true;draw();
       };
       root.querySelector<HTMLButtonElement>("#g-compose-start")!.onclick=()=>{
         if(loading||fallbackConflict||storageFault)return;
         try{
           const {bundle,manifest}=make();
           const unfinished=[...records.values()].filter((row):row is GenericAttempt=>
             isAttempt(row)&&row.finishedAt===null);
           if(unfinished.length&&!confirm("You have "+unfinished.length+
             " unfinished tests. Start a separate custom attempt? Existing attempts remain saved."))return;
           const id=typeof crypto!=="undefined"&&crypto.randomUUID?
             crypto.randomUUID():"custom-"+now()+"-"+Math.random();
           attempt={...startGenericAttempt(bundle,id,now()),practiceComposition:manifest};
           freshlyStartedAttemptId=attempt.id;
           composeError="";composePreview="";warning="";
           void save(attempt);go({screen:"exam",attemptId:attempt.id});
         }catch(error){
           composeOpen=true;composePreview="";
           composeError=error instanceof Error?error.message:"Cannot create custom practice";
           draw();
         }
       };
     }
     root.querySelector<HTMLButtonElement>("#g-start")!.onclick=()=>{
       const p=packages.get(choice);
       if(!p||familyIdFor(p,builtinPaperIds)!==selectedFamilyId)return;
       const unfinished=[...records.values()].filter((row):row is GenericAttempt=>
         isAttempt(row)&&row.finishedAt===null);
       if(unfinished.length&&!confirm(
         "You have "+unfinished.length+" unfinished test"+(unfinished.length===1?"":"s")+
         ". Start a separate attempt? Existing attempts will be kept; their timers continue until expiry when resumed or while active."))return;
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"generic-"+now()+"-"+Math.random();
       const configured=configureUntimedPractice(
         selectedFamilyId===BUILTIN_CGL_FAMILY?configureCglPractice(p,cglMode,singleSection):p,untimedPractice);
       attempt=startGenericAttempt(configured,id,now());
       freshlyStartedAttemptId=attempt.id;
       if(configured.paper.edition==="reviewed"){
         const source=[...packages.values()].find(candidate=>candidate.paper.edition==="source"&&
           familyIdFor(candidate,builtinPaperIds)===selectedFamilyId&&
           candidate.paper.paperId===configured.paper.paperId&&candidate.examId===configured.examId);
         if(source){
           const original= createSourceKeyReference(configured,source);
           const review= createSourceReviewReference(configured,source);
           attempt={...attempt,
             ...(original?{sourceKeyReference:original}:{}),
             ...(review?{sourceReviewReference:review}:{})};
         }
       }
       warning="";void save(attempt);go({screen:"exam",attemptId:attempt.id});
     };
     root.querySelector<HTMLButtonElement>("#g-import")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-file")?.click();
     root.querySelector<HTMLButtonElement>("#g-bank-template")!.onclick=()=>{
       const data=new Blob([JSON.stringify(APFC_NAT_BANK_TEMPLATE,null,2)],{type:"application/json"});
       const url=URL.createObjectURL(data);
       const link=document.createElement("a");link.href=url;link.download="Practice_Desk_APFC_NAT_Starter.json";
       document.body.append(link);link.click();link.remove();
       window.setTimeout(()=>URL.revokeObjectURL(url),2000);
     };
     root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void downloadBackup();};
     root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await importHistory(file);}catch(error){notice(error instanceof Error?error.message:"History import failed");}
     };
     root.querySelector<HTMLInputElement>("#g-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       if(file.size>25*1024*1024){notice("Exam package exceeds the 25 MiB import limit.");return;}
       try{
         const pkg=importAuthoredExam(JSON.parse(await file.text()));
         if(packages.has(pkg.paper.id))throw new Error("Paper revision ID already exists. Supply a new revision ID.");
         if(!await save({recordType:"generic-package",id:"generic-package:"+pkg.paper.id,bundle:pkg}))return;
         packages.set(pkg.paper.id,pkg);
         applyFamily(familyIdFor(pkg,builtinPaperIds));
         choice=pkg.paper.id;singleSection=0;
         if(pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")editionView=pkg.paper.edition;
         saveSelection();
         notice("Question bank validated and imported. Your paper is ready to practise.");
       }catch(error){notice(error instanceof Error?error.message:"Invalid exam package");}
     };
     root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(button=>button.onclick=()=>{
       void removeSavedAttempt(button.dataset.delete??"","completed");
     });
     root.querySelectorAll<HTMLButtonElement>("[data-discard]").forEach(button=>button.onclick=()=>{
       void removeSavedAttempt(button.dataset.discard??"","discard-unfinished");
     });
     root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>{
       openSaved(button.dataset.attempt??"");
     });
     return;
   }
   root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>{
     if(view==="exam"&&attempt?.finishedAt===null){
       if(!confirm("Return to library? Your test timer will keep running and the attempt can be resumed."))return;
     }
     go({screen:"library"});
   };
   if(view==="result"&&attempt){
     root.querySelector<HTMLButtonElement>("#g-history-results")!.onclick=()=>go({screen:"history"});
     const resultLibrary=root.querySelector<HTMLButtonElement>("#g-result-library");
     if(resultLibrary)resultLibrary.onclick=()=>go({screen:"library"});
     const viewReview=root.querySelector<HTMLButtonElement>("#g-view-question-review");
     if(viewReview)viewReview.onclick=()=>go({screen:"result",attemptId:attempt!.id,tab:"review"});
     const tabs=[...root.querySelectorAll<HTMLButtonElement>("[data-result-tab]")];
     tabs.forEach((button,index)=>{
       button.onclick=()=>go({screen:"result",attemptId:attempt!.id,tab:button.dataset.resultTab as ResultTab});
       button.onkeydown=event=>{
         if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
         event.preventDefault();
         const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:
           (index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
         go({screen:"result",attemptId:attempt!.id,tab:tabs[next]!.dataset.resultTab as ResultTab});
       };
     });
     const reviewFilterControl=root.querySelector<HTMLSelectElement>("#g-review-filter");
     if(reviewFilterControl)reviewFilterControl.onchange=e=>{
       reviewFilter=(e.target as HTMLSelectElement).value as ReviewFilter;draw();
     };
     root.querySelectorAll<HTMLButtonElement>("[data-review-preset]").forEach(button=>button.onclick=()=>{
       if(!attempt?.frozen.paper.navigation.allowReview)return;
       reviewFilter=(button.dataset.reviewPreset??"all") as ReviewFilter;
       if(resultTab==="review")draw();
       else go({screen:"result",attemptId:attempt!.id,tab:"review"});
     });
     root.querySelectorAll<HTMLButtonElement>("[data-ledger-q]").forEach(button=>button.onclick=()=>{
       if(!attempt?.frozen.paper.navigation.allowReview)return;
       const question=button.dataset.ledgerQ;reviewFilter="all";
       void router.navigate({screen:"result",attemptId:attempt!.id,tab:"review"}).then(()=>{
         if(disposed)return;
         if(resultTab==="review")draw();
         const target=[...root.querySelectorAll<HTMLElement>("[data-review-id]")].find(node=>node.dataset.reviewId===question);
         target?.scrollIntoView({block:"start"});
       }).catch(error=>notice(error instanceof Error?error.message:"Review navigation failed"));
     });
     const revisionSet=root.querySelector<HTMLButtonElement>("#g-revision-set");
     if(revisionSet)revisionSet.onclick=()=>{void addResultCards(attempt!);};
     const reviewTop=root.querySelector<HTMLButtonElement>("#g-review-top");
     if(reviewTop)reviewTop.onclick=()=>{
       document.getElementById("result-tab-review")?.focus({preventScroll:true});
       window.scrollTo({top:0,behavior:"smooth"});
     };
     root.querySelectorAll<HTMLButtonElement>("[data-manual-save]").forEach(button=>button.onclick=async()=>{
       if(!attempt||storageFault)return;
       const id=button.dataset.manualSave as QuestionRevisionId|undefined;
       if(!id)return;
       const marksField=[...root.querySelectorAll<HTMLInputElement>("[data-manual-marks]")].find(x=>x.dataset.manualMarks===id);
       const noteField=[...root.querySelectorAll<HTMLTextAreaElement>("[data-manual-note]")].find(x=>x.dataset.manualNote===id);
       if(!marksField?.value||!Number.isFinite(marksField.valueAsNumber)){notice("Enter a finite assessment mark.");return;}
       try{
         const assessed=setManualGrade(attempt,id,marksField.valueAsNumber,noteField?.value??"",new Date(now()).toISOString());
         if(await save(assessed)){warning="Self-assessment committed separately from original exam score.";draw();}
       }catch(error){notice(error instanceof Error?error.message:"Invalid manual assessment");}
     });
     root.querySelectorAll<HTMLButtonElement>("[data-add-card]").forEach(button=>button.onclick=()=>{
       if(attempt)addNotebookCard(attempt,button.dataset.addCard??"");
     });
     return;
   }
   if(view!=="exam"||!attempt)return;
   root.querySelector<HTMLButtonElement>("#g-exam-full")!.onclick=()=>
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));
   const section=attempt.frozen.paper.sections[attempt.state.sectionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===section?.questionRevisionIds[attempt!.state.questionIndex]);
   if(!q)return;
   root.querySelectorAll<HTMLInputElement>("[data-choice]").forEach(input=>input.onchange=()=>{
     if(q.content.kind==="single-choice"){
       const option=q.content.options.find(x=>x.id===input.dataset.choice);
       if(!option){notice("Unknown question option.");return;}
       dispatch({type:"ANSWER",nowMs:now(),response:{kind:"single-choice",optionId:option.id}});
     }else if(q.content.kind==="multiple-select"){
       const raw=[...root.querySelectorAll<HTMLInputElement>("[data-choice]:checked")].map(x=>x.dataset.choice);
       const chosen=q.content.options.filter(option=>raw.includes(option.id)).map(option=>option.id);
       if(raw.length!==chosen.length){notice("Unknown question option.");return;}
       const draftKey=attempt!.id+"|"+q.id;
       const min=q.content.minSelections??1,max=q.content.maxSelections;
       const message=chosen.length?multipleDraftMessage(chosen.length,min,max):"";
       if(message){
         // Preserve the visible draft while clearing any previously committed
         // response. A half-edited old answer must not silently count as saved.
         choiceDrafts.set(draftKey,{questionId:q.id,optionIds:chosen,message});
         dispatch({type:"CLEAR",nowMs:now()});
       }else{
         choiceDrafts.delete(draftKey);
         dispatch(!chosen.length?{type:"CLEAR",nowMs:now()}:
           {type:"ANSWER",nowMs:now(),response:{kind:"multiple-select",optionIds:chosen}});
       }
     }
   });
   root.querySelectorAll<HTMLInputElement>("[data-bool]").forEach(input=>input.onchange=()=>{
     dispatch({type:"ANSWER",nowMs:now(),response:{kind:"true-false",value:input.dataset.bool==="true"}});
   });
   const saveButton=root.querySelector<HTMLButtonElement>("#g-save");
   if(q.content.kind==="matching"&&saveButton){
     const matching=q.content;
     const controls=[...root.querySelectorAll<HTMLSelectElement>("[data-match]")];
     const feedback=root.querySelector<HTMLElement>("#g-match-feedback");
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
       const field=root.querySelector<HTMLInputElement>("#g-number")!;
       if(!field.value||!Number.isFinite(field.valueAsNumber)){notice("Enter a finite numeric answer.");return;}
       dispatch({type:"ANSWER",nowMs:now(),response:{kind:"numeric-entry",value:field.valueAsNumber}});
     }else if(q.content.kind==="free-response"){
       const value=root.querySelector<HTMLTextAreaElement>("#g-text")!.value;
       dispatch(value.trim()?{type:"ANSWER",nowMs:now(),response:{kind:"free-response",text:value}}:{type:"CLEAR",nowMs:now()});
     }else if(q.content.kind==="matching"){
       const matching=q.content;
       const controls=[...root.querySelectorAll<HTMLSelectElement>("[data-match]")];
       const duplicate=duplicateMatchingTargets(controls.map(control=>control.value));
       if(duplicate.length){
         notice("Conflicting right-side matches must be corrected before saving.");return;
       }
       const pairs=controls.filter(x=>x.value)
         .map(x=>{
           const left=matching.leftItems.find(item=>item.id===x.dataset.match);
           const right=matching.rightItems.find(item=>item.id===x.value);
           return left&&right?{leftId:left.id,rightId:right.id}:null;
         });
       if(pairs.some(x=>x===null)){notice("Unknown matching option.");return;}
       const validPairs=pairs.filter((pair):pair is NonNullable<typeof pair>=>pair!==null);
       dispatch(validPairs.length?{type:"ANSWER",nowMs:now(),response:{kind:"matching",pairs:validPairs}}:{type:"CLEAR",nowMs:now()});
     }
   };
   root.querySelector<HTMLButtonElement>("#g-clear")!.onclick=()=>dispatch({type:"CLEAR",nowMs:now()});
   root.querySelector<HTMLButtonElement>("#g-flag")!.onclick=()=>dispatch({type:"FLAG",nowMs:now(),
     flagged:!attempt!.state.responses.find(r=>r.questionRevisionId===q.id)?.flagged});
   const navigate=(s:number,i:number)=>dispatch({type:"NAVIGATE",nowMs:now(),sectionIndex:s,questionIndex:i});
   root.querySelector<HTMLButtonElement>("#g-prev")!.onclick=()=>navigate(attempt!.state.sectionIndex,attempt!.state.questionIndex-1);
   root.querySelector<HTMLButtonElement>("#g-next")!.onclick=()=>navigate(attempt!.state.sectionIndex,attempt!.state.questionIndex+1);
   root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach(b=>b.onclick=()=>navigate(attempt!.state.sectionIndex,Number(b.dataset.q)));
   root.querySelectorAll<HTMLButtonElement>("[data-section]").forEach(b=>b.onclick=()=>navigate(Number(b.dataset.section),0));
   const pause=root.querySelector<HTMLButtonElement>("#g-pause");
   if(pause)pause.onclick=()=>dispatch({type:attempt!.state.status==="paused"?"RESUME":"PAUSE",nowMs:now()});
   root.querySelector<HTMLButtonElement>("#g-submit")!.onclick=()=>{
     const p=attempt!.frozen.paper, st=attempt!.state;
     const sectional=p.timing.kind==="sectional";
     const lockedWhole=p.timing.kind!=="sectional"&&p.navigation.sectionNavigation==="sequential-locked";
     const continuing=(sectional||lockedWhole)&&st.sectionIndex<p.sections.length-1;
     const expired=st.status==="section-expired";
     if(!expired&&!confirm(continuing?"Close this section and advance? You cannot return.":"Submit this exam and view results?"))return;
     dispatch({type:sectional||continuing?"SUBMIT_SECTION":"SUBMIT_ATTEMPT",nowMs:now()});
   };
 }
 const timer=window.setInterval(()=>{
   // Time limits still elapse outside exam view, but hidden/library time is
   // not charged to the last foreground question.
   if(disposed||storageFault||!attempt||attempt.finishedAt!==null||
      (attempt.state.status==="paused"||attempt.state.status==="section-expired"))return;
   const original=attempt;
   const next=transitionGenericAttempt(original,{type:"TICK",nowMs:now()},
     new Map(original.frozen.questions.map(q=>[q.id,q])));
   if(next!==original){
     attempt=next;
     const changedSection=original.state.sectionIndex!==next.state.sectionIndex;
     if(next.finishedAt!==null||changedSection||original.state.status!==next.state.status||
       (view==="exam"&&now()-lastTimerSave>=10000)){
       void save(attempt);lastTimerSave=now();
     }
     if(next.finishedAt!==null){
       if(view==="exam"){
         reviewFilter="all";go({screen:"result",attemptId:attempt.id,tab:"overview"},"replace");
       }else draw();
       return;
     }
     if((changedSection||original.state.status!==next.state.status)&&view==="exam"){draw();return;}
   }
   if(view==="exam"){
     const el=root.querySelector("#g-timer");
     if(el&&attempt){const time=examTimeRemaining(attempt.frozen.paper,attempt.state);
       el.textContent=time===null?"Untimed":minutes(time);}
   }
 },1000);
 const visibility=()=>{
   if(!attempt||attempt.finishedAt!==null||storageFault)return;
   dispatchVisibility(view==="exam"&&!document.hidden);
 };
 function dispatchVisibility(visible:boolean):void{
   if(!attempt||storageFault||attempt.finishedAt!==null)return;
   const current=attempt;
   attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible},
     new Map(current.frozen.questions.map(q=>[q.id,q])));
   void save(attempt);
   if(attempt.finishedAt!==null&&view==="exam"){
     reviewFilter="all";go({screen:"result",attemptId:attempt.id,tab:"overview"},"replace");return;
   }
   draw();
 }
 document.addEventListener("visibilitychange",visibility);
 const keyboard=(event:KeyboardEvent)=>{
   if(imageViewer.isOpen())return;
   if(disposed||view!=="exam"||!attempt||attempt.finishedAt!==null||
      (attempt.state.status!=="running"&&attempt.state.status!=="paused")||document.hidden||
      event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
   const focused=event.target;
   const focusedRadio=focused instanceof HTMLInputElement&&focused.type==="radio"&&
     root.contains(focused)&&(focused.name==="generic-answer"||focused.name==="generic-boolean");
   if(focused instanceof HTMLElement){
     if(focused.isContentEditable||focused.closest('[contenteditable="true"]'))return;
     if(focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)return;
     // Radios own unmodified arrows; Alt+arrows navigate, A–D still select
     // single-choice answers, and text/numeric/select widgets are not hijacked.
     if(focused instanceof HTMLInputElement&&!focusedRadio)return;
   }
   const displayPanel=document.getElementById("displayPanel");
   if(displayPanel&&!displayPanel.hidden)return;
   const key=event.key.toLowerCase();
   const arrow=key==="arrowright"||key==="arrowleft";
   if(event.altKey&&!arrow)return;
   if(attempt.state.status==="paused"){
     if(key!=="m"||event.altKey||event.repeat||
       !attempt.frozen.paper.navigation.allowFlagging)return;
     event.preventDefault();
     const id=attempt.frozen.paper.sections[attempt.state.sectionIndex]!
       .questionRevisionIds[attempt.state.questionIndex]!;
     const marked=attempt.state.responses.find(r=>r.questionRevisionId===id)?.flagged??false;
     dispatch({type:"FLAG",nowMs:now(),flagged:!marked});return;
   }
   if(arrow){
     if(focusedRadio&&!event.altKey)return; // native radio selection
     event.preventDefault();
     const move=key==="arrowright"?1:-1;
     const target=attempt.state.questionIndex+move;
     const section=attempt.frozen.paper.sections[attempt.state.sectionIndex];
     if(!section?.questionRevisionIds[target]||
        (move<0&&attempt.frozen.paper.navigation.questionNavigation==="forward-only"))return;
     dispatch({type:"NAVIGATE",nowMs:now(),sectionIndex:attempt.state.sectionIndex,questionIndex:target});
     return;
   }
   if(event.altKey||event.repeat)return;
   if(key==="f"){
     event.preventDefault();
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));return;
   }
   if(key==="m"){
     if(!attempt.frozen.paper.navigation.allowFlagging)return;
     event.preventDefault();
     const id=attempt.frozen.paper.sections[attempt.state.sectionIndex]!
       .questionRevisionIds[attempt.state.questionIndex]!;
     const marked=attempt.state.responses.find(r=>r.questionRevisionId===id)?.flagged??false;
     dispatch({type:"FLAG",nowMs:now(),flagged:!marked});return;
   }
   if(!["a","b","c","d"].includes(key))return;
   const id=attempt.frozen.paper.sections[attempt.state.sectionIndex]!
     .questionRevisionIds[attempt.state.questionIndex]!;
   const question=attempt.frozen.questions.find(q=>q.id===id);
   if(question?.content.kind!=="single-choice")return;
   const option=question.content.options[key.charCodeAt(0)-97];
   if(!option)return;
   event.preventDefault();
   dispatch({type:"ANSWER",nowMs:now(),response:{kind:"single-choice",optionId:option.id}});
 };
 window.addEventListener("keydown",keyboard);
 const pagehide=()=>{
   if(attempt&&attempt.finishedAt===null&&!storageFault){
     try{
       const current=attempt;
       attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible:false},
         new Map(current.frozen.questions.map(q=>[q.id,q])));
       writeMirror(attempt);
       void save(attempt);
     }catch(error){console.warn("Pagehide checkpoint failed",error);}
   }
 };
 window.addEventListener("pagehide",pagehide);
 const storage=(event:StorageEvent)=>{
   if(db||event.key!==storageKey||event.newValue===fallbackStamp)return;
   fallbackConflict=true;
   warning="Fallback history changed in another tab. Reopen the file before continuing.";
   recordStorageFailure(new Error("Concurrent fallback history change detected; writes blocked"));
   attempt=null;go({screen:"library"},"replace");
   if(!disposed)draw();
 };
 window.addEventListener("storage",storage);
 function cleanup(){imageViewer.dispose();router.dispose();learningDesk.dispose();disposed=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility);
   window.removeEventListener("pagehide",pagehide);window.removeEventListener("storage",storage);
   window.removeEventListener("keydown",keyboard);void writeQueue.finally(()=>db?.close());root.classList.remove("generic-workspace");}
 router=createNativeRouter(activateRoute);
 draw();
 (async()=>{
   try{
     db=await new Promise<IDBDatabase>((resolve,reject)=>{
       const request=indexedDB.open(dbName,1);
       request.onupgradeneeded=()=>{
         request.result.createObjectStore(ATTEMPTS_STORE,{keyPath:"id"});
         request.result.createObjectStore(SNAPSHOTS_STORE,{keyPath:"id"});
       };
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
       request.onblocked=()=>reject(new Error("Database blocked"));
     });
     const {all,snapshots}=await new Promise<{all:unknown[];snapshots:SharedSnapshot[]}>((resolve,reject)=>{
       const tx=db!.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readonly");
       const rows=tx.objectStore(ATTEMPTS_STORE).getAll();
       const contents=tx.objectStore(SNAPSHOTS_STORE).getAll();
       tx.oncomplete=()=>resolve({all:rows.result as unknown[],snapshots:contents.result as SharedSnapshot[]});
       tx.onerror=()=>reject(tx.error);
     });
     for(const snap of snapshots)storedSnapshots.set(snap.id,verifiedSnapshot(snap));
     for(const record of reconstructRecords(all,snapshots)){
       if(isPackage(record)){try{
         const valid=validateExamPackage(record.bundle);
         if(!packages.has(valid.paper.id)){packages.set(valid.paper.id,valid);records.set(record.id,record);}
       }catch(error){console.warn("Invalid saved package",error);}}
       else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
     }
     try{
       const mirror=JSON.parse(localStorage.getItem(mirrorKey)??"null") as unknown;
       if(isAttempt(mirror)){
         validateGenericStoredRecord(mirror);
         const existing=records.get(mirror.id);
         const winner=chooseRecovered(isAttempt(existing)?existing:undefined,mirror);
         if(winner===mirror)void save(mirror);
       }
     }catch(error){console.warn("Invalid emergency session mirror",error);}
   }catch(error){
     recordStorageFailure(error);
     // A failed initial read must not leave an active IndexedDB handle
     // behind while displaying fallback localStorage data.
     console.warn("IndexedDB startup failed; switching to local fallback",error);
     try{db?.close();}catch{}
     db=null;
     warning="IndexedDB unavailable. Limited localStorage fallback is in use.";
     try{
       const storedFallback=localStorage.getItem(storageKey);
       fallbackStamp=storedFallback;
       const recordsFromStorage=JSON.parse(storedFallback??"[]") as unknown[];
       for(const record of recordsFromStorage){
         if(isPackage(record)){try{packages.set(record.bundle.paper.id,validateExamPackage(record.bundle));records.set(record.id,record);}catch{}}
         else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
       }
     }catch{warning="Browser storage is unavailable; attempts may not survive a reload.";}
   }
   // The selected exam may be an imported package, unavailable until the
   // asynchronous IndexedDB/fallback package inventory has finished loading.
   if(storedSetups)applyFamily(storedSetups.selectedFamilyId);
   loading=false;
   routeHydrated=true;hydrationDone();
   if(!disposed){draw();void router.start().catch(error=>notice(
     error instanceof Error?"Navigation startup failed: "+error.message:"Navigation startup failed"));}
 })();
 return cleanup;
}
