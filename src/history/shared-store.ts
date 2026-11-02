import type {GenericAttempt} from "../app/exam-package.ts";
import type {FrozenAttemptContent} from "./frozen.ts";
import {hashJson} from "../domain/hash.ts";
import {assertFrozenContent} from "./frozen.ts";

/** Clean storage contract. Immutable content lives once per unique SHA-256 hash.
 * The per-attempt row never contains the question/key/media graph.
 * No legacy reader, migration or version bridge. */
export const SHARED_DB_NAME="practiceDesk.shared.v1";
export const ATTEMPTS_STORE="attempts";
export const SNAPSHOTS_STORE="snapshots";

export interface SharedSnapshot {
 readonly id:string;
 readonly body:Omit<FrozenAttemptContent,"frozenAt">;
}
export interface SlimAttempt extends Omit<GenericAttempt,"frozen"> {
 readonly frozenRef:string;
 readonly frozenAt:string;
}
type StoredRecord=SlimAttempt|{readonly id:string;readonly recordType:string;
 readonly saveRevision?:number;readonly [key:string]:unknown};

const bodyCache=new WeakMap<FrozenAttemptContent,SharedSnapshot>();
// Only complete, content-verified snapshots reconstructed in this process
// are trusted for repeated attempts. Every attempt's state/marks is still
// independently validated by the app's runtime validator.
const verifiedReconstructed=new WeakSet<FrozenAttemptContent>();
export function isVerifiedSharedFrozen(frozen:FrozenAttemptContent):boolean{
 return verifiedReconstructed.has(frozen)&&Number.isFinite(Date.parse(frozen.frozenAt));
}
export function sharedSnapshot(frozen:FrozenAttemptContent):SharedSnapshot {
 const cached=bodyCache.get(frozen);
 if(cached)return cached;
 const {frozenAt:_,...body}=frozen;
 const id="snapshot:"+hashJson(body);
 const value={id,body};
 bodyCache.set(frozen,value);
 return value;
}
export function isSharedAttempt(value:unknown):value is SlimAttempt {
 return Boolean(value)&&typeof value==="object"&&
   (value as {recordType?:unknown}).recordType==="generic-attempt";
}
export function compactAttempt(attempt:GenericAttempt):{
 readonly row:SlimAttempt;readonly snapshot:SharedSnapshot;
}{
 const snapshot=sharedSnapshot(attempt.frozen);
 const {frozen,...other}=attempt;
 return {row:{...other,frozenRef:snapshot.id,frozenAt:frozen.frozenAt},snapshot};
}
export function expandAttempt(row:SlimAttempt,snapshot:SharedSnapshot):GenericAttempt{
 if(!row||!snapshot||row.frozenRef!==snapshot.id)
   throw Error("Shared exam snapshot not found for attempt");
 if(!Number.isFinite(Date.parse(row.frozenAt)))
   throw Error("Invalid frozen timestamp");
 const {frozenRef:_,frozenAt,...other}=row;
 return {...other,frozen:{...snapshot.body,frozenAt}};
}
/** Validate each immutable body once, then reuse its objects across many
 * attempts. The scored state of EVERY attempt is validated independently. */
export function verifiedSnapshot(row:SharedSnapshot):SharedSnapshot{
 if(!row||typeof row.id!=="string"||!row.id.startsWith("snapshot:")||
    row.id!=="snapshot:"+hashJson(row.body))
   throw Error("Shared snapshot SHA-256 mismatch");
 assertFrozenContent({...row.body,frozenAt:"2026-01-01T00:00:00.000Z"});
 return row;
}
export function reconstructRecords(rows:readonly unknown[],
 snapshots:readonly unknown[]):unknown[]{
 const byId=new Map<string,SharedSnapshot>();
 for(const unknownRow of snapshots){
   const snapshot=verifiedSnapshot(unknownRow as SharedSnapshot);
   if(byId.has(snapshot.id))throw Error("Duplicate snapshot digest");
   byId.set(snapshot.id,snapshot);
 }
 return rows.map(row=>{
   if(!isSharedAttempt(row))return row;
   const snapshot=byId.get(row.frozenRef);
   if(!snapshot)throw Error("Stored attempt references a missing immutable snapshot");
   const expanded=expandAttempt(row,snapshot);
   verifiedReconstructed.add(expanded.frozen);
   return expanded;
 });
}

/** Reclaim content no longer referenced by any saved attempt.
 * Uses one serializable IDB transaction: another tab's attempt write will
 * re-add a missing digest atomically before committing that attempt. */
export async function pruneSharedSnapshots(db:IDBDatabase):Promise<readonly string[]>{
 const removed:string[]=[];
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
  const rows=tx.objectStore(ATTEMPTS_STORE).getAll();
  rows.onsuccess=()=>{
   const referenced=new Set((rows.result as unknown[]).filter(isSharedAttempt)
     .map(row=>row.frozenRef));
   const cursor=tx.objectStore(SNAPSHOTS_STORE).openCursor();
   cursor.onsuccess=()=>{
    const current=cursor.result;
    if(!current)return;
    if(typeof current.key==="string"&&!referenced.has(current.key)){
     removed.push(current.key);current.delete();
    }
    current.continue();
   };
  };
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error??Error("Snapshot cleanup failed"));
  tx.onabort=()=>reject(tx.error??Error("Snapshot cleanup aborted"));
 });
 return removed;
}
