/** P48-2: atomic cursor reads of current shared-snapshot storage.
 * Immutable snapshots precede attempts within ONE IDB read transaction.
 * Never await between cursor continuations (IDB would auto-commit).
 *
 * Local startup uses quarantining recovery; authoritative backup export uses
 * a separate fail-closed collector. Both avoid temporary getAll() arrays,
 * but still retain the records required by History and user-visible exports.
 */
import {ATTEMPTS_STORE,SNAPSHOTS_STORE,createRecoverableRecordCollector,
  createStrictRecordCollector} from "../history/shared-store.ts";

type Collector<Result>={
 acceptSnapshot(value:unknown):void;
 acceptRow(value:unknown):void;
 result():Result;
};

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
/** Only for local startup; corrupted rows are counted and excluded. */
export function readRecoverableWorkspace(db:IDBDatabase){
 return readAtomicByCursor(db,createRecoverableRecordCollector());
}
/** Export must verify ALL persisted source snapshots and records, atomically.
 * Unlike local recovery, ANY integrity violation throws and aborts export. */
export function readVerifiedWorkspace(db:IDBDatabase){
 return readAtomicByCursor(db,createStrictRecordCollector());
}
