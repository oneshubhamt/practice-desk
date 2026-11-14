/** Canonical executable contracts, grouped by stable product responsibility. */
import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {pkg,questions} from "./fixtures/six-kinds.mjs";
import {builtinCglPackages,configureCglPractice,validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {crossPaperMarksPriorities} from "../src/app/history-priorities.ts";
import {frozenScoreSummary} from "../src/app/history-score.ts";
import * as __suite_dep_7 from "../src/app/history-page.ts";
import {filteredHistory} from "../src/app/history-query.ts";
import {scoreableMaximum,sectionScoreSummaries} from "../src/engine/score-ceiling.ts";
import {validateGenericStoredRecord} from "../src/app/stored-record-validator.ts";
import {readPracticeSetups,writePracticeSetups,validatePracticeSetups,PRACTICE_SETUPS_KEY} from "../src/app/practice-selection.ts";
import {adjustedHistoryMetrics,comparableScoreTrends} from "../src/app/history-metrics.ts";
import {sha256} from "../src/domain/hash.ts";
import * as __suite_dep_13 from "../src/history/backup.ts";
import {validateDisplayPreferences} from "../src/app/preferences.ts";
import {assertWriteVersion,nextWriteVersion} from "../src/history/concurrency.ts";
import {importCglBank} from "../src/content/import-cgl.ts";
import {freezeAttempt,assertFrozenContent,restoreSession,chooseRecovered} from "../src/history/frozen.ts";
import {startSession,transition} from "../src/engine/session.ts";
import {scoreAttempt} from "../src/engine/scoring.ts";
import * as __suite_storage_health from "../src/app/storage-health.ts";

/** Cross Paper Trends — canonical domain contracts. */
async function registerCrossPaperTrendsTests(){
const historyHTML = __suite_dep_7["historyHTML"];
const sectionPriorities = __suite_dep_7["sectionPriorities"];
const bank=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patch=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const editions=builtinCglPackages(bank,patch);
const originals=editions.filter(p=>p.paper.edition==="source");
const reviewed=editions.filter(p=>p.paper.edition==="reviewed");
const questionMap=(bundle)=>new Map(bundle.questions.map(q=>[q.id,q]));
const act=(type,nowMs,extra={})=>({type,nowMs,...extra});
function finish(bundle,id,startedAt,sectionAnswers={},mode="exam-simulation"){
 let a=startGenericAttempt(bundle,id,startedAt,mode);
 const qmap=questionMap(bundle);
 let time=startedAt;
 for(let section=0;section<bundle.paper.sections.length;section++){
   const questionIds=bundle.paper.sections[section].questionRevisionIds;
   for(const [index,right] of sectionAnswers[section]??[]){
     a=transitionGenericAttempt(a,act("NAVIGATE",++time,{sectionIndex:section,questionIndex:index}),qmap);
     const qid=questionIds[index];
     const answer=bundle.answerKey.entries.find(e=>e.questionRevisionId===qid)?.answer;
     const q=bundle.questions.find(q=>q.id===qid);
     assert.equal(answer?.kind,"single-choice");
     assert.equal(q?.content.kind,"single-choice");
     const option=right?answer.optionId:q.content.options.find(o=>o.id!==answer.optionId).id;
     a=transitionGenericAttempt(a,act("ANSWER",++time,{response:{kind:"single-choice",optionId:option}}),qmap);
   }
   const last=section===bundle.paper.sections.length-1;
   // Sectional strict exams must finish via section submission, including the
   // final section; direct SUBMIT_ATTEMPT cannot bypass the section policy.
   const action=bundle.paper.timing.kind==="sectional"?"SUBMIT_SECTION":
     last?"SUBMIT_ATTEMPT":"SUBMIT_SECTION";
   a=transitionGenericAttempt(a,act(action,++time),qmap);
 }
 assert.notEqual(a.finishedAt,null);
 assert.doesNotThrow(()=>validateGenericStoredRecord(a));
 return a;
}

test("F03: rank frozen adjusted marks, not accuracy, across two real compatible full CGL papers",()=>{
 const one=configureCglPractice(originals[0],"strict");
 const two=configureCglPractice(originals[1],"strict");
 const answers={0:[[0,true]],1:[[0,true],[1,true],[2,true],[3,true],[4,true],
   [5,false],[6,false],[7,false],[8,false],[9,false]]};
 const a=finish(one,"a",1000,answers),b=finish(two,"b",2000,answers);
 const marks=crossPaperMarksPriorities([b,a]);
 assert.ok(marks);
 assert.equal(marks.attempts,2);
 assert.equal(marks.distinctPapers,2);
 assert.equal(marks.mode,"exam-simulation");
 const section1=marks.rows.find(x=>x.title===one.paper.sections[0].title);
 const section2=marks.rows.find(x=>x.title===one.paper.sections[1].title);
 assert.ok(section1&&section2);
 assert.ok(section1.percent<section2.percent,"Low-coverage all-correct section must rank lower by marks share");
 assert.ok(section1.accuracy>section2.accuracy,"Accuracy alone gives the opposite section ordering");
 const rows=[sectionScoreSummaries(a,a.result),sectionScoreSummaries(b,b.result)];
 assert.equal(section1.eligibleMax,rows[0][0].eligibleMax+rows[1][0].eligibleMax);
 assert.equal(section1.earned,rows[0][0].marks+rows[1][0].marks);
 assert.equal(marks.rows[0].percent,0,"Unanswered sections correctly remain at zero share");
 const accuracy=sectionPriorities([a,b]);
 assert.ok(accuracy.length>0,"Previous accuracy lens remains independently available");
});

test("F03: eight newest qualifying full-paper records limit cohort; single and unrelated modes excluded",()=>{
 const base=originals.slice(0,2).map(p=>configureCglPractice(p,"strict"));
 const attempts=Array.from({length:10},(_,i)=>finish(base[i%2],"id-"+i,10000+i*1000,{}));
 // All have zero marks but still have true eligible maximum.
 const result=crossPaperMarksPriorities(attempts);
 assert.ok(result);
 assert.equal(result.attempts,8);
 assert.equal(result.distinctPapers,2);
 assert.equal(result.rows[0].earned,0);
 const single=finish(configureCglPractice(originals[0],"single",0),"single",40000,{});
 assert.equal(crossPaperMarksPriorities([single,...attempts]).attempts,8);
 const reviewedAttempt=finish(configureCglPractice(reviewed[0],"strict"),"reviewed",50000,{});
 const mixed=crossPaperMarksPriorities([reviewedAttempt,...attempts]);
 assert.equal(mixed.edition,"source","One newer reviewed edition must not join the original-source cohort");
 const free=finish(configureCglPractice(originals[0],"free"),"free",60000,{});
 assert.equal(crossPaperMarksPriorities([free,...attempts]).mode,"exam-simulation");
 assert.equal(crossPaperMarksPriorities([attempts[0],attempts[2]]),null,
   "Repeated attempts at only one paper do not constitute cross-paper evidence");
});

test("F03: separate exam identities and differently structured papers cannot produce false cross-paper groups",()=>{
 const p=originals.slice(0,2).map(p=>configureCglPractice(p,"strict"));
 const a=finish(p[0],"first",1000,{});
 const b=finish(p[1],"second",2000,{});
 const swappedExam=structuredClone(b);
 swappedExam.frozen.snapshot.examId="a-different-exam";
 assert.equal(crossPaperMarksPriorities([a,swappedExam]),null);
 const swappedSection=structuredClone(b);
 swappedSection.frozen.paper.sections[1].title="Different sectional blueprint";
 assert.equal(crossPaperMarksPriorities([a,swappedSection]),null);
 const changedScheme=structuredClone(b);
 changedScheme.frozen.paper.scoring.defaultRule.correctMarks=7;
 assert.equal(crossPaperMarksPriorities([a,changedScheme]),null);
 const changedTiming=structuredClone(b);
 changedTiming.frozen.paper.timing.transition="manual";
 assert.equal(crossPaperMarksPriorities([a,changedTiming]),null);
 const changedNavigation=structuredClone(b);
 changedNavigation.frozen.paper.navigation.questionNavigation="forward-only";
 assert.equal(crossPaperMarksPriorities([a,changedNavigation]),null);
 const changedItemRule=structuredClone(b);
 changedItemRule.frozen.key.entries[0].scoringOverride={
   correctMarks:5,incorrectMarks:-1,unansweredMarks:0};
 assert.equal(crossPaperMarksPriorities([a,changedItemRule]),null,
   "An item-specific grading override must separate otherwise identical format cohorts");
});

test("F03: negative earned marks stay visible while progress width can be clamped for display",()=>{
 const a=finish(configureCglPractice(originals[0],"strict"),"bad-a",1000,{0:[[0,false]]});
 const b=finish(configureCglPractice(originals[1],"strict"),"bad-b",2000,{0:[[0,false]]});
 const result=crossPaperMarksPriorities([a,b]);
 assert.ok(result);
 const first=result.rows.find(row=>row.title===a.frozen.paper.sections[0].title);
 assert.ok(first.percent<0);
 const html=historyHTML([a,b],new Map(),{status:"all",sort:"newest",search:""},false,false,"");
 assert.match(html,/Cross-paper marks priorities/);
 assert.match(html,/-[0-9.]+% marks/);
 assert.doesNotMatch(html,/width:-/);
});

test("F04: archive uses attempt's frozen eligible maximum, not nominal 100-paper marks",()=>{
 const strict=finish(configureCglPractice(originals[0],"strict"),"whole",1000,{});
 const single=finish(configureCglPractice(originals[0],"single",2),"section",2000,{},"section-practice");
 const maxFull=scoreableMaximum(strict.frozen.paper,strict.frozen.key,strict.frozen.questions);
 const maxSingle=scoreableMaximum(single.frozen.paper,single.frozen.key,single.frozen.questions);
 assert.ok(maxFull>maxSingle);
 assert.equal(frozenScoreSummary(strict).maximum,maxFull);
 assert.equal(frozenScoreSummary(single).maximum,maxSingle);
 const html=historyHTML([strict,single],new Map(),{status:"all",sort:"newest",search:""},false,false,"");
 assert.ok(html.includes(frozenScoreSummary(strict).text));
 assert.ok(html.includes(frozenScoreSummary(single).text));
 assert.match(html,/section practice/);
 assert.match(html,/exam simulation/);
 const pending=startGenericAttempt(validateExamPackage(pkg),"unfinished",1000);
 assert.equal(frozenScoreSummary(pending),null);
 assert.match(historyHTML([pending],new Map(),{status:"all",sort:"newest",search:""},false,false,""),
   /In progress/);
});

test("F05 adjacent: archive status filters retain separate complete and progress workflows",()=>{
 const complete=finish(configureCglPractice(originals[0],"strict"),"complete",1000,{});
 const progress=startGenericAttempt(validateExamPackage(pkg),"progress",3000);
 const packages=new Map();
 assert.deepEqual(filteredHistory([complete,progress],packages,{status:"complete",sort:"newest",search:""}).map(x=>x.id),["complete"]);
 assert.deepEqual(filteredHistory([complete,progress],packages,{status:"progress",sort:"newest",search:""}).map(x=>x.id),["progress"]);
});
}
await registerCrossPaperTrendsTests();

/** History Preferences — canonical domain contracts. */
async function registerHistoryPreferencesTests(){
const historyHTML = __suite_dep_7["historyHTML"];
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

test("P43 one per-family selection map validates independent paper and timing preferences",()=>{
 const store=new Map();
 const adapter={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 const settings={schema:2,selectedFamilyId:"imported:upsc-epfo-apfc",families:{
   "builtin:ssc-cgl":{paperRevisionId:"cgl:r10",mode:"single",section:2,untimed:true,edition:"reviewed"},
   "imported:upsc-epfo-apfc":{paperRevisionId:"apfc:r1",mode:"strict",section:0,untimed:false,edition:"reviewed"},
   "imported:my-six-kinds":{paperRevisionId:"six:r2",mode:"free",section:0,untimed:true,edition:"source"}
 }};
 assert.deepEqual(writePracticeSetups(settings,adapter),settings);
 assert.deepEqual(readPracticeSetups(adapter),settings);
 assert.equal(store.has(PRACTICE_SETUPS_KEY),true);
 for(const value of [
   {...settings,selectedFamilyId:"not-present"},
   {...settings,families:{"builtin:ssc-cgl":{...settings.families["builtin:ssc-cgl"],section:-1}}},
   {...settings,families:{"builtin:ssc-cgl":{...settings.families["builtin:ssc-cgl"],mode:"random"}}},
   {...settings,families:{"builtin:ssc-cgl":{...settings.families["builtin:ssc-cgl"],paperRevisionId:""}}}
 ])assert.throws(()=>validatePracticeSetups(value),/Invalid/);
 store.set(PRACTICE_SETUPS_KEY,"{invalid");
 assert.equal(readPracticeSetups(adapter),null);
});
test("exact frozen paper edition filtering combines with free text and status",()=>{
 const a=ended(configureCglPractice(source,"free"),"original",1000),
 b=ended(configureCglPractice(reviewed,"free"),"reviewed",2000);
 const pending=startGenericAttempt(configureCglPractice(reviewed,"free"),"pending",3000);
 const query={status:"all",sort:"newest",search:"",paperRevisionId:configureCglPractice(reviewed,"free").paper.id};
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
 const flexible=configureCglPractice(source,"free");
 const original=ended(flexible,"s1",1000),second=ended(flexible,"s2",2000);
 const corrected=ended(configureCglPractice(reviewed,"free"),"review",3000);
 const single=configureCglPractice(source,"single",0);
 const free=ended(single,"single",4000);
 const metrics=adjustedHistoryMetrics([original,second,corrected,free]);
 assert.equal(metrics.papersPractised,1);
 assert.equal(metrics.bestAdjustedPercent,0);
 const groups=comparableScoreTrends([original,second,corrected,free]);
 assert.equal(groups.length,0,"Unanswered attempts cannot create synthetic score trends");
 const answered=transitionGenericAttempt(startGenericAttempt(flexible,"answered",5000),
  {type:"ANSWER",nowMs:5001,response:{kind:"single-choice",optionId:flexible.questions[0].content.options[0].id}},
  new Map(flexible.questions.map(q=>[q.id,q])));
 const graded=transitionGenericAttempt(answered,{type:"SUBMIT_ATTEMPT",nowMs:5100},
  new Map(flexible.questions.map(q=>[q.id,q])));
 assert.equal(comparableScoreTrends([graded]).length,1);
 const page=historyHTML([original,second,corrected,free],packages,
  {status:"all",sort:"newest",search:""},false,false,"");
 assert.match(page,/Repeat the same frozen paper, key and mode/);
});

test("P43 portable family setups survive canonical backup with checksum protection",async()=>{
 const {makeBackup,verifyBackup}=await import("../src/history/backup.ts");
 const preferences={schema:1,dark:false,scale:100};
 const setups={schema:2,selectedFamilyId:"builtin:ssc-cgl",families:{
   "builtin:ssc-cgl":{paperRevisionId:"cgl:r1",mode:"single",section:2,untimed:true,edition:"reviewed"},
   "imported:apfc":{paperRevisionId:"apfc:r1",mode:"strict",section:0,untimed:false,edition:"reviewed"}
 }};
 const backup=makeBackup([],preferences,"2026-10-30T00:00:00.000Z",setups);
 assert.equal(backup.version,5);
 assert.deepEqual(verifyBackup(backup).setups,setups);
 const modified=structuredClone(backup);
 modified.setups.families["builtin:ssc-cgl"].section=1;
 assert.throws(()=>verifyBackup(modified),/integrity/i);
});

}
await registerHistoryPreferencesTests();

/** Persistence Concurrency — canonical domain contracts. */
async function registerPersistenceConcurrencyTests(){
const makeBackup = __suite_dep_13["makeBackup"];
const verifyBackup = __suite_dep_13["verifyBackup"];
const planBackupMerge = __suite_dep_13["planBackupMerge"];
const preferences={schema:1,dark:true,scale:115};
test("SHA-256 standard vectors and UTF-8",()=>{
 assert.equal(sha256("abc"),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 assert.equal(sha256(new TextEncoder().encode("abc")),"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
 assert.equal(sha256(""),"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
 assert.equal(sha256("The quick brown fox jumps over the lazy dog"),"d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592");
});

test("preferences import validates range and type",()=>{
 assert.deepEqual(validateDisplayPreferences(preferences),preferences);
 assert.throws(()=>validateDisplayPreferences({schema:1,dark:false,scale:999}),/preferences/);
 assert.throws(()=>makeBackup([],{schema:1,dark:"no",scale:100},"2026-10-29T00:00:00Z"),/preferences/);
});



// Compare-and-swap invariants; retained from storage-concurrency.test.mjs.


// Deterministic adversarial scenarios; retained from contract-persistence-properties.test.mjs.
{
const preferences={schema:1,dark:false,scale:100};
const at="2026-11-01T10:00:00Z";
function rng(seed){let x=seed>>>0;return n=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)%n;};}

test("seeded two-tab compare-and-swap interleavings reject stale writes, preserve stored revision",()=>{
 for(let seed=1;seed<=250;seed++){
  const random=rng(0x360123^seed);
  let stored=undefined;
  const expected=[null,null,null];
  for(let step=0;step<150;step++){
   const tab=random(expected.length);
   if(random(4)===0){expected[tab]=stored?.saveRevision??null;continue;}
   const observed=stored?.saveRevision??null;
   const version=expected[tab];
   const permitted=version===observed;
   if(permitted){
    assert.doesNotThrow(()=>assertWriteVersion(stored,version),
     "seed="+seed+" step="+step+" tab="+tab+" legal CAS");
    const newRevision=nextWriteVersion(version);
    assert.equal(newRevision,(observed??0)+1);
    stored={saveRevision:newRevision,by:tab};
    expected[tab]=newRevision;
   }else{
    const before=structuredClone(stored);
    assert.throws(()=>assertWriteVersion(stored,version),/Another tab/,
     "seed="+seed+" step="+step+" tab="+tab+" stale CAS");
    assert.deepEqual(stored,before,"rejected tab must not mutate observed saved state");
   }
  }
  assert.ok(stored===undefined||stored.saveRevision>=1);
 }
});

test("generated additive merge is deterministic, idempotent, ordered and non-destructive",()=>{
 for(let seed=1;seed<=200;seed++){
  const random=rng(0x36a11a^seed);
  const existing=Array.from({length:random(25)},(_,i)=>({id:"id-"+i,origin:"original"}));
  const incoming=Array.from({length:random(50)},(_,i)=>({
   id:"id-"+random(65),origin:"import-"+i}));
  const activeId="id-"+random(65);
  const expected=[];
  const seen=new Set([...existing.map(x=>x.id),activeId]);
  for(const record of incoming)if(!seen.has(record.id)){
   seen.add(record.id);expected.push(record);
  }
  const added=planBackupMerge(existing,incoming,activeId);
  assert.deepEqual(added,expected,"seed="+seed+" independent first-occurrence reference");
  const accumulated=[...existing,...added];
  assert.deepEqual(planBackupMerge(accumulated,incoming,activeId),[],
   "seed="+seed+" importing same backup twice is idempotent");
  assert.deepEqual(existing.map(x=>x.origin),existing.map(()=>"original"),
   "seed="+seed+" no overwritten existing records");
  assert.equal(new Set([...existing,...added].map(x=>x.id)).size,accumulated.length,
   "seed="+seed+" merged IDs unique");
 }
});

test("canonical backup checksum covers records and preferences; size, IDs and timestamp are bounded",()=>{
 // Authenticated checksum alone must not launder unsupported envelope privileges.
 const unsigned=makeBackup([],{schema:1,dark:false,scale:100},"2026-11-04T03:15:00.000Z");
 assert.equal(verifyBackup(structuredClone(unsigned)).version,5);
 assert.throws(()=>verifyBackup({...unsigned,issuerSignature:"nonexistent"}),/unsupported envelope/);
 assert.throws(()=>verifyBackup({...unsigned,manifest:{...unsigned.manifest,privileged:true}}),/unsupported manifest/);

 // The reference property also verifies unlike record types in one canonical archive.
 // This replaces the separate three-record illustrative backup test.
 const heterogeneous=[
  {id:"opaque-note",recordType:"generic-note",saveRevision:1,finishedAt:null},
  {id:"paper",recordType:"generic-package",saveRevision:1},
  {id:"learn",recordType:"learning-card",saveRevision:1}
 ];
 const mixed=makeBackup(heterogeneous,preferences,"2026-10-29T11:00:00Z");
 assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(mixed))),mixed);
 assert.deepEqual(mixed.records,heterogeneous);
 assert.deepEqual(mixed.preferences,preferences);
 const changed=structuredClone(mixed);
 changed.records[0].finishedAt=999;
 assert.throws(()=>verifyBackup(changed),/integrity/);

 for(let count of [0,1,7,101,5000]){
  const records=Array.from({length:count},(_,i)=>({id:"r"+i,recordType:"opaque",saveRevision:1,answer:i%4}));
  const b=makeBackup(records,preferences,at);
  assert.deepEqual(verifyBackup(JSON.parse(JSON.stringify(b))),b,"count="+count);
  for(const mutate of [
   x=>{x.preferences.scale=110;},
   x=>{if(x.records.length)x.records[0].answer=99;else x.exportedAt="2026-11-02T10:00:00Z";},
   x=>{x.manifest.digest="0".repeat(64);},
   x=>{x.manifest.recordCount=count+1;},
  ]){
   const corrupted=structuredClone(b);
   mutate(corrupted);
   assert.throws(()=>verifyBackup(corrupted),"count="+count+" modified checksum payload");
  }
 }
 const over=makeBackup(Array.from({length:5001},(_,i)=>({id:"r"+i,recordType:"opaque",saveRevision:1})),preferences,at);
 assert.throws(()=>verifyBackup(over),/Invalid backup format/);
 const dups=makeBackup([{id:"x",recordType:"opaque",saveRevision:1},{id:"x",recordType:"opaque",saveRevision:1}],preferences,at);
 assert.throws(()=>verifyBackup(dups),/Invalid backup records/);
 const invalidName=makeBackup([{id:"x".repeat(201),recordType:"generic-note",saveRevision:1}],preferences,at);
 assert.throws(()=>verifyBackup(invalidName),/Invalid backup records/);
 assert.throws(()=>makeBackup([],preferences,"not-a-date"),/timestamp/);
});

test("new-record CAS uses null; persisted rows require revisions 1+ and progress monotonically",()=>{
 assert.doesNotThrow(()=>assertWriteVersion(undefined,null));
 assert.equal(nextWriteVersion(null),1);
 assert.equal(nextWriteVersion(12),13);
 assert.throws(()=>nextWriteVersion(0),/Invalid expected stored write revision/);
 assert.throws(()=>assertWriteVersion({},0),/Another tab/);
 assert.throws(()=>assertWriteVersion({saveRevision:0},0),/Another tab/);
 for(const current of [undefined,{saveRevision:1},{saveRevision:8}]){
  for(const expected of [null,1,8]){
   const allowed=expected===null?current===undefined:
    current!==undefined&&current.saveRevision===expected;
   if(allowed)assert.doesNotThrow(()=>assertWriteVersion(current,expected));
   else assert.throws(()=>assertWriteVersion(current,expected),/Another tab/);
  }
 }
});
}
}
await registerPersistenceConcurrencyTests();

