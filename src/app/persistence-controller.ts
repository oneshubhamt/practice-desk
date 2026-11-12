import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {
 validateGenericStoredRecord,isAttempt,isPackage,isLearning,type RecordItem
} from "./stored-record-validator.ts";
import {validateExamPackage} from "../domain/exam-package.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";
import {chooseRecovered} from "../history/frozen.ts";
import {serializeVerifiedBackup,verifyBackup,planBackupMerge} from "../history/backup.ts";
import {nextWriteVersion} from "../history/concurrency.ts";
import {assertDeletionAllowed,deletionWarning,type DeletionIntent} from "../history/deletion-policy.ts";
import {backupDownload,readBackupFile} from "../history/backup-file.ts";
import {reconstructRecords,SHARED_DB_NAME} from "../history/shared-store.ts";
import {
 createLocalFallbackWorkspaceStore,openIndexedDbWorkspaceStore,
 type WorkspaceRecovery
} from "../history/workspace-store.ts";
import {readDisplayPreferences,writeDisplayPreferences,SETTINGS_EVENT} from "./preferences.ts";
import type {PersistenceControllerContext} from "./coordinator-context.ts";
import {clearCandidateToolWorkspace} from "./candidate-tool-state.ts";
import {downloadBlob} from "./download-file.ts";

function acceptRecoveredRecords(owner:PersistenceControllerContext,recovered:WorkspaceRecovery):number{
 let rejected=recovered.rejectedRows+recovered.rejectedSnapshots;
 for(const record of recovered.records){
  try{
   const validRecord=validateGenericStoredRecord(record);
   if(isPackage(validRecord)){
    const validPackage=validateExamPackage(validRecord.bundle);
    if(!owner.packages.has(validPackage.paper.id)){
     owner.packages.set(validPackage.paper.id,validPackage);
     owner.records.set(validRecord.id,validRecord);
    }
   }else if(isAttempt(validRecord)||isLearning(validRecord)){
    owner.records.set(validRecord.id,validRecord);
   }else rejected++;
  }catch(error){
   rejected++;
   console.warn("Invalid saved Practice Desk record",error);
  }
 }
 return rejected;
}

function lockCorruptStorage(owner:PersistenceControllerContext,rejected:number):void{
 if(rejected<1)return;
 owner.storageFault=true;
 owner.recordStorageFailure(new Error(rejected+" corrupt or untrusted browser-storage entries"));
 owner.warning="STORAGE INTEGRITY WARNING: "+rejected+
   " damaged storage entr"+(rejected===1?"y was":"ies were")+
   " quarantined without changing the original stored bytes. Verifiable records remain readable, but editing is locked. "+
   "Export an UNSAVED_RECOVERY backup of the healthy records. That file excludes damaged entries; keep the "+
   "original browser data for diagnosis and do not clear it.";
}

export const downloadHistoryBackup=async (owner:PersistenceControllerContext):Promise<void>=>{
 await owner.writeQueue;
 try{
  let toExport:RecordItem[]=[...owner.records.values()];
  if(owner.storageBackend&&!owner.storageFault){
   try{
    const snapshot=await owner.storageBackend.loadVerified();
    toExport=snapshot.records.map(value=>validateGenericStoredRecord(value));
   }catch(error){
    owner.storageFault=true;
    owner.recordStorageFailure(error);
    console.warn("Cannot read authoritative backup snapshot; exporting working-memory recovery",error);
   }
  }
  if(!owner.storageBackend||owner.storageFault)
   toExport=toExport.map(value=>validateGenericStoredRecord(value));
  const serialized=serializeVerifiedBackup(
   toExport as unknown as readonly Record<string,unknown>[],
   readDisplayPreferences(),new Date().toISOString(),owner.setups
  );
  const exportFile=await backupDownload(serialized);
  downloadBlob(exportFile.blob,"Practice_Desk_Backup_"+new Date().toISOString().slice(0,10)+
   (owner.storageFault?"_UNSAVED_RECOVERY":"")+exportFile.extension);
  if(owner.storageFault){
   owner.warning="Emergency recovery file exported: only currently accessible, validated records are included. "+
    "Damaged or unreadable entries may be absent. Preserve the original browser profile and verify restoration "+
    "in a separate clean profile before any cleanup.";
   owner.draw();
  }
 }catch(error){
  owner.warning=error instanceof Error?"Backup failed: "+error.message:"Backup failed";
  owner.draw();
 }
};

