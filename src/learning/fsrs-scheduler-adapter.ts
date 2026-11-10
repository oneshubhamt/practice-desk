import {
 DefaultScheduler,State,dateChrono,defineScheduler,
 type DefaultScheduler as FsrsScheduler,type DefaultSchedulerCard,type Grade
} from "ts-fsrs";
import {
 COST_ADR_DEFAULT_GOAL_COST_WEIGHT,COST_ADR_DEFAULT_POLICY,
 schedulerCostAdrMiddleware,schedulerFuzzingMiddleware,schedulerLearningStepsMiddleware,
 schedulerMaximumIntervalMiddleware,schedulerMonotonicIntervalMiddleware,
 schedulerScheduledDaysMiddleware,schedulerStatsMiddleware
} from "ts-fsrs/middlewares";
import {FSRS7_DEFAULT_WEIGHTS,FSRS7Model,checkFSRS7Parameters} from "ts-fsrs/models/fsrs-7";
import type {
 LeechAction,RecallRating,RetentionPolicy,ReviewObservation,RevisionLeechStatus,
 RevisionMemoryState,RevisionPreview,RevisionSchedule,RevisionSchedulerOptions,
 RevisionSchedulerPort,RevisionSnapshot
} from "./revision-scheduler-port.ts";

export const FSRS_PROVIDER="ts-fsrs@6.0.0/FSRS-7";
export const FSRS_DEFAULT_DESIRED_RETENTION=0.9;
export const FSRS_DEFAULT_COST_ADR_GOAL_WEIGHT=COST_ADR_DEFAULT_GOAL_COST_WEIGHT;
export const FSRS_DEFAULT_LEECH_THRESHOLD=4;

const stateName=(state:State):RevisionMemoryState=>{
 switch(state){
  case State.New:return "new";case State.Learning:return "learning";
  case State.Review:return "review";case State.Relearning:return "relearning";
 }
 throw Error("Unsupported FSRS state");
};
const grade=(rating:RecallRating):Grade=>rating as Grade;
const costAdrDefinition=defineScheduler({model:FSRS7Model,chrono:dateChrono}).use(
 schedulerCostAdrMiddleware,schedulerFuzzingMiddleware,schedulerStatsMiddleware,
 schedulerScheduledDaysMiddleware,schedulerLearningStepsMiddleware,
 schedulerMaximumIntervalMiddleware,schedulerMonotonicIntervalMiddleware
);
const policy=(v:RetentionPolicy)=>{if(v!=="fixed"&&v!=="cost-adr")throw Error("Invalid retention policy");return v;};
const leechAction=(v:LeechAction)=>{if(v!=="remediate"&&v!=="suspend")throw Error("Invalid leech action");return v;};

export async function createRevisionScheduler(options:RevisionSchedulerOptions={}):Promise<RevisionSchedulerPort>{
 const retentionPolicy=policy(options.retentionPolicy??"fixed");
 const desiredRetention=options.desiredRetention??FSRS_DEFAULT_DESIRED_RETENTION;
 if(!Number.isFinite(desiredRetention)||desiredRetention<=0||desiredRetention>=1)
   throw Error("Desired retention must be between 0 and 1");
 const costAdrGoalWeight=options.costAdrGoalWeight??FSRS_DEFAULT_COST_ADR_GOAL_WEIGHT;
 if(!Number.isFinite(costAdrGoalWeight)||costAdrGoalWeight<0||costAdrGoalWeight>1024)
   throw Error("Cost-ADR goal weight must be between 0 and 1024");
 const enableFuzz=options.enableFuzz??true;
 const leechThreshold=options.leechThreshold??FSRS_DEFAULT_LEECH_THRESHOLD;
 if(!Number.isSafeInteger(leechThreshold)||leechThreshold<1)throw Error("Leech threshold must be a positive integer");
 const action=leechAction(options.leechAction??"remediate");
 const weights=options.weights?Array.from(checkFSRS7Parameters(options.weights)):undefined;
 const scheduler:FsrsScheduler<"FSRS-7">=retentionPolicy==="cost-adr"
  ?costAdrDefinition.create({config:{
    weights:weights??FSRS7_DEFAULT_WEIGHTS,fractionalDays:true,
    costAdrPolicy:COST_ADR_DEFAULT_POLICY,goalCostWeight:costAdrGoalWeight,
    enableFuzz,maximumInterval:36500,clearStatsOnForget:true,
    enableShortTerm:true,learningSteps:["1m","10m"],relearningSteps:["10m"],
    graduatingInterval:1,allowModelOverride:true
   }}) as unknown as FsrsScheduler<"FSRS-7">
  :await DefaultScheduler<"FSRS-7">({
    version:"FSRS-7",...(weights?{weights}:{}),desiredRetention,
    enableShortTerm:true,learningSteps:["1m","10m"],relearningSteps:["10m"],
    graduatingInterval:1,allowModelOverride:true,enableFuzz,maximumInterval:36500,
    clearStatsOnForget:true
   });
 const leechStatus=(lapses:number):RevisionLeechStatus=>
   lapses<leechThreshold?"normal":action==="suspend"?"suspended":"remediation";
 const schedule=(card:DefaultSchedulerCard<"FSRS-7">):RevisionSchedule=>({
   dueAt:new Date(card.dueAt),scheduledDays:card.scheduledDays,state:stateName(card.state),
   reps:card.reps,lapses:card.lapses,learningStep:card.learningStep,stability:card.stability,
   stabilityFast:card.stabilityFast,difficulty:card.difficulty,
   lastReviewAt:card.lastReviewAt?new Date(card.lastReviewAt):null,leechStatus:leechStatus(card.lapses)
 });
 const replay=(id:string,createdAt:string,reviews:readonly ReviewObservation[])=>{
   let card=scheduler.newCard({cardId:id,now:new Date(createdAt)});
   for(const review of reviews)card=scheduler.review({card,grade:grade(review.rating),now:new Date(review.at)}).card;
   return card;
 };
 const configuration={
   model:"FSRS-7" as const,packageVersion:"6.0.0" as const,retentionPolicy,desiredRetention,
   costAdrGoalWeight,enableShortTerm:true as const,learningSteps:["1m","10m"] as const,
   relearningSteps:["10m"] as const,graduatingInterval:1 as const,allowModelOverride:true as const,
   enableFuzz,maximumInterval:36500 as const,clearStatsOnForget:true as const,
   leechThreshold,leechAction:action,weights:weights?"FSRS-7-custom" as const:"FSRS-7-default" as const
 };
 return {
   provider:FSRS_PROVIDER,configuration,
   replay(id,createdAt,reviews){return schedule(replay(id,createdAt,reviews));},
   inspect(id,createdAt,reviews,at):RevisionSnapshot{
     const card=replay(id,createdAt,reviews),when=new Date(at);
     const elapsed=card.lastReviewAt?Math.max(0,(when.getTime()-card.lastReviewAt.getTime())/86_400_000):0;
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