/** Recovery And Replay — canonical domain contracts. */
async function registerRecoveryAndReplayTests(){
const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url)));
const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url)));
const first=importCglBank(sources,patches)[0];
const firstAssets=builtinCglPackages(sources,patches)[0];

test("frozen attempt survives a later changed key, paper or editorial state",()=>{
 const frozen=freezeAttempt(first.paper,first.key,first.questions,firstAssets.stimuli,firstAssets.assets,"exam-simulation","2026-10-28T05:00:00Z","ssc-cgl");
 assertFrozenContent(frozen);
 assert.notEqual(frozen.paper,first.paper);
 const old=scoreAttempt(frozen.paper,frozen.key,frozen.questions,[],frozen.frozenAt).snapshot;
 const newKey=structuredClone(first.key);
 newKey.entries[0].answer.optionId="an-edited-answer";
 assert.equal(scoreAttempt(frozen.paper,frozen.key,frozen.questions,[],frozen.frozenAt).snapshot.unansweredCount,old.unansweredCount);
 assert.notEqual(frozen.key.entries[0].answer.optionId,newKey.entries[0].answer.optionId);
 assert.throws(()=>assertFrozenContent({...frozen,snapshot:{...frozen.snapshot,paperRevisionId:"wrong"}}),/Invalid or mismatched/);
});
test("saved strict session expires while app is closed, without fictitious foreground viewing",()=>{
 // The actual strict CGL mode is automatic; the raw source package's
 // manual timing contract intentionally waits for a user transition.
 const strict=configureCglPractice(firstAssets,"strict",0);
 const saved=transition(strict.paper,startSession(strict.paper,0),{type:"VISIBILITY",nowMs:1000,visible:false});
 const restored=restoreSession(strict.paper,JSON.parse(JSON.stringify(saved)),3600001,true);
 assert.equal(restored.state.status,"completed");
 assert.equal(restored.state.elapsedMs,3600000);
 assert.equal(restored.state.foregroundMs,1000);
 assert.equal(restored.expired,true);
});
test("paused flexible attempt does not consume offline wall time",()=>{
 const paper={...first.paper,timing:{kind:"whole-paper",durationMs:3600000,pausePolicy:"allowed"}};
 const paused=transition(paper,startSession(paper,0),{type:"PAUSE",nowMs:200});
 const restored=restoreSession(paper,paused,999999,true);
 assert.equal(restored.state.elapsedMs,200);
 assert.equal(restored.state.status,"paused");
});
test("recover from clock rollback without assigning negative time",()=>{
 const state=startSession(first.paper,5000);
 const restored=restoreSession(first.paper,state,4000,true);
 assert.equal(restored.state.elapsedMs,0);
 assert.equal(restored.state.clockMs,4000);
});






