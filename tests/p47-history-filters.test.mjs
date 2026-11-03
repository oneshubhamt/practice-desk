/** P47-2: frozen History query and archive filter integration contracts.
 * No test imports the stateful coordinator; no saved record is modified.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt,transitionGenericAttempt} from "../src/app/exam-package.ts";
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
test("P47-2 combines exam ID, exact mode, frozen paper, status, search and sort with AND",()=>{
 const attempts=base();
 const clone={...attempts[2],id:"variant-mode",frozen:{...attempts[2].frozen,
   snapshot:{...attempts[2].frozen.snapshot,mode:"full-paper-practice"}}};
 const all=[...attempts,clone],pack=new Map();
 const q={...DEFAULT_HISTORY_QUERY,examId:"upsc-epfo-apfc",mode:"custom-practice",
   paperRevisionId:clone.frozen.paper.id,status:"progress",search:"paper"};
 // Plain fixture paper ID is 'paper'; text-search searches frozen paperId, not synthetic ID.
 assert.deepEqual(ids(filteredHistory(all,pack,q)),["apfc"]);
 assert.deepEqual(ids(filteredHistory(all,pack,{...q,mode:"full-paper-practice"})),["variant-mode"]);
 assert.deepEqual(filteredHistory(all,pack,{...q,examId:"cat"}),[]);
 assert.deepEqual(ids(filteredHistory(all,pack,{...DEFAULT_HISTORY_QUERY,status:"complete",sort:"oldest"})),
   ["cat-earlier","cat","pgdba"]);
 assert.deepEqual(ids(filteredHistory(all,pack,{...DEFAULT_HISTORY_QUERY,search:"never-matched"})),[]);
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
test("P47-2 stable same-start ordering and no input mutation",()=>{
 const records=base();
 const same=records.map((x,i)=>({...x,startedAt:123456,id:["z","c","a","d"][i]}));
 const original=structuredClone(same);
 assert.deepEqual(ids(filteredHistory(same,new Map(),DEFAULT_HISTORY_QUERY)),["a","c","d","z"]);
 assert.deepEqual(ids(filteredHistory(same,new Map(),{...DEFAULT_HISTORY_QUERY,sort:"oldest"})),["a","c","d","z"]);
 assert.deepEqual(same,original);
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
  const matched=html.match(/<div class="history-summary">([\\s\\S]*?)<\\/div><p class="fine">Mock-style/);
  assert.ok(matched,"complete current-summary block must be present");
  return matched[1];
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
