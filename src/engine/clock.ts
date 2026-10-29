/** One tab's strictly nondecreasing millisecond epoch clock.
 * Uses the browser's monotonic source while live; another process must still
 * reconcile offline absence using its persisted clock and current wall anchor.
 */
export function createSessionClock(wallStartMs:number,monoStartMs:number,monoNow:()=>number):()=>number{
 if(!Number.isFinite(wallStartMs)||!Number.isFinite(monoStartMs))
   throw new Error("Invalid session clock origin");
 let last=wallStartMs;
 return ()=>{
   const sample=monoNow();
   if(!Number.isFinite(sample))throw new Error("Invalid monotonic clock sample");
   const elapsed=Math.max(0,sample-monoStartMs);
   last=Math.max(last,wallStartMs+elapsed);
   return Math.floor(last);
 };
}
