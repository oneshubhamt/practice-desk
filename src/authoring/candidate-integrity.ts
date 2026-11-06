/** P60-C candidate-only question leakage checks reused by canonical authoring QA.
 * Detect high-confidence embedded answer labels; heuristics are review warnings,
 * never claims that the intended answer can be inferred with certainty.
 */
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {publicationPlainText} from "./authoring-publisher.ts";

export type CandidateIntegrityIssue={
 readonly questionId:string;
 readonly field:string;
 readonly code:"candidate-answer-leak"|"candidate-unintended-clue";
 readonly severity:"error"|"warning";
 readonly message:string;
 readonly suggestion:string;
};
const explicitAnswer=/(?:^|[.!?;:\n\s])(?:the\s+)?(?:(?:correct|right)\s+)?(?:answer|option|key)\s*(?:is|=|:|→)\s*(?:(?:option|choice)\s*)?(?:[A-D](?![A-Za-z])|true\b|false\b|\d+(?:\.\d+)?\b)/iu;
const exposedAnswerLabel=/(?:^|[.!?;:\\n]\\s*)(?:the\\s+)?(?:correct\\s+answer|answer\\s+key|answer|solution)\\s*(?:is|:|=)\\s*\\S+/iu;\nconst correctMarker=/(?:^\s*[✓✔✅☑]\s+\S|\[(?:correct|answer|key)\]|\((?:correct\s+answer|correct\s+option)\)|\banswer\s+key\s*:\s*[A-D]\b)/iu;
const unintendedClue=/\b(?:follows?\s+(?:the\s+)?pattern\s+of|(?:the\s+)?pattern\s+is|(?:each|every)\s+(?:successive\s+)?term\s+(?:is\s+)?(?:obtained|formed)\s+by|since\s+the\s+(?:answer|correct\s+option)\s+is)\b/iu;
const visible=(doc:RichDocument):string=>publicationPlainText(doc);
function referencedAssets(doc:RichDocument):Set<string>{
 const found=new Set<string>();
 const visit=(x:unknown):void=>{
  if(x===null||typeof x!=="object")return;
  if(Array.isArray(x)){for(const y of x)visit(y);return;}
  const row=x as Record<string,unknown>;
  if(typeof row.assetId==="string")found.add(row.assetId);
  for(const v of Object.values(row))visit(v);
 };
 visit(doc);
 return found;
}
export function candidateFields(draft:AuthoringDraft,q:AuthoringQuestion):readonly {field:string;text:string}[]{
 const out:{field:string;text:string}[]=[];
 const assets=new Set<string>();
 const append=(field:string,doc:RichDocument)=>{
  out.push({field,text:visible(doc)});
  for(const id of referencedAssets(doc))assets.add(id);
 };
 append("prompt",q.prompt);
 if(q.kind==="single-choice"||q.kind==="multiple-select")
  q.options.forEach((v,i)=>append("options["+i+"]",v));
 if(q.kind==="matching"){
  q.leftItems.forEach((v,i)=>append("leftItems["+i+"]",v));
  q.rightItems.forEach((v,i)=>append("rightItems["+i+"]",v));
 }
 const stimulus=draft.stimuli?.find(s=>s.id===q.stimulusRef);
 if(stimulus){
  if(stimulus.title)out.push({field:"stimulus.title",text:stimulus.title});
  if(stimulus.kind==="passage"||stimulus.kind==="case"){
   out.push({field:"stimulus.text",text:stimulus.text});
   if(stimulus.richText)for(const id of referencedAssets(stimulus.richText))assets.add(id);
  }else if(stimulus.kind==="table"){
   stimulus.columns.forEach((v,i)=>out.push({field:"stimulus.columns["+i+"]",text:v}));
   stimulus.rows.forEach((row,i)=>row.forEach((v,j)=>
    out.push({field:"stimulus.rows["+i+"]["+j+"]",text:v})));
  }else if(stimulus.kind==="image"||stimulus.kind==="chart"){
   out.push({field:"stimulus.altText",text:stimulus.altText});
   if(stimulus.caption)out.push({field:"stimulus.caption",text:stimulus.caption});
   assets.add(stimulus.assetId);
  }
 }
 for(const asset of draft.assets){
  if(assets.has(asset.id))out.push({field:"media.altText["+asset.id+"]",text:asset.altText??""});
 }
 return out;
}
export function inspectCandidateIntegrity(draft:AuthoringDraft):readonly CandidateIntegrityIssue[]{
 const issues:CandidateIntegrityIssue[]=[];
 for(const q of draft.questions){
  // An exact copy of the keyed choice inside the stem is a possible
  // giveaway, but may be a legitimate quoted example: warning only.
  if(q.kind==="single-choice"&&/^[A-D]$/i.test(q.answer.trim())){
   const index="ABCD".indexOf(q.answer.trim().toUpperCase());
   const keyed=visible(q.options[index]!);
   const stem=visible(q.prompt);
   if(keyed.trim().length>=12&&stem.toLocaleLowerCase("en")
      .includes(keyed.trim().toLocaleLowerCase("en"))){
    issues.push({questionId:q.id,field:"prompt",code:"candidate-unintended-clue",
     severity:"warning",message:"Question stem repeats the entire keyed response text, which may unintentionally reveal the answer.",
     suggestion:"Ask a blind reviewer whether the keyed phrase belongs in the stimulus; revise if it bypasses the intended reasoning."});
   }
  }
  for(const {field,text} of candidateFields(draft,q)){
   if(explicitAnswer.test(text)||exposedAnswerLabel.test(text)||(field.startsWith("options")&&correctMarker.test(text))){
    issues.push({questionId:q.id,field,code:"candidate-answer-leak",severity:"error",
     message:"Candidate-visible content contains an explicit answer/key label or marked correct option.",
     suggestion:"Remove the answer/key/solution indicator from candidate content; keep it in the protected explanation or review data."});
   }else if(unintendedClue.test(text)){
    issues.push({questionId:q.id,field,code:"candidate-unintended-clue",severity:"warning",
     message:"Candidate-visible wording appears to disclose the solution method or underlying pattern.",
     suggestion:"Review the blind candidate view and remove unintended reasoning clues without changing the tested skill."});
   }
  }
 }
 return issues;
}
