export interface DisplayPreferences{readonly schema:1;readonly dark:boolean;readonly scale:number}
export const SETTINGS_KEY="practiceDesk.overhaul.settings.v1";
export const SETTINGS_EVENT="practice-desk-preferences";
export const DEFAULT_PREFERENCES:DisplayPreferences={schema:1,dark:false,scale:100};

export function validateDisplayPreferences(value:unknown):DisplayPreferences{
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("Invalid display preferences");
 const p=value as Partial<DisplayPreferences>;
 if(p.schema!==1||typeof p.dark!=="boolean"||!Number.isInteger(p.scale)||p.scale!<85||p.scale!>140)
   throw new Error("Invalid display preferences");
 return {schema:1,dark:p.dark,scale:p.scale};
}
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