/** Independent, exhaustive cross-product reference for the saved-vs-mirror
 * precedence contract. The original three hand-picked checks are retained
 * at the end as deterministic historical boundary witnesses.
 */
test("Recovery reference: 576 persisted/mirror precedence combinations, missing IDs, terminal and revision boundaries",()=>{
 const revisions=[undefined,0,8,9],finished=[null,90],timestamps=[null,100,200];
 let checked=0;
 for(const sr of revisions)for(const mr of revisions)
 for(const sf of finished)for(const mf of finished)
 for(const st of timestamps)for(const mt of timestamps){
  const stored={id:"same",startedAt:1,finishedAt:sf,updatedAt:st,saveRevision:sr};
  const mirror={id:"same",startedAt:1,finishedAt:mf,updatedAt:mt,saveRevision:mr};
  const savedBefore=structuredClone(stored),mirrorBefore=structuredClone(mirror);
  // Separate reference matrix: protected persisted revision wins first;
  // otherwise terminality wins; a timestamp is only a final tiebreaker.
  let expected;
  if(Number.isSafeInteger(sr)&&Number.isSafeInteger(mr)&&sr>=mr)
   expected=stored;
  else{
   const terminal=Number(Boolean(sf))-Number(Boolean(mf));
   if(terminal!==0)expected=terminal>0?stored:mirror;
   else expected=(mt??0)>(st??0)?mirror:stored;
  }
  const actual=chooseRecovered(stored,mirror);
  assert.equal(actual,expected,JSON.stringify({sr,mr,sf,mf,st,mt}));
  assert.deepEqual(stored,savedBefore,"source record mutated");
  assert.deepEqual(mirror,mirrorBefore,"emergency mirror mutated");
  checked++;
 }
 assert.equal(checked,576);
 const stored={id:"a",startedAt:1,updatedAt:100,finishedAt:90};
 const mirror={id:"a",startedAt:1,updatedAt:110,finishedAt:null};
 assert.equal(chooseRecovered(stored,mirror),stored);
 assert.equal(chooseRecovered(mirror,stored),stored);
 assert.equal(chooseRecovered(stored,{...stored,updatedAt:120}).updatedAt,120);
 const persisted={id:"same",startedAt:10,updatedAt:200,finishedAt:null,saveRevision:8};
 const stale={...persisted,updatedAt:300,saveRevision:7};
 assert.equal(chooseRecovered(persisted,stale),persisted);
 assert.equal(chooseRecovered(persisted,{...stale,saveRevision:8}),persisted);
 assert.equal(chooseRecovered(persisted,{...stale,saveRevision:9}).saveRevision,9);
 const saved={id:"a",startedAt:1,finishedAt:null,updatedAt:120,saveRevision:9};
 const older={...saved,finishedAt:100,updatedAt:200,saveRevision:8};
 assert.equal(chooseRecovered(saved,older),saved);
 assert.equal(chooseRecovered(undefined,mirror),mirror);
 assert.equal(chooseRecovered(stored,undefined),stored);
 assert.equal(chooseRecovered(stored,{...mirror,id:"different"}),stored);
});

}
await registerRecoveryAndReplayTests();

