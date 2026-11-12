import { sha256 } from "../domain/hash.ts";
import { validateDisplayPreferences } from "../app/preferences.ts";
import type { DisplayPreferences } from "../app/preferences.ts";
import { validatePracticeSetups } from "../app/practice-selection.ts";
import type { PracticeSetups } from "../app/practice-selection.ts";
import type { GenericAttempt } from "../engine/generic-attempt.ts";
import {compactAttempt,isSharedAttempt,verifiedSnapshot,reconstructRecords} from "./shared-store.ts";
import type {SharedSnapshot} from "./shared-store.ts";

/** Canonical backup archive; only the current format is accepted.
 * Frozen paper, key, questions and media occur ONCE per content digest.
 * Attempts keep only their individual timing/responses/results and a reference. */
export interface BackupArchive {
 readonly format:"practice-desk-backup";
 readonly version:4;
 readonly exportedAt:string;
 readonly records:readonly Record<string,unknown>[];
 readonly snapshots:readonly SharedSnapshot[];
 readonly preferences:DisplayPreferences;
 readonly setups?:PracticeSetups;
 readonly manifest:{
   readonly algorithm:"sha256";
   readonly digest:string;
   readonly recordCount:number;
   readonly snapshotCount:number;
 };
}
type Core=Omit<BackupArchive,"manifest">;
const digest=(core:Core):string=>sha256(JSON.stringify(core));

function coreBackup(records:readonly Record<string,unknown>[],
 preferences:DisplayPreferences,exportedAt:string,setups?:PracticeSetups|null):Core{
 if(!Number.isFinite(Date.parse(exportedAt)))throw Error("Invalid export timestamp");
 const validated=validateDisplayPreferences(preferences);
 const savedSetups=setups?validatePracticeSetups(setups):null;
 const snapshots=new Map<string,SharedSnapshot>();
 const rows=records.map(record=>{
   if(record.recordType!=="generic-attempt")return record;
   const {row,snapshot}=compactAttempt(record as unknown as GenericAttempt);
   snapshots.set(snapshot.id,snapshot);
   return row as unknown as Record<string,unknown>;
 });
 return {format:"practice-desk-backup",version:4,exportedAt,records:rows,
   snapshots:[...snapshots.values()],preferences:validated,
   ...(savedSetups?{setups:savedSetups}:{})};
}
export function makeBackup(records:readonly Record<string,unknown>[],
 preferences:DisplayPreferences,exportedAt:string,setups?:PracticeSetups|null):BackupArchive{
 const core=coreBackup(records,preferences,exportedAt,setups);
 return {...core,manifest:{algorithm:"sha256",digest:digest(core),
   recordCount:core.records.length,snapshotCount:core.snapshots.length}};
}
/** Serialize directly from the compact current core, without a second
 * full frozen record graph. The checksum binds snapshots and every attempt. */
export function serializeVerifiedBackup(records:readonly Record<string,unknown>[],
 preferences:DisplayPreferences,exportedAt:string,setups?:PracticeSetups|null):string{
 const core=coreBackup(records,preferences,exportedAt,setups);
 const serialized=JSON.stringify(core);
 if(!serialized.endsWith("}"))throw Error("Cannot serialize backup");
 const manifest={algorithm:"sha256" as const,digest:sha256(serialized),
   recordCount:core.records.length,snapshotCount:core.snapshots.length};
 return serialized.slice(0,-1)+',"manifest":'+JSON.stringify(manifest)+'}';
}
export function verifyBackup(raw:unknown):BackupArchive{
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(raw)))
   throw Error("Invalid backup");
 const b=raw as Partial<BackupArchive>;
 // A SHA-256 checksum is NOT a publisher signature. Unknown fields are not
 // part of the versioned format and must not slip into additive restores.
 const validFields=["format","version","exportedAt","records","snapshots","preferences","setups","manifest"];
 if(Object.keys(b).some(key=>!validFields.includes(key)))
   throw Error("Invalid backup: unsupported envelope fields");
 const manifestFields=["algorithm","digest","recordCount","snapshotCount"];
 if(!b.manifest||typeof b.manifest!=="object"||Array.isArray(b.manifest)||
   Object.keys(b.manifest).some(key=>!manifestFields.includes(key)))
   throw Error("Invalid backup: unsupported manifest fields");
 if(b.format!=="practice-desk-backup"||b.version!==4||
   !Array.isArray(b.records)||!Array.isArray(b.snapshots)||
   b.records.length>5000||b.snapshots.length>5000||
   typeof b.exportedAt!=="string"||!Number.isFinite(Date.parse(b.exportedAt)))
    throw Error("Invalid backup format");
 if(b.records.some(x=>!x||typeof x!=="object"||typeof x.id!=="string"||x.id.length>200||
      !Number.isSafeInteger(x.saveRevision)||x.saveRevision<1)||
    new Set(b.records.map(x=>x.id)).size!==b.records.length)
    throw Error("Invalid backup records");
 const {manifest,...core}=b;
 if(!manifest||manifest.algorithm!=="sha256"||
    manifest.recordCount!==b.records.length||
    manifest.snapshotCount!==b.snapshots.length||
    manifest.digest!==digest(core as Core))
   throw Error("Backup integrity check failed");
 validateDisplayPreferences(b.preferences);
 if(b.setups!==undefined)validatePracticeSetups(b.setups);
 // A checksum-matched (not authenticated) archive still needs valid source and no
 // dangling references. This is independent of any installed source bank.
 reconstructRecords(b.records,b.snapshots);
 if(b.records.some(x=>x.recordType==="generic-attempt"&&
   (!isSharedAttempt(x)||"frozen" in x)))
   throw Error("Backup contains noncompact attempt content");
 return b as BackupArchive;
}
export function planBackupMerge<T extends {readonly id:string}>(
 existing:readonly T[],incoming:readonly T[],activeId?:string
):T[]{
 const known=new Set(existing.map(x=>x.id));if(activeId)known.add(activeId);
 const result:T[]=[];
 for(const candidate of incoming)if(!known.has(candidate.id)){known.add(candidate.id);result.push(candidate);}
 return result;
}
