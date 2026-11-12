import {
 State,dateChrono,defineScheduler,
 type DefaultScheduler as FsrsScheduler,type DefaultSchedulerCard,type Grade
} from "ts-fsrs";
import {Reschedule} from "ts-fsrs/reschedule";
import {
 COST_ADR_DEFAULT_GOAL_COST_WEIGHT,COST_ADR_DEFAULT_POLICY,
 schedulerCostAdrMiddleware,schedulerDesiredRetentionMiddleware,schedulerFuzzingMiddleware,
 schedulerLearningStepsMiddleware,schedulerLeechMiddleware,schedulerMaximumIntervalMiddleware,
 schedulerMonotonicIntervalMiddleware,schedulerScheduledDaysMiddleware,schedulerStatsMiddleware
} from "ts-fsrs/middlewares";
import {FSRS7_DEFAULT_WEIGHTS,FSRS7Model,checkFSRS7Parameters} from "ts-fsrs/models/fsrs-7";
import type {
 LeechAction,RecallRating,ReviewObservation,RevisionLeechStatus,
 RevisionMemoryState,RevisionPreview,RevisionSchedule,RevisionScheduleStatus,
 RevisionSchedulerConfiguration,RevisionSchedulerOptions,RevisionSchedulerPort,
 RevisionSchedulingPolicy,RevisionSnapshot
} from "./revision-scheduler-port.ts";

export const FSRS_PROVIDER="ts-fsrs@6.0.0/FSRS-7";
export const FSRS_DEFAULT_DESIRED_RETENTION=0.9;
export const FSRS_MIN_DESIRED_RETENTION=0.75;
export const FSRS_MAX_DESIRED_RETENTION=0.97;
export const FSRS_COST_ADR_PRESET_GOAL_WEIGHT=COST_ADR_DEFAULT_GOAL_COST_WEIGHT;
export const FSRS_DEFAULT_LEECH_THRESHOLD=4;

const stateName=(state:State):RevisionMemoryState=>{
 switch(state){case State.New:return "new";case State.Learning:return "learning";
  case State.Review:return "review";case State.Relearning:return "relearning";
 }
 throw Error("Unsupported FSRS state");
};
const grade=(rating:RecallRating):Grade=>rating as Grade;
const fixedDefinition=defineScheduler({model:FSRS7Model,chrono:dateChrono}).use(
 schedulerDesiredRetentionMiddleware,schedulerFuzzingMiddleware,schedulerStatsMiddleware,
 schedulerLeechMiddleware,schedulerScheduledDaysMiddleware,schedulerLearningStepsMiddleware,
 schedulerMaximumIntervalMiddleware,schedulerMonotonicIntervalMiddleware
);
const costAdrDefinition=defineScheduler({model:FSRS7Model,chrono:dateChrono}).use(
 schedulerCostAdrMiddleware,schedulerFuzzingMiddleware,schedulerStatsMiddleware,
 schedulerLeechMiddleware,schedulerScheduledDaysMiddleware,schedulerLearningStepsMiddleware,
 schedulerMaximumIntervalMiddleware,schedulerMonotonicIntervalMiddleware
);
const canonicalPolicy=(value:RevisionSchedulingPolicy|undefined):RevisionSchedulingPolicy=>{
 const p=value??{kind:"fixed",desiredRetention:FSRS_DEFAULT_DESIRED_RETENTION};
 if(p.kind==="fixed"){
  if(!Number.isFinite(p.desiredRetention)||p.desiredRetention<FSRS_MIN_DESIRED_RETENTION||
    p.desiredRetention>FSRS_MAX_DESIRED_RETENTION)
   throw Error("Desired retention must be between 0.75 and 0.97");
  return {kind:"fixed",desiredRetention:p.desiredRetention};
 }
 if(p.kind==="cost-adr"&&p.preset==="upstream-default")
   return {kind:"cost-adr",preset:"upstream-default"};
 throw Error("Invalid FSRS scheduling policy");
};
const leechAction=(v:LeechAction)=>{if(v!=="remediate"&&v!=="suspend")throw Error("Invalid leech action");return v;};
const scheduleStatus=(card:DefaultSchedulerCard<"FSRS-7">):RevisionScheduleStatus=>{
 const value=card.scheduleStatus as string;
 if(value==="new"||value==="learning"||value==="review"||value==="suspended")return value;
 throw Error("Unsupported FSRS schedule status");
};