const p45test=test;
const p45assert=assert;

p45test("P45 History health distinguishes pending, locked, failure and browser eviction",()=>{
 const {historyHTML}=__suite_dep_7;
 const {healthSummary}=__suite_storage_health;
 const base={pendingWrites:0,lastCommittedAt:null,lastFailure:null,locked:false,loading:false,inMemoryRecords:0};
 p45assert.match(healthSummary({...base,loading:true}),/Loading stored records/);
 p45assert.match(healthSummary({...base,pendingWrites:2}),/2 writes pending/);
 p45assert.match(healthSummary({...base,locked:true}),/Writes locked/);
 p45assert.match(healthSummary(base),/can still be cleared or evicted/);
 const html=historyHTML([],new Map(),{status:"all",sort:"newest",search:""},false,false,"",
   "indexeddb",{...base,lastFailure:"<unknown&failure>",inMemoryRecords:17,lastCommittedAt:1730500000000});
 for(const id of ["g-storage-health","g-storage-last-failure","g-storage-last-commit",
   "g-storage-records","g-storage-backend"])p45assert.ok(html.includes('id="'+id+'"'));
 p45assert.ok(html.includes("17 records"));
 p45assert.ok(html.includes("&lt;unknown&amp;failure&gt;"),"Last error must remain escaped");
 p45assert.ok(!html.includes("<unknown&failure>"),"Untrusted error text must never become HTML");
 p45assert.ok(html.includes("No automatic or verified external backup is tracked"));
});

