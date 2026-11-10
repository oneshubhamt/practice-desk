/** Application-owned revision scheduling boundary; no FSRS vendor types escape.
 * Exactly the explicit review log is authoritative; schedules and memory state are derived.
 */
export type RecallRating=1|2|3|4;
export type ReviewObservation={readonly at:string;readonly rating:RecallRating};
export type RevisionMemoryState="new"|"learning"|"review"|"relearning";
export interface RevisionSchedule{
 readonly dueAt:Date;
 readonly scheduledDays:number;
 readonly state:RevisionMemoryState;
 readonly reps:number;
 readonly lapses:number;
 readonly learningStep:number;
 readonly stability:number;
 readonly stabilityFast:number;
 readonly difficulty:number;
 readonly lastReviewAt:Date|null;
}
export interface RevisionSnapshot extends RevisionSchedule{
 /** Estimated probability of recall at the inspection time; null before the first review. */
 readonly retrievability:number|null;
}
export interface RevisionPreview extends RevisionSchedule{
 readonly rating:RecallRating;
}
export interface RevisionSchedulerConfiguration{
 readonly model:"FSRS-7";
 readonly packageVersion:"6.0.0";
 readonly desiredRetention:number;
 readonly enableShortTerm:true;
 readonly learningSteps:readonly ["1m","10m"];
 readonly relearningSteps:readonly ["10m"];
 readonly graduatingInterval:1;
 readonly allowModelOverride:true;
 readonly enableFuzz:boolean;
 readonly maximumInterval:36500;
 readonly clearStatsOnForget:true;
 readonly weights:"FSRS-7-default"|"FSRS-7-custom";
}
export interface RevisionSchedulerOptions{
 readonly desiredRetention?:number;
 readonly enableFuzz?:boolean;
 /** Exactly 34 FSRS-7 weights when supplied. Omit to use the current FSRS-7 preset. */
 readonly weights?:readonly number[];
}
export interface RevisionSchedulerPort{
 readonly provider:string;
 readonly configuration:RevisionSchedulerConfiguration;
 replay(id:string,createdAt:string,reviews:readonly ReviewObservation[]):RevisionSchedule;
 inspect(id:string,createdAt:string,reviews:readonly ReviewObservation[],at:string):RevisionSnapshot;
 preview(id:string,createdAt:string,reviews:readonly ReviewObservation[],at:string):readonly RevisionPreview[];
 assertCanRate(id:string,createdAt:string,reviews:readonly ReviewObservation[],
   rating:RecallRating,at:string):void;
}
