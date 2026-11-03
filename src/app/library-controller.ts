/** P47-6 module: library-controller.ts */
import {escapeText} from "./html-escape.ts";
import {minutes} from "./exam-view.ts";
import {isAttempt,isLearning} from "./stored-record-validator.ts";


import {configureCglPractice,configureUntimedPractice,startGenericAttempt} from "./exam-package.ts";
import type {ExamPackage,GenericAttempt,CglPracticeMode} from "./exam-package.ts";

import {createSourceKeyReference} from "../engine/source-comparison.ts";
import {composePracticeSet,practiceInventory} from "./practice-compose.ts";
import {createSourceReviewReference} from "../engine/review-source.ts";

import {DEFAULT_HISTORY_QUERY} from "./history-query.ts";

import {frozenScoreSummary} from "./history-score.ts";


import {examPreflight,preflightHTML,examRulesHTML} from "./exam-preflight.ts";

import {writePracticeSetups,type PracticeSetups} from "./practice-selection.ts";
import {familyIdFor,pairedEdition,BUILTIN_CGL_FAMILY} from "./exam-families.ts";
import {importAuthoredExam,APFC_NAT_BANK_TEMPLATE} from "./bank-import.ts";

import type {CoordinatorContext} from "./coordinator-context.ts";

export function renderLibraryHTML(owner:CoordinatorContext):string {
   const all=[...owner.records.values()].filter(isAttempt).sort((a,b)=>b.startedAt-a.startedAt);
   const complete=all.filter(a=>a.finishedAt!==null);
   const pending=all.filter(a=>a.finishedAt===null);
   // Completed results and resumable tests are separate workflows.
   // A recent unfinished attempt must not evict an older completed result.
   const latest=[...complete].sort((a,b)=>(b.finishedAt??0)-(a.finishedAt??0)||
     b.startedAt-a.startedAt).slice(0,3);
   const catalog=owner.families(),family=catalog.find(f=>f.id===owner.selectedFamilyId);
   const selected=family?.papers.find(p=>p.paper.id===owner.choice);
   const cgl=owner.selectedFamilyId===BUILTIN_CGL_FAMILY&&Boolean(selected);
   const configured=selected?configureUntimedPractice(
     cgl?configureCglPractice(selected,owner.cglMode,owner.singleSection):selected,owner.untimedPractice):null;
   const selectedNumbers=new Set(configured?.questions.map(q=>q.questionId.split(":").at(-1))??[]);
   const preflight=configured?examPreflight(configured,{
     builtinCgl:cgl,
     ...(cgl?{reviewedPatchCount:Object.keys(owner.patches[selected!.paper.paperId]??{})
       .filter(id=>selectedNumbers.has(id)).length}:{})
   }):null;
   const count=selected?.paper.sections.reduce((n,z)=>n+z.questionRevisionIds.length,0)??0;
   const modeLabel=cgl?owner.cglMode==="strict"?"Exam simulation":owner.cglMode==="free"?"Full paper practice":"Section practice":"Custom examination";
   const time=configured?.paper.timing.kind==="untimed"?"Untimed":cgl?
     owner.cglMode==="strict"?"15 min per section":owner.cglMode==="single"?"15 minutes":"60 minutes":
     configured?.paper.timing.kind==="whole-paper"?minutes(configured.paper.timing.durationMs):
     "Section timers";
   const questionCount=cgl&&owner.cglMode==="single"?selected?.paper.sections[owner.singleSection]?.questionRevisionIds.length??0:count;
   const previewSections=cgl&&owner.cglMode==="single"?1:selected?.paper.sections.length??0;
   const previewNavigation=cgl?owner.cglMode==="free"?"Free":owner.cglMode==="single"?"One section":"Section locked":
     selected?.paper.navigation.sectionNavigation==="free"?"Free":"Sequential";
   // Edition switches filter only the active family; custom papers remain visible.
   const available=family?.papers??[];
   const published=available.filter(p=>p.paper.edition===owner.editionView);
   const custom=available.filter(p=>p.paper.edition==="custom");
   const option=(p:ExamPackage):string=>'<option value="'+escapeText(p.paper.id)+'"'+
     (owner.choice===p.paper.id?" selected":"")+'>'+escapeText(p.title)+'</option>';
   const missing=!selected&&owner.choice?
     '<option value="'+escapeText(owner.choice)+'" selected disabled>Saved paper unavailable — re-import or choose another</option>':"";
   const options=missing+
     (published.length?'<optgroup label="'+(owner.editionView==="reviewed"?"Reviewed papers":"Original papers")+'">'+
       published.map(option).join("")+'</optgroup>':"")+
     (custom.length?'<optgroup label="Imported / custom examinations">'+
       custom.map(option).join("")+'</optgroup>':"")+
     (!selected&&!missing?'<option value="" selected disabled>Choose a paper</option>':"");
   const hasEditions=available.some(p=>p.paper.edition==="source")&&
     available.some(p=>p.paper.edition==="reviewed");
   const familyOptions=(owner.selectedFamilyId&&!family?
     '<option value="'+escapeText(owner.selectedFamilyId)+'" selected disabled>Saved exam family unavailable — re-import</option>':"")+
     catalog.map(f=>'<option value="'+escapeText(f.id)+'"'+
       (f.id===owner.selectedFamilyId?" selected":"")+'>'+escapeText(f.title)+
       ' ('+f.papers.length+' paper edition'+(f.papers.length===1?"":"s")+')</option>').join("");
   const composeInventory=owner.composeOpen&&configured?practiceInventory(configured):null;
   const filterOption=(value:string,label:string,current:string):string=>
     '<option value="'+escapeText(value)+'"'+(value===current?" selected":"")+'>'+
     escapeText(label)+'</option>';
   const builder=selected?'<section class="panel pad practice-builder" id="g-compose">'+
     '<details id="g-compose-details"'+(owner.composeOpen?' open':'')+'>'+
     '<summary>Create a custom practice set from this paper</summary>'+
     '<p class="fine">Draw from this paper and edition only. Preserve marking, navigation and timers. Excluded questions are not drawn; tags are never inferred.</p>'+
     '<div class="practice-compose-fields">'+
     '<label>Section<select id="g-compose-section">'+filterOption("","All sections",owner.composeSection)+
     (composeInventory?.sectionChoices??[]).map(x=>filterOption(x.id,x.title+" ("+x.count+")",owner.composeSection)).join("")+
     '</select></label>'+
     '<label>Source topic<select id="g-compose-topic">'+filterOption("","Any topic",owner.composeTopic)+
     (composeInventory?.topics??[]).map(x=>filterOption(x.id,x.id+" ("+x.count+")",owner.composeTopic)).join("")+
     '</select></label>'+
     '<label>Supplied difficulty<select id="g-compose-difficulty">'+filterOption("","Any difficulty",owner.composeDifficulty)+
     (composeInventory?.difficulties??[]).map(x=>filterOption(x.id,x.id+" ("+x.count+")",owner.composeDifficulty)).join("")+
     '</select></label>'+
     '<label>Questions<input type="number" id="g-compose-count" min="1" max="2000" step="1" value="'+owner.composeCount+'"></label>'+
     '<label>Repeatable seed<input type="text" id="g-compose-seed" maxlength="80" value="'+escapeText(owner.composeSeed)+'"></label>'+
     '</div><p class="fine">'+(composeInventory?
      composeInventory.eligible+' eligible of '+configured!.questions.length+
      ' questions · '+composeInventory.excluded+' excluded · '+composeInventory.cautions+' caution.':
      "Expand to inspect source metadata.")+'</p>'+
     (owner.composePreview?'<p class="fine compose-preview" role="status">'+escapeText(owner.composePreview)+'</p>':"")+
     (owner.composeError?'<p class="generic-warning" role="alert">'+escapeText(owner.composeError)+'</p>':"")+
     '<div class="row generic-actions"><button type="button" class="btn" id="g-compose-preview">Preview draw</button>'+
     '<button type="button" class="btn primary" id="g-compose-start"'+
     (owner.loading||owner.fallbackConflict||owner.storageFault?" disabled":"")+
     '>Start custom set</button></div></details></section>':"";
   return '<div class="generic-heading home-heading"><div><span class="eyebrow">OFFLINE PRACTICE STUDIO</span>'+
     '<h1>Test library</h1><p class="muted">Choose a paper, work in exam conditions and learn from every attempt.</p></div>'+
     '<button class="btn quiet" id="g-history">History & insights →</button></div>'+
     (owner.warning?'<p class="generic-warning" role="status">'+escapeText(owner.warning)+'</p>':"")+
     (pending.length?'<section class="panel pad pending-panel" id="g-pending-attempts">'+
      '<div class="row between"><div><span class="eyebrow">PICK UP WHERE YOU LEFT OFF</span>'+
      '<h2>Unfinished attempts</h2><p class="fine">'+pending.length+' saved, resumable test'+(pending.length===1?"":"s")+
      '. Section timers follow the frozen exam policy; leaving the app does not pause a running clock.</p></div>'+
      (pending.length>5?'<button type="button" class="textlink" id="g-pending-history">View all '+pending.length+' →</button>':"")+
      '</div><div class="pending-attempt-list">'+pending.slice(0,5).map(a=>
        '<button class="recent-attempt" data-attempt="'+escapeText(a.id)+'" aria-label="Resume '+escapeText(owner.packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'">'+
        '<b>'+escapeText(owner.packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'</b>'+
        '<small>'+new Date(a.startedAt).toLocaleString()+' · '+
          escapeText(a.frozen.snapshot.mode.replaceAll("-"," "))+' · '+
          a.state.responses.filter(z=>z.response!==undefined).length+' answers · Resume →</small></button>').join("")+
      '</div>'+(pending.length>5?'<p class="fine">Showing the five most recent unfinished tests; all others are preserved in History.</p>':"")+
      '</section>':"")+
     '<div class="generic-layout home-grid"><section class="panel pad home-picker"><h2 class="sr-only">Start a practice session</h2>'+
     '<div class="family-paper-row">'+
     '<div class="family-field"><label class="picker" for="g-family">Examination family</label>'+
     '<select id="g-family" aria-label="Examination family">'+familyOptions+'</select></div>'+
     '<div class="paper-field"><label class="picker" for="g-papers">Paper</label>'+
     '<select id="g-papers">'+options+'</select></div></div>'+
     (!selected?'<p class="generic-warning" role="status">Saved paper unavailable. Re-import its revision or select an installed paper.</p>':"")+
     (hasEditions?'<div class="edition-row"><span class="picker" id="editionLabel">Paper edition</span>'+
       '<div class="edition-toggle" id="g-edition" role="group" aria-labelledby="editionLabel">'+
       (["reviewed","source"] as const).map(edition=>
         '<button type="button" class="edition-choice '+(owner.editionView===edition?"active":"")+
         '" data-edition="'+edition+'" aria-pressed="'+(owner.editionView===edition)+'">'+
         (cgl?(edition==="reviewed"?"Reviewed &amp; Corrected":"Original PDF"):
           edition==="reviewed"?"Imported reviewed":"Imported source")+'</button>').join("")+
       '</div><p class="fine edition-note">'+(family?.imported?
         "User-supplied edition; Practice Desk does not certify its questions or keys.":
         owner.editionView==="reviewed"?
           "Independently reviewed wording and answer keys; disputed items are labelled after submission.":
           "Original publisher transcription; no independent key changes applied.")+
       '</p></div>':"")+
     (cgl?'<h3 class="subhead">Practice mode</h3><div class="generic-modes" role="group" aria-label="SSC CGL practice mode">'+
      ([["strict","Exam simulation","4 locked sections · 15 minutes each"],["free","Flexible full paper","60 minutes · move between sections"],
       ["single","Section practice","25 questions · 15 minutes"]] as const).map(([key,title,detail])=>
      '<button type="button" class="mode '+(owner.cglMode===key?"on":"")+'" data-mode="'+key+'" aria-pressed="'+(owner.cglMode===key)+'">'+
      '<span class="radio-dot"></span><span><strong>'+title+'</strong><small>'+detail+'</small></span></button>').join("")+'</div>'+
      (owner.cglMode==="single"?'<label class="picker" for="g-single-section">Choose section</label><select id="g-single-section">'+
       selected!.paper.sections.map((z,i)=>'<option value="'+i+'"'+(owner.singleSection===i?" selected":"")+'>'+escapeText(z.title)+'</option>').join("")+'</select>':""):"")+
     '<label class="untimed-option" for="g-untimed"><input type="checkbox" id="g-untimed"'+
        (owner.untimedPractice?" checked":"")+'><span><strong>Untimed practice</strong>'+
        '<small>No countdown or automatic expiry. Keep the selected navigation and scoring rules; finish when ready.</small></span></label>'+
     '<div class="row generic-actions home-start"><button class="btn primary" id="g-start"'+
      (owner.loading||owner.fallbackConflict||owner.storageFault||!selected?' disabled':'')+'>Start '+escapeText(modeLabel)+' →</button>'+
      '<button class="btn" id="g-import"'+(owner.loading||owner.fallbackConflict||owner.storageFault?' disabled':'')+'>Import question bank</button>'+
      '<button type="button" class="btn" id="g-image-prep">Prepare image for a bank</button>'+
      '<button type="button" class="btn" id="g-author-open">Author question bank</button></div>'+
      '<input type="file" id="g-file" accept=".json,.gz,application/json,application/gzip" hidden>'+
      '<p class="fine">Start with an editable <button type="button" class="textlink" id="g-bank-template">Download APFC/NAT bank template</button> (JSON). '+
      'An authored simple bank may include a media array, question imageIds and optionImageIds. Prepare local images first; signed packages are never recompressed. Source and reviewed editions remain distinct. Answers, keys and solutions are hidden until the attempt ends.</p></section>'+
     '<aside class="home-side"><section class="panel pad paper-preview"><span class="eyebrow">SELECTED PAPER</span>'+
      '<h2>'+escapeText(selected?.title??"Choose a paper")+'</h2>'+
      '<p class="fine family-provenance">'+(family?.imported?
        "Imported/user-supplied content; not an official exam bank.":
        family?"Included SSC CGL papers. Original and reviewed versions remain distinct.":
        "Saved examination unavailable. Re-import the bank or select another.")+'</p>'+
      '<p class="fine">'+escapeText(selected?.paper.paperId??"")+' · '+escapeText(selected?.paper.edition??"")+'</p>'+
      '<div class="preview-metrics"><div><b>'+questionCount+'</b><small>Questions</small></div>'+
      '<div><b>'+escapeText(time)+'</b><small>Time</small></div><div><b>'+escapeText(previewSections)+'</b><small>Sections</small></div>'+
      '<div><b>'+escapeText(previewNavigation)+
      '</b><small>Navigation</small></div></div>'+
      '<p class="fine">Scoring and timer rules are frozen when you start; later paper edits cannot change a saved result.</p>'+
      (preflight?preflightHTML(preflight):"")+'</section>'+
      '<section class="panel pad recent-panel"><div class="row between"><h2>Recent completed results</h2>'+
      '<button class="textlink" id="g-history-recent">View all →</button></div>'+
      (latest.length?latest.map(a=>'<button class="recent-attempt" data-attempt="'+escapeText(a.id)+'">'+
       '<b>'+escapeText(owner.packages.get(a.packageId)?.title??a.frozen.paper.paperId)+'</b>'+
       '<small>'+new Date(a.finishedAt??a.startedAt).toLocaleDateString()+' · '+
         escapeText(a.frozen.snapshot.mode.replaceAll("-"," "))+' · '+
         escapeText(frozenScoreSummary(a)?.text??"Score unavailable")+'</small></button>').join(""):
       '<p class="fine">Your three most recent completed results will appear here; unfinished attempts stay in their own Resume area.</p>')+
      '</section></aside></div>'+builder+
      '<div id="pd-authoring-container" class="pd-authoring-container" hidden></div>'+
      '<div class="home-utilities"><section class="panel pad learning-entry"><div><span class="eyebrow">REVISE & IMPROVE</span>'+
       '<h2>Learning & revision</h2><p class="fine">Error notebook, FSRS-7 spaced review, source-linked revision tests and topic evidence.</p></div>'+
       '<button class="btn primary" id="g-learning">Open learning desk →</button></section>'+
      '<section class="panel pad backup-home"><div><span class="eyebrow">YOUR DATA</span><h2>Portable offline history</h2>'+
       '<p class="fine">Stored in this browser. Export a backup to protect your history and notes.</p></div>'+
       '<div class="row generic-actions"><button class="btn" id="g-export-history"'+(owner.loading?" disabled":"")+'>Export backup</button>'+
       '<button class="btn" id="g-import-history"'+(owner.loading||owner.fallbackConflict||owner.storageFault?" disabled":"")+'>Import backup</button></div>'+
       '<input type="file" id="g-history-file" accept=".json,.gz,application/json,application/gzip" hidden></section></div>'+
       // At desktop widths the user should see the exam setup, not four
       // dashboard totals, first. Retain all counts after primary workflows.
     '<div class="home-stats">'+
       [['Paper editions',owner.packages.size],['Completed tests',complete.length],['Attempts in progress',pending.length],['Notebook cards',[...owner.records.values()].filter(isLearning).length]]
         .map(([name,value])=>'<div class="home-stat"><small>'+escapeText(name)+'</small><b>'+escapeText(value)+'</b></div>').join("")+
     '</div>'+
       (preflight?examRulesHTML(preflight):"");
 }

export const applyLibraryFamily=(owner:CoordinatorContext,id:string):void=>{
   owner.selectedFamilyId=id;
   const previous=owner.setups.families[id];
   if(previous){
     owner.choice=previous.paperRevisionId;owner.cglMode=previous.mode;
     owner.singleSection=previous.section;owner.untimedPractice=previous.untimed;
     owner.editionView=previous.edition;
   }else{
     const family=owner.families().find(f=>f.id===id);
     const paper=family?.papers.find(p=>p.paper.edition==="reviewed")??family?.papers[0];
     owner.choice=paper?.paper.id??"";owner.cglMode="strict";owner.singleSection=0;
     owner.untimedPractice=false;owner.editionView=paper?.paper.edition==="source"?"source":"reviewed";
   }
   if(owner.packages.has(owner.choice))
     owner.singleSection=Math.min(owner.singleSection,Math.max(0,owner.packages.get(owner.choice)!.paper.sections.length-1));
 };

export const persistLibrarySelection=(owner:CoordinatorContext):void=>{
   const next:PracticeSetups={schema:2,selectedFamilyId:owner.selectedFamilyId,
     families:{...owner.setups.families,[owner.selectedFamilyId]:{
       paperRevisionId:owner.choice,mode:owner.cglMode,section:owner.singleSection,
       untimed:owner.untimedPractice,edition:owner.editionView
     }}};
   owner.setups=next;
   try{writePracticeSetups(next);}
   catch{owner.warning="Exam setup could not be saved on this device; current selection still works.";}
 };

export function bindLibraryScreen(owner:CoordinatorContext):void{

     owner.root.querySelector<HTMLButtonElement>("#g-learning")!.onclick=()=>owner.go({screen:"learning"});
     owner.root.querySelector<HTMLSelectElement>("#g-family")!.onchange=e=>{
       const id=(e.target as HTMLSelectElement).value;
       if(!owner.families().some(f=>f.id===id))return;
       owner.applyFamily(id);owner.saveSelection();owner.draw();
     };
     owner.root.querySelector<HTMLSelectElement>("#g-papers")!.onchange=e=>{
       owner.choice=(e.target as HTMLSelectElement).value;
       const chosen=owner.packages.get(owner.choice);
       if(chosen?.paper.edition==="source"||chosen?.paper.edition==="reviewed")
         owner.editionView=chosen.paper.edition;
       owner.singleSection=Math.min(owner.singleSection,Math.max(0,(owner.packages.get(owner.choice)?.paper.sections.length??1)-1));
       owner.saveSelection();owner.draw();
     };
     owner.root.querySelectorAll<HTMLButtonElement>("[data-edition]").forEach(button=>button.onclick=()=>{
       const next=button.dataset.edition;
       if(next!=="source"&&next!=="reviewed")return;
       if(next===owner.editionView)return;
       const current=owner.packages.get(owner.choice);
       owner.editionView=next;
       const family=owner.families().find(f=>f.id===owner.selectedFamilyId);
       const same=current&&family?pairedEdition(family,current,next):undefined;
       const first=family?.papers.find(p=>p.paper.edition===next);
       owner.choice=(same??first??current)?.paper.id??owner.choice;
       owner.singleSection=Math.min(owner.singleSection,Math.max(0,(owner.packages.get(owner.choice)?.paper.sections.length??1)-1));
       owner.saveSelection();owner.draw();
     });
     owner.root.querySelector<HTMLButtonElement>("#g-history")!.onclick=()=>owner.go({screen:"history"});
     owner.root.querySelector<HTMLButtonElement>("#g-history-recent")!.onclick=()=>{
       owner.changeHistoryQuery({...DEFAULT_HISTORY_QUERY,status:"complete"},false);
       owner.go({screen:"history"});
     };
     const pendingHistory=owner.root.querySelector<HTMLButtonElement>("#g-pending-history");
     if(pendingHistory)pendingHistory.onclick=()=>{
       owner.changeHistoryQuery({...DEFAULT_HISTORY_QUERY,status:"progress"},false);
       owner.go({screen:"history"});
     };
     owner.root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(button=>button.onclick=()=>{
       owner.cglMode=button.dataset.mode as CglPracticeMode;owner.saveSelection();owner.draw();
     });
     owner.root.querySelector<HTMLInputElement>("#g-untimed")!.onchange=e=>{
       owner.untimedPractice=(e.target as HTMLInputElement).checked;owner.saveSelection();owner.draw();
     };
     const single=owner.root.querySelector<HTMLSelectElement>("#g-single-section");
     if(single)single.onchange=()=>{owner.singleSection=Number(single.value);owner.saveSelection();};
     const builderDetails=owner.root.querySelector<HTMLDetailsElement>("#g-compose-details");
     if(builderDetails){
       builderDetails.ontoggle=()=>{
         if(owner.composeOpen!==builderDetails.open){owner.composeOpen=builderDetails.open;owner.draw();}
       };
       // Preserve in-progress field edits if an asynchronous details toggle
       // triggers a Library redraw before the Preview/Start click.
       owner.root.querySelector<HTMLInputElement>("#g-compose-seed")!.oninput=e=>{
         owner.composeSeed=(e.target as HTMLInputElement).value;
       };
       owner.root.querySelector<HTMLInputElement>("#g-compose-count")!.oninput=e=>{
         owner.composeCount=Number((e.target as HTMLInputElement).value);
       };
       for(const [id,assign] of [
         ["#g-compose-section",(v:string)=>{owner.composeSection=v;}],
         ["#g-compose-topic",(v:string)=>{owner.composeTopic=v;}],
         ["#g-compose-difficulty",(v:string)=>{owner.composeDifficulty=v;}]
       ] as const){
         owner.root.querySelector<HTMLSelectElement>(id)!.onchange=e=>{
           assign((e.target as HTMLSelectElement).value);
         };
       }
       const capture=()=>{
         owner.composeSection=owner.root.querySelector<HTMLSelectElement>("#g-compose-section")!.value;
         owner.composeTopic=owner.root.querySelector<HTMLSelectElement>("#g-compose-topic")!.value;
         owner.composeDifficulty=owner.root.querySelector<HTMLSelectElement>("#g-compose-difficulty")!.value;
         owner.composeCount=Number(owner.root.querySelector<HTMLInputElement>("#g-compose-count")!.value);
         owner.composeSeed=owner.root.querySelector<HTMLInputElement>("#g-compose-seed")!.value.trim();
       };
       const make=()=>{
         capture();
         const p=owner.packages.get(owner.choice);
         if(!p||familyIdFor(p,owner.builtinPaperIds)!==owner.selectedFamilyId)throw Error("Selected paper unavailable");
         const base=configureUntimedPractice(
           owner.selectedFamilyId===BUILTIN_CGL_FAMILY?
             configureCglPractice(p,owner.cglMode,owner.singleSection):p,owner.untimedPractice);
         return composePracticeSet(base,{count:owner.composeCount,seed:owner.composeSeed,
           filters:{...(owner.composeSection?{sectionId:owner.composeSection}:{}),
             ...(owner.composeTopic?{topicId:owner.composeTopic}:{}),
             ...(owner.composeDifficulty?{difficulty:owner.composeDifficulty}:{})}});
       };
       owner.root.querySelector<HTMLButtonElement>("#g-compose-preview")!.onclick=()=>{
         try{
           const {bundle,manifest}=make();
           const pf=examPreflight(bundle,{builtinCgl:owner.selectedFamilyId===BUILTIN_CGL_FAMILY});
           owner.composePreview=manifest.selectedQuestionRevisionIds.length+" selected from "+
             manifest.eligibleCount+" eligible · maximum "+pf.maximum.toFixed(pf.decimals)+
             " marks · "+(bundle.paper.timing.kind==="untimed"?"untimed":bundle.paper.timing.kind)+
             " · "+bundle.paper.sections.length+" sections · seed "+owner.composeSeed+". Source revision is frozen.";
           owner.composeError="";
         }catch(error){
           owner.composePreview="";owner.composeError=error instanceof Error?error.message:"Invalid custom set";
         }
         owner.composeOpen=true;owner.draw();
       };
       owner.root.querySelector<HTMLButtonElement>("#g-compose-start")!.onclick=()=>{
         if(owner.loading||owner.fallbackConflict||owner.storageFault)return;
         try{
           const {bundle,manifest}=make();
           const unfinished=[...owner.records.values()].filter((row):row is GenericAttempt=>
             isAttempt(row)&&row.finishedAt===null);
           if(unfinished.length&&!confirm("You have "+unfinished.length+
             " unfinished tests. Start a separate custom attempt? Existing attempts remain saved."))return;
           const id=typeof crypto!=="undefined"&&crypto.randomUUID?
             crypto.randomUUID():"custom-"+owner.now()+"-"+Math.random();
           owner.attempt={...startGenericAttempt(bundle,id,owner.now()),practiceComposition:manifest};
           owner.freshlyStartedAttemptId=owner.attempt.id;
           owner.composeError="";owner.composePreview="";owner.warning="";
           void owner.save(owner.attempt);owner.go({screen:"exam",attemptId:owner.attempt.id});
         }catch(error){
           owner.composeOpen=true;owner.composePreview="";
           owner.composeError=error instanceof Error?error.message:"Cannot create custom practice";
           owner.draw();
         }
       };
     }
     owner.root.querySelector<HTMLButtonElement>("#g-start")!.onclick=()=>{
       const p=owner.packages.get(owner.choice);
       if(!p||familyIdFor(p,owner.builtinPaperIds)!==owner.selectedFamilyId)return;
       const unfinished=[...owner.records.values()].filter((row):row is GenericAttempt=>
         isAttempt(row)&&row.finishedAt===null);
       if(unfinished.length&&!confirm(
         "You have "+unfinished.length+" unfinished test"+(unfinished.length===1?"":"s")+
         ". Start a separate attempt? Existing attempts will be kept; their timers continue until expiry when resumed or while active."))return;
       const id=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():"generic-"+owner.now()+"-"+Math.random();
       const configured=configureUntimedPractice(
         owner.selectedFamilyId===BUILTIN_CGL_FAMILY?configureCglPractice(p,owner.cglMode,owner.singleSection):p,owner.untimedPractice);
       owner.attempt=startGenericAttempt(configured,id,owner.now());
       owner.freshlyStartedAttemptId=owner.attempt.id;
       if(configured.paper.edition==="reviewed"){
         const source=[...owner.packages.values()].find(candidate=>candidate.paper.edition==="source"&&
           familyIdFor(candidate,owner.builtinPaperIds)===owner.selectedFamilyId&&
           candidate.paper.paperId===configured.paper.paperId&&candidate.examId===configured.examId);
         if(source){
           const original= createSourceKeyReference(configured,source);
           const review= createSourceReviewReference(configured,source);
           owner.attempt={...owner.attempt,
             ...(original?{sourceKeyReference:original}:{}),
             ...(review?{sourceReviewReference:review}:{})};
         }
       }
       owner.warning="";void owner.save(owner.attempt);owner.go({screen:"exam",attemptId:owner.attempt.id});
     };
     owner.root.querySelector<HTMLButtonElement>("#g-import")!.onclick=()=>owner.root.querySelector<HTMLInputElement>("#g-file")?.click();
     owner.root.querySelector<HTMLButtonElement>("#g-image-prep")!.onclick=e=>owner.imagePreparation.open(e.currentTarget as HTMLElement);
     owner.root.querySelector<HTMLButtonElement>("#g-author-open")!.onclick=e=>{
       const target=owner.root.querySelector<HTMLElement>("#pd-authoring-container");
       if(target)void owner.authoringStudio.open(target,e.currentTarget as HTMLElement);
     };
     owner.root.querySelector<HTMLButtonElement>("#g-bank-template")!.onclick=()=>{
       const data=new Blob([JSON.stringify(APFC_NAT_BANK_TEMPLATE,null,2)],{type:"application/json"});
       const url=URL.createObjectURL(data);
       const link=document.createElement("a");link.href=url;link.download="Practice_Desk_APFC_NAT_Starter.json";
       document.body.append(link);link.click();link.remove();
       window.setTimeout(()=>URL.revokeObjectURL(url),2000);
     };
     owner.root.querySelector<HTMLButtonElement>("#g-export-history")!.onclick=()=>{void owner.downloadBackup();};
     owner.root.querySelector<HTMLButtonElement>("#g-import-history")!.onclick=()=>owner.root.querySelector<HTMLInputElement>("#g-history-file")?.click();
     owner.root.querySelector<HTMLInputElement>("#g-history-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       try{await owner.importHistory(file);}catch(error){owner.notice(error instanceof Error?error.message:"History import failed");}
     };
     owner.root.querySelector<HTMLInputElement>("#g-file")!.onchange=async e=>{
       const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
       if(file.size>25*1024*1024){owner.notice("Exam package exceeds the 25 MiB import limit.");return;}
       try{
         const pkg=importAuthoredExam(JSON.parse(await file.text()));
         if(owner.packages.has(pkg.paper.id))throw new Error("Paper revision ID already exists. Supply a new revision ID.");
         if(!await owner.save({recordType:"generic-package",id:"generic-package:"+pkg.paper.id,bundle:pkg}))return;
         owner.packages.set(pkg.paper.id,pkg);
         owner.applyFamily(familyIdFor(pkg,owner.builtinPaperIds));
         owner.choice=pkg.paper.id;owner.singleSection=0;
         if(pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")owner.editionView=pkg.paper.edition;
         owner.saveSelection();
         owner.notice("Question bank validated and imported. Your paper is ready to practise.");
       }catch(error){owner.notice(error instanceof Error?error.message:"Invalid exam package");}
     };
     owner.root.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(button=>button.onclick=()=>{
       void owner.removeSavedAttempt(button.dataset.delete??"","completed");
     });
     owner.root.querySelectorAll<HTMLButtonElement>("[data-discard]").forEach(button=>button.onclick=()=>{
       void owner.removeSavedAttempt(button.dataset.discard??"","discard-unfinished");
     });
     owner.root.querySelectorAll<HTMLButtonElement>("[data-attempt]").forEach(button=>button.onclick=()=>{
       owner.openSaved(button.dataset.attempt??"");
     });
     return;
   
}