p45test("P45 compressed backup keeps canonical backup checksum and resists malformed gzip",async()=>{
 const {backupDownload,readBackupFile,PLAIN_BACKUP_LIMIT}=await import("../src/history/backup-file.ts");
 const {makeBackup,verifyBackup}=__suite_dep_13;
 const {DEFAULT_PREFERENCES:preferences}=await import("../src/app/preferences.ts");
 const archive=makeBackup([] ,preferences,"2026-11-02T00:00:00.000Z");
 const raw=JSON.stringify(archive);
 const small=await backupDownload(raw);
 p45assert.equal(small.extension,".json");
 p45assert.deepEqual(verifyBackup(await readBackupFile(new File([small.blob],"backup.json"))),archive);
 const gz=await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream("gzip"))).blob();
 p45assert.deepEqual(verifyBackup(await readBackupFile(new File([gz],"backup.json.gz"))),archive);
 await p45assert.rejects(readBackupFile(new File(["not gzip"],"broken.json.gz")),"Corrupted gzip must reject even when the browser wraps its reason as a TypeError");
 const big=await backupDownload(JSON.stringify({data:"z".repeat(40*1024*1024+500)}));
 p45assert.equal(big.extension,".json.gz");
 p45assert.ok(big.blob.size<100000,"Highly repetitive large JSON should compress");
 p45assert.ok(PLAIN_BACKUP_LIMIT>big.blob.size);
});

