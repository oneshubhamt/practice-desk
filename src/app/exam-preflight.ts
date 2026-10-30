import type { ExamPackage } from "./exam-package.ts";
import type { QuestionKind } from "../domain/question.js";
import type { MarkingRule } from "../domain/scoring.js";
import { scoreableMaximum } from "../engine/score-ceiling.ts";

const excludedStatuses=new Set(["draft","invalid","incomplete-source","under-review","superseded"]);
const escapeHTML=(value:unknown):string=>String(value??"").replace(/[&<>"']/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
const signed=(value:number):string=>value>0?"+"+value:value===0?"0":String(value);
const joinRange=(values:readonly number[]):string=>{
 const sorted=[...new Set(values)].sort((a,b)=>a-b);
 return sorted.length===1?signed(sorted[0]!):signed(sorted[0]!)+" to "+signed(sorted.at(-1)!);
};
const timeLabel=(ms:number):string=>{
 if(ms%60000===0)return ms/60000+" min";
 return (ms/1000).toLocaleString("en-US",{maximumFractionDigits:1})+" s";
};
const plural=(n:number,word:string):string=>n+" "+word+(n===1?"":"s");

export interface ExamPreflight {
 readonly maximum:number;
 readonly decimals:number;
 readonly eligibleQuestions:number;
 readonly excludedQuestions:number;
 readonly manualQuestions:number;
 readonly correctedQuestions:number;
 readonly cautionQuestions:number;
 readonly totalQuestions:number;
 readonly ruleSummary:string;
 readonly hasVariableRules:boolean;
 readonly hasComponentScoring:boolean;
 readonly timingRules:readonly string[];
 readonly navigationRules:readonly string[];
 readonly provenance:string;
 readonly patchCount:number|null;
 readonly builtinCgl:boolean;
 readonly sectionTitles:readonly string[];
}

/** Read-only pre-start metadata from the exact executable selection. Never
 * expose answers, solution notes, source-review diffs, or a mutable key.
 */
export function examPreflight(bundle:ExamPackage,options:{
  readonly builtinCgl?:boolean;
  readonly reviewedPatchCount?:number;
}={}):ExamPreflight{
 const paper=bundle.paper;
 const entries=new Map(bundle.answerKey.entries.map(e=>[e.questionRevisionId,e]));
 const questions=new Map(bundle.questions.map(q=>[q.id,q]));
 const rules:MarkingRule[]=[];
 let excludedQuestions=0,manualQuestions=0,eligibleQuestions=0;
 let cautionQuestions=0,correctedQuestions=0;
 for(const section of paper.sections){
  for(const id of section.questionRevisionIds){
   const q=questions.get(id),entry=entries.get(id);
   if(!q||!entry)throw Error("Preflight cannot inspect an incomplete exam package");
   if(q.editorial.status==="caution")cautionQuestions++;
   if(q.editorial.status==="corrected")correctedQuestions++;
   if(excludedStatuses.has(q.editorial.status)){excludedQuestions++;continue;}
   if(q.content.kind==="free-response"){manualQuestions++;continue;}
   eligibleQuestions++;
   const kind=q.content.kind as QuestionKind;
   rules.push(entry.scoringOverride??section.scoringOverride??
     paper.scoring.byQuestionKind?.[kind]??paper.scoring.defaultRule);
  }
 }
 const hasVariableRules=new Set(rules.map(r=>JSON.stringify(r))).size>1;
 const hasComponentScoring=rules.some(r=>r.partialCredit!==undefined);
 const all=rules.length?rules:[paper.scoring.defaultRule];
 const ruleSummary=rules.length===0?
  "No automatically scoreable questions. Written responses require separate manual assessment; excluded questions earn no automated marks.":
  hasVariableRules?
   "Marking varies by question: correct "+joinRange(all.map(r=>r.correctMarks))+
   "; incorrect "+joinRange(all.map(r=>r.incorrectMarks))+
   "; unanswered "+joinRange(all.map(r=>r.unansweredMarks))+".":
   "Correct "+signed(all[0]!.correctMarks)+
   " · Incorrect "+signed(all[0]!.incorrectMarks)+
   " · Unanswered "+signed(all[0]!.unansweredMarks);
 const timingRules:string[]=[];
 if(paper.timing.kind==="untimed"){
  timingRules.push("Untimed practice: no countdown or automatic timeout. Submit when ready.");
 }else if(paper.timing.kind==="whole-paper"){
  timingRules.push("One shared "+timeLabel(paper.timing.durationMs)+" paper timer across "+
   plural(paper.sections.length,"section")+". Changing/closing a section does not reset this total.");
 }else{
  timingRules.push("Independent section timers: "+paper.sections.map(s=>{
   const d=paper.timing.kind==="sectional"?
     paper.timing.sectionLimits.find(x=>x.sectionId===s.id)?.durationMs:null;
   return s.title+" "+(d===null?"untimed":typeof d==="number"?timeLabel(d):"not specified");
  }).join("; ")+".");
  timingRules.push(paper.timing.allowEarlySubmit?
   "You may submit a timed section early and advance. Unused minutes do not carry into the next section.":
   "Timed sections cannot be submitted before their limit; untimed sections can be finished explicitly.");
  timingRules.push(paper.timing.transition==="automatic"?
   "When a timed section expires, the next section opens automatically; after the last, the test finishes.":
   "When a timed section expires, answers lock until you select Continue; waiting does not consume the next section's time.");
 }
 if(paper.timing.kind!=="untimed")timingRules.push(paper.timing.pausePolicy==="allowed"?
  "A Pause control is available. Paused time is excluded from the exam clock.":
  "Pausing the timer is not permitted. Time away from this page can still use the exam clock.");
 const navigationRules=[
  paper.navigation.sectionNavigation==="free"?
   "You can switch between sections during the test.":
   "Sections are locked in sequence; you cannot return after closing one.",
  paper.navigation.questionNavigation==="forward-only"?
   "Question navigation is forward-only; backtracking is unavailable.":
   "You can revisit questions within your active accessible section.",
  paper.navigation.allowFlagging?
   "Mark questions for revisiting with Flag or M.":
   "Question flagging is disabled by this paper's rules.",
  paper.navigation.allowReview?
   "Detailed answer-key/solution review becomes available only after completion.":
   "After completion, numerical score and timing appear; detailed answer-key/solution review is withheld."
 ];
 const builtinCgl=options.builtinCgl===true;
 const provenance=builtinCgl?
  (paper.edition==="source"?
   "SSC CGL original transcription: publisher-provided question wording and answer labels are preserved; disputed/invalid items can be excluded. This is not an SSC-operated or official answer-key service.":
   "SSC CGL reviewed edition: independent educational corrections and publisher-key cautions, not official SSC answer keys. Some disputed published answers remain scoreable with a caution; details appear only after submission."):
  paper.edition==="source"?
   "Source edition supplied by the paper author/importer. Publication, key accuracy and any claimed official status are not independently authenticated by Practice Desk.":
  paper.edition==="reviewed"?
   "Reviewed edition label and corrections are author/importer supplied. Practice Desk does not independently certify their accuracy or official status.":
   "Custom exam content and scoring were provided by the author/importer; Practice Desk is independent of examining organisations.";
 return {
  maximum:scoreableMaximum(paper,bundle.answerKey,bundle.questions),
  decimals:paper.scoring.decimalPlaces??2,
  eligibleQuestions,excludedQuestions,manualQuestions,correctedQuestions,cautionQuestions,
  totalQuestions:paper.sections.reduce((n,s)=>n+s.questionRevisionIds.length,0),
  ruleSummary,hasVariableRules,hasComponentScoring,timingRules,navigationRules,
  provenance,patchCount:builtinCgl&&paper.edition==="reviewed"?
    options.reviewedPatchCount??0:null,
  builtinCgl,sectionTitles:paper.sections.map(s=>s.title)
 };
}

export function preflightHTML(p:ExamPreflight):string{
 const label=(n:number)=>n.toFixed(p.decimals);
 return '<section id="g-preflight" class="paper-preflight" aria-label="Pre-test scoring and editorial information">'+
  '<h3>Scoring & source audit</h3>'+
  '<div class="preflight-scoreline"><strong>'+escapeHTML(label(p.maximum))+
  '</strong><span>eligible automated marks</span></div>'+
  '<p class="fine">Computed for this selected practice mode and edition; not the unadjusted printed maximum.</p>'+
  '<p class="preflight-rule"><b>Marking:</b> '+escapeHTML(p.ruleSummary)+'</p>'+
  (p.hasComponentScoring?'<p class="fine">Component-based partial credit applies where configured, capped at each question\'s full marks.</p>':"")+
  '<p class="fine">Question status: '+plural(p.eligibleQuestions,"automatically scoreable")+
  '; '+plural(p.excludedQuestions,"excluded")+
  '; '+plural(p.manualQuestions,"manual-response")+
  '; '+plural(p.cautionQuestions,"editorial caution")+
  '; '+plural(p.correctedQuestions,"corrected")+'.'+
  (p.patchCount===null?"":' Independently reviewed changes in this built-in edition: '+
    p.patchCount+'.')+'</p>'+
  '<p class="preflight-provenance"><b>Source & independence:</b> '+escapeHTML(p.provenance)+'</p>'+
  '<p class="fine">Exact key choices, editorial disputes, worked solutions and original-versus-reviewed answer comparisons remain hidden until permitted after completion.</p>'+
 '</section>';
}

export function examRulesHTML(p:ExamPreflight):string{
 const list=(items:readonly string[])=>'<ul>'+items.map(item=>'<li>'+escapeHTML(item)+'</li>').join("")+'</ul>';
 return '<details class="panel pad help-rules" id="g-exam-rules">'+
  '<summary>Full exam rules, shortcuts, source audit & offline storage</summary>'+
  '<div class="help-rules-body">'+
  '<h3>Exam clock and sections</h3>'+list(p.timingRules)+
  '<h3>Questions, review and navigation</h3>'+list(p.navigationRules)+
  '<h3>Scoring for this selection</h3><p>'+escapeHTML(p.ruleSummary)+
  '. Maximum eligible automated marks: <b>'+escapeHTML(p.maximum.toFixed(p.decimals))+
  '</b>. Excluded items are omitted; written/manual questions are self-assessed separately.</p>'+
  '<h3>Exam keyboard shortcuts</h3><p>During a running exam, A–D answer a single-choice question; '+
  'left/right arrows navigate questions when focus allows; M toggles a flag if permitted; '+
  'F toggles full-screen/focus layout. Keyboard shortcuts do not operate in text entry or an open Display panel. '+
  'Use ordinary Tab, Enter and Space to navigate controls.</p>'+
  '<h3>Source and editorial independence</h3><p>'+escapeHTML(p.provenance)+
  ' No answer key, solution, dispute details or correction comparison is disclosed before permitted post-test review.</p>'+
  '<h3>Offline data and backups</h3><p>This is a standalone offline tool, not a synchronised account. '+
  'Attempts and display choices are kept in the current browser profile; storage can be cleared or evicted. '+
  'Export checksum-verified backups from History, store them outside this device, and keep a separate copy before deleting. '+
  'Imported backups merge additively; existing saved records are not silently replaced. '+
  'Fullscreen depends on browser support and may use a focus-layout fallback.</p>'+
  '</div></details>';
}
