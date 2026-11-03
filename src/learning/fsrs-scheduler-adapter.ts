/** Sole ts-fsrs dependency boundary. Keep upstream unmodified, version pinned.
 * The engine continues to use FSRS-7, desiredRetention .9, fuzz disabled.
 */
import {DefaultScheduler,type DefaultScheduler as FsrsScheduler,type Grade} from "ts-fsrs";
import type {RecallRating,ReviewObservation,RevisionSchedulerPort} from "./revision-scheduler-port.ts";
export const FSRS_PROVIDER="ts-fsrs@6.0.0/FSRS-7";
export async function createRevisionScheduler():Promise<RevisionSchedulerPort>{
 const scheduler:FsrsScheduler<"FSRS-7">=await DefaultScheduler<"FSRS-7">({
  version:"FSRS-7",desiredRetention:0.9,enableFuzz:false
 });
 const replay=(id:string,createdAt:string,reviews:readonly ReviewObservation[])=>{
  let card=scheduler.newCard({cardId:id,now:new Date(createdAt)});
  for(const review of reviews)
   card=scheduler.review({card,grade:review.rating as Grade,now:new Date(review.at)}).card;
  return card;
 };
 return {
  provider:FSRS_PROVIDER,
  replay:(id,createdAt,reviews)=>replay(id,createdAt,reviews),
  assertCanRate(id,createdAt,reviews,rating:RecallRating,at){
   scheduler.review({card:replay(id,createdAt,reviews),grade:rating as Grade,now:new Date(at)});
  }
 };
}