p45test("P45 one-pass backup serialization remains byte-identical to the current canonical format for every checked source",async()=>{
 const {makeBackup,serializeVerifiedBackup,verifyBackup}=await import("../src/history/backup.ts");
 const {DEFAULT_PREFERENCES}=await import("../src/app/preferences.ts");
 const stamp="2026-11-02T11:11:00.000Z";
 const rows=[{id:"opaque-note",recordType:"generic-note",saveRevision:7,
   content:{prompt:"IPC § & Unicode क",options:["A","B"]},
   result:{earnedMarks:2.5,sectionMarks:[0,2.5]}},
 {id:"learning-one",recordType:"learning-card",saveRevision:7,dueAt:stamp,
   note:"Quoted \"escaped\""}];
 const settings={schema:2,selectedFamilyId:"builtin:ssc-cgl",families:{
   "builtin:ssc-cgl":{paperRevisionId:"p1",mode:"strict",section:0,
     untimed:false,edition:"reviewed"}}};
 for(const [records,preferences,setups] of [
   [[],DEFAULT_PREFERENCES,undefined],
   [rows,DEFAULT_PREFERENCES,undefined],
   [rows,DEFAULT_PREFERENCES,settings]
 ]){
   const original=JSON.stringify(makeBackup(records,preferences,stamp,setups));
   const onePass=serializeVerifiedBackup(records,preferences,stamp,setups);
   p45assert.equal(onePass,original,"P45 export format must be exact current-format bytes");
   p45assert.deepEqual(verifyBackup(JSON.parse(onePass)),JSON.parse(original));
 }
});

