export interface StorageHealth {
 readonly pendingWrites:number;
 readonly lastCommittedAt:number|null;
 readonly lastFailure:string|null;
 readonly locked:boolean;
 readonly loading:boolean;
 /** In-memory accepted rows; authoritative only after backend has loaded. */
 readonly inMemoryRecords:number;
}

export function healthSummary(health:StorageHealth):string{
 if(health.loading)return "Loading stored records; readiness not yet confirmed.";
 if(health.locked)return "Writes locked — export recovery data and reopen before editing.";
 if(health.pendingWrites>0)return health.pendingWrites+" write"+(health.pendingWrites===1?"":"s")+
   " pending; wait for completion before closing the page.";
 return "No writes pending in this tab. Browser storage can still be cleared or evicted.";
}

export type CandidateSaveState="saving"|"saved"|"problem";
export interface CandidateSaveStatus{
 readonly state:CandidateSaveState;
 readonly label:"Saving…"|"Saved"|"Save problem";
 readonly detail:string;
}
/** Candidate-facing projection of the existing persistence pipeline.
 * This never starts a write and does not treat explicit unsaved form drafts as durable.
 */
export function candidateSaveStatus(
 health:Pick<StorageHealth,"pendingWrites"|"locked">
):CandidateSaveStatus{
 if(health.locked)return {state:"problem",label:"Save problem",
   detail:"Attempt writes are locked; follow the recovery guidance."};
 if(health.pendingWrites>0)return {state:"saving",label:"Saving…",
   detail:health.pendingWrites+" attempt write"+(health.pendingWrites===1?" is":"s are")+" pending."};
 return {state:"saved",label:"Saved",
   detail:"No attempt writes are pending; unsaved form drafts are not yet durable."};
}
