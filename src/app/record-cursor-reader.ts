/** P48-2 atomic, cursor-based cold hydration.
 * Read immutable snapshots first and then saved rows in ONE IDB transaction.
 * This avoids the extra two getAll() arrays and immediate structured clones
 * of every stored object, while still materializing the valid History records
 * the application actually requires. It is not pagination.
 *
 * Individual damaged entries are quarantined only by the local collector;
 * do not use this relaxed reader for portable backup verification.
 */
import {ATTEMPTS_STORE,SNAPSHOTS_STORE,createRecoverableRecordCollector} from "../history/shared-store.ts";

export function readRecoverableWorkspace(db:IDBDatabase):
 ReturnType<ReturnType<typeof createRecoverableRecordCollector>["result"]> extends infer R ? Promise<R> : never {
 const collector=createRecoverableRecordCollector();
 return new Promise((resolve,reject)=>{
   let settled=false;
   const fail=(error:unknown)=>{
     if(settled)return;
     settled=true;
     reject(error instanceof Error?error:new Error("IndexedDB cold read failed"));
   };
   let tx:IDBTransaction;
   try{tx=db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readonly");}
   catch(error){fail(error);return;}
   tx.oncomplete=()=>{if(!settled){settled=true;resolve(collector.result());}};
   tx.onerror=()=>fail(tx.error??new Error("IndexedDB cold read failed"));
   tx.onabort=()=>fail(tx.error??new Error("IndexedDB cold read aborted"));
   // All requests must be queued from active cursor success handlers. Awaiting
   // a Promise between requests would allow the transaction to auto-commit.
   const scanRows=()=>{
     const rows=tx.objectStore(ATTEMPTS_STORE).openCursor();
     rows.onerror=()=>fail(rows.error??new Error("Attempt cursor failed"));
     rows.onsuccess=()=>{
       try{
         const current=rows.result;
         if(!current)return;
         collector.acceptRow(current.value);
         current.continue();
       }catch(error){fail(error);try{tx.abort();}catch{}}
     };
   };
   const snapshots=tx.objectStore(SNAPSHOTS_STORE).openCursor();
   snapshots.onerror=()=>fail(snapshots.error??new Error("Snapshot cursor failed"));
   snapshots.onsuccess=()=>{
     try{
       const current=snapshots.result;
       if(!current){scanRows();return;}
       collector.acceptSnapshot(current.value);
       current.continue();
     }catch(error){fail(error);try{tx.abort();}catch{}}
   };
 });
}
