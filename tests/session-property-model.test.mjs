import test from "node:test";
import assert from "node:assert/strict";
import {startSession,transition,rebaseSession,validateSectionTimingEvidence} from "../src/engine/session.ts";

function rng(seed){
 let x=seed>>>0;
 return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};
}
const base=(timing,sectionCount=1)=>({
 id:"session-model",paperId:"model",answerKeyRevisionId:"model-key",
 sections:Array.from({length:sectionCount},(_,i)=>({
  id:"s"+i,questionRevisionIds:["q"+i+"a","q"+i+"b","q"+i+"c"]})),
 timing,
 navigation:{questionNavigation:"free",sectionNavigation:sectionCount>1?"sequential-locked":"free",
  allowFlagging:true,allowReview:true},
 scoring:{defaultRule:{correctMarks:2,incorrectMarks:-0.5,unansweredMarks:0}}
});
const event=(type,nowMs,more={})=>({type,nowMs,...more});

test("seeded whole-paper state model conserves elapsed, foreground and response exposure",()=>{
 for(let seed=1;seed<=160;seed++){
  const random=rng(0x36beef^seed);
  const deadline=1000+random(30000);
  const paper=base({kind:"whole-paper",durationMs:deadline,pausePolicy:"allowed"});
  let now=1000000,s=startSession(paper,now);
  // Independent reference deliberately tracks only time/status/visibility. It
  // does not reuse checkpoint(), transition(), or session answer events.
  let reference={elapsed:0,foreground:0,clock:now,status:"running",visible:true};
  const names=["TICK","VISIBILITY","PAUSE","RESUME","ANSWER","CLEAR","FLAG",
   "NAVIGATE","SUBMIT_ATTEMPT"];
  for(let step=0;step<120;step++){
   const name=names[random(names.length)];
   // Includes rollback, repeated timestamps, large jumps and post-terminal calls.
   const movement=random(11)===0?-(random(2500)+1):random(1800);
   now+=movement;
   const args=name==="VISIBILITY"?{visible:!!random(2)}:
    name==="ANSWER"?{response:{kind:"single-choice",optionId:random(2)?"a":"b"}}:
    name==="FLAG"?{flagged:!!random(2)}:
    name==="NAVIGATE"?{sectionIndex:0,questionIndex:random(3)}:{};
   if(reference.status==="running"&&now>=reference.clock){
    const spent=Math.min(now-reference.clock,deadline-reference.elapsed);
    reference.elapsed+=spent;
    if(reference.visible)reference.foreground+=spent;
    if(reference.elapsed>=deadline)reference.status="completed";
   }
   reference.clock=now;
   if(name==="VISIBILITY")reference.visible=args.visible;
   else if(reference.status==="running"&&name==="PAUSE")reference.status="paused";
   else if(reference.status==="paused"&&name==="RESUME")reference.status="running";
   else if(reference.status==="running"&&name==="SUBMIT_ATTEMPT")reference.status="completed";
   s=transition(paper,s,event(name,now,args));
   const label="seed="+seed+" event="+step+" "+name+" clock="+now;
   assert.equal(s.status,reference.status,label+" status");
   assert.equal(s.elapsedMs,reference.elapsed,label+" elapsed");
   assert.equal(s.foregroundMs,reference.foreground,label+" foreground");
   assert.equal(s.clockMs,reference.clock,label+" rebase");
   assert.equal(s.visible,reference.visible,label+" visibility");
   const time=s.responses.reduce((sum,r)=>sum+r.timeSpentMs,0);
   assert.equal(time,s.foregroundMs,label+" time assigned exactly once");
   assert.ok(s.elapsedMs>=s.foregroundMs&&s.foregroundMs>=0,label+" accounting bounds");
   assert.ok(s.elapsedMs<=deadline,label+" deadline upper bound");
   assert.ok(s.responses.every(r=>r.timeSpentMs>=0&&r.answerChangeCount>=0),label+" per-item evidence");
   assert.ok(s.questionVisits?.every(v=>v.count>=1),label+" visits always positive");
   validateSectionTimingEvidence(paper,s);
  }
  const restored=rebaseSession(s,2000000+seed);
  assert.equal(restored.clockMs,2000000+seed);
  assert.equal(restored.elapsedMs,s.elapsedMs);
  assert.deepEqual(restored.responses,s.responses);
 }
});

