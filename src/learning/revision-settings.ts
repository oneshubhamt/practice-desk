import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {FSRS_DEFAULT_DESIRED_RETENTION,FSRS_DEFAULT_LEECH_THRESHOLD,
 FSRS_MAX_DESIRED_RETENTION,FSRS_MIN_DESIRED_RETENTION} from "./fsrs-scheduler-adapter.ts";
import {validateFsrsOptimizerProfile,type FsrsOptimizerProfile} from "./fsrs-optimizer.ts";
import type {LeechAction,RevisionSchedulerOptions,RevisionSchedulingPolicy} from "./revision-scheduler-port.ts";
export const REVISION_SETTINGS_KEY=STORAGE_TOPOLOGY.revisionSettings;
export interface RevisionSettings{
 readonly schema:2;readonly policy:RevisionSchedulingPolicy;
 readonly leechThreshold:number;readonly leechAction:LeechAction;
 readonly optimizerProfile:FsrsOptimizerProfile|null;
}
export const DEFAULT_REVISION_SETTINGS:RevisionSettings={
 schema:2,policy:{kind:"fixed",desiredRetention:FSRS_DEFAULT_DESIRED_RETENTION},
 leechThreshold:FSRS_DEFAULT_LEECH_THRESHOLD,leechAction:"remediate",optimizerProfile:null
};
const validatePolicy=(value:unknown):RevisionSchedulingPolicy=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid FSRS scheduling policy");
 const p=value as Record<string,unknown>;
 if(p.kind==="fixed"){
  if(Object.keys(p).some(k=>!["kind","desiredRetention"].includes(k))||
    typeof p.desiredRetention!=="number"||!Number.isFinite(p.desiredRetention)||
    p.desiredRetention<FSRS_MIN_DESIRED_RETENTION||p.desiredRetention>FSRS_MAX_DESIRED_RETENTION)
   throw Error("Fixed FSRS retention must be between 0.75 and 0.97");
  return {kind:"fixed",desiredRetention:p.desiredRetention};
 }
 if(p.kind==="cost-adr"){
  if(Object.keys(p).some(k=>!["kind","preset"].includes(k))||p.preset!=="upstream-default")
   throw Error("Invalid Cost-ADR preset");
  return {kind:"cost-adr",preset:"upstream-default"};
 }
 throw Error("Invalid FSRS scheduling policy");
};
export function validateRevisionSettings(value:unknown):RevisionSettings{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid revision settings");
 const p=value as Partial<RevisionSettings>;
 const fields=["schema","policy","leechThreshold","leechAction","optimizerProfile"];
 if(Object.keys(p).some(k=>!fields.includes(k))||p.schema!==2||
  !Number.isSafeInteger(p.leechThreshold)||p.leechThreshold!<1||p.leechThreshold!>1000||
  p.leechAction!=="remediate"&&p.leechAction!=="suspend")throw Error("Invalid revision settings");
 return {schema:2,policy:validatePolicy(p.policy),leechThreshold:p.leechThreshold!,leechAction:p.leechAction,
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
 return {policy:s.policy,leechThreshold:s.leechThreshold,leechAction:s.leechAction,
  ...(s.optimizerProfile?{weights:s.optimizerProfile.weights}:{})};
}
