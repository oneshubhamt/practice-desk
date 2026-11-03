import { EXAM_SHORTCUT_HELP } from "./exam-shortcuts.ts";
/** Read-only exam display; fullscreen state is supplied, not read from the DOM. */
import type {ExamPackage,GenericAttempt} from "./exam-package.ts";
import type {OptionId} from "../domain/ids.js";
import {escapeText} from "./html-escape.ts";
import {assetHTML,stimulusHTML,renderGenericControls} from "./question-content-view.ts";
/** Human-readable view of a frozen practice mode; do not alter persistence. */
export function readablePracticeMode(mode:string):string{
 switch(mode){
  case "exam-simulation": return "Exam simulation";
  case "full-paper-practice": return "Full paper · flexible navigation";
  case "section-practice": return "Single-section practice";
  case "custom-practice": return "Custom practice";
  default: return mode.replaceAll("-"," ");
 }
}
export const minutes=(ms:number):string=>{
  const sec=Math.ceil(Math.max(0,ms)/1000);
  return Math.floor(sec/60).toString().padStart(2,"0")+":"+(sec%60).toString().padStart(2,"0");
};
export function examTimeRemaining(paper:ExamPackage["paper"],state:GenericAttempt["state"]):number|null{
  if(paper.timing.kind==="untimed")return null;
  if(paper.timing.kind==="whole-paper")return Math.max(0,paper.timing.durationMs-state.elapsedMs);
  const id=paper.sections[state.sectionIndex]?.id;
  const limit=paper.timing.sectionLimits.find(s=>s.sectionId===id)?.durationMs;
  return limit==null?null:Math.max(0,limit-state.sectionElapsedMs);
}