export const importHistoryBackup=async (owner:PersistenceControllerContext,file:File)=>{
 if(owner.storageFault||owner.fallbackConflict)
  throw new Error("Storage is unavailable or changed in another tab. Reopen before importing.");
 if(!owner.storageBackend)throw new Error("Storage is not ready");
 const archive=verifyBackup(await readBackupFile(file));
 const imported=reconstructRecords(archive.records,archive.snapshots)
  .map(record=>validateGenericStoredRecord(record));
 const incoming=planBackupMerge([...owner.records.values()],imported,owner.attempt?.id);
 if(!confirm("Import "+incoming.length+
   " new saved records and restore available display/exam setup preferences? Existing records will not be overwritten."))return;
 await owner.writeQueue;
 if(incoming.length){
  await owner.storageBackend.insertMany(incoming);
  for(const record of incoming){
   owner.records.set(record.id,record);
   if(isPackage(record)&&!owner.packages.has(record.bundle.paper.id))
    owner.packages.set(record.bundle.paper.id,record.bundle);
  }
 }
 try{
  writeDisplayPreferences(archive.preferences);
  window.dispatchEvent(new Event(SETTINGS_EVENT));
  if(archive.setups){
   owner.setups=archive.setups;
   owner.applyFamily(owner.setups.selectedFamilyId);
   owner.saveSelection();
  }
  owner.warning="Imported "+incoming.length+" records; available display/exam setup preferences restored.";
 }catch{
  owner.warning="Imported "+incoming.length+" records. Display preferences could not be stored by this browser.";
 }
 owner.draw();
};

export const writeEmergencyMirror=(owner:PersistenceControllerContext,record:GenericAttempt)=>{
 try{localStorage.setItem(owner.mirrorKey,JSON.stringify(record));}
 catch{owner.warning="Emergency session mirror could not be saved. Use a history export.";}
};

export const saveWorkspaceRecord=(owner:PersistenceControllerContext,record:RecordItem):Promise<boolean>=>{
 if(owner.fallbackConflict||owner.storageFault){
  owner.warning="Storage is unavailable or changed in another tab. Export a recovery backup and reopen before editing.";
  owner.draw();
  return Promise.resolve(false);
 }
 const previous=owner.records.get(record.id);
 const expected=previous?previous.saveRevision:null;
 const versioned={...record,saveRevision:nextWriteVersion(expected)} as RecordItem;
 owner.records.set(record.id,versioned);
 if(isAttempt(versioned)){
  if(owner.attempt?.id===versioned.id)owner.attempt=versioned;
  owner.writeMirror(versioned);
 }
 owner.pendingWrites++;
 owner.updateStorageHealth();
 const pending=owner.writeQueue.then(async()=>{
  if(owner.storageFault)throw new Error("A previous storage operation failed");
  if(!owner.storageBackend)throw new Error("Storage is not ready");
  await owner.storageBackend.write(versioned,expected);
 });
 owner.writeQueue=pending.catch(()=>{});
 return pending.then(()=>{
  owner.lastCommittedAt=Date.now();
  return true;
 }).catch(async error=>{
  owner.recordStorageFailure(error);
  const conflict=error instanceof Error&&error.message.startsWith("Another tab");
  owner.storageFault=true;
  if(conflict){
   owner.warning=error.message+"; changes in this tab were not saved. Reopen before editing.";
   if(isAttempt(versioned)&&owner.attempt?.id===versioned.id){
    owner.attempt=null;
    owner.go({screen:"library"},"replace");
   }
   try{localStorage.removeItem(owner.mirrorKey);}catch{}
   owner.records.delete(versioned.id);
   try{
    if(owner.storageBackend?.kind==="fallback")owner.fallbackConflict=true;
    const latest=await owner.storageBackend?.readAuthoritative(versioned.id);
    if(latest)owner.records.set(versioned.id,validateGenericStoredRecord(latest));
   }catch(reloadError){console.warn("Could not reload changed record",reloadError);}
  }else{
   owner.warning="SAVE FAILED — changes in this tab are not safely stored. Export an UNSAVED recovery backup now, then reopen. "+
    (error instanceof Error?error.message:"");
  }
  console.warn("Exam workspace save",error);
  if(!owner.disposed)owner.draw();
  return false;
 }).finally(()=>{
  owner.pendingWrites--;
  owner.updateStorageHealth();
 });
};

export const removeWorkspaceAttempt=async (
 owner:PersistenceControllerContext,id:string,intent:DeletionIntent="completed"
):Promise<void>=>{
 const chosen=owner.records.get(id);
 if(owner.storageFault||owner.fallbackConflict){
  owner.notice("Storage locked. Export recovery backup and reopen before deleting.");return;
 }
 try{assertDeletionAllowed(chosen,intent);}
 catch(error){
  owner.notice(error instanceof Error?error.message:"Deletion action no longer matches this record");return;
 }
 const answers=isAttempt(chosen)?chosen.state.responses.filter(row=>row.response!==undefined).length:0;
 if(!confirm(deletionWarning(intent,answers)))return;
 if(intent==="discard-unfinished"&&!confirm(
  "Final confirmation: permanently discard this unfinished test, including "+
  answers+" saved answer"+(answers===1?"":"s")+
  "? This cannot be undone without a previously exported backup."))return;
 try{
  await owner.writeQueue;
  if(owner.storageFault||owner.fallbackConflict)throw Error("Storage changed while deleting; reopen first");
  if(!owner.storageBackend)throw Error("Storage is not ready");
  const current=owner.records.get(id);
  assertDeletionAllowed(current,intent);
  if(!current||current.saveRevision!==chosen?.saveRevision)
   throw Error("Record was updated while confirming deletion. Reopen and try again.");
  await owner.storageBackend.delete(id,current.saveRevision,intent);
  owner.records.delete(id);
  owner.calculatorStates.delete(id);
  clearCandidateToolWorkspace(localStorage,id);
  if(isAttempt(current))await owner.storageBackend.pruneSnapshots();
  try{
   const raw=localStorage.getItem(owner.mirrorKey);
   if(raw&&JSON.parse(raw)?.id===id)localStorage.removeItem(owner.mirrorKey);
  }catch(error){console.warn("Could not clear the discarded attempt mirror",error);}
  if(owner.attempt?.id===id){
   owner.attempt=null;
   owner.go({screen:"library"},"replace");
  }
  owner.warning=intent==="discard-unfinished"?"Unfinished test discarded. Other saved work was preserved.":
   intent==="completed"?"Completed result deleted.":"Learning card deleted.";
  owner.draw();
 }catch(error){
  owner.notice(error instanceof Error?error.message:"Deletion failed");
 }
};

