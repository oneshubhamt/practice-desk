/** P54 truthful read-only authoring preview.
 * Reuses the EXACT frozen exam response renderer and pre-start rule explainer;
 * never invent a scoring function, mutate a published package or mount a test.
 */
import type {AuthoringDraft,AuthoringQuestion} from "./authoring-draft.ts";
import type {ExamPackage} from "../app/exam-package.ts";
import type {QuestionContent,QuestionRevision,CandidateResponse,QuestionKind} from "../domain/question.ts";
import type {CorrectAnswer} from "../domain/answer-key.ts";
import {publicationPlainText} from "./authoring-publisher.ts";
import {examPreflight} from "../app/exam-preflight.ts";
import {stimulusHTML,renderQuestionPrompt,assetHTML,renderGenericControls} from "../app/question-content-view.ts";
import {escapeText} from "../app/html-escape.ts";
import {scoreAttempt} from "../engine/scoring.ts";

const letters=["A","B","C","D"] as const;
function answerDescription(answer:CorrectAnswer):string {
 switch(answer.kind){
  case "single-choice":return answer.optionId;
  case "multiple-select":return answer.optionIds.join(", ");
  case "true-false":return answer.value?"True":"False";
  case "numeric-entry":return answer.acceptedValues.join(", ")+
    (answer.absoluteTolerance?" (±"+answer.absoluteTolerance+" tolerance)":"");
  case "matching":return answer.pairs.map(p=>p.leftId.replace(/^L/,"")+"-"+p.rightId).join(", ");
  case "free-response":return "Manual evaluation · see the worked explanation or model response";
 }
}
const main=(pkg:ExamPackage,q:QuestionRevision,authorValidated:boolean):string=>{
 const entry=pkg.answerKey.entries.find(a=>a.questionRevisionId===q.id);
 const metadata=authorValidated?examPreflight(pkg):null;
 const section=pkg.paper.sections.find(s=>s.questionRevisionIds.includes(q.id));
 const parts=[
  '<div class="pd-author-preview-content"><h3>Read-only exam-style preview</h3>',
  '<p class="fine">'+(authorValidated?
   "The question, response controls and paper rules below are rendered from the exact validated publication package.":
   "Unvalidated draft layout only. Complete publication validation before trusting rules or answer-key evidence.")+
   ' No response is saved or scored in this preview.</p>',
  '<section class="pd-author-preview-question" aria-label="Read-only actual exam question layout">',
  '<p class="fine">'+escapeText(section?.title??"Draft section")+'</p>',
  stimulusHTML(pkg,q),renderQuestionPrompt(pkg,q),assetHTML(pkg,q.content.assetIds),
  '<div class="pd-author-preview-controls" inert aria-label="Inactive preview of candidate response widgets">'+
    renderGenericControls(pkg,q)+'</div></section>'
 ];
 if(metadata){
  parts.push('<section class="pd-author-effective-rules" aria-label="Author-only effective published rules">'+
   '<h4>Effective frozen examination rules</h4>'+
   '<p><b>Questions:</b> '+metadata.totalQuestions+
   ' · <b>Sections:</b> '+pkg.paper.sections.length+
   ' · <b>Automated eligible maximum:</b> '+metadata.maximum.toFixed(metadata.decimals)+'</p>'+
   '<p><b>Marking:</b> '+escapeText(metadata.ruleSummary)+'</p>'+
   '<h5>Timing and sectional progression</h5><ul>'+
   metadata.timingRules.map(s=>'<li>'+escapeText(s)+'</li>').join("")+'</ul>'+
   '<h5>Navigation and solution release</h5><ul>'+
   metadata.navigationRules.map(s=>'<li>'+escapeText(s)+'</li>').join("")+'</ul>'+
   '<h5>Actual section budget</h5><div class="scroll-table" role="region" tabindex="0" aria-label="Published section timing and question counts"><table><thead><tr><th>Section</th><th>Questions</th><th>Time</th></tr></thead><tbody>'+
   pkg.paper.sections.map(s=>{
    const t=pkg.paper.timing;
    const ms=t.kind==="sectional"?t.sectionLimits.find(x=>x.sectionId===s.id)?.durationMs:
      t.kind==="whole-paper"?t.durationMs:null;
    return '<tr><td>'+escapeText(s.title)+'</td><td>'+s.questionRevisionIds.length+
      '</td><td>'+(ms===null||ms===undefined?"Untimed":ms/60000+" min")+
      (t.kind==="whole-paper"?" (shared paper budget)":"")+'</td></tr>';
   }).join("")+'</tbody></table></div>'+
   (metadata.hasComponentScoring?
    '<p class="fine">Component-based partial scoring is evaluated by the same actual scorer; incorrect component totals are floored and capped by the frozen marking rule.</p>':"")+
   '</section>');
  const examples=authoringPartialCreditExamples(pkg).filter(e=>e.questionRevisionId===q.id);
  if(examples.length)parts.push('<section class="pd-author-partial-examples"><h4>Scored example responses (author-only)</h4><ul>'+
   examples.map(e=>'<li>'+escapeText(e.description)+
     ' → '+escapeText(e.verdict)+', <b>'+escapeText(String(e.marks))+' marks</b></li>').join("")+'</ul>'+
   '<p class="fine">Examples use the real scoring engine; they do not change candidate answers or publish another key.</p></section>');
 }
 parts.push('<details class="pd-author-worked"><summary>Author-only answer key and worked explanation</summary>'+
  (entry?'<p><b>Author-only answer key:</b> '+escapeText(answerDescription(entry.answer))+'</p>':
    '<p>Answer key not yet validated.</p>')+
  (q.content.kind==="free-response"&&pkg.explanations?.[q.id]?
    '<p><b>Author-provided written model/rubric:</b> '+
      escapeText(pkg.explanations[q.id])+'</p>':"")+
  (q.content.richExplanation?
   // The same safe question-rich HTML renderer used by the exam.
   '<div class="pd-author-worked-text">'+
    // Fake explanatory revision would be dangerous; render using trusted already validated doc.
    renderQuestionPrompt(pkg,{...q,content:{...q.content,prompt:"Worked explanation",
      richPrompt:q.content.richExplanation}})+'</div>':"")+
  '</details></div>');
 return parts.join("");
};
/** Author-only faithful view of the precise already validated executable revision. */
export function authoringPublishedPreview(pkg:ExamPackage,questionRevisionId:string):string{
 const q=pkg.questions.find(q=>q.id===questionRevisionId);
 if(!q)throw Error("Preview question not in frozen publication");
 return main(pkg,q,true);
}
/** Incomplete drafts may still show genuine response widgets, but not falsely
 * promise publisher acceptance or show misleading made-up pair connections. */
