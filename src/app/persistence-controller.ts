/** P47-6 module: persistence-controller.ts */


import {validateGenericStoredRecord,isAttempt,isPackage,isLearning,type RecordItem} from "./stored-record-validator.ts";


import {validateExamPackage} from "./exam-package.ts";
import type {GenericAttempt} from "./exam-package.ts";



import {chooseRecovered} from "../history/frozen.ts";







import {serializeVerifiedBackup,verifyBackup,planBackupMerge} from "../history/backup.ts";
import {assertWriteVersion,nextWriteVersion} from "../history/concurrency.ts";
import {assertDeletionAllowed,deletionWarning,type DeletionIntent} from "../history/deletion-policy.ts";




import {healthSummary,type StorageHealth} from "./history-page.ts";

import {backupDownload,readBackupFile} from "../history/backup-file.ts";
import {ATTEMPTS_STORE,SNAPSHOTS_STORE,compactAttempt,expandAttempt,isSharedAttempt,verifiedSnapshot,reconstructRecords,pruneSharedSnapshots} from "../history/shared-store.ts";
import type {SharedSnapshot,SlimAttempt} from "../history/shared-store.ts";







import {readDisplayPreferences,writeDisplayPreferences,SETTINGS_EVENT} from "./preferences.ts";









import type {CoordinatorContext} from "./coordinator-context.ts";

export const downloadHistoryBackup=async (owner:CoordinatorContext):Promise<void>=>{
   await owner.writeQueue;
   try{
     let toExport:RecordItem[]=[...owner.records.values()];
     if(owner.db&&!owner.storageFault){
       try{
         const snapshot=await new Promise<unknown[]>((resolve,reject)=>{
           const request=owner.db!.transaction(ATTEMPTS_STORE,"readonly").objectStore(ATTEMPTS_STORE).getAll();
           request.onsuccess=()=>resolve(request.result);
           request.onerror=()=>reject(request.error??new Error("Database snapshot failed"));
         });
         toExport=reconstructRecords(snapshot,[...owner.storedSnapshots.values()])
           .map(value=>validateGenericStoredRecord(value));
       }catch(error){
         owner.storageFault=true;
         owner.recordStorageFailure(error);
         console.warn("Cannot read authoritative backup snapshot; exporting working-memory recovery",error);
       }
     }else if(owner.fallbackConflict&&!owner.storageFault){
       const latest=JSON.parse(localStorage.getItem(owner.storageKey)??"[]") as unknown;
       if(!Array.isArray(latest))throw new Error("Invalid fallback history");
       toExport=latest.map(value=>validateGenericStoredRecord(value));
     }
     // DB rows above have been validated once. The fallback branch is
     // verified here; no second full frozen-record copy or parse/stringify.
     if(!owner.db||owner.storageFault)toExport=toExport.map(value=>validateGenericStoredRecord(value));
     const serialized=serializeVerifiedBackup(toExport as unknown as readonly Record<string,unknown>[],
       readDisplayPreferences(),new Date().toISOString(),owner.setups);
     const exportFile=await backupDownload(serialized);
     const url=URL.createObjectURL(exportFile.blob);
     const link=document.createElement("a");link.href=url;
     link.download="Practice_Desk_Backup_"+new Date().toISOString().slice(0,10)+
       (owner.storageFault?"_UNSAVED_RECOVERY":"")+exportFile.extension;
     document.body.append(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),2000);
     if(owner.storageFault){owner.warning="Emergency recovery file exported. Some records were not committed to browser storage. Keep this file and reopen before editing.";owner.draw();}
   }catch(error){owner.warning=error instanceof Error?"Backup failed: "+error.message:"Backup failed";owner.draw();}
 };

