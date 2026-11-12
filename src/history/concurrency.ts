/** An IndexedDB readwrite transaction must check the expected record version
 * before writing. A null version means the record should not yet exist. */
export interface VersionedRecord { readonly saveRevision: number }
export function assertWriteVersion(current:VersionedRecord|undefined,expected:number|null):void {
 if(expected===null){
  if(current)throw new Error("Another tab already created this record");
 }else if(!current||!Number.isSafeInteger(current.saveRevision)||current.saveRevision<1||
   current.saveRevision!==expected){
  throw new Error("Another tab changed this record; reopen to see the latest version");
 }
}
export function nextWriteVersion(expected:number|null):number{
 if(expected===null)return 1;
 if(!Number.isSafeInteger(expected)||expected<1)
   throw new Error("Invalid expected stored write revision");
 return expected+1;
}
