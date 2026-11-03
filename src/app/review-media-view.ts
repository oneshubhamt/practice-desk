/** Frozen post-submit reviewed and source media; no mutable current bank. */
import {readableAnswer,type ExamPackage,type GenericAttempt} from "./exam-package.ts";
import type {QuestionRevision,CandidateResponse} from "../domain/question.js";
import type {CorrectAnswer} from "../domain/answer-key.js";
import type {Verdict} from "../engine/scoring.ts";
import {assetHTML,stimulusHTML} from "./question-content-view.ts";
import {escapeText} from "./html-escape.ts";
 export function frozenReviewMedia(saved:GenericAttempt,q:QuestionRevision,
    response?:CandidateResponse,answer?:CorrectAnswer,verdict?:Verdict):string{
   const frozen=saved.frozen;
   const display:ExamPackage={format:"practice-desk-exam",version:1,
     examId:frozen.snapshot.examId,title:"",paper:frozen.paper,answerKey:frozen.key,
     questions:frozen.questions,stimuli:frozen.stimuli,assets:frozen.assets};
   const content=q.content;
   const passage=stimulusHTML(display,q);
   const promptAssets=assetHTML(display,content.assetIds,"Figure for reviewed question");
   const options=content.kind==="single-choice"||content.kind==="multiple-select"?
     '<div class="generic-choices" role="list" aria-label="Answer options">'+
      content.options.map((option,i)=>{
       const chosen=response?.kind==="single-choice"?response.optionId===option.id:
         response?.kind==="multiple-select"?response.optionIds.includes(option.id):false;
       const expected=answer?.kind==="single-choice"?answer.optionId===option.id:
         answer?.kind==="multiple-select"?answer.optionIds.includes(option.id):false;
       const scored=verdict!=="excluded"&&verdict!=="pending";
       const correct=scored&&expected;
       const wrong=scored&&chosen&&!expected;
       const state=correct?" review-option-correct":wrong?" review-option-incorrect":"";
       const badges=[
         ...(chosen?["Your choice"]:[]),
         ...(correct?["Correct answer"]:[]),
         ...(wrong?["Incorrect choice"]:[])
       ];
       return '<div role="listitem" class="generic-choice review-opt'+state+'"><span><b>'+
         String.fromCharCode(65+i)+'.</b> '+escapeText(option.text)+
         assetHTML(display,option.assetIds,"Image for option "+String.fromCharCode(65+i))+
         (badges.length?'<span class="review-option-label"> · '+
           escapeText(badges.join(" · "))+'</span>':"")+'</span></div>';
      }).join("")+'</div>':"";
   const booleanOptions=content.kind==="true-false"?
     '<div class="generic-choices" role="list" aria-label="True or false answer options">'+
     [true,false].map(value=>{
       const chosen=response?.kind==="true-false"&&response.value===value;
       const correct=verdict!=="excluded"&&answer?.kind==="true-false"&&answer.value===value;
       const incorrect=verdict!=="excluded"&&chosen&&!correct;
       const labels=[...(chosen?["Your choice"]:[]),
         ...(correct?["Correct answer"]:[]),
         ...(incorrect?["Incorrect choice"]:[])];
       return '<div role="listitem" class="generic-choice review-opt'+
         (correct?" review-option-correct":incorrect?" review-option-incorrect":"")+
         '"><span><b>'+(value?"True":"False")+'</b>'+
         (labels.length?'<span class="review-option-label"> · '+
           escapeText(labels.join(" · "))+'</span>':"")+'</span></div>';
     }).join("")+'</div>':"";
   const matches=content.kind==="matching"?
     '<div class="generic-matches">'+[...content.leftItems,...content.rightItems].map(item=>
       '<div><span>'+escapeText(item.text)+assetHTML(display,item.assetIds,"Image for matching item "+item.text)+'</span></div>').join("")+'</div>':"";
   return passage+promptAssets+options+booleanOptions+matches;
 }
 export function sourceReviewHTML(saved:GenericAttempt,target:QuestionRevision,
   ref:NonNullable<GenericAttempt["sourceReviewReference"]>|null):string{
   const entry=ref?.entries.find(item=>item.targetQuestionRevisionId===target.id);
   if(!ref||!entry)return "";
   const original=entry.sourceQuestion;
   const display:ExamPackage={format:"practice-desk-exam",version:1,
     examId:ref.examId,title:"Original source",paper:saved.frozen.paper,
     answerKey:saved.frozen.key,questions:[original],
     stimuli:ref.stimuli,assets:ref.assets};
   const content=original.content;
   const optionLines=content.kind==="single-choice"||content.kind==="multiple-select"?
     '<div class="generic-choices" role="list" aria-label="Original source options">'+
     content.options.map((option,index)=>
       '<div role="listitem" class="generic-choice"><span><b>'+
       String.fromCharCode(65+index)+'.</b> '+escapeText(option.text)+
       assetHTML(display,option.assetIds)+'</span></div>').join("")+'</div>':"";
   const matches=content.kind==="matching"?
     '<div class="generic-matches">'+[...content.leftItems,...content.rightItems]
       .map(x=>'<div>'+escapeText(x.text)+assetHTML(display,x.assetIds)+'</div>').join("")+'</div>':"";
   const currentAnswer=saved.frozen.key.entries.find(x=>x.questionRevisionId===target.id)?.answer;
   const modifications=[
     ...(content.prompt!==target.content.prompt?["question wording"]:[]),
     ...(JSON.stringify({...content,prompt:""})!==JSON.stringify({...target.content,prompt:""})?
       ["options, response rules or media"]:[]),
     ...(JSON.stringify(entry.sourceAnswer)!==JSON.stringify(currentAnswer)?["answer key"]:[])
   ];
   return '<details class="change-log source-review"><summary>'+
     (saved.frozen.snapshot.examId==="ssc-cgl"?
       "Compare with original PDF version":"Compare with original source edition")+
     '</summary>'+
     '<div class="change-body"><p class="fine"><b>Original source revision</b>'+
       (original.editorial.sourcePage?' · Source page '+original.editorial.sourcePage:"")+
       ' · Published key shown for provenance, not as a score adjustment.</p>'+
     stimulusHTML(display,original)+
     '<p class="generic-prompt">'+escapeText(content.prompt)+'</p>'+
     assetHTML(display,content.assetIds)+optionLines+matches+
     '<p class="fine"><b>Original published answer:</b> '+
       escapeText(readableAnswer(original,entry.sourceAnswer))+'</p>'+
     '<p class="fine"><b>Changes in reviewed edition:</b> '+
       escapeText(modifications.length?[...new Set(modifications)].join(", "):"editorial review/status")+'</p>'+
     '</div></details>';
 }
