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
