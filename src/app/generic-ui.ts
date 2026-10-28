import { builtinCglPackages, validateExamPackage, startGenericAttempt, transitionGenericAttempt, readableAnswer } from "./exam-package.ts";
import type { ExamPackage, GenericAttempt } from "./exam-package.ts";
import type { QuestionRevision, CandidateResponse } from "../domain/question.js";
import type { QuestionRevisionId } from "../domain/ids.js";
import type { SessionEvent } from "../engine/session.ts";
import { restoreSession, chooseRecovered, assertFrozenContent } from "../history/frozen.ts";
import { scoreAttempt } from "../engine/scoring.ts";
import { makeBackup, verifyBackup, planBackupMerge } from "../history/backup.ts";
import { validateResponse } from "../engine/response.ts";
import type { SourcePaperBank, ReviewPatchBank } from "../content/schema.js";

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

type PackageRecord={recordType:"generic-package";id:string;bundle:ExamPackage};
type RecordItem=PackageRecord|GenericAttempt;
const isAttempt=(x:unknown):x is GenericAttempt=>!!x&&typeof x==="object"&&(x as GenericAttempt).recordType==="generic-attempt";
const isPackage=(x:unknown):x is PackageRecord=>!!x&&typeof x==="object"&&(x as PackageRecord).recordType==="generic-package";

/** Treat browser records and exported JSON as untrusted until their frozen inputs and responses validate. */
export function validateGenericStoredRecord(value:unknown):RecordItem {
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
 const seen=new Set<string>();
 for(const row of value.state.responses){
   if(!row || typeof row.questionRevisionId!=="string" ||
      !allowed.has(row.questionRevisionId) || seen.has(row.questionRevisionId)||
      !Number.isFinite(row.timeSpentMs)||row.timeSpentMs<0 ||
      !Number.isInteger(row.answerChangeCount)||row.answerChangeCount<0)
     throw new Error("Invalid saved response");
   seen.add(row.questionRevisionId);
   if(row.response)validateResponse(questionMap.get(row.questionRevisionId)!,row.response);
 }
 if(value.finishedAt!==null){
   if(!value.result)throw new Error("Completed attempt has no immutable score");
   const recalculated=scoreAttempt(paper,value.frozen.key,value.frozen.questions,value.state.responses,
     value.result.snapshot.calculatedAt);
   const fields=["earnedMarks","positiveMarks","penaltyMarks","correctCount","incorrectCount","unansweredCount","excludedCount"] as const;
   if(fields.some(field=>value.result!.snapshot[field]!==recalculated.snapshot[field]))
     throw new Error("Completed attempt score does not match its frozen inputs");
 }
 return value;
}