export const deleteCompletedWorkspaceAttempts=async (owner:PersistenceControllerContext):Promise<void>=>{
 if(owner.storageFault||owner.fallbackConflict){
  owner.notice("Storage is locked. Export recovery data and reopen before deletion.");return;
 }
 const completed=[...owner.records.values()].filter((record):record is GenericAttempt=>
  isAttempt(record)&&record.finishedAt!==null);
 if(!completed.length)return;
 if(!confirm("Delete all "+completed.length+
   " completed attempts? Export a backup first. This cannot be undone."))return;
 if(!confirm("Confirm permanent deletion of completed test history. "+
   "In-progress attempts, imported papers and learning cards will remain."))return;
 try{
  await owner.writeQueue;
  if(owner.storageFault||owner.fallbackConflict)
   throw Error("Storage changed during deletion; reopen before editing.");
  if(!owner.storageBackend)throw Error("Storage is not ready");
  await owner.storageBackend.deleteCompleted(completed);
  for(const record of completed){
   owner.records.delete(record.id);
   owner.calculatorStates.delete(record.id);
   clearCandidateToolWorkspace(localStorage,record.id);
  }
  await owner.storageBackend.pruneSnapshots();
  try{
   const mirror=localStorage.getItem(owner.mirrorKey);
   if(mirror&&completed.some(row=>row.id===JSON.parse(mirror)?.id))
    localStorage.removeItem(owner.mirrorKey);
  }catch(error){console.warn("Could not clear a deleted completed attempt mirror",error);}
  if(owner.attempt&&completed.some(record=>record.id===owner.attempt!.id))owner.attempt=null;
  owner.notice("Deleted "+completed.length+" completed attempts. Other saved data was preserved.");
 }catch(error){
  owner.notice("No completed history was cleared: "+(error instanceof Error?error.message:"Storage failed"));
 }
};

export function hydrateWorkspaceStorage(owner:PersistenceControllerContext):void{
 void (async()=>{
  let recovered:WorkspaceRecovery|undefined;
  try{
   owner.storageBackend=await openIndexedDbWorkspaceStore(
    SHARED_DB_NAME,STORAGE_TOPOLOGY.historyDatabaseVersion
   );
   recovered=await owner.storageBackend.loadRecoverable();
  }catch(error){
   owner.recordStorageFailure(error);
   console.warn("IndexedDB startup failed; switching to local fallback",error);
   try{owner.storageBackend?.close();}catch{}
   owner.storageBackend=createLocalFallbackWorkspaceStore(localStorage,STORAGE_TOPOLOGY.historyFallback);
   owner.warning="IndexedDB unavailable. Limited localStorage fallback is in use.";
   try{
    recovered=await owner.storageBackend.loadRecoverable();
   }catch(fallbackError){
    owner.storageFault=true;
    owner.recordStorageFailure(fallbackError);
    owner.warning="Browser storage is unavailable or damaged. Existing bytes were left untouched; "+
     "attempts may not survive a reload. Export an UNSAVED_RECOVERY backup of any healthy in-memory work.";
   }
  }

  if(recovered){
   const rejected=acceptRecoveredRecords(owner,recovered);
   lockCorruptStorage(owner,rejected);
  }

  try{
   const mirror=JSON.parse(localStorage.getItem(owner.mirrorKey)??"null") as unknown;
   if(isAttempt(mirror)){
    validateGenericStoredRecord(mirror);
    const existing=owner.records.get(mirror.id);
    const winner=chooseRecovered(isAttempt(existing)?existing:undefined,mirror);
    if(winner===mirror){
     if(owner.storageFault)owner.records.set(mirror.id,mirror);
     else void owner.save(mirror);
    }
   }
  }catch(error){console.warn("Invalid emergency session mirror",error);}

  if(owner.storedSetups)owner.applyFamily(owner.storedSetups.selectedFamilyId);
  owner.loading=false;
  owner.routeHydrated=true;
  owner.hydrationDone();
  if(!owner.disposed){
   owner.draw();
   void owner.router.start().catch(error=>owner.notice(
    error instanceof Error?"Navigation startup failed: "+error.message:"Navigation startup failed"
   ));
  }
 })();
}
