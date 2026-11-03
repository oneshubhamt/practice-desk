/** Future P47-6 boundary. Verified FSRS-7 implementation is not changed by P47-5A. */
export type RecallRating=1|2|3|4;
export interface DatedRecall{readonly at:string;readonly rating:RecallRating}
export interface RevisionSchedulerPort{
  readonly provider:string;
  readonly algorithmVersion:string;
  dueAt(card:{readonly id:string;readonly createdAt:string;readonly reviews:readonly DatedRecall[]}):Promise<string>;
  validateNext(card:{readonly id:string;readonly createdAt:string;readonly reviews:readonly DatedRecall[]},
    next:DatedRecall):Promise<void>;
}
