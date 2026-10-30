import type { GenericAttempt } from "../app/exam-package.ts";
import { scoreableMaximum } from "../engine/score-ceiling.ts";

export interface ComparableScoreTrend{
 readonly label:string;
 readonly count:number;
 readonly points:readonly {at:number;percent:number;marks:number;max:number}[];
}
/** Score trends must never join different key revisions, content or practice modes. */
export function comparableScoreTrends(attempts:readonly GenericAttempt[]):ComparableScoreTrend[]{
 const groups=new Map<string,{label:string;points:{at:number;percent:number;marks:number;max:number}[]}>();
 for(const a of attempts){
   if(a.finishedAt===null||!a.result||a.frozen.paper.paperId.startsWith("notebook-revision:"))continue;
   const max=scoreableMaximum(a.frozen.paper,a.frozen.key,a.frozen.questions);
   if(max<=0)continue;
   const identity=[a.frozen.snapshot.examId,a.frozen.paper.id,
     a.frozen.key.contentHash,a.frozen.snapshot.mode].join("|");
   const group=groups.get(identity)??{
     label:a.frozen.paper.paperId+" · "+a.frozen.paper.edition+" · "+a.frozen.snapshot.mode,
     points:[]};
   group.points.push({at:a.finishedAt,percent:100*a.result.snapshot.earnedMarks/max,
     marks:a.result.snapshot.earnedMarks,max});
   groups.set(identity,group);
 }
 return [...groups.values()].map(x=>({label:x.label,count:x.points.length,
   points:x.points.sort((a,b)=>a.at-b.at)}))
   .sort((a,b)=>(b.points.at(-1)?.at??0)-(a.points.at(-1)?.at??0));
}
export function adjustedHistoryMetrics(attempts:readonly GenericAttempt[]):{
 readonly papersPractised:number;readonly bestAdjustedPercent:number|null
}{
 const complete=attempts.filter(a=>a.finishedAt!==null&&a.result);
 const papersPractised=new Set(complete
   .filter(a=>!a.frozen.paper.paperId.startsWith("notebook-revision:"))
   .map(a=>a.frozen.snapshot.examId+"|"+a.frozen.paper.paperId)).size;
 const scores=complete.map(a=>{
   const max=scoreableMaximum(a.frozen.paper,a.frozen.key,a.frozen.questions);
   return max>0?100*a.result!.snapshot.earnedMarks/max:null;
 }).filter((n):n is number=>n!==null);
 return {papersPractised,bestAdjustedPercent:scores.length?Math.max(...scores):null};
}
