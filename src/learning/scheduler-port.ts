/** Planned P47-6 adapter contract, NOT a replacement of current FSRS-7. */
export type RecallGrade=1|2|3|4;
export interface RecallReview{
 readonly at:string;
 readonly rating:RecallGrade;
}
export interface RevisionSchedulerPort{
 readonly provider:string;
 readonly algorithmVersion:string;
 dueAt(value:{
   readonly cardId:string;
   readonly createdAt:string;
   readonly reviews:readonly RecallReview[];
 }):Promise<string>;
 validateReview(value:{
   readonly cardId:string;
   readonly createdAt:string;
   readonly reviews:readonly RecallReview[];
   readonly next:RecallReview;
 }):Promise<void>;
}