export function authoringDraftPreview(d:AuthoringDraft,q:AuthoringQuestion):string{
 const option=(doc:AuthoringQuestion["prompt"],id:string)=>({
  id,text:publicationPlainText(doc),richText:doc
 });
 const base={prompt:publicationPlainText(q.prompt),richPrompt:q.prompt,
  richExplanation:q.explanation};
 let content:QuestionContent;
 if(q.kind==="single-choice"||q.kind==="multiple-select"){
  const options=q.options.map((doc,i)=>option(doc,letters[i]!));
  content=q.kind==="single-choice"?{...base,kind:"single-choice",options} as unknown as QuestionContent:
   {...base,kind:"multiple-select",options,minSelections:q.minSelections??1,
      maxSelections:q.maxSelections??4} as unknown as QuestionContent;
 }else if(q.kind==="matching"){
  content={...base,kind:"matching",
    leftItems:q.leftItems.map((doc,i)=>option(doc,"L"+(i+1))),
    rightItems:q.rightItems.map((doc,i)=>option(doc,letters[i]!))} as unknown as QuestionContent;
 }else if(q.kind==="numeric-entry")content={...base,kind:"numeric-entry",numericRules:{allowNegative:true}};
 else if(q.kind==="true-false")content={...base,kind:"true-false"};
 else content={...base,kind:"free-response",responseRules:{minWords:1,maxWords:10000}};
 if(publicationPlainText(q.passage))content={...content,
   stimulusId:"author-preview-stimulus"} as unknown as QuestionContent;
 const revision={id:"author-preview-question",content} as QuestionRevision;
 const pkg={assets:d.assets,questions:[revision],answerKey:{entries:[]},
  paper:{sections:[{title:q.section,questionRevisionIds:[revision.id]}],
    timing:{kind:"untimed"},navigation:{},scoring:{}},
  stimuli:publicationPlainText(q.passage)?[{id:"author-preview-stimulus",kind:"passage",
    text:publicationPlainText(q.passage),richText:q.passage}]:[]} as unknown as ExamPackage;
 return main(pkg,revision,false);
}
export interface AuthoringPartialExample{
 readonly questionRevisionId:string;
 readonly response:CandidateResponse;
 readonly verdict:string;
 readonly marks:number;
 readonly description:string;
}
/** Every example is evaluated through scoreAttempt, never through a shadow scorer. */
export function authoringPartialCreditExamples(pkg:ExamPackage):AuthoringPartialExample[]{
 const answer=new Map(pkg.answerKey.entries.map(entry=>[entry.questionRevisionId,entry]));
 const results:AuthoringPartialExample[]=[];
 for(const q of pkg.questions){
  const entry=answer.get(q.id);
  if(!entry?.scoringOverride?.partialCredit)continue;
  const key=entry.answer;
  let response:CandidateResponse|null=null,description="";
  if(key.kind==="multiple-select"&&q.content.kind==="multiple-select"){
   const correct=new Set(key.optionIds);
   const ids=q.content.options.map(x=>x.id);
   const min=q.content.minSelections??1,max=q.content.maxSelections??ids.length;
   // Enumerate the finite legal response space, prefer one correct and one
   // incorrect. A 4-of-4 full-answer item simply has no legal wrong choice.
   const choices=[] as {ids:typeof ids;correct:number;wrong:number}[];
   for(let mask=1;mask<1<<ids.length;mask++){
    const chosen=ids.filter((_,i)=>Boolean(mask&(1<<i)));
    if(chosen.length<min||chosen.length>max||
       (chosen.length===key.optionIds.length&&chosen.every(x=>correct.has(x))))continue;
    choices.push({ids:chosen,correct:chosen.filter(x=>correct.has(x)).length,
      wrong:chosen.filter(x=>!correct.has(x)).length});
   }
   choices.sort((a,b)=>(b.correct>0&&b.wrong>0?1:0)-(a.correct>0&&a.wrong>0?1:0)||
     b.correct-a.correct||a.wrong-b.wrong);
   const picked=choices[0];
   if(picked){response={kind:"multiple-select",optionIds:picked.ids};
     description="Select "+picked.ids.join(", ")+" ("+picked.correct+" correct, "+picked.wrong+" incorrect components)";}
  }else if(key.kind==="matching"){
   const pairs=key.pairs.map(p=>({...p}));
   if(pairs.length>=2){
    const right=pairs[0]!.rightId;pairs[0]={...pairs[0]!,rightId:pairs[1]!.rightId};
    pairs[1]={...pairs[1]!,rightId:right};
    response={kind:"matching",pairs};
    description="Swap the first two matching targets; keep remaining pairs unchanged";
   }
  }
  if(!response)continue;
  const scored=scoreAttempt(pkg.paper,pkg.answerKey,pkg.questions,[{
   questionRevisionId:q.id,timeSpentMs:0,answerChangeCount:0,flagged:false,response
  }],"2026-11-04T00:00:00.000Z").items.find(item=>item.questionRevisionId===q.id);
  if(scored)results.push({questionRevisionId:q.id,response,verdict:scored.verdict,
    marks:scored.marks,description});
 }
 return results;
}