p45test("P45-B identical frozen exam content uses one SHA-addressed snapshot across attempts",async()=>{
 const {compactAttempt,expandAttempt,reconstructRecords,sharedSnapshot,verifiedSnapshot}=await import("../src/history/shared-store.ts");
 const {builtinCglPackages}=await import("../src/app/exam-package.ts");
 const {readFile}=await import("node:fs/promises");
 const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
 const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
 const pkg=builtinCglPackages(sources,patches)[0];
 const {startGenericAttempt}=await import("../src/app/exam-package.ts");
 const first={...startGenericAttempt(pkg,"s1",1730000000000),saveRevision:1};
 const second={...startGenericAttempt(pkg,"s2",1730000001000),saveRevision:1};
 const a=compactAttempt(first),b=compactAttempt(second);
 const unsaved=compactAttempt(startGenericAttempt(pkg,"unsaved-row",1730000002000));
 p45assert.throws(()=>reconstructRecords([unsaved.row],[unsaved.snapshot]),/CAS revision 1 or greater/,
   "Revision zero is an in-memory pre-write state, never a durable row");
 p45assert.equal(a.snapshot.id,b.snapshot.id);
 p45assert.ok(!("frozen" in a.row),"Attempt should never repeat stored frozen source");
 p45assert.equal(a.row.frozenAt,first.frozen.frozenAt);
 p45assert.equal(verifiedSnapshot(a.snapshot),a.snapshot);
 const restored=reconstructRecords([a.row,b.row],[a.snapshot]);
 p45assert.equal(restored.length,2);
 p45assert.equal(restored[0].frozen.questions,restored[1].frozen.questions,
   "Reconstructed repeated revisions must share one physical immutable question graph");
 p45assert.equal(restored[0].frozen.frozenAt,first.frozen.frozenAt);
 p45assert.equal(restored[1].frozen.frozenAt,second.frozen.frozenAt);
 const {makeBackup,serializeVerifiedBackup,verifyBackup}=await import("../src/history/backup.ts");
 const {DEFAULT_PREFERENCES}=await import("../src/app/preferences.ts");
 const archive=makeBackup([first,second],DEFAULT_PREFERENCES,
   "2026-11-02T11:00:00.000Z");
 p45assert.equal(archive.version,5);
 p45assert.equal(archive.snapshots.length,1,"Backup must contain exactly one shared frozen source");
 p45assert.equal(archive.records.length,2);
 p45assert.ok(archive.records.every(r=>!("frozen" in r)));
 p45assert.equal(verifyBackup(archive),archive);
 p45assert.equal(serializeVerifiedBackup([first,second],DEFAULT_PREFERENCES,
   "2026-11-02T11:00:00.000Z"),JSON.stringify(archive));
 const importRows=reconstructRecords(archive.records,archive.snapshots);
 p45assert.equal(importRows[0].frozen.questions,importRows[1].frozen.questions);
 const forged=structuredClone(archive);
 forged.snapshots[0].body.questions[0].contentHash="0".repeat(64);
 p45assert.throws(()=>verifyBackup(forged),/Backup integrity/);
 const {validateGenericStoredRecord}=await import("../src/app/stored-record-validator.ts");
 for(const rec of restored)p45assert.equal(validateGenericStoredRecord(rec),rec);
 const corrupted=structuredClone(a.snapshot);
 corrupted.body.questions[0].content.prompt="altered";
 p45assert.throws(()=>verifiedSnapshot(corrupted),/SHA-256 mismatch/);
 p45assert.throws(()=>reconstructRecords([a.row],[]),/missing immutable snapshot/);
});

p45test("P45-B shared snapshot also stores publisher keys, source review and explanations once",async()=>{
 const {compactAttempt,reconstructRecords}=await import("../src/history/shared-store.ts");
 const {builtinCglPackages,startGenericAttempt}=await import("../src/app/exam-package.ts");
 const {createSourceKeyReference}=await import("../src/engine/source-comparison.ts");
 const {createSourceReviewReference}=await import("../src/engine/review-source.ts");
 const {makeBackup,verifyBackup}=await import("../src/history/backup.ts");
 const {DEFAULT_PREFERENCES}=await import("../src/app/preferences.ts");
 const {readFile}=await import("node:fs/promises");
 const sources=JSON.parse(await readFile(new URL("../src/content/papers.json",import.meta.url),"utf8"));
 const patches=JSON.parse(await readFile(new URL("../src/content/patches.json",import.meta.url),"utf8"));
 const all=builtinCglPackages(sources,patches);
 const reviewed=all.find(x=>x.paper.edition==="reviewed");
 const source=all.find(x=>x.paper.paperId===reviewed.paper.paperId&&x.paper.edition==="source");
 p45assert.ok(reviewed&&source);
 const key=createSourceKeyReference(reviewed,source);
 const review=createSourceReviewReference(reviewed,source);
 p45assert.ok(key&&review);
 const a={...startGenericAttempt(reviewed,"extras-a",1730000000000),saveRevision:1,
   sourceKeyReference:key,sourceReviewReference:review};
 const b={...startGenericAttempt(reviewed,"extras-b",1730000001000),saveRevision:1,
   sourceKeyReference:key,sourceReviewReference:review};
 const x=compactAttempt(a),y=compactAttempt(b);
 p45assert.equal(x.snapshot.id,y.snapshot.id);
 p45assert.ok(!("sourceKeyReference" in x.row)&&!("sourceReviewReference" in x.row));
 p45assert.equal(x.snapshot.body.sourceKeyReference,key);
 p45assert.equal(x.snapshot.body.sourceReviewReference,review);
 const archive=verifyBackup(makeBackup([a,b],DEFAULT_PREFERENCES,"2026-11-02T12:00:00.000Z"));
 p45assert.equal(archive.snapshots.length,1);
 const hydrated=reconstructRecords(archive.records,archive.snapshots);
 p45assert.deepEqual(hydrated[0].sourceKeyReference,key);
 p45assert.deepEqual(hydrated[1].sourceReviewReference,review);
 p45assert.equal(hydrated[0].frozen.questions,hydrated[1].frozen.questions);
});


