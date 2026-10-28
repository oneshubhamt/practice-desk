export type Choice='a'|'b'|'c'|'d';
export type EditorialStatus='ok'|'caution'|'invalid';
export interface SourceQuestion {
 n:number;stem:string;opts:readonly [string,string,string,string];key:Choice;
 status?:EditorialStatus;original?:Choice;sourcePage?:number;images?:unknown;
}
export interface SourcePaper {id:string;name:string;date?:string;questions:SourceQuestion[];}
export type SourcePaperBank=Record<string,SourcePaper>;
export type QuestionPatch=Partial<SourceQuestion>&{note?:string};
export type ReviewPatchBank=Record<string,Record<string,QuestionPatch>>;
export type SolutionBank=Record<string,Record<string,string>>;
