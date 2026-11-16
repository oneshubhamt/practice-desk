/** Pure authoring field projection and HTML generation.
 * No storage, editor lifecycle, publication writes or DOM event ownership.
 */
import type {QuestionKind} from "../domain/question.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import {inspectAuthoringPublication} from "./authoring-publisher.ts";
import type {StagedQuestion} from "./authoring-staging.ts";
import {authoringSections} from "./authoring-sections.ts";
import {authoringPublishedPreview,authoringDraftPreview} from "./authoring-preview.ts";
import {escapeText} from "../app/html-escape.ts";
import {syllabusForExam,syllabusHeading,UNCLASSIFIED_SUBJECT} from "../learning/syllabus-taxonomy.ts";
import type {AuthoringDraft,AuthoringDraftShelf,AuthoringQuestion} from "./authoring-draft.ts";
import {MAX_AUTHORED_ITEMS,optionLabel} from "./authoring-cardinality.ts";

export const labels:Record<QuestionKind,string>={
 "single-choice":"Single choice (MCQ)",
 "multiple-select":"Multiple select",
 "numeric-entry":"Numerical answer (NAT)",
 "true-false":"True or false",
 "matching":"Matching pairs",
 "free-response":"Written response"
};
export type Field="prompt"|"passage"|"explanation"|`O${number}`|`L${number}`|`R${number}`;
export const initialField:Field="prompt";
export interface AuthoringIssueTarget{
 readonly field?:Field;readonly controlId?:string;readonly sourceOwned?:boolean;
}
export function authoringIssueTarget(path:string,q:AuthoringQuestion):AuthoringIssueTarget{
 const lower=path.toLowerCase();
 if(/question stem|\.prompt\b/.test(lower))return {field:"prompt"};
 if(/worked explanation|manual rubric|\.explanation\b/.test(lower))return {field:"explanation"};
 if(/shared stimulus|\bpassage\b|\.passage\b/.test(lower))return {field:"passage"};
 let match=/option\s+([a-z])/i.exec(path);
 if(!match)match=/\.options\[(\d+)\]/i.exec(path);
 if(match){
  const index=/^\d+$/.test(match[1]!)?Number(match[1]):match[1]!.toUpperCase().charCodeAt(0)-65;
  if(index>=0&&index<q.options.length)return {field:("O"+(index+1)) as Field};
 }
 match=/left\s+(\d+)/i.exec(path)??/\.leftItems\[(\d+)\]/i.exec(path);
 if(match){const index=Number(match[1])-(/left\s+/i.test(match[0])?1:0);
  if(index>=0&&index<q.leftItems.length)return {field:("L"+(index+1)) as Field};}
 match=/right\s+([a-z])/i.exec(path)??/\.rightItems\[(\d+)\]/i.exec(path);
 if(match){const index=/^\d+$/.test(match[1]!)?Number(match[1]):match[1]!.toUpperCase().charCodeAt(0)-65;
  if(index>=0&&index<q.rightItems.length)return {field:("R"+(index+1)) as Field};}
 if(/stimulus\.|media\.alttext/.test(lower))return {sourceOwned:true};
 if(/answer|key|tolerance/.test(lower))return {controlId:"pd-author-answer"};
 if(/provenance|source|citation|qa|currentness|time-sensitive/.test(lower))return {controlId:"pd-author-evidence"};
 if(/word.?limit/.test(lower))return {controlId:"pd-author-word-limit"};
 if(/partial penalty/.test(lower))return {controlId:"pd-author-partial-penalty"};
 if(/partial credit/.test(lower))return {controlId:"pd-author-partial-credit"};
 if(/mark|scoring/.test(lower))return {controlId:"pd-author-custom-marks"};
 if(/syllabus/.test(lower))return {controlId:"pd-author-syllabus-heading"};
 if(/subtopic/.test(lower))return {controlId:"pd-author-subtopic"};
 if(/topic/.test(lower))return {controlId:"pd-author-topic"};
 if(/difficulty/.test(lower))return {controlId:"pd-author-difficulty"};
 if(/section/.test(lower))return {controlId:"pd-author-section"};
 return {};
}
export function fieldName(field:Field):string{
 if(field==="prompt")return "Question stem";
 if(field==="passage")return "Passage / case";
 if(field==="explanation")return "Worked explanation";
 const index=Number(field.slice(1))-1;
 return field[0]==="O"?"Option "+optionLabel(index):field[0]==="L"?"Match left "+(index+1):"Match right "+optionLabel(index);
}
export function fields(q:AuthoringQuestion):Field[]{
 return ["prompt","passage",
  ...(q.kind==="single-choice"||q.kind==="multiple-select"?q.options.map((_,i)=>("O"+(i+1)) as Field):[]),
  ...(q.kind==="matching"?[
    ...q.leftItems.map((_,i)=>("L"+(i+1)) as Field),...q.rightItems.map((_,i)=>("R"+(i+1)) as Field)]:[]),
  "explanation"];
}
export function fieldOf(q:AuthoringQuestion,field:Field):RichDocument{
 if(field==="prompt"||field==="passage"||field==="explanation")return q[field];
 const index=Number(field.slice(1))-1;
 return (field[0]==="O"?q.options:field[0]==="L"?q.leftItems:q.rightItems)[index]!;
}
export function updatedField(q:AuthoringQuestion,field:Field,value:RichDocument):AuthoringQuestion{
 if(field==="prompt"||field==="passage"||field==="explanation")return {...q,[field]:value};
 const i=Number(field.slice(1))-1;
 if(field[0]==="O")return {...q,options:q.options.map((v,j)=>j===i?value:v)};
 return field[0]==="L"?{...q,leftItems:q.leftItems.map((v,j)=>j===i?value:v)}:
   {...q,rightItems:q.rightItems.map((v,j)=>j===i?value:v)};
}
export function option(value:string,label:string,selected:string):string{
 return '<option value="'+escapeText(value)+'"'+(value===selected?" selected":"")+">"+
  escapeText(label)+"</option>";
}
export function controls(draft:AuthoringDraft,current:AuthoringQuestion,field:Field):string{
 const applicable=fields(current);
 const timingKind=draft.timingKind;
 const kinds=QUESTION_KINDS.map(k=>option(k,labels[k],current.kind)).join("");
 const practiceValue=draft.practiceModes?.join(",")??"auto";
 const practiceChoices=([["auto","Auto from paper structure"],["strict","Exam simulation only"],["free","Flexible practice only"],
  ["strict,free","Exam simulation + flexible"],["single","Section practice only"],["strict,single","Exam simulation + section"],
  ["free,single","Flexible + section"],["strict,free,single","All compatible modes"]] as const)
  .filter(([value])=>draft.sections.length>1||!value.includes("single"))
  .map(([value,label])=>option(value,label,practiceValue)).join("");
 const kindScoreRows=QUESTION_KINDS.map(kind=>{const rule=draft.kindScoring?.[kind];return
  '<fieldset class="pd-author-kind-score"><legend>'+escapeText(labels[kind])+'</legend>'+
  '<label class="pd-author-check"><input type="checkbox" data-author-kind-score="'+kind+'"'+(rule?' checked':'')+'> Override paper marks</label>'+
  ([["correctMarks","Correct"],["incorrectMarks","Incorrect"],["unansweredMarks","Unanswered"]] as const).map(([key,label])=>
   '<label>'+label+'<input type="number" step="any" data-author-kind="'+kind+'" data-author-kind-mark="'+key+'"'+
    (rule?'':' disabled')+' value="'+(rule?.[key]??(key==="correctMarks"?draft.marksCorrect:key==="incorrectMarks"?draft.marksIncorrect:draft.marksUnanswered))+'"></label>').join("")+
  '</fieldset>';}).join("");
 return '<details class="pd-author-paper-settings"><summary>Paper settings · '+escapeText(draft.title)+'</summary><div class="pd-author-meta">'+
  '<label>Paper title<input id="pd-author-title" maxlength="180" value="'+escapeText(draft.title)+'"></label>'+
  '<label>Exam family ID<input id="pd-author-exam" maxlength="80" value="'+escapeText(draft.examId)+'"></label>'+
  '<label>Paper ID<input id="pd-author-paper" maxlength="80" value="'+escapeText(draft.paperId)+'"></label>'+
  '<label>Edition<select id="pd-author-edition">'+
  ([["custom","Custom"],["source","Source transcription"],["reviewed","Reviewed & corrected"]] as const)
    .map(([a,b])=>option(a,b,draft.edition)).join("")+'</select></label>'+
  '<label>Revision<input id="pd-author-revision" type="number" min="1" max="1000000" value="'+draft.revision+'"></label>'+
  '<label>Timing policy<select id="pd-author-timing-kind">'+
    ([["untimed","Untimed"],["whole-paper","Whole-paper countdown"],["sectional","Section-by-section countdown"]] as const)
      .map(([value,label])=>option(value,label,timingKind)).join("")+'</select></label>'+
  '<label>Whole-paper duration (minutes)<input id="pd-author-duration" type="number" min="0" max="600" value="'+draft.durationMinutes+'"'+
   (timingKind==="whole-paper"?"":' disabled title="Only used in whole-paper mode"')+'></label>'+
  '<label>Pause policy<select id="pd-author-pause"'+
   (timingKind==="untimed"?' disabled title="No timer to pause in untimed mode"':"")+'>'+
    ([["allowed","Allow pause"],["forbidden","No pause"]] as const)
      .map(([value,label])=>option(value,label,draft.pausePolicy)).join("")+'</select></label>'+
  '<label>Question navigation<select id="pd-author-question-nav">'+
    ([["free","Free movement"],["forward-only","Forward only"]] as const)
      .map(([value,label])=>option(value,label,draft.questionNavigation)).join("")+'</select></label>'+
  '<label>Section navigation<select id="pd-author-section-nav">'+
    ([["free","Free section movement"],["sequential-locked","Sequential locked"]] as const)
      .map(([value,label])=>option(value,label,draft.sectionNavigation)).join("")+'</select></label>'+
  '<label>Section expiry<select id="pd-author-section-transition"'+
   (timingKind==="sectional"?"":' disabled title="Only used in sectional countdown mode"')+'>'+
    ([["manual","Stop and continue manually"],["automatic","Advance automatically"]] as const)
      .map(([value,label])=>option(value,label,draft.sectionTransition)).join("")+'</select></label>'+
  '<label class="pd-author-check"><input type="checkbox" id="pd-author-early-submit"'+
    (draft.allowEarlySubmit?" checked":"")+
     (timingKind==="sectional"?"":' disabled title="Only used in sectional countdown mode"')+
     '> Permit early section submission</label>'+
  '<label class="pd-author-check"><input type="checkbox" id="pd-author-allow-review"'+
    (draft.allowReview?" checked":"")+'> Release detailed answers after submission</label>'+
  '<label class="pd-author-check"><input type="checkbox" id="pd-author-calculator"'+
    (draft.calculatorTool==="basic-v1"?" checked":"")+'> Basic calculator available during the test</label>'+
  '<label>Written-answer word counter<select id="pd-author-word-count">'+
    ([["auto","Auto — practice on, exam simulation off"],["shown","Always show"],["hidden","Always hide"]] as const)
      .map(([value,label])=>option(value,label,draft.wordCountPolicy)).join("")+'</select></label>'+
  '<label>Available practice modes<select id="pd-author-practice-modes">'+practiceChoices+'</select></label>'+
  '<label>Correct marks<input id="pd-author-correct" type="number" step="any" value="'+draft.marksCorrect+'"></label>'+
  '<label>Incorrect marks<input id="pd-author-wrong" type="number" max="0" step="any" value="'+draft.marksIncorrect+'"></label>'+
  '<label>Unanswered marks<input id="pd-author-unanswered" type="number" step="any" value="'+draft.marksUnanswered+'"></label>'+
  '<label>Score decimal places<input id="pd-author-decimals" type="number" min="0" max="6" step="1" value="'+draft.scoreDecimalPlaces+'"></label>'+
  '</div><details class="pd-author-kind-marks"><summary>Question-kind marks (optional)</summary><div class="pd-author-meta">'+kindScoreRows+'</div></details><div class="pd-author-meta">'+
  '</div><p class="fine pd-author-effective-policy-note" role="note">'+
   (timingKind==="sectional"?
     'Section timers, expiry and early-submission policies are active. Section movement must remain sequentially locked.':
     timingKind==="whole-paper"?
     'One shared whole-paper timer covers all sections. Their individual timers and expiry settings are saved but inactive.':
     'Untimed mode has no countdown. Pause, expiry, section budgets and early-submission settings are inactive.')+
   '</p></details><div class="pd-author-meta">'+
  '<label>Question kind<select id="pd-author-kind">'+kinds+'</select></label>'+
  ((current.kind==="single-choice"||current.kind==="multiple-select")?
   '<label>Option count<input id="pd-author-option-count" type="number" min="2" max="'+MAX_AUTHORED_ITEMS+'" step="1" value="'+current.options.length+'"></label>':"")+
  (current.kind==="matching"?
   '<label>Left item count<input id="pd-author-left-count" type="number" min="1" max="'+MAX_AUTHORED_ITEMS+'" step="1" value="'+current.leftItems.length+'"></label>'+
   '<label>Right item count<input id="pd-author-right-count" type="number" min="1" max="'+MAX_AUTHORED_ITEMS+'" step="1" value="'+current.rightItems.length+'"></label>':"")+
  '<label>Actual exam section (controls timing and navigation)<input id="pd-author-section" maxlength="100" value="'+escapeText(current.section)+'"></label>'+
  '<label>Academic subject (custom, not an exam section)<input id="pd-author-subject" maxlength="120" value="'+escapeText(current.subject??"")+'" placeholder="Leave blank for Unclassified"></label>'+
  '<label>Official broad syllabus subject (author-chosen)<select id="pd-author-syllabus-heading"'+
    (!syllabusForExam(draft.examId)?' disabled':'')+'>'+
    option("",syllabusForExam(draft.examId)?"Custom subject / Unclassified":"No official catalogue for this exam",current.syllabusHeadingId??"")+
    (syllabusForExam(draft.examId)?.headings??[]).map(h=>option(h.id,h.label,current.syllabusHeadingId??"")).join("")+
    '</select></label>'+
  '<p class="fine pd-author-taxonomy-summary">Classification: '+
    escapeText(current.syllabusHeadingId?
      syllabusHeading(draft.examId,current.syllabusHeadingId)?.label??"Unknown heading":
      current.subject?.trim()||UNCLASSIFIED_SUBJECT)+
    '. Section timers and subjects are independent; no classification is inferred.</p>'+
  '<label>Topic (author supplied)<input id="pd-author-topic" maxlength="120" value="'+escapeText(current.topic??"")+'"></label>'+
  '<label>Subtopic (needs Topic)<input id="pd-author-subtopic" maxlength="120" value="'+escapeText(current.subtopic??"")+'"></label>'+
  '<label>Difficulty tag<select id="pd-author-difficulty">'+
    ([["","Not assigned"],["easy","Easy"],["medium","Medium"],["hard","Hard"]] as const)
      .map(([value,label])=>option(value,label,current.difficulty??"")).join("")+'</select></label>'+
  '<label>Active section timer (minutes; 0 = untimed)<input id="pd-author-section-minutes" type="number" min="0" max="600" step="1" value="'+
   (authoringSections(draft).find(s=>s.name===current.section)?.minutes??0)+'"></label>'+
  '<label>Answer key draft<input id="pd-author-answer" maxlength="100" value="'+escapeText(current.answer)+'" aria-describedby="pd-author-answer-help"></label>'+
  '<details class="pd-author-question-marks"><summary>Question-specific marks (optional)</summary>'+
  '<label><input id="pd-author-custom-marks" type="checkbox"'+
   (current.scoringOverride?' checked':'')+'> Override the paper-wide marking rule for this question</label>'+
  ([['correctMarks','Correct marks','0.01','1000'],
    ['incorrectMarks','Incorrect marks','-1000','0'],
    ['unansweredMarks','Unanswered marks','-1000','1000']] as const).map(([field,label,min,max])=>
   '<label>'+label+'<input id="pd-author-mark-'+field+'" type="number" min="'+min+'" max="'+max+
   '" step="any"'+(current.scoringOverride?'':' disabled')+' value="'+
   (current.scoringOverride?.[field]??(field==='correctMarks'?draft.marksCorrect:
     field==='incorrectMarks'?draft.marksIncorrect:draft.marksUnanswered))+'"></label>').join('')+
  '</details>'+
  '<label>Source / provenance note<input id="pd-author-source" maxlength="500" value="'+escapeText(current.source)+'"></label>'+
  (current.kind==="numeric-entry"?'<label>Absolute answer tolerance<input type="number" id="pd-author-tolerance" min="0" max="1000000" step="any" value="'+current.tolerance+'"></label>':"")+
  (current.kind==="free-response"?'<label>Advisory word limit (optional)<input type="number" id="pd-author-word-limit" min="1" max="10000" step="1" placeholder="No target" value="'+(current.wordLimit??"")+'"></label>':"")+
  (current.kind==="multiple-select"?'<label>Minimum choices<input id="pd-author-min-choices" type="number" min="1" max="'+current.options.length+'" step="1" value="'+(current.minSelections??1)+'"></label>'+
    '<label>Maximum choices<input id="pd-author-max-choices" type="number" min="1" max="'+current.options.length+'" step="1" value="'+(current.maxSelections??current.options.length)+'"></label>':"")+
  (current.kind==="multiple-select"||current.kind==="matching"||
    (current.partialCreditEach??0)>0||(current.partialPenaltyEach??0)>0?
    '<label>Partial marks per correct component (0 = all-or-nothing)<input id="pd-author-partial-credit" type="number" min="0" max="1000" step="any" value="'+(current.partialCreditEach??0)+'"></label>'+
    '<label>Partial penalty per incorrect component<input id="pd-author-partial-penalty" type="number" min="0" max="1000" step="any" value="'+(current.partialPenaltyEach??0)+'"></label>'+
    (!["multiple-select","matching"].includes(current.kind)?
      '<p class="fine generic-warning">Component scoring is invalid for this question kind; set both component values to 0 or change the kind.</p>':""):"")+
  '</div><p class="fine" id="pd-author-answer-help">'+
  escapeText(current.kind==="single-choice"?"One correct option: A–"+optionLabel(current.options.length-1)+".":
   current.kind==="multiple-select"?"All correct options from A–"+optionLabel(current.options.length-1)+"; no duplicates.":
   current.kind==="numeric-entry"?"Accepted numeric answers, comma-separated. Set absolute tolerance above.":
   current.kind==="true-false"?"Enter True or False.":
   current.kind==="matching"?"Match left items 1–"+current.leftItems.length+" to right options A–"+optionLabel(current.rightItems.length-1)+".":
   "Evaluated manually. Any word limit is advisory: candidates may save responses beyond it.")+
  '</p>'+
  '<label class="picker" for="pd-author-field">Rich-content field</label>'+
  '<select id="pd-author-field">'+applicable.map(f=>option(f,fieldName(f),field)).join("")+'</select>';
}
/** Author-supplied evidence is editable, but never automatically authenticated.
 * Keep strict calendar/HTTPS and review invalidation in validateAuthoringDraft.
 */
