import type {ExamPackage} from "../domain/exam-package.ts";
import type {PreinstalledExamFamilyDescriptor} from "./preinstalled-exams.ts";

export type ExamFamilyOrigin="included"|"imported";
export type ExamFamily={
 readonly id:string;
 readonly title:string;
 readonly imported:boolean;
 readonly origin:ExamFamilyOrigin;
 readonly examId:string;
 readonly includedPaperIds:readonly string[];
 readonly currentPaperId?:string;
 readonly papers:readonly ExamPackage[];
};

export function familyIdFor(
 bundle:ExamPackage,
 includedFamilies:readonly PreinstalledExamFamilyDescriptor[]=[]
):string{
 const included=includedFamilies.find(f=>f.paperIds.includes(bundle.paper.id));
 return included?"included:"+included.id:"imported:"+bundle.examId;
}

export function examFamilyCatalog(
 packages:Iterable<ExamPackage>,
 includedFamilies:readonly PreinstalledExamFamilyDescriptor[]=[]
):ExamFamily[]{
 const definitions=new Map(includedFamilies.map(f=>[f.id,f]));
 const families=new Map<string,{id:string;title:string;imported:boolean;origin:ExamFamilyOrigin;
  examId:string;includedPaperIds:readonly string[];currentPaperId?:string;papers:ExamPackage[]}>();
 for(const p of packages){
  const id=familyIdFor(p,includedFamilies);
  let family=families.get(id);
  if(!family){
   const includedId=id.startsWith("included:")?id.slice("included:".length):null;
   const definition=includedId?definitions.get(includedId):undefined;
   const origin:ExamFamilyOrigin=definition?"included":"imported";
   family={id,title:definition?.title??"Imported · "+p.examId,imported:origin==="imported",origin,
    examId:p.examId,includedPaperIds:definition?.paperIds??[],
    ...(definition?.currentPaperId?{currentPaperId:definition.currentPaperId}:{}),papers:[]};
   families.set(id,family);
  }
  family.papers.push(p);
 }
 const result=[...families.values()].sort((a,b)=>
  (a.origin==="included"?0:1)-(b.origin==="included"?0:1)||
  a.title.localeCompare(b.title)||a.examId.localeCompare(b.examId));
 for(const family of result)family.papers.sort((a,b)=>
  a.paper.paperId.localeCompare(b.paper.paperId)||a.paper.revision-b.paper.revision||
  a.paper.edition.localeCompare(b.paper.edition));
 return result;
}

export function pairedEdition(
 family:ExamFamily,paper:ExamPackage,edition:"source"|"reviewed"
):ExamPackage|undefined{
 const candidates=family.papers.filter(p=>p.examId===paper.examId&&
  p.paper.paperId===paper.paper.paperId&&p.paper.edition===edition);
 if(paper.paper.edition==="reviewed"&&edition==="source")
  return candidates.find(p=>p.paper.id===paper.paper.sourcePaperRevisionId&&
    p.answerKey.id===paper.paper.sourceAnswerKeyRevisionId);
 if(paper.paper.edition==="source"&&edition==="reviewed"){
  const pinned=candidates.filter(p=>p.paper.sourcePaperRevisionId===paper.paper.id&&
    p.paper.sourceAnswerKeyRevisionId===paper.answerKey.id);
  return pinned.length===1?pinned[0]:undefined;
 }
 return candidates.length===1?candidates[0]:undefined;
}

/** Exact opposite-edition counterpart only; the current paper never counts as its own pair. */
export function pairedCounterpart(family:ExamFamily,paper:ExamPackage):ExamPackage|undefined{
 if(paper.paper.edition==="source")return pairedEdition(family,paper,"reviewed");
 if(paper.paper.edition==="reviewed")return pairedEdition(family,paper,"source");
 return undefined;
}
