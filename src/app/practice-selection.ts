import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {validatePracticeSetups,type PracticeSetups} from "../workspace-settings.ts";
export {validatePracticeSetups,type FamilySetup,type PracticeSetups} from "../workspace-settings.ts";

/** Browser storage adapter for the single current user-setup schema. */
export const PRACTICE_SETUPS_KEY=STORAGE_TOPOLOGY.practiceSetups;
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
