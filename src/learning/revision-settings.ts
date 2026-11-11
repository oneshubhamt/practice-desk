import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {FSRS_DEFAULT_COST_ADR_GOAL_WEIGHT,FSRS_DEFAULT_DESIRED_RETENTION,
 FSRS_DEFAULT_LEECH_THRESHOLD} from "./fsrs-scheduler-adapter.ts";
import {validateFsrsOptimizerProfile,type FsrsOptimizerProfile} from "./fsrs-optimizer.ts";
import type {LeechAction,RetentionPolicy,RevisionSchedulerOptions} from "./revision-scheduler-port.ts";
export const REVISION_SETTINGS_KEY=STORAGE_TOPOLOGY.revisionSettings;
export interface RevisionSettings{
 readonly schema:1;readonly retentionPolicy:RetentionPolicy;readonly desiredRetention:number;
 readonly costAdrGoalWeight:number;readonly leechThreshold:number;readonly leechAction:LeechAction;
 readonly optimizerProfile:FsrsOptimizerProfile|null;
}
export const DEFAULT_REVISION_SETTINGS:RevisionSettings={
 schema:1,retentionPolicy:"fixed",desiredRetention:FSRS_DEFAULT_DESIRED_RETENTION,
 costAdrGoalWeight:FSRS_DEFAULT_COST_ADR_GOAL_WEIGHT,leechThreshold:FSRS_DEFAULT_LEECH_THRESHOLD,
 leechAction:"remediate",optimizerProfile:null
};
export function validateRevisionSettings(value:unknown):RevisionSettings{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid revision settings");
 const p=value as Partial<RevisionSettings>;
 const fields=["schema","retentionPolicy","desiredRetention","costAdrGoalWeight","leechThreshold","leechAction","optimizerProfile"];
 if(Object.keys(p).some(k=>!fields.includes(k))||p.schema!==1||
  p.retentionPolicy!=="fixed"&&p.retentionPolicy!=="cost-adr"||
  typeof p.desiredRetention!=="number"||!Number.isFinite(p.desiredRetention)||p.desiredRetention<=0||p.desiredRetention>=1||
  typeof p.costAdrGoalWeight!=="number"||!Number.isFinite(p.costAdrGoalWeight)||p.costAdrGoalWeight<0||p.costAdrGoalWeight>1024||
  !Number.isSafeInteger(p.leechThreshold)||p.leechThreshold!<1||p.leechThreshold!>1000||
  p.leechAction!=="remediate"&&p.leechAction!=="suspend")throw Error("Invalid revision settings");
 return {schema:1,retentionPolicy:p.retentionPolicy,desiredRetention:p.desiredRetention,
  costAdrGoalWeight:p.costAdrGoalWeight,leechThreshold:p.leechThreshold!,leechAction:p.leechAction,
  optimizerProfile:p.optimizerProfile===null?null:validateFsrsOptimizerProfile(p.optimizerProfile)};
}
export function readRevisionSettings(storage:Pick<Storage,"getItem">=localStorage):RevisionSettings{
 try{const raw=storage.getItem(REVISION_SETTINGS_KEY);return raw?validateRevisionSettings(JSON.parse(raw)):DEFAULT_REVISION_SETTINGS;}
 catch{return DEFAULT_REVISION_SETTINGS;}
}
export function writeRevisionSettings(value:unknown,storage:Pick<Storage,"setItem">=localStorage):RevisionSettings{
 const s=validateRevisionSettings(value);storage.setItem(REVISION_SETTINGS_KEY,JSON.stringify(s));return s;
}
export function revisionSchedulerOptions(s:RevisionSettings):RevisionSchedulerOptions{
 return {retentionPolicy:s.retentionPolicy,desiredRetention:s.desiredRetention,costAdrGoalWeight:s.costAdrGoalWeight,
  leechThreshold:s.leechThreshold,leechAction:s.leechAction,...(s.optimizerProfile?{weights:s.optimizerProfile.weights}:{})};
}
