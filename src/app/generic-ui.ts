import { builtinCglPackages, configureCglPractice, validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "./exam-package.ts";
import type { ExamPackage, GenericAttempt, CglPracticeMode } from "./exam-package.ts";
import type { QuestionRevision, CandidateResponse } from "../domain/question.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { SessionEvent } from "../engine/session.ts";
import { restoreSession, chooseRecovered, assertFrozenContent } from "../history/frozen.ts";
import { createSessionClock } from "../engine/clock.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { manualGradeLimit, manualGradeSummary, setManualGrade, validateManualGrades } from "../engine/manual-grading.ts";
import { createSourceKeyReference,sourceKeyScore,validateSourceKeyReference } from "../engine/source-comparison.ts";
import { createSourceReviewReference,validateSourceReviewReference } from "../engine/review-source.ts";
import { scoreableMaximum, sectionScoreSummaries } from "../engine/score-ceiling.ts";
import type { CorrectAnswer } from "../domain/answer-key.js";
import type { Verdict } from "../engine/scoring.ts";
import { makeBackup, verifyBackup, planBackupMerge } from "../history/backup.ts";
import { validateResponse } from "../engine/response.ts";
import { assertWriteVersion, nextWriteVersion } from "../history/concurrency.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";
import { createLearningDesk } from "./learning-ui.ts";
import { makeRevisionPackage,createNotebookLineage,validateNotebookLineage } from "../learning/revision-test.ts";
import { attemptEvidence } from "../learning/attempt-evidence.ts";
import { answerRevisionEvidence } from "../learning/answer-revisions.ts";
import { questionSpeed } from "../learning/question-analytics.ts";
import { historyHTML, type HistorySort, type HistoryStatus } from "./history-page.ts";
import { reviewMatch, reviewFiltersHTML, resultTabsHTML, sectionPaceHTML, timingLedgerHTML, questionCoachingHTML, type ResultTab, type ReviewFilter } from "./result-presentation.ts";
import { addLearningCard, validateLearningCard } from "../learning/learning.ts";
import type { LearningCard } from "../learning/learning.ts";
import { readDisplayPreferences, writeDisplayPreferences, SETTINGS_EVENT } from "./preferences.ts";
import { readPracticeSelection,writePracticeSelection } from "./practice-selection.ts";

const escapeText=(s:unknown):string=>String(s??"").replace(/[&<>"']/g,c=>
  ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]??c);
const minutes=(ms:number):string=>{
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
function assetHTML(bundle:ExamPackage,ids:readonly string[]|undefined):string{
  return (ids??[]).map(id=>{
    const a=bundle.assets?.find(x=>x.id===id);
    return a?'<img class="generic-figure" src="'+escapeText(a.dataUri)+'" alt="'+escapeText(a.altText??"Question image")+'">':"";
  }).join("");
}
export function renderGenericControls(bundle:ExamPackage,q:QuestionRevision,response?:CandidateResponse):string{
  const c=q.content;
  if(c.kind==="single-choice"||c.kind==="multiple-select"){
    const selected=response?.kind==="single-choice"?[response.optionId]:response?.kind==="multiple-select"?response.optionIds:[];
    const kind=c.kind==="single-choice"?"radio":"checkbox";
    return '<fieldset class="generic-choices"><legend>'+ (kind==="radio"?"Select one option":"Select applicable options")+'</legend>'+
      c.options.map((o,i)=>'<label class="generic-choice"><input type="'+kind+'" name="generic-answer" data-choice="'+escapeText(o.id)+'"'+
        (selected.includes(o.id)?" checked":"")+'><span><b>'+String.fromCharCode(65+i)+'.</b> '+escapeText(o.text)+assetHTML(bundle,o.assetIds)+'</span></label>').join("")+
      '</fieldset>';
  }
  if(c.kind==="true-false")return '<fieldset class="generic-choices"><legend>Choose a response</legend>'+
    [true,false].map(value=>'<label class="generic-choice"><input type="radio" name="generic-boolean" data-bool="'+value+'"'+
     (response?.kind==="true-false"&&response.value===value?" checked":"")+'><span>'+(value?"True":"False")+'</span></label>').join("")+'</fieldset>';
  if(c.kind==="numeric-entry")return '<label class="picker" for="g-number">Numeric answer</label><input type="number" step="any" id="g-number"'+
    (c.numericRules.minimum!==undefined?' min="'+c.numericRules.minimum+'"':"")+
    (c.numericRules.maximum!==undefined?' max="'+c.numericRules.maximum+'"':"")+
    ' value="'+(response?.kind==="numeric-entry"?escapeText(response.value):"")+'"><button class="btn primary" id="g-save">Save answer</button>';
  if(c.kind==="free-response")return '<label class="picker" for="g-text">Written response</label><textarea id="g-text" rows="6">'+
    (response?.kind==="free-response"?escapeText(response.text):"")+'</textarea><button class="btn primary" id="g-save">Save response</button>';
  const pairs=response?.kind==="matching"?response.pairs:[];
  return '<div class="generic-matches">'+c.leftItems.map(left=>'<label><span>'+escapeText(left.text)+assetHTML(bundle,left.assetIds)+'</span><select data-match="'+escapeText(left.id)+'"><option value="">Not matched</option>'+
    c.rightItems.map(right=>'<option value="'+escapeText(right.id)+'"'+
      (pairs.some(p=>p.leftId===left.id&&p.rightId===right.id)?" selected":"")+'>'+escapeText(right.text)+'</option>').join("")+
    '</select></label>').join("")+'</div><button class="btn primary" id="g-save">Save matches</button>';
}
function stimulusHTML(bundle:ExamPackage,q:QuestionRevision):string{
 const stimulus=bundle.stimuli?.find(s=>s.id===q.content.stimulusId);
 if(!stimulus)return "";
 if(stimulus.kind==="passage"||stimulus.kind==="case")
   return '<section class="generic-stimulus"><b>'+escapeText(stimulus.title||"Reading passage")+'</b><p>'+escapeText(stimulus.text)+'</p>'+assetHTML(bundle,stimulus.assetIds)+'</section>';
 if(stimulus.kind==="table")return '<section class="generic-stimulus"><b>'+escapeText(stimulus.title||"Table")+'</b><div class="scroll-table"><table><tr>'+
   stimulus.columns.map(c=>'<th>'+escapeText(c)+'</th>').join("")+'</tr>'+
   stimulus.rows.map(r=>'<tr>'+r.map(c=>'<td>'+escapeText(c)+'</td>').join("")+'</tr>').join("")+'</table></div></section>';
 if ("assetId" in stimulus) return '<section class="generic-stimulus">'+
    assetHTML(bundle,[stimulus.assetId])+'<p>'+escapeText(stimulus.caption||stimulus.altText)+'</p></section>';
  return "";
}

type PackageRecord={recordType:"generic-package";id:string;bundle:ExamPackage;saveRevision?:number};
type RecordItem=PackageRecord|GenericAttempt|LearningCard;
const isAttempt=(x:unknown):x is GenericAttempt=>!!x&&typeof x==="object"&&(x as GenericAttempt).recordType==="generic-attempt";
const isPackage=(x:unknown):x is PackageRecord=>!!x&&typeof x==="object"&&(x as PackageRecord).recordType==="generic-package";
const isLearning=(x:unknown):x is LearningCard=>!!x&&typeof x==="object"&&(x as LearningCard).recordType==="learning-card";

/** Treat browser records and exported JSON as untrusted until their frozen inputs and responses validate. */
export function validateGenericStoredRecord(value:unknown):RecordItem {
 if(value && typeof value==="object" && "saveRevision" in value){
   const n=(value as {saveRevision:unknown}).saveRevision;
   if(typeof n!=="number"||!Number.isSafeInteger(n)||n<0)
     throw new Error("Invalid stored write revision");
 }
 if(isLearning(value))return validateLearningCard(value);
 if(isPackage(value)){
   if(typeof value.id!=="string" || value.id!=="generic-package:"+value.bundle?.paper?.id)
     throw new Error("Invalid imported package record identity");
   validateExamPackage(value.bundle);
   return value;
 }
 if(!isAttempt(value))throw new Error("Unsupported generic history record");
 if(typeof value.id!=="string"||!value.id||value.id.length>200||
    typeof value.packageId!=="string"||
    !Number.isFinite(value.startedAt)||!Number.isFinite(value.updatedAt)||
    (value.finishedAt!==null&&!Number.isFinite(value.finishedAt))||
    !value.state||!Array.isArray(value.state.responses)||
    !Number.isFinite(value.state.clockMs)||
    !Number.isInteger(value.state.sectionIndex)||!Number.isInteger(value.state.questionIndex))
   throw new Error("Invalid generic attempt record");
 assertFrozenContent(value.frozen);
 const paper=value.frozen.paper;
 if(value.packageId!==paper.id)throw new Error("Attempt references an incorrect revision");
 const current=paper.sections[value.state.sectionIndex]?.questionRevisionIds[value.state.questionIndex];
 if(!current)throw new Error("Attempt cursor references an unknown question");
 if(value.finishedAt!==null && value.state.status!=="completed")
   throw new Error("Completed attempt has an unfinished session");
 if(value.finishedAt===null && value.state.status==="completed")
   throw new Error("Unfinished attempt has a completed session");
 const questionMap=new Map(value.frozen.questions.map(q=>[q.id,q]));
 const allowed=new Set(paper.sections.flatMap(section=>section.questionRevisionIds));
 if(value.state.questionVisits!==undefined){
   const visits=value.state.questionVisits;
   if(!Array.isArray(visits)||visits.length===0||visits.length>allowed.size||
      new Set(visits.map(row=>row?.questionRevisionId)).size!==visits.length||
      visits.some(row=>!row||!allowed.has(row.questionRevisionId)||
        !Number.isSafeInteger(row.count)||row.count<1||row.count>1000000))
     throw new Error("Invalid saved question visit history");
 }
 const seen=new Set<string>();
 for(const row of value.state.responses){
   if(!row || typeof row.questionRevisionId!=="string" ||
      !allowed.has(row.questionRevisionId) || seen.has(row.questionRevisionId)||
      !Number.isFinite(row.timeSpentMs)||row.timeSpentMs<0 ||
      !Number.isInteger(row.answerChangeCount)||row.answerChangeCount<0)
     throw new Error("Invalid saved response");
   seen.add(row.questionRevisionId);
   if(row.response)validateResponse(questionMap.get(row.questionRevisionId)!,row.response);
   if(row.answerEvents!==undefined){
     if(!Array.isArray(row.answerEvents)||row.answerEvents.length>1000)
       throw new Error("Invalid saved answer revision history");
     let previousEvent:typeof row.answerEvents[number]|undefined;
     let previousTime=value.startedAt;
     for(const event of row.answerEvents){
       if(!event||typeof event.at!=="string"||!Number.isFinite(Date.parse(event.at))||
          Date.parse(event.at)<previousTime||Date.parse(event.at)>value.updatedAt||
          (!event.from&&!event.to))throw new Error("Invalid saved answer revision event");
       if(event.from)validateResponse(questionMap.get(row.questionRevisionId)!,event.from);
       if(event.to)validateResponse(questionMap.get(row.questionRevisionId)!,event.to);
       if(previousEvent&&JSON.stringify(previousEvent.to??null)!==JSON.stringify(event.from??null))
         throw new Error("Disconnected saved answer revision history");
       previousTime=Date.parse(event.at);previousEvent=event;
     }
     if(previousEvent&&JSON.stringify(previousEvent.to??null)!==JSON.stringify(row.response??null))
       throw new Error("Saved answer revision does not match final response");
   }
 }
 if(value.finishedAt!==null){
   if(!value.result)throw new Error("Completed attempt has no immutable score");
   const recalculated=scoreAttempt(paper,value.frozen.key,value.frozen.questions,value.state.responses,
     value.result.snapshot.calculatedAt);
   const fields=["earnedMarks","positiveMarks","penaltyMarks","correctCount","incorrectCount","unansweredCount","excludedCount"] as const;
   if(fields.some(field=>value.result!.snapshot[field]!==recalculated.snapshot[field])||
      JSON.stringify(value.result.items)!==JSON.stringify(recalculated.items)||
      typeof value.result.snapshot.calculatedAt!=="string"||
      !Number.isFinite(Date.parse(value.result.snapshot.calculatedAt)))
     throw new Error("Completed attempt score does not match its frozen inputs (summary or item verdict)");
 }
 validateManualGrades(value);
 validateSourceKeyReference(value);
 validateSourceReviewReference(value);
 if(value.completionReason!==undefined){
   if(value.finishedAt===null||
     !["time-expired","submitted","section-submitted"].includes(value.completionReason))
     throw new Error("Invalid saved completion provenance");
 }
 validateNotebookLineage(value);
 return value;
}


export function renderModelExam(
 attempt:Pick<GenericAttempt,"state"|"frozen"|"packageId">,
 bundle:ExamPackage|undefined,warning=""
):string {
   const paper=attempt.frozen.paper, state=attempt.state;
   const section=paper.sections[state.sectionIndex];
   const id=section?.questionRevisionIds[state.questionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===id);
   if(!section||!q)return '<p>Question unavailable</p>';
   const responsesById=new Map(state.responses.map(row=>[row.questionRevisionId,row]));
   const response=responsesById.get(q.id)?.response;
   const remaining=examTimeRemaining(paper,state);
   const total=paper.sections.reduce((n,section)=>n+section.questionRevisionIds.length,0);
   const answered=state.responses.filter(record=>record.response).length;
   const flagged=state.responses.filter(record=>record.flagged).length;
   const visited=state.responses.filter(record=>record.timeSpentMs>0).length;
   const timeLimit=paper.timing.kind==="whole-paper"?paper.timing.durationMs:
     paper.timing.kind==="sectional"?paper.timing.sectionLimits.find(t=>t.sectionId===section.id)?.durationMs??null:null;
   const elapsed=paper.timing.kind==="sectional"?state.sectionElapsedMs:state.elapsedMs;
   const expired=state.status==="section-expired";
   const lockedWhole=paper.timing.kind==="whole-paper"&&paper.navigation.sectionNavigation==="sequential-locked";
   const hasNextSection=state.sectionIndex < paper.sections.length-1;
   const progressValue=timeLimit!==null&&timeLimit>0?
     Math.min(100,100*elapsed/timeLimit):Math.min(100,100*answered/Math.max(1,total));
   const isLow=remaining!==null&&remaining<=60000;
   const focused=typeof document!=="undefined"&&Boolean(
     document.fullscreenElement||document.documentElement.classList.contains("immersive"));

   const assets:ExamPackage={format:"practice-desk-exam",version:1,
     examId:attempt.frozen.snapshot.examId,title:bundle?.title??"",paper,answerKey:attempt.frozen.key,
     questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli,assets:attempt.frozen.assets};
   return '<div class="generic-heading exam-header"><div><span class="eyebrow">EXAM IN PROGRESS · '+escapeText(attempt.frozen.snapshot.mode)+'</span>'+
     '<h1>'+escapeText(bundle?.title??paper.paperId)+'</h1><p class="muted">'+
     escapeText(section.title)+' · Section '+(state.sectionIndex+1)+' of '+paper.sections.length+'</p></div>'+
     '<div class="row exam-header-actions"><div class="exam-clock '+(isLow?"low":"")+'"><strong class="generic-timer" id="g-timer" role="timer">'+
       (remaining===null?"Untimed":minutes(remaining))+'</strong><small>'+(remaining===null?"PRACTICE":"TIME REMAINING")+'</small></div>'+
     '<button class="btn quiet" id="g-library">← Library</button>'+
     '<button class="btn" type="button" id="g-exam-full" aria-label="Toggle full-screen test view" aria-pressed="'+
     focused+'">'+(focused?"⛶ Exit full screen":"⛶ Full screen")+'</button></div></div>'+
     '<p id="g-fullscreen-status" role="status"></p>'+
     (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
     (expired?'<p class="generic-warning" role="status">Section time has expired. Answers are locked. Select Continue to advance without using extra time.</p>':"")+
     '<section class="exam-progress"><div class="row between"><span class="fine">'+answered+' / '+total+' answered · '+visited+' viewed · '+flagged+' flagged</span>'+
       '<span class="fine">'+(timeLimit!==null?"Section timer":"Question coverage")+' · '+Math.round(progressValue)+'%</span></div>'+
       '<div class="progress-track exam-time-progress" role="progressbar" aria-valuenow="'+Math.round(progressValue)+
        '" aria-valuemin="0" aria-valuemax="100" aria-label="'+(timeLimit!==null?"Time used":"Questions answered")+'">'+
         '<span style="width:'+progressValue.toFixed(1)+'%"></span></div></section>'+
     '<div class="generic-sections" role="group" aria-label="Exam sections">'+paper.sections.map((s,i)=>{
       const locked=state.completedSections.includes(i)||
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
     assetHTML(assets,q.content.assetIds)+
     '<fieldset class="generic-response-group"'+(state.status!=="running"?" disabled":"")+'>'
     +renderGenericControls(assets,q,response)+'</fieldset>'+
     '<div class="row generic-actions exam-answer-actions"><button class="btn" id="g-clear"'+(!response||state.status!=="running"?" disabled":"")+'>Clear</button>'+
     '<button class="btn" id="g-flag" aria-pressed="'+Boolean(responsesById.get(q.id)?.flagged)+'"'+(!paper.navigation.allowFlagging||state.status==="paused"?" disabled":"")+'>Flag</button></div>'+
     '<div class="row generic-actions exam-nav-actions"><button class="btn" id="g-prev"'+(expired||!state.questionIndex||paper.navigation.questionNavigation==="forward-only"?" disabled":"")+'>← Previous</button>'+
     '<button class="btn" id="g-next"'+(expired||state.questionIndex===section.questionRevisionIds.length-1?" disabled":"")+'>Next →</button></div>'+
     '<div class="row generic-actions exam-submit-actions">'+
     (paper.timing.kind!=="untimed"&&paper.timing.pausePolicy==="allowed"?
      '<button class="btn" id="g-pause"'+(expired?" disabled":"")+'>'+(state.status==="paused"?"Resume timer":"Pause timer")+'</button>':"")+
     '<button class="btn danger" id="g-submit"'+(state.status==="paused"||
       (paper.timing.kind==="sectional"&&!paper.timing.allowEarlySubmit&&!expired)?" disabled":"")+'>'+
      (expired?(hasNextSection?"Continue to next section":"Finish expired exam"):
        paper.timing.kind==="sectional"?"Submit section":
        lockedWhole&&hasNextSection?"Finish section →":"Submit exam")+'</button></div></section>'+
     '<aside class="panel pad exam-sidebar"><div class="row between"><h3>Question navigator</h3><span class="fine">'+
       section.questionRevisionIds.length+' questions</span></div>'+
      '<p class="fine">Select a question number to navigate within the current section.</p><div class="generic-palette">'+
      section.questionRevisionIds.map((qid,i)=>{
        const r=responsesById.get(qid);
        const locked=expired||(paper.navigation.questionNavigation==="forward-only"&&i<state.questionIndex);
        return '<button class="num '+(i===state.questionIndex?"here ":"")+(r?.response?"answered ":"")+
        (r?.flagged?"marked":"")+'" data-q="'+i+'" aria-current="'+(i===state.questionIndex?"step":"false")+'" aria-label="Question '+(i+1)+
        (r?.response?", answered":"")+(r?.flagged?", flagged":"")+'"'+(locked?" disabled":"")+'>'+(i+1)+'</button>';
      }).join("")+'</div><div class="palette-legend"><span><i class="legend-dot answered"></i>Answered</span>'+
       '<span><i class="legend-dot marked"></i>Flagged</span>'+
       '<span><i class="legend-dot current"></i>Current</span>'+
       '<span><i class="legend-dot empty"></i>Unanswered</span></div><p class="fine">'+(paper.navigation.questionNavigation==="forward-only"?
        "Questions cannot be revisited in this exam.":"Navigate freely where the paper permits.")+
      ' Shortcuts: A–D answer single-choice questions, ← / → navigate, M flag, F full screen. Alt + ← / → also works. Shortcuts are disabled while typing or paused.</p></aside></div>';
 }


let builtinCache:{
 sources:SourcePaperBank;patches:ReviewPatchBank;
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>;bundles:ExamPackage[]
}|null=null;
function cachedCglPackages(sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):ExamPackage[]{
 if(builtinCache&&builtinCache.sources===sources&&builtinCache.patches===patches&&builtinCache.solutions===solutions)
   return builtinCache.bundles;
 const bundles=builtinCglPackages(sources,patches,solutions);
 builtinCache={sources,patches,solutions,bundles};
 return bundles;
}
export function mountExamWorkspace(root:HTMLElement,sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>):()=>void{
 const packages=new Map<string,ExamPackage>(cachedCglPackages(sources,patches,solutions).map(p=>[p.paper.id,p]));
 const records=new Map<string,RecordItem>();
 let choice=[...packages.values()].reverse().find(p=>p.paper.edition==="reviewed")?.paper.id??(packages.keys().next().value as string);
 let cglMode:CglPracticeMode="strict", singleSection=0;
 const storedSelection=readPracticeSelection();
 if(storedSelection){
   if(packages.has(storedSelection.paperRevisionId))choice=storedSelection.paperRevisionId;
   cglMode=storedSelection.mode;
   singleSection=Math.min(storedSelection.section,
     Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
 }
 const saveSelection=():void=>{
   try{writePracticeSelection({schema:1,paperRevisionId:choice,mode:cglMode,section:singleSection});}
   catch{warning="Exam setup could not be saved on this device; current selection still works.";}
 };
  let historyFilter:HistoryStatus="all",historySort:HistorySort="newest",historySearch="",historyPaper="all";
  let resultTab:ResultTab="overview";
  let reviewFilter:ReviewFilter="all";
 let attempt:GenericAttempt|null=null, view:"library"|"history"|"exam"|"result"|"learning"="library";
 // Live-region updates depend on actual route/question changes, not timer ticks.
 let lastScreenKey="",lastDrawView:"library"|"history"|"exam"|"result"|"learning"|null=null,lastResultPane:ResultTab="overview";
 let db:IDBDatabase|null=null, warning="",disposed=false, loading=true, writeQueue=Promise.resolve();
 let lastTimerSave=0;
 let fallbackStamp:string|null=null, fallbackConflict=false, storageFault=false;
 const storageKey="practiceDesk.overhaul.fallback.v1", mirrorKey="practiceDesk.overhaul.active.v1";
 const dbName="practiceDesk.overhaul.v1";
 const downloadBackup=async():Promise<void>=>{
   await writeQueue;
   try{
     let toExport:RecordItem[]=[...records.values()];
     if(db&&!storageFault){
       try{
         const snapshot=await new Promise<unknown[]>((resolve,reject)=>{
           const request=db!.transaction("attempts","readonly").objectStore("attempts").getAll();
           request.onsuccess=()=>resolve(request.result);
           request.onerror=()=>reject(request.error??new Error("Database snapshot failed"));
         });
         toExport=snapshot.map(value=>validateGenericStoredRecord(value));
       }catch(error){
         storageFault=true;
         console.warn("Cannot read authoritative backup snapshot; exporting working-memory recovery",error);
       }
     }else if(fallbackConflict&&!storageFault){
       const latest=JSON.parse(localStorage.getItem(storageKey)??"[]") as unknown;
       if(!Array.isArray(latest))throw new Error("Invalid fallback history");
       toExport=latest.map(value=>validateGenericStoredRecord(value));
     }
     const valid=toExport.map(value=>validateGenericStoredRecord(value));
     const archive=makeBackup(valid as unknown as readonly Record<string,unknown>[],
       readDisplayPreferences(),new Date().toISOString(),readPracticeSelection());
     const blob=new Blob([JSON.stringify(archive)],{type:"application/json"});
     const url=URL.createObjectURL(blob);
     const link=document.createElement("a");link.href=url;
     link.download="Practice_Desk_Backup_"+new Date().toISOString().slice(0,10)+
       (storageFault?"_UNSAVED_RECOVERY":"")+".json";
     document.body.append(link);link.click();link.remove();
     window.setTimeout(()=>URL.revokeObjectURL(url),2000);
     if(storageFault){warning="Emergency recovery file exported. Some records were not committed to browser storage. Keep this file and reopen before editing.";draw();}
   }catch(error){warning=error instanceof Error?"Backup failed: "+error.message:"Backup failed";draw();}
 };
 const importHistory=async(file:File)=>{
   if(storageFault||fallbackConflict)throw new Error("Storage is unavailable or changed in another tab. Reopen before importing.");
   if(file.size>75*1024*1024)throw new Error("History backup exceeds 75 MiB");
   const archive=verifyBackup(JSON.parse(await file.text()));
   const imported=archive.records.map(record=>validateGenericStoredRecord(record));
   const incoming=planBackupMerge([...records.values()],imported,attempt?.id);
   if(!confirm("Import "+incoming.length+" new saved records and restore available display/exam setup preferences? Existing records will not be overwritten."))return;
   await writeQueue;
   if(incoming.length){
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const transaction=db!.transaction("attempts","readwrite");
         const store=transaction.objectStore("attempts");
         for(const record of incoming)store.add(structuredClone(record));
         transaction.oncomplete=()=>resolve();
         transaction.onerror=()=>reject(transaction.error??new Error("Import failed"));
         transaction.onabort=()=>reject(transaction.error??new Error("Import aborted"));
       });
     }else{
       if(localStorage.getItem(storageKey)!==fallbackStamp)
         throw new Error("Another tab changed fallback history; reopen before importing");
       const encoded=JSON.stringify([...records.values(),...incoming]);
       localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;
     }
     for(const record of incoming){
       records.set(record.id,record);
       if(isPackage(record)&&!packages.has(record.bundle.paper.id))
         packages.set(record.bundle.paper.id,record.bundle);
     }
   }
   try{
     writeDisplayPreferences(archive.preferences);
     window.dispatchEvent(new Event(SETTINGS_EVENT));
     if(archive.selection&&packages.has(archive.selection.paperRevisionId)){
       choice=archive.selection.paperRevisionId;
       cglMode=archive.selection.mode;
       singleSection=Math.min(archive.selection.section,
         Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
       saveSelection();
     }
     warning="Imported "+incoming.length+" records; available display/exam setup preferences restored.";
   }catch{
     warning="Imported "+incoming.length+" records. Display preferences could not be stored by this browser.";
   }
   draw();
 };
 const writeMirror=(record:GenericAttempt)=>{
   try{localStorage.setItem(mirrorKey,JSON.stringify(record));}
   catch{warning="Emergency session mirror could not be saved. Use a history export.";}
 };
 const notice=(s:string)=>{warning=s;draw();};
 const now=createSessionClock(Date.now(),performance.now(),()=>performance.now());
 const save=(record:RecordItem):Promise<boolean>=>{
   if(fallbackConflict||storageFault){
     warning="Storage is unavailable or changed in another tab. Export a recovery backup and reopen before editing.";
     draw();return Promise.resolve(false);
   }
   const previous=records.get(record.id);
   const expected=previous?previous.saveRevision??0:null;
   const versioned={...record,saveRevision:nextWriteVersion(expected)};
   records.set(record.id,versioned);
   if(isAttempt(versioned)){
     if(attempt?.id===versioned.id)attempt=versioned;
     writeMirror(versioned);
   }
   const pending=writeQueue.then(()=>new Promise<void>((resolve,reject)=>{
     if(storageFault){reject(new Error("A previous storage operation failed"));return;}
     if(!db){
       try{
         if(fallbackConflict||localStorage.getItem(storageKey)!==fallbackStamp)
           throw new Error("Another tab changed fallback history; reopen before editing");
         const encoded=JSON.stringify([...records.values()]);
         localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;resolve();
       }catch(error){reject(error);}
       return;
     }
     try{
       const tx=db.transaction("attempts","readwrite");
       const store=tx.objectStore("attempts");
       let conflict:Error|null=null;
       const read=store.get(record.id);
       read.onsuccess=()=>{
         try{
           assertWriteVersion(read.result as RecordItem|undefined,expected);
           store.put(structuredClone(versioned));
         }catch(error){conflict=error as Error;tx.abort();}
       };
       tx.oncomplete=()=>resolve();
       tx.onerror=()=>reject(conflict??tx.error??new Error("Write failed"));
       tx.onabort=()=>reject(conflict??tx.error??new Error("Write aborted"));
     }catch(error){reject(error);}
   }));
   writeQueue=pending.catch(()=>{});
   return pending.then(()=>true).catch(async e=>{
     const conflict=e instanceof Error&&e.message.startsWith("Another tab");
     storageFault=true;
     if(conflict){
       warning=e.message+"; changes in this tab were not saved. Reopen before editing.";
       if(isAttempt(versioned)&&attempt?.id===versioned.id){attempt=null;view="library";}
       try{localStorage.removeItem(mirrorKey);}catch{}
       records.delete(versioned.id);
       try{
         let latest:unknown;
         if(db){
           const req=db.transaction("attempts","readonly").objectStore("attempts").get(versioned.id);
           latest=await new Promise<unknown>((resolve,reject)=>{
             req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
           });
         }else{
           fallbackConflict=true;
           const stored=JSON.parse(localStorage.getItem(storageKey)??"[]") as unknown[];
           latest=stored.find(x=>x&&typeof x==="object"&&(x as {id?:string}).id===versioned.id);
         }
         if(latest)records.set(versioned.id,validateGenericStoredRecord(latest));
       }catch(error){console.warn("Could not reload changed record",error);}
     }else{
       warning="SAVE FAILED — changes in this tab are not safely stored. Export an UNSAVED recovery backup now, then reopen. "+
         (e instanceof Error?e.message:"");
     }
     console.warn("Exam workspace save",e);
     if(!disposed)draw();
     return false;
   });
 };
 const removeSavedAttempt=async(id:string):Promise<void>=>{
   const saved=records.get(id);
   if(storageFault||fallbackConflict){notice("Storage locked. Export recovery backup and reopen before deleting.");return;}
   if(!(isAttempt(saved)||isLearning(saved))||!confirm("Permanently delete this saved item? Export a backup first if needed."))return;
   try{
     await writeQueue;
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const tx=db!.transaction("attempts","readwrite");
         const store=tx.objectStore("attempts");
         let conflict:Error|null=null;
         const request=store.get(id);
         request.onsuccess=()=>{
           try{assertWriteVersion(request.result as RecordItem|undefined,saved.saveRevision??0);store.delete(id);}
           catch(error){conflict=error as Error;tx.abort();}
         };
         tx.oncomplete=()=>resolve();
         tx.onerror=()=>reject(conflict??tx.error);
         tx.onabort=()=>reject(conflict??tx.error);
       });
     }else{
       if(fallbackConflict||localStorage.getItem(storageKey)!==fallbackStamp)
         throw new Error("Another tab changed fallback history");
       const encoded=JSON.stringify([...records.values()].filter(r=>r.id!==id));
       localStorage.setItem(storageKey,encoded);fallbackStamp=encoded;
     }
     records.delete(id);
     if(attempt?.id===id){attempt=null;view="library";}
     draw();
   }catch(error){notice(error instanceof Error?error.message:"Deletion failed");}
 };
 const deleteAllCompleted=async():Promise<void>=>{
   if(storageFault||fallbackConflict){notice("Storage is locked. Export recovery data and reopen before deletion.");return;}
   const completed=[...records.values()].filter((r):r is GenericAttempt=>
     isAttempt(r)&&r.finishedAt!==null);
   if(!completed.length)return;
   if(!confirm("Delete all "+completed.length+" completed attempts? Export a backup first. This cannot be undone."))return;
   if(!confirm("Confirm permanent deletion of completed test history. In-progress attempts, imported papers and learning cards will remain."))return;
   try{
     await writeQueue;
     if(storageFault||fallbackConflict)throw Error("Storage changed during deletion; reopen before editing.");
     if(db){
       await new Promise<void>((resolve,reject)=>{
         const tx=db!.transaction("attempts","readwrite");
         const store=tx.objectStore("attempts");
         let conflict:Error|null=null;
         for(const saved of completed){
           const request=store.get(saved.id);
           request.onsuccess=()=>{
             try{
               const current=request.result as RecordItem|undefined;
               assertWriteVersion(current,saved.saveRevision??0);
               if(!isAttempt(current)||current.finishedAt===null)
                 throw Error("Completed status changed in another tab; deletion cancelled");
               store.delete(saved.id);
             }catch(error){conflict=error as Error;tx.abort();}
           };
         }
         tx.oncomplete=()=>resolve();
         tx.onerror=()=>reject(conflict??tx.error??Error("Bulk deletion failed"));
         tx.onabort=()=>reject(conflict??tx.error??Error("Bulk deletion aborted"));
       });
     }else{
       if(localStorage.getItem(storageKey)!==fallbackStamp)
         throw Error("Another tab changed fallback history; reopen before deleting");
       const ids=new Set(completed.map(r=>r.id));
       const updated=JSON.stringify([...records.values()].filter(r=>!ids.has(r.id)));
       localStorage.setItem(storageKey,updated);fallbackStamp=updated;
     }
     for(const record of completed)records.delete(record.id);
     if(attempt&&completed.some(r=>r.id===attempt!.id))attempt=null;
     notice("Deleted "+completed.length+" completed attempts. Other saved data was preserved.");
   }catch(error){
     notice("No completed history was cleared: "+(error instanceof Error?error.message:"Storage failed"));
   }
 };
 const showStorageEstimate=async():Promise<void>=>{
   const node=root.querySelector<HTMLElement>("#g-storage-quota");
   if(!node)return;
   try{
     if(!navigator.storage?.estimate){node.textContent="Storage estimate unavailable in this browser or file context.";return;}
     const estimate=await navigator.storage.estimate();
     if(!node.isConnected)return;
     const miB=(n:number)=>(n/1048576).toFixed(1)+" MiB";
     node.textContent="Browser storage: "+(typeof estimate.usage==="number"?miB(estimate.usage):"unknown usage")+
       (typeof estimate.quota==="number"?" of approximately "+miB(estimate.quota):" (quota unknown)")+
       ". This is browser-wide, not just Practice Desk.";
   }catch{if(node.isConnected)node.textContent="Storage estimate unavailable in this browser or file context.";}
 };
 const requestPersistentStorage=async():Promise<void>=>{
   const node=root.querySelector<HTMLElement>("#g-storage-persist-status");
   if(!node)return;
   try{
     if(!navigator.storage?.persist){node.textContent="Persistent storage requests are unavailable here. Keep exported backups.";return;}
     const granted=await navigator.storage.persist();
     if(node.isConnected)node.textContent=granted?"Browser granted persistent storage. Still export backups.":
       "Persistent storage was not granted. Keep exported backups.";
   }catch{
     if(node.isConnected)node.textContent="Browser could not request persistent storage. Keep exported backups.";
   }
 };
 const learningDesk=createLearningDesk(root,{
   cards:()=>[...records.values()].filter(isLearning),
   attempts:()=>[...records.values()].filter(isAttempt),
   save:(item)=>save(item),
   remove:(id)=>removeSavedAttempt(id),
   startRevision:async selected=>{
     if(storageFault||fallbackConflict||loading){notice("Storage unavailable; cannot start a revision exam.");return false;}
     try{
       const nonce=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "revision-"+now()+"-"+Math.floor(Math.random()*100000);
       const paper=makeRevisionPackage(selected,nonce);
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
         "attempt-"+now()+"-"+Math.floor(Math.random()*100000);
       const generated={...startGenericAttempt(paper,id,now()),notebookLineage:createNotebookLineage(selected)};
       if(!await save(generated))return false;
       attempt=generated;view="exam";warning="Untimed notebook revision · +1 correct, 0 incorrect. This is not a source-exam score.";
       draw();return true;
     }catch(error){notice(error instanceof Error?error.message:"Cannot create revision test");return false;}
   },
   close:()=>{view="library";draw();}
 });
 const addNotebookCard=(source:GenericAttempt,id:string):void=>{
   if(records.has("learning-card:"+id))return;
   try{
     const record=addLearningCard(source,id as QuestionRevisionId,new Date(now()).toISOString());
     void save(record).then(ok=>{if(ok){warning="Question added to the notebook.";draw();}});
   }catch(error){notice(error instanceof Error?error.message:"Unable to add notebook card");}
 };
 const addResultCards=async(source:GenericAttempt):Promise<void>=>{
   const ids=source.result?.items.filter(item=>item.verdict==="incorrect"||item.verdict==="unanswered")
     .map(item=>item.questionRevisionId).filter(id=>!records.has("learning-card:"+id))??[];
   let saved=0;
   for(const id of ids){
     if(!await save(addLearningCard(source,id,new Date(now()).toISOString())))break;
     saved++;
   }
   if(!storageFault)warning=saved?saved+" mistake/skipped cards saved to the revision notebook.":"All mistakes/skips are already in the notebook.";
   draw();
 };
 const dispatch=(event:SessionEvent)=>{
   if(!attempt||storageFault)return;
   try{
     const ids=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
     const before=attempt;
     attempt=transitionGenericAttempt(attempt,event,ids);
     if(attempt!==before)void save(attempt);
     if(attempt.finishedAt!==null){view="result";resultTab="overview";reviewFilter="all";}
     warning="";
   }catch(error){warning=error instanceof Error?error.message:"Invalid response";}
   draw();
 };
 function listHTML():string {
   const all=[...records.values()].filter(isAttempt).sort((a,b)=>b.startedAt-a.startedAt);
   const complete=all.filter(a=>a.finishedAt!==null);
   const pending=all.filter(a=>a.finishedAt===null);
   const latest=all.slice(0,3);
   const selected=packages.get(choice);
   const cgl=selected?.examId==="ssc-cgl";
   const count=selected?.paper.sections.reduce((n,z)=>n+z.questionRevisionIds.length,0)??0;
   const modeLabel=cgl?cglMode==="strict"?"Exam simulation":cglMode==="free"?"Full paper practice":"Section practice":"Custom examination";
   const time=selected?.paper.timing.kind==="untimed"?"Untimed":cgl?
     cglMode==="strict"?"15 min per section":cglMode==="single"?"15 minutes":"60 minutes":
     selected?.paper.timing.kind==="whole-paper"?minutes(selected.paper.timing.durationMs):
     "Section timers";
   const questionCount=cgl&&cglMode==="single"?selected?.paper.sections[singleSection]?.questionRevisionIds.length??0:count;
   const previewSections=cgl&&cglMode==="single"?1:selected?.paper.sections.length??0;
   const previewNavigation=cgl?cglMode==="free"?"Free":cglMode==="single"?"One section":"Section locked":
     selected?.paper.navigation.sectionNavigation==="free"?"Free":"Sequential";
   const options=[...packages.values()].map(p=>
      '<option value="'+escapeText(p.paper.id)+'"'+(choice===p.paper.id?" selected":"")+'>'+
      escapeText(p.title)+'</option>').join("");
   const editions=selected?[...packages.values()].filter(p=>p.examId===selected.examId&&
     p.paper.paperId===selected.paper.paperId):[];
   const paired=editions.some(p=>p.paper.edition==="source")&&
     editions.some(p=>p.paper.edition==="reviewed");
   return '<div class="generic-heading home-heading"><div><span class="eyebrow">OFFLINE PRACTICE STUDIO</span>'+
     '<h1>Test library</h1><p class="muted">Choose a paper, work in exam conditions and learn from every attempt.</p></div>'+
     '<button class="btn quiet" id="g-history">History & insights →</button></div>'+
     (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
     (pending.length?'<section class="ongoing-banner"><div><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span>'+
      '<h2>'+escapeText(packages.get(pending[0]!.packageId)?.title??pending[0]!.frozen.paper.paperId)+'</h2>'+
      '<p>'+pending.length+' unfinished attempt'+(pending.length===1?"":"s")+' · '+new Date(pending[0]!.startedAt).toLocaleString()+
      ' · exam timing resumes with the saved policy</p></div><button class="btn primary" data-attempt="'+escapeText(pending[0]!.id)+'">Resume attempt</button></section>':"")+
     '<div class="home-stats">'+
       [['Paper editions',packages.size],['Completed tests',complete.length],['Attempts in progress',pending.length],['Notebook cards',[...records.values()].filter(isLearning).length]]
         .map(([name,value])=>'<div class="home-stat"><small>'+escapeText(name)+'</small><b>'+escapeText(value)+'</b></div>').join("")+
     '</div>'+
     '<div class="generic-layout home-grid"><section class="panel pad home-picker"><div class="section-header"><span class="eyebrow">01 · SET UP</span><h2>Start a practice session</h2></div>'+
     '<label class="picker" for="g-papers">Paper</label><select id="g-papers">'+options+'</select>'+
     (paired?'<label class="picker" for="g-edition">Edition</label>'+
       '<select id="g-edition" aria-label="Selected paper edition">'+
       editions.filter(p=>p.paper.edition==="source"||p.paper.edition==="reviewed").map(p=>
         '<option value="'+escapeText(p.paper.id)+'"'+(choice===p.paper.id?" selected":"")+'>'+
         (p.paper.edition==="source"?"Original source":"Reviewed corrections")+
         '</option>').join("")+'</select>':"")+
     (cgl?'<h3 class="subhead">Practice mode</h3><div class="generic-modes" role="group" aria-label="SSC CGL practice mode">'+
      ([["strict","Exam simulation","4 locked sections · 15 minutes each"],["free","Flexible full paper","60 minutes · move between sections"],
       ["single","Section practice","25 questions · 15 minutes"]] as const).map(([key,title,detail])=>
      '<button type="button" class="mode '+(cglMode===key?"on":"")+'" data-mode="'+key+'" aria-pressed="'+(cglMode===key)+'">'+
      '<span class="radio-dot"></span><span><strong>'+title+'</strong><small>'+detail+'</small></span></button>').join("")+'</div>'+
      (cglMode==="single"?'<label class="picker" for="g-single-section">Choose section</label><select id="g-single-section">'+
       selected!.paper.sections.map((z,i)=>'<option value="'+i+'"'+(singleSection===i?" selected":"")+'>'+escapeText(z.title)+'</option>').join("")+'</select>':""):"")+
     '<div class="row generic-actions home-start"><button class="btn primary" id="g-start"'+
      (loading||fallbackConflict||storageFault?' disabled':'')+'>Start '+escapeText(modeLabel)+' →</button>'+
      '<button class="btn" id="g-import"'+(loading||fallbackConflict||storageFault?' disabled':'')+'>Import exam JSON</button></div>'+
      '<input type="file" id="g-file" accept=".json,application/json" hidden>'+
      '<p class="fine">Source and reviewed editions remain distinct. Answers, keys and solutions are hidden until the attempt ends.</p></section>'+
     '<aside class="home-side"><section class="panel pad paper-preview"><span class="eyebrow">SELECTED PAPER</span>'+
      '<h2>'+escapeText(selected?.title??"Choose a paper")+'</h2>'+
      '<p class="fine">'+escapeText(selected?.paper.paperId??"")+' · '+escapeText(selected?.paper.edition??"")+'</p>'+
      '<div class="preview-metrics"><div><b>'+questionCount+'</b><small>Questions</small></div>'+
      '<div><b>'+escapeText(time)+'</b><small>Time</small></div><div><b>'+escapeText(previewSections)+'</b><small>Sections</small></div>'+
      '<div><b>'+escapeText(previewNavigation)+
      '</b><small>Navigation</small></div></div>'+
      '<p class="fine">Scoring and timer rules are frozen when you start; later paper edits cannot change a saved result.</p></section>'+
      '<section class="panel pad recent-panel"><div class="row between"><h2>Recent attempts</h2>'+
      '<button class="textlink" id="g-history-recent">View all →</button></div>'+
      (latest.length?latest.map(a=>'<button class="recent-attempt" data-attempt="'+escapeText(a.id)+'">'+
       '<b>'+escapeText(packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'</b>'+
       '<small>'+new Date(a.startedAt).toLocaleDateString()+' · '+
       (a.finishedAt?(a.result?.snapshot.earnedMarks.toFixed(1)??"—")+' marks':'Resume in-progress test')+'</small></button>').join(""):
       '<p class="fine">Your most recent tests appear here automatically.</p>')+
      '</section></aside></div>'+
      '<div class="home-utilities"><section class="panel pad learning-entry"><div><span class="eyebrow">REVISE & IMPROVE</span>'+
       '<h2>Learning & revision</h2><p class="fine">Error notebook, FSRS-7 spaced review, source-linked revision tests and topic evidence.</p></div>'+
       '<button class="btn primary" id="g-learning">Open learning desk →</button></section>'+
      '<section class="panel pad backup-home"><div><span class="eyebrow">YOUR DATA</span><h2>Portable offline history</h2>'+
       '<p class="fine">Stored in this browser. Export a backup to protect your history and notes.</p></div>'+
       '<div class="row generic-actions"><button class="btn" id="g-export-history"'+(loading?" disabled":"")+'>Export backup</button>'+
       '<button class="btn" id="g-import-history"'+(loading||fallbackConflict||storageFault?" disabled":"")+'>Import backup</button></div>'+
       '<input type="file" id="g-history-file" accept=".json,application/json" hidden></section></div>'+
       '<details class="panel pad help-rules"><summary>Exam rules, accuracy and offline storage</summary><p class="fine">'+
        'Strict mode advances through four locked 15-minute sections. Flexible and section practice use their selected time limits. Results use frozen answer keys, and score exclusions follow editorial review. Browser-local storage may be cleared by the device; backups are recommended.</p></details>';
 }
 function packageForAttempt(saved:GenericAttempt):ExamPackage|undefined{
   return packages.get(saved.packageId)??[...packages.values()].find(p=>
     p.paper.paperId===saved.frozen.paper.paperId&&p.paper.edition===saved.frozen.paper.edition);
 }
 function examHTML():string {
   return attempt?renderModelExam(attempt,packageForAttempt(attempt),warning):"";
 }
 /** Result presentation must use the frozen media, not a mutable current package. */
 function frozenReviewMedia(saved:GenericAttempt,q:QuestionRevision,
    response?:CandidateResponse,answer?:CorrectAnswer,verdict?:Verdict):string{
   const frozen=saved.frozen;
   const display:ExamPackage={format:"practice-desk-exam",version:1,
     examId:frozen.snapshot.examId,title:"",paper:frozen.paper,answerKey:frozen.key,
     questions:frozen.questions,stimuli:frozen.stimuli,assets:frozen.assets};
   const content=q.content;
   const passage=stimulusHTML(display,q);
   const promptAssets=assetHTML(display,content.assetIds);
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
         assetHTML(display,option.assetIds)+
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
       '<div><span>'+escapeText(item.text)+assetHTML(display,item.assetIds)+'</span></div>').join("")+'</div>':"";
   return passage+promptAssets+options+booleanOptions+matches;
 }
 function sourceReviewHTML(saved:GenericAttempt,target:QuestionRevision,
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
 function resultHTML():string {
   if(!attempt)return "";
   const paper=attempt.frozen.paper,s=attempt.result??scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
      attempt.state.responses,new Date().toISOString());
   const qs=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
   // allowReview controls post-completion detailed question/solution disclosure,
   // not question navigation during the attempt or numerical score visibility.
   const revealReview=paper.navigation.allowReview!==false;
   if(!revealReview&&resultTab==="review")resultTab="overview";
   // New attempts carry a frozen original-text/media snapshot. For older
   // overhaul CGL attempts only, permit a read-only comparison if the immutable
   // bundled source paper AND source key revision exactly match the previously
   // saved original-key reference. Never fabricate or persist this fallback.
   const originalReference=attempt.sourceKeyReference;
   const pinnedOriginal= !attempt.sourceReviewReference&&
     attempt.frozen.snapshot.examId==="ssc-cgl"&&originalReference?
       cachedCglPackages(sources,patches,solutions).find(p=>
         p.paper.edition==="source"&&p.paper.id===originalReference.sourcePaperRevisionId&&
         p.answerKey.id===originalReference.sourceAnswerKeyRevisionId&&
         p.paper.paperId===attempt!.frozen.paper.paperId):undefined;
   const frozenTarget:ExamPackage={format:"practice-desk-exam",version:1,
     examId:attempt.frozen.snapshot.examId,title:"Frozen reviewed attempt",
     paper:attempt.frozen.paper,answerKey:attempt.frozen.key,
     questions:attempt.frozen.questions,stimuli:attempt.frozen.stimuli,
     assets:attempt.frozen.assets};
   const reviewSource=attempt.sourceReviewReference ??
     (pinnedOriginal?createSourceReviewReference(frozenTarget,pinnedOriginal):null);
   const grades=manualGradeSummary(attempt);
   const selfAssessed=s.snapshot.earnedMarks+grades.total;
   const originalKey=sourceKeyScore(attempt);
   const scorePrecision=paper.scoring.decimalPlaces??2;
   const markLabel=(value:number)=>value.toFixed(scorePrecision);
   const eligibleMax=scoreableMaximum(paper,attempt.frozen.key,attempt.frozen.questions);
   const paperSectionRows=sectionScoreSummaries(attempt,s).map(row=>
     '<tr><td>'+escapeText(row.title)+'</td><td>'+row.attempted+'/'+
       (row.questions-row.excluded)+'</td><td>'+row.correct+'</td><td>'+row.incorrect+
       '</td><td>'+escapeText(markLabel(row.marks))+' / '+
       escapeText(markLabel(row.eligibleMax))+'</td><td>'+
       minutes(row.foregroundMs)+'</td></tr>').join("");
   const evidence=attemptEvidence(attempt);
   const revisions=answerRevisionEvidence(attempt);
   const analyticHTML=evidence?'<section class="panel pad" id="g-attempt-evidence">'+
     '<h2>Timing, accuracy & marks evidence</h2>'+
     '<p class="fine">Times are foreground exposure to each question; they do not measure thinking time. Opportunity figures describe hypothetical arithmetic, not projected marks.</p>'+
     '<div class="scroll-table"><table><thead><tr><th>Section</th><th>Answered</th><th>Coverage</th><th>Accuracy</th><th>Median answered time</th><th>Positive</th><th>Penalty</th></tr></thead><tbody>'+
     evidence.sections.map(e=>'<tr><td>'+escapeText(e.title)+'</td><td>'+e.answered+'</td><td>'+
       Math.round(e.coverage*100)+'%</td><td>'+(e.accuracy===null?"—":Math.round(e.accuracy*100)+"%")+
       '</td><td>'+(e.medianAnsweredMs===null?"—":Math.round(e.medianAnsweredMs/1000)+"s")+
       '</td><td>'+e.positive.toFixed(2)+'</td><td>'+e.penalties.toFixed(2)+'</td></tr>').join("")+'</tbody></table></div>'+
     '<div class="row generic-actions"><span class="tag">Foreground '+minutes(evidence.timing.foregroundMs)+'</span>'+
       '<span class="tag">Question exposure '+minutes(evidence.timing.questionMeasuredMs)+'</span>'+
       '<span class="tag">Answers changed '+evidence.timing.changedAnswers+'</span></div>'+
     '<h3>Section-relative speed × accuracy</h3>'+
     '<p class="fine">Only sections with at least 5 measured answered responses are classified; fast is under 0.75× and slow over 1.5× that section\'s median.</p>'+
     '<div class="learning-metric-grid">'+evidence.speed.buckets.map(e=>'<div class="learning-metric">'+
       '<strong>'+e.label+'</strong><b>'+e.correct+' correct · '+e.incorrect+' incorrect</b>'+
       '<small>'+e.items+' classified answers</small>'+
       '<button class="textlink" data-review-preset="'+
         (e.label==="Fast"?"fastwrong":e.label==="Slow"?"slowwrong":"typicalwrong")+
         '"'+(e.incorrect?"":" disabled")+' aria-label="Review '+e.label.toLowerCase()+
         ' incorrect questions">Review '+e.incorrect+' '+e.label.toLowerCase()+
         ' mistakes →</button></div>').join("")+'</div>'+
     '<p class="fine">'+evidence.speed.classified+' of '+evidence.speed.measured+
       ' measurable answers classified; insufficient section samples remain unclassified.</p>'+
     '<h3>Marks decomposition and hypothetical opportunities</h3>'+
     '<div class="learning-metric-grid"><div class="learning-metric"><strong>Observed negative marks</strong><b>'+
        evidence.opportunity.observedPenalty.toFixed(2)+'</b><small>Actual penalty magnitude</small></div>'+
     '<div class="learning-metric"><strong>Wrong → correct</strong><b>+'+
        evidence.opportunity.wrongToCorrect.toFixed(2)+'</b><small>Hypothetical, '+
        evidence.opportunity.countWrong+' incorrect scored items</small>'+
        '<button class="textlink" data-review-preset="incorrect">Review incorrect →</button></div>'+
     '<div class="learning-metric"><strong>Skipped → correct</strong><b>+'+
        evidence.opportunity.skippedToCorrect.toFixed(2)+'</b><small>Hypothetical, '+
        evidence.opportunity.countSkipped+' unanswered scored items</small>'+
        '<button class="textlink" data-review-preset="unanswered">Review skips →</button></div></div>'+
     '</section>':"";
   return '<div class="generic-heading results-heading"><div><span class="eyebrow">FROZEN EXAM RECORD</span>'+
     '<h1>Performance overview</h1><p class="muted">'+escapeText(paper.paperId)+' · '+escapeText(paper.edition)+
     ' · '+(attempt.finishedAt?new Date(attempt.finishedAt).toLocaleString():"")+'</p>'+
     (attempt.completionReason?'<span class="tag">'+escapeText(
       attempt.completionReason==="time-expired"?"Time expired":
       attempt.completionReason==="section-submitted"?"Submitted early":"Submitted by user")+'</span>':"")+
     '</div>'+
     '<div class="row"><button class="btn quiet" id="g-history-results">History & insights</button>'+
     '<button class="btn" id="g-library">Library</button></div></div>'+
    (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
    resultTabsHTML(resultTab,revealReview)+
    '<div class="result-pane" id="result-overview" role="tabpanel" aria-labelledby="result-tab-overview"'+(resultTab!=="overview"?" hidden":"")+'>'+
    '<section class="panel pad"><div class="scoregrid"><div class="score standout"><b>'+
     escapeText(markLabel(s.snapshot.earnedMarks))+
     ' <small>/ '+escapeText(markLabel(eligibleMax))+'</small></b>'+
     '<small>Audit-adjusted automated marks</small></div><div class="score"><b>'+s.snapshot.correctCount+
    '</b><small>Correct</small></div><div class="score"><b>'+s.snapshot.incorrectCount+
    '</b><small>Incorrect</small></div><div class="score"><b>'+s.snapshot.unansweredCount+
    '</b><small>Unanswered</small></div><div class="score"><b>'+s.snapshot.excludedCount+
    '</b><small>Excluded</small></div></div>'+
    (originalKey?'<p class="fine"><b>Original-source key (unadjusted):</b> '+
      escapeText(originalKey.marks.toFixed(1))+' / '+escapeText(originalKey.maxMarks.toFixed(1))+
      ' marks · '+originalKey.correct+' correct · '+originalKey.incorrect+' incorrect · '+
      originalKey.unanswered+' unanswered. Uses the source key frozen at test start, including questions excluded from the reviewed score. This is a comparison, not an official score.</p>':"")+
    (grades.graded||grades.pending?'<p class="fine"><b>Separate self-assessment:</b> '+escapeText(grades.graded)+
      ' of '+escapeText(grades.graded+grades.pending)+' written responses marked; self-assessed total '+
      escapeText(selfAssessed.toFixed(2))+'. Original automated score above remains unchanged.</p>':
      '<p class="fine">Automated marks reflect only scoreable questions.</p>')+'</section>'+
    '<section class="panel pad"><h2>Section performance</h2>'+
    '<p class="fine">Eligible maximum excludes editorially unscored and manually assessed questions. Time is measured question foreground exposure, not the sectional wall clock.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Section</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Marks / eligible max</th><th>Time on questions</th></tr></thead><tbody>'+
     paperSectionRows+'</tbody></table></div></section>'+sectionPaceHTML(attempt)+analyticHTML+
     questionCoachingHTML(attempt)+
    '<section class="panel pad answer-revision-panel"><h2>Answer revisions</h2>'+
    (revisions.recorded?'<div class="learning-metric-grid">'+
      [['Modified answers',revisions.changed],['Wrong → correct',revisions.rescued],['Correct → wrong',revisions.lost],['Other changes',revisions.other]]
       .map(([label,value])=>'<div class="learning-metric"><strong>'+escapeText(label)+'</strong><b>'+escapeText(value)+'</b></div>').join("")+
      '</div>':'<p class="fine">No saved answer-revision sequence is available for this attempt.</p>')+
    '<p class="fine">Based only on recorded successive single-choice selections. Clear-and-reselect and unverified items are not classified as rescued/lost. A changed answer may coincide with better marks; this is not evidence that revision caused improvement.</p></section></div>'+
    (revealReview?'<section class="panel pad result-pane" id="result-review" role="tabpanel" aria-labelledby="result-tab-review"'+(resultTab!=="review"?" hidden":"")+'>'+
    '<div class="row between"><h2>Question review</h2>'+
      '<div class="row"><button class="btn" id="g-review-top">Top ↑</button>'+
      '<button class="btn primary" id="g-revision-set">Add mistakes &amp; skips to notebook</button></div></div>'+
      reviewFiltersHTML(reviewFilter)+
      '<p class="fine">Review frozen questions, actual responses, solutions and foreground time. Mock scores never become FSRS ratings.</p>'+
      '<p class="fine">'+s.items.filter(it=>reviewMatch(attempt!,it,reviewFilter)).length+' of '+s.items.length+' items</p>'+
      s.items.filter(it=>reviewMatch(attempt!,it,reviewFilter)).map((it,i)=>{
      const q=qs.get(it.questionRevisionId);
      const response=attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.response;
      const answer=attempt!.frozen.key.entries.find(e=>e.questionRevisionId===it.questionRevisionId)?.answer;
      const explanation=attempt!.explanations?.[it.questionRevisionId];
      const seconds=attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.timeSpentMs??0;
      const visitCount=attempt!.state.questionVisits?.find(r=>r.questionRevisionId===it.questionRevisionId)?.count;
      const speed=questionSpeed(attempt!,it.questionRevisionId);
      if(!q)return "";
      const prior=attempt!.manualGrades?.find(g=>g.questionRevisionId===q.id);
      const limit=manualGradeLimit(attempt!,q.id);
      const provenance=q.editorial.sources??[];
      const origin=attempt!.notebookLineage?.entries.find(x=>x.questionRevisionId===q.id);
      return '<article class="generic-review" data-review-id="'+escapeText(q.id)+'" data-verdict="'+escapeText(it.verdict)+'"><strong>'+
       (paper.sections.flatMap(z=>z.questionRevisionIds).indexOf(q.id)+1)+'. '+escapeText(q.content.prompt)+'</strong>'+
       '<p class="fine">'+escapeText(q.editorial.status)+
         (q.editorial.sourcePage?' · Source page '+q.editorial.sourcePage:"")+
         ' · '+minutes(seconds)+' foreground exposure · Speed: '+escapeText(speed)+
         ' · Visits: '+(attempt!.state.questionVisits===undefined?"Not recorded":visitCount??0)+'</p>'+
       frozenReviewMedia(attempt!,q,response,answer,it.verdict)+
       (origin?'<p class="fine">Notebook source: '+escapeText(origin.sourcePaperId)+
         ' · '+escapeText(origin.sourcePaperEdition)+' · '+escapeText(origin.sourceSectionTitle)+
         ' · source attempt '+escapeText(origin.sourceAttemptId)+'</p>':"")+
       '<p class="fine"><span class="verdict '+escapeText(it.verdict)+'">'+
        escapeText(it.verdict)+'</span> · '+it.marks+' automated marks</p>'+
       '<p class="fine">Your answer: '+escapeText(readableAnswer(q,response))+'</p>'+
       '<p class="fine">'+(it.verdict==="excluded"?"Frozen answer key (not scored): ":
         it.verdict==="pending"?"Manual assessment: ":"Expected: ")+
         escapeText(readableAnswer(q,answer))+'</p>'+
       (q.editorial.notes?'<p class="fine">Editorial note: '+escapeText(q.editorial.notes)+'</p>':"")+
       (explanation?'<details class="worked-solution"'+
         (it.verdict==="incorrect"||it.verdict==="unanswered"?" open":"")+'>'+
         '<summary>'+((q.content.assetIds?.length||(
          (q.content.kind==="single-choice"||q.content.kind==="multiple-select")&&
          q.content.options.some(o=>o.assetIds?.length)))?
          "Visual solving method":"Solving approach & worked reasoning")+
         '</summary><div class="worked-solution-body">'+
         escapeText(explanation)+'</div></details>':"")+
       sourceReviewHTML(attempt!,q,reviewSource)+
       (provenance.length?'<p class="fine">Sources: '+provenance.map(source=>
         '<a href="'+escapeText(source.url)+'" target="_blank" rel="noopener noreferrer">'+
         escapeText(source.title)+'</a>').join(' · ')+'</p>':"")+
       (limit!==null?'<div class="generic-manual-grade"><p class="fine">Written response requires explicit human assessment. Self-marked results are separate from exam scores.</p>'+
          '<label>Self-assessed marks (0–'+limit+')<input type="number" step="0.01" min="0" max="'+limit+'" data-manual-marks="'+escapeText(q.id)+'" value="'+escapeText(prior?.marks??"")+'"></label>'+
          '<label>Assessment note (optional)<textarea maxlength="2000" rows="2" data-manual-note="'+escapeText(q.id)+'">'+escapeText(prior?.note??"")+'</textarea></label>'+
          '<button class="btn" data-manual-save="'+escapeText(q.id)+'">Save self-assessment</button></div>':"")+
       '<button class="btn" data-add-card="'+escapeText(q.id)+'"'+
         (records.has("learning-card:"+q.id)?" disabled":"")+'>'
         +(records.has("learning-card:"+q.id)?"In notebook":"Add to notebook")+
       '</button></article>';
    }).join("")+'</section>':'')+timingLedgerHTML(attempt,resultTab==="timing");
 }
 const openSaved=(id:string)=>{
   const saved=records.get(id);if(!isAttempt(saved))return;
   attempt=saved;
   if(saved.finishedAt===null){
 const restored=restoreSession(saved.frozen.paper,saved.state,now(),!document.hidden);
 attempt={...saved,state:restored.state,
   ...(restored.expired?{finishedAt:now(),completionReason:"time-expired" as const,
     result:scoreAttempt(saved.frozen.paper,saved.frozen.key,
     saved.frozen.questions,restored.state.responses,new Date().toISOString())}:{})};
 void save(attempt);
   }
   view=attempt.finishedAt?"result":"exam";draw();
 };

 function draw():void{
   if(disposed)return;
   const previous=document.activeElement;
   const focusKey=previous instanceof HTMLElement && root.contains(previous)?
     {id:previous.id,attributes:["data-choice","data-bool","data-match","data-q","data-section","data-attempt","data-result-tab"]
       .filter(name=>previous.hasAttribute(name)).map(name=>[name,previous.getAttribute(name)] as const)}:null;
   root.classList.add("generic-workspace");
   if(view==="learning"){
     // The Learning Desk owns its nested renders, but its route transition
     // must still be announced and receive a predictable keyboard start.
     // No repeated announcements on notebook edits or scheduler redraws.
     const entering=lastScreenKey!=="learning";
     lastScreenKey="learning";
     lastDrawView="learning";
     learningDesk.show();
     if(entering){
       const status=document.getElementById("screen-announcement");
       if(status)status.textContent="Learning and spaced revision.";
       const heading=root.querySelector<HTMLElement>("h1");
       if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
     }
     return;
   }
   learningDesk.hide();
   const priorView=lastDrawView,priorPane=lastResultPane;
   root.innerHTML=view==="library"?listHTML():view==="history"?historyHTML([...records.values()].filter(isAttempt),packages,
     {status:historyFilter,sort:historySort,search:historySearch,paperRevisionId:historyPaper},
     loading,fallbackConflict||storageFault,warning,db?"indexeddb":"fallback"):view==="exam"?examHTML():resultHTML();
   const currentSection=attempt?.frozen.paper.sections[attempt.state.sectionIndex];
   const currentQuestion=attempt?.state.questionIndex;
   const screenKey=view==="exam"?
     "exam|"+attempt?.id+"|"+attempt?.state.sectionIndex+"|"+currentQuestion:
     view==="result"?"result|"+attempt?.id+"|"+resultTab:view;
   if(lastScreenKey!==screenKey){
     lastScreenKey=screenKey;
     const text=view==="exam"?
       "Exam. "+(currentSection?.title??"Section")+", question "+((currentQuestion??0)+1)+
       " of "+(currentSection?.questionRevisionIds.length??0)+".":
       view==="result"?"Results. "+(resultTab==="overview"?"Performance overview":
         resultTab==="review"?"Question review":"Question timing ledger")+".": 
       view==="history"?"History and insights.":"Test library.";
     const announcer=document.getElementById("screen-announcement");
     if(announcer)announcer.textContent=text;
   }
   lastDrawView=view;
   lastResultPane=resultTab;
   if(focusKey){
     const controls=[...root.querySelectorAll<HTMLElement>("button,input,select,textarea")];
     const target=focusKey.id?controls.find(item=>item.id===focusKey.id):
       controls.find(item=>focusKey.attributes.some(([name,value])=>item.getAttribute(name)===value&&item.hasAttribute(name)));
     if(target && !("disabled" in target && target.disabled)){
       target.focus({preventScroll:true});
       if(target instanceof HTMLInputElement && previous instanceof HTMLInputElement &&
          target.type==="search" && previous.type==="search"){
         try{target.setSelectionRange(previous.selectionStart??target.value.length,previous.selectionEnd??target.value.length);}
         catch{ /* Some input modes do not expose selection ranges. */ }
       }
     }
   }
   // Route switches receive a predictable keyboard start; result tab changes
   // retain focus on the newly selected tab instead of the old inactive tab.
   // Do not steal focus during timer updates, answer edits or filter changes.
   if(priorView!==null&&priorView!==view){
     const heading=root.querySelector<HTMLElement>("h1");
     if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
   }else if(view==="result"&&priorView==="result"&&priorPane!==resultTab){
     root.querySelector<HTMLElement>("#result-tab-"+resultTab)?.focus({preventScroll:true});
   }
   if(view==="history"){
     root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>{view="library";draw();};
     root.querySelector<HTMLSelectElement>("#g-filter")!.onchange=e=>{historyFilter=(e.target as HTMLSelectElement).value as HistoryStatus;draw();};
     root.querySelector<HTMLSelectElement>("#g-history-paper")!.onchange=e=>{
       historyPaper=(e.target as HTMLSelectElement).value;draw();
     };
     root.querySelector<HTMLSelectElement>("#g-history-sort")!.onchange=e=>{historySort=(e.target as HTMLSelectElement).value as HistorySort;draw();};
     root.querySelector<HTMLInputElement>("#g-history-search")!.oninput=e=>{
       const search=(e.target as HTMLInputElement).value;
       historySearch=search;draw();
     };
     root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void downloadBackup();};
     root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await importHistory(file);}catch(error){notice(error instanceof Error?error.message:"History import failed");}
     };
     root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(button=>button.onclick=()=>{void removeSavedAttempt(button.dataset.delete??"");});
     root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>openSaved(button.dataset.attempt??""));
     root.querySelector<HTMLButtonElement>("#g-delete-completed")!.onclick=()=>{void deleteAllCompleted();};
     root.querySelector<HTMLButtonElement>("#g-storage-persist")!.onclick=()=>{void requestPersistentStorage();};
     void showStorageEstimate();
     return;
   }
   if(view==="library"){
     root.querySelector<HTMLButtonElement>("#g-learning")!.onclick=()=>{view="learning";draw();};
     root.querySelector<HTMLSelectElement>("#g-papers")!.onchange=e=>{
       choice=(e.target as HTMLSelectElement).value;
       singleSection=Math.min(singleSection,Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
       saveSelection();draw();
     };
     const edition=root.querySelector<HTMLSelectElement>("#g-edition");
     if(edition)edition.onchange=()=>{
       choice=edition.value;saveSelection();draw();
     };
     root.querySelector<HTMLButtonElement>("#g-history")!.onclick=()=>{view="history";draw();};
     root.querySelector<HTMLButtonElement>("#g-history-recent")!.onclick=()=>{view="history";draw();};
     root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button=>button.onclick=()=>{
       cglMode=button.dataset.mode as CglPracticeMode;saveSelection();draw();
     });
     const single=root.querySelector<HTMLSelectElement>("#g-single-section");
     if(single)single.onchange=()=>{singleSection=Number(single.value);saveSelection();};
     root.querySelector<HTMLButtonElement>("#g-start")!.onclick=()=>{
       const p=packages.get(choice);if(!p)return;
       const unfinished=[...records.values()].filter((row):row is GenericAttempt=>
         isAttempt(row)&&row.finishedAt===null);
       if(unfinished.length&&!confirm(
         "You have "+unfinished.length+" unfinished test"+(unfinished.length===1?"":"s")+
         ". Start a separate attempt? Existing attempts will be kept; their timers continue until expiry when resumed or while active."))return;
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"generic-"+now()+"-"+Math.random();
       const configured=p.examId==="ssc-cgl"?configureCglPractice(p,cglMode,singleSection):p;
       attempt=startGenericAttempt(configured,id,now());
       if(configured.paper.edition==="reviewed"){
         const source=[...packages.values()].find(candidate=>candidate.paper.edition==="source"&&
           candidate.paper.paperId===configured.paper.paperId&&candidate.examId===configured.examId);
         if(source){
           const original= createSourceKeyReference(configured,source);
           const review= createSourceReviewReference(configured,source);
           attempt={...attempt,
             ...(original?{sourceKeyReference:original}:{}),
             ...(review?{sourceReviewReference:review}:{})};
         }
       }
       warning="";view="exam";draw();void save(attempt);
     };
     root.querySelector<HTMLButtonElement>("#g-import")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-file")?.click();
     root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void downloadBackup();};
     root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await importHistory(file);}catch(error){notice(error instanceof Error?error.message:"History import failed");}
     };
     root.querySelector<HTMLInputElement>("#g-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       if(file.size>25*1024*1024){notice("Exam package exceeds the 25 MiB import limit.");return;}
       try{
         const pkg=validateExamPackage(JSON.parse(await file.text()));
         if(packages.has(pkg.paper.id))throw new Error("Paper revision ID already exists. Supply a new revision ID.");
         if(!await save({recordType:"generic-package",id:"generic-package:"+pkg.paper.id,bundle:pkg}))return;
         packages.set(pkg.paper.id,pkg);choice=pkg.paper.id;singleSection=0;saveSelection();
         notice("Package validated and imported.");
       }catch(error){notice(error instanceof Error?error.message:"Invalid exam package");}
     };
     root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(button=>button.onclick=()=>{
       void removeSavedAttempt(button.dataset.delete??"");
     });
     root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>{
       openSaved(button.dataset.attempt??"");
     });
     return;
   }
   root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>{
     if(view==="exam"&&attempt?.finishedAt===null){
       if(!confirm("Return to library? Your test timer will keep running and the attempt can be resumed."))return;
       const current=attempt;
       attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible:false},
         new Map(current.frozen.questions.map(question=>[question.id,question])));
       void save(attempt);
     }
     view="library";draw();
   };
   if(view==="result"&&attempt){
     root.querySelector<HTMLButtonElement>("#g-history-results")!.onclick=()=>{view="history";draw();};
     const tabs=[...root.querySelectorAll<HTMLButtonElement>("[data-result-tab]")];
     tabs.forEach((button,index)=>{
       button.onclick=()=>{resultTab=button.dataset.resultTab as ResultTab;draw();};
       button.onkeydown=event=>{
         if(!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
         event.preventDefault();
         const next=event.key==="Home"?0:event.key==="End"?tabs.length-1:
           (index+(event.key==="ArrowRight"?1:tabs.length-1))%tabs.length;
         resultTab=tabs[next]!.dataset.resultTab as ResultTab;draw();
       };
     });
     const reviewFilterControl=root.querySelector<HTMLSelectElement>("#g-review-filter");
     if(reviewFilterControl)reviewFilterControl.onchange=e=>{
       reviewFilter=(e.target as HTMLSelectElement).value as ReviewFilter;draw();
     };
     root.querySelectorAll<HTMLButtonElement>("[data-review-preset]").forEach(button=>button.onclick=()=>{
       if(!attempt?.frozen.paper.navigation.allowReview)return;
       reviewFilter=(button.dataset.reviewPreset??"all") as ReviewFilter;resultTab="review";draw();
     });
     root.querySelectorAll<HTMLButtonElement>("[data-ledger-q]").forEach(button=>button.onclick=()=>{
       if(!attempt?.frozen.paper.navigation.allowReview)return;
       const question=button.dataset.ledgerQ;resultTab="review";reviewFilter="all";draw();
       const target=[...root.querySelectorAll<HTMLElement>("[data-review-id]")].find(node=>node.dataset.reviewId===question);
       target?.scrollIntoView({block:"start"});
     });
     const revisionSet=root.querySelector<HTMLButtonElement>("#g-revision-set");
     if(revisionSet)revisionSet.onclick=()=>{void addResultCards(attempt!);};
     const reviewTop=root.querySelector<HTMLButtonElement>("#g-review-top");
     if(reviewTop)reviewTop.onclick=()=>{
       document.getElementById("result-tab-review")?.focus({preventScroll:true});
       window.scrollTo({top:0,behavior:"smooth"});
     };
     root.querySelectorAll<HTMLButtonElement>("[data-manual-save]").forEach(button=>button.onclick=async()=>{
       if(!attempt||storageFault)return;
       const id=button.dataset.manualSave as QuestionRevisionId|undefined;
       if(!id)return;
       const marksField=[...root.querySelectorAll<HTMLInputElement>("[data-manual-marks]")].find(x=>x.dataset.manualMarks===id);
       const noteField=[...root.querySelectorAll<HTMLTextAreaElement>("[data-manual-note]")].find(x=>x.dataset.manualNote===id);
       if(!marksField?.value||!Number.isFinite(marksField.valueAsNumber)){notice("Enter a finite assessment mark.");return;}
       try{
         const assessed=setManualGrade(attempt,id,marksField.valueAsNumber,noteField?.value??"",new Date(now()).toISOString());
         if(await save(assessed)){warning="Self-assessment committed separately from original exam score.";draw();}
       }catch(error){notice(error instanceof Error?error.message:"Invalid manual assessment");}
     });
     root.querySelectorAll<HTMLButtonElement>("[data-add-card]").forEach(button=>button.onclick=()=>{
       if(attempt)addNotebookCard(attempt,button.dataset.addCard??"");
     });
     return;
   }
   if(view!=="exam"||!attempt)return;
   root.querySelector<HTMLButtonElement>("#g-exam-full")!.onclick=()=>
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));
   const section=attempt.frozen.paper.sections[attempt.state.sectionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===section?.questionRevisionIds[attempt!.state.questionIndex]);
   if(!q)return;
   root.querySelectorAll<HTMLInputElement>("[data-choice]").forEach(input=>input.onchange=()=>{
     if(q.content.kind==="single-choice"){
       const option=q.content.options.find(x=>x.id===input.dataset.choice);
       if(!option){notice("Unknown question option.");return;}
       dispatch({type:"ANSWER",nowMs:now(),response:{kind:"single-choice",optionId:option.id}});
     }else if(q.content.kind==="multiple-select"){
       const raw=[...root.querySelectorAll<HTMLInputElement>("[data-choice]:checked")].map(x=>x.dataset.choice);
       const chosen=q.content.options.filter(option=>raw.includes(option.id)).map(option=>option.id);
       if(raw.length!==chosen.length){notice("Unknown question option.");return;}
       if(!chosen.length)dispatch({type:"CLEAR",nowMs:now()});
       else if(chosen.length<(q.content.minSelections??1)) {
         warning="Select at least "+(q.content.minSelections??1)+" options before saving.";
         const group=root.querySelector<HTMLElement>(".generic-response-group");
         let feedback=group?.querySelector<HTMLElement>(".generic-inline-warning");
         if(group&&!feedback){
           feedback=document.createElement("p");
           feedback.className="generic-inline-warning";
           feedback.setAttribute("role","status");
           group.append(feedback);
         }
         if(feedback)feedback.textContent=warning;
       }else dispatch({type:"ANSWER",nowMs:now(),response:{kind:"multiple-select",optionIds:chosen}});
     }
   });
   root.querySelectorAll<HTMLInputElement>("[data-bool]").forEach(input=>input.onchange=()=>{
     dispatch({type:"ANSWER",nowMs:now(),response:{kind:"true-false",value:input.dataset.bool==="true"}});
   });
   const saveButton=root.querySelector<HTMLButtonElement>("#g-save");
   if(saveButton)saveButton.onclick=()=>{
     if(q.content.kind==="numeric-entry"){
       const field=root.querySelector<HTMLInputElement>("#g-number")!;
       if(!field.value||!Number.isFinite(field.valueAsNumber)){notice("Enter a finite numeric answer.");return;}
       dispatch({type:"ANSWER",nowMs:now(),response:{kind:"numeric-entry",value:field.valueAsNumber}});
     }else if(q.content.kind==="free-response"){
       const value=root.querySelector<HTMLTextAreaElement>("#g-text")!.value;
       dispatch(value.trim()?{type:"ANSWER",nowMs:now(),response:{kind:"free-response",text:value}}:{type:"CLEAR",nowMs:now()});
     }else if(q.content.kind==="matching"){
       const matching=q.content;
       const pairs=[...root.querySelectorAll<HTMLSelectElement>("[data-match]")].filter(x=>x.value)
         .map(x=>{
           const left=matching.leftItems.find(item=>item.id===x.dataset.match);
           const right=matching.rightItems.find(item=>item.id===x.value);
           return left&&right?{leftId:left.id,rightId:right.id}:null;
         });
       if(pairs.some(x=>x===null)){notice("Unknown matching option.");return;}
       const validPairs=pairs.filter((pair):pair is NonNullable<typeof pair>=>pair!==null);
       dispatch(validPairs.length?{type:"ANSWER",nowMs:now(),response:{kind:"matching",pairs:validPairs}}:{type:"CLEAR",nowMs:now()});
     }
   };
   root.querySelector<HTMLButtonElement>("#g-clear")!.onclick=()=>dispatch({type:"CLEAR",nowMs:now()});
   root.querySelector<HTMLButtonElement>("#g-flag")!.onclick=()=>dispatch({type:"FLAG",nowMs:now(),
     flagged:!attempt!.state.responses.find(r=>r.questionRevisionId===q.id)?.flagged});
   const navigate=(s:number,i:number)=>dispatch({type:"NAVIGATE",nowMs:now(),sectionIndex:s,questionIndex:i});
   root.querySelector<HTMLButtonElement>("#g-prev")!.onclick=()=>navigate(attempt!.state.sectionIndex,attempt!.state.questionIndex-1);
   root.querySelector<HTMLButtonElement>("#g-next")!.onclick=()=>navigate(attempt!.state.sectionIndex,attempt!.state.questionIndex+1);
   root.querySelectorAll<HTMLButtonElement>("[data-q]").forEach(b=>b.onclick=()=>navigate(attempt!.state.sectionIndex,Number(b.dataset.q)));
   root.querySelectorAll<HTMLButtonElement>("[data-section]").forEach(b=>b.onclick=()=>navigate(Number(b.dataset.section),0));
   const pause=root.querySelector<HTMLButtonElement>("#g-pause");
   if(pause)pause.onclick=()=>dispatch({type:attempt!.state.status==="paused"?"RESUME":"PAUSE",nowMs:now()});
   root.querySelector<HTMLButtonElement>("#g-submit")!.onclick=()=>{
     const p=attempt!.frozen.paper, st=attempt!.state;
     const sectional=p.timing.kind==="sectional";
     const lockedWhole=p.timing.kind==="whole-paper"&&p.navigation.sectionNavigation==="sequential-locked";
     const continuing=(sectional||lockedWhole)&&st.sectionIndex<p.sections.length-1;
     const expired=st.status==="section-expired";
     if(!expired&&!confirm(continuing?"Close this section and advance? You cannot return.":"Submit this exam and view results?"))return;
     dispatch({type:sectional||continuing?"SUBMIT_SECTION":"SUBMIT_ATTEMPT",nowMs:now()});
   };
 }
 const timer=window.setInterval(()=>{
   // Time limits still elapse outside exam view, but hidden/library time is
   // not charged to the last foreground question.
   if(disposed||storageFault||!attempt||attempt.finishedAt!==null||
      attempt.state.status==="paused")return;
   const original=attempt;
   const next=transitionGenericAttempt(original,{type:"TICK",nowMs:now()},
     new Map(original.frozen.questions.map(q=>[q.id,q])));
   if(next!==original){
     attempt=next;
     const changedSection=original.state.sectionIndex!==next.state.sectionIndex;
     if(next.finishedAt!==null||changedSection||original.state.status!==next.state.status||
       (view==="exam"&&now()-lastTimerSave>=10000)){
       void save(attempt);lastTimerSave=now();
     }
     if(next.finishedAt!==null){
       if(view==="exam"){view="result";resultTab="overview";reviewFilter="all";}
       draw();return;
     }
     if((changedSection||original.state.status!==next.state.status)&&view==="exam"){draw();return;}
   }
   if(view==="exam"){
     const el=root.querySelector("#g-timer");
     if(el&&attempt){const time=examTimeRemaining(attempt.frozen.paper,attempt.state);
       el.textContent=time===null?"Untimed":minutes(time);}
   }
 },1000);
 const visibility=()=>{
   if(!attempt||attempt.finishedAt!==null||storageFault)return;
   dispatchVisibility(view==="exam"&&!document.hidden);
 };
 function dispatchVisibility(visible:boolean):void{
   if(!attempt||storageFault||attempt.finishedAt!==null)return;
   const current=attempt;
   attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible},
     new Map(current.frozen.questions.map(q=>[q.id,q])));
   void save(attempt);
   if(attempt.finishedAt!==null&&view==="exam"){view="result";resultTab="overview";reviewFilter="all";}
   draw();
 }
 document.addEventListener("visibilitychange",visibility);
 const keyboard=(event:KeyboardEvent)=>{
   if(disposed||view!=="exam"||!attempt||attempt.finishedAt!==null||
      attempt.state.status!=="running"||document.hidden||
      event.ctrlKey||event.metaKey||event.shiftKey||event.isComposing)return;
   const focused=event.target;
   if(focused instanceof HTMLElement){
     if(focused.isContentEditable||focused.closest('[contenteditable="true"]'))return;
     if(focused instanceof HTMLTextAreaElement||focused instanceof HTMLSelectElement)return;
     // Focused answer radios must still support shortcuts without interfering
     // with numeric/text entry or other native controls.
     if(focused instanceof HTMLInputElement&&
        !(focused.type==="radio"&&focused.name==="generic-answer"&&root.contains(focused)))return;
   }
   const displayPanel=document.getElementById("displayPanel");
   if(displayPanel&&!displayPanel.hidden)return;
   const key=event.key.toLowerCase();
   const arrow=key==="arrowright"||key==="arrowleft";
   if(event.altKey&&!arrow)return;
   if(arrow){
     event.preventDefault();
     const move=key==="arrowright"?1:-1;
     const target=attempt.state.questionIndex+move;
     const section=attempt.frozen.paper.sections[attempt.state.sectionIndex];
     if(!section?.questionRevisionIds[target]||
        (move<0&&attempt.frozen.paper.navigation.questionNavigation==="forward-only"))return;
     dispatch({type:"NAVIGATE",nowMs:now(),sectionIndex:attempt.state.sectionIndex,questionIndex:target});
     return;
   }
   if(event.altKey||event.repeat)return;
   if(key==="f"){
     event.preventDefault();
     window.dispatchEvent(new Event("practice-desk:toggle-fullscreen"));return;
   }
   if(key==="m"){
     if(!attempt.frozen.paper.navigation.allowFlagging)return;
     event.preventDefault();
     const id=attempt.frozen.paper.sections[attempt.state.sectionIndex]!
       .questionRevisionIds[attempt.state.questionIndex]!;
     const marked=attempt.state.responses.find(r=>r.questionRevisionId===id)?.flagged??false;
     dispatch({type:"FLAG",nowMs:now(),flagged:!marked});return;
   }
   if(!["a","b","c","d"].includes(key))return;
   const id=attempt.frozen.paper.sections[attempt.state.sectionIndex]!
     .questionRevisionIds[attempt.state.questionIndex]!;
   const question=attempt.frozen.questions.find(q=>q.id===id);
   if(question?.content.kind!=="single-choice")return;
   const option=question.content.options[key.charCodeAt(0)-97];
   if(!option)return;
   event.preventDefault();
   dispatch({type:"ANSWER",nowMs:now(),response:{kind:"single-choice",optionId:option.id}});
 };
 window.addEventListener("keydown",keyboard);
 const pagehide=()=>{
   if(attempt&&attempt.finishedAt===null&&!storageFault){
     try{
       const current=attempt;
       attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible:false},
         new Map(current.frozen.questions.map(q=>[q.id,q])));
       writeMirror(attempt);
       void save(attempt);
     }catch(error){console.warn("Pagehide checkpoint failed",error);}
   }
 };
 window.addEventListener("pagehide",pagehide);
 const storage=(event:StorageEvent)=>{
   if(db||event.key!==storageKey||event.newValue===fallbackStamp)return;
   fallbackConflict=true;
   warning="Fallback history changed in another tab. Reopen the file before continuing.";
   attempt=null;view="library";
   if(!disposed)draw();
 };
 window.addEventListener("storage",storage);
 function cleanup(){learningDesk.dispose();disposed=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility);
   window.removeEventListener("pagehide",pagehide);window.removeEventListener("storage",storage);
   window.removeEventListener("keydown",keyboard);void writeQueue.finally(()=>db?.close());root.classList.remove("generic-workspace");}
 draw();
 (async()=>{
   try{
     db=await new Promise<IDBDatabase>((resolve,reject)=>{
       const request=indexedDB.open(dbName,1);
       request.onupgradeneeded=()=>{
         if(!request.result.objectStoreNames.contains("attempts"))
           request.result.createObjectStore("attempts",{keyPath:"id"});
       };
       request.onsuccess=()=>resolve(request.result);
       request.onerror=()=>reject(request.error);
       request.onblocked=()=>reject(new Error("Database blocked"));
     });
     const all=await new Promise<unknown[]>((resolve,reject)=>{
       const req=db!.transaction("attempts","readonly").objectStore("attempts").getAll();
       req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
     });
     for(const record of all){
       if(isPackage(record)){try{
         const valid=validateExamPackage(record.bundle);
         if(!packages.has(valid.paper.id)){packages.set(valid.paper.id,valid);records.set(record.id,record);}
       }catch(error){console.warn("Invalid saved package",error);}}
       else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
     }
     try{
       const mirror=JSON.parse(localStorage.getItem(mirrorKey)??"null") as unknown;
       if(isAttempt(mirror)){
         validateGenericStoredRecord(mirror);
         const existing=records.get(mirror.id);
         const winner=chooseRecovered(isAttempt(existing)?existing:undefined,mirror);
         if(winner===mirror)void save(mirror);
       }
     }catch(error){console.warn("Invalid emergency session mirror",error);}
   }catch(error){
     // A failed initial read must not leave an active IndexedDB handle
     // behind while displaying fallback localStorage data.
     console.warn("IndexedDB startup failed; switching to local fallback",error);
     try{db?.close();}catch{}
     db=null;
     warning="IndexedDB unavailable. Limited localStorage fallback is in use.";
     try{
       const storedFallback=localStorage.getItem(storageKey);
       fallbackStamp=storedFallback;
       const recordsFromStorage=JSON.parse(storedFallback??"[]") as unknown[];
       for(const record of recordsFromStorage){
         if(isPackage(record)){try{packages.set(record.bundle.paper.id,validateExamPackage(record.bundle));records.set(record.id,record);}catch{}}
         else if(isAttempt(record)||isLearning(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved practice record",error);}
       }
       }
     }catch{warning="Browser storage is unavailable; attempts may not survive a reload.";}
   }
   // The selected exam may be an imported package, unavailable until the
   // asynchronous IndexedDB/fallback package inventory has finished loading.
   if(storedSelection&&packages.has(storedSelection.paperRevisionId)){
     choice=storedSelection.paperRevisionId;
     cglMode=storedSelection.mode;
     singleSection=Math.min(storedSelection.section,
       Math.max(0,(packages.get(choice)?.paper.sections.length??1)-1));
   }
   loading=false;
   if(!disposed)draw();
 })();
 return cleanup;
}
