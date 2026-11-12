import {healthSummary,type StorageHealth} from "./storage-health.ts";
import type {StorageHealthControllerContext} from "./coordinator-context.ts";

export const showWorkspaceStorageEstimate=async (owner:StorageHealthControllerContext):Promise<void>=>{
 const node=owner.root.querySelector<HTMLElement>("#g-storage-quota");
 if(!node)return;
 try{
  if(!navigator.storage?.estimate){
   node.textContent="Storage estimate unavailable in this browser or file context.";return;
  }
  const estimate=await navigator.storage.estimate();
  if(!node.isConnected)return;
  const miB=(n:number)=>(n/1048576).toFixed(1)+" MiB";
  node.textContent="Browser storage: "+(typeof estimate.usage==="number"?miB(estimate.usage):"unknown usage")+
   (typeof estimate.quota==="number"?" of approximately "+miB(estimate.quota):" (quota unknown)")+
   ". This is browser-wide, not just Practice Desk.";
 }catch{
  if(node.isConnected)node.textContent="Storage estimate unavailable in this browser or file context.";
 }
};

export const requestWorkspacePersistentStorage=async (owner:StorageHealthControllerContext):Promise<void>=>{
 const node=owner.root.querySelector<HTMLElement>("#g-storage-persist-status");
 if(!node)return;
 try{
  if(!navigator.storage?.persist){
   node.textContent="Persistent storage requests are unavailable here. Keep exported backups.";return;
  }
  const granted=await navigator.storage.persist();
  if(node.isConnected)node.textContent=granted?
   "Browser granted persistent storage. Still export backups.":
   "Persistent storage was not granted. Keep exported backups.";
 }catch{
  if(node.isConnected)node.textContent="Browser could not request persistent storage. Keep exported backups.";
 }
};

export const workspaceStorageHealth=(owner:StorageHealthControllerContext):StorageHealth=>({
 pendingWrites:owner.pendingWrites,
 lastCommittedAt:owner.lastCommittedAt,
 lastFailure:owner.lastStorageFailure,
 locked:owner.storageFault||owner.fallbackConflict,
 loading:owner.loading,
 inMemoryRecords:owner.records.size
});

export const updateWorkspaceStorageHealth=(owner:StorageHealthControllerContext):void=>{
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

export const reportWorkspaceStorageFailure=(owner:StorageHealthControllerContext,error:unknown):void=>{
 owner.lastStorageFailure=String(error instanceof Error?error.message:error).slice(0,240);
 owner.updateStorageHealth();
};
