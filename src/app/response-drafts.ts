/** Pure diagnostics for uncommitted multi-select and matching controls.
 * The scoring engine remains the authority for accepted candidate responses.
 */
export function multipleDraftMessage(count:number,min:number,max:number|undefined):string{
 if(count<min)return "Unsaved draft: select at least "+min+
   " options ("+count+" currently selected). No answer is scored until valid; "+
   "this partial choice is kept only in the current browser tab, not saved to your attempt or backup.";
 if(max!==undefined&&count>max)return "Unsaved draft: select at most "+max+
   " options ("+count+" currently selected). No answer is scored until valid; "+
   "this partial choice is kept only in the current browser tab, not saved to your attempt or backup.";
 return "";
}
/** Right-item IDs chosen more than once, preserving first-occurrence order. */
export function duplicateMatchingTargets(values:readonly string[]):readonly string[]{
 const seen=new Set<string>(),duplicates=new Set<string>();
 for(const value of values){
  if(!value)continue;
  if(seen.has(value))duplicates.add(value);
  seen.add(value);
 }
 return [...duplicates];
}