export const importHistoryBackup=async (owner:CoordinatorContext,file:File)=>{
   if(owner.storageFault||owner.fallbackConflict)throw new Error("Storage is unavailable or changed in another tab. Reopen before importing.");
   const archive=verifyBackup(await readBackupFile(file));
   const imported=reconstructRecords(archive.records,archive.snapshots)
     .map(record=>validateGenericStoredRecord(record));
   const incoming=planBackupMerge([...owner.records.values()],imported,owner.attempt?.id);
   if(!confirm("Import "+incoming.length+" new saved records and restore available display/exam setup preferences? Existing records will not be overwritten."))return;
   await owner.writeQueue;
   if(incoming.length){
     if(owner.db){
       await new Promise<void>((resolve,reject)=>{
         const transaction=owner.db!.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
         const store=transaction.objectStore(ATTEMPTS_STORE),snapshotStore=transaction.objectStore(SNAPSHOTS_STORE);
         const toInsert=new Map<string,SharedSnapshot>();
         for(const record of incoming){
           if(isAttempt(record)){
             const packed=compactAttempt(record);
             store.add(packed.row);toInsert.set(packed.snapshot.id,packed.snapshot);
           }else store.add(record);
         }
         for(const [id,snapshot] of toInsert){
           if(!owner.storedSnapshots.has(id))snapshotStore.add(snapshot);
         }
         transaction.oncomplete=()=>resolve();
         transaction.onerror=()=>reject(transaction.error??new Error("Import failed"));
         transaction.onabort=()=>reject(transaction.error??new Error("Import aborted"));
       });
     }else{
       if(localStorage.getItem(owner.storageKey)!==owner.fallbackStamp)
         throw new Error("Another tab changed fallback history; reopen before importing");
       const encoded=JSON.stringify([...owner.records.values(),...incoming]);
       localStorage.setItem(owner.storageKey,encoded);owner.fallbackStamp=encoded;
     }
     for(const record of incoming){
       owner.records.set(record.id,record);
       if(isAttempt(record)){const sh=compactAttempt(record).snapshot;owner.storedSnapshots.set(sh.id,sh);}
       if(isPackage(record)&&!owner.packages.has(record.bundle.paper.id))
         owner.packages.set(record.bundle.paper.id,record.bundle);
     }
   }
   try{
     writeDisplayPreferences(archive.preferences);
     window.dispatchEvent(new Event(SETTINGS_EVENT));
     if(archive.setups){
       owner.setups=archive.setups;owner.applyFamily(owner.setups.selectedFamilyId);owner.saveSelection();
     }
     owner.warning="Imported "+incoming.length+" records; available display/exam setup preferences restored.";
   }catch{
     owner.warning="Imported "+incoming.length+" records. Display preferences could not be stored by this browser.";
   }
   owner.draw();
 };

export const writeEmergencyMirror=(owner:CoordinatorContext,record:GenericAttempt)=>{
   try{localStorage.setItem(owner.mirrorKey,JSON.stringify(record));}
   catch{owner.warning="Emergency session mirror could not be saved. Use a history export.";}
 };