test("seeded sectional automatic overshoot splits exact limits and closes each section once",()=>{
 for(let seed=1;seed<=100;seed++){
  const random=rng(0x36cafe^seed);
  const limits=Array.from({length:2+random(4)},()=>1+random(10000));
  const paper=base({kind:"sectional",transition:"automatic",allowEarlySubmit:true,
   pausePolicy:"allowed",sectionLimits:limits.map((durationMs,i)=>({sectionId:"s"+i,durationMs}))},limits.length);
  const excess=1+random(100000);
  const s=transition(paper,startSession(paper,1000),event("TICK",1000+limits.reduce((a,b)=>a+b,0)+excess));
  const label="seed="+seed+" limits="+limits.join(",");
  assert.equal(s.status,"completed",label);
  assert.equal(s.elapsedMs,limits.reduce((a,b)=>a+b,0),label);
  assert.equal(s.foregroundMs,s.elapsedMs,label);
  assert.deepEqual(s.completedSections,limits.map((_,i)=>i),label);
  assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),limits,label+" durations");
  assert.ok(s.completedSectionTimings?.every(x=>x.reason==="time-expired"),label+" expiry reasons");
  const spent=s.responses.reduce((sum,r)=>sum+r.timeSpentMs,0);
  assert.equal(spent,s.elapsedMs,label+" single attribution");
  validateSectionTimingEvidence(paper,s);
  const late=transition(paper,s,event("TICK",20000000));
  assert.equal(late.elapsedMs,s.elapsedMs,label+" terminal no extra elapsed");
 }
});

test("manual expiry excludes waiting time, prevents edits, and records exact section closure",()=>{
 const first=250,second=400;
 const paper=base({kind:"sectional",transition:"manual",allowEarlySubmit:false,
  pausePolicy:"forbidden",sectionLimits:[{sectionId:"s0",durationMs:first},
   {sectionId:"s1",durationMs:second}]},2);
 let s=startSession(paper,5000);
 s=transition(paper,s,event("TICK",5000+first+9999));
 assert.equal(s.status,"section-expired");
 assert.equal(s.elapsedMs,first);
 for(const e of [event("ANSWER",16000,{response:{kind:"single-choice",optionId:"a"}}),
   event("NAVIGATE",20000,{sectionIndex:1,questionIndex:0}),
   event("PAUSE",24000),event("TICK",25000)]){
  const before=s;
  s=transition(paper,s,e);
  assert.equal(s.status,"section-expired");
  assert.equal(s.elapsedMs,before.elapsedMs);
  assert.deepEqual(s.responses,before.responses);
 }
 s=transition(paper,s,event("SUBMIT_SECTION",30000));
 assert.equal(s.status,"running");
 assert.equal(s.sectionIndex,1);
 assert.equal(s.elapsedMs,first);
 assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),[first]);
 s=transition(paper,s,event("TICK",30000+second+40000));
 assert.equal(s.status,"section-expired");
 assert.equal(s.elapsedMs,first+second);
 s=transition(paper,s,event("SUBMIT_SECTION",80000));
 assert.equal(s.status,"completed");
 assert.equal(s.elapsedMs,first+second);
 assert.deepEqual(s.completedSectionTimings?.map(x=>x.durationMs),[first,second]);
 validateSectionTimingEvidence(paper,s);
 assert.equal(transition(paper,s,event("ANSWER",90000,{response:{kind:"single-choice",optionId:"a"}})).elapsedMs,first+second);
});

test("section evidence rejects fabricated duration, expiry reason, identity and totals",()=>{
 const paper=base({kind:"sectional",transition:"automatic",allowEarlySubmit:true,
  pausePolicy:"allowed",sectionLimits:[{sectionId:"s0",durationMs:100},{sectionId:"s1",durationMs:150}]},2);
 const s=transition(paper,startSession(paper,0),event("TICK",1000));
 assert.doesNotThrow(()=>validateSectionTimingEvidence(paper,s));
 const modifications=[
  x=>{x.completedSectionTimings[0].durationMs=101;},
  x=>{x.completedSectionTimings[0].sectionId="forged";},
  x=>{x.completedSectionTimings[0].reason="submitted";x.completedSectionTimings[1].reason="time-expired";x.completedSectionTimings[1].durationMs=149;},
  x=>{x.elapsedMs=10;},
  x=>{x.completedSectionTimings.push(x.completedSectionTimings[0]);},
 ];
 for(const mutate of modifications){
  const wrong=structuredClone(s);
  mutate(wrong);
  assert.throws(()=>validateSectionTimingEvidence(paper,wrong));
 }
});
