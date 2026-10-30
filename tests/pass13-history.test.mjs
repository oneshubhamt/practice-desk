import test from "node:test";
import assert from "node:assert/strict";
import { readPracticeSelection,writePracticeSelection,validatePracticeSelection,PRACTICE_SELECTION_KEY } from "../src/app/practice-selection.ts";
import { adjustedHistoryMetrics,comparableScoreTrends } from "../src/app/history-metrics.ts";
import { filteredHistory,historyHTML } from "../src/app/history-page.ts";
import { builtinCglPackages,configureCglPractice,startGenericAttempt,transitionGenericAttempt } from "../src/app/exam-package.ts";
import { readFile } from "node:fs/promises";

const papers=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const all=builtinCglPackages(papers,patches);
const source=all.find(p=>p.paper.edition==="source");
const reviewed=all.find(p=>p.paper.edition==="reviewed"&&p.paper.paperId===source.paper.paperId);
const packages=new Map(all.map(p=>[p.paper.id,p]));
const ended=(p,id,time)=>{
 const attempt=startGenericAttempt(p,id,time);
 return transitionGenericAttempt(attempt,{type:"SUBMIT_ATTEMPT",nowMs:time+1000},
  new Map(p.questions.map(q=>[q.id,q])));
};

test("device-local exam choice validates arbitrary exam revisions and survives corrupt storage",()=>{
 const store=new Map();
 const adapter={getItem:key=>store.get(key)??null,setItem:(key,v)=>store.set(key,v)};
 const selection={schema:1,paperRevisionId:"external:exam:2026:v3",mode:"single",section:12};
 assert.deepEqual(writePracticeSelection(selection,adapter),selection);
 assert.deepEqual(readPracticeSelection(adapter),selection);
 assert.equal(store.has(PRACTICE_SELECTION_KEY),true);
 for(const value of [{...selection,section:-1},{...selection,mode:"random"},
  {...selection,paperRevisionId:""},{...selection,section:Infinity}]){
   assert.throws(()=>validatePracticeSelection(value),/Invalid/);
 }
 store.set(PRACTICE_SELECTION_KEY,"{invalid");
 assert.equal(readPracticeSelection(adapter),null);
});
test("exact frozen paper edition filtering combines with free text and status",()=>{
 const a=ended(source,"original",1000),b=ended(reviewed,"reviewed",2000);
 const pending=startGenericAttempt(reviewed,"pending",3000);
 const query={status:"all",sort:"newest",search:"",paperRevisionId:reviewed.paper.id};
 assert.deepEqual(filteredHistory([a,b,pending],packages,query).map(x=>x.id),["pending","reviewed"]);
 assert.deepEqual(filteredHistory([a,b,pending],packages,{...query,status:"complete"}).map(x=>x.id),["reviewed"]);
 assert.deepEqual(filteredHistory([a,b,pending],packages,{...query,search:"no matching paper"}),[]);
 const html=historyHTML([a,b,pending],packages,query,false,false,"","indexeddb");
 assert.match(html,/g-history-paper/);assert.match(html,/g-delete-completed/);
 assert.match(html,/g-storage-quota/);assert.match(html,/g-storage-persist/);
 assert.match(html,/IndexedDB/);assert.match(html,/Papers practised/);
 const fallback=historyHTML([a,b],packages,query,false,false,"","fallback");
 assert.match(fallback,/localStorage fallback/);
});
test("adjusted score trends require exact frozen key, revision and practice mode",()=>{
 const original=ended(source,"s1",1000),second=ended(source,"s2",2000);
 const corrected=ended(reviewed,"review",3000);
 const flexible=configureCglPractice(source,"free");
 const free=ended(flexible,"free",4000);
 const metrics=adjustedHistoryMetrics([original,second,corrected,free]);
 assert.equal(metrics.papersPractised,1);
 assert.equal(metrics.bestAdjustedPercent,0);
 const groups=comparableScoreTrends([original,second,corrected,free]);
 assert.equal(groups.length,3);
 assert.equal(groups.find(x=>x.count===2)?.points.length,2);
 const page=historyHTML([original,second,corrected,free],packages,
  {status:"all",sort:"newest",search:""},false,false,"");
 assert.match(page,/Adjusted score progression/);
 assert.match(page,/eligible automated maximum/);
});
