/** Shared authoring cardinality helpers. Candidate/domain models remain the authority. */
import type {RichDocument} from "../domain/rich-document.ts";
export const MAX_AUTHORED_ITEMS=26;
export const optionLabel=(index:number):string=>String.fromCharCode(65+index);
export function resizeRichItems(items:readonly RichDocument[],count:number,empty:()=>RichDocument):readonly RichDocument[]{
 if(!Number.isSafeInteger(count)||count<1||count>MAX_AUTHORED_ITEMS)throw Error("Item count must be 1–"+MAX_AUTHORED_ITEMS);
 return count<=items.length?items.slice(0,count):[...items,...Array.from({length:count-items.length},empty)];
}
