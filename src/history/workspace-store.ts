import {assertWriteVersion,type VersionedRecord} from "./concurrency.ts";
import {assertDeletionAllowed,type DeletionIntent} from "./deletion-policy.ts";
import {
 ATTEMPTS_STORE,SNAPSHOTS_STORE,compactAttempt,expandAttempt,isSharedAttempt,
 createRecoverableRecordCollector,createStrictRecordCollector,pruneSharedSnapshots,
 verifiedSnapshot,type SharedSnapshot
} from "./shared-store.ts";
import type {GenericAttempt} from "../engine/generic-attempt.ts";

export type WorkspaceStoreKind="indexeddb"|"fallback";

export interface WorkspaceStoredRecord extends VersionedRecord {
 readonly id:string;
 readonly recordType:string;
}

export interface WorkspaceRecovery {
 readonly records:readonly unknown[];
 readonly snapshots:readonly SharedSnapshot[];
 readonly rejectedRows:number;
 readonly rejectedSnapshots:number;
}

export interface WorkspaceVerifiedSnapshot {
 readonly records:readonly unknown[];
 readonly snapshots:readonly SharedSnapshot[];
}

export interface WorkspaceStore {
 readonly kind:WorkspaceStoreKind;
 loadRecoverable():Promise<WorkspaceRecovery>;
 loadVerified():Promise<WorkspaceVerifiedSnapshot>;
 write(record:WorkspaceStoredRecord,expectedRevision:number|null):Promise<void>;
 insertMany(records:readonly WorkspaceStoredRecord[]):Promise<void>;
 delete(id:string,expectedRevision:number,intent:DeletionIntent):Promise<void>;
 deleteCompleted(records:readonly {readonly id:string;readonly saveRevision:number}[]):Promise<void>;
 readAuthoritative(id:string):Promise<unknown>;
 pruneSnapshots():Promise<void>;
 externalStorageChanged(event:StorageEvent):boolean;
 close():void;
}

type Collector<Result>={
 acceptSnapshot(value:unknown):void;
 acceptRow(value:unknown):void;
 result():Result;
};

const isFullAttempt=(record:WorkspaceStoredRecord):record is GenericAttempt=>
 record.recordType==="generic-attempt"&&"frozen" in record;

