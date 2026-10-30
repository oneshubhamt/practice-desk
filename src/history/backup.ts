import { sha256 } from "../domain/hash.ts";
import { validateDisplayPreferences } from "../app/preferences.ts";
import type { DisplayPreferences } from "../app/preferences.ts";
import { validatePracticeSelection } from "../app/practice-selection.ts";
import type { PracticeSelection } from "../app/practice-selection.ts";

export interface BackupV3 {
 readonly format:"practice-desk-backup";
 readonly version:3;
 readonly exportedAt:string;
 readonly records:readonly Record<string,unknown>[];
 readonly preferences:DisplayPreferences;
 /** Optional validated last-used exam setup. Old v3 archives omit this safely. */
 readonly selection?:PracticeSelection;
 readonly manifest:{
   readonly algorithm:"sha256";
   readonly digest:string;
   readonly recordCount:number;
 };
}
type Core=Omit<BackupV3,"manifest">;
const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v)) as T;
const digest=(core:Core):string=>sha256(JSON.stringify(core));

export function makeBackup(
 records:readonly Record<string,unknown>[],preferences:DisplayPreferences,exportedAt:string,
 selection?:PracticeSelection|null
):BackupV3{
 if(!Number.isFinite(Date.parse(exportedAt)))throw new Error("Invalid export timestamp");
 const validated=validateDisplayPreferences(preferences);
 const savedSelection=selection?validatePracticeSelection(selection):null;
 const core=clone({format:"practice-desk-backup" as const,version:3 as const,exportedAt,records,
   preferences:validated,...(savedSelection?{selection:savedSelection}:{})});
 return {...core,manifest:{algorithm:"sha256",digest:digest(core),recordCount:core.records.length}};
}
export function verifyBackup(raw:unknown):BackupV3{
 if(!raw||typeof raw!=="object")throw new Error("Invalid backup");
 const b=raw as Partial<BackupV3>;
 if(b.format!=="practice-desk-backup"||b.version!==3||!Array.isArray(b.records)||
    b.records.length>5000||typeof b.exportedAt!=="string"||!Number.isFinite(Date.parse(b.exportedAt)))
   throw new Error("Invalid backup format");
 if(b.records.some(x=>!x||typeof x!=="object"||typeof x.id!=="string"||x.id.length>200)||
    new Set(b.records.map(x=>x.id)).size!==b.records.length)throw new Error("Invalid backup records");
 const {manifest,...core}=b;
 if(!manifest||manifest.algorithm!=="sha256"||manifest.recordCount!==b.records.length||
    manifest.digest!==digest(core as Core))throw new Error("Backup integrity check failed");
 validateDisplayPreferences(b.preferences);
 if(b.selection!==undefined)validatePracticeSelection(b.selection);
 return b as BackupV3;
}
export function planBackupMerge<T extends {readonly id:string}>(
 existing:readonly T[],incoming:readonly T[],activeId?:string
):T[]{
 const known=new Set(existing.map(x=>x.id));if(activeId)known.add(activeId);
 const result:T[]=[];
 for(const candidate of incoming)if(!known.has(candidate.id)){known.add(candidate.id);result.push(candidate);}
 return result;
}
