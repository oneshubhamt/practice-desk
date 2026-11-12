import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {DEFAULT_PREFERENCES,validateDisplayPreferences,type DisplayPreferences} from "../workspace-settings.ts";
export {DEFAULT_PREFERENCES,validateDisplayPreferences,type DisplayPreferences} from "../workspace-settings.ts";
export const SETTINGS_KEY=STORAGE_TOPOLOGY.preferences;
export const SETTINGS_EVENT="practice-desk-preferences";
export function readDisplayPreferences(storage:Pick<Storage,"getItem">=localStorage):DisplayPreferences{
 try{
   const raw=storage.getItem(SETTINGS_KEY);
   return raw?validateDisplayPreferences(JSON.parse(raw)):DEFAULT_PREFERENCES;
 }catch{return DEFAULT_PREFERENCES;}
}
export function writeDisplayPreferences(value:unknown,storage:Pick<Storage,"setItem">=localStorage):DisplayPreferences{
 const p=validateDisplayPreferences(value);
 storage.setItem(SETTINGS_KEY,JSON.stringify(p));
 return p;
}