function readAtomicByCursor<Result>(db:IDBDatabase,collector:Collector<Result>):Promise<Result>{
 return new Promise((resolve,reject)=>{
  let settled=false;
  const fail=(error:unknown)=>{
   if(settled)return;
   settled=true;
   reject(error instanceof Error?error:new Error("IndexedDB cursor read failed"));
  };
  let tx:IDBTransaction;
  try{tx=db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readonly");}
  catch(error){fail(error);return;}
  tx.oncomplete=()=>{if(!settled){settled=true;resolve(collector.result());}};
  tx.onerror=()=>fail(tx.error??new Error("IndexedDB cursor read failed"));
  tx.onabort=()=>fail(tx.error??new Error("IndexedDB cursor read aborted"));
  const scanRows=()=>{
   const request=tx.objectStore(ATTEMPTS_STORE).openCursor();
   request.onerror=()=>fail(request.error??new Error("IndexedDB row cursor failed"));
   request.onsuccess=()=>{
    try{
     const item=request.result;
     if(!item)return;
     collector.acceptRow(item.value);
     item.continue();
    }catch(error){fail(error);try{tx.abort();}catch{}}
   };
  };
  const request=tx.objectStore(SNAPSHOTS_STORE).openCursor();
  request.onerror=()=>fail(request.error??new Error("IndexedDB snapshot cursor failed"));
  request.onsuccess=()=>{
   try{
    const item=request.result;
    if(!item){scanRows();return;}
    collector.acceptSnapshot(item.value);
    item.continue();
   }catch(error){fail(error);try{tx.abort();}catch{}}
  };
 });
}

class IndexedDbWorkspaceStore implements WorkspaceStore {
 readonly kind="indexeddb" as const;
 private readonly db:IDBDatabase;
 constructor(db:IDBDatabase){this.db=db;}

 loadRecoverable():Promise<WorkspaceRecovery>{
  return readAtomicByCursor(this.db,createRecoverableRecordCollector());
 }

 loadVerified():Promise<WorkspaceVerifiedSnapshot>{
  return readAtomicByCursor(this.db,createStrictRecordCollector());
 }

 write(record:WorkspaceStoredRecord,expectedRevision:number|null):Promise<void>{
  return new Promise((resolve,reject)=>{
   let tx:IDBTransaction;
   try{tx=this.db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");}
   catch(error){reject(error);return;}
   const store=tx.objectStore(ATTEMPTS_STORE);
   const snapshots=tx.objectStore(SNAPSHOTS_STORE);
   const packed=isFullAttempt(record)?compactAttempt(record):null;
   let conflict:Error|null=null;
   const read=store.get(record.id);
   read.onsuccess=()=>{
    try{
     assertWriteVersion(read.result as WorkspaceStoredRecord|undefined,expectedRevision);
     if(!packed){store.put(record);return;}
     const existing=snapshots.get(packed.snapshot.id);
     existing.onsuccess=()=>{
      try{
       if(existing.result)verifiedSnapshot(existing.result as SharedSnapshot);
       else snapshots.add(packed.snapshot);
       store.put(packed.row);
      }catch(error){conflict=error instanceof Error?error:new Error("Invalid stored snapshot");tx.abort();}
     };
   }catch(error){conflict=error instanceof Error?error:new Error("Concurrent write failed");tx.abort();}
   };
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(conflict??tx.error??new Error("Write failed"));
   tx.onabort=()=>reject(conflict??tx.error??new Error("Write aborted"));
  });
 }

 insertMany(records:readonly WorkspaceStoredRecord[]):Promise<void>{
  if(!records.length)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   let tx:IDBTransaction;
   try{tx=this.db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");}
   catch(error){reject(error);return;}
   const store=tx.objectStore(ATTEMPTS_STORE);
   const snapshots=tx.objectStore(SNAPSHOTS_STORE);
   let conflict:Error|null=null;
   const uniqueSnapshots=new Map<string,SharedSnapshot>();
   for(const record of records){
    if(!isFullAttempt(record)){store.add(record);continue;}
    const packed=compactAttempt(record);
    uniqueSnapshots.set(packed.snapshot.id,packed.snapshot);
    store.add(packed.row);
   }
   for(const snapshot of uniqueSnapshots.values()){
    const existing=snapshots.get(snapshot.id);
    existing.onsuccess=()=>{
     try{
      if(existing.result)verifiedSnapshot(existing.result as SharedSnapshot);
      else snapshots.add(snapshot);
     }catch(error){conflict=error instanceof Error?error:new Error("Invalid stored snapshot");tx.abort();}
    };
   }
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(conflict??tx.error??new Error("Import failed"));
   tx.onabort=()=>reject(conflict??tx.error??new Error("Import aborted"));
  });
 }

 delete(id:string,expectedRevision:number,intent:DeletionIntent):Promise<void>{
  return new Promise((resolve,reject)=>{
   let tx:IDBTransaction;
   try{tx=this.db.transaction(ATTEMPTS_STORE,"readwrite");}
   catch(error){reject(error);return;}
   const store=tx.objectStore(ATTEMPTS_STORE);
   let conflict:Error|null=null;
   const request=store.get(id);
   request.onsuccess=()=>{
    try{
     const current=request.result as WorkspaceStoredRecord|undefined;
     assertWriteVersion(current,expectedRevision);
     assertDeletionAllowed(current,intent);
     store.delete(id);
    }catch(error){conflict=error instanceof Error?error:new Error("Deletion conflict");tx.abort();}
   };
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(conflict??tx.error??new Error("Deletion failed"));
   tx.onabort=()=>reject(conflict??tx.error??new Error("Deletion aborted"));
  });
 }

 deleteCompleted(records:readonly {readonly id:string;readonly saveRevision:number}[]):Promise<void>{
  if(!records.length)return Promise.resolve();
  return new Promise((resolve,reject)=>{
   let tx:IDBTransaction;
   try{tx=this.db.transaction(ATTEMPTS_STORE,"readwrite");}
   catch(error){reject(error);return;}
   const store=tx.objectStore(ATTEMPTS_STORE);
   let conflict:Error|null=null;
   for(const expected of records){
    const request=store.get(expected.id);
    request.onsuccess=()=>{
     try{
      const current=request.result as WorkspaceStoredRecord|undefined;
      assertWriteVersion(current,expected.saveRevision);
      if(!isSharedAttempt(current)||current.finishedAt===null)
       throw new Error("Completed status changed in another tab; deletion cancelled");
      store.delete(expected.id);
     }catch(error){conflict=error instanceof Error?error:new Error("Bulk deletion conflict");tx.abort();}
    };
   }
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(conflict??tx.error??new Error("Bulk deletion failed"));
   tx.onabort=()=>reject(conflict??tx.error??new Error("Bulk deletion aborted"));
  });
 }

 readAuthoritative(id:string):Promise<unknown>{
  return new Promise((resolve,reject)=>{
   let value:unknown;
   let tx:IDBTransaction;
   try{tx=this.db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readonly");}
   catch(error){reject(error);return;}
   const rows=tx.objectStore(ATTEMPTS_STORE);
   const snapshots=tx.objectStore(SNAPSHOTS_STORE);
   const request=rows.get(id);
   request.onsuccess=()=>{
    try{
     const row=request.result as unknown;
     if(!isSharedAttempt(row)){value=row;return;}
     const snapshotRequest=snapshots.get(row.frozenRef);
     snapshotRequest.onsuccess=()=>{
      try{
       if(!snapshotRequest.result)throw new Error("Stored attempt references a missing immutable snapshot");
       value=expandAttempt(row,verifiedSnapshot(snapshotRequest.result as SharedSnapshot));
      }catch(error){try{tx.abort();}catch{};reject(error);}
     };
    }catch(error){try{tx.abort();}catch{};reject(error);}
   };
   request.onerror=()=>reject(request.error??new Error("Authoritative read failed"));
   tx.oncomplete=()=>resolve(value);
   tx.onerror=()=>reject(tx.error??new Error("Authoritative read failed"));
   tx.onabort=()=>reject(tx.error??new Error("Authoritative read aborted"));
  });
 }

 async pruneSnapshots():Promise<void>{await pruneSharedSnapshots(this.db);}
 externalStorageChanged(_event:StorageEvent):boolean{return false;}
 close():void{this.db.close();}
}

class LocalFallbackWorkspaceStore implements WorkspaceStore {
 readonly kind="fallback" as const;
 private stamp:string|null=null;
 private readonly rows=new Map<string,WorkspaceStoredRecord>();
 private readonly storage:Storage;
 private readonly key:string;

 constructor(storage:Storage,key:string){this.storage=storage;this.key=key;}

 private parse(raw:string|null):unknown[]{
  const parsed=JSON.parse(raw??"[]") as unknown;
  if(!Array.isArray(parsed))throw new Error("Invalid fallback history");
  return parsed;
 }

 private capture(raw:string|null,records:readonly unknown[]):void{
  this.stamp=raw;
  this.rows.clear();
  for(const record of records){
   if(record&&typeof record==="object"&&typeof (record as {id?:unknown}).id==="string")
    this.rows.set((record as {id:string}).id,record as WorkspaceStoredRecord);
  }
 }

 private assertCurrent():void{
  if(this.storage.getItem(this.key)!==this.stamp)
   throw new Error("Another tab changed fallback history; reopen before editing");
 }

 private commit(next:Map<string,WorkspaceStoredRecord>):void{
  const encoded=JSON.stringify([...next.values()]);
  this.storage.setItem(this.key,encoded);
  this.stamp=encoded;
  this.rows.clear();
  for(const [id,record] of next)this.rows.set(id,record);
 }

 async loadRecoverable():Promise<WorkspaceRecovery>{
  const raw=this.storage.getItem(this.key);
  const records=this.parse(raw);
  const counts=new Map<string,number>();
  for(const record of records){
   if(record&&typeof record==="object"&&typeof (record as {id?:unknown}).id==="string"){
    const id=(record as {id:string}).id;
    counts.set(id,(counts.get(id)??0)+1);
   }
  }
  let rejectedRows=0;
  const accepted=records.filter(record=>{
   if(!record||typeof record!=="object"||typeof (record as {id?:unknown}).id!=="string")return true;
   const duplicate=(counts.get((record as {id:string}).id)??0)>1;
   if(duplicate)rejectedRows++;
   return !duplicate;
  });
  this.capture(raw,accepted);
  return {records:accepted,snapshots:[],rejectedRows,rejectedSnapshots:0};
 }

 async loadVerified():Promise<WorkspaceVerifiedSnapshot>{
  const records=this.parse(this.storage.getItem(this.key));
  const seen=new Set<string>();
  for(const record of records){
   if(!record||typeof record!=="object"||typeof (record as {id?:unknown}).id!=="string")continue;
   const id=(record as {id:string}).id;
   if(seen.has(id))throw new Error("Duplicate fallback record identity");
   seen.add(id);
  }
  return {records,snapshots:[]};
 }

 async write(record:WorkspaceStoredRecord,expectedRevision:number|null):Promise<void>{
  this.assertCurrent();
  assertWriteVersion(this.rows.get(record.id),expectedRevision);
  const next=new Map(this.rows);
  next.set(record.id,record);
  this.commit(next);
 }

 async insertMany(records:readonly WorkspaceStoredRecord[]):Promise<void>{
  if(!records.length)return;
  this.assertCurrent();
  const next=new Map(this.rows);
  for(const record of records){
   if(next.has(record.id))throw new Error("Another tab already created this record");
   next.set(record.id,record);
  }
  this.commit(next);
 }

 async delete(id:string,expectedRevision:number,intent:DeletionIntent):Promise<void>{
  this.assertCurrent();
  const current=this.rows.get(id);
  assertWriteVersion(current,expectedRevision);
  assertDeletionAllowed(current,intent);
  const next=new Map(this.rows);
  next.delete(id);
  this.commit(next);
 }

 async deleteCompleted(records:readonly {readonly id:string;readonly saveRevision:number}[]):Promise<void>{
  if(!records.length)return;
  this.assertCurrent();
  for(const expected of records){
   const current=this.rows.get(expected.id);
   assertWriteVersion(current,expected.saveRevision);
   assertDeletionAllowed(current,"completed");
  }
  const next=new Map(this.rows);
  for(const expected of records)next.delete(expected.id);
  this.commit(next);
 }

 async readAuthoritative(id:string):Promise<unknown>{
  return this.parse(this.storage.getItem(this.key)).find(record=>
   record&&typeof record==="object"&&(record as {id?:unknown}).id===id);
 }

 async pruneSnapshots():Promise<void>{}
 externalStorageChanged(event:StorageEvent):boolean{
  return event.key===this.key&&event.newValue!==this.stamp;
 }
 close():void{}
}

export async function openIndexedDbWorkspaceStore(
 dbName:string,databaseVersion:number
):Promise<WorkspaceStore>{
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(dbName,databaseVersion);
  request.onupgradeneeded=()=>{
   request.result.createObjectStore(ATTEMPTS_STORE,{keyPath:"id"});
   request.result.createObjectStore(SNAPSHOTS_STORE,{keyPath:"id"});
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
  request.onblocked=()=>reject(new Error("Database blocked"));
 });
 return new IndexedDbWorkspaceStore(db);
}

export function createLocalFallbackWorkspaceStore(storage:Storage,key:string):WorkspaceStore{
 return new LocalFallbackWorkspaceStore(storage,key);
}
