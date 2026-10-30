import type { GenericAttempt } from "./exam-package.ts";
import { scoreableMaximum } from "../engine/score-ceiling.ts";

/** The denominator is derived from this attempt's frozen paper/key, never from
 * a library paper, nominal question count or an arbitrary exam convention.
 * Automated pending written assessments do not inflate the maximum.
 */
export function frozenScoreSummary(attempt:GenericAttempt):{
 readonly earned:number;readonly maximum:number;readonly decimals:number;readonly text:string
}|null{
 if(attempt.finishedAt===null||!attempt.result)return null;
 const maximum=scoreableMaximum(attempt.frozen.paper,attempt.frozen.key,attempt.frozen.questions);
 const decimals=attempt.frozen.paper.scoring.decimalPlaces??2;
 const earned=attempt.result.snapshot.earnedMarks;
 return {earned,maximum,decimals,
   text:earned.toFixed(decimals)+" / "+maximum.toFixed(decimals)+" marks"};
}
