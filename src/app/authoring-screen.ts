import {escapeText} from "./html-escape.ts";
import {resolvePracticeMode} from "./exam-package.ts";
import {validateExamPackage} from "../domain/exam-package.ts";
import {paperEditionLabel,paperIdentifierLabel} from "./editorial-labels.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {AuthoringScreenControllerContext} from "./coordinator-context.ts";
import {downloadText} from "./download-file.ts";

function packageRows(owner:AuthoringScreenControllerContext):string{
  const rows=[...owner.packages.values()].sort((a,b)=>
    a.examId.localeCompare(b.examId)||a.paper.paperId.localeCompare(b.paper.paperId)||
    b.paper.revision-a.paper.revision);
  if(!rows.length)return '<p class="empty-state">No published paper editions are available yet.</p>';
  return '<div class="authoring-bank-list">'+rows.map(pkg=>{
    const family=owner.families().find(f=>f.papers.some(p=>p.paper.id===pkg.paper.id));
    const included=Boolean(family?.includedPaperIds.includes(pkg.paper.id));
    const origin=included?"Repository catalog":"User / imported";
    const title=pkg.title.trim()&&!pkg.title.startsWith("authored:")?
      pkg.title:(family?.title?family.title+" — "+paperIdentifierLabel(pkg.paper.paperId):paperIdentifierLabel(pkg.paper.paperId));
    return '<article class="authoring-bank-row">'+
      '<div class="authoring-bank-main"><div class="authoring-bank-title"><strong>'+escapeText(title)+'</strong>'+
      '<span class="authoring-bank-badge">'+escapeText(paperEditionLabel(pkg.paper))+'</span></div>'+
      '<p class="fine">'+escapeText(origin)+' · '+pkg.questions.length+' question'+(pkg.questions.length===1?"":"s")+
      ' · '+pkg.paper.sections.length+' section'+(pkg.paper.sections.length===1?"":"s")+'</p>'+
      '<details class="authoring-technical"><summary>Technical identity</summary><code>'+escapeText(pkg.paper.id)+
      '</code></details></div>'+
      '<div class="row authoring-bank-actions">'+
      '<button type="button" class="btn quiet" data-authoring-export-paper="'+escapeText(pkg.paper.id)+'">Export package</button>'+
      '<button type="button" class="btn quiet" data-authoring-open-paper="'+escapeText(pkg.paper.id)+'">Open in library →</button>'+
      '</div></article>';
  }).join("")+'</div>';
}

export function renderAuthoringScreenHTML(owner:AuthoringScreenControllerContext):string{
  return '<div class="generic-heading page-heading authoring-heading"><div>'+
    '<span class="eyebrow">CONTENT WORKSPACE</span><h1>Authoring</h1>'+
    '<p class="muted">Add, review and publish exam content without mixing content management with practice.</p></div>'+
    '<nav class="row workspace-nav" aria-label="Practice Desk sections">'+
    '<button class="btn quiet" id="authoring-learning">Learning desk</button>'+
    '<button class="btn quiet" id="authoring-calendar">Calendar</button>'+
    '<button class="btn quiet" id="authoring-history">History & insights</button>'+
    '<button class="btn quiet" id="authoring-library">← Test library</button></nav></div>'+
    (owner.warning?'<p class="generic-warning" role="status">'+escapeText(owner.warning)+'</p>':"")+
    '<div class="authoring-hub-grid">'+
    '<section class="panel pad authoring-add"><span class="eyebrow">ADD CONTENT</span><h2>Bring content into Practice Desk</h2>'+
    '<p class="fine">Use one canonical content lifecycle: import or prepare a source, author/review it, publish an immutable edition, then practise it from the Library.</p>'+
    '<div class="authoring-action-grid">'+
    '<button class="btn primary" id="authoring-import"'+
      (owner.loading||owner.fallbackConflict||owner.storageFault?' disabled':'')+'><strong>Import exam package</strong><small>Validate and add a finished <code>practice-desk-exam</code> package.</small></button>'+
    '<button class="btn" id="authoring-image-prep"><strong>Prepare source image</strong><small>Review a local image before adding it to authored content.</small></button>'+
    '<button class="btn" id="authoring-open-studio"'+(owner.loading?' disabled':'')+'><strong>Author question bank</strong><small>Open the canonical staging, review and publication workspace.</small></button>'+
    '</div><input type="file" id="authoring-import-file" accept=".json,application/json" hidden>'+
    '<p class="fine">A <code>practice-desk-authoring</code> file is staged for review and is never silently published. Answers and solutions remain governed by the normal candidate-review rules after publication.</p>'+
    '</section>'+
    '<section class="panel pad authoring-ai"><span class="eyebrow">AI-ASSISTED AUTHORING</span><h2>Use the evidence-aware workflow</h2>'+
    '<div class="authoring-ai-path"><strong>New / first batch</strong>'+
    '<p class="fine">Generate a standard Authoring Brief from a self-contained blueprint in Learning Desk. Optional learner focus can add bounded, exam-only evidence without exposing unrestricted History.</p></div>'+
    '<div class="authoring-ai-path"><strong>Continuation of an existing bank</strong>'+
    '<p class="fine">Use the coverage-aware corpus CLI so existing coverage and duplicate context are measured from the authored source. Bring the resulting authoring source here for staging and review; Practice Desk does not maintain a second browser-only continuation engine.</p></div>'+
    '<button type="button" class="btn primary" id="authoring-learning-focus">Open Authoring Brief tools →</button>'+
    '</section></div>'+
    '<section class="panel pad authoring-banks"><div class="row between"><div><span class="eyebrow">PUBLISHED CONTENT</span>'+
    '<h2>Question banks & paper editions</h2><p class="fine">Published editions are immutable. Open one in Library to practise it; unpublished drafts remain in the authoring workspace.</p></div>'+
    '<span class="authoring-bank-count">'+owner.packages.size+' edition'+(owner.packages.size===1?"":"s")+'</span></div>'+
    packageRows(owner)+'</section>'+
    '<div id="pd-authoring-container" class="pd-authoring-container" hidden></div>';
}

