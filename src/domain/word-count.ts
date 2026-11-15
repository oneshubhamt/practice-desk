import type {AttemptMode} from "./attempt.ts";

export const WORD_COUNT_POLICIES=["auto","shown","hidden"] as const;
export type WordCountPolicy=(typeof WORD_COUNT_POLICIES)[number];
export const WORD_COUNT_OVERRIDES=["shown","hidden"] as const;
export type WordCountOverride=(typeof WORD_COUNT_OVERRIDES)[number];
export type WordCountBand="normal"|"caution"|"warning"|"over";

export function countWords(text:string):number{
 const trimmed=text.trim();
 return trimmed?trimmed.split(/\s+/u).length:0;
}

export function wordCountBand(count:number,limit:number):WordCountBand{
 if(count>limit)return "over";
 const ratio=count/limit;
 if(ratio>=0.9)return "warning";
 if(ratio>=0.8)return "caution";
 return "normal";
}

export function shouldShowWordCount(policy:WordCountOverride|undefined,mode:AttemptMode):boolean{
 if(policy==="shown")return true;
 if(policy==="hidden")return false;
 return mode!=="exam-simulation";
}