export function renderModelExam(
 attempt:Pick<GenericAttempt,"state"|"frozen"|"packageId">,
 bundle:ExamPackage|undefined,warning="",
 draft?:{readonly questionId:string;readonly optionIds:readonly OptionId[];readonly message:string},
 view:Readonly<{focused:boolean}>={focused:false}
):string {
   const paper=attempt.frozen.paper, state=attempt.state;
   const section=paper.sections[state.sectionIndex];
   const id=section?.questionRevisionIds[state.questionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===id);
   if(!section||!q)return '<p>Question unavailable</p>';
   const responsesById=new Map(state.responses.map(row=>[row.questionRevisionId,row]));
   const response=responsesById.get(q.id)?.response;
   const currentDraft=draft?.questionId===q.id&&q.content.kind==="multiple-select"?draft:null;
   const remaining=examTimeRemaining(paper,state);
   const total=paper.sections.reduce((n,section)=>n+section.questionRevisionIds.length,0);
   const answered=state.responses.filter(record=>record.response).length;
   const timeLimit=paper.timing.kind==="whole-paper"?paper.timing.durationMs:
     paper.timing.kind==="sectional"?paper.timing.sectionLimits.find(t=>t.sectionId===section.id)?.durationMs??null:null;
   const elapsed=paper.timing.kind==="sectional"?state.sectionElapsedMs:state.elapsedMs;
   const expired=state.status==="section-expired";
   const lockedWhole=paper.timing.kind!=="sectional"&&paper.navigation.sectionNavigation==="sequential-locked";
   const hasNextSection=state.sectionIndex < paper.sections.length-1;
   const untimedSection=paper.timing.kind==="sectional"&&
     paper.timing.sectionLimits.find(limit=>limit.sectionId===section.id)?.durationMs===null;
   const progressValue=timeLimit!==null&&timeLimit>0?
     Math.min(100,100*elapsed/timeLimit):Math.min(100,100*answered/Math.max(1,total));
   const progressScope=timeLimit===null?"Question coverage":
     paper.timing.kind==="whole-paper"?"Whole-paper timer":"Section timer";
   const progressAccessibleName=timeLimit===null?"Questions answered":
     paper.timing.kind==="whole-paper"?"Whole-paper time used":"Section time used";
   const isLow=remaining!==null&&remaining<=60000;
   const focused=view.focused;
   const sectionAnswered=section.questionRevisionIds.filter(qid=>Boolean(responsesById.get(qid)?.response)).length;
   const sectionFlagged=section.questionRevisionIds.filter(qid=>Boolean(responsesById.get(qid)?.flagged)).length;

   const assets:ExamPackage={format:"practice-desk-exam",version:1,
     examId:attempt.frozen.snapshot.examId,title:bundle?.title??"",paper,answerKey:attempt.frozen.key,
     questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli,assets:attempt.frozen.assets};
   return '<div class="generic-heading exam-header"><div><h1>'+escapeText(bundle?.title??paper.paperId)+'</h1>'+
     '<p class="muted">'+escapeText(readablePracticeMode(attempt.frozen.snapshot.mode))+' · '+
     escapeText(section.title)+' · Section '+(state.sectionIndex+1)+' of '+paper.sections.length+'</p></div>'+
     '<div class="row exam-header-actions"><div class="exam-clock '+(isLow?"low":"")+'"><strong class="generic-timer" id="g-timer" role="timer">'+
       (remaining===null?"Untimed":minutes(remaining))+'</strong><small>'+(remaining===null?"UNTIMED PRACTICE":
        paper.timing.kind==="sectional"?"SECTION TIME LEFT":"PAPER TIME LEFT")+'</small></div>'+
     '<button class="btn quiet" id="g-library">← Library</button>'+
     '<button class="btn" type="button" id="g-exam-full" aria-label="Toggle full-screen test view" aria-pressed="'+
     focused+'">'+(focused?"⛶ Exit full screen":"⛶ Full screen")+'</button></div></div>'+
     '<p id="g-fullscreen-status" role="status"></p>'+
     (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
     (expired?'<p class="generic-warning" role="status">Section time has expired. Answers are locked. Select Continue to advance without using extra time.</p>':"")+
     '<section class="exam-progress"><div class="progress-track exam-time-progress" role="progressbar" aria-valuenow="'+Math.round(progressValue)+
        '" aria-valuemin="0" aria-valuemax="100" aria-label="'+progressAccessibleName+
        '" aria-valuetext="'+escapeText(progressScope)+' '+Math.round(progressValue)+'%">'+
         '<span style="width:'+progressValue.toFixed(1)+'%"></span></div></section>'+
     '<div class="generic-sections" role="group" aria-label="Exam sections">'+paper.sections.map((s,i)=>{
       const locked=state.status!=="running"||state.completedSections.includes(i)||
         ((paper.timing.kind==="sectional"||paper.navigation.sectionNavigation==="sequential-locked")&&i!==state.sectionIndex);
       const filled=s.questionRevisionIds.filter(qid=>Boolean(responsesById.get(qid)?.response)).length;
       const status=state.completedSections.includes(i)?"Closed":
         locked?"Locked":filled+" / "+s.questionRevisionIds.length+" answered";
       return '<button class="btn exam-section-tab '+(i===state.sectionIndex?"primary":"")+'" data-section="'+i+'" aria-current="'+(i===state.sectionIndex?"step":"false")+'"'+(locked?" disabled":"")+'>'+
         '<b>'+escapeText(s.title)+'</b><small>'+status+'</small></button>';
     }).join("")+'</div><div class="generic-layout exam-grid"><section class="panel pad exam-question"><p class="eyebrow">'+
     escapeText(section.title)+' · Question '+(state.questionIndex+1)+' of '+section.questionRevisionIds.length+
     (attempt.frozen.snapshot.examId==="ssc-cgl"?
       ' · Paper Q'+escapeText(q.questionId.split(":").at(-1)):"")+'</p>'+
     stimulusHTML(assets,q)+'<h2 class="generic-prompt">'+escapeText(q.content.prompt)+'</h2>'+
     assetHTML(assets,q.content.assetIds,"Figure for question "+(state.questionIndex+1))+
     '<fieldset class="generic-response-group"'+(state.status!=="running"?" disabled":"")+'>'
     +renderGenericControls(assets,q,currentDraft?{kind:"multiple-select",optionIds:currentDraft.optionIds}:response)+
     (currentDraft?'<p class="generic-inline-warning" role="status">'+escapeText(currentDraft.message)+'</p>':"")+
     '</fieldset>'+
     '<div class="exam-question-controls">'+
     '<div class="row generic-actions exam-nav-actions"><button class="btn" id="g-prev"'+(state.status!=="running"||!state.questionIndex||paper.navigation.questionNavigation==="forward-only"?" disabled":"")+'>← Previous</button>'+
     '<button class="btn primary" id="g-next"'+(state.status!=="running"||state.questionIndex===section.questionRevisionIds.length-1?" disabled":"")+'>Next →</button></div>'+
     '<div class="row generic-actions exam-answer-actions"><button class="btn" id="g-clear"'+(!response||state.status!=="running"?" disabled":"")+'>Clear</button>'+
     '<button class="btn review-toggle" id="g-flag" aria-pressed="'+Boolean(responsesById.get(q.id)?.flagged)+'"'+(!paper.navigation.allowFlagging||expired?" disabled":"")+'>'+(responsesById.get(q.id)?.flagged?"Unmark":"Mark for review")+'</button></div>'+
     '</div>'+
     '<div class="row generic-actions exam-submit-actions">'+
     (paper.timing.kind!=="untimed"&&paper.timing.pausePolicy==="allowed"?
      '<button class="btn" id="g-pause"'+(expired?" disabled":"")+'>'+(state.status==="paused"?"Resume timer":"Pause timer")+'</button>':"")+
     '<button class="btn danger" id="g-submit"'+(state.status==="paused"||
       (paper.timing.kind==="sectional"&&!paper.timing.allowEarlySubmit&&!expired&&!untimedSection)?" disabled":"")+'>'+
      (expired?(hasNextSection?"Continue to next section":"Finish expired exam"):
        paper.timing.kind==="sectional"?(untimedSection?"Finish untimed section":"Submit section"):
        lockedWhole&&hasNextSection?"Finish section →":"Submit exam")+'</button></div></section>'+
     '<aside class="panel pad exam-sidebar" aria-label="Question navigator"><h3>Question navigator</h3>'+
     '<p class="fine navigator-intro">Jump to a question in this section</p><div class="generic-palette">'+
      section.questionRevisionIds.map((qid,i)=>{
        const r=responsesById.get(qid);
        const locked=state.status!=="running"||(paper.navigation.questionNavigation==="forward-only"&&i<state.questionIndex);
        return '<button class="num '+(i===state.questionIndex?"here ":"")+(r?.response?"answered ":"")+
        (r?.flagged?"marked":"")+'" data-q="'+i+'" aria-current="'+(i===state.questionIndex?"step":"false")+'" aria-label="Question '+(i+1)+
        (r?.response?", answered":"")+(r?.flagged?", flagged":"")+'"'+(locked?" disabled":"")+'>'+(i+1)+'</button>';
      }).join("")+'</div>'+
      '<div class="navigator-stats" role="group" aria-label="Current section answer counts">'+
       '<div><b>'+sectionAnswered+'<span> / '+section.questionRevisionIds.length+'</span></b><small>Answered</small></div>'+
       '<div><b>'+(section.questionRevisionIds.length-sectionAnswered)+'</b><small>Not answered</small></div>'+
       '<div><b>'+sectionFlagged+'</b><small>Flagged</small></div></div>'+
      '<div class="palette-legend"><span><i class="legend-dot answered"></i>Answered</span>'+
       '<span><i class="legend-dot marked"></i>Review</span>'+
       '<span><i class="legend-dot empty"></i>Not answered</span></div>'+
      '<p class="fine navigator-status">'+(paper.navigation.sectionNavigation==="sequential-locked"?
        "Answers remain hidden until the exam finishes. Submitting a section locks it.":
        "Answers remain hidden until you submit.")+'</p>'+
      '<details class="navigator-help"><summary>Keyboard shortcuts</summary>'+
       '<p class="fine">'+(paper.navigation.questionNavigation==="forward-only"?
        "Questions cannot be revisited in this exam.":"Navigate freely where the paper permits.")+
       ' '+EXAM_SHORTCUT_HELP+'</p></details></aside></div>';
 }
