import type {AttemptMode} from "./attempt.ts";
import type {PaperRevision} from "./exam.ts";

export type TimeEnforcement="hard"|"advisory";

export function timeEnforcementForMode(mode:AttemptMode):TimeEnforcement{
 if(mode==="exam-simulation")return "hard";
 if(mode==="full-paper-practice"||mode==="section-practice"||mode==="custom-practice")
   return "advisory";
 throw new Error("Unknown attempt mode");
}

export function sectionTimeBudgetMs(paper:PaperRevision,sectionIndex:number):number|null{
 if(paper.timing.kind!=="sectional")return null;
 const sectionId=paper.sections[sectionIndex]?.id;
 return paper.timing.sectionLimits.find(row=>row.sectionId===sectionId)?.durationMs??null;
}

export function paperTimeBudgetMs(paper:PaperRevision):number|null{
 if(paper.timing.kind==="untimed")return null;
 if(paper.timing.kind==="whole-paper")return paper.timing.durationMs;
 const limits=paper.sections.map((_,index)=>sectionTimeBudgetMs(paper,index));
 return limits.some(value=>value===null)?null:limits.reduce<number>((sum,value)=>sum+(value??0),0);
}

export const overtimeMs=(elapsedMs:number,budgetMs:number|null):number=>
 budgetMs===null?0:Math.max(0,elapsedMs-budgetMs);