export function evidenceEditor(q:AuthoringQuestion):string{
 const p=q.provenance,sources=p?.sources??[];
 const fields=[["publisher","Publisher / issuing body",180],
  ["title","Document title",240],["url","HTTPS URL",2048],
  ["section","Section / chapter",180],["page","Page",80],
  ["provision","Provision / section of law",140],
  ["publicationDate","Publication date (YYYY-MM-DD)",10],
  ["asOfDate","As-of date (YYYY-MM-DD)",10]] as const;
 const review=q.qa?.review,app=q.qa?.applicability;
 return '<details class="pd-author-section-manager" id="pd-author-evidence">'+
  '<summary>Source evidence and question QA · '+sources.length+' citation(s) · '+
  escapeText(q.qa?.status??"unchecked")+'</summary>'+
  '<p class="fine">All citations, origin labels and review names are author-entered claims. Offline QA does not fetch documents, authenticate exam PYQs or certify current laws. Changing evidence invalidates an earlier reviewer acknowledgement.</p>'+
  '<div class="pd-author-meta"><label>Claimed question origin<select id="pd-author-origin-kind">'+
   ([["manual","Manual"],["ai-original","AI original"],["reconstruction","Reconstruction"],["official-pyq","Claimed official PYQ"]] as const)
   .map(([value,label])=>option(value,label,p?.kind??"manual")).join("")+
   '</select></label><label>Author provenance note<input id="pd-author-origin-note" maxlength="300" value="'+
   escapeText(p?.sourceNote??"")+'"></label><label>Claimed exam year (optional)<input id="pd-author-origin-year" type="number" min="1900" max="2100" step="1" value="'+
   escapeText(p?.examYear===undefined?"":String(p.examYear))+'"></label>'+
   '<label>QA status (never certified)<select id="pd-author-qa-status">'+
   ([["unchecked","Unchecked"],["needs-review","Needs review"]] as const)
   .map(([value,label])=>option(value,label,q.qa?.status??"unchecked")).join("")+'</select></label></div>'+
  '<fieldset><legend>Author-declared QA applicability</legend>'+
   '<p class="fine">These flags route offline checks only; they do not certify mathematical correctness, current law or current data.</p>'+
   '<div class="pd-author-meta">'+
    '<label class="pd-author-check"><input type="checkbox" id="pd-author-qa-mathematical"'+
     (app?.mathematical?' checked':'')+'> Mathematical reasoning</label>'+
    '<label class="pd-author-check"><input type="checkbox" id="pd-author-qa-legal"'+
     (app?.legal?' checked':'')+'> Legal / statutory currentness</label>'+
    '<label class="pd-author-check"><input type="checkbox" id="pd-author-qa-time-sensitive"'+
     (app?.timeSensitive?' checked':'')+'> Time-sensitive facts/data</label>'+
    '<label>Applicability as-of date<input type="date" id="pd-author-qa-asof" value="'+
     escapeText(app?.asOfDate??"")+'"></label>'+
   '</div></fieldset>'+
  sources.map((source,i)=>'<fieldset class="pd-author-evidence-source">'+
   '<legend>Author-supplied citation '+(i+1)+'</legend><div class="pd-author-meta">'+
   fields.map(([field,label,max])=>'<label>'+label+'<input data-author-source-index="'+i+
    '" data-author-source-field="'+field+'" maxlength="'+max+'" value="'+
    escapeText(source[field]??"")+'"></label>').join("")+
   '<label>Author-assigned stance<select data-author-source-index="'+i+
    '" data-author-source-field="stance">'+
    option("","Unspecified",source.stance??"")+
    option("supports","Supports",source.stance??"")+
    option("disputes","Disputes",source.stance??"")+
   '</select></label></div>'+
   '<button type="button" class="btn danger" data-author-source-remove="'+i+'">Remove citation '+(i+1)+'</button>'+
   '</fieldset>').join("")+
  '<fieldset><legend>Add structured source</legend><div class="pd-author-meta">'+
   '<label>Publisher / issuing body<input id="pd-author-source-new-publisher" maxlength="180" placeholder="Required"></label>'+
   '<label>Document title<input id="pd-author-source-new-title" maxlength="240" placeholder="Required"></label></div>'+
   '<button type="button" class="btn" id="pd-author-source-add"'+
   (sources.length>=12?' disabled':'')+'>Add source citation</button></fieldset>'+
  '<fieldset><legend>Optional independently attributed review claim</legend>'+
   '<p class="fine">This records what a named reviewer is claimed to have checked. Identity and factual findings are NOT authenticated.</p>'+
   '<div class="pd-author-meta"><label>Reviewer name<input id="pd-author-qa-reviewer" maxlength="120" value="'+
    escapeText(review?.reviewer??"")+'"></label><label>Review/evidence note<input id="pd-author-qa-review-note" maxlength="500" value="'+
    escapeText(review?.note??"")+'"></label></div>'+
   (review?'<p class="fine">Claimed review: '+escapeText(review.reviewedAt)+
    '. Accepted QA warning codes: '+escapeText(review.acceptedWarningCodes.join(", ")||"none")+'.</p>':"")+
   '<button type="button" class="btn" id="pd-author-qa-record">Record author-attributed review</button>'+
   (review?'<button type="button" class="btn danger" id="pd-author-qa-clear">Clear review record</button>':"")+
  '</fieldset></details>';
}
export function stagedDetail(item:StagedQuestion):string{
 const quality=item.quality,sources=item.question.provenance?.sources??[];
 const checks=quality?Object.entries(quality.checks).map(([key,value])=>
  key.replaceAll("_"," ")+": "+value).join(" · "):"Unavailable pending valid publication preflight";
 const candidates=item.duplicates.map(candidate=>{
  const other=candidate.first.bankId===item.bankId&&candidate.first.questionId===item.id?
   candidate.second:candidate.first;
  return '<p class="fine">Candidate '+escapeText(candidate.classification)+
   ' with '+escapeText(other.bankId+'/'+other.questionId)+
   ' · similarity '+candidate.similarity+' · '+escapeText(candidate.evidence)+
   ' · human decision required</p>';
 }).join("");
 const triage=item.triage;
 return '<details class="pd-stage-question-detail" data-stage-detail="'+escapeText(item.key)+'">'+
  '<summary>QA checks / source evidence / duplicate decision</summary>'+
  '<p class="fine">Checks: '+escapeText(checks)+
   '. Recommended status: '+escapeText(quality?.recommendedStatus??"not-checked")+'</p>'+
  (sources.length?sources.map(ref=>'<p class="fine">Author citation: '+escapeText(ref.publisher+
   ' / '+ref.title+(ref.url?' / '+ref.url:'')+(ref.provision?' / '+ref.provision:'')+
   (ref.asOfDate?' / as of '+ref.asOfDate:''))+'</p>').join(""):
    '<p class="fine">No structured source citation submitted.</p>')+
  (candidates||'<p class="fine">No candidate duplicate linked in this bounded scan.</p>')+
  '<div class="pd-author-meta"><label>Author triage decision<select data-stage-triage-decision="'+escapeText(item.key)+'">'+
   ([["needs-review","Needs independent review"],["distinct","Author judged distinct"],["potential-duplicate","Author flagged potential duplicate"]] as const)
     .map(([v,label])=>option(v,label,triage?.decision??"needs-review")).join("")+
  '</select></label><label>Reason / evidence note<input data-stage-triage-note="'+escapeText(item.key)+
   '" maxlength="500" value="'+escapeText(triage?.note??"")+'"></label>'+
  '<label>Reviewer (optional unverified claim)<input data-stage-triage-reviewer="'+escapeText(item.key)+
   '" maxlength="120" value="'+escapeText(triage?.reviewer??"")+'"></label></div>'+
  '<button type="button" class="btn" data-stage-triage-save="'+escapeText(item.key)+
   '">Save author triage</button></details>';
}
export function toolbar():string{
 const buttons=[
  ["strong","Bold"],["emphasis","Italic"],["underline","Underline"],
  ["subscript","Sub"],["superscript","Super"],["code","Code"],
  ["paragraph","Paragraph"],["heading2","H2"],["heading3","H3"],
  ["bullet-list","Bullets"],["numbered-list","Numbered"],
  ["undo","Undo"],["redo","Redo"]
 ];
 return '<div class="pd-author-toolbar" role="toolbar" aria-label="Wordgard formatting">'+
  buttons.map(([action,label])=>'<button type="button" class="btn" data-author-command="'+action+'">'+label+'</button>').join("")+
  '<button type="button" class="btn" id="pd-author-add-table">Insert table</button></div>';
}
/** Real six-kind response renderer for both validated publications and
 * unfinished drafts. The rule summary is shown only for exact compiled data. */
