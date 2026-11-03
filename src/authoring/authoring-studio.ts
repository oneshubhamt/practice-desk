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
import {richDocumentHTML} from "../app/rich-content-view.ts";
import {escapeText} from "../app/html-escape.ts";
import {wordgardEditorPort} from "./wordgard-adapter.ts";
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
 const kinds=QUESTION_KINDS.map(k=>option(k,labels[k],current.kind)).join("");
 return '<details class="pd-author-paper-settings"><summary>Paper settings · '+escapeText(draft.title)+'</summary><div class="pd-author-meta">'+
  '<label>Paper title<input id="pd-author-title" maxlength="180" value="'+escapeText(draft.title)+'"></label>'+
  '<label>Exam family ID<input id="pd-author-exam" maxlength="80" value="'+escapeText(draft.examId)+'"></label>'+
  '<label>Paper ID<input id="pd-author-paper" maxlength="80" value="'+escapeText(draft.paperId)+'"></label>'+
  '<label>Edition<select id="pd-author-edition">'+
  ([["custom","Custom"],["source","Source transcription"],["reviewed","Reviewed & corrected"]] as const)
    .map(([a,b])=>option(a,b,draft.edition)).join("")+'</select></label>'+
  '<label>Revision<input id="pd-author-revision" type="number" min="1" max="1000000" value="'+draft.revision+'"></label>'+
  '<label>Duration (minutes; 0 = untimed)<input id="pd-author-duration" type="number" min="0" max="600" value="'+draft.durationMinutes+'"></label>'+
  '<label>Correct marks<input id="pd-author-correct" type="number" step="any" value="'+draft.marksCorrect+'"></label>'+
  '<label>Incorrect marks<input id="pd-author-wrong" type="number" max="0" step="any" value="'+draft.marksIncorrect+'"></label>'+
  '</div></details><div class="pd-author-meta">'+
  '<label>Question kind<select id="pd-author-kind">'+kinds+'</select></label>'+
  '<label>Section / topic group<input id="pd-author-section" maxlength="100" value="'+escapeText(current.section)+'"></label>'+
  '<label>Answer key draft<input id="pd-author-answer" maxlength="100" value="'+escapeText(current.answer)+'" aria-describedby="pd-author-answer-help"></label>'+
  '<label>Source / provenance note<input id="pd-author-source" maxlength="500" value="'+escapeText(current.source)+'"></label>'+
  '</div><p class="fine" id="pd-author-answer-help">Draft answer only. Key and scoring are not published or used by tests. For matching, record pair mappings; for free response, record the marking reference.</p>'+
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
function preview(draft:AuthoringDraft,q:AuthoringQuestion):string{
 const known=new Set(draft.assets.map(a=>a.id));
 const image=(id:string,alt:string)=>{
  const found=draft.assets.find(a=>a.id===id);
  if(!found)throw Error("Preview image missing");
  return '<img src="'+escapeText(found.dataUri)+'" alt="'+escapeText(alt)+'" loading="lazy">';
 };
 const rich=(doc:RichDocument)=>richDocumentHTML(doc,known,image);
 const out=['<div class="pd-author-preview-content"><h3>Read-only exam-style preview</h3>',
  '<p class="fine">Preview only · no scoring, timer or published paper</p>',
  rich(q.passage),rich(q.prompt)];
 if(q.kind==="single-choice"||q.kind==="multiple-select"){
  out.push('<fieldset disabled><legend>Answer choices</legend>');
  for(let i=0;i<4;i++)out.push('<label class="pd-author-preview-choice"><input type="'+
   (q.kind==="single-choice"?"radio":"checkbox")+'" disabled>'+
   '<span>'+letters[i]+' · '+rich(q.options[i]!)+'</span></label>');
  out.push("</fieldset>");
 }else if(q.kind==="matching"){
  out.push("<h4>Match the following</h4><div class=\"pd-author-match-preview\">");
  for(let i=0;i<4;i++)out.push('<div>'+rich(q.leftItems[i]!)+
   ' — '+rich(q.rightItems[i]!)+'</div>');
  out.push("</div>");
 }else out.push('<p class="fine">Response type: '+escapeText(labels[q.kind])+'</p>');
 out.push('<details class="pd-author-worked"><summary>Author-only worked explanation</summary>'+
  rich(q.explanation)+'</details></div>');
 return out.join("");
}
export interface AuthoringStudioController{
 open(host:HTMLElement,trigger:HTMLElement):Promise<void>;
 beforeRender():void;
 dispose():void;
}
export function createQuestionAuthoringStudio():AuthoringStudioController{
 let host:HTMLElement|null=null,origin:HTMLElement|null=null,session:EditorSession|null=null;
 let shelf:AuthoringDraftShelf|null=null,questionId="",field:Field=initialField;
 let closed=true,renderSequence=0,lastSaveError="",storageBlocked=false;
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
  status("Draft exported as JSON. Publishing into exams remains a separate P47-5D validation step.");
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
  capture();
  const version=++renderSequence,container=host,d=active(),q=question();
  if(!fields(q.kind).includes(field))field=initialField;
  container.hidden=false;
  const questionOptions=d.questions.map((q,i)=>option(q.id,(i+1)+". "+q.section+" · "+labels[q.kind],questionId)).join("");
  const draftOptions=draftsOptions(shelf);
  container.innerHTML='<section class="panel pad pd-author-studio" aria-labelledby="pd-author-heading">'+
   '<div class="row between"><div><span class="eyebrow">QUESTION AUTHORING · LOCAL DRAFT</span>'+
   '<h2 id="pd-author-heading" tabindex="-1">Wordgard authoring studio</h2></div>'+
   '<button class="btn" id="pd-author-close">Close studio</button></div>'+
   '<p class="fine">All editing is in this Library. Only validated Practice Desk documents are saved; Wordgard internals never become exam content. This draft is local to this browser and is <strong>not in History backups</strong> until publication support in P47-5D.</p>'+
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
   controls(d,q,field)+
   toolbar()+
   '<div id="pd-author-editor" class="pd-author-editor" role="group" aria-label="Edit '+escapeText(fieldNames[field])+'"></div>'+
   '<div class="pd-author-insert"><fieldset><legend>Insert equation</legend>'+
   '<label>LaTeX<input id="pd-author-tex" placeholder="\\frac{a}{b}" maxlength="2048"></label>'+
   '<label>Accessible spoken/text description<input id="pd-author-math-alt" maxlength="500" placeholder="a divided by b"></label>'+
   '<label class="pd-author-check"><input type="checkbox" id="pd-author-display-math"> Display equation as a separate block</label>'+
   '<button class="btn" id="pd-author-math-insert">Insert maths</button></fieldset>'+
   '<fieldset><legend>Local verified figures</legend>'+
   '<p class="fine">Use a small prepared PNG/WebP or a JSON entry from Prepare image for a bank. Original image bytes are never recompressed here.</p>'+
   '<input type="file" id="pd-author-image-file" accept=".json,image/png,image/jpeg,image/webp,image/avif,image/gif">'+
   '<label>Available figure<select id="pd-author-assets">'+
    '<option value="">Choose verified image</option>'+d.assets.map(a=>option(a.id,a.id+" · "+(a.altText??""),"")).join("")+
   '</select></label><button class="btn" id="pd-author-insert-image">Insert figure at cursor</button></fieldset></div>'+
   '<div class="pd-author-actions row"><button class="btn" id="pd-author-preview-toggle">Preview question</button>'+
   '<button class="btn primary" id="pd-author-save">Save draft</button>'+
   '<button class="btn" id="pd-author-publish" disabled title="Publication requires P47-5D validation">Publish (P47-5D)</button></div>'+
   '<p class="fine" id="pd-author-status" role="status">Editing locally; changes are saved automatically.</p>'+
   '<div id="pd-author-preview" class="pd-author-preview" hidden></div></section>';
  const find=<T extends HTMLElement>(id:string)=>container.querySelector<T>("#"+id)!;
  const click=(id:string,handler:()=>void)=>{find<HTMLButtonElement>(id).onclick=handler;};
  click("pd-author-close",()=>close());
  click("pd-author-save",()=>{capture();persist();void render();});
  click("pd-author-export",exportDraft);
  click("pd-author-preview-toggle",()=>{
   try{
    capture();const dest=find<HTMLElement>("pd-author-preview");
    dest.innerHTML=preview(active(),question());dest.hidden=false;
    dest.scrollIntoView({block:"nearest"});
    // The editing session is remounted so preview never hijacks editable DOM.
    void render().then(()=>{
     const box=host?.querySelector<HTMLElement>("#pd-author-preview");
     if(box){box.innerHTML=preview(active(),question());box.hidden=false;}
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
   ["pd-author-duration","durationMinutes"],["pd-author-correct","marksCorrect"],
   ["pd-author-wrong","marksIncorrect"]
  ] as const;
  for(const [id,key] of metadata)find<HTMLInputElement|HTMLSelectElement>(id).onchange=e=>{
   const input=e.target as HTMLInputElement;
   const value=["revision","durationMinutes","marksCorrect","marksIncorrect"].includes(key)?
    Number(input.value):input.value;
   updateMetadata(key,value);
  };
  for(const [id,key] of [["pd-author-section","section"],["pd-author-answer","answer"],
   ["pd-author-source","source"]] as const){
   find<HTMLInputElement>(id).onchange=e=>updateQuestion(key,(e.target as HTMLInputElement).value);
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
   capture();const fresh=newAuthoringQuestion();
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
  click("pd-author-insert-image",()=>{
   try{
    const id=find<HTMLSelectElement>("pd-author-assets").value;
    const a=active().assets.find(a=>a.id===id);
    if(!a)throw Error("Choose a verified local figure");
    if(!session?.execute({type:"insert-image",assetId:a.id,altText:a.altText??"Prepared figure"}))
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
  beforeRender(){if(!closed)close(false);},
  dispose(){close(false);}
 };
}
function draftsOptions(shelf:AuthoringDraftShelf):string{
 return shelf.drafts.map(d=>option(d.id,d.title+" ("+d.questions.length+" questions)",shelf.activeId)).join("");
}
