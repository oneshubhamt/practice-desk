/** Destructive actions require an exact record type and lifecycle.
 * This applies both before confirmation and again in the storage transaction,
 * so a stale browser tab cannot erase an updated/unfinished attempt.
 */
export type DeletionIntent = "completed" | "discard-unfinished" | "learning-card";
export interface DeletableRecord {
  readonly recordType:string;
  readonly finishedAt?:number|null;
}
export function assertDeletionAllowed(record:DeletableRecord|undefined,intent:DeletionIntent):void{
  if(!record)throw Error("Saved item no longer exists; deletion cancelled");
  if(intent==="learning-card"){
    if(record.recordType!=="learning-card")throw Error("Deletion intent does not match saved learning card");
  }else{
    if(record.recordType!=="generic-attempt")throw Error("Deletion intent does not match a test attempt");
    if(intent==="completed"&&record.finishedAt==null)
      throw Error("An unfinished attempt must use the separate Discard action");
    if(intent==="discard-unfinished"&&record.finishedAt!=null)
      throw Error("This attempt has completed; use Delete completed result instead");
  }
}
export function deletionWarning(intent:DeletionIntent,answered:number):string{
  if(intent==="discard-unfinished")return "Discard this UNFINISHED test? "+
    answered+" saved answer"+(answered===1?"":"s")+
    ", its timer progress and all unsaved future work will be permanently lost. "+
    "You will not be able to resume it. Export a backup first if needed.";
  return intent==="completed"?
    "Permanently delete this COMPLETED test result? Export a backup first if needed.":
    "Permanently delete this learning card and its revision history?";
}
