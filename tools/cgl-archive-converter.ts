/** Archive-only SSC CGL conversion witness.
 * Runtime/build code consumes canonical ExamPackage files; this helper exists only
 * to prove that the materialized packages remain byte-for-byte equivalent to
 * the preserved historical source/patch/solution corpus.
 */
import {importCglBank} from "../src/content/import-cgl.ts";
import {sha256} from "../src/domain/hash.ts";
import type {SourcePaperBank,ReviewPatchBank} from "../src/content/schema.js";
import type {StimulusDefinition,ImageAsset} from "../src/domain/question.js";
import type {ExamId} from "../src/domain/ids.js";
import type {ExamPackage} from "../src/domain/exam-package.ts";

export function archiveCglPackages(
 sources:SourcePaperBank,
 patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>={}
):ExamPackage[]{
 const editions=importCglBank(sources,patches);
 return editions.map(({paper,key,questions})=>{
  const source=sources[paper.paperId];
  if(!source)throw Error("Missing archived CGL source");
  const assets:ImageAsset[]=[],stimuli:StimulusDefinition[]=[];
  const explanations:Record<string,string>={};
  const patchMap=paper.edition==="reviewed"?patches[paper.paperId]??{}:{};
  for(const [id,text] of Object.entries(source.passages))
   stimuli.push({id:`${paper.paperId}:passage:${id}` as StimulusDefinition["id"],kind:"passage",text});
  for(const question of questions){
   const n=Number(question.questionId.split(":").at(-1));
   const original=source.questions.find(q=>q.n===n)!;
   const merged={...original,...(patchMap[String(n)]??{})};
   const explanation=merged.explanation||solutions[paper.paperId]?.[String(n)]||"";
   if(explanation)explanations[question.id]=explanation;
   const asImage=(id:string,uri:string,altText:string):ImageAsset=>({
    id:id as ImageAsset["id"],
    mediaType:(uri.match(/^data:(image\/[a-z]+);/)?.[1]??"image/webp") as ImageAsset["mediaType"],
    dataUri:uri,
    contentHash:sha256(Uint8Array.from(atob(uri.slice(uri.indexOf(",")+1)),char=>char.charCodeAt(0))) as ImageAsset["contentHash"],
    altText
   });
   if(merged.images.stem)assets.push(asImage(`${paper.paperId}:q:${n}:stem`,merged.images.stem,"Diagram for question "+n));
   merged.images.options?.forEach((uri,i)=>{
    if(uri)assets.push(asImage(`${paper.paperId}:q:${n}:option:${i}`,uri,
      "Image for option "+String.fromCharCode(65+i)+" of question "+n));
   });
  }
  return {format:"practice-desk-exam",version:1,examId:"ssc-cgl" as ExamId,
   title:`${source.name} · ${paper.edition==="reviewed"?"Reviewed":"Original"}`,
   paper,answerKey:key,questions,stimuli,assets,explanations};
 });
}
