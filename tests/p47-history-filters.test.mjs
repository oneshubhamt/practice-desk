/** P47-2: frozen History query and archive filter integration contracts.
 * No test imports the stateful coordinator; no saved record is modified.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {historyHTML} from "../src/app/history-page.ts";
import {DEFAULT_HISTORY_QUERY,filteredHistory,localAttemptDate,historyQueryError,
 activeHistoryFilterCount,restoreHistoryQuery} from "../src/app/history-query.ts";

const mk=(id,examId,startedAt,finished=false)=>{
 const bundle={...pkg,examId};
 const a=startGenericAttempt(bundle,id,startedAt);
 return finished?transitionGenericAttempt(a,{type:"SUBMIT_ATTEMPT",nowMs:startedAt+1000},
   new Map(bundle.questions.map(q=>[q.id,q]))):a;
};
const base=()=>[
 mk("cat","cat",Date.UTC(2026,10,3,0,1),true),
 mk("pgdba","pgdba",Date.UTC(2026,10,3,12,1),true),
 mk("apfc","upsc-epfo-apfc",Date.UTC(2026,10,4,14,1)),
 mk("cat-earlier","cat",Date.UTC(2026,10,2,18,1),true),
];
const ids=(list)=>list.map(x=>x.id);

/** Reference model: 128 seeded conjunctions over frozen exam/mode/paper/status
 * values. The expected filter and comparator are independently coded rather
 * than calling production helpers. Each case is reproducible by iteration.
 */
test("History model: 128 seeded combinations preserve AND semantics, exact identity, stable order and records",()=>{
 let seed=0x47a71c2d;
 const next=n=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%n;};
 const exams=["cat","upsc-epfo-apfc","pgdba"],modes=["custom-practice","full-paper-practice"];
 const papers=["frozen-paper-1","frozen-paper-2"];
 const attempts=[];
 const questionMap=new Map(pkg.questions.map(q=>[q.id,q]));
 for(let i=0;i<24;i++){
  const examId=exams[i%exams.length],bundle={...pkg,examId};
  const startedAt=Date.UTC(2026,10,3,12,0)+Math.floor(i/2)*60000;
  let attempt=startGenericAttempt(bundle,"model-"+String(23-i).padStart(2,"0"),startedAt);
  if(Math.floor(i/12)===0)attempt=transitionGenericAttempt(attempt,
   {type:"SUBMIT_ATTEMPT",nowMs:startedAt+1000},questionMap);
  attempt={...attempt,frozen:{...attempt.frozen,
   paper:{...attempt.frozen.paper,id:papers[Math.floor(i/6)%2],paperId:"practice-paper-"+(Math.floor(i/6)%2)},
   snapshot:{...attempt.frozen.snapshot,examId,mode:modes[Math.floor(i/3)%2]}
  }};
  attempts.push(attempt);
 }
 const baseline=structuredClone(attempts);
 const combinations=new Set(attempts.map(a=>[a.frozen.snapshot.examId,a.frozen.snapshot.mode,
  a.frozen.paper.id,a.finishedAt!==null].join("|")));
 assert.equal(combinations.size,24,"the model must span the full exam×mode×paper×status product");
 const packages=new Map(); // removed package: frozen metadata must be authoritative
 const terms=["","practice","paper","custom","source","never-found","r1"];
 for(let iteration=0;iteration<128;iteration++){
  const examId=next(5)===0?"all":exams[next(exams.length)];
  const mode=next(4)===0?"all":modes[next(modes.length)];
  const paperRevisionId=next(4)===0?"all":papers[next(papers.length)];
  const status=["all","complete","progress"][next(3)];
  const sort=next(2)===0?"newest":"oldest";
  const search=terms[next(terms.length)];
  const query={...DEFAULT_HISTORY_QUERY,examId,mode,paperRevisionId,status,sort,search};
  const actual=filteredHistory(attempts,packages,query);
  const expected=attempts.filter(a=>{
   const f=a.frozen,completed=a.finishedAt!==null;
   const text=(f.paper.paperId+" · Practice "+f.snapshot.mode+" "+f.paper.edition).toLowerCase();
   return (paperRevisionId==="all"||f.paper.id===paperRevisionId)
     &&(examId==="all"||f.snapshot.examId===examId)
     &&(mode==="all"||f.snapshot.mode===mode)
     &&(status==="all"||completed===(status==="complete"))
     &&(!search||text.includes(search));
  }).sort((a,b)=>(
   sort==="oldest"?a.startedAt-b.startedAt:b.startedAt-a.startedAt
  )||a.id.localeCompare(b.id));
  assert.deepEqual(ids(actual),ids(expected),"model iteration "+iteration+" / "+JSON.stringify(query));
 }
 assert.deepEqual(attempts,baseline,"History queries modified source, signed keys or scores");
});

