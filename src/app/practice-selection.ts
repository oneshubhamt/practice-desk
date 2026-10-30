import type { CglPracticeMode } from "./exam-package.ts";

/** Device-local setup choice, separate from display theme and portable backup v3. */
export interface PracticeSelection {
 readonly schema:1;
 readonly paperRevisionId:string;
 readonly mode:CglPracticeMode;
 readonly section:number;
}
export const PRACTICE_SELECTION_KEY="practiceDesk.overhaul.selection.v1";
export function validatePracticeSelection(value:unknown):PracticeSelection{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid saved exam selection");
 const p=value as Partial<PracticeSelection>;
 if(p.schema!==1||typeof p.paperRevisionId!=="string"||!p.paperRevisionId.trim()||
    p.paperRevisionId.length>300||
    !["strict","free","single"].includes(p.mode??"")||
    !Number.isSafeInteger(p.section)||p.section!<0||p.section!>1999)
   throw Error("Invalid saved exam selection");
 return {schema:1,paperRevisionId:p.paperRevisionId,mode:p.mode!,section:p.section!};
}
export function readPracticeSelection(storage:Pick<Storage,"getItem">=localStorage):PracticeSelection|null{
 try{
   const data=storage.getItem(PRACTICE_SELECTION_KEY);
   return data?validatePracticeSelection(JSON.parse(data)):null;
 }catch{return null;}
}
export function writePracticeSelection(p:unknown,storage:Pick<Storage,"setItem">=localStorage):PracticeSelection{
 const valid=validatePracticeSelection(p);
 storage.setItem(PRACTICE_SELECTION_KEY,JSON.stringify(valid));
 return valid;
}
