/** Sole ts-fsrs dependency boundary. Keep upstream unmodified and version pinned.
 * ts-fsrs package version and FSRS model version are independent: stable ts-fsrs 6.0.0
 * supplies FSRS-7. The explicit review log remains authoritative and is replayed on demand.
 */
import {
 DefaultScheduler,State,
 type DefaultScheduler as FsrsScheduler,type DefaultSchedulerCard,type Grade
} from "ts-fsrs";
import type {
 RecallRating,ReviewObservation,RevisionMemoryState,RevisionPreview,RevisionSchedule,
 RevisionSchedulerConfiguration,RevisionSchedulerOptions,RevisionSchedulerPort,RevisionSnapshot
} from "./revision-scheduler-port.ts";

export const FSRS_PROVIDER="ts-fsrs@6.0.0/FSRS-7";
export const FSRS_DEFAULT_DESIRED_RETENTION=0.9;

const stateName=(state:State):RevisionMemoryState=>{
 if(state===State.New)return "new";
 if(state===State.Learning)return "learning";
 if(state===State.Review)return "review";
 return "relearning";
};
const scheduleOf=(card:DefaultSchedulerCard<"FSRS-7">):RevisionSchedule=>({
 dueAt:card.dueAt,scheduledDays:card.scheduledDays,state:stateName(card.state),
 reps:card.reps,lapses:card.lapses,learningStep:card.learningStep,
 stability:card.stability,stabilityFast:card.stabilityFast,difficulty:card.difficulty,
 lastReviewAt:card.lastReviewAt
});

export async function createRevisionScheduler(
 options:RevisionSchedulerOptions={}
):Promise<RevisionSchedulerPort>{
 const desiredRetention=options.desiredRetention??FSRS_DEFAULT_DESIRED_RETENTION;
 const enableFuzz=options.enableFuzz??true;
 const scheduler:FsrsScheduler<"FSRS-7">=await DefaultScheduler<"FSRS-7">({
  version:"FSRS-7",
  desiredRetention,
  enableShortTerm:true,
  learningSteps:["1m","10m"],
  relearningSteps:["10m"],
  graduatingInterval:1,
  allowModelOverride:true,
  enableFuzz,
  maximumInterval:36500,
  clearStatsOnForget:true,
  ...(options.weights?{weights:options.weights}:{})
 });
 const configuration:RevisionSchedulerConfiguration={
  model:"FSRS-7",packageVersion:"6.0.0",desiredRetention,enableShortTerm:true,
  learningSteps:["1m","10m"],relearningSteps:["10m"],graduatingInterval:1,
  allowModelOverride:true,enableFuzz,maximumInterval:36500,clearStatsOnForget:true,
  weights:options.weights?"FSRS-7-custom":"FSRS-7-default"
 };
 const replayCard=(id:string,createdAt:string,reviews:readonly ReviewObservation[])=>{
  let card=scheduler.newCard({cardId:id,now:new Date(createdAt)});
  for(const review of reviews)
   card=scheduler.review({card,grade:review.rating as Grade,now:new Date(review.at)}).card;
  return card;
 };
 const inspect=(id:string,createdAt:string,reviews:readonly ReviewObservation[],at:string):RevisionSnapshot=>{
  const card=replayCard(id,createdAt,reviews);
  let retrievability:number|null=null;
  if(card.lastReviewAt){
   const checkedAt=new Date(at);
   const elapsedDays=scheduler.chrono.difference(card.lastReviewAt,checkedAt);
   if(elapsedDays>=0)retrievability=scheduler.model.forgettingCurve(card,elapsedDays);
  }
  return {...scheduleOf(card),retrievability};
 };
 return {
  provider:FSRS_PROVIDER,configuration,
  replay:(id,createdAt,reviews)=>scheduleOf(replayCard(id,createdAt,reviews)),
  inspect,
  preview(id,createdAt,reviews,at){
   const card=replayCard(id,createdAt,reviews),now=new Date(at);
   return Array.from(scheduler.preview({card,now}))
    .map(({grade,card:next})=>({...scheduleOf(next),rating:grade as RecallRating}))
    .sort((a,b)=>a.rating-b.rating) as readonly RevisionPreview[];
  },
  assertCanRate(id,createdAt,reviews,rating:RecallRating,at){
   scheduler.review({card:replayCard(id,createdAt,reviews),grade:rating as Grade,now:new Date(at)});
  }
 };
}