p45test("Persistence backend contract gives fallback one CAS/add/delete path and detects external change",async()=>{
 const {createLocalFallbackWorkspaceStore}=await import("../src/history/workspace-store.ts");
 class MemoryStorage{
  values=new Map();
  fail=false;
  getItem(key){return this.values.has(key)?this.values.get(key):null;}
  setItem(key,value){if(this.fail)throw new Error("quota denied");this.values.set(key,String(value));}
  removeItem(key){this.values.delete(key);}
  clear(){this.values.clear();}
  key(index){return [...this.values.keys()][index]??null;}
  get length(){return this.values.size;}
 }
 const storage=new MemoryStorage();
 const store=createLocalFallbackWorkspaceStore(storage,"history");
 const loaded=await store.loadRecoverable();
 p45assert.deepEqual(loaded.records,[]);
 const first={id:"card-1",recordType:"learning-card",saveRevision:1};
 storage.fail=true;
 await p45assert.rejects(store.write(first,null),/quota denied/);
 p45assert.equal(storage.getItem("history"),null,
  "Failed fallback write must not create durable bytes");
 storage.fail=false;
 await store.write(first,null);
 await p45assert.rejects(store.write({...first,saveRevision:2},null),/Another tab already created/);
 await store.write({...first,saveRevision:2},1);
 await store.insertMany([{id:"card-2",recordType:"learning-card",saveRevision:1}]);
 p45assert.deepEqual(JSON.parse(storage.getItem("history")).map(x=>x.id),["card-1","card-2"]);
 await store.delete("card-2",1,"learning-card");
 p45assert.deepEqual(JSON.parse(storage.getItem("history")).map(x=>x.id),["card-1"]);

 const completed={id:"done",recordType:"generic-attempt",saveRevision:1,finishedAt:123};
 await store.insertMany([completed]);
 storage.fail=true;
 await p45assert.rejects(store.deleteCompleted([{id:"done",saveRevision:1}]),/quota denied/);
 p45assert.equal(JSON.parse(storage.getItem("history")).some(x=>x.id==="done"),true,
  "Failed fallback deletion must leave durable and in-memory state retryable");
 storage.fail=false;
 await store.deleteCompleted([{id:"done",saveRevision:1}]);
 p45assert.equal(JSON.parse(storage.getItem("history")).some(x=>x.id==="done"),false);

 const external=JSON.stringify([{id:"outside",recordType:"learning-card",saveRevision:1}]);
 storage.setItem("history",external);
 p45assert.equal(store.externalStorageChanged({key:"history",newValue:external}),true);
 await p45assert.rejects(
  store.write({id:"later",recordType:"learning-card",saveRevision:1},null),/Another tab changed/
 );
 p45assert.equal((await store.loadVerified()).records[0].id,"outside",
  "Recovery export reads authoritative fallback bytes even after a conflict");
});

p45test("Persistence backend refuses malformed fallback bytes without overwriting them",async()=>{
 const {createLocalFallbackWorkspaceStore}=await import("../src/history/workspace-store.ts");
 const storage={
  value:"{broken",
  getItem(){return this.value;},
  setItem(_key,value){this.value=String(value);},
  removeItem(){this.value=null;},
  clear(){this.value=null;},
  key(){return null;},
  get length(){return this.value===null?0:1;}
 };
 const store=createLocalFallbackWorkspaceStore(storage,"history");
 await p45assert.rejects(store.loadRecoverable(),/Unexpected token|JSON/);
 p45assert.equal(storage.value,"{broken","Malformed current bytes must remain untouched");
});


p45test("Persistence fallback quarantines duplicate identities instead of choosing a winner",async()=>{
 const {createLocalFallbackWorkspaceStore}=await import("../src/history/workspace-store.ts");
 const duplicated=JSON.stringify([
  {id:"duplicate",recordType:"learning-card",saveRevision:1},
  {id:"healthy",recordType:"learning-card",saveRevision:1},
  {id:"duplicate",recordType:"learning-card",saveRevision:2}
 ]);
 const storage={
  value:duplicated,
  getItem(){return this.value;},
  setItem(_key,value){this.value=String(value);},
  removeItem(){this.value=null;},
  clear(){this.value=null;},
  key(){return null;},
  get length(){return this.value===null?0:1;}
 };
 const store=createLocalFallbackWorkspaceStore(storage,"history");
 const recovered=await store.loadRecoverable();
 p45assert.equal(recovered.rejectedRows,2);
 p45assert.deepEqual(recovered.records.map(x=>x.id),["healthy"]);
 p45assert.equal(storage.value,duplicated,"Recovery must not rewrite ambiguous original bytes");
 await p45assert.rejects(store.loadVerified(),/Duplicate fallback record identity/);
});
