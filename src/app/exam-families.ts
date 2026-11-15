import type { ExamPackage } from "../domain/exam-package.ts";
import type {PreinstalledExamFamilyDescriptor} from "./preinstalled-exams.ts";
export const BUILTIN_CGL_FAMILY = "builtin:ssc-cgl";
export type ExamFamilyOrigin="builtin"|"included"|"imported";
export type ExamFamily={readonly id:string;readonly title:string;readonly imported:boolean;readonly origin:ExamFamilyOrigin;readonly examId:string;readonly includedPaperIds:readonly string[];readonly currentPaperId?:string;readonly papers:readonly ExamPackage[];};
export function familyIdFor(bundle:ExamPackage,builtinPaperIds:ReadonlySet<string>,includedFamilies:readonly PreinstalledExamFamilyDescriptor[]=[]):string{
 if(builtinPaperIds.has(bundle.paper.id)&&bundle.examId==="ssc-cgl")return BUILTIN_CGL_FAMILY;
 const included=includedFamilies.find(f=>f.examId===bundle.examId);
 return included?"included:"+included.id:"imported:"+bundle.examId;
}
export function examFamilyCatalog(packages:Iterable<ExamPackage>,builtinPaperIds:ReadonlySet<string>,includedFamilies:readonly PreinstalledExamFamilyDescriptor[]=[]):ExamFamily[]{
 const definitions=new Map(includedFamilies.map(f=>[f.examId,f]));
 const families=new Map<string,{id:string;title:string;imported:boolean;origin:ExamFamilyOrigin;examId:string;includedPaperIds:readonly string[];currentPaperId?:string;papers:ExamPackage[]}>();
 for(const p of packages){
  const id=familyIdFor(p,builtinPaperIds,includedFamilies);let f=families.get(id);
  if(!f){const builtin=id===BUILTIN_CGL_FAMILY,definition=definitions.get(p.examId),origin:ExamFamilyOrigin=builtin?"builtin":definition?"included":"imported";
   f={id,title:builtin?"SSC CGL":definition?.title??"Imported · "+p.examId,imported:origin==="imported",origin,examId:p.examId,includedPaperIds:definition?.paperIds??[],...(definition?.currentPaperId?{currentPaperId:definition.currentPaperId}:{}),papers:[]};families.set(id,f);}
  f.papers.push(p);
 }
 const rank=(o:ExamFamilyOrigin)=>o==="builtin"?0:o==="included"?1:2;
 const result=[...families.values()].sort((a,b)=>rank(a.origin)-rank(b.origin)||a.title.localeCompare(b.title)||a.examId.localeCompare(b.examId));
 for(const f of result)f.papers.sort((a,b)=>a.paper.paperId.localeCompare(b.paper.paperId)||a.paper.revision-b.paper.revision||a.paper.edition.localeCompare(b.paper.edition));
 return result;
}
export function pairedEdition(family:ExamFamily,paper:ExamPackage,edition:"source"|"reviewed"):ExamPackage|undefined{
 const candidates=family.papers.filter(p=>p.examId===paper.examId&&p.paper.paperId===paper.paper.paperId&&p.paper.edition===edition);
 if(paper.paper.edition==="reviewed"&&edition==="source")return candidates.find(p=>p.paper.id===paper.paper.sourcePaperRevisionId&&p.answerKey.id===paper.paper.sourceAnswerKeyRevisionId);
 if(paper.paper.edition==="source"&&edition==="reviewed"){const pinned=candidates.filter(p=>p.paper.sourcePaperRevisionId===paper.paper.id&&p.paper.sourceAnswerKeyRevisionId===paper.answerKey.id);return pinned.length===1?pinned[0]:undefined;}
 return candidates.length===1?candidates[0]:undefined;
}
