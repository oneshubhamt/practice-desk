export type RecallRating=1|2|3|4;
export type RevisionMemoryState="new"|"learning"|"review"|"relearning";
export type RetentionPolicy="fixed"|"cost-adr";
export type LeechAction="remediate"|"suspend";
export type RevisionLeechStatus="normal"|"remediation"|"suspended";
export interface ReviewObservation{
 readonly at:string;readonly rating:RecallRating;readonly durationMs:number;readonly state:RevisionMemoryState;
}
export interface RevisionSchedule{
 readonly dueAt:Date;readonly scheduledDays:number;readonly state:RevisionMemoryState;
 readonly reps:number;readonly lapses:number;readonly learningStep:number;
 readonly stability:number;readonly stabilityFast:number;readonly difficulty:number;
 readonly lastReviewAt:Date|null;readonly leechStatus:RevisionLeechStatus;
}
export interface RevisionSnapshot extends RevisionSchedule{readonly retrievability:number|null;}
export interface RevisionPreview extends RevisionSchedule{readonly rating:RecallRating;}
export interface RevisionSchedulerConfiguration{
 readonly model:"FSRS-7";readonly packageVersion:"6.0.0";readonly retentionPolicy:RetentionPolicy;
 readonly desiredRetention:number;readonly costAdrGoalWeight:number;readonly enableShortTerm:true;
 readonly learningSteps:readonly ["1m","10m"];readonly relearningSteps:readonly ["10m"];
 readonly graduatingInterval:1;readonly allowModelOverride:true;readonly enableFuzz:boolean;
 readonly maximumInterval:36500;readonly clearStatsOnForget:true;readonly leechThreshold:number;
 readonly leechAction:LeechAction;readonly weights:"FSRS-7-default"|"FSRS-7-custom";
}
export interface RevisionSchedulerOptions{
 readonly retentionPolicy?:RetentionPolicy;readonly desiredRetention?:number;readonly costAdrGoalWeight?:number;
 readonly enableFuzz?:boolean;readonly leechThreshold?:number;readonly leechAction?:LeechAction;
 readonly weights?:readonly number[];
}
export interface RevisionSchedulerPort{
 readonly provider:string;readonly configuration:RevisionSchedulerConfiguration;
 replay(id:string,createdAt:string,reviews:readonly ReviewObservation[]):RevisionSchedule;
 inspect(id:string,createdAt:string,reviews:readonly ReviewObservation[],at:string):RevisionSnapshot;
 preview(id:string,createdAt:string,reviews:readonly ReviewObservation[],at:string):readonly RevisionPreview[];
 assertCanRate(id:string,createdAt:string,reviews:readonly ReviewObservation[],rating:RecallRating,at:string):void;
}
