import {
  CalendarEngine,CalendarUi,MemoryCalendarRepository,
  type CalendarOccurrence,type CalendarProjectionProvider,type CalendarRange,
  type CalendarSource,type CalendarSourceAction,type CalendarSourceActionPort
} from "@director/calendar";
import {PracticeDeskLiveProjection} from "@director/calendar/integration/practice-desk";
import {CalendarIntegrationInvalidationNotifier} from "@director/calendar/integration/common";
import {projectPracticeDesk} from "@director/calendar/adapters/practice-desk";
import {createRevisionScheduler} from "../learning/fsrs-scheduler-adapter.ts";
import {readRevisionSettings,revisionSchedulerOptions} from "../learning/revision-settings.ts";
import {scheduledCard} from "../learning/learning.ts";
import {isAttempt,isLearning,isScheduledMock} from "./stored-record-validator.ts";
import {createScheduledMock,type ScheduledMockRecord} from "../calendar/scheduled-mock.ts";
import {escapeText} from "./html-escape.ts";
import {BUILTIN_CGL_FAMILY,familyIdFor,pairedEdition} from "./exam-families.ts";
import {cglAttemptMode,configureCglPractice,startGenericAttempt} from "./exam-package.ts";
import {createSourceKeyReference} from "../engine/source-comparison.ts";
import {createSourceReviewReference} from "../engine/review-source.ts";
import type {CalendarControllerContext} from "./coordinator-context.ts";
import type {RevisionSchedulerPort} from "../learning/revision-scheduler-port.ts";

const SOURCES:readonly CalendarSource[]=Object.freeze([
  {id:"practice-desk:history",title:"Completed attempts",visible:true,removable:false,
    sourceType:"projected",readOnly:true,display:{icon:"✓"}},
  {id:"practice-desk:revision",title:"Learning due",visible:true,removable:false,
    sourceType:"projected",readOnly:true,display:{icon:"R"}},
  {id:"practice-desk:plan",title:"Scheduled mocks",visible:true,removable:false,
    sourceType:"projected",readOnly:true,display:{icon:"P"}}
]);

const within=(at:string,range:CalendarRange):boolean=>{
  const value=Date.parse(at),start=Date.parse(range.start),end=Date.parse(range.end);
  return Number.isFinite(value)&&value>=start&&value<end;
};
const overlaps=(start:number,end:number,range:CalendarRange):boolean=>
  start<Date.parse(range.end)&&end>Date.parse(range.start);

function datetimeLocal(ms:number):string{
  const d=new Date(ms),pad=(n:number)=>String(n).padStart(2,"0");
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+
    pad(d.getHours())+":"+pad(d.getMinutes());
}
function plannedMinutes(record:ScheduledMockRecord):number{return record.durationMinutes;}
function scheduledRecords(owner:CalendarControllerContext):ScheduledMockRecord[]{
  return [...owner.records.values()].filter(isScheduledMock)
    .sort((a,b)=>a.start.localeCompare(b.start));
}

export interface CalendarController{
  show():void;
  hide():void;
  refresh():Promise<void>;
  dispose():void;
  invalidate():void;
}

