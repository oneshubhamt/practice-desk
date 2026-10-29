import { DefaultScheduler, Rating, type DefaultScheduler as Scheduler } from "ts-fsrs";
import type { ExamPackage, GenericAttempt } from "./exam-package.ts";
import { readableAnswer } from "./exam-package.ts";
import { ERROR_LABELS, comparableTrends, rateLearningCard, scheduledCard, topicMetrics, validateLearningCard } from "../learning/learning.ts";
import type { ErrorLabel, LearningCard, ReviewGrade } from "../learning/learning.ts";

export interface LearningDeskHost {
  cards:()=>LearningCard[];
  attempts:()=>GenericAttempt[];
  packages:()=>ExamPackage[];
  save:(record:LearningCard)=>void;
  remove:(id:string)=>Promise<void>;
  close:()=>void;
}
const esc=(v:unknown):string=>String(v??"").replace(/[&<>"']/g,c=>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]??c));
function figures(pkg:ExamPackage|undefined,ids:readonly string[]|undefined):string{
 return (ids??[]).map(id=>{
  const a=pkg?.assets?.find(x=>x.id===id);
  return a?'<img class="generic-figure" src="'+esc(a.dataUri)+'" alt="'+esc(a.altText??"Question figure")+'">':"";
 }).join("");
}
function questionHTML(record:LearningCard,packages:readonly ExamPackage[]):string{
 const q=record.question,c=q.content;
 const pkg=packages.find(p=>p.questions.some(item=>item.id===q.id));
 const stimulus=pkg?.stimuli?.find(s=>s.id===c.stimulusId);
 const passage=stimulus&&(stimulus.kind==="passage"||stimulus.kind==="case")?
  '<section class="generic-stimulus"><strong>'+esc(stimulus.title??"Source passage")+'</strong><p>'+esc(stimulus.text)+'</p></section>':"";
 const choices=(c.kind==="single-choice"||c.kind==="multiple-select")?
   '<div class="generic-choices">'+c.options.map((o,i)=>'<label class="generic-choice"><input type="'+
   (c.kind==="single-choice"?"radio":"checkbox")+'" name="learning-answer"><span>'+
   String.fromCharCode(65+i)+'. '+esc(o.text)+figures(pkg,o.assetIds)+'</span></label>').join("")+'</div>':
   c.kind==="true-false"?'<div class="generic-choices"><label><input type="radio" name="learning-true"> True</label> '+
      '<label><input type="radio" name="learning-true"> False</label></div>':
   '<textarea aria-label="Recall your response" rows="3" placeholder="Think through or write your answer before revealing it."></textarea>';
 return passage+'<h2 class="generic-prompt">'+esc(c.prompt)+'</h2>'+figures(pkg,c.assetIds)+choices;
}

export function createLearningDesk(root:HTMLElement,host:LearningDeskHost){
 let scheduler:Scheduler<"FSRS-7">|null=null;
 let selectedId:string|null=null,reviewId:string|null=null,revealed=false;
 let filter:"all"|"due"|"bookmarked"="all",message="",closed=false,opened=false;
 const now=()=>new Date();
 const due=(card:LearningCard)=>scheduler?.newCard!==undefined?
   scheduledCard(card,scheduler).dueAt.getTime()<=Date.now():false;
 const cards=()=>host.cards().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
 const dueCards=()=>cards().filter(due).sort((a,b)=>
   scheduledCard(a,scheduler!).dueAt.getTime()-scheduledCard(b,scheduler!).dueAt.getTime());
 function draw(){
  if(closed||!opened)return;
  const all=cards();
  const selected=all.find(c=>c.id===selectedId)??all[0];
  const dueNow=dueCards();
  if(reviewId){
    const item=all.find(c=>c.id===reviewId);
    if(!item){reviewId=null;revealed=false;}
    else{
     root.innerHTML='<div class="generic-heading"><div><h1>Spaced revision</h1><p class="muted">'+
       esc(item.sectionTitle)+' · FSRS-7 · rate your recall, not your exam mark</p></div>'+
       '<button class="btn" id="learning-back">Learning desk</button></div>'+
       '<section class="panel pad">'+questionHTML(item,host.packages())+
       (revealed?'<div class="learning-answer"><h3>Expected answer</h3><p>'+esc(readableAnswer(item.question,item.answer))+'</p>'+
         (item.explanation?'<p>'+esc(item.explanation)+'</p>':"")+
         (item.note?'<p class="fine">Your note: '+esc(item.note)+'</p>':"")+
         '<h3>How well did you recall it?</h3><div class="row generic-actions">'+
         ([[Rating.Again,"Again"],[Rating.Hard,"Hard"],[Rating.Good,"Good"],[Rating.Easy,"Easy"]] as const)
          .map(([grade,label])=>'<button class="btn" data-grade="'+grade+'">'+label+'</button>').join("")+'</div></div>':
         '<button class="btn primary" id="learning-reveal">Reveal answer</button>')+'</section>'+
       (message?'<p role="status" class="generic-warning">'+esc(message)+'</p>':"");
     root.querySelector<HTMLButtonElement>("#learning-back")!.onclick=()=>{reviewId=null;revealed=false;draw();};
     root.querySelector<HTMLButtonElement>("#learning-reveal")?.addEventListener("click",()=>{revealed=true;draw();});
     root.querySelectorAll<HTMLButtonElement>("[data-grade]").forEach(button=>button.onclick=()=>{
       if(!revealed||!scheduler)return;
       try{
         host.save(rateLearningCard(item,Number(button.dataset.grade) as ReviewGrade,now().toISOString(),scheduler));
         message="Review recorded. The next due date is scheduled by FSRS-7.";
         reviewId=dueCards().find(c=>c.id!==item.id)?.id??null;
         revealed=false;draw();
       }catch(error){message=error instanceof Error?error.message:"Scheduling failed";draw();}
     });
     return;
    }
  }
  const visible=all.filter(c=>filter==="all"||filter==="due"&&due(c)||filter==="bookmarked"&&c.bookmarked);
  const done=host.attempts().filter(a=>a.finishedAt!==null&&a.result);
  const topics=topicMetrics(done,all),cohorts=comparableTrends(done).filter(x=>x.count>=2);
  root.innerHTML='<div class="generic-heading"><div><h1>Learning & revision</h1><p class="muted">Error notebook · FSRS-7 spaced review · Topic evidence</p></div>'+
    '<button class="btn" id="learning-close">← Test library</button></div>'+
    (message?'<p class="generic-warning" role="status">'+esc(message)+'</p>':"")+
    '<section class="panel pad"><div class="row between"><div><h2>Revision queue</h2>'+
    '<p class="fine">'+all.length+' cards · '+(scheduler?dueNow.length+" due now":"Scheduler initializing")+
      ' · Mock results do not automatically count as spaced-repetition reviews</p></div>'+
    '<button class="btn primary" id="learning-due"'+(!scheduler||!dueNow.length?" disabled":"")+'>Review due cards</button></div></section>'+
    '<div class="generic-layout learning-layout"><section class="panel pad"><div class="row between"><h2>Error notebook</h2>'+
      '<select id="learning-filter" aria-label="Filter notebook" class="learning-filter">'+
      [["all","All cards"],["due","Due now"],["bookmarked","Bookmarked"]].map(([key,label])=>
       '<option value="'+key+'"'+(filter===key?" selected":"")+'>'+label+'</option>').join("")+'</select></div>'+
    (visible.length?visible.map(c=>{
      const next=scheduler?scheduledCard(c,scheduler):null;
      return '<button class="generic-history '+(selected?.id===c.id?"learning-selected":"")+
        '" data-learning-id="'+esc(c.id)+'">'+esc(c.sectionTitle)+' · '+esc(c.question.content.prompt.slice(0,92))+
        '<small>'+esc(c.errorLabel??"Unclassified")+' · '+
          (next?(next.dueAt.getTime()<=Date.now()?"Due now":"Due "+next.dueAt.toLocaleDateString()):"Unscheduled")+
          ' · '+c.reviews.length+' ratings</small></button>';
    }).join(""):'<p class="fine">No cards in this view. Add a question from a completed test result.</p>')+'</section>'+
    '<section class="panel pad"><h2>Notebook detail</h2>'+
     (selected?'<h3>'+esc(selected.question.content.prompt)+'</h3>'+
       '<p class="fine">'+esc(selected.paperId)+' · '+esc(selected.sectionTitle)+'</p>'+
       '<p>Expected: <strong>'+esc(readableAnswer(selected.question,selected.answer))+'</strong></p>'+
       (selected.explanation?'<p class="fine">'+esc(selected.explanation)+'</p>':"")+
       '<label class="picker" for="learning-error">Error type (self-reported)</label>'+
       '<select id="learning-error"><option value="">Not classified</option>'+
       ERROR_LABELS.map(label=>'<option value="'+label+'"'+(selected.errorLabel===label?" selected":"")+'>'+
         esc(label)+'</option>').join("")+'</select>'+
       '<label class="picker" for="learning-topic">Specific topic (optional)</label>'+
       '<input id="learning-topic" maxlength="120" value="'+esc(selected.customTopic)+'" placeholder="Your own subtopic label">'+
       '<label class="picker" for="learning-note">Notes</label>'+
       '<textarea id="learning-note" maxlength="8000" rows="5">'+esc(selected.note)+'</textarea>'+
       '<label class="learning-bookmark"><input id="learning-bookmark" type="checkbox"'+
         (selected.bookmarked?" checked":"")+'> Bookmark</label>'+
       '<div class="row generic-actions"><button class="btn primary" id="learning-save">Save note</button>'+
       '<button class="btn" id="learning-one">Review this card</button>'+
       '<button class="btn danger" id="learning-delete">Delete</button></div>':
       '<p class="fine">Select a card from the notebook.</p>')+'</section></div>'+
    '<section class="panel pad learning-insights"><h2>Topic performance</h2>'+
    '<p class="fine">Official CGL section labels are the default broad topics. Imported exam topic IDs and your explicitly labelled subtopics remain separate; no topic is guessed. Five answered items minimum for measured evidence. Skips are excluded from accuracy.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Exam</th><th>Topic</th><th>Answered / total</th><th>Accuracy</th><th>Evidence</th></tr></thead><tbody>'+
     (topics.length?topics.map(t=>'<tr><td>'+esc(t.examId)+'</td><td>'+esc(t.label)+'</td><td>'+
       t.answered+' / '+t.total+'</td><td>'+(t.accuracy===null?"—":Math.round(t.accuracy*100)+"%")+
       '</td><td>'+(t.evidence==="measured"?"Observed":"Insufficient")+'</td></tr>').join(""):
       '<tr><td colspan="5">Complete an exam to view topic performance.</td></tr>')+'</tbody></table></div>'+
    '<h2>Comparable attempt trends</h2>'+
    '<p class="fine">Only identical frozen paper revisions, including their rules and answer keys, are compared.</p>'+
    '<div class="scroll-table"><table><thead><tr><th>Paper revision</th><th>Attempts</th><th>Accuracy sequence</th><th>Marks sequence</th></tr></thead><tbody>'+
     (cohorts.length?cohorts.map(g=>'<tr><td>'+esc(g.label)+'</td><td>'+g.count+'</td><td>'+
       g.points.map(p=>p.accuracy===null?"—":Math.round(p.accuracy*100)+"%").join(" → ")+
       '</td><td>'+g.points.map(p=>p.marks.toFixed(1)).join(" → ")+'</td></tr>').join(""):
       '<tr><td colspan="4">Complete the same paper revision twice to see a valid comparison.</td></tr>')+
    '</tbody></table></div></section>';
  root.querySelector<HTMLButtonElement>("#learning-close")!.onclick=host.close;
  root.querySelector<HTMLButtonElement>("#learning-due")!.onclick=()=>{
    reviewId=dueCards()[0]?.id??null;revealed=false;message="";draw();
  };
  root.querySelector<HTMLSelectElement>("#learning-filter")!.onchange=e=>{
    filter=(e.target as HTMLSelectElement).value as typeof filter;draw();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-learning-id]").forEach(b=>b.onclick=()=>{
    selectedId=b.dataset.learningId??null;draw();
  });
  if(!selected)return;
  root.querySelector<HTMLButtonElement>("#learning-save")!.onclick=()=>{
    try{
      const note=root.querySelector<HTMLTextAreaElement>("#learning-note")!.value;
      const customTopic=root.querySelector<HTMLInputElement>("#learning-topic")!.value.trim();
      const errorLabel=root.querySelector<HTMLSelectElement>("#learning-error")!.value as ErrorLabel|"";
      const bookmarked=root.querySelector<HTMLInputElement>("#learning-bookmark")!.checked;
      host.save(validateLearningCard({...selected,note,customTopic,errorLabel:errorLabel||null,
         bookmarked,updatedAt:now().toISOString()}));
      message="Notebook saved.";draw();
    }catch(e){message=e instanceof Error?e.message:"Cannot save notebook";draw();}
  };
  root.querySelector<HTMLButtonElement>("#learning-one")!.onclick=()=>{
    reviewId=selected.id;revealed=false;message="";draw();
  };
  root.querySelector<HTMLButtonElement>("#learning-delete")!.onclick=async()=>{
    await host.remove(selected.id);selectedId=null;draw();
  };
 }
 void DefaultScheduler<"FSRS-7">({version:"FSRS-7",desiredRetention:0.9,enableFuzz:false})
  .then(value=>{scheduler=value;draw();})
  .catch(e=>{message="FSRS scheduler failed to initialize.";console.error(e);draw();});
 return {show(){opened=true;draw();},hide(){opened=false;},select(id:string){selectedId=id;},dispose(){closed=true}};
}