export const saveWorkspaceRecord=(owner:CoordinatorContext,record:RecordItem):Promise<boolean>=>{
   if(owner.fallbackConflict||owner.storageFault){
     owner.warning="Storage is unavailable or changed in another tab. Export a recovery backup and reopen before editing.";
     owner.draw();return Promise.resolve(false);
   }
   const previous=owner.records.get(record.id);
   const expected=previous?previous.saveRevision??0:null;
   const versioned={...record,saveRevision:nextWriteVersion(expected)};
   const packed=isAttempt(versioned)?compactAttempt(versioned):null;
   owner.records.set(record.id,versioned);
   if(isAttempt(versioned)){
     if(owner.attempt?.id===versioned.id)owner.attempt=versioned;
     owner.writeMirror(versioned);
   }
   owner.pendingWrites++;
   owner.updateStorageHealth();
   const pending=owner.writeQueue.then(()=>new Promise<void>((resolve,reject)=>{
     if(owner.storageFault){reject(new Error("A previous storage operation failed"));return;}
     if(!owner.db){
       try{
         if(owner.fallbackConflict||localStorage.getItem(owner.storageKey)!==owner.fallbackStamp)
           throw new Error("Another tab changed fallback history; reopen before editing");
         const encoded=JSON.stringify([...owner.records.values()]);
         localStorage.setItem(owner.storageKey,encoded);owner.fallbackStamp=encoded;resolve();
       }catch(error){reject(error);}
       return;
     }
     try{
       const tx=owner.db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
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
         if(packed)owner.storedSnapshots.set(packed.snapshot.id,packed.snapshot);
         resolve();
       };
       tx.onerror=()=>reject(conflict??tx.error??new Error("Write failed"));
       tx.onabort=()=>reject(conflict??tx.error??new Error("Write aborted"));
     }catch(error){reject(error);}
   }));
   owner.writeQueue=pending.catch(()=>{});
   return pending.then(()=>{owner.lastCommittedAt=Date.now();return true;}).catch(async e=>{
     owner.recordStorageFailure(e);
     const conflict=e instanceof Error&&e.message.startsWith("Another tab");
     owner.storageFault=true;
     if(conflict){
       owner.warning=e.message+"; changes in this tab were not saved. Reopen before editing.";
       if(isAttempt(versioned)&&owner.attempt?.id===versioned.id){owner.attempt=null;owner.go({screen:"library"},"replace");}
       try{localStorage.removeItem(owner.mirrorKey);}catch{}
       owner.records.delete(versioned.id);
       try{
         let latest:unknown;
         if(owner.db){
           const req=owner.db.transaction(ATTEMPTS_STORE,"readonly").objectStore(ATTEMPTS_STORE).get(versioned.id);
           latest=await new Promise<unknown>((resolve,reject)=>{
             req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
           });
           if(isSharedAttempt(latest)){
             const snap=owner.storedSnapshots.get(latest.frozenRef);
             latest=snap?expandAttempt(latest,snap):undefined;
           }
         }else{
           owner.fallbackConflict=true;
           const stored=JSON.parse(localStorage.getItem(owner.storageKey)??"[]") as unknown[];
           latest=stored.find(x=>x&&typeof x==="object"&&(x as {id?:string}).id===versioned.id);
         }
         if(latest)owner.records.set(versioned.id,validateGenericStoredRecord(latest));
       }catch(error){console.warn("Could not reload changed record",error);}
     }else{
       owner.warning="SAVE FAILED — changes in this tab are not safely stored. Export an UNSAVED recovery backup now, then reopen. "+
         (e instanceof Error?e.message:"");
     }
     console.warn("Exam workspace save",e);
     if(!owner.disposed)owner.draw();
     return false;
   }).finally(()=>{owner.pendingWrites--;owner.updateStorageHealth();});
 };