test("P47-2 frozen exam/mode filter survives removal of its imported package",()=>{
 const records=base(),pack=new Map();
 assert.deepEqual(ids(filteredHistory(records,pack,{...DEFAULT_HISTORY_QUERY,examId:"pgdba"})),["pgdba"]);
 const html=historyHTML(records,pack,{...DEFAULT_HISTORY_QUERY,examId:"pgdba"},false,false,"");
 assert.match(html,/id="g-history-exam"/);
 assert.match(html,/value="pgdba" selected/);
 assert.match(html,/data-attempt="pgdba"/);
 assert.doesNotMatch(html,/data-attempt="cat"/);
 assert.match(html,/1 of 4 records shown/);
 assert.match(html,/Insights below always cover all saved attempts/);
});
test("P47-2 local attempt-start dates are inclusive at both boundaries, not completion dates",()=>{
 const oldTZ=process.env.TZ;
 try{
  process.env.TZ="Asia/Kolkata";
  const at=(y,m,d,h,min)=>Date.UTC(y,m-1,d,h,min);
  const before=mk("before","cat",at(2026,11,2,18,29)); // 23:59 IST 2 Nov
  const start=mk("start","cat",at(2026,11,2,18,30)); // 00:00 IST 3 Nov
  const end=mk("end","cat",at(2026,11,3,18,29),true); // 23:59 IST 3 Nov; completes 4 Nov UTC
  const after=mk("after","cat",at(2026,11,3,18,30));
  assert.equal(localAttemptDate(start.startedAt),"2026-11-03");
  assert.equal(localAttemptDate(before.startedAt),"2026-11-02");
  const q={...DEFAULT_HISTORY_QUERY,startedFrom:"2026-11-03",startedTo:"2026-11-03"};
  assert.deepEqual(ids(filteredHistory([after,end,before,start],new Map(),q)),["end","start"]);
  assert.equal(historyQueryError(q),null);
  process.env.TZ="America/New_York";
  assert.equal(localAttemptDate(start.startedAt),"2026-11-02",
    "must follow user's local calendar, not assume the CI environment's UTC day");
 }finally{
  if(oldTZ===undefined)delete process.env.TZ;
  else process.env.TZ=oldTZ;
 }
});
test("P47-2 leap day, noncalendar dates, malformed strings and reversed ranges fail visibly",()=>{
 const q={...DEFAULT_HISTORY_QUERY};
 assert.equal(historyQueryError({...q,startedFrom:"2028-02-29",startedTo:"2028-03-01"}),null);
 for(const bad of ["2026-02-29","2026-13-02","2026-00-01","2026-11-31",
   "2026-1-3","0000-01-01","<img src=x>"]){
  const invalid={...q,startedFrom:bad};
  assert.match(historyQueryError(invalid),/Invalid From date/);
  assert.deepEqual(filteredHistory(base(),new Map(),invalid),[]);
 }
 assert.match(historyQueryError({...q,startedTo:"2026-02-30"}),/Invalid To date/);
 const reversed={...q,startedFrom:"2026-11-04",startedTo:"2026-11-03"};
 assert.match(historyQueryError(reversed),/From date must not/);
 const html=historyHTML(base(),new Map(),reversed,false,false,"");
 assert.match(html,/id="g-history-filter-error" role="alert"/);
 assert.match(html,/0 of 4 records shown/);
});
test("P47-2 Reset and active count distinguish sort order from limiting filters",()=>{
 assert.equal(activeHistoryFilterCount(DEFAULT_HISTORY_QUERY),0);
 assert.equal(activeHistoryFilterCount({...DEFAULT_HISTORY_QUERY,sort:"oldest"}),0);
 assert.equal(activeHistoryFilterCount({...DEFAULT_HISTORY_QUERY,search:"  "}),0);
 const q={...DEFAULT_HISTORY_QUERY,search:"cat",status:"complete",examId:"cat",
  mode:"custom-practice",paperRevisionId:"rev-paper",startedFrom:"2026-10-01",startedTo:"2026-11-03"};
 assert.equal(activeHistoryFilterCount(q),7);
 const html=historyHTML(base(),new Map(),q,false,false,"");
 assert.match(html,/7 active filters/);
 assert.match(html,/id="g-history-reset"/);
 assert.match(html,/Started from \(local\)/);
 assert.match(html,/Started through \(local\)/);
 const reset=historyHTML(base(),new Map(),DEFAULT_HISTORY_QUERY,false,false,"");
 assert.match(reset,/0 active filters/);
 assert.match(reset,/id="g-history-reset" disabled/);
});
test("P47-2 session query restore is bounded and refuses hostile/invalid data",()=>{
 const q={...DEFAULT_HISTORY_QUERY,examId:"cat",mode:"custom-practice",startedFrom:"2026-11-03"};
 assert.deepEqual(restoreHistoryQuery(JSON.parse(JSON.stringify(q))),q);
 for(const bad of [null,[],{}, {status:"unknown",sort:"newest",search:""},
  {...q,search:"a".repeat(201)}, {...q,startedTo:"bad"},
  {...q,startedTo:"2026-11-02"}, {...q,mode:{nested:"x"}}]){
  assert.deepEqual(restoreHistoryQuery(bad),DEFAULT_HISTORY_QUERY);
 }
});
test("P47-2 filtering cannot affect all-time metrics or immutable attempt scores",()=>{
 const attempts=base(),snapshot=structuredClone(attempts);
 const all=historyHTML(attempts,new Map(),DEFAULT_HISTORY_QUERY,false,false,"");
 const subset=historyHTML(attempts,new Map(),{...DEFAULT_HISTORY_QUERY,examId:"pgdba"},
   false,false,"");
 const metrics=html=>{
  const marker='<div class="history-summary">';
  const start=html.indexOf(marker);
  const finish=html.indexOf('</div><p class="fine">Mock-style',start);
  assert.ok(start>=0&&finish>start,"complete current-summary block must be present");
  return html.slice(start,finish);
 };
 assert.equal(metrics(all),metrics(subset),
  "archive filters must not change the all-time metrics, denominators or score values");
 // In addition to exact totals, check the labels and the separately filtered archive count.
 for(const phrase of ['Total attempts','Completed','In progress','Papers practised','Best adjusted %','Mock accuracy']){
  assert.ok(all.includes(phrase)&&subset.includes(phrase),phrase);
 }
 assert.match(subset,/1 of 4 records shown/);
 assert.match(all,/4 of 4 records shown/);
 assert.equal((all.match(/<div class="summary-stat">/g)||[]).length,
   (subset.match(/<div class="summary-stat">/g)||[]).length);
 assert.deepEqual(attempts,snapshot);
});
