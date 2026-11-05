/** P47-5C: one integrated Library authoring surface.
 * Independently mounted controller; no exam state, scoring, routes or publisher writes.
 * P47-5D will take these validated drafts through a separate freeze/publish service.
 */
import type {ImageAsset,QuestionKind} from "../domain/question.ts";
import type {AssetId,ContentHash} from "../domain/ids.ts";
import {QUESTION_KINDS} from "../domain/question.ts";
import {sha256} from "../domain/hash.ts";
import {validateMediaInventory} from "../domain/media.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import type {ExamPackage} from "../app/exam-package.ts";
import {inspectAuthoringPublication,publicationPlainText,PublicationValidationError,
 type PublicationIssue} from "./authoring-publisher.ts";
import {inspectExternalQuality,type QualityIssue} from "./external-bank-qa.ts";
import {STAGING_KEY,addStagedFiles,validateStagingWorkspace,inspectStagingWorkspace,
 stagedToAuthoringDraft,updateStagedSelection,type StagingWorkspace,type StagedFile}
 from "./authoring-staging.ts";
import {authoringSections,setAuthoringSectionMinutes,assignAuthoringQuestionSection} from "./authoring-sections.ts";
import {authoringPublishedPreview,authoringDraftPreview} from "./authoring-preview.ts";
import {mathRenderer} from "../app/math-renderer-provider.ts";
import {escapeText} from "../app/html-escape.ts";
import {wordgardEditorPort} from "./wordgard-adapter.ts";
import {syllabusForExam,syllabusHeading,UNCLASSIFIED_SUBJECT} from "../learning/syllabus-taxonomy.ts";
import type {EditorSession,AuthoringEditCommand} from "./vendor-ports.ts";
import {AUTHORING_KEY,AUTHORING_MAX_BYTES,defaultAuthoringShelf,newAuthoringDraft,
 newAuthoringQuestion,validateAuthoringDraft,validateAuthoringShelf,
 type AuthoringDraft,type AuthoringDraftShelf,type AuthoringQuestion} from "./authoring-draft.ts";

const labels:Record<QuestionKind,string>={
 "single-choice":"Single choice (MCQ)",
 "multiple-select":"Multiple select",
 "numeric-entry":"Numerical answer (NAT)",
 "true-false":"True or false",
 "matching":"Matching pairs",
 "free-response":"Written response"
};
type Field="prompt"|"passage"|"explanation"|
 "A"|"B"|"C"|"D"|"L1"|"L2"|"L3"|"L4"|"R1"|"R2"|"R3"|"R4";
