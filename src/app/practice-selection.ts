import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import type { CglPracticeMode } from "../domain/exam-package.ts";

/** The single current user-setup schema. No migration or dual-write path. */
export interface FamilySetup {
 readonly paperRevisionId:string;
 readonly mode:CglPracticeMode;
 readonly section:number;
 readonly untimed:boolean;
 readonly edition:"source"|"reviewed";
}
export interface PracticeSetups {
 readonly schema:2;
 readonly selectedFamilyId:string;
 readonly families:Readonly<Record<string,FamilySetup>>;
}
export const PRACTICE_SETUPS_KEY=STORAGE_TOPOLOGY.practiceSetups;
const validId=(s:unknown,max=600):s is string=>
 typeof s==="string"&&Boolean(s.trim())&&s.length<=max&&
 s!=="__proto__"&&s!=="constructor"&&s!=="prototype";

export function validatePracticeSetups(value:unknown):PracticeSetups{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid exam family setups");
 const raw=value as Record<string,unknown>;
 if(raw.schema!==2||!validId(raw.selectedFamilyId,600)||
   !raw.families||typeof raw.families!=="object"||Array.isArray(raw.families))
   throw Error("Invalid exam family setups");
 const entries=Object.entries(raw.families);
 if(!entries.length||entries.length>1000||!Object.hasOwn(raw.families,raw.selectedFamilyId))
   throw Error("Invalid exam family setups");
 const families:Record<string,FamilySetup>={};
 for(const [familyId,entry] of entries){
   if(!validId(familyId,600)||!entry||typeof entry!=="object"||Array.isArray(entry))
     throw Error("Invalid exam family setup");
   const v=entry as Record<string,unknown>;
   if(!validId(v.paperRevisionId)||!["strict","free","single"].includes(String(v.mode))||
     !Number.isSafeInteger(v.section)||Number(v.section)<0||Number(v.section)>1999||
     typeof v.untimed!=="boolean"||!["source","reviewed"].includes(String(v.edition)))
     throw Error("Invalid exam family setup");
   families[familyId]={paperRevisionId:v.paperRevisionId,mode:v.mode as CglPracticeMode,
     section:v.section as number,untimed:v.untimed,edition:v.edition as "source"|"reviewed"};
 }
 return {schema:2,selectedFamilyId:raw.selectedFamilyId,families};
}
export function readPracticeSetups(storage:Pick<Storage,"getItem">=localStorage):PracticeSetups|null{
 try{const raw=storage.getItem(PRACTICE_SETUPS_KEY);
   return raw?validatePracticeSetups(JSON.parse(raw)):null;
 }catch{return null;}
}
export function writePracticeSetups(value:unknown,storage:Pick<Storage,"setItem">=localStorage):PracticeSetups{
 const valid=validatePracticeSetups(value);
 storage.setItem(PRACTICE_SETUPS_KEY,JSON.stringify(valid));
 return valid;
}
