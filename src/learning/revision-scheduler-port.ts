/** Application-owned revision scheduling boundary; no FSRS vendor types escape.
 * Exactly the explicit review log is authoritative; schedules are derived.
 */
export type RecallRating=1|2|3|4;
export type ReviewObservation={readonly at:string;readonly rating:RecallRating};
export interface RevisionSchedule{readonly dueAt:Date;}
export interface RevisionSchedulerPort{
 readonly provider:string;
 replay(id:string,createdAt:string,reviews:readonly ReviewObservation[]):RevisionSchedule;
 assertCanRate(id:string,createdAt:string,reviews:readonly ReviewObservation[],
   rating:RecallRating,at:string):void;
}
