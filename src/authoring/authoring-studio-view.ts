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

export const labels:Record<QuestionKind,string>={
 "single-choice":"Single choice (MCQ)",
 "multiple-select":"Multiple select",
 "numeric-entry":"Numerical answer (NAT)",
 "true-false":"True or false",
 "matching":"Matching pairs",
 "free-response":"Written response"
};
export type Field="prompt"|"passage"|"explanation"|
 "A"|"B"|"C"|"D"|"L1"|"L2"|"L3"|"L4"|"R1"|"R2"|"R3"|"R4";
const letters=["A","B","C","D"] as const;
export const initialField:Field="prompt";
export const fieldNames:Record<Field,string>={
 prompt:"Question stem",passage:"Passage / case",explanation:"Worked explanation",
 A:"Option A",B:"Option B",C:"Option C",D:"Option D",
 L1:"Match left 1",L2:"Match left 2",L3:"Match left 3",L4:"Match left 4",
 R1:"Match right 1",R2:"Match right 2",R3:"Match right 3",R4:"Match right 4"
};
export function fields(kind:QuestionKind):Field[]{
 return ["prompt","passage",
  ...(kind==="single-choice"||kind==="multiple-select"?letters:[]),
  ...(kind==="matching"?["L1","L2","L3","L4","R1","R2","R3","R4"] as Field[]:[]),
  "explanation"] as Field[];
}
export function fieldOf(q:AuthoringQuestion,field:Field):RichDocument{
 if(field==="prompt"||field==="passage"||field==="explanation")return q[field];
 if(letters.includes(field as (typeof letters)[number]))
  return q.options[letters.indexOf(field as (typeof letters)[number])]!;
 const index=Number(field.slice(1))-1;
 return (field[0]==="L"?q.leftItems:q.rightItems)[index]!;
}
export function updatedField(q:AuthoringQuestion,field:Field,value:RichDocument):AuthoringQuestion{
 if(field==="prompt"||field==="passage"||field==="explanation")
  return {...q,[field]:value};
 if(letters.includes(field as (typeof letters)[number])){
  const i=letters.indexOf(field as (typeof letters)[number]);
  return {...q,options:q.options.map((v,j)=>j===i?value:v)};
 }
 const i=Number(field.slice(1))-1;
 return field[0]==="L"?{...q,leftItems:q.leftItems.map((v,j)=>j===i?value:v)}:
   {...q,rightItems:q.rightItems.map((v,j)=>j===i?value:v)};
}
export function option(value:string,label:string,selected:string):string{
 return '<option value="'+escapeText(value)+'"'+(value===selected?" selected":"")+">"+
  escapeText(label)+"</option>";
}
export function controls(draft:AuthoringDraft,current:AuthoringQuestion,field:Field):string{
 const applicable=fields(current.kind);
 const timingKind=draft.timingKind;
 const kinds=QUESTION_KINDS.map(k=>option(k,labels[k],current.kind)).join("");
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
  '<label>Correct marks<input id="pd-author-correct" type="number" step="any" value="'+draft.marksCorrect+'"></label>'+
  '<label>Incorrect marks<input id="pd-author-wrong" type="number" max="0" step="any" value="'+draft.marksIncorrect+'"></label>'+
  '</div><p class="fine pd-author-effective-policy-note" role="note">'+
   (timingKind==="sectional"?
     'Section timers, expiry and early-submission policies are active. Section movement must remain sequentially locked.':
     timingKind==="whole-paper"?
     'One shared whole-paper timer covers all sections. Their individual timers and expiry settings are saved but inactive.':
     'Untimed mode has no countdown. Pause, expiry, section budgets and early-submission settings are inactive.')+
   '</p></details><div class="pd-author-meta">'+
  '<label>Question kind<select id="pd-author-kind">'+kinds+'</select></label>'+
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
  '<label>Source / provenance note<input id="pd-author-source" maxlength="500" value="'+escapeText(current.source)+'"></label>'+
  (current.kind==="numeric-entry"?'<label>Absolute answer tolerance<input type="number" id="pd-author-tolerance" min="0" max="1000000" step="any" value="'+current.tolerance+'"></label>':"")+
  (current.kind==="multiple-select"?'<label>Minimum choices<input id="pd-author-min-choices" type="number" min="1" max="4" step="1" value="'+(current.minSelections??1)+'"></label>'+
    '<label>Maximum choices<input id="pd-author-max-choices" type="number" min="1" max="4" step="1" value="'+(current.maxSelections??4)+'"></label>':"")+
  (current.kind==="multiple-select"||current.kind==="matching"?
    '<label>Partial marks per correct component (0 = all-or-nothing)<input id="pd-author-partial-credit" type="number" min="0" max="1000" step="any" value="'+(current.partialCreditEach??0)+'"></label>'+
    '<label>Partial penalty per incorrect component<input id="pd-author-partial-penalty" type="number" min="0" max="1000" step="any" value="'+(current.partialPenaltyEach??0)+'"></label>':"")+
  '</div><p class="fine" id="pd-author-answer-help">'+
  escapeText(current.kind==="single-choice"?"One correct option: A, B, C or D.":
   current.kind==="multiple-select"?"All correct options: A,C or B,D; no duplicates.":
   current.kind==="numeric-entry"?"Accepted numeric answers, comma-separated. Set absolute tolerance above.":
   current.kind==="true-false"?"Enter True or False.":
   current.kind==="matching"?"Four unique pairs: 1-C,2-A,3-D,4-B (or C,A,D,B).":
   "Evaluated manually; supply a model answer or worked rubric, not an automatic key.")+
  '</p>'+
  '<label class="picker" for="pd-author-field">Rich-content field</label>'+
  '<select id="pd-author-field">'+applicable.map(f=>option(f,fieldNames[f],field)).join("")+'</select>';
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
 const review=q.qa?.review;
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
    '<th>Exam section</th><th>Questions</th><th>Minutes (0 = untimed)</th></tr></thead><tbody>'+
   sections.map(section=>'<tr><th scope="row">'+escapeText(section.name)+'</th><td>'+
      section.count+'</td><td><label class="pd-author-section-time-label">'+
      '<input aria-label="Timer for '+escapeText(section.name)+
      '" type="number" min="0" max="600" step="1" data-author-section-timer="'+escapeText(section.name)+
      '" value="'+section.minutes+'"></label></td></tr>').join("")+
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
