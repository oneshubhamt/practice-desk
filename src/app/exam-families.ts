import type { ExamPackage } from "../domain/exam-package.ts";

/** Source origin is part of identity: an imported bank called "ssc-cgl" must
 * never masquerade as the built-in verified CGL family. */
export const BUILTIN_CGL_FAMILY = "builtin:ssc-cgl";
export type ExamFamily = {
 readonly id:string;
 readonly title:string;
 readonly imported:boolean;
 readonly examId:string;
 readonly papers:readonly ExamPackage[];
};

export function familyIdFor(bundle:ExamPackage,builtinPaperIds:ReadonlySet<string>):string{
 return builtinPaperIds.has(bundle.paper.id)&&bundle.examId==="ssc-cgl"?
   BUILTIN_CGL_FAMILY:"imported:"+bundle.examId;
}

export function examFamilyCatalog(
 packages:Iterable<ExamPackage>,builtinPaperIds:ReadonlySet<string>
):ExamFamily[]{
 const families=new Map<string,{id:string;title:string;imported:boolean;examId:string;papers:ExamPackage[]}>();
 for(const p of packages){
  const id=familyIdFor(p,builtinPaperIds);
  let f=families.get(id);
  if(!f){
   const builtin=id===BUILTIN_CGL_FAMILY;
   f={id,title:builtin?"SSC CGL · included papers":"Imported · "+p.examId,
     imported:!builtin,examId:p.examId,papers:[]};
   families.set(id,f);
  }
  f.papers.push(p);
 }
 const result=[...families.values()].sort((a,b)=>Number(a.imported)-Number(b.imported)||
   a.examId.localeCompare(b.examId));
 for(const f of result)f.papers.sort((a,b)=>a.paper.paperId.localeCompare(b.paper.paperId)||
   a.paper.revision-b.paper.revision||a.paper.edition.localeCompare(b.paper.edition));
 return result;
}

/** Resolve editions only through exact hash-bound Source lineage.
 * No unbound, positional or single-candidate fallback is permitted. */
export function pairedEdition(
 family:ExamFamily,paper:ExamPackage,edition:"source"|"reviewed"
):ExamPackage|undefined{
 const candidates=family.papers.filter(p=>p.examId===paper.examId&&
   p.paper.paperId===paper.paper.paperId&&p.paper.edition===edition);
 if(paper.paper.edition==="reviewed"&&edition==="source"){
   return candidates.find(p=>p.paper.id===paper.paper.sourcePaperRevisionId&&
     p.answerKey.id===paper.paper.sourceAnswerKeyRevisionId);
 }
 if(paper.paper.edition==="source"&&edition==="reviewed"){
   const pinned=candidates.filter(p=>p.paper.sourcePaperRevisionId===paper.paper.id&&
     p.paper.sourceAnswerKeyRevisionId===paper.answerKey.id);
   return pinned.length===1?pinned[0]:undefined;
 }
 return candidates.length===1?candidates[0]:undefined;
}
