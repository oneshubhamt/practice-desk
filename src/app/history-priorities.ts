import type { GenericAttempt } from "./exam-package.ts";
import { sectionScoreSummaries } from "../engine/score-ceiling.ts";

export interface MarksPriorityRow {
 readonly title:string;
 readonly sections:number;
 readonly attempted:number;
 readonly correct:number;
 readonly incorrect:number;
 readonly earned:number;
 readonly eligibleMax:number;
 /** Marks / actually eligible frozen maximum, not a difficulty-adjusted score. */
 readonly percent:number;
 readonly accuracy:number|null;
}
export interface CrossPaperMarksPriorities {
 readonly examId:string;
 readonly edition:string;
 readonly mode:string;
 readonly attempts:number;
 readonly distinctPapers:number;
 readonly rows:readonly MarksPriorityRow[];
}

/** Match exam identity, edition, practice mode, scoring scheme, section names,
 * section ordering and question counts. Do not mix unrelated exams, full and
 * sectional attempts, or scoring systems just because sections share a name.
 *
 * Source and reviewed editions are deliberately different cohorts; an
 * individual item's editorial exclusion still alters its own frozen maximum.
 */
function formatSignature(a:GenericAttempt):string{
 const p=a.frozen.paper;
 return JSON.stringify({
   exam:a.frozen.snapshot.examId,edition:p.edition,mode:a.frozen.snapshot.mode,
   sectionStructure:p.sections.map(s=>({title:s.title,count:s.questionRevisionIds.length,
     scoringOverride:s.scoringOverride??null})),
   marking:{defaultRule:p.scoring.defaultRule,byQuestionKind:p.scoring.byQuestionKind??null}
 });
}
/** V11-compatible cross-paper marks lens, with stronger cohort safeguards.
 * Select at most eight newest completed multi-section/full-paper records from a
 * defensible cohort, and require two distinct underlying papers in that set.
 * Do not use this to claim normalized difficulty or predictive rank.
 */
export function crossPaperMarksPriorities(attempts:readonly GenericAttempt[]):CrossPaperMarksPriorities|null{
 const groups=new Map<string,GenericAttempt[]>();
 const sorted=attempts.filter(a=>a.finishedAt!==null&&a.result!==undefined&&
   !a.frozen.paper.paperId.startsWith("notebook-revision:")&&
   a.frozen.snapshot.mode!=="section-practice"&&
   a.frozen.paper.sections.length>=2)
   .sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0)||b.startedAt-a.startedAt);
 for(const a of sorted){
   const id=formatSignature(a);
   const group=groups.get(id)??[];
   group.push(a);groups.set(id,group);
 }
 for(const group of groups.values()){
   const chosen=group.slice(0,8);
   const papers=new Set(chosen.map(a=>a.frozen.paper.paperId));
   if(chosen.length<2||papers.size<2)continue;
   const aggregate=new Map<string,{
     title:string;sections:number;attempted:number;correct:number;incorrect:number;earned:number;eligibleMax:number
   }>();
   for(const attempt of chosen){
     const sections=sectionScoreSummaries(attempt,attempt.result!);
     for(let index=0;index<sections.length;index++){
       const s=sections[index]!;
       if(s.eligibleMax<=0)continue;
       const key=String(index);
       const prior=aggregate.get(key)??{title:s.title,sections:0,attempted:0,correct:0,incorrect:0,earned:0,eligibleMax:0};
       aggregate.set(key,{
         title:s.title,sections:prior.sections+1,
         attempted:prior.attempted+s.attempted,
         correct:prior.correct+s.correct,incorrect:prior.incorrect+s.incorrect,
         earned:prior.earned+s.marks,eligibleMax:prior.eligibleMax+s.eligibleMax
       });
     }
   }
   const rows=[...aggregate.values()].filter(x=>x.eligibleMax>0).map(x=>({
     ...x,percent:100*x.earned/x.eligibleMax,
     accuracy:x.correct+x.incorrect?100*x.correct/(x.correct+x.incorrect):null
   })).sort((a,b)=>a.percent-b.percent||a.title.localeCompare(b.title));
   if(!rows.length)continue;
   return {examId:chosen[0]!.frozen.snapshot.examId,edition:chosen[0]!.frozen.paper.edition,
     mode:chosen[0]!.frozen.snapshot.mode,attempts:chosen.length,
     distinctPapers:papers.size,rows};
 }
 return null;
}