export function preview(draft:AuthoringDraft,q:AuthoringQuestion,
 existing:readonly ExamPackage[]):string{
 const report=inspectAuthoringPublication(draft,existing);
 if(!report.valid||!report.compiled)return authoringDraftPreview(draft,q);
 const revision=report.compiled.questions[draft.questions.findIndex(row=>row.id===q.id)];
 if(!revision)throw Error("Preview question not in compiled publication");
 return authoringPublishedPreview(report.compiled,revision.id);
}
export function sectionManager(draft:AuthoringDraft,expanded:boolean):string{
 const sections=authoringSections(draft);
 return '<details id="pd-author-section-manager" class="pd-author-section-manager"'+
  (expanded?" open":"")+'><summary>Manage actual exam sections · '+sections.length+
   ' section'+(sections.length===1?"":"s")+
   '</summary>'+
   '<p class="fine">Exam sections control timing and navigation independently of academic subjects. '+
    'Assign questions using their Actual exam section field; enter a new name to create a section. '+
    'Each section has exactly one timer budget owned here.</p>'+
   '<div class="scroll-table"><table class="pd-author-section-table"><thead><tr>'+
    '<th>Exam section</th><th>Questions</th><th>Minutes (0 = untimed)</th><th>Section scoring (optional)</th></tr></thead><tbody>'+
   sections.map(section=>'<tr><th scope="row">'+escapeText(section.name)+'</th><td>'+
      section.count+'</td><td><label class="pd-author-section-time-label">'+
      '<input aria-label="Timer for '+escapeText(section.name)+
      '" type="number" min="0" max="600" step="1" data-author-section-timer="'+escapeText(section.name)+
      '" value="'+section.minutes+'"></label></td><td><label class="pd-author-check"><input type="checkbox" data-author-section-score-enable="'+escapeText(section.name)+'"'+
      (section.scoringOverride?' checked':'')+'> Override</label>'+
      ([["correctMarks","Correct"],["incorrectMarks","Incorrect"],["unansweredMarks","Blank"]] as const).map(([key,label])=>
       '<label>'+label+'<input type="number" step="any" data-author-section-score="'+escapeText(section.name)+
       '" data-author-section-score-field="'+key+'"'+(section.scoringOverride?'':' disabled')+' value="'+
       (section.scoringOverride?.[key]??(key==="correctMarks"?draft.marksCorrect:key==="incorrectMarks"?draft.marksIncorrect:draft.marksUnanswered))+'"></label>').join("")+
      '</td></tr>').join("")+
   '</tbody></table></div>'+
   '<p class="fine" id="pd-author-section-policy">'+
    (draft.timingKind==="sectional"?
      'Sectional mode uses these section budgets; zero means no countdown for that section.':
      'These budgets are saved for future sectional mode; the current timing policy does not use them.')+
   '</p></details>';
}

export function draftsOptions(shelf:AuthoringDraftShelf):string{
 return shelf.drafts.map(d=>option(d.id,d.title+" ("+d.questions.length+" question"+
  (d.questions.length===1?"":"s")+")",shelf.activeId)).join("");
}