export function createWorkspaceCalendarController(owner:CalendarControllerContext):CalendarController {
  const invalidation=new CalendarIntegrationInvalidationNotifier();
  let visible=false,disposed=false,generation=0,ui:CalendarUi|null=null;
  let schedulerKey="",schedulerPromise:Promise<RevisionSchedulerPort>|null=null;

  const scheduler=():Promise<RevisionSchedulerPort>=>{
    const settings=readRevisionSettings();
    const key=JSON.stringify(settings);
    if(!schedulerPromise||key!==schedulerKey){
      schedulerKey=key;
      schedulerPromise=createRevisionScheduler(revisionSchedulerOptions(settings));
    }
    return schedulerPromise;
  };

  const liveProjection=new PracticeDeskLiveProjection({
    calendarInvalidation:invalidation,
    async readCalendar(range){
      const revision=await scheduler();
      const attempts=[...owner.records.values()].filter(isAttempt)
        .filter(item=>item.finishedAt!==null&&overlaps(item.startedAt,item.finishedAt!,range))
        .map(item=>({
          id:item.id,examId:item.frozen.snapshot.examId,paperId:item.frozen.paper.paperId,
          title:owner.packages.get(item.packageId)?.title??item.frozen.paper.paperId,
          startedAt:item.startedAt,finishedAt:item.finishedAt,elapsedMs:item.state.elapsedMs
        }));
      const dueCards=[...owner.records.values()].filter(isLearning)
        .filter(card=>card.revisionDisposition==="active")
        .flatMap(card=>{
          const schedule=scheduledCard(card,revision);
          if(schedule.scheduleStatus==="suspended"||!within(schedule.dueAt.toISOString(),range))return [];
          return [{
            id:card.id,examId:card.examId,paperId:card.paperId,
            title:card.customTopic.trim()||card.sourceTitle||card.question.id,
            dueAt:schedule.dueAt.toISOString(),
            ...(card.customTopic.trim()?{topic:card.customTopic.trim()}:{})
          }];
        });
      return {attempts,dueCards};
    }
  });

  const scheduledProjection:CalendarProjectionProvider={
    id:"practice-desk-scheduled",
    project(range){
      const plannedMocks=scheduledRecords(owner).filter(record=>{
        const start=Date.parse(record.start);
        return overlaps(start,start+plannedMinutes(record)*60_000,range);
      }).map(record=>({
        id:record.id,examId:record.examId,paperId:record.paperId,title:record.title,
        start:record.start,durationMinutes:record.durationMinutes
      }));
      return projectPracticeDesk({plannedMocks});
    }
  };

  const repository=new MemoryCalendarRepository(SOURCES,[]);
  const engine=new CalendarEngine(repository,[liveProjection,scheduledProjection]);

  async function launchScheduled(id:string):Promise<void>{
    const record=owner.records.get(id);
    if(!isScheduledMock(record)){owner.notice("Scheduled mock is no longer available.");return;}
    const base=owner.packages.get(record.packageRevisionId);
    if(!base||base.examId!==record.examId||base.paper.paperId!==record.paperId){
      owner.notice("The scheduled paper revision is unavailable. Re-import it before launching.");return;
    }
    const familyId=familyIdFor(base,owner.builtinPaperIds);
    const configured=familyId===BUILTIN_CGL_FAMILY?configureCglPractice(base,"strict",0):base;
    const attemptMode=familyId===BUILTIN_CGL_FAMILY?cglAttemptMode("strict"):
      configured.paper.edition==="custom"?"custom-practice":"exam-simulation";
    const idValue=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
      "calendar-"+owner.now()+"-"+Math.random();
    let attempt=startGenericAttempt(configured,idValue,owner.now(),attemptMode);
    if(configured.paper.edition==="reviewed"){
      const family=owner.families().find(f=>f.id===familyId);
      const source=family?pairedEdition(family,configured,"source"):undefined;
      if(source){
        const original=createSourceKeyReference(configured,source);
        const review=createSourceReviewReference(configured,source);
        attempt={...attempt,...(original?{sourceKeyReference:original}:{}),
          ...(review?{sourceReviewReference:review}:{})};
      }
    }
    if(!await owner.save(attempt))return;
    owner.attempt=attempt;owner.freshlyStartedAttemptId=attempt.id;
    owner.warning="Scheduled mock started in full exam mode.";
    owner.go({screen:"exam",attemptId:attempt.id});
  }

  const sourceActions:CalendarSourceActionPort={
    actions(occurrence:CalendarOccurrence):readonly CalendarSourceAction[]{
      if(occurrence.calendarId==="practice-desk:history")
        return [{id:"practice:open-attempt",label:"Open result",kind:"open",primary:true}];
      if(occurrence.calendarId==="practice-desk:revision")
        return [{id:"practice:open-learning",label:"Open learning card",kind:"open",primary:true}];
      if(occurrence.calendarId==="practice-desk:plan")
        return [
          {id:"practice:launch",label:"Launch mock",kind:"launch",primary:true},
          {id:"practice:delete-schedule",label:"Delete schedule",kind:"delete",danger:true}
        ];
      return [];
    },
    async execute(actionId,occurrence){
      const sourceId=occurrence.metadata?.sourceId;
      if(typeof sourceId!=="string")throw Error("Calendar item has no Practice Desk source identity.");
      if(actionId==="practice:open-attempt"){
        const attempt=owner.records.get(sourceId);
        if(!isAttempt(attempt)||attempt.finishedAt===null){owner.notice("Attempt is unavailable.");return;}
        owner.go({screen:"result",attemptId:attempt.id,tab:"overview"});return;
      }
      if(actionId==="practice:open-learning"){
        if(!isLearning(owner.records.get(sourceId))){owner.notice("Learning card is unavailable.");return;}
        owner.learningDesk.select(sourceId);owner.go({screen:"learning"});return;
      }
      if(actionId==="practice:launch"){await launchScheduled(sourceId);return;}
      if(actionId==="practice:delete-schedule"){
        await owner.removeSavedAttempt(sourceId,"scheduled-mock");return;
      }
      throw Error("Unknown Practice Desk Calendar action.");
    }
  };

  function shellHtml():string{
    const options=[...owner.packages.values()].sort((a,b)=>a.title.localeCompare(b.title))
      .map(pkg=>'<option value="'+escapeText(pkg.paper.id)+'"'+(pkg.paper.id===owner.choice?" selected":"")+'>'+
        escapeText(pkg.title+" · "+pkg.paper.edition)+'</option>').join("");
    return '<div class="pd-calendar-screen"><div class="generic-heading page-heading"><div>'+
      '<span class="eyebrow">PLANNING</span><h1>Calendar</h1>'+
      '<p class="muted">Completed attempts, spaced-revision due points and durable scheduled mocks.</p></div>'+
      '<div class="row"><button class="btn quiet" id="calendar-learning">Learning</button>'+
      '<button class="btn" id="calendar-library">Library</button></div></div>'+
      (owner.warning?'<p class="generic-warning" role="status">'+escapeText(owner.warning)+'</p>':"")+
      '<section class="panel pad pd-calendar-scheduler"><div><h2>Schedule a full mock</h2>'+
      '<p class="fine">Stored with Practice Desk history and included in the same backup/restore archive.</p></div>'+
      '<div class="pd-calendar-form"><label>Paper<select id="calendar-package">'+options+'</select></label>'+
      '<label>Start<input id="calendar-start" type="datetime-local" value="'+datetimeLocal(owner.now()+60*60_000)+'"></label>'+
      '<label>Planned minutes<input id="calendar-duration" type="number" min="1" max="1440" step="1" value="60"></label>'+
      '<button type="button" class="btn primary" id="calendar-schedule"'+
      (owner.loading||owner.storageFault||owner.fallbackConflict?" disabled":"")+'>Schedule mock</button></div>'+
      '<p class="fine" id="calendar-status" role="status" aria-live="polite"></p></section>'+
      '<section class="panel pd-calendar-panel"><div id="pd-calendar-mount" class="pd-calendar-mount"></div></section></div>';
  }

  function bindShell():void{
    owner.root.querySelector<HTMLButtonElement>("#calendar-library")!.onclick=()=>owner.go({screen:"library"});
    owner.root.querySelector<HTMLButtonElement>("#calendar-learning")!.onclick=()=>owner.go({screen:"learning"});
    const packageSelect=owner.root.querySelector<HTMLSelectElement>("#calendar-package")!;
    const duration=owner.root.querySelector<HTMLInputElement>("#calendar-duration")!;
    const deriveDuration=()=>{
      const pkg=owner.packages.get(packageSelect.value);
      if(!pkg)return;
      const timing=pkg.paper.timing;
      const minutes=timing.kind==="whole-paper"?Math.max(1,Math.round(timing.durationMs/60_000)):
        timing.kind==="sectional"?Math.max(1,Math.round(timing.sectionLimits.reduce((sum,x)=>
          sum+(x.durationMs??0),0)/60_000)):60;
      duration.value=String(minutes||60);
    };
    packageSelect.onchange=deriveDuration;deriveDuration();
    owner.root.querySelector<HTMLButtonElement>("#calendar-schedule")!.onclick=async()=>{
      const status=owner.root.querySelector<HTMLElement>("#calendar-status")!;
      try{
        const pkg=owner.packages.get(packageSelect.value);
        const startField=owner.root.querySelector<HTMLInputElement>("#calendar-start")!;
        const local=new Date(startField.value);
        const minutes=duration.valueAsNumber;
        if(!pkg)throw Error("Select an available paper.");
        if(!startField.value||!Number.isFinite(local.getTime()))throw Error("Choose a valid start date and time.");
        if(!Number.isSafeInteger(minutes)||minutes<1||minutes>1440)throw Error("Planned duration must be 1–1440 minutes.");
        const now=new Date(owner.now()).toISOString();
        const uuid=typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():
          String(owner.now())+"-"+Math.random();
        const record=createScheduledMock({
          packageRevisionId:pkg.paper.id,examId:pkg.examId,paperId:pkg.paper.paperId,
          title:pkg.title,start:local.toISOString(),durationMinutes:minutes
        },now,uuid);
        if(!await owner.save(record))return;
        status.textContent="Mock scheduled and saved with Practice Desk data.";
      }catch(error){status.textContent=error instanceof Error?error.message:"Unable to schedule mock.";}
    };
  }

  async function mountCalendar(current:number):Promise<void>{
    const mount=owner.root.querySelector<HTMLElement>("#pd-calendar-mount");
    if(!mount||disposed||!visible||current!==generation)return;
    ui=new CalendarUi(mount,engine,{
      locale:navigator.language||"en-IN",
      timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||"UTC",
      initialView:"month",initialDate:new Date(owner.now()).toISOString(),
      allowCreate:false,allowDrag:false,allowResize:false,sourceActions,
      ariaLabel:"Practice Desk calendar",
      theme:{
        background:"var(--panel)",softBackground:"var(--soft)",text:"var(--ink)",
        mutedText:"var(--muted)",border:"var(--line)",accent:"var(--blue)",
        danger:"var(--bad)",fontFamily:"system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      }
    });
    await ui.refresh();
  }

  async function refresh():Promise<void>{
    if(disposed||!visible||!ui)return;
    await ui.refresh();
  }

  return {
    show(){
      if(disposed)return;
      if(visible){void refresh();return;}
      visible=true;const current=++generation;
      owner.root.innerHTML=shellHtml();bindShell();
      void mountCalendar(current).catch(error=>{
        if(disposed||!visible||current!==generation)return;
        const status=owner.root.querySelector<HTMLElement>("#calendar-status");
        if(status)status.textContent=error instanceof Error?error.message:"Calendar could not be loaded.";
      });
    },
    hide(){
      if(!visible)return;
      visible=false;generation++;ui?.destroy();ui=null;
    },
    refresh,
    dispose(){disposed=true;visible=false;generation++;ui?.destroy();ui=null;},
    invalidate(){invalidation.notify();}
  };
}