const letters=["A","B","C","D"] as const;
const initialField:Field="prompt";
const fieldNames:Record<Field,string>={
 prompt:"Question stem",passage:"Passage / case",explanation:"Worked explanation",
 A:"Option A",B:"Option B",C:"Option C",D:"Option D",
 L1:"Match left 1",L2:"Match left 2",L3:"Match left 3",L4:"Match left 4",
 R1:"Match right 1",R2:"Match right 2",R3:"Match right 3",R4:"Match right 4"
};
function fields(kind:QuestionKind):Field[]{
 return ["prompt","passage",
  ...(kind==="single-choice"||kind==="multiple-select"?letters:[]),
  ...(kind==="matching"?["L1","L2","L3","L4","R1","R2","R3","R4"] as Field[]:[]),
  "explanation"] as Field[];
}
function fieldOf(q:AuthoringQuestion,field:Field):RichDocument{
 if(field==="prompt"||field==="passage"||field==="explanation")return q[field];
 if(letters.includes(field as (typeof letters)[number]))
  return q.options[letters.indexOf(field as (typeof letters)[number])]!;
 const index=Number(field.slice(1))-1;
 return (field[0]==="L"?q.leftItems:q.rightItems)[index]!;
}
function updatedField(q:AuthoringQuestion,field:Field,value:RichDocument):AuthoringQuestion{
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
function option(value:string,label:string,selected:string):string{
 return '<option value="'+escapeText(value)+'"'+(value===selected?" selected":"")+">"+
  escapeText(label)+"</option>";
}
function controls(draft:AuthoringDraft,current:AuthoringQuestion,field:Field):string{
 const applicable=fields(current.kind);
 const timingKind=draft.timingKind??(draft.durationMinutes?"whole-paper":"untimed");
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
      .map(([value,label])=>option(value,label,draft.pausePolicy??"allowed")).join("")+'</select></label>'+
  '<label>Question navigation<select id="pd-author-question-nav">'+
    ([["free","Free movement"],["forward-only","Forward only"]] as const)
      .map(([value,label])=>option(value,label,draft.questionNavigation??"free")).join("")+'</select></label>'+
  '<label>Section navigation<select id="pd-author-section-nav">'+
    ([["free","Free section movement"],["sequential-locked","Sequential locked"]] as const)
      .map(([value,label])=>option(value,label,draft.sectionNavigation??"free")).join("")+'</select></label>'+
  '<label>Section expiry<select id="pd-author-section-transition"'+
   (timingKind==="sectional"?"":' disabled title="Only used in sectional countdown mode"')+'>'+
    ([["manual","Stop and continue manually"],["automatic","Advance automatically"]] as const)
      .map(([value,label])=>option(value,label,draft.sectionTransition??"manual")).join("")+'</select></label>'+
  '<label class="pd-author-check"><input type="checkbox" id="pd-author-early-submit"'+
    (draft.allowEarlySubmit!==false?" checked":"")+
     (timingKind==="sectional"?"":' disabled title="Only used in sectional countdown mode"')+
     '> Permit early section submission</label>'+
  '<label class="pd-author-check"><input type="checkbox" id="pd-author-allow-review"'+
    (draft.allowReview!==false?" checked":"")+'> Release detailed answers after submission</label>'+
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
  '<label>Active section timer (minutes; affects every question in this section; 0 = untimed)<input id="pd-author-section-minutes" type="number" min="0" max="600" step="1" value="'+
   (authoringSections(draft).find(s=>s.name===current.section)?.conflict?"":current.sectionMinutes??15)+'"'+
   (authoringSections(draft).find(s=>s.name===current.section)?.conflict?' placeholder="Conflicting values — enter one time"':"")+'></label>'+
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
function toolbar():string{
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
function preview(draft:AuthoringDraft,q:AuthoringQuestion,
 existing:readonly ExamPackage[]):string{
 const report=inspectAuthoringPublication(draft,existing);
 if(!report.valid||!report.compiled)return authoringDraftPreview(draft,q);
 const revision=report.compiled.questions[draft.questions.findIndex(row=>row.id===q.id)];
 if(!revision)throw Error("Preview question not in compiled publication");
 return authoringPublishedPreview(report.compiled,revision.id);
}
function sectionManager(draft:AuthoringDraft,expanded:boolean):string{
 const sections=authoringSections(draft);
 return '<details id="pd-author-section-manager" class="pd-author-section-manager"'+
  (expanded?" open":"")+'><summary>Manage actual exam sections · '+sections.length+
   ' section'+(sections.length===1?"":"s")+
   (sections.some(s=>s.conflict)?" · conflicting section timers":"")+'</summary>'+
   '<p class="fine">Exam sections control timing and navigation independently of academic subjects. '+
    'Assign questions using their Actual exam section field; enter a new name to create a section. '+
    'Changing a timer here updates every question assigned to the section. '+
    'Conflicting values in an imported draft must be corrected before publishing.</p>'+
   '<div class="scroll-table"><table class="pd-author-section-table"><thead><tr>'+
    '<th>Exam section</th><th>Questions</th><th>Minutes (0 = untimed)</th></tr></thead><tbody>'+
   sections.map(section=>'<tr><th scope="row">'+escapeText(section.name)+'</th><td>'+
      section.count+'</td><td><label class="pd-author-section-time-label">'+
      '<input aria-label="Timer for '+escapeText(section.name)+
      '" type="number" min="0" max="600" step="1" data-author-section-timer="'+escapeText(section.name)+
      '" value="'+(section.conflict?"":section.minutes)+'"'+
      (section.conflict?' placeholder="Conflict: choose one value" aria-invalid="true"':"")+
      '></label></td></tr>').join("")+
   '</tbody></table></div>'+
   '<p class="fine" id="pd-author-section-policy">'+
    (draft.timingKind==="sectional"?
      'Sectional mode uses these section budgets; zero means no countdown for that section.':
      'These budgets are saved for future sectional mode; the current timing policy does not use them.')+
   '</p></details>';
}
export interface AuthoringStudioController{
 open(host:HTMLElement,trigger:HTMLElement):Promise<void>;
 stageFiles(files:readonly File[]):Promise<void>;
 beforeRender():void;
 isOpen():boolean;
 dispose():void;
}
export interface AuthoringPublicationActions{
 existing():readonly ExamPackage[];
 publish(bundle:ExamPackage):Promise<void>;
 onClose?():void;
}
export function createQuestionAuthoringStudio(actions:AuthoringPublicationActions):AuthoringStudioController{
 let host:HTMLElement|null=null,origin:HTMLElement|null=null,session:EditorSession|null=null;
 let shelf:AuthoringDraftShelf|null=null,questionId="",field:Field=initialField;
 let closed=true,renderSequence=0,lastSaveError="",storageBlocked=false,publishing=false,sectionManagerExpanded=false;
 let stage:StagingWorkspace|null=null,stageFilter="all",stageBlocked=false,stageError="";
 const active=():AuthoringDraft=>{
  const current=shelf?.drafts.find(d=>d.id===shelf!.activeId);
  if(!current)throw Error("No active authoring draft");
  return current;
 };
 const question=():AuthoringQuestion=>{
  const q=active().questions.find(q=>q.id===questionId);
  if(!q)throw Error("Draft question no longer exists");
  return q;
 };
 const status=(message:string,alert=false)=>{
  const el=host?.querySelector<HTMLElement>("#pd-author-status");
  if(el){el.textContent=message;el.setAttribute("role",alert?"alert":"status");}
 };
 const load=():void=>{
  try{
   const value=localStorage.getItem(AUTHORING_KEY);
   shelf=value?validateAuthoringShelf(JSON.parse(value)):defaultAuthoringShelf();
   lastSaveError="";storageBlocked=false;
  }catch(error){
   storageBlocked=true;
   // Never overwrite malformed saved data automatically.
   shelf=defaultAuthoringShelf();
   lastSaveError="Existing local drafts could not be read: "+
    (error instanceof Error?error.message:"invalid data")+
    ". Export or recover the original storage before overwriting it.";
  }
  questionId=active().questions[0]!.id;field=initialField;
  try{
   const staged=localStorage.getItem(STAGING_KEY);
   stage=staged?validateStagingWorkspace(JSON.parse(staged)):null;
   stageBlocked=false;stageError="";
  }catch(error){
   stage=null;stageBlocked=true;
   stageError="Staging storage is unreadable; its original bytes are preserved. "+
    (error instanceof Error?error.message:"Invalid staged data");
  }
 };
 const persist=():void=>{
  if(!shelf)return;
  if(storageBlocked){status("Damaged saved draft data remains untouched. Export your current draft or explicitly reset damaged storage.",true);return;}
  try{
   shelf=validateAuthoringShelf(shelf);
   localStorage.setItem(AUTHORING_KEY,JSON.stringify(shelf));
   lastSaveError="";
   status("Draft saved locally on this device · "+new Date().toLocaleTimeString());
  }catch(error){
   lastSaveError=error instanceof Error?error.message:"Local draft could not be saved";
   status("Not saved: "+lastSaveError+". Export the draft before leaving.",true);
  }
 };
 const persistStage=(next:StagingWorkspace|null):void=>{
  if(stageBlocked)throw Error("Existing staged files are unreadable. Reset damaged staging explicitly.");
  if(next){
   const validated=validateStagingWorkspace(next);
   localStorage.setItem(STAGING_KEY,JSON.stringify(validated));
   stage=validated;
  }else{
   localStorage.removeItem(STAGING_KEY);stage=null;
  }
 };
 const stageFiles=async(files:readonly File[]):Promise<void>=>{
  if(!files.length)return;
  const inputs:StagedFile[]=[];
  for(const file of files){
   if(file.size>1700000)throw Error(file.name+" is too large for a safely staged source; split the bank");
   inputs.push({name:file.name,source:JSON.parse(await file.text())});
  }
  persistStage(addStagedFiles(stage??{schema:1,files:[],selected:[]},inputs));
  stageFilter="all";
  await render();
  status("Staged "+files.length+" AI source file(s) without publishing any questions.");
 };
 const changeDraft=(fn:(draft:AuthoringDraft)=>AuthoringDraft):void=>{
  if(!shelf)return;
  const draft=active(),changed=validateAuthoringDraft({
   ...fn(draft),updatedAt:new Date().toISOString()
  });
  shelf={...shelf,drafts:shelf.drafts.map(d=>d.id===draft.id?changed:d)};
  persist();
 };
 const updateDoc=(id:string,key:Field,value:RichDocument):void=>{
  changeDraft(d=>({...d,questions:d.questions.map(q=>q.id===id?updatedField(q,key,value):q)}));
 };
 const flush=():void=>{if(session)updateDoc(questionId,field,session.getDocument());};
 const capture=():void=>{
  if(!session)return;
  const previous=session;session=null;
  try{updateDoc(questionId,field,previous.getDocument());}
  catch(error){status(error instanceof Error?error.message:"Unable to save editor",true);}
  previous.destroy();
 };
 const close=(returnFocus=true)=>{
  renderSequence++;capture();
  host?.parentElement?.classList.remove("pd-author-mode");
  host?.replaceChildren();
  if(host)host.hidden=true;
  host=null;closed=true;
  if(returnFocus&&origin?.isConnected)origin.focus({preventScroll:true});
  origin=null;
  if(returnFocus)actions.onClose?.();
 };
 const updateMetadata=(key:keyof AuthoringDraft,value:unknown)=>{
  try{changeDraft(d=>({...d,[key]:value}));}
  catch(error){status(error instanceof Error?error.message:"Invalid paper value",true);}
 };
 const updateQuestion=(key:keyof AuthoringQuestion,value:unknown)=>{
  try{changeDraft(d=>({...d,questions:d.questions.map(q=>q.id===questionId?{...q,[key]:value}:q)}));}
  catch(error){status(error instanceof Error?error.message:"Invalid question value",true);}
 };
 const exportDraft=()=>{
  capture();
  const source=JSON.stringify(active(),null,2);
  const objectUrl=URL.createObjectURL(new Blob([source],{type:"application/json"}));
  const a=document.createElement("a");
  a.href=objectUrl;a.download="Practice_Desk_Authored_Draft_"+active().id+".json";
  document.body.append(a);a.click();a.remove();
  window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
  status("Unpublished draft exported as JSON. Validate and Publish to create a scored paper.");
  void render();
 };
 const parseImage=async(file:File):Promise<ImageAsset>=>{
  if(file.size>650000)throw Error("Image exceeds draft attachment limit (650 KB). Use a smaller prepared image.");
  if(file.name.toLowerCase().endsWith(".json")){
   const value=JSON.parse(await file.text()) as Record<string,unknown>;
   if(!value||typeof value.id!=="string"||typeof value.dataUri!=="string"||
     typeof value.altText!=="string"||Object.keys(value).some(k=>!["id","dataUri","altText"].includes(k)))
     throw Error("Expected a prepared image JSON entry with id, altText and dataUri");
   const mime=value.dataUri.match(/^data:(image\/(?:png|jpeg|webp|avif|gif));base64,/);
   if(!mime)throw Error("Invalid prepared local image");
   const bytes=Uint8Array.from(atob(value.dataUri.slice(mime[0].length)),c=>c.charCodeAt(0));
   const image={id:value.id,mediaType:mime[1] as ImageAsset["mediaType"],
    dataUri:value.dataUri,contentHash:sha256(bytes),altText:value.altText} as ImageAsset;
   validateMediaInventory([],[image]);return image;
  }
  if(!["image/png","image/jpeg","image/webp","image/avif","image/gif"].includes(file.type))
   throw Error("Unsupported image format");
  const id="draft-image-"+sha256(new Uint8Array(await file.arrayBuffer())).slice(0,16);
  const uri=await new Promise<string>((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result));
   reader.onerror=()=>reject(reader.error??Error("Cannot read image"));
   reader.readAsDataURL(file);
  });
  const image:ImageAsset={id:id as AssetId,mediaType:file.type as ImageAsset["mediaType"],
   dataUri:uri,contentHash:sha256(new Uint8Array(await file.arrayBuffer())) as ContentHash,
   altText:(file.name.replace(/\.[^.]+$/,"").replace(/[_-]/g," ").trim()||"Prepared figure").slice(0,500)};
  validateMediaInventory([],[image]);return image;
 };
 const render=async():Promise<void>=>{
  if(closed||!host||!shelf)return;
  const before=host.querySelector<HTMLDetailsElement>("#pd-author-section-manager");
  if(before)sectionManagerExpanded=before.open;
  capture();
  const version=++renderSequence,container=host,d=active(),q=question();
  if(!fields(q.kind).includes(field))field=initialField;
  container.hidden=false;
  const questionOptions=d.questions.map((q,i)=>option(q.id,(i+1)+". "+q.section+
    " · "+(q.syllabusHeadingId?syllabusHeading(d.examId,q.syllabusHeadingId)?.label:
      q.subject?.trim()||UNCLASSIFIED_SUBJECT)+" · "+labels[q.kind],questionId)).join("");
  const draftOptions=draftsOptions(shelf);
  const staged=stage?inspectStagingWorkspace(stage):null;
  const shown=staged?.questions.filter(item=>stageFilter==="errors"?
    item.issues.some(i=>i.severity==="error"):
    stageFilter==="warnings"?item.issues.some(i=>i.severity==="warning"):
    stageFilter==="selected"?item.selected:stageFilter==="unselected"?!item.selected:true)??[];
  const stagePanel=stageBlocked?
    '<p class="generic-warning" role="alert">'+escapeText(stageError)+
    ' <button class="btn danger" id="pd-stage-recover">Reset unreadable staging</button></p>':
    staged?'<details class="pd-author-section-manager" open><summary>AI staging · '+
      staged.selectedCount+' of '+staged.questions.length+' selected · '+
      staged.errorCount+' errors · '+staged.warningCount+' warnings</summary>'+
      '<p class="fine">Sources are unpublished. Offline checks cannot authenticate facts, PYQs, legislation or reviewer claims. Select no more than 200 questions to correct in Wordgard.</p>'+
      '<p class="fine">Files: '+stage!.files.map(f=>escapeText(f.name)).join(', ')+
      ' · References: '+staged.sourceCount+' · Duplicate candidates: '+staged.duplicateCandidates+
      ' · Subjects: '+escapeText(staged.topicCounts.map(x=>x.label+' ('+x.count+')').join('; '))+
      ' · Kinds: '+escapeText(staged.kinds.map(x=>x.label+' ('+x.count+')').join('; '))+'</p>'+
      '<div class="row"><label>Filter<select id="pd-stage-filter">'+
       [["all","All questions"],["errors","QA errors"],["warnings","Warnings"],
        ["selected","Selected"],["unselected","Not selected"]].map(([value,label])=>option(value,label,stageFilter)).join('')+
      '</select></label><button class="btn" id="pd-stage-handoff">Edit selected in Wordgard</button>'+
      '<button class="btn" id="pd-stage-export">Export QA report</button>'+
      '<button class="btn danger" id="pd-stage-clear">Discard staging</button></div>'+
      '<div class="scroll-table" style="max-height:300px;overflow:auto"><table class="pd-author-section-table"><thead><tr>'+
      '<th>Include</th><th>Question</th><th>Flagged QA</th></tr></thead><tbody>'+
      shown.map(item=>'<tr><td><input type="checkbox" data-stage-key="'+escapeText(item.key)+'"'+
        (item.selected?' checked':'')+' aria-label="Include '+escapeText(item.key)+'"></td>'+
        '<td><b>'+escapeText(item.bankId+'/'+item.id)+'</b> · '+
        escapeText(publicationPlainText(item.question.prompt).slice(0,140))+'</td><td>'+
        (item.issues.length?item.issues.map(issue=>
          '<p class="fine">'+escapeText(issue.severity.toUpperCase()+': '+issue.code+' — '+issue.message)+'</p>').join(''):'No flagged issues')+
        '</td></tr>').join('')+'</tbody></table></div>'+
      (staged.issues.some(i=>!i.questionId)?
       '<p class="generic-warning">Section-level problems: '+
        escapeText(staged.issues.filter(i=>!i.questionId).map(i=>i.message).join('; '))+'</p>':'')+
      '</details>':'';
  container.innerHTML='<section class="panel pad pd-author-studio" aria-labelledby="pd-author-heading">'+
   '<div class="row between"><div><span class="eyebrow">QUESTION AUTHORING · LOCAL DRAFT</span>'+
   '<h2 id="pd-author-heading" tabindex="-1">Wordgard authoring studio</h2></div>'+
   '<button class="btn" id="pd-author-close">Close studio</button></div>'+
   '<p class="fine">Edit and preview here. Validate before publishing an immutable examination revision. Drafts stay local and must be separately exported; published papers and their attempts enter History backups.</p>'+
   '<div class="row"><button class="btn" id="pd-stage-add">Stage AI bank files</button>'+
   '<input type="file" multiple accept=".json,application/json" id="pd-stage-input" hidden></div>'+
   stagePanel+
   (lastSaveError?'<p class="generic-warning" role="alert">'+escapeText(lastSaveError)+'</p>':"")+
   '<div class="pd-author-top"><label>Saved draft<select id="pd-author-drafts">'+draftOptions+'</select></label>'+
   '<div class="row"><button class="btn" id="pd-author-new">New draft</button>'+
   '<button class="btn" id="pd-author-export">Export draft JSON</button>'+
   '<button class="btn" id="pd-author-import">Import draft JSON</button>'+
   (storageBlocked?'<button class="btn danger" id="pd-author-reset-corrupt">Reset damaged draft storage</button>':"")+
   '<input type="file" id="pd-author-import-file" accept=".json,application/json" hidden></div></div>'+
   '<div class="pd-author-top"><label>Question<select id="pd-author-questions">'+questionOptions+'</select></label>'+
   '<div class="row"><button class="btn" id="pd-author-add-question">Add question</button>'+
   '<button class="btn" id="pd-author-copy-question">Duplicate</button>'+
   '<button class="btn" id="pd-author-up">Move up</button>'+
   '<button class="btn" id="pd-author-down">Move down</button>'+
   '<button class="btn danger" id="pd-author-delete-question">Delete question</button></div></div>'+
   controls(d,q,field)+sectionManager(d,sectionManagerExpanded)+
   toolbar()+
   '<div id="pd-author-editor" class="pd-author-editor" role="group" aria-label="Edit '+escapeText(fieldNames[field])+'"></div>'+
   '<div class="pd-author-insert"><fieldset><legend>Insert equation</legend>'+
   '<label>LaTeX<input id="pd-author-tex" placeholder="\\frac{a}{b}" maxlength="2048"></label>'+
   '<label>Accessible spoken/text description<input id="pd-author-math-alt" maxlength="500" placeholder="a divided by b"></label>'+
   '<label class="pd-author-check"><input type="checkbox" id="pd-author-display-math"> Display equation as a separate block</label>'+
   '<div class="pd-author-math-live" id="pd-author-math-live" role="status">Enter LaTeX above to see its actual mathematical typesetting.</div>'+
   '<button class="btn" id="pd-author-math-insert">Insert maths</button></fieldset>'+
   '<fieldset><legend>Local verified figures</legend>'+
   '<p class="fine">Use a small prepared PNG/WebP or a JSON entry from Prepare image for a bank. Original image bytes are never recompressed here.</p>'+
   '<input type="file" id="pd-author-image-file" accept=".json,image/png,image/jpeg,image/webp,image/avif,image/gif">'+
   '<label>Available figure<select id="pd-author-assets">'+
    '<option value="">Choose verified image</option>'+d.assets.map(a=>option(a.id,a.id+" · "+(a.altText??""),"")).join("")+
   '</select></label><label>Figure description (required)<input id="pd-author-image-alt" maxlength="500" placeholder="Describe the figure for screen readers"></label>'+
   '<button class="btn" id="pd-author-insert-image">Insert figure at cursor</button></fieldset></div>'+
   '<div class="pd-author-actions row"><button class="btn" id="pd-author-preview-toggle">Preview question</button>'+
   '<button class="btn primary" id="pd-author-save">Save draft</button>'+
   '<button class="btn" id="pd-author-validate">Validate paper</button>'+
   '<button class="btn primary" id="pd-author-publish">Publish to Library</button></div>'+
   '<label class="pd-author-publish-consent"><input type="checkbox" id="pd-author-confirm"> I have checked the answer key, source notes and exam rules; this paper is user-authored, not officially certified.</label>'+
   (d.id.startsWith("stage:")?'<label class="pd-author-publish-consent"><input type="checkbox" id="pd-author-accept-warnings"> I explicitly accept remaining QA warnings for this selected draft; no external source was independently checked.</label>':'')+
   '<div id="pd-author-validation" class="pd-author-validation" hidden aria-live="polite"></div>'+
   '<p class="fine" id="pd-author-status" role="status">Editing locally; changes are saved automatically.</p>'+
   '<div id="pd-author-preview" class="pd-author-preview" hidden></div></section>';
  const find=<T extends HTMLElement>(id:string)=>container.querySelector<T>("#"+id)!;
  const click=(id:string,handler:()=>void)=>{find<HTMLButtonElement>(id).onclick=handler;};
  click("pd-author-close",()=>close());
  click("pd-author-save",()=>{capture();persist();void render();});

  const validationBox=find<HTMLElement>("pd-author-validation");
  const showIssues=(issues:readonly PublicationIssue[]):void=>{
   validationBox.hidden=false;
   if(!issues.length){
    validationBox.innerHTML='<h3>Ready to publish</h3><p>The exact immutable paper, key, timing, response controls, assets and marking rules have been compiled and validated. Check confirmation before publishing.</p>';
    status("Validation passed for "+active().questions.length+" questions.");
    return;
   }
   validationBox.innerHTML='<h3>Fix '+issues.length+' publication issue'+(issues.length===1?"":"s")+'</h3><ol>'+
    issues.map(issue=>'<li>'+escapeText(issue.field+": "+issue.reason)+
      (issue.questionId?'<button type="button" class="textlink" data-author-issue="'+escapeText(issue.questionId)+'">Edit question</button>':"")+
      '</li>').join("")+'</ol>';
   validationBox.querySelectorAll<HTMLButtonElement>("[data-author-issue]").forEach(btn=>{
    btn.onclick=()=>{
     const id=btn.dataset.authorIssue;
     if(id&&active().questions.some(q=>q.id===id)){
      capture();questionId=id;field="prompt";void render();
     }
    };
   });
   status("Publication blocked: "+issues.length+" issues need attention.",true);
  };
  click("pd-author-validate",()=>{
   try{
    flush();
    const report=inspectAuthoringPublication(active(),actions.existing());
    showIssues(report.issues);
    validationBox.scrollIntoView({block:"nearest"});
   }catch(error){status(error instanceof Error?error.message:"Unable to validate draft",true);}
  });
  click("pd-author-publish",()=>{void(async()=>{
   if(publishing)return;
   publishing=true;
   const button=find<HTMLButtonElement>("pd-author-publish");
   button.disabled=true;
   try{
    flush();
    if(storageBlocked||lastSaveError)throw Error("Draft storage is unsafe; export your draft and repair local storage before publishing.");
    const report=inspectAuthoringPublication(active(),actions.existing());
    showIssues(report.issues);
    if(!report.valid){validationBox.scrollIntoView({block:"nearest"});return;}
    if(!find<HTMLInputElement>("pd-author-confirm").checked)
      throw Error("Confirm your source, answer keys and marking rules before publishing.");
    const packageValue=report.compiled;
    if(!packageValue)throw Error("Authoritative validation did not return the compiled publication");
    await actions.publish(packageValue);
    // The integrated Library owner refreshes the screen only after a
    // successfully committed package; do not change anything here afterwards.
   }catch(error){
    if(error instanceof PublicationValidationError)showIssues(error.issues);
    else status(error instanceof Error?error.message:"Publishing failed",true);
   }finally{
    publishing=false;
    if(button.isConnected)button.disabled=false;
   }
  })();});

  click("pd-author-export",exportDraft);
  click("pd-author-preview-toggle",()=>{
   try{
    capture();const dest=find<HTMLElement>("pd-author-preview");
    dest.innerHTML=preview(active(),question(),actions.existing());dest.hidden=false;
    dest.scrollIntoView({block:"nearest"});
    // The editing session is remounted so preview never hijacks editable DOM.
    void render().then(()=>{
     const box=host?.querySelector<HTMLElement>("#pd-author-preview");
     if(box){box.innerHTML=preview(active(),question(),actions.existing());box.hidden=false;}
    });
   }catch(error){status(error instanceof Error?error.message:"Cannot preview document",true);}
  });
  click("pd-author-new",()=>{
   if(!shelf)return;
   if(shelf.drafts.length>=20){status("Maximum of 20 draft papers. Export an older draft first.",true);return;}
   capture();const draft=newAuthoringDraft();
   shelf={schema:1,activeId:draft.id,drafts:[...shelf.drafts,draft]};
   questionId=draft.questions[0]!.id;field=initialField;persist();void render();
  });
  find<HTMLSelectElement>("pd-author-drafts").onchange=e=>{
   capture();shelf={...shelf!,activeId:(e.target as HTMLSelectElement).value};
   questionId=active().questions[0]!.id;field=initialField;persist();void render();
  };
  click("pd-author-import",()=>find<HTMLInputElement>("pd-author-import-file").click());
  if(storageBlocked)click("pd-author-reset-corrupt",()=>{
   if(!confirm("Replace unreadable local authoring data? Export your current draft first. This action cannot be undone."))return;
   storageBlocked=false;lastSaveError="";persist();void render();
  });
  find<HTMLInputElement>("pd-author-import-file").onchange=async e=>{
   const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
   try{
    if(file.size>AUTHORING_MAX_BYTES)throw Error("Draft file too large");
    const imported=validateAuthoringDraft(JSON.parse(await file.text()));
    if(!shelf)throw Error("No draft shelf");
    if(shelf.drafts.some(d=>d.id===imported.id))
     throw Error("Draft ID already exists. Export or change the source draft ID before importing.");
    capture();
    shelf=validateAuthoringShelf({schema:1,activeId:imported.id,drafts:[...shelf.drafts,imported]});
    questionId=imported.questions[0]!.id;field=initialField;persist();void render();
   }catch(error){status(error instanceof Error?error.message:"Cannot import draft",true);}
  };
  const metadata=[
   ["pd-author-title","title"],["pd-author-exam","examId"],["pd-author-paper","paperId"],
   ["pd-author-edition","edition"],["pd-author-revision","revision"],
   ["pd-author-duration","durationMinutes"],["pd-author-timing-kind","timingKind"],
   ["pd-author-pause","pausePolicy"],["pd-author-question-nav","questionNavigation"],
   ["pd-author-section-nav","sectionNavigation"],
   ["pd-author-section-transition","sectionTransition"],
   ["pd-author-correct","marksCorrect"],["pd-author-wrong","marksIncorrect"]
  ] as const;
  for(const [id,key] of metadata)find<HTMLInputElement|HTMLSelectElement>(id).onchange=e=>{
   const input=e.target as HTMLInputElement;
   const value=["revision","durationMinutes","marksCorrect","marksIncorrect"].includes(key)?
    Number(input.value):input.value;
   if(key==="timingKind"&&value==="sectional"){
     changeDraft(d=>({...d,timingKind:"sectional",sectionNavigation:"sequential-locked"}));
     void render();
   }else updateMetadata(key,value);
   if(key==="examId")refreshOfficialHeadingChoices();
  };
  for(const [id,key] of [["pd-author-early-submit","allowEarlySubmit"],
    ["pd-author-allow-review","allowReview"]] as const)
    find<HTMLInputElement>(id).onchange=e=>
      updateMetadata(key,(e.target as HTMLInputElement).checked);
  const tolerance=find<HTMLInputElement>("pd-author-tolerance");
  if(tolerance)tolerance.onchange=e=>updateQuestion("tolerance",Number((e.target as HTMLInputElement).value));
  const refreshOfficialHeadingChoices=()=>{
   const select=find<HTMLSelectElement>("pd-author-syllabus-heading");
   const catalogue=syllabusForExam(active().examId);
   const selected=question().syllabusHeadingId??"";
   select.innerHTML=option("",catalogue?"Custom subject / Unclassified":"No official catalogue for this exam",selected)+
     (catalogue?.headings??[]).map(h=>option(h.id,h.label,selected)).join("");
   select.disabled=!catalogue;
  };
  const refreshSubjectSummary=()=>{
   const q=question();
   const value=q.syllabusHeadingId?
     syllabusHeading(active().examId,q.syllabusHeadingId)?.label??"Unknown heading":
     q.subject?.trim()||UNCLASSIFIED_SUBJECT;
   const line=container.querySelector<HTMLElement>(".pd-author-taxonomy-summary");
   if(line)line.textContent="Classification: "+value+
     ". Section timers and subjects are independent; no classification is inferred.";
  };
  // Timed examination sections and syllabus subjects are unrelated dimensions.
  find<HTMLInputElement>("pd-author-subject").onchange=e=>{
   const subject=(e.target as HTMLInputElement).value;
   const heading=container.querySelector<HTMLSelectElement>("#pd-author-syllabus-heading");
   if(subject.trim()&&heading)heading.value="";
   try{changeDraft(d=>({...d,questions:d.questions.map(q=>q.id===questionId?
     {...q,subject,syllabusHeadingId:subject.trim()?"":q.syllabusHeadingId??""}:q)}));}
   catch(error){status(error instanceof Error?error.message:"Invalid subject",true);}
   refreshSubjectSummary();
  };
  const heading=container.querySelector<HTMLSelectElement>("#pd-author-syllabus-heading");
  if(heading)heading.onchange=e=>{
   const id=(e.target as HTMLSelectElement).value;
   const subject=find<HTMLInputElement>("pd-author-subject");
   if(id)subject.value="";
   try{changeDraft(d=>({...d,questions:d.questions.map(q=>q.id===questionId?
     {...q,syllabusHeadingId:id,subject:id?"":q.subject??""}:q)}));}
   catch(error){status(error instanceof Error?error.message:"Invalid heading",true);}
   refreshSubjectSummary();
  };
  // A question's actual exam-section assignment is independent of subject.
  // Reuse the target section's single timer, rather than introducing a
  // per-question discrepancy when an existing section is selected.
  find<HTMLInputElement>("pd-author-section").onchange=e=>{
   try{
    const title=(e.target as HTMLInputElement).value;
    changeDraft(d=>assignAuthoringQuestionSection(d,questionId,title));
    void render();
   }catch(error){status(error instanceof Error?error.message:"Invalid exam section",true);}
  };
  for(const [id,key] of [["pd-author-answer","answer"],
   ["pd-author-source","source"],["pd-author-topic","topic"],
   ["pd-author-subtopic","subtopic"],["pd-author-difficulty","difficulty"]] as const){
   find<HTMLInputElement>(id).onchange=e=>updateQuestion(key,(e.target as HTMLInputElement).value);
  }
  const changeSectionTimer=(title:string,minutes:number)=>{
   try{
    changeDraft(d=>setAuthoringSectionMinutes(d,title,minutes));
    // No remount is needed to reflect one section-wide changed value:
    // keep active Wordgard cursor/IME and any unrelated source edits.
    for(const field of container.querySelectorAll<HTMLInputElement>("[data-author-section-timer]"))
     if(field.dataset.authorSectionTimer===title)field.value=String(minutes);
    if(question().section===title)
     find<HTMLInputElement>("pd-author-section-minutes").value=String(minutes);
    if(storageBlocked||lastSaveError)
     status("Section updated in memory but NOT saved: "+(lastSaveError||"damaged local draft storage")+
      ". Export a recovery copy before closing.",true);
    else status("Set section "+title+" to "+minutes+" minutes across every assigned question.");
   }catch(error){status(error instanceof Error?error.message:"Invalid section timer",true);}
  };
  const commitSectionTimer=(title:string,input:HTMLInputElement)=>{
   if(!input.value.trim()){
    input.setAttribute("aria-invalid","true");
    status("Enter a section duration explicitly. Use 0 only when you intend an untimed section.",true);
    return;
   }
   const parsed=Number(input.value);
   if(!Number.isSafeInteger(parsed)||parsed<0||parsed>600){
    input.setAttribute("aria-invalid","true");
    status("Section duration must be a whole number from 0 to 600.",true);
    return;
   }
   input.removeAttribute("aria-invalid");
   changeSectionTimer(title,parsed);
  };
  find<HTMLInputElement>("pd-author-section-minutes").onchange=e=>
   commitSectionTimer(question().section,e.target as HTMLInputElement);
  container.querySelectorAll<HTMLInputElement>("[data-author-section-timer]").forEach(input=>{
   input.onchange=()=>commitSectionTimer(input.dataset.authorSectionTimer??"",input);
  });
  for(const [id,key] of [["pd-author-min-choices","minSelections"],["pd-author-max-choices","maxSelections"],
    ["pd-author-partial-credit","partialCreditEach"],
    ["pd-author-partial-penalty","partialPenaltyEach"]] as const){
    const input=container.querySelector<HTMLInputElement>("#"+id);
    if(input)input.onchange=e=>updateQuestion(key,Number((e.target as HTMLInputElement).value));
  }
  find<HTMLSelectElement>("pd-author-kind").onchange=e=>{
   updateQuestion("kind",(e.target as HTMLSelectElement).value as QuestionKind);
   field=initialField;void render();
  };
  find<HTMLSelectElement>("pd-author-questions").onchange=e=>{
   capture();questionId=(e.target as HTMLSelectElement).value;field=initialField;void render();
  };
  find<HTMLSelectElement>("pd-author-field").onchange=e=>{
   capture();field=(e.target as HTMLSelectElement).value as Field;void render();
  };
  click("pd-author-add-question",()=>{
   capture();const current=question(),freshBase=newAuthoringQuestion();
   // Default new questions to the current *physical* section and its timer.
   // Otherwise a new question in an existing section silently re-introduces
   // conflicting per-question duration values.
   const inherited=authoringSections(active()).find(s=>s.name===current.section);
   const fresh={...freshBase,section:current.section,
     sectionMinutes:inherited?.minutes??current.sectionMinutes??15};
   changeDraft(d=>({...d,questions:[...d.questions,fresh]}));
   questionId=fresh.id;field=initialField;void render();
  });
  click("pd-author-copy-question",()=>{
   capture();const source=question(),fresh=newAuthoringQuestion(source.kind);
   const clone={...structuredClone(source),id:fresh.id};
   changeDraft(d=>({...d,questions:[...d.questions,clone]}));
   questionId=clone.id;field=initialField;void render();
  });
  click("pd-author-delete-question",()=>{
   if(active().questions.length===1){status("Keep at least one question in the draft.",true);return;}
   if(!confirm("Delete this unpublished draft question?"))return;
   capture();changeDraft(d=>({...d,questions:d.questions.filter(q=>q.id!==questionId)}));
   questionId=active().questions[0]!.id;field=initialField;void render();
  });
  const move=(offset:number)=>{
   const list=active().questions,from=list.findIndex(q=>q.id===questionId),to=from+offset;
   if(from<0||to<0||to>=list.length)return;
   capture();const reordered=[...list];[reordered[from],reordered[to]]=[reordered[to]!,reordered[from]!];
   changeDraft(d=>({...d,questions:reordered}));void render();
  };
  click("pd-author-up",()=>move(-1));click("pd-author-down",()=>move(1));
  for(const button of container.querySelectorAll<HTMLButtonElement>("[data-author-command]")){
   button.onmousedown=e=>e.preventDefault();
   button.onclick=()=>{
    try{
     const action=button.dataset.authorCommand as AuthoringEditCommand["type"];
     if(session?.execute({type:action} as AuthoringEditCommand))status("Formatting updated.");
     else status("The selected formatting is not available at this cursor position.");
    }catch(error){status(error instanceof Error?error.message:"Editing command failed",true);}
   };
  }
  click("pd-author-add-table",()=>{
   try{
    if(!session?.execute({type:"insert-table",rows:2,columns:3}))
     throw Error("Unable to add table");
    status("2 × 3 editable table inserted. Use Tab to move between cells.");
   }catch(error){status(error instanceof Error?error.message:"Table insertion failed",true);}
  });
  const showMathPreview=()=>{
   const tex=find<HTMLInputElement>("pd-author-tex").value;
   const el=find<HTMLElement>("pd-author-math-live");
   if(!tex.trim()){el.textContent="Enter LaTeX above to see its actual mathematical typesetting.";return;}
   el.innerHTML=mathRenderer.render({tex,linearText:
    find<HTMLInputElement>("pd-author-math-alt").value||"Mathematical preview",
    displayMode:find<HTMLInputElement>("pd-author-display-math").checked}).html;
  };
  find<HTMLInputElement>("pd-author-tex").oninput=showMathPreview;
  find<HTMLInputElement>("pd-author-math-alt").oninput=showMathPreview;
  find<HTMLInputElement>("pd-author-display-math").onchange=showMathPreview;
  click("pd-author-math-insert",()=>{
   try{
    const tex=find<HTMLInputElement>("pd-author-tex").value;
    const linearText=find<HTMLInputElement>("pd-author-math-alt").value;
    const display=find<HTMLInputElement>("pd-author-display-math").checked;
    if(!session?.execute({type:"insert-math",tex,linearText,display}))
     throw Error("Math insertion did not apply");
    status("Explicit mathematical expression inserted; accessible description retained.");
   }catch(error){status(error instanceof Error?error.message:"Math insertion failed",true);}
  });
  find<HTMLInputElement>("pd-author-image-file").onchange=async e=>{
   const file=(e.target as HTMLInputElement).files?.[0];if(!file)return;
   try{
    const image=await parseImage(file);
    if(!host||closed)return;
    if(active().assets.some(a=>a.id===image.id))throw Error("Image ID already exists in this draft");
    capture();changeDraft(d=>({...d,assets:[...d.assets,image]}));
    void render();
   }catch(error){status(error instanceof Error?error.message:"Cannot add image",true);}
  };
  find<HTMLSelectElement>("pd-author-assets").onchange=e=>{
   const a=active().assets.find(a=>a.id===(e.target as HTMLSelectElement).value);
   find<HTMLInputElement>("pd-author-image-alt").value=a?.altText??"";
  };
  click("pd-author-insert-image",()=>{
   try{
    const id=find<HTMLSelectElement>("pd-author-assets").value;
    const a=active().assets.find(a=>a.id===id);
    if(!a)throw Error("Choose a verified local figure");
    const altText=find<HTMLInputElement>("pd-author-image-alt").value.trim();
    if(!altText)throw Error("Enter a descriptive text alternative for this figure");
    if(!session?.execute({type:"insert-image",assetId:a.id,altText}))
     throw Error("Cannot insert image");
    status("Verified local image reference added. Image data is not duplicated per question.");
   }catch(error){status(error instanceof Error?error.message:"Image insertion failed",true);}
  });
  try{
   const known=new Set(d.assets.map(a=>a.id));
   const editor=await wordgardEditorPort.mount(find<HTMLElement>("pd-author-editor"),
    fieldOf(q,field),(value)=>{
     if(closed||!host||version!==renderSequence)return;
     try{updateDoc(q.id,field,value);}
     catch(error){status(error instanceof Error?error.message:"Draft update failed",true);}
    },known);
   if(closed||!host||version!==renderSequence){editor.destroy();return;}
   session=editor;
  }catch(error){status(error instanceof Error?error.message:"Wordgard could not initialize",true);}
 };
 return {
  async open(target,trigger){
   if(!closed)return;
   host=target;origin=trigger;closed=false;
   target.parentElement?.classList.add("pd-author-mode");
   load();await render();
   host?.scrollIntoView({block:"start",behavior:"instant"});
   host?.querySelector<HTMLElement>("#pd-author-heading")?.focus({preventScroll:true});
  },
  async stageFiles(files){await stageFiles(files);},
  beforeRender(){if(!closed)close(false);},
  isOpen(){return !closed;},
  dispose(){close(false);}
 };
}
function draftsOptions(shelf:AuthoringDraftShelf):string{
 return shelf.drafts.map(d=>option(d.id,d.title+" ("+d.questions.length+" question"+(d.questions.length===1?"":"s")+")",shelf.activeId)).join("");
}