export function bindAuthoringScreen(owner:AuthoringScreenControllerContext):void{
  owner.root.querySelector<HTMLButtonElement>("#authoring-library")!.onclick=()=>owner.go({screen:"library"});
  owner.root.querySelector<HTMLButtonElement>("#authoring-learning")!.onclick=()=>owner.go({screen:"learning"});
  owner.root.querySelector<HTMLButtonElement>("#authoring-calendar")!.onclick=()=>owner.go({screen:"calendar"});
  owner.root.querySelector<HTMLButtonElement>("#authoring-history")!.onclick=()=>owner.go({screen:"history"});
  owner.root.querySelector<HTMLButtonElement>("#authoring-learning-focus")!.onclick=()=>{
    owner.learningDesk.focusAuthoringTools();owner.go({screen:"learning"});
  };
  owner.root.querySelector<HTMLButtonElement>("#authoring-import")!.onclick=()=>
    owner.root.querySelector<HTMLInputElement>("#authoring-import-file")?.click();
  owner.root.querySelector<HTMLButtonElement>("#authoring-image-prep")!.onclick=e=>
    owner.imagePreparation.open(e.currentTarget as HTMLElement);
  owner.root.querySelector<HTMLButtonElement>("#authoring-open-studio")!.onclick=e=>{
    const target=owner.root.querySelector<HTMLElement>("#pd-authoring-container");
    if(target)void owner.authoringStudio.open(target,e.currentTarget as HTMLElement);
  };
  owner.root.querySelectorAll<HTMLButtonElement>("[data-authoring-export-paper]").forEach(button=>button.onclick=()=>{
    const id=button.dataset.authoringExportPaper??"",pkg=owner.packages.get(id);
    if(!pkg)return;
    const stem=pkg.paper.paperId.replace(/[^a-z0-9._-]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,100)||"practice-desk-paper";
    downloadText(stem+"-"+pkg.paper.edition+"-r"+pkg.paper.revision+".exam.json",JSON.stringify(pkg,null,2),"application/json;charset=utf-8");
  });
  owner.root.querySelectorAll<HTMLButtonElement>("[data-authoring-open-paper]").forEach(button=>button.onclick=()=>{
    const id=button.dataset.authoringOpenPaper??"",pkg=owner.packages.get(id);
    if(!pkg)return;
    const family=owner.families().find(f=>f.papers.some(p=>p.paper.id===id));
    if(!family){owner.notice("Published package has no examination family.");return;}
    owner.applyFamily(family.id);owner.choice=id;owner.singleSection=0;
    owner.practiceMode=resolvePracticeMode(pkg.paper,owner.practiceMode);
    if(pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")owner.editionView=pkg.paper.edition;
    owner.saveSelection();owner.go({screen:"library"});
  });
  owner.root.querySelector<HTMLInputElement>("#authoring-import-file")!.onchange=async e=>{
    const input=e.target as HTMLInputElement,file=input.files?.[0];
    if(!file)return;
    try{
      if(file.size>25*1024*1024)throw Error("Exam package exceeds the 25 MiB import limit.");
      const source=JSON.parse(await file.text());
      if(source&&typeof source==="object"&&!Array.isArray(source)&&
        source.format==="practice-desk-authoring"){
        const target=owner.root.querySelector<HTMLElement>("#pd-authoring-container");
        const trigger=owner.root.querySelector<HTMLElement>("#authoring-open-studio");
        if(!target||!trigger)throw Error("Authoring studio unavailable");
        await owner.authoringStudio.open(target,trigger);
        await owner.authoringStudio.stageFiles([file]);
        return;
      }
      const pkg:ExamPackage=validateExamPackage(source);
      if(owner.packages.has(pkg.paper.id))
        throw Error("Paper revision ID already exists. Supply a new revision ID.");
      if(!await owner.save({recordType:"generic-package",saveRevision:0,
        id:"generic-package:"+pkg.paper.id,bundle:pkg}))return;
      owner.packages.set(pkg.paper.id,pkg);
      const family=owner.families().find(f=>f.papers.some(p=>p.paper.id===pkg.paper.id));
      if(!family)throw Error("Imported package has no exam family");
      owner.applyFamily(family.id);owner.choice=pkg.paper.id;owner.singleSection=0;
      owner.practiceMode=resolvePracticeMode(pkg.paper,owner.practiceMode);
      if(pkg.paper.edition==="source"||pkg.paper.edition==="reviewed")owner.editionView=pkg.paper.edition;
      owner.saveSelection();
      owner.notice("Exam package validated and imported. Open it from Published content or Test library.");
    }catch(error){
      owner.notice(error instanceof Error?error.message:"Invalid exam package");
    }finally{input.value="";}
  };
}