export const removeWorkspaceAttempt=async (owner:CoordinatorContext,id:string,intent:DeletionIntent="completed"):Promise<void>=>{
   const chosen=owner.records.get(id);
   if(owner.storageFault||owner.fallbackConflict){owner.notice("Storage locked. Export recovery backup and reopen before deleting.");return;}
   // The action's label and the stored record must agree before confirmation.
   try{assertDeletionAllowed(chosen,intent);}
   catch(error){owner.notice(error instanceof Error?error.message:"Deletion action no longer matches this record");return;}
   const answers=isAttempt(chosen)?chosen.state.responses.filter(row=>row.response!==undefined).length:0;
   if(!confirm(deletionWarning(intent,answers)))return;
   if(intent==="discard-unfinished"&&!confirm(
     "Final confirmation: permanently discard this unfinished test, including "+
     answers+" saved answer"+(answers===1?"":"s")+
     "? This cannot be undone without a previously exported backup."))return;
   try{
     await owner.writeQueue;
     if(owner.storageFault||owner.fallbackConflict)throw Error("Storage changed while deleting; reopen first");
     const current=owner.records.get(id);
     assertDeletionAllowed(current,intent);
     if(!current||current.saveRevision!==chosen?.saveRevision)
       throw Error("Record was updated while confirming deletion. Reopen and try again.");
     if(owner.db){
       await new Promise<void>((resolve,reject)=>{
         const tx=owner.db!.transaction(ATTEMPTS_STORE,"readwrite");
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
       if(owner.fallbackConflict||localStorage.getItem(owner.storageKey)!==owner.fallbackStamp)
         throw new Error("Another tab changed fallback history");
       const encoded=JSON.stringify([...owner.records.values()].filter(r=>r.id!==id));
       localStorage.setItem(owner.storageKey,encoded);owner.fallbackStamp=encoded;
     }
     owner.records.delete(id);
     if(owner.db&&isAttempt(current)){
       for(const key of await pruneSharedSnapshots(owner.db))owner.storedSnapshots.delete(key);
     }
     // A deleted active attempt must not be revived from its emergency mirror.
     try{
       const raw=localStorage.getItem(owner.mirrorKey);
       if(raw&&JSON.parse(raw)?.id===id)localStorage.removeItem(owner.mirrorKey);
     }catch(error){console.warn("Could not clear the discarded attempt mirror",error);}
     if(owner.attempt?.id===id){owner.attempt=null;owner.go({screen:"library"},"replace");}
     owner.warning=intent==="discard-unfinished"?"Unfinished test discarded. Other saved work was preserved.":
       intent==="completed"?"Completed result deleted.":"Learning card deleted.";
     owner.draw();
   }catch(error){owner.notice(error instanceof Error?error.message:"Deletion failed");}
 };

export const deleteCompletedWorkspaceAttempts=async (owner:CoordinatorContext):Promise<void>=>{
   if(owner.storageFault||owner.fallbackConflict){owner.notice("Storage is locked. Export recovery data and reopen before deletion.");return;}
   const completed=[...owner.records.values()].filter((r):r is GenericAttempt=>
     isAttempt(r)&&r.finishedAt!==null);
   if(!completed.length)return;
   if(!confirm("Delete all "+completed.length+" completed attempts? Export a backup first. This cannot be undone."))return;
   if(!confirm("Confirm permanent deletion of completed test history. In-progress attempts, imported papers and learning cards will remain."))return;
   try{
     await owner.writeQueue;
     if(owner.storageFault||owner.fallbackConflict)throw Error("Storage changed during deletion; reopen before editing.");
     if(owner.db){
       await new Promise<void>((resolve,reject)=>{
         const tx=owner.db!.transaction(ATTEMPTS_STORE,"readwrite");
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
       if(localStorage.getItem(owner.storageKey)!==owner.fallbackStamp)
         throw Error("Another tab changed fallback history; reopen before deleting");
       const ids=new Set(completed.map(r=>r.id));
       const updated=JSON.stringify([...owner.records.values()].filter(r=>!ids.has(r.id)));
       localStorage.setItem(owner.storageKey,updated);owner.fallbackStamp=updated;
     }
     for(const record of completed)owner.records.delete(record.id);
     if(owner.db)for(const key of await pruneSharedSnapshots(owner.db))owner.storedSnapshots.delete(key);
     try{
       const mirror=localStorage.getItem(owner.mirrorKey);
       if(mirror&&completed.some(row=>row.id===JSON.parse(mirror)?.id))
         localStorage.removeItem(owner.mirrorKey);
     }catch(error){console.warn("Could not clear a deleted completed attempt mirror",error);}
     if(owner.attempt&&completed.some(r=>r.id===owner.attempt!.id))owner.attempt=null;
     owner.notice("Deleted "+completed.length+" completed attempts. Other saved data was preserved.");
   }catch(error){
     owner.notice("No completed history was cleared: "+(error instanceof Error?error.message:"Storage failed"));
   }
 };

export const showWorkspaceStorageEstimate=async (owner:CoordinatorContext):Promise<void>=>{
   const node=owner.root.querySelector<HTMLElement>("#g-storage-quota");
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

export const requestWorkspacePersistentStorage=async (owner:CoordinatorContext):Promise<void>=>{
   const node=owner.root.querySelector<HTMLElement>("#g-storage-persist-status");
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

export const workspaceStorageHealth=(owner:CoordinatorContext):StorageHealth=>({pendingWrites:owner.pendingWrites,lastCommittedAt:owner.lastCommittedAt,
   lastFailure:owner.lastStorageFailure,locked:owner.storageFault||owner.fallbackConflict,
   loading:owner.loading,inMemoryRecords:owner.records.size});

export const updateWorkspaceStorageHealth=(owner:CoordinatorContext):void=>{
   const snapshot=owner.storageSnapshot();
   const status=owner.root.querySelector<HTMLElement>("#g-storage-health");
   if(status)status.textContent=healthSummary(snapshot);
   const saved=owner.root.querySelector<HTMLElement>("#g-storage-last-commit");
   if(saved)saved.textContent="Last completed write in this tab: "+
     (owner.lastCommittedAt===null?"none observed since opening":new Date(owner.lastCommittedAt).toLocaleString());
   const failed=owner.root.querySelector<HTMLElement>("#g-storage-last-failure");
   if(failed)failed.textContent="Last storage failure in this tab: "+
     (owner.lastStorageFailure??"none reported since opening");
   const count=owner.root.querySelector<HTMLElement>("#g-storage-records");
   if(count)count.textContent="Loaded in this tab: "+owner.records.size+
     " records (attempts, imported banks and learning cards). This is not a durable backup count.";
 };

export const reportWorkspaceStorageFailure=(owner:CoordinatorContext,error:unknown):void=>{
   owner.lastStorageFailure=String(error instanceof Error?error.message:error).slice(0,240);
   owner.updateStorageHealth();
 };

export function hydrateWorkspaceStorage(owner:CoordinatorContext):void{
(async()=>{
   try{
     owner.db=await new Promise<IDBDatabase>((resolve,reject)=>{
       const request=indexedDB.open(owner.dbName,1);
       request.onupgradeneeded=()=>{
         request.result.createObjectStore(ATTEMPTS_STORE,{keyPath:"id"});
         request.result.createObjectStore(SNAPSHOTS_STORE,{keyPath:"id"});
       };
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
       request.onblocked=()=>reject(new Error("Database blocked"));
     });
     const {all,snapshots}=await new Promise<{all:unknown[];snapshots:SharedSnapshot[]}>((resolve,reject)=>{
       const tx=owner.db!.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readonly");
       const rows=tx.objectStore(ATTEMPTS_STORE).getAll();
       const contents=tx.objectStore(SNAPSHOTS_STORE).getAll();
       tx.oncomplete=()=>resolve({all:rows.result as unknown[],snapshots:contents.result as SharedSnapshot[]});
       tx.onerror=()=>reject(tx.error);
     });
     for(const snap of snapshots)owner.storedSnapshots.set(snap.id,verifiedSnapshot(snap));
     for(const record of reconstructRecords(all,snapshots)){
       if(isPackage(record)){try{
         const valid=validateExamPackage(record.bundle);
         if(!owner.packages.has(valid.paper.id)){owner.packages.set(valid.paper.id,valid);owner.records.set(record.id,record);}
       }catch(error){console.warn("Invalid saved package",error);}}
       else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);owner.records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
     }
     try{
       const mirror=JSON.parse(localStorage.getItem(owner.mirrorKey)??"null") as unknown;
       if(isAttempt(mirror)){
         validateGenericStoredRecord(mirror);
         const existing=owner.records.get(mirror.id);
         const winner=chooseRecovered(isAttempt(existing)?existing:undefined,mirror);
         if(winner===mirror)void owner.save(mirror);
       }
     }catch(error){console.warn("Invalid emergency session mirror",error);}
   }catch(error){
     owner.recordStorageFailure(error);
     // A failed initial read must not leave an active IndexedDB handle
     // behind while displaying fallback localStorage data.
     console.warn("IndexedDB startup failed; switching to local fallback",error);
     try{owner.db?.close();}catch{}
     owner.db=null;
     owner.warning="IndexedDB unavailable. Limited localStorage fallback is in use.";
     try{
       const storedFallback=localStorage.getItem(owner.storageKey);
       owner.fallbackStamp=storedFallback;
       const recordsFromStorage=JSON.parse(storedFallback??"[]") as unknown[];
       for(const record of recordsFromStorage){
         if(isPackage(record)){try{owner.packages.set(record.bundle.paper.id,validateExamPackage(record.bundle));owner.records.set(record.id,record);}catch{}}
         else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);owner.records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
       }
     }catch{owner.warning="Browser storage is unavailable; attempts may not survive a reload.";}
   }
   // The selected exam may be an imported package, unavailable until the
   // asynchronous IndexedDB/fallback package inventory has finished loading.
   if(owner.storedSetups)owner.applyFamily(owner.storedSetups.selectedFamilyId);
   owner.loading=false;
   owner.routeHydrated=true;owner.hydrationDone();
   if(!owner.disposed){owner.draw();void owner.router.start().catch(error=>owner.notice(
     error instanceof Error?"Navigation startup failed: "+error.message:"Navigation startup failed"));}
 })();
}