export function mountExamWorkspace(root:HTMLElement,sources:SourcePaperBank,patches:ReviewPatchBank,
 solutions:Readonly<Record<string,Readonly<Record<string,string>>>>,onBack:()=>void,initialAttemptId?:string):()=>void{
 const packages=new Map<string,ExamPackage>(builtinCglPackages(sources,patches,solutions).map(p=>[p.paper.id,p]));
 const records=new Map<string,RecordItem>();
 let choice=packages.keys().next().value as string;
 let attempt:GenericAttempt|null=null, view:"library"|"exam"|"result"="library";
 let db:IDBDatabase|null=null, warning="",disposed=false, loading=true, writeQueue=Promise.resolve();
 let lastTimerSave=0;
 const storageKey="practiceDesk.generic.fallback.v1", mirrorKey="practiceDesk.generic.active.v1";
 const downloadBackup=()=>{
   const recordsToExport=[...records.values()].filter(record=>isPackage(record)||isAttempt(record));
   const backup=makeBackup(recordsToExport as unknown as readonly Record<string,unknown>[],[],null,new Date().toISOString());
   const blob=new Blob([JSON.stringify(backup)],{type:"application/json"});
   const url=URL.createObjectURL(blob);
   const link=document.createElement("a");link.href=url;
   link.download="Practice_Desk_Generic_Backup_"+new Date().toISOString().slice(0,10)+".json";
   document.body.append(link);link.click();link.remove();
   window.setTimeout(()=>URL.revokeObjectURL(url),2000);
 };
 const importHistory=async(file:File)=>{
   if(file.size>75*1024*1024)throw new Error("History backup exceeds 75 MiB");
   const backup=verifyBackup(JSON.parse(await file.text()));
   if(backup.revisions.length)throw new Error("This archive contains CGL display records; import those from History");
   const imported=backup.attempts.map(record=>validateGenericStoredRecord(record));
   if(!imported.length)throw new Error("Backup contains no generic records");
   const incoming=planBackupMerge([...records.values()],imported,attempt?.id);
   if(!incoming.length){warning="These records are already present.";draw();return;}
   if(!confirm("Import "+incoming.length+" generic history records? Existing saved attempts will not be replaced."))return;
   // IDB add is atomic for the entire batch. Never modify in-memory records before commit.
   await writeQueue;
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
     const replacement=[...records.values(),...incoming];
     localStorage.setItem(storageKey,JSON.stringify(replacement));
   }
   for(const record of incoming){
     records.set(record.id,record);
     if(isPackage(record) && !packages.has(record.bundle.paper.id))
       packages.set(record.bundle.paper.id,record.bundle);
   }
   warning="Imported "+incoming.length+" records; existing attempts preserved.";
   draw();
 };

 const writeMirror=(record:GenericAttempt)=>{
   try{localStorage.setItem(mirrorKey,JSON.stringify(record));}
   catch{warning="Emergency session mirror could not be saved. Use a history export.";}
 };
 const notice=(s:string)=>{warning=s;draw();};
 const now=()=>Date.now();
 const save=(record:RecordItem)=>{
   records.set(record.id,record);
   if(isAttempt(record))writeMirror(record);
   writeQueue=writeQueue.catch(()=>{}).then(()=>new Promise<void>((resolve,reject)=>{
     if(!db){
       try{localStorage.setItem(storageKey,JSON.stringify([...records.values()]));resolve();}
       catch(e){reject(e);}
       return;
     }
     const tx=db.transaction("attempts","readwrite");
     tx.objectStore("attempts").put(record);
     tx.oncomplete=()=>resolve();
     tx.onerror=()=>reject(tx.error);
     tx.onabort=()=>reject(tx.error);
   })).catch(e=>{warning="Saving failed. Export important history before closing.";console.warn("Exam workspace save",e);});
 };
 const dispatch=(event:SessionEvent)=>{
   if(!attempt)return;
   try{
     const ids=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
     const before=attempt;
     attempt=transitionGenericAttempt(attempt,event,ids);
     if(attempt!==before)save(attempt);
     if(attempt.finishedAt!==null)view="result";
     warning="";
   }catch(error){warning=error instanceof Error?error.message:"Invalid response";}
   draw();
 };
 function listHTML():string {
   const attempts=[...records.values()].filter(isAttempt).sort((a,b)=>b.startedAt-a.startedAt);
   return '<div class="generic-heading"><h1>Exam workspace</h1><button class="btn" id="g-back">← Test library</button></div>'+
    '<p class="muted">Configurable papers · Six question types · Works offline</p>'+
    (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
    '<div class="generic-layout"><section class="panel pad"><h2>Select an exam</h2>'+
    '<select id="g-papers" aria-label="Select exam package">'+[...packages.values()].map(p=>'<option value="'+escapeText(p.paper.id)+'"'+
       (choice===p.paper.id?" selected":"")+'>'+escapeText(p.title)+'</option>').join("")+'</select>'+
    '<p class="fine">Built-in CGL papers remain available. You can also import any validated Practice Desk exam JSON file.</p>'+
    '<div class="row"><button class="btn primary" id="g-start"'+(loading?' disabled':'')+'>Start exam</button><button class="btn" id="g-import"'+(loading?' disabled':'')+'>Import JSON</button></div>'+
    '<input type="file" id="g-file" accept=".json,application/json" hidden></section>'+
    '<section class="panel pad"><div class="row between"><h2>Generic exam history</h2>'+
    '<div class="row"><button class="btn" id="g-export-history"'+(loading?' disabled':'')+'>Export</button>'+
    '<button class="btn" id="g-import-history"'+(loading?' disabled':'')+'>Import</button></div></div>'+
    '<input type="file" id="g-history-file" accept=".json,application/json" hidden>'+
    (attempts.length?attempts.slice(0,30).map(a=>'<button class="generic-history" data-attempt="'+escapeText(a.id)+'">'+
      escapeText(packages.get(a.packageId)?.title??a.frozen.paper.paperId)+' · '+new Date(a.startedAt).toLocaleString()+
      '<small>'+(a.finishedAt?" Completed":" Resume")+'</small></button>').join(""):'<p class="fine">No attempts yet.</p>')+
    '</section></div>';
 }
 function examHTML():string {
   if(!attempt)return "";
   const paper=attempt.frozen.paper, state=attempt.state, bundle=packages.get(attempt.packageId);
   const section=paper.sections[state.sectionIndex];
   const id=section?.questionRevisionIds[state.questionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===id);
   if(!section||!q)return '<p>Question unavailable</p>';
   const response=state.responses.find(r=>r.questionRevisionId===q.id)?.response;
   const remaining=examTimeRemaining(paper,state);
   const assets=bundle??{format:"practice-desk-exam" as const,version:1 as const,
     examId:attempt.frozen.snapshot.examId,title:"",paper,answerKey:attempt.frozen.key,questions:attempt.frozen.questions};
   return '<div class="generic-heading"><div><h1>'+escapeText(bundle?.title??paper.paperId)+'</h1><p class="muted">'+
     escapeText(section.title)+' · '+state.responses.filter(r=>r.response).length+' answered</p></div>'+
     '<div class="row"><strong class="generic-timer" id="g-timer">'+(remaining===null?"Untimed":minutes(remaining))+'</strong>'+
     '<button class="btn" id="g-library">Library</button></div></div>'+
     (warning?'<p class="generic-warning" role="status">'+escapeText(warning)+'</p>':"")+
     '<div class="generic-sections">'+paper.sections.map((s,i)=>{
       const locked=state.completedSections.includes(i)||
         ((paper.timing.kind==="sectional"||paper.navigation.sectionNavigation==="sequential-locked")&&i!==state.sectionIndex);
       return '<button class="btn '+(i===state.sectionIndex?"primary":"")+'" data-section="'+i+'"'+(locked?" disabled":"")+'>'+
         escapeText(s.title)+'</button>';
     }).join("")+'</div><div class="generic-layout"><section class="panel pad"><p class="fine">'+
     escapeText(section.title)+' · Question '+(state.questionIndex+1)+' of '+section.questionRevisionIds.length+'</p>'+
     stimulusHTML(assets,q)+'<h2 class="generic-prompt">'+escapeText(q.content.prompt)+'</h2>'+
     assetHTML(assets,q.content.assetIds)+renderGenericControls(assets,q,response)+
     '<div class="row generic-actions"><button class="btn" id="g-clear"'+(!response?" disabled":"")+'>Clear</button>'+
     '<button class="btn" id="g-flag"'+(!paper.navigation.allowFlagging?" disabled":"")+'>Flag</button></div>'+
     '<div class="row generic-actions"><button class="btn" id="g-prev"'+(!state.questionIndex?" disabled":"")+'>← Previous</button>'+
     '<button class="btn" id="g-next"'+(state.questionIndex===section.questionRevisionIds.length-1?" disabled":"")+'>Next →</button></div>'+
     '<div class="row generic-actions">'+
     (paper.timing.kind!=="untimed"&&paper.timing.pausePolicy==="allowed"?
      '<button class="btn" id="g-pause">'+(state.status==="paused"?"Resume timer":"Pause timer")+'</button>':"")+
     '<button class="btn danger" id="g-submit">'+(paper.timing.kind==="sectional"?"Submit section":"Submit exam")+'</button></div></section>'+
     '<aside class="panel pad"><h3>Question navigator</h3><div class="generic-palette">'+
      section.questionRevisionIds.map((qid,i)=>{
        const r=state.responses.find(x=>x.questionRevisionId===qid);
        return '<button class="num '+(i===state.questionIndex?"here ":"")+(r?.response?"answered ":"")+
        (r?.flagged?"marked":"")+'" data-q="'+i+'">'+(i+1)+'</button>';
      }).join("")+'</div><p class="fine">'+(paper.navigation.questionNavigation==="forward-only"?
        "Questions cannot be revisited in this exam.":"Navigate freely where the paper permits.")+'</p></aside></div>';
 }
 function resultHTML():string {
   if(!attempt)return "";
   const paper=attempt.frozen.paper,s=attempt.result??scoreAttempt(paper,attempt.frozen.key,attempt.frozen.questions,
      attempt.state.responses,new Date().toISOString());
   const qs=new Map(attempt.frozen.questions.map(q=>[q.id,q]));
   return '<div class="generic-heading"><h1>Exam results</h1><button class="btn" id="g-library">Library</button></div>'+
    '<section class="panel pad"><div class="scoregrid"><div class="score standout"><b>'+s.snapshot.earnedMarks+
    '</b><small>Marks</small></div><div class="score"><b>'+s.snapshot.correctCount+
    '</b><small>Correct</small></div><div class="score"><b>'+s.snapshot.incorrectCount+
    '</b><small>Incorrect</small></div><div class="score"><b>'+s.snapshot.unansweredCount+
    '</b><small>Unanswered</small></div><div class="score"><b>'+s.snapshot.excludedCount+
    '</b><small>Excluded</small></div></div><p class="fine">Written responses marked pending require manual evaluation.</p></section>'+
    '<section class="panel pad"><h2>Review</h2>'+s.items.map((it,i)=>{
      const q=qs.get(it.questionRevisionId);
      const response=attempt!.state.responses.find(r=>r.questionRevisionId===it.questionRevisionId)?.response;
      const answer=attempt!.frozen.key.entries.find(e=>e.questionRevisionId===it.questionRevisionId)?.answer;
      const explanation=attempt!.explanations?.[it.questionRevisionId]||q?.editorial.notes;
      return q?'<article class="generic-review"><strong>'+(i+1)+'. '+escapeText(q.content.prompt)+'</strong>'+
       '<p class="fine">'+escapeText(it.verdict)+' · '+it.marks+' marks</p>'+
       '<p class="fine">Your answer: '+escapeText(readableAnswer(q,response))+'</p>'+
       '<p class="fine">Expected: '+escapeText(readableAnswer(q,answer))+'</p>'+
       (explanation?'<p class="fine">Explanation: '+escapeText(explanation)+'</p>':"")+'</article>':"";
    }).join("")+'</section>';
 }
 function draw():void{
   if(disposed)return;
   root.classList.add("generic-workspace");
   root.innerHTML=view==="library"?listHTML():view==="exam"?examHTML():resultHTML();
   if(view==="library"){
     root.querySelector<HTMLButtonElement>("#g-back")!.onclick=()=>{
       cleanup();
       void writeQueue.then(onBack,onBack);
     };
     root.querySelector<HTMLSelectElement>("#g-papers")!.onchange=e=>{choice=(e.target as HTMLSelectElement).value;};
     root.querySelector<HTMLButtonElement>("#g-start")!.onclick=()=>{
       const p=packages.get(choice);if(!p)return;
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"generic-"+now()+"-"+Math.random();
       attempt=startGenericAttempt(p,id,now());save(attempt);warning="";view="exam";draw();
     };
     root.querySelector<HTMLButtonElement>("#g-import")!.onclick=()=>root.querySelector<HTMLInputElement>("#g-file")?.click();
     root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=downloadBackup;
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
         packages.set(pkg.paper.id,pkg);choice=pkg.paper.id;
         save({recordType:"generic-package",id:"generic-package:"+pkg.paper.id,bundle:pkg});
         notice("Package validated and imported.");
       }catch(error){notice(error instanceof Error?error.message:"Invalid exam package");}
     };
     const openSaved=(id:string)=>{
       const saved=records.get(id);if(!isAttempt(saved))return;
       attempt=saved;
       if(saved.finishedAt===null){
         const restored=restoreSession(saved.frozen.paper,saved.state,now(),!document.hidden);
         attempt={...saved,state:restored.state,
           ...(restored.expired?{finishedAt:now(),result:scoreAttempt(saved.frozen.paper,saved.frozen.key,
             saved.frozen.questions,restored.state.responses,new Date().toISOString())}:{})};
         save(attempt);
       }
       view=attempt.finishedAt?"result":"exam";draw();
     };
     root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>{
       openSaved(button.dataset.attempt??"");
     });
     return;
   }
   root.querySelector<HTMLButtonElement>("#g-library")!.onclick=()=>{view="library";attempt=null;draw();};
   if(view!=="exam"||!attempt)return;
   const section=attempt.frozen.paper.sections[attempt.state.sectionIndex];
   const q=attempt.frozen.questions.find(x=>x.id===section?.questionRevisionIds[attempt!.state.questionIndex]);
   if(!q)return;
   root.querySelectorAll<HTMLInputElement>("[data-choice]").forEach(input=>input.onchange=()=>{
     if(q.content.kind==="single-choice")
       dispatch({type:"ANSWER",nowMs:now(),response:{kind:"single-choice",optionId:input.dataset.choice! as any}});
     else if(q.content.kind==="multiple-select"){
       const selected=[...root.querySelectorAll<HTMLInputElement>("[data-choice]:checked")].map(x=>x.dataset.choice!);
       if(!selected.length)dispatch({type:"CLEAR",nowMs:now()});
       else if(selected.length<(q.content.minSelections??1)) warning="Select at least "+(q.content.minSelections??1)+" options before saving.";
       else dispatch({type:"ANSWER",nowMs:now(),response:{kind:"multiple-select",optionIds:selected as any}});
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
       const pairs=[...root.querySelectorAll<HTMLSelectElement>("[data-match]")].filter(x=>x.value)
         .map(x=>({leftId:x.dataset.match! as any,rightId:x.value as any}));
       dispatch(pairs.length?{type:"ANSWER",nowMs:now(),response:{kind:"matching",pairs}}:{type:"CLEAR",nowMs:now()});
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
     const sectional=attempt!.frozen.paper.timing.kind==="sectional";
     if(!confirm(sectional?"Submit this section? You cannot return.":"Submit this exam and view results?"))return;
     dispatch({type:sectional?"SUBMIT_SECTION":"SUBMIT_ATTEMPT",nowMs:now()});
   };
 }
 const timer=window.setInterval(()=>{
   if(disposed||view!=="exam"||!attempt||attempt.state.status==="paused")return;
   const original=attempt;
   const next=transitionGenericAttempt(original,{type:"TICK",nowMs:now()},
     new Map(original.frozen.questions.map(q=>[q.id,q])));
   if(next!==original){
     attempt=next;
     const changedSection=original.state.sectionIndex!==next.state.sectionIndex;
     if(next.finishedAt!==null||changedSection||now()-lastTimerSave>=10000){
       save(attempt);lastTimerSave=now();
     }
     if(next.finishedAt!==null){view="result";draw();return;}
     if(changedSection){draw();return;}
   }
   const el=root.querySelector("#g-timer");
   if(el&&attempt){const time=examTimeRemaining(attempt.frozen.paper,attempt.state);
     el.textContent=time===null?"Untimed":minutes(time);}
 },1000);
 const visibility=()=>{if(view==="exam"&&attempt)dispatch({type:"VISIBILITY",nowMs:now(),visible:!document.hidden});};
 document.addEventListener("visibilitychange",visibility);
 const pagehide=()=>{
   if(view==="exam"&&attempt){
     try{
       const current=attempt;
       attempt=transitionGenericAttempt(current,{type:"VISIBILITY",nowMs:now(),visible:false},
         new Map(current.frozen.questions.map(q=>[q.id,q])));
       writeMirror(attempt);
       save(attempt);
     }catch(error){console.warn("Pagehide checkpoint failed",error);}
   }
 };
 window.addEventListener("pagehide",pagehide);
 function cleanup(){disposed=true;window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility);
   window.removeEventListener("pagehide",pagehide);void writeQueue.finally(()=>db?.close());root.classList.remove("generic-workspace");}
 draw();
 (async()=>{
   try{
     db=await new Promise<IDBDatabase>((resolve,reject)=>{
       const request=indexedDB.open("practiceDesk.history.v1",2);
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
       else if(isAttempt(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved generic attempt",error);}
       }
     }
     try{
       const mirror=JSON.parse(localStorage.getItem(mirrorKey)??"null") as unknown;
       if(isAttempt(mirror)){
         validateGenericStoredRecord(mirror);
         const existing=records.get(mirror.id);
         const winner=chooseRecovered(isAttempt(existing)?existing:undefined,mirror);
         if(winner===mirror){records.set(mirror.id,mirror);save(mirror);}
       }
     }catch(error){console.warn("Invalid emergency session mirror",error);}
   }catch{
     warning="IndexedDB unavailable. Limited localStorage fallback is in use.";
     try{
       const recordsFromStorage=JSON.parse(localStorage.getItem(storageKey)??"[]") as unknown[];
       for(const record of recordsFromStorage){
         if(isPackage(record)){try{packages.set(record.bundle.paper.id,validateExamPackage(record.bundle));records.set(record.id,record);}catch{}}
         else if(isAttempt(record)){
         try{validateGenericStoredRecord(record);records.set(record.id,record);}
         catch(error){console.warn("Invalid saved generic attempt",error);}
       }
       }
     }catch{warning="Browser storage is unavailable; attempts may not survive a reload.";}
   }
   loading=false;
   if(!disposed){
     const target=initialAttemptId&&records.get(initialAttemptId);
     if(isAttempt(target)){
       attempt=target;
       if(target.finishedAt===null){
         const restored=restoreSession(target.frozen.paper,target.state,now(),!document.hidden);
         attempt={...target,state:restored.state,
          ...(restored.expired?{finishedAt:now(),result:scoreAttempt(target.frozen.paper,target.frozen.key,
            target.frozen.questions,restored.state.responses,new Date().toISOString())}:{})};
         save(attempt);
       }
       view=attempt.finishedAt?"result":"exam";
     }else if(initialAttemptId)warning="The selected attempt could not be found in this browser.";
     draw();
   }
 })();
 return cleanup;
}
