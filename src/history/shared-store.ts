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

type SharedBody=Omit<FrozenAttemptContent,"frozenAt"> &
 Pick<GenericAttempt,"sourceKeyReference"|"sourceReviewReference"|"explanations">;
export interface SharedSnapshot {
 readonly id:string;
 readonly body:SharedBody;
}
export interface SlimAttempt extends Omit<GenericAttempt,
 "frozen"|"sourceKeyReference"|"sourceReviewReference"|"explanations"> {
 readonly frozenRef:string;
 readonly frozenAt:string;
}
type StoredRecord=SlimAttempt|{readonly id:string;readonly recordType:string;
 readonly saveRevision:number;readonly [key:string]:unknown};

function assertDurableRow(row:unknown):asserts row is StoredRecord{
 if(!row||typeof row!=="object"||
    !Number.isSafeInteger((row as {saveRevision?:unknown}).saveRevision)||
    ((row as {saveRevision:number}).saveRevision)<1)
   throw Error("Stored row requires CAS revision 1 or greater");
}

const bodyCache=new WeakMap<FrozenAttemptContent,SharedSnapshot>();
// Only complete, content-verified snapshots reconstructed in this process
// are trusted for repeated attempts. Every attempt's state/marks is still
// independently validated by the app's runtime validator.
const verifiedReconstructed=new WeakSet<FrozenAttemptContent>();
export function isVerifiedSharedFrozen(frozen:FrozenAttemptContent):boolean{
 return verifiedReconstructed.has(frozen)&&Number.isFinite(Date.parse(frozen.frozenAt));
}
export function sharedSnapshot(attempt:GenericAttempt):SharedSnapshot {
 const frozen=attempt.frozen;
 const cached=bodyCache.get(frozen);
 if(cached&&cached.body.sourceKeyReference===attempt.sourceKeyReference&&
    cached.body.sourceReviewReference===attempt.sourceReviewReference&&
    cached.body.explanations===attempt.explanations)return cached;
 const {frozenAt:_,...frozenBody}=frozen;
 // The publisher/source reference and explanation maps are also immutable
 // question-specific material, commonly identical across hundreds of attempts.
 const body:SharedBody={...frozenBody,
   ...(attempt.sourceKeyReference?{sourceKeyReference:attempt.sourceKeyReference}:{}),
   ...(attempt.sourceReviewReference?{sourceReviewReference:attempt.sourceReviewReference}:{}),
   ...(attempt.explanations?{explanations:attempt.explanations}:{})};
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
 const snapshot=sharedSnapshot(attempt);
 const {frozen,sourceKeyReference:_,sourceReviewReference:__,explanations:___,...other}=attempt;
 return {row:{...other,frozenRef:snapshot.id,frozenAt:frozen.frozenAt},snapshot};
}
export function expandAttempt(row:SlimAttempt,snapshot:SharedSnapshot):GenericAttempt{
 if(!row||!snapshot||row.frozenRef!==snapshot.id)
   throw Error("Shared exam snapshot not found for attempt");
 // Immutable content must come only from its content-addressed snapshot.
 // An untrusted compact row cannot carry overriding source/key/explanations.
 if(["frozen","sourceKeyReference","sourceReviewReference","explanations"].some(key=>
   Object.prototype.hasOwnProperty.call(row,key)))
   throw Error("Compact attempt contains forbidden immutable source fields");
 if(!Number.isFinite(Date.parse(row.frozenAt)))
   throw Error("Invalid frozen timestamp");
 const {frozenRef:_,frozenAt,...other}=row;
 const {sourceKeyReference,sourceReviewReference,explanations,...frozenBody}=snapshot.body;
 return {...other,
   ...(sourceKeyReference?{sourceKeyReference}:{}),
   ...(sourceReviewReference?{sourceReviewReference}:{}),
   ...(explanations?{explanations}:{}),
   frozen:{...frozenBody,frozenAt}};
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
/** Fail-closed stream consumer for authoritative backup export/import.
 * Unlike local recovery, no corrupt, missing or duplicate immutable digest
 * is quarantined: the operation aborts before producing a portable archive.
 */
export function createStrictRecordCollector(){
 const byId=new Map<string,SharedSnapshot>();
 const records:unknown[]=[];
 return {
  acceptSnapshot(unknownRow:unknown):void{
   const snapshot=verifiedSnapshot(unknownRow as SharedSnapshot);
   if(byId.has(snapshot.id))throw Error("Duplicate snapshot digest");
   byId.set(snapshot.id,snapshot);
  },
  acceptRow(row:unknown):void{
   assertDurableRow(row);
   if(!isSharedAttempt(row)){records.push(row);return;}
   const snapshot=byId.get(row.frozenRef);
   if(!snapshot)throw Error("Stored attempt references a missing immutable snapshot");
   const expanded=expandAttempt(row,snapshot);
   verifiedReconstructed.add(expanded.frozen);
   bodyCache.set(expanded.frozen,snapshot);
   records.push(expanded);
  },
  result():{readonly records:readonly unknown[];readonly snapshots:readonly SharedSnapshot[]}{
   return {records,snapshots:[...byId.values()]};
  }
 };
}
/** Portable backup verification is strict. It must not silently discard
 * damaged records under the same policy used for local emergency recovery. */
export function reconstructRecords(rows:readonly unknown[],
 snapshots:readonly unknown[]):unknown[]{
 const collector=createStrictRecordCollector();
 for(const snapshot of snapshots)collector.acceptSnapshot(snapshot);
 for(const row of rows)collector.acceptRow(row);
 return [...collector.result().records];
}

/** Recover one damaged local row at a time while preserving all independent
 * valid records. The accumulator accepts cursor values directly, avoiding an
 * additional getAll() clone of every full stored row/snapshot at startup.
 * Portable backup verification must keep using strict reconstructRecords().
 */
export function createRecoverableRecordCollector(){
 const byId=new Map<string,SharedSnapshot>();
 const records:unknown[]=[];
 let rejectedSnapshots=0,rejectedRows=0;
 return {
  acceptSnapshot(unknownRow:unknown):void{
   try{
    const snapshot=verifiedSnapshot(unknownRow as SharedSnapshot);
    if(byId.has(snapshot.id))throw Error("Duplicate immutable snapshot");
    byId.set(snapshot.id,snapshot);
   }catch{rejectedSnapshots++;}
  },
  acceptRow(row:unknown):void{
   try{
    assertDurableRow(row);
    if(!isSharedAttempt(row)){records.push(row);return;}
    const snapshot=byId.get(row.frozenRef);
    if(!snapshot)throw Error("Missing or unverified immutable snapshot");
    const expanded=expandAttempt(row,snapshot);
    verifiedReconstructed.add(expanded.frozen);
    bodyCache.set(expanded.frozen,snapshot);
    records.push(expanded);
   }catch{rejectedRows++;}
  },
  result():{
   readonly records:readonly unknown[];readonly snapshots:readonly SharedSnapshot[];
   readonly rejectedRows:number;readonly rejectedSnapshots:number
  }{
   return {records,snapshots:[...byId.values()],rejectedRows,rejectedSnapshots};
  }
 };
}
/** Local recovery quarantines individual corrupted entries but leaves the
 * original IndexedDB bytes untouched and locks writes. Backup import remains
 * strict/fail-closed and does not use this helper.
 */
export function reconstructRecoverableRecords(
 rows:readonly unknown[],snapshots:readonly unknown[]
):ReturnType<ReturnType<typeof createRecoverableRecordCollector>["result"]>{
 const collector=createRecoverableRecordCollector();
 for(const snapshot of snapshots)collector.acceptSnapshot(snapshot);
 for(const row of rows)collector.acceptRow(row);
 return collector.result();
}

/** Reclaim content no longer referenced by any saved attempt.
 * Uses one serializable IDB transaction: another tab's attempt write will
 * re-add a missing digest atomically before committing that attempt. */
export async function pruneSharedSnapshots(db:IDBDatabase):Promise<readonly string[]>{
 const removed:string[]=[];
 await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction([ATTEMPTS_STORE,SNAPSHOTS_STORE],"readwrite");
  const referenced=new Set<string>();
  // Scan compact rows without cloning the full History array. The cleanup
  // stays one serializable readwrite transaction: every competing tab's
  // attempt/snapshot write is ordered before or after this transaction.
  const rows=tx.objectStore(ATTEMPTS_STORE).openCursor();
  rows.onsuccess=()=>{
   const current=rows.result;
   if(current){
    if(isSharedAttempt(current.value)&&typeof current.value.frozenRef==="string")
      referenced.add(current.value.frozenRef);
    current.continue();
    return;
   }
   const cursor=tx.objectStore(SNAPSHOTS_STORE).openCursor();
   cursor.onsuccess=()=>{
    const existing=cursor.result;
    if(!existing)return;
    if(typeof existing.key==="string"&&!referenced.has(existing.key)){
     removed.push(existing.key);existing.delete();
    }
    existing.continue();
   };
  };
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error??Error("Snapshot cleanup failed"));
  tx.onabort=()=>reject(tx.error??Error("Snapshot cleanup aborted"));
 });
 return removed;
}