export async function createRevisionScheduler(options:RevisionSchedulerOptions={}):Promise<RevisionSchedulerPort>{
 const schedulingPolicy=canonicalPolicy(options.policy);
 const enableFuzz=options.enableFuzz??true;
 const leechThreshold=options.leechThreshold??FSRS_DEFAULT_LEECH_THRESHOLD;
 if(!Number.isSafeInteger(leechThreshold)||leechThreshold<1)throw Error("Leech threshold must be a positive integer");
 const action=leechAction(options.leechAction??"remediate");
 const weights=options.weights?Array.from(checkFSRS7Parameters(options.weights)):undefined;
 const config={
   weights:weights??FSRS7_DEFAULT_WEIGHTS,fractionalDays:true as const,
   enableFuzz,maximumInterval:36500,clearStatsOnForget:true as const,
   enableShortTerm:true as const,learningSteps:["1m","10m"] as const,relearningSteps:["10m"] as const,
   graduatingInterval:1 as const,allowModelOverride:true as const,
   leechThreshold:action==="suspend"?leechThreshold:0
 };
 const scheduler=(schedulingPolicy.kind==="cost-adr"
  ?costAdrDefinition.create({config:{
    ...config,costAdrPolicy:COST_ADR_DEFAULT_POLICY,goalCostWeight:FSRS_COST_ADR_PRESET_GOAL_WEIGHT
   }})
  :fixedDefinition.create({config:{...config,desiredRetention:schedulingPolicy.desiredRetention}}))
   as unknown as FsrsScheduler<"FSRS-7">;
 const leechStatus=(card:DefaultSchedulerCard<"FSRS-7">):RevisionLeechStatus=>{
   if(action==="suspend")return scheduleStatus(card)==="suspended"?"suspended":"normal";
   return card.lapses<leechThreshold?"normal":"remediation";
 };
 const schedule=(card:DefaultSchedulerCard<"FSRS-7">):RevisionSchedule=>({
   dueAt:new Date(card.dueAt),scheduledDays:card.scheduledDays,state:stateName(card.state),
   scheduleStatus:scheduleStatus(card),reps:card.reps,lapses:card.lapses,learningStep:card.learningStep,
   stability:card.stability,stabilityFast:card.stabilityFast,difficulty:card.difficulty,
   lastReviewAt:card.lastReviewAt?new Date(card.lastReviewAt):null,leechStatus:leechStatus(card)
 });
 const reschedule=new Reschedule(scheduler);
 const replay=(id:string,createdAt:string,reviews:readonly ReviewObservation[])=>{
   const created=new Date(createdAt);
   if(!Number.isFinite(created.getTime()))throw Error("Invalid learning-card creation time");
   const initialCard=scheduler.newCard({cardId:id,now:created});
   if(reviews.length===0)return initialCard;
   let previous=created.getTime();
   const history=reviews.map(review=>{
     const reviewTime=new Date(review.at),timestamp=reviewTime.getTime();
     if(!Number.isFinite(timestamp)||timestamp<previous)
       throw Error("FSRS review history must be chronological and cannot be silently reordered");
     previous=timestamp;
     return {rating:grade(review.rating),reviewTime};
   });
   return reschedule.reschedule({initialCard,history},{sortHistory:false}).card;
 };
 const commonConfiguration={
   model:"FSRS-7" as const,packageVersion:"6.0.0" as const,
   enableShortTerm:true as const,learningSteps:["1m","10m"] as const,
   relearningSteps:["10m"] as const,graduatingInterval:1 as const,allowModelOverride:true as const,
   enableFuzz,maximumInterval:36500 as const,clearStatsOnForget:true as const,
   leechThreshold,leechAction:action,weights:weights?"FSRS-7-custom" as const:"FSRS-7-default" as const
 };
 const configuration:RevisionSchedulerConfiguration=schedulingPolicy.kind==="cost-adr"
  ?{...commonConfiguration,policy:{kind:"cost-adr",preset:"upstream-default",
    goalCostWeight:FSRS_COST_ADR_PRESET_GOAL_WEIGHT}}
  :{...commonConfiguration,policy:{kind:"fixed",desiredRetention:schedulingPolicy.desiredRetention}};
 return {
   provider:FSRS_PROVIDER,configuration,
   replay(id,createdAt,reviews){return schedule(replay(id,createdAt,reviews));},
   inspect(id,createdAt,reviews,at):RevisionSnapshot{
     const card=replay(id,createdAt,reviews),when=new Date(at);
     const elapsed=card.lastReviewAt?Math.max(0,scheduler.chrono.difference(card.lastReviewAt,when)):0;
     const retrievability=card.reps===0?null:scheduler.model.forgettingCurve(card,elapsed);
     return {...schedule(card),retrievability};
   },
   preview(id,createdAt,reviews,at):readonly RevisionPreview[]{
     const card=replay(id,createdAt,reviews);
     return scheduler.preview({card,now:new Date(at)}).map(result=>({
       ...schedule(result.card),rating:result.revlog.rating as RecallRating
     })).sort((a,b)=>a.rating-b.rating);
   },
   assertCanRate(id,createdAt,reviews,rating,at){
     scheduler.review({card:replay(id,createdAt,reviews),grade:grade(rating),now:new Date(at)});
   }
 };
}
