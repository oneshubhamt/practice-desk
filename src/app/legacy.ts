// @ts-nocheck
// Preserved v11 application runtime. Transitional TypeScript source; modularize via the architecture roadmap.
const SOURCE_PAPERS=JSON.parse(document.getElementById("paper-bank").textContent);
const REVIEW_PATCHES=JSON.parse(document.getElementById("review-patches").textContent);
const SOLUTION_BANK=JSON.parse(document.getElementById("solution-bank").textContent);
const PAPERS={};
const GENERIC_ENGINE=globalThis.PD_ENGINE_FACTORY(SOURCE_PAPERS,REVIEW_PATCHES);
for(const [pid,source] of Object.entries(SOURCE_PAPERS)){
  source.name=source.name+' · Original (PDF)';source.edition='original';source.familyId=pid;source.versionLabel='Original';PAPERS[pid]=source;
  const overrides=REVIEW_PATCHES[pid]||{};
  const reviewed={...source,id:pid+'-reviewed',name:source.name.replace(' · Original (PDF)',' · Reviewed & Corrected'),edition:'reviewed',versionLabel:'Reviewed & Corrected',familyId:pid,
    questions:source.questions.map(q=>({...q,...overrides[q.n],edition:'reviewed'}))};
  PAPERS[reviewed.id]=reviewed;
}


'use strict';
const SECTIONS=['Reasoning','General Awareness','Quantitative Aptitude','English'];
const DB_NAME='practiceDesk.history.v1', DB_VERSION=2;
const displayRevisions=new Map(),savedRevisionIds=new Set();
const SETTINGS_LS='practiceDesk.settings.v3', MIRROR_LS='practiceDesk.active.mirror.v3', FALLBACK_LS='practiceDesk.attempts.fallback.v3';
const $=id=>document.getElementById(id), letters='abcd';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtText=s=>esc(s).replace(/\n/g,'<br>');
const signed=n=>`${n<0?'−':''}${Math.abs(n).toFixed(1)}`;
const msec=s=>`${String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')}:${String(Math.floor(Math.max(0,s)%60)).padStart(2,'0')}`;
const durationText=ms=>msec(Math.floor((ms||0)/1000));
const dateText=ms=>ms?new Date(ms).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Unknown date';
const safeJSON=(s,def)=>{try{return JSON.parse(s)}catch{return def}};
const getLS=(k)=>{try{return localStorage.getItem(k)}catch{return null}};
const setLS=(k,v)=>{try{localStorage.setItem(k,v);return true}catch{return false}};
const removeLS=k=>{try{localStorage.removeItem(k)}catch{}};
const getPaper=id=>PAPERS[id];
const frozenPaperCache=new WeakMap();
function freezeDisplay(a){
 const paper=getPaper(a.paperId);
 if(!paper)throw Error('Cannot freeze missing paper');
 return {id:paper.id,name:paper.name,kind:paper.kind,date:paper.date,edition:paper.edition,
 familyId:paper.familyId,versionLabel:paper.versionLabel,passages:structuredClone(paper.passages),
 questions:paper.questions.map(q=>({...q,images:{}}))};
}
function frozenPaper(a){
 if(!a?.frozenDisplay)return null;
 const cached=frozenPaperCache.get(a.frozenDisplay);
 if(cached)return cached;
 const archived=displayRevisions.get(a.frozen?.snapshot?.paperRevisionId)?.displayPaper;
 const current=getPaper(a.paperId);
 const result={...a.frozenDisplay,questions:a.frozenDisplay.questions.map(q=>({
   ...q,images:archived?.questions?.find(x=>x.n===q.n)?.images||
     (GENERIC_ENGINE.assetMatches(a,q.n)?current?.questions?.find(x=>x.n===q.n)?.images||{}:{})
 }))};
 frozenPaperCache.set(a.frozenDisplay,result);
 return result;
}
const modeName=m=>({strict:'Exam simulation',free:'Full paper · flexible',single:'Single-section practice'})[m]||m;
const questionSection=n=>Math.floor((n-1)/25);
let prefs={paper:'cgl-2026-10-08-reviewed',mode:'strict',section:0,displayTheme:'light',fontScale:100};
let resultPaperId=null;let active=null,attempts=[],screen='home',resultId=null,reviewFilter='all',resultTab='insights',historyFilter='all',historySort='newest';
let cursor=0,db=null,storageMode='checking',storageMessage='',writeChain=Promise.resolve(),testNow=null;
let trackedQuestion=null,trackStart=0,tabVisible=!document.hidden,autosaveWarned=false;
const now=()=>testNow==null?Date.now():testNow;

let displayOpen=false,immersive=false,nativeFullscreen=false;
function applyDisplayPrefs(){if(prefs.displayTheme!=='dark')prefs.displayTheme='light';prefs.fontScale=Math.min(140,Math.max(85,Math.round((Number(prefs.fontScale)||100)/5)*5));document.documentElement.dataset.theme=prefs.displayTheme;document.documentElement.style.setProperty('--type-scale',String(prefs.fontScale/100));updateDisplayPanel();}
function updateDisplayPanel(){const n=$('displayPanel');if(!n)return;n.hidden=!displayOpen;$('displayTrigger').setAttribute('aria-expanded',String(displayOpen));$('fontReset').textContent=prefs.fontScale+'%';$('fontLess').disabled=prefs.fontScale<=85;$('fontMore').disabled=prefs.fontScale>=140;for(const theme of ['Light','Dark']){$('theme'+theme).classList.toggle('selected',prefs.displayTheme===theme.toLowerCase());$('theme'+theme).setAttribute('aria-pressed',String(prefs.displayTheme===theme.toLowerCase()));}let full=document.fullscreenElement||immersive;$('displayFullscreen').querySelector('span').textContent=full?'Exit full screen':'Enter full screen';const testButton=$('examFull');if(testButton)testButton.textContent=full?'⛶ Exit full screen':'⛶ Full screen';}
function setDisplayTheme(theme){prefs.displayTheme=theme==='dark'?'dark':'light';savePrefs();applyDisplayPrefs();}
function setFontScale(delta){prefs.fontScale=(prefs.fontScale||100)+delta;savePrefs();applyDisplayPrefs();}
function setImmersive(yes){immersive=!!yes;document.documentElement.classList.toggle('immersive',immersive);updateDisplayPanel();}
async function toggleFullscreen(){if(document.fullscreenElement){try{await document.exitFullscreen();}catch{setImmersive(false);}return;}if(immersive){setImmersive(false);return;}if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen();nativeFullscreen=true;setImmersive(true);return;}catch{ /* Use an in-page distraction-free fallback where browser fullscreen is blocked. */ }}nativeFullscreen=false;setImmersive(true);notify('Focus layout enabled. Browser full screen is unavailable here.');}
function initDisplayTools(){const root=$('displayTools');$('displayTrigger').onclick=()=>{displayOpen=!displayOpen;updateDisplayPanel();};$('displayClose').onclick=()=>{displayOpen=false;updateDisplayPanel();};$('fontLess').onclick=()=>setFontScale(-5);$('fontMore').onclick=()=>setFontScale(5);$('fontReset').onclick=()=>{prefs.fontScale=100;savePrefs();applyDisplayPrefs();};$('themeLight').onclick=()=>setDisplayTheme('light');$('themeDark').onclick=()=>setDisplayTheme('dark');$('displayFullscreen').onclick=toggleFullscreen;document.addEventListener('pointerdown',e=>{if(displayOpen&&!root.contains(e.target)){displayOpen=false;updateDisplayPanel();}});document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement){nativeFullscreen=true;setImmersive(true);}else if(nativeFullscreen){nativeFullscreen=false;setImmersive(false);}else updateDisplayPanel();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&displayOpen){displayOpen=false;updateDisplayPanel();}});applyDisplayPrefs();}
function notify(message){const n=$('toast');if(n){n.textContent=message;n.classList.add('show');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>n.classList.remove('show'),3600);}}
function record(id){return attempts.find(a=>a.id===id)||null;}
function paperFor(a){return frozenPaper(a)||getPaper(a?.paperId||prefs.paper);}
function questionsFor(a,s){return paperFor(a)?.questions?.slice(s*25,(s+1)*25)||[];}
function sectionsFor(a){return a.mode==='single'?[a.singleSection]:[0,1,2,3];}
function includedQs(a){return sectionsFor(a).flatMap(s=>questionsFor(a,s));}
function selectedQuestion(){return questionsFor(active,active.section)[cursor]||null;}
function sumSection(a,s){const xs=questionsFor(a,s),answers=a.answers||{},engine=GENERIC_ENGINE.context(a);
 const scores=GENERIC_ENGINE.score(a,new Date(now()).toISOString());
 const ids=new Set(engine.paper.sections[a.mode==='single'?0:s]?.questionRevisionIds||[]);
 const relevant=scores.items.filter(x=>ids.has(x.questionRevisionId));
 const count=verdict=>relevant.filter(x=>x.verdict===verdict).length;
 const origRight=xs.filter(q=>answers[q.n]===q.original).length,origWrong=xs.filter(q=>answers[q.n]&&answers[q.n]!==q.original).length;
 return {section:s,answered:xs.filter(q=>answers[q.n]).length,right:count('correct'),wrong:count('incorrect'),
 skip:count('unanswered'),invalid:count('excluded'),max:2*(relevant.length-count('excluded')),
 score:relevant.reduce((n,x)=>n+x.marks,0),raw:origRight*2-origWrong*.5};}
function calculate(a){if(!paperFor(a))return a.scoreSnapshot||{score:0,raw:0,max:0,right:0,wrong:0,skip:0,invalid:0,answered:0,rows:[]};
 const rows=sectionsFor(a).map(s=>sumSection(a,s));
 const result=GENERIC_ENGINE.score(a,new Date(now()).toISOString());
 let out={score:result.snapshot.earnedMarks,raw:0,max:0,right:result.snapshot.correctCount,wrong:result.snapshot.incorrectCount,skip:result.snapshot.unansweredCount,invalid:result.snapshot.excludedCount,answered:0,rows};
 for(let r of rows){out.raw+=r.raw;out.max+=r.max;out.answered+=r.answered;}
 return out;}
function summaryFor(a){if(a.scoreSnapshot)return a.scoreSnapshot;return calculate(a);}
const newId=()=>{try{return crypto.randomUUID()}catch{return `test-${now()}-${Math.random().toString(36).slice(2,11)}`}};
function makeAttempt(){const t=now(),a={id:newId(),schema:4,paperId:prefs.paper,mode:prefs.mode,singleSection:prefs.section,startedAt:t,finishedAt:null,updatedAt:t,section: prefs.mode==='single'?prefs.section:0,sections:[],answers:{},flags:{},cursors:[0,0,0,0],timing:{},totalVisits:0,pausedAt:null,pausedMs:0,endedBy:'',scoreSnapshot:null};if(a.mode==='strict')a.sections.push({section:0,startAt:t,endAt:null,reason:null});else a.sections.push({section:a.section,startAt:t,endAt:null,reason:null});return a;}
function ensureTimeStat(a,q){let key=String(q);if(!a.timing)a.timing={};if(!a.timing[key])a.timing[key]={ms:0,visits:0,changes:0,firstAnswerAt:null,lastAnswerAt:null};return a.timing[key];}
function capQTime(end){if(!active||!trackedQuestion||!trackStart||!tabVisible)return 0;let cap=end;const seg=active.mode==='strict'?active.sections[active.sections.length-1]:null;if(seg)cap=Math.min(cap,seg.endAt||seg.startAt+900000);else if(active.mode==='single'||active.mode==='free'){let due=active.startedAt+(active.mode==='single'?900000:3600000)+active.pausedMs;cap=Math.min(cap,due);}return Math.max(0,cap-trackStart);}
function stopTracking(t=now()){if(trackedQuestion&&active&&trackStart&&tabVisible){ensureTimeStat(active,trackedQuestion).ms+=capQTime(t);active.updatedAt=t;}trackedQuestion=null;trackStart=0;}
function startTracking(){if(screen!=='exam'||!active||active.finishedAt||active.pausedAt||!tabVisible)return;const q=selectedQuestion();if(!q)return;const t=now();if(trackedQuestion===q.n){return;}stopTracking(t);trackedQuestion=q.n;trackStart=t;const st=ensureTimeStat(active,q.n);st.visits++;active.totalVisits=(active.totalVisits||0)+1;}
function resetTracking(){trackedQuestion=null;trackStart=0;}
function liveTimeMs(a){if(!a)return 0;return Math.max(0,(a.pausedAt||now())-a.startedAt-(a.pausedMs||0));}
function segment(a){return a?.sections?.[a.sections.length-1];}
function timeRemaining(a){if(a.mode==='strict')return Math.max(0,900000-(now()-segment(a).startAt));return Math.max(0,(a.mode==='single'?900000:3600000)-liveTimeMs(a));}
function submitFinished(reason='manual',at=now()){if(!active||active.finishedAt)return;GENERIC_ENGINE.event(active,{type:'SUBMIT_ATTEMPT',nowMs:at});stopTracking(at);let s=segment(active);if(s&&!s.endAt){s.endAt=at;s.reason=reason;}active.finishedAt=at;active.endedBy=reason;active.updatedAt=at;active.pausedAt=null;active.scoreSnapshot=calculate(active);let completed=active;upsertAttempt(completed);resultId=completed.id;active=null;saveActiveMirror();screen='results';resultTab='insights';reviewFilter='all';render();}
function strictNext(reason='early',at=now()){if(!active||active.mode!=='strict')return;if(reason!=='time')GENERIC_ENGINE.event(active,{type:'SUBMIT_SECTION',nowMs:at});stopTracking(at);const old=segment(active);if(old.endAt)return;old.endAt=at;old.reason=reason;
 if(old.section===3){submitFinished(reason==='time'?'time':'section-early',at);return;}
 let next=old.section+1;active.section=next;active.sections.push({section:next,startAt:at,endAt:null,reason:null});cursor=active.cursors[next]||0;active.updatedAt=at;upsertAttempt(active);resetTracking();if(screen==='exam'){render();} }
function settleTimer(){if(!active||active.finishedAt)return;const t=now();GENERIC_ENGINE.event(active,{type:'TICK',nowMs:t});if(active.mode==='strict'){let count=0;while(active&&active.mode==='strict'&&t>=segment(active).startAt+900000&&count++<5){let at=segment(active).startAt+900000;strictNext('time',at);}}else if(liveTimeMs(active)>=(active.mode==='single'?900000:3600000)){submitFinished('time',active.startedAt+(active.mode==='single'?900000:3600000)+active.pausedMs);} }
// IndexedDB: immutable paper content lives in the HTML; each attempt is one atomic record.
function openDB(){return new Promise((resolve,reject)=>{if(!('indexedDB'in window))return reject(Error('IndexedDB unavailable'));let req;try{req=indexedDB.open(DB_NAME,DB_VERSION)}catch(e){reject(e);return;}req.onupgradeneeded=()=>{const d=req.result;let st;if(!d.objectStoreNames.contains('attempts')){st=d.createObjectStore('attempts',{keyPath:'id'});st.createIndex('by_finished','finishedAt');st.createIndex('by_paper','paperId');st.createIndex('by_mode','mode');st.createIndex('by_paper_finished',['paperId','finishedAt']);}if(!d.objectStoreNames.contains('settings'))d.createObjectStore('settings',{keyPath:'key'});if(!d.objectStoreNames.contains('revisions'))d.createObjectStore('revisions',{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Failed to open IndexedDB'));req.onblocked=()=>reject(Error('Database upgrade blocked by another tab'));});}
function dbRead(store,key){return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).get(key);req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);});}
function dbGetAll(store){return new Promise((res,rej)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).getAll();req.onsuccess=()=>res(req.result||[]);req.onerror=()=>rej(req.error);});}
function dbPut(store,value){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).put(value);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
function dbPutAttemptWithRevision(a){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['attempts','revisions'],'readwrite');
  const id=a.frozen?.snapshot?.paperRevisionId,revision=id&&displayRevisions.get(id);
  if(revision&&!savedRevisionIds.has(id))tx.objectStore('revisions').put(structuredClone(revision));
  tx.objectStore('attempts').put(structuredClone(a));
  tx.oncomplete=()=>{if(revision)savedRevisionIds.add(id);resolve();};
  tx.onerror=()=>reject(tx.error||Error('Attempt write failed'));
  tx.onabort=()=>reject(tx.error||Error('Attempt write aborted'));
 });
}
function captureDisplayArchive(a){
 const id=a.frozen?.snapshot?.paperRevisionId;
 if(!id||displayRevisions.has(id))return;
 const paper=getPaper(a.paperId);
 if(paper)displayRevisions.set(id,GENERIC_ENGINE.archiveDisplayRevision(id,a.paperId,paper));
}
function dbDelete(store,id){return new Promise((res,rej)=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error);});}
function queueWrite(job){writeChain=writeChain.catch(()=>{}).then(job).catch(e=>{db=null;storageMode='localStorage';storageMessage='IndexedDB write failed. Switched to localStorage; export a backup.';fallbackSave();saveActiveMirror();if(!autosaveWarned){notify('Storage problem: using browser fallback. Export a backup.');autosaveWarned=true;}console.warn('Practice Desk storage',e)});return writeChain;}
function fallbackSave(){const data=JSON.stringify(attempts);if(!setLS(FALLBACK_LS,data)){storageMessage='Browser storage full or blocked. Export a backup.';notify(storageMessage);}}
function savePrefs(){setLS(SETTINGS_LS,JSON.stringify(prefs));if(db)queueWrite(()=>dbPut('settings',{key:'preferences',value:prefs}));}
function saveActiveMirror(){if(active&&!active.finishedAt){
 if(!setLS(MIRROR_LS,JSON.stringify(active))){
  storageMessage='Active-session emergency copy could not be saved. Export a backup.';
  if(!autosaveWarned){notify(storageMessage);autosaveWarned=true;}
 }
}else removeLS(MIRROR_LS);}
function upsertAttempt(a){captureDisplayArchive(a);a.updatedAt=now();const idx=attempts.findIndex(x=>x.id===a.id);if(idx<0)attempts.push(a);else attempts[idx]=a;saveActiveMirror();if(db){const snap=structuredClone(a);queueWrite(()=>dbPutAttemptWithRevision(snap));}else fallbackSave();}
async function removeAttempt(id){attempts=attempts.filter(a=>a.id!==id);if(db)await queueWrite(()=>dbDelete('attempts',id));if(!db)fallbackSave();if(resultId===id)resultId=null;if(active?.id===id){active=null;saveActiveMirror();}}
/** Check local records before allowing them to influence the visible history or live state. */
function usableStored(a){
 if(!a||typeof a!=='object'||typeof a.id!=='string'||(!getPaper(a.paperId)&&!a.frozenDisplay)||
   !['strict','free','single'].includes(a.mode))return false;
 if(!a.finishedAt&&(!Number.isFinite(a.startedAt)||!Array.isArray(a.cursors)||
   !Array.isArray(a.sections)||!a.sections.length))return false;
 if(a.schema>=4){
  if(!a.frozen||!a.frozenDisplay)return false;
  try{GENERIC_ENGINE.context(a);}catch{return false;}
 }
 return true;
}
function restoreActive(){
 const live=attempts.filter(a=>!a.finishedAt).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 active=live[0]||null;
 if(!active)return;
 active.section=active.mode==='strict'?segment(active).section:active.section;
 cursor=active.cursors?.[active.section]||0;
 try{if(active.engineState)GENERIC_ENGINE.restore(active,now(),tabVisible);}
 catch(e){console.warn('Practice Desk session recovery',e);storageMessage='The last active session could not be restored. Saved completed attempts remain available.';active=null;}
}
async function initStorage(){
 const localPrefs=safeJSON(getLS(SETTINGS_LS),null);
 if(localPrefs?.paper&&getPaper(localPrefs.paper))prefs={...prefs,...localPrefs};
 const rawMirror=safeJSON(getLS(MIRROR_LS),null),mirror=usableStored(rawMirror)?rawMirror:null;
 try{
  db=await openDB();storageMode='indexeddb';
  const [list,settings,revisions]=await Promise.all([dbGetAll('attempts'),dbRead('settings','preferences'),dbGetAll('revisions')]);
  for(const revision of revisions){displayRevisions.set(revision.id,revision);savedRevisionIds.add(revision.id);}
  attempts=Array.isArray(list)?list.filter(usableStored):[];
  if(!localPrefs&&settings?.value&&getPaper(settings.value.paper))prefs={...prefs,...settings.value};
  // Replay the fallback journal first; each attempt is committed in a single IDB transaction.
  const fallback=safeJSON(getLS(FALLBACK_LS),[]);
  if(Array.isArray(fallback)){
   for(const item of fallback){
    if(!usableStored(item))continue;
    const previous=attempts.find(a=>a.id===item.id);
    const winner=GENERIC_ENGINE.chooseRecovered(previous,item);
    if(winner!==previous){
     attempts=attempts.filter(a=>a.id!==item.id);
     attempts.push(winner);
     captureDisplayArchive(winner);await dbPutAttemptWithRevision(winner);
    }
   }
  }
  // Do not replay an old fallback journal after deleting a completed attempt.
  removeLS(FALLBACK_LS);
  if(mirror&&!mirror.finishedAt){
   const previous=attempts.find(a=>a.id===mirror.id);
   const winner=GENERIC_ENGINE.chooseRecovered(previous,mirror);
   if(winner!==previous){
    attempts=attempts.filter(a=>a.id!==mirror.id);
    attempts.push(winner);
    await dbPut('attempts',structuredClone(winner));
   }
  }
 }catch(e){
  db=null;storageMode='localStorage';
  storageMessage='IndexedDB is unavailable; using localStorage fallback. Export backups regularly.';
  const fallback=safeJSON(getLS(FALLBACK_LS),[]);
  attempts=Array.isArray(fallback)?fallback.filter(usableStored):[];
  if(mirror&&!mirror.finishedAt){
   const previous=attempts.find(a=>a.id===mirror.id);
   const winner=GENERIC_ENGINE.chooseRecovered(previous,mirror);
   if(winner!==previous){
    attempts=attempts.filter(a=>a.id!==mirror.id);
    attempts.push(winner);
   }
  }
  console.warn('IndexedDB unavailable',e);
 }
 restoreActive();
 applyDisplayPrefs();savePrefs();saveActiveMirror();screen='home';settleTimer();render();
}
function onPageNav(){if(screen==='exam')stopTracking();}
function goHome(){if(screen==='exam'&&active&&!confirm('Return to library? The test timer will keep running.'))return;onPageNav();screen='home';render();}
function goHistory(){onPageNav();screen='history';render();}
function openResults(id){const a=record(id);if(!a||!a.finishedAt)return;onPageNav();resultId=id;resultTab='insights';reviewFilter='all';screen='results';render();}
function startNew(){if(active&&!active.finishedAt&&!confirm('A test is still active. Discard it and start a new attempt?'))return;if(active&&!active.finishedAt){const old=active;old.finishedAt=now();old.endedBy='discarded';old.scoreSnapshot=calculate(old);upsertAttempt(old);}active=makeAttempt();GENERIC_ENGINE.ensure(active,now());active.frozenDisplay=freezeDisplay(active);captureDisplayArchive(active);cursor=0;resultId=null;screen='exam';savePrefs();upsertAttempt(active);render();}
function resumeAttempt(){if(!active)return;GENERIC_ENGINE.ensure(active,now());screen='exam';cursor=active.cursors?.[active.section]||0;settleTimer();render();}
function changeQuestion(i){if(!active||i<0||i>24)return;GENERIC_ENGINE.event(active,{type:'NAVIGATE',nowMs:now(),sectionIndex:active.mode==='single'?0:active.section,questionIndex:i});stopTracking();cursor=i;active.cursors[active.section]=i;upsertAttempt(active);render();}
function changeSection(i){if(active.mode!=='free'||i<0||i>3)return;GENERIC_ENGINE.event(active,{type:'NAVIGATE',nowMs:now(),sectionIndex:i,questionIndex:active.cursors[i]||0});stopTracking();active.section=i;cursor=active.cursors[i]||0;upsertAttempt(active);render();}
function pickAnswer(letter){if(!active||active.pausedAt||!letters.includes(letter))return;const q=selectedQuestion();if(!q)return;let old=active.answers[q.n];if(old!==letter){if(!GENERIC_ENGINE.answer(active,letter,now()))return;let st=ensureTimeStat(active,q.n);if(old)st.changes++;if(!Array.isArray(st.events))st.events=[];st.events.push({at:now(),from:old||null,to:letter});if(st.firstAnswerAt===null)st.firstAnswerAt=now();st.lastAnswerAt=now();active.answers[q.n]=letter;upsertAttempt(active);render();}}
function clearAnswer(){const q=selectedQuestion();if(!q||active.pausedAt||!active.answers[q.n])return;const previous=active.answers[q.n];GENERIC_ENGINE.event(active,{type:'CLEAR',nowMs:now()});delete active.answers[q.n];let st=ensureTimeStat(active,q.n);st.changes++;if(!Array.isArray(st.events))st.events=[];st.events.push({at:now(),from:previous,to:null});upsertAttempt(active);render();}
function markQuestion(){let q=selectedQuestion();if(!q)return;GENERIC_ENGINE.event(active,{type:'FLAG',nowMs:now(),flagged:!active.flags[q.n]});if(active.flags[q.n])delete active.flags[q.n];else active.flags[q.n]=true;upsertAttempt(active);render();}
function togglePause(){if(!active||active.mode==='strict')return;GENERIC_ENGINE.event(active,{type:active.pausedAt?'RESUME':'PAUSE',nowMs:now()});if(active.pausedAt){active.pausedMs+=now()-active.pausedAt;active.pausedAt=null;}else{stopTracking();active.pausedAt=now();}upsertAttempt(active);render();}
function confirmSubmit(){if(!active)return;if(active.mode==='strict'){const s=active.section;const all=questionsFor(active,s);let answered=all.filter(q=>active.answers[q.n]).length;let msg=s===3?`Submit the final section now (${answered}/25 answered)? This will finish the entire paper and reveal the results.`:`Submit ${SECTIONS[s]} now (${answered}/25 answered)? You cannot return. ${SECTIONS[s+1]} begins immediately with its own full 15 minutes; unused time is not transferred.`;if(confirm(msg)){if(s===3)strictNext('early');else strictNext('early');}}else{let n=Object.keys(active.answers).length;if(confirm(`Submit ${active.mode==='single'?'this section':'the entire paper'} now? ${n} answers saved. This cannot be undone.`))submitFinished('early');}}
function progress(a){return a.mode==='strict'?Math.min(100,100*((a.sections.reduce((x,y)=>x+(y.endAt?y.endAt-y.startAt:Math.min(900000,now()-y.startAt)),0))/3600000)):Math.min(100,100*liveTimeMs(a)/(a.mode==='single'?900000:3600000));}
function qHTML(q){let bankPassage=getPaper(screen==='results'?resultPaperId:active?.paperId)?.passages?.[q.passageRef];let p=(q.passage||bankPassage)?`<div class="passage"><b>Reading passage</b><div>${fmtText(q.passage||bankPassage)}</div></div>`:'';return `${p}<div class="stem">${fmtText(q.stem)}</div>${q.images?.stem?`<img class="figure" src="${q.images.stem}" alt="Diagram for question ${q.n}">`:''}`;}
function optionsHTML(q,review=false,a=active){return q.opts.map((option,i)=>{let letter=letters[i],img=q.images?.options?.[i],chosen=a.answers?.[q.n]===letter,correct=q.key===letter;return review?`<div class="review-opt ${q.status!=='invalid'&&correct?'yes':q.status!=='invalid'&&chosen?'no':''}"><b>${letter.toUpperCase()}.</b> ${img?`<img src="${img}" alt="Option ${letter.toUpperCase()}">`:fmtText(option)}${chosen?' · Your choice':''}${correct&&q.status!=='invalid'?' · Correct':''}</div>`:`<button class="choice ${chosen?'on':''}" data-answer="${letter}" ${a.pausedAt?'disabled':''}><span class="letter">${letter.toUpperCase()}</span><span>${img?`<img src="${img}" alt="Option ${letter.toUpperCase()}">`:fmtText(option)}</span></button>`;}).join('');}
function drawHome(){let p=getPaper(prefs.paper)||Object.values(PAPERS)[0];let status=p.questions.reduce((a,q)=>(a[q.status]=(a[q.status]||0)+1,a),{});let completed=attempts.filter(a=>a.finishedAt&&a.endedBy!=='discarded').sort((a,b)=>b.finishedAt-a.finishedAt);let last=completed.slice(0,3);
 $('app').innerHTML=`<div class="home-heading row between"><div><h1>Test library</h1><p class="muted">Five papers · Choose a date and switch between corrected and original editions.</p></div><button class="btn" id="openHistory">History & insights <span class="arrow">→</span></button></div>
 ${active?`<section class="panel pad ongoing"><div class="row between"><div><b>In-progress attempt</b><div class="fine">${esc(paperFor(active)?.name||'Paper')} · ${esc(modeName(active.mode))} · ${Object.keys(active.answers).length} answered</div></div><button class="btn primary" id="resume">Resume test →</button></div></section>`:''}
 <div class="homegrid"><section class="panel pad"><label class="picker" for="paperSelect">Select paper</label><select id="paperSelect">${Object.values(SOURCE_PAPERS).map(src=>`<option value="${src.id}" ${src.id===p.familyId?'selected':''}>${esc(src.date)}</option>`).join('')}</select><div class="edition-row"><span class="picker" id="editionLabel">Paper edition</span><div class="edition-toggle" role="group" aria-labelledby="editionLabel"><button type="button" class="edition-choice ${p.edition==='reviewed'?'active':''}" data-edition="reviewed" aria-pressed="${p.edition==='reviewed'}">Reviewed &amp; Corrected</button><button type="button" class="edition-choice ${p.edition==='original'?'active':''}" data-edition="original" aria-pressed="${p.edition==='original'}">Original PDF</button></div><p class="fine edition-note">${p.edition==='reviewed'?'Recommended · Independently reviewed wording and answer keys':'Source transcription · Publisher answer keys preserved'}. Changes, audit notes and solving methods appear only after submission.</p></div><h3 class="subhead">Test mode</h3><div class="modes">${[['strict','Exam simulation','4 locked sections · 15 minutes each · early section submission'],['free','Full paper · free navigation','60-minute total · switch sections without restriction'],['single','Single-section practice','Choose any 25-question section · 15 minutes']].map(([key,label,desc])=>`<button class="mode ${prefs.mode===key?'on':''}" data-mode="${key}"><span class="radio"></span><span><strong>${label}${key==='strict'?' · Default':''}</strong><small>${desc}</small></span></button>`).join('')}</div>${prefs.mode==='single'?`<label class="picker" for="singleSelect">Section</label><select id="singleSelect">${SECTIONS.map((name,i)=>`<option value="${i}" ${prefs.section===i?'selected':''}>${i+1}. ${esc(name)}</option>`).join('')}</select>`:''}<div class="row between startrow"><button class="btn primary" id="start">Start ${prefs.mode==='single'?'section':'paper'} →</button><span class="fine">+2 correct · −0.5 wrong · 0 skipped</span></div></section>
 <aside class="stack"><section class="panel pad"><h3>Selected paper</h3><div class="mini-data"><div><b>100</b><small>Questions</small></div><div><b>60 min</b><small>Full paper</small></div><div><b>4</b><small>Sections</small></div><div><b>200</b><small>Original max marks</small></div></div><div class="audit-legend"><b>${p.edition==='reviewed'?'Reviewed edition':'Original PDF edition'}</b><p>${p.edition==='reviewed'?`${Object.keys(REVIEW_PATCHES[p.familyId]||{}).length} reviewed refinements over the original; ${status.invalid||0} unresolved defective items, ${status.caution||0} additional cautions.`:`The source questions and publisher answer labels are preserved (readability formatting is normalized). ${status.invalid||0} disputed or defective questions excluded from adjusted scoring.`} Detailed notes appear only after submission.</p></div></section>
 <section class="panel pad"><div class="row between"><h3 style="margin:0">Recent attempts</h3><button class="textlink" id="recentHistory">View all →</button></div>${last.length?last.map(a=>{let r=summaryFor(a);return `<button class="recent-link" data-open="${esc(a.id)}"><span><b>${esc(paperFor(a)?.name||a.paperId)}</b><small>${dateText(a.finishedAt)} · ${esc(modeName(a.mode))}</small></span><span class="recent-score">${signed(r.score)} <small>/ ${r.max}</small></span></button>`;}).join(''):'<p class="fine" style="margin-top:16px">Completed attempts will appear here and can be reopened for analysis.</p>'}</section>
 </aside></div><details id="help" class="panel pad"><summary><b>Test rules and storage</b></summary><p>Strict mode locks each section. Submit a section early to start the next immediately with its full 15-minute allocation; unused minutes never carry over. In free mode there is one 60-minute clock, and in single-section mode there is a 15-minute clock. Only the last submission reveals answers.</p><p><b>Editorial policy:</b> Original preserves source questions and publisher keys. Corrected papers may repair errors, but must not quote the correct option or disclose the solving rule in a question stem unless the source already did so. Explanations and source-to-correction comparisons appear only after submission. Every correction is tracked by paper and question number; these are independent educational edits, not official answer keys.</p><p>Data is stored on your device (${storageMode==='indexeddb'?'IndexedDB':storageMode==='localStorage'?'localStorage fallback':'initializing'}). For long-term safety, export a backup from History & insights. Use the same browser and file location when possible. Shortcuts: A–D answer; arrow keys navigate; M flags a question; F toggles full screen. Display choices are in Aa at the upper right.</p></details><footer>Practice Desk · Single offline HTML · Not affiliated with SSC</footer>`;
 $('paperSelect').onchange=e=>{prefs.paper=e.target.value+(p.edition==='reviewed'?'-reviewed':'');savePrefs();drawHome()};document.querySelectorAll('[data-edition]').forEach(el=>el.onclick=()=>{prefs.paper=p.familyId+(el.dataset.edition==='reviewed'?'-reviewed':'');savePrefs();drawHome()});document.querySelectorAll('[data-mode]').forEach(el=>el.onclick=()=>{prefs.mode=el.dataset.mode;savePrefs();drawHome()});if($('singleSelect'))$('singleSelect').onchange=e=>{prefs.section=+e.target.value;savePrefs();};$('start').onclick=startNew;if($('resume'))$('resume').onclick=resumeAttempt;$('openHistory').onclick=goHistory;$('recentHistory').onclick=goHistory;document.querySelectorAll('[data-open]').forEach(el=>el.onclick=()=>openResults(el.dataset.open));}
function drawExam(){let a=active;if(!a)return drawHome();let s=a.section,qs=questionsFor(a,s),q=qs[cursor];if(!q)return;let so=qs.filter(q=>a.answers[q.n]).length;let total=Object.keys(a.answers).length,marked=qs.filter(q=>a.flags[q.n]).length;let strict=a.mode==='strict',single=a.mode==='single',closedSecs=strict?a.sections.filter(x=>x.endAt).length:0;
 $('app').innerHTML=`<div class="test-header"><div><div class="paperline">${esc(paperFor(a)?.name)}</div><div class="test-sub">${esc(modeName(a.mode))} · ${total} of ${single?25:100} answered</div></div><div class="row"><div class="clock" id="clock"><span id="clockValue">${msec(timeRemaining(a)/1000)}</span><small id="clockLabel">${strict?'This section':'Time remaining'}</small></div><button class="btn quiet" id="goHome">Library</button><button class="btn exam-full" id="examFull" aria-label="Toggle full-screen test view">⛶ Full screen</button></div></div><div class="progress"><div id="timeBar" style="width:${progress(a)}%"></div></div><div class="sectiontabs">${SECTIONS.map((name,i)=>{const locked=strict?i!==s:single?i!==s:false;let closed=strict&&i<s;return `<button class="sectiontab ${s===i?'active':''} ${locked?'locked':''}" data-section="${i}" ${locked?'disabled':''}><b>${esc(name)}</b><small>${closed?'Closed':strict&&i>s?'Locked':`${questionsFor(a,i).filter(x=>a.answers[x.n]).length}/25 answered`}</small></button>`;}).join('')}</div><div class="exam-layout"><section><div class="panel question"><div class="qid">${esc(SECTIONS[s])} · Question ${cursor+1} of 25 · Paper Q${q.n}</div>${qHTML(q)}<div class="choices">${optionsHTML(q)}</div><div class="qfoot"><div class="row"><button class="btn" id="prev" ${cursor===0?'disabled':''}>← Previous</button><button class="btn primary" id="next" ${cursor===24?'disabled':''}>Next →</button></div><div class="row"><button class="btn" id="clear" ${!a.answers[q.n]||a.pausedAt?'disabled':''}>Clear</button><button class="btn" id="mark">${a.flags[q.n]?'Unmark':'Mark for review'}</button></div></div></div><div class="sectionbar">${strict?`Section ${s+1} of 4 · ${closedSecs} completed · Each section has an independent 15-minute timer.`:single?'Only the selected section contributes to this attempt.':'Switch sections freely within the 60-minute total budget.'}</div><div class="row test-actions"><button class="btn ${strict?'primary':'danger'}" id="finish">${strict?s===3?'Submit final section':'Submit section early →':single?'Submit section':'Submit full paper'}</button>${!strict?`<button class="btn" id="pause">${a.pausedAt?'Resume timer':'Pause timer'}</button>`:''}</div></section><aside class="panel side"><h3>Question navigator</h3><p class="hint">Jump to a question in this section</p><div class="palette">${qs.map((x,i)=>`<button class="num ${cursor===i?'here':''} ${a.answers[x.n]?'answered':''} ${a.flags[x.n]?'marked':''}" data-num="${i}" title="Question ${x.n}">${i+1}</button>`).join('')}</div><div class="navigator-stats"><div><b>${so}<span> / 25</span></b><small>Answered</small></div><div><b>${25-so}</b><small>Not answered</small></div><div><b>${marked}</b><small>Flagged</small></div></div><div class="legend"><span><i class="dot g"></i>Answered</span><span><i class="dot y"></i>Review</span><span><i class="dot"></i>Not answered</span></div><p class="statusline">${strict?'The answer key stays hidden until all sections finish. Submitting this section closes it permanently.':'Answers remain hidden until you submit.'}</p></aside></div><footer>${strict?'Strict timer cannot be paused.':'Timer may be paused.'} Your answers and question timings are saved locally.</footer>`;
 $('goHome').onclick=goHome;$('examFull').onclick=toggleFullscreen;updateDisplayPanel();$('prev').onclick=()=>changeQuestion(cursor-1);$('next').onclick=()=>changeQuestion(cursor+1);$('clear').onclick=clearAnswer;$('mark').onclick=markQuestion;$('finish').onclick=confirmSubmit;if($('pause'))$('pause').onclick=togglePause;document.querySelectorAll('[data-answer]').forEach(x=>x.onclick=()=>pickAnswer(x.dataset.answer));document.querySelectorAll('[data-num]').forEach(x=>x.onclick=()=>changeQuestion(+x.dataset.num));document.querySelectorAll('[data-section]').forEach(x=>x.onclick=()=>changeSection(+x.dataset.section));if(a.pausedAt){$('clockLabel').textContent='Paused';}startTracking();updateClock();}
function updateClock(){if(!active||screen!=='exam')return;const v=$('clockValue'),c=$('clock'),bar=$('timeBar');if(!v)return;v.textContent=msec(timeRemaining(active)/1000);c.classList.toggle('low',timeRemaining(active)<60000);if(bar)bar.style.width=`${progress(active).toFixed(2)}%`;}
function timing(a,n){return a.timing?.[String(n)]||{ms:0,visits:0,changes:0,firstAnswerAt:null};}
function durationOfSection(a,s){if(a.legacySummary)return null;if(a.mode==='strict'){let x=a.sections?.find(z=>z.section===s);return x?(x.endAt||now())-x.startAt:null;}if(a.mode==='single'){return a.singleSection===s?Math.max(0,(a.finishedAt||now())-a.startedAt-(a.pausedMs||0)):null;} // free: time attributed to foreground questions of each section; sums may differ from wall-time
 return questionsFor(a,s).reduce((sum,q)=>sum+timing(a,q.n).ms,0);}
function totalTime(a){if(a.legacySummary)return null;if(a.mode==='strict')return (a.sections||[]).reduce((sum,x)=>sum+(x.endAt||now())-x.startAt,0);return Math.max(0,(a.finishedAt||now())-a.startedAt-(a.pausedMs||0));}
const median=arr=>{if(!arr.length)return 0;let sorted=[...arr].sort((a,b)=>a-b);return sorted.length%2?sorted[(sorted.length-1)/2]:(sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;};
function paceReference(a,s){let xs=questionsFor(a,s).filter(q=>q.status!=='invalid'&&a.answers[q.n]&&(timing(a,q.n).ms||0)>=1000).map(q=>timing(a,q.n).ms);return xs.length>=5?median(xs):null;}
function speedTag(a,q){if(a.legacyTiming||a.legacySummary)return {label:'Not recorded',cls:'muted'};let ms=timing(a,q.n).ms;if(!ms)return {label:'Not recorded',cls:'muted'};let ref=paceReference(a,questionSection(q.n));if(!ref)return {label:'—',cls:'muted'};return ms>ref*1.6?{label:'Slow',cls:'slow'}:ms<ref*.6?{label:'Fast',cls:'fast'}:{label:'Typical',cls:'mid'};}
function analytic(a){let qs=includedQs(a),v=qs.filter(q=>q.status!=='invalid');let attempts=v.filter(q=>a.answers[q.n]);let measured=attempts.filter(q=>timing(a,q.n).ms>0);let right=attempts.filter(q=>a.answers[q.n]===q.key),wrong=attempts.filter(q=>a.answers[q.n]!==q.key);let measuredMed=median(measured.map(q=>timing(a,q.n).ms));let measuredMean=measured.length?measured.reduce((n,q)=>n+timing(a,q.n).ms,0)/measured.length:0;
 let slow=attempts.filter(q=>speedTag(a,q).label==='Slow'),fast=attempts.filter(q=>speedTag(a,q).label==='Fast');let topSlow=[...qs].filter(q=>timing(a,q.n).ms>0).sort((x,y)=>timing(a,y.n).ms-timing(a,x.n).ms).slice(0,5);
 let allQTime=qs.reduce((sum,q)=>sum+timing(a,q.n).ms,0),correctTime=right.reduce((sum,q)=>sum+timing(a,q.n).ms,0),wrongTime=wrong.reduce((sum,q)=>sum+timing(a,q.n).ms,0);return {total:totalTime(a),measuredMed,measuredMean,measured:measured.length,accuracy:attempts.length?100*right.length/attempts.length:0,attemptRate:v.length?100*attempts.length/v.length:0,pace:attempts.length?totalTime(a)/attempts.length:null,slow,fast,topSlow,allQTime,correctTime,wrongTime,attempts:attempts.length,correct:right.length,wrong:wrong.length};}
function scoreCards(a,score){const useOriginal=sectionsFor(a).length*50;return `<div class="scoregrid"><div class="score standout"><b>${signed(score.score)} <small>/ ${score.max}</small></b><small>Audit-adjusted marks</small></div><div class="score"><b>${score.right??'—'}</b><small>Correct</small></div><div class="score"><b>${score.wrong??'—'}</b><small>Incorrect</small></div><div class="score"><b>${score.skip??'—'}</b><small>Unanswered</small></div><div class="score"><b>${score.invalid??'—'}</b><small>Excluded defects</small></div></div><div class="fine score-explainer">+2 correct · −0.5 incorrect · 0 unattempted. ${score.raw==null?'Original-key comparison unavailable for an older attempt.':`Publisher-key comparison: <b>${signed(score.raw)} / ${useOriginal}</b>. Adjusted scoring uses the reviewed key and excludes defective questions.`}</div>`;}
function sectionTable(a,score){if(!score.rows?.length)return '<p class="muted">Detailed section breakdown was not recorded in this legacy attempt.</p>';return `<div class="scroll-table"><table><thead><tr><th>Section</th><th>Attempted</th><th>Correct</th><th>Wrong</th><th>Marks</th><th>Time used</th></tr></thead><tbody>${score.rows.map(r=>`<tr><td><b>${esc(SECTIONS[r.section])}</b></td><td>${r.answered}/25</td><td>${r.right}</td><td>${r.wrong}</td><td>${signed(r.score)} / ${r.max}</td><td>${durationOfSection(a,r.section)==null?'—':durationText(durationOfSection(a,r.section))}</td></tr>`).join('')}</tbody></table></div>`;}
function paceBars(a){let rows=sectionsFor(a).map(s=>{let r=sumSection(a,s);let time=durationOfSection(a,s);let accuracy=r.answered?(r.right/(r.right+r.wrong||1))*100:0;let sectAcc=(r.right+r.wrong)?Math.round(r.right/(r.right+r.wrong)*100):0;return `<div class="metric-bar"><div class="row between"><b>${esc(SECTIONS[s])}</b><span>${r.answered}/25 attempted · ${sectAcc}% accuracy</span></div><div class="bartrack"><div style="width:${r.answered*4}%"></div></div><div class="fine">${time==null?'Time unavailable':a.mode==='free'?`Foreground question time: ${durationText(time)}`:`Section time: ${durationText(time)}`}</div></div>`;});return rows.join('');}
function deriveTips(a,x){let rows=sectionsFor(a).map(s=>sumSection(a,s));let out=[];if(x.attempts===0)return ['No valid responses were recorded. Review the solutions, then retry a section.'];
 let low=rows.filter(s=>s.right+s.wrong>=4).sort((a,b)=>(a.right/(a.right+a.wrong))-(b.right/(b.right+b.wrong)))[0];if(low&&low.wrong>=3)out.push(`Review ${SECTIONS[low.section]} first: ${Math.round(100*low.right/(low.right+low.wrong))}% accuracy across ${low.right+low.wrong} scored attempts.`);
 if(x.slow.length)out.push(`${x.slow.length} questions took at least 1.6× the median answered-question time in their respective sections. Review the slowest items for method improvements.`);
 if(x.fast.length){let careless=x.fast.filter(q=>a.answers[q.n]!==q.key);if(careless.length)out.push(`${careless.length} fast responses were incorrect. Check whether these were avoidable reading or calculation errors.`);}
 if(x.attemptRate<70)out.push(`Only ${Math.round(x.attemptRate)}% of eligible questions were attempted. Consider practising question selection and pacing.`);
 if(out.length===0)out.push('Your response coverage and timing are reasonably balanced in this attempt. Review incorrect questions for the largest gains.');return out.slice(0,3);}

function markOpportunityHTML(a,x){const skipped=summaryFor(a).skip||0,wrong=x.wrong||0,penalty=wrong*.5,swings=wrong*2.5;return `<section class="panel pad"><h2>Score improvement opportunities</h2><p class="fine">Exact marking arithmetic, not predictions of future performance. Defective items are excluded.</p><div class="coach-cards"><div class="coach-card"><b>−${signed(penalty)}</b><span>Negative marks incurred</span><small>${wrong} incorrect scored answers × 0.5-mark penalty</small></div><div class="coach-card"><b>+${signed(swings)}</b><span>If every wrong answer became correct</span><small>Hypothetical ${wrong} × 2.5-mark turnaround</small></div><div class="coach-card"><b>+${signed(skipped*2)}</b><span>If every unanswered valid item were correct</span><small>Hypothetical ${skipped} × 2-mark opportunity</small></div></div><div class="coach-actions"><button class="btn" data-review-filter="wrong">Review ${wrong} incorrect →</button><button class="btn" data-review-filter="skipped">Review ${skipped} skipped →</button></div></section>`;}
function matrixHTML(a){if(a.legacyTiming||a.legacySummary)return '';const xs=includedQs(a).filter(q=>q.status!=='invalid'&&a.answers?.[q.n]);const groups=['Fast','Typical','Slow'].map(n=>({name:n,qs:xs.filter(q=>speedTag(a,q).label===n)}));const covered=groups.reduce((v,g)=>v+g.qs.length,0);if(covered<5)return `<section class="panel pad"><h2>Speed × accuracy</h2><p class="fine">Five or more measurable responses in each section are needed to classify relative speed. Continue practising to unlock reliable labels.</p></section>`;
return `<section class="panel pad"><h2>Speed × accuracy</h2><p class="fine">Distinguish quickly answered mistakes from time-consuming ones. Speed groups use each section’s median, not an assumed universal ideal.</p><div class="matrix">${groups.map(g=>{const correct=g.qs.filter(q=>a.answers[q.n]===q.key).length,incorrect=g.qs.length-correct;const filter=g.name==='Fast'?'fastwrong':g.name==='Slow'?'slowwrong':'typicalwrong';return `<div class="matrix-cell"><b>${g.name}</b><div class="matrix-count"><span>${correct} correct</span><span>${incorrect} wrong</span></div><small>${g.qs.length?Math.round(correct*100/g.qs.length)+'% accuracy':'No measured answers'}</small><button class="textlink" data-review-filter="${filter}" ${incorrect?'':'disabled'}>Review ${incorrect} ${g.name.toLowerCase()} misses →</button></div>`;}).join('')}</div><p class="fine">${xs.length-covered} answered questions lack an interpretable speed label. The recorded time is visible foreground viewing time, not a measurement of thought or concentration.</p></section>`;}
function answerRevisionHTML(a){let recordable=includedQs(a).filter(q=>q.status!=='invalid'&&Array.isArray(timing(a,q.n).events));if(!recordable.length)return '';const modified=recordable.filter(q=>{const ev=timing(a,q.n).events;return ev.some(e=>e.from&&e.to&&e.from!==e.to);});let rescued=0,lost=0;for(const q of modified){const ev=timing(a,q.n).events,first=ev.find(x=>x.to)?.to;const final=a.answers[q.n];if(first!==q.key&&final===q.key)rescued++;if(first===q.key&&final&&final!==q.key)lost++;}return `<section class="panel pad"><h2>Answer revisions</h2><div class="row"><span class="tag">${modified.length} revised</span><span class="tag fast">${rescued} ended correct after an initial wrong answer</span><span class="tag slow">${lost} ended wrong after an initial correct answer</span></div><p class="fine" style="margin:12px 0 0">Tracks recorded A–D answer replacements only, excluding clear-and-reselect cases. These are observed changes, not evidence that revision caused improvement. Older attempts may not contain answer-event history.</p></section>`;}
function historyPrioritiesHTML(all){let usable=all.filter(a=>!a.legacySummary&&a.finishedAt&&getPaper(a.paperId)&&a.mode!=='single').sort((a,b)=>b.finishedAt-a.finishedAt).slice(0,8);if(usable.length<2)return `<section class="panel pad history-forecast"><h3>Cross-paper section priorities</h3><p class="fine">Complete at least two full-paper attempts to unlock a section comparison. One attempt is too little for a useful pattern.</p></section>`;let ds=SECTIONS.map((name,s)=>{let rows=usable.map(a=>summaryFor(a).rows?.find(r=>r.section===s)).filter(Boolean);let n=rows.reduce((v,r)=>v+r.right+r.wrong,0),right=rows.reduce((v,r)=>v+r.right,0),marks=rows.reduce((v,r)=>v+r.score,0),max=rows.reduce((v,r)=>v+r.max,0);return {name,attempts:rows.length,n,accuracy:n?100*right/n:null,pct:max?100*marks/max:null};}).filter(x=>x.attempts);ds.sort((a,b)=>a.pct-b.pct);return `<section class="panel pad history-forecast"><h3>Cross-paper section priorities</h3><p class="fine">Last ${usable.length} full-paper attempt${usable.length===1?'':'s'} · sorted by audited marks as a share of eligible maximum, lowest first.</p>${ds.map(r=>`<div class="priority-row"><div class="row between"><b>${esc(r.name)}</b><span class="fine">${r.pct?.toFixed(1)}% marks · ${r.accuracy===null?'No answers':r.accuracy.toFixed(0)+'% accuracy'}</span></div><div class="bartrack"><div style="width:${Math.max(0,Math.min(100,r.pct||0))}%"></div></div></div>`).join('')}<p class="fine">For direction only: different papers have different difficulty and audited exclusions; this does not estimate a national rank or percentile.${usable.length<3?' More attempts will improve interpretability.':''}</p></section>`;}
function insightsHTML(a){let score=summaryFor(a),x=analytic(a),historic=a.legacySummary,oldTime=a.legacyTiming||historic;let activeTime=x.allQTime;return `<section class="panel pad results"><div class="row between"><div><h2>Performance overview</h2><p class="fine" style="margin:-7px 0 12px">${esc(paperFor(a)?.name||a.paperId)} · ${dateText(a.finishedAt)}</p></div>${a.endedBy==='time'?'<span class="tag caution">Time expired</span>':a.endedBy==='section-early'?'<span class="tag">Submitted early</span>':''}</div>${scoreCards(a,score)}${sectionTable(a,score)}</section>
 ${historic?`<section class="panel pad"><h2>Limited historical data</h2><p class="muted">This attempt was recovered from the previous app’s recent-results list, which stored only the score and attempted count. Individual answers, per-question timings, and detailed analysis were not saved at that time.</p></section>`:
 `<div class="insight-grid"><section class="panel pad"><h2>Time & pacing</h2><div class="metriclist"><div><span>Test time used</span><b>${x.total==null?'—':durationText(x.total)}</b></div><div><span>Median per answered question</span><b>${oldTime?'Not recorded':durationText(x.measuredMed)}</b></div><div><span>Question time captured</span><b>${oldTime?'Not recorded':durationText(activeTime)}</b></div><div><span>Attempt rate</span><b>${Math.round(x.attemptRate)}%</b></div><div><span>Accuracy (valid attempts)</span><b>${Math.round(x.accuracy)}%</b></div></div><p class="fine" style="margin:12px 0 0">${a.mode==='free'?'In unrestricted mode, section time is attributed from foreground question visits.':'Section times reflect the isolated timer buckets.'} Per-question time is approximate foreground time while a question was displayed; time away from the page is not attributed.</p></section><section class="panel pad"><h2>Section diagnostics</h2>${paceBars(a)}</section></div>
 ${!oldTime?`${markOpportunityHTML(a,x)}${matrixHTML(a)}${answerRevisionHTML(a)}`:`${markOpportunityHTML(a,x)}`}
 ${!oldTime?`<section class="panel pad"><div class="row between"><h2>Question-speed insights</h2><span class="fine">Relative to each section’s median</span></div><div class="insight-stats"><div><strong>${x.slow.length}</strong><span>Slow responses</span></div><div><strong>${x.fast.length}</strong><span>Fast responses</span></div><div><strong>${x.measured}</strong><span>Timed answers</span></div></div><div class="fine">Fast: below 0.6× median; slow: above 1.6× median. Labels appear only if a section has at least five measured, valid answers. These are relative signals, not fixed ideal times.</div>${x.topSlow.length?`<h3 class="subhead">Longest question visits</h3><div class="slow-list">${x.topSlow.map(q=>`<button class="slow-link" data-review-one="${q.n}"><span><b>Q${q.n}</b> · ${esc(SECTIONS[questionSection(q.n)])}</span><span>${durationText(timing(a,q.n).ms)} <span class="arrow">→</span></span></button>`).join('')}</div>`:''}</section>`:''}
 <section class="panel pad"><h2>What to work on next</h2><ul class="plainlist">${deriveTips(a,x).map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>`}
 <div class="row" style="margin:12px 0 22px"><button class="btn" id="viewQuestionReview">View question-by-question review →</button><button class="btn" id="backLibrary">Test library</button></div>`;}
function reviewedSolutionHTML(a,q){
  if(paperFor(a)?.edition!=='reviewed')return '';
  const solution=SOLUTION_BANK[paperFor(a).familyId]?.[String(q.n)];
  if(!solution)return '';
  const visual=Boolean(q.images?.stem||q.images?.options?.length);
  const needsPractice=!a.answers?.[q.n]||a.answers[q.n]!==q.key;
  return `<details class="worked-solution" ${needsPractice?'open':''}><summary>${visual?'Visual solving method':'Solving approach & worked reasoning'}</summary><div class="worked-solution-body">${fmtText(solution)}</div></details>`;
}
function reviewOneHTML(a,q){let excluded=q.status==='invalid',ans=a.answers?.[q.n],correct=ans===q.key;let keyLabel=q.key?String(q.key).toUpperCase():'—';const stat=timing(a,q.n),speed=speedTag(a,q);return `<article class="panel review-item" id="review-${q.n}"><div class="review-head"><strong>Q${q.n} · <span class="${excluded?'neutral':!ans?'':correct?'ok':'bad'}">${excluded?'Excluded':!ans?'Unattempted':correct?'Correct':'Incorrect'}</span></strong><span class="row review-right">${a.legacyTiming?'':`<span class="tag ${speed.cls}">${durationText(stat.ms)} · ${speed.label}</span>`}${q.status==='ok'?(q.revised?`<span class="tag corrected">Refined</span>`:''):`<span class="tag ${q.status}">${({invalid:'Defective · excluded',corrected:'Key corrected',caution:'Wording caution'})[q.status]}</span>`}</span></div>${qHTML(q)}${optionsHTML(q,true,a)}<div class="review-details"><b>${excluded?'Not scored':`Reviewed answer: ${keyLabel}`}</b> · Your choice: ${ans?ans.toUpperCase():'Unanswered'}${q.key!==q.original?` · PDF key: ${esc(q.original.toUpperCase())}`:''}${!a.legacyTiming?` · Visits: ${stat.visits} · Answer changes: ${stat.changes}`:''}</div>${q.review||q.explanation?`<div class="notice"><b>Audit note.</b> ${esc(q.review||q.explanation||'')}</div>`:''}${reviewedSolutionHTML(a,q)}${q.revised?`<details class="change-log"><summary>Compare with original PDF version</summary><div class="change-body">${(()=>{const o=SOURCE_PAPERS[paperFor(a).familyId].questions[q.n-1];const oldOpts=o.opts.map((v,i)=>`${letters[i].toUpperCase()}. ${v}`).join('\n');return `<div><b>Original question · PDF page ${o.sourcePage}</b><div class="compare-source">${fmtText(o.stem)}</div><div class="compare-source">${fmtText(oldOpts)}</div><p>Original published key: ${o.original.toUpperCase()}</p></div>`})()}</div></details>`:''}${q.sources?.length?`<div class="review-details">Sources: ${q.sources.map(v=>`<a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>`).join(' · ')}</div>`:''}</article>`;}
function reviewHTML(a){let qs=includedQs(a);const f=reviewFilter;if(f==='wrong')qs=qs.filter(q=>q.status!=='invalid'&&a.answers[q.n]&&a.answers[q.n]!==q.key);else if(f==='correct')qs=qs.filter(q=>q.status!=='invalid'&&a.answers[q.n]===q.key);else if(f==='skipped')qs=qs.filter(q=>!a.answers[q.n]);else if(f==='audit')qs=qs.filter(q=>q.status!=='ok');else if(f==='marked')qs=qs.filter(q=>a.flags?.[q.n]);else if(['fastwrong','slowwrong','typicalwrong'].includes(f))qs=qs.filter(q=>q.status!=='invalid'&&a.answers[q.n]&&a.answers[q.n]!==q.key&&speedTag(a,q).label===({fastwrong:'Fast',slowwrong:'Slow',typicalwrong:'Typical'})[f]);return `<div class="reviewtools"><label class="picker" for="reviewFilter">Show</label><select id="reviewFilter"><option value="all">All questions</option><option value="wrong">Incorrect only</option><option value="correct">Correct only</option><option value="skipped">Unattempted</option><option value="audit">Key-audit notes</option><option value="marked">Marked for review</option><option value="fastwrong">Fast incorrect</option><option value="typicalwrong">Typical-speed incorrect</option><option value="slowwrong">Slow incorrect</option></select><span class="fine">${qs.length} questions</span><button class="btn" id="reviewTop">Top ↑</button></div>${qs.length?qs.map(q=>reviewOneHTML(a,q)).join(''):'<div class="panel pad">No questions match this filter.</div>'}`;}
function questionTimesHTML(a){let qs=includedQs(a);return `<div class="panel pad"><div class="row between"><h2>Question timing ledger</h2><p class="fine">Measured time spent viewing each question</p></div>${a.legacyTiming||a.legacySummary?'<p class="fine">Timing was not recorded for this older attempt.</p>':`<div class="scroll-table"><table><thead><tr><th>Question</th><th>Section</th><th>Result</th><th>Time</th><th>Speed</th><th>Visits</th><th>Changes</th></tr></thead><tbody>${qs.map(q=>{let stat=timing(a,q.n),r=q.status==='invalid'?'Excluded':!a.answers[q.n]?'Skipped':a.answers[q.n]===q.key?'Correct':'Wrong';let speed=speedTag(a,q);return `<tr><td><button class="textlink" data-review-one="${q.n}">Q${q.n} →</button></td><td>${esc(SECTIONS[questionSection(q.n)])}</td><td>${r}</td><td class="numtext">${durationText(stat.ms)}</td><td><span class="tag ${speed.cls}">${speed.label}</span></td><td>${stat.visits}</td><td>${stat.changes}</td></tr>`;}).join('')}</tbody></table></div>`}</div>`;}
function drawResults(){const a=record(resultId);resultPaperId=a?.paperId||null;if(!a){screen='history';return drawHistory();}let score=summaryFor(a),isLegacy=a.legacySummary;let tabs=[['insights','Insights'],['review','Answer review'],['timing','Question times']];$('app').innerHTML=`<div class="row between results-header"><div><h1>Attempt analysis</h1><p class="fine">${esc(paperFor(a)?.name||a.paperId)} · ${esc(modeName(a.mode))} · ${dateText(a.finishedAt)}</p></div><div class="row"><button class="btn" id="historyBack">History</button><button class="btn" id="homeBack">Library</button></div></div><div class="viewtabs">${tabs.map(([key,label])=>`<button class="viewtab ${resultTab===key?'on':''}" data-tab="${key}">${label}</button>`).join('')}</div><div id="resultContent">${resultTab==='insights'?insightsHTML(a):resultTab==='review'?(isLegacy?`<div class="panel pad">Detailed answer records were not saved for this older attempt.</div>`:reviewHTML(a)):questionTimesHTML(a)}</div><footer>Saved on this device · Review, export and manage your data from History</footer>`;
 document.querySelectorAll('[data-tab]').forEach(el=>el.onclick=()=>{resultTab=el.dataset.tab;render()});$('historyBack').onclick=goHistory;$('homeBack').onclick=goHome;if($('reviewFilter')){$('reviewFilter').value=reviewFilter;$('reviewFilter').onchange=e=>{reviewFilter=e.target.value;render();};$('reviewTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});}if($('viewQuestionReview'))$('viewQuestionReview').onclick=()=>{resultTab='review';render();};if($('backLibrary'))$('backLibrary').onclick=goHome;document.querySelectorAll('[data-review-filter]').forEach(el=>el.onclick=()=>{reviewFilter=el.dataset.reviewFilter;resultTab='review';render();});document.querySelectorAll('[data-review-one]').forEach(el=>el.onclick=()=>{const target=+el.dataset.reviewOne;resultTab='review';reviewFilter='all';render();requestAnimationFrame(()=>document.getElementById('review-'+target)?.scrollIntoView({behavior:'smooth',block:'start'}));});}
function groupedHistory(){return attempts.filter(a=>a.finishedAt&&a.endedBy!=='discarded').filter(a=>historyFilter==='all'||a.paperId===historyFilter).sort((a,b)=>historySort==='oldest'?a.finishedAt-b.finishedAt:b.finishedAt-a.finishedAt);}
function historyTrendHTML(all){let eligible=all.filter(a=>!a.legacySummary&&summaryFor(a).max>0&&getPaper(a.paperId));
 if(!eligible.length)return '';
 let newest=[...eligible].sort((a,b)=>b.finishedAt-a.finishedAt)[0];let same=eligible.filter(a=>a.paperId===newest.paperId&&a.mode===newest.mode&&(a.mode!=='single'||a.singleSection===newest.singleSection)).sort((a,b)=>a.finishedAt-b.finishedAt).slice(-12);
 let desc=`${paperFor(newest).name} · ${modeName(newest.mode)}${newest.mode==='single'?' · '+SECTIONS[newest.singleSection]:''}`;
 if(same.length<2)return `<section class="panel pad trend-panel"><h3>Progress across attempts</h3><p class="fine">Complete this same paper and mode again to see a comparable score trend here. A single attempt is not enough for a trend.</p></section>`;
 const vals=same.map(a=>100*summaryFor(a).score/summaryFor(a).max),lo=Math.min(0,...vals),hi=Math.max(100,...vals),w=800,h=118,margin=20;
 let xy=vals.map((v,i)=>[(margin+(w-margin*2)*i/(vals.length-1)).toFixed(1),(h-margin-(h-margin*2)*(v-lo)/(hi-lo||1)).toFixed(1)]);
 let path=xy.map(([x,y],i)=>`${i?'L':'M'} ${x} ${y}`).join(' ');
 return `<section class="panel pad trend-panel"><div class="row between"><div><h3 style="margin:0">Progress across comparable attempts</h3><p class="fine" style="margin:5px 0 0">${esc(desc)} · ${same.length} latest attempts</p></div><b>${vals[vals.length-1].toFixed(1)}% <span class="fine">latest adjusted score</span></b></div><svg class="trend-chart" role="img" aria-label="Comparable attempt scores: ${vals.map(v=>v.toFixed(1)+' percent').join(', ')}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><path d="M ${margin} ${h-margin} H ${w-margin}" stroke="#dce6f0" stroke-width="2"/><path d="${path}" fill="none" stroke="#2468a7" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${xy.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5" fill="#fff" stroke="#2468a7" stroke-width="3"/>`).join('')}</svg><div class="row between fine"><span>${dateText(same[0].finishedAt)}</span><span>Scores shown as % of audited maximum</span><span>${dateText(same[same.length-1].finishedAt)}</span></div></section>`;
}
function drawHistory(){let list=groupedHistory(),all=attempts.filter(a=>a.finishedAt&&a.endedBy!=='discarded');let full=all.filter(a=>!a.legacySummary);let best=all.length?all.reduce((a,b)=>{let sc=summaryFor(a),sd=summaryFor(b);return sc.max&&sd.max&&sc.score/sc.max>sd.score/sd.max?a:b;},all[0]):null;
 $('app').innerHTML=`<div class="row between results-header"><div><h1>History & insights</h1><p class="muted">Revisit attempts, compare results and safeguard your data.</p></div><button class="btn" id="historyHome">← Test library</button></div><div class="history-metrics"><div class="panel"><strong>${all.length}</strong><span>Completed attempts</span></div><div class="panel"><strong>${new Set(all.map(a=>a.paperId)).size}</strong><span>Papers practised</span></div><div class="panel"><strong>${best?(100*summaryFor(best).score/(summaryFor(best).max||1)).toFixed(1)+'%':'—'}</strong><span>Best adjusted percentage*</span></div></div>${historyTrendHTML(all)}${historyPrioritiesHTML(all)}<div class="homegrid history-layout"><section class="panel pad"><div class="row between"><h2 style="margin:0">Saved attempts</h2><div class="row compact"><select id="historyFilter" aria-label="Filter papers"><option value="all">All papers</option>${Object.values(PAPERS).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><select id="historySort" aria-label="Sort attempts"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div></div>${list.length?list.map(a=>{let r=summaryFor(a);return `<div class="attempt-row"><button class="attempt-open" data-attempt="${esc(a.id)}"><span><b>${esc(paperFor(a)?.name||a.paperId)}</b><small>${dateText(a.finishedAt)} · ${esc(modeName(a.mode))}${a.legacySummary?' · Legacy summary':''}</small></span><span class="attempt-score">${signed(r.score)} <small>/ ${r.max}</small></span></button><button class="iconbtn" data-delete="${esc(a.id)}" aria-label="Delete attempt" title="Delete attempt">✕</button></div>`;}).join(''):'<p class="fine" style="margin-top:15px">No completed attempts match this filter.</p>'}</section><aside class="stack"><section class="panel pad"><h3>Storage & safety</h3><div class="storage-line"><span class="storage-indicator ${storageMode==='indexeddb'?'success':'warn'}"></span><b>${storageMode==='indexeddb'?'IndexedDB ready':'Browser fallback'}</b></div><p class="fine">${storageMode==='indexeddb'?'Attempts are saved as indexed records in your browser.':'IndexedDB is unavailable. History is being stored in localStorage and may be more fragile.'} Export backups to protect your history from clearing browser data or moving to another device.</p>${storageMessage?`<p class="fine bad">${esc(storageMessage)}</p>`:''}<p class="fine" id="quotaInfo">Checking storage quota…</p><div class="row"><button class="btn" id="requestPersist">Protect stored data</button></div></section><section class="panel pad"><h3>Backup & management</h3><div class="management-actions"><button class="btn primary" id="exportBackup">Export full backup (.json)</button><button class="btn" id="importBackup">Import / merge backup</button><input id="importFile" type="file" accept="application/json,.json" hidden><button class="btn danger" id="clearHistory" ${all.length?'':'disabled'}>Delete all completed attempts</button></div><p class="fine">Full backups include unfinished tests, frozen revisions, responses and an integrity checksum. Existing completed attempts cannot be overwritten.</p></section></aside></div><p class="fine">*Maximum marks differ between full-paper and single-section attempts; compare normalized percentages and the same test mode for meaningful progress.</p><footer>Practice Desk · Your data stays on this device unless you export it.</footer>`;
 $('historyHome').onclick=goHome;$('historyFilter').value=historyFilter;$('historySort').value=historySort;$('historyFilter').onchange=e=>{historyFilter=e.target.value;render();};$('historySort').onchange=e=>{historySort=e.target.value;render();};document.querySelectorAll('[data-attempt]').forEach(el=>el.onclick=()=>openResults(el.dataset.attempt));document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>deleteOne(el.dataset.delete));$('exportBackup').onclick=exportBackup;$('importBackup').onclick=()=>$('importFile').click();$('importFile').onchange=e=>importBackup(e.target.files?.[0]);$('clearHistory').onclick=clearHistory;$('requestPersist').onclick=requestPersist;showQuota();}
async function showQuota(){let node=$('quotaInfo');if(!node)return;try{if(!navigator.storage?.estimate){node.textContent='Storage estimate unavailable for this browser/file.';return;}let x=await navigator.storage.estimate();if(!node.isConnected)return;node.textContent=`Browser storage: ${((x.usage||0)/1048576).toFixed(1)} MiB used${x.quota?` of approximately ${(x.quota/1048576).toFixed(0)} MiB quota`:''}.`;}catch{node.textContent='Storage estimate unavailable.';}}
async function requestPersist(){if(!navigator.storage?.persist){notify('Persistent storage request is unavailable for this browser/file.');return;}try{let ok=await navigator.storage.persist();notify(ok?'Browser granted persistent storage.':'Browser did not grant persistent storage. Keep manual backups.');}catch{notify('Storage persistence cannot be requested here. Keep backups.');}}
function validImported(a){if(!a||typeof a!=='object'||typeof a.id!=='string'||a.id.length>200||(!getPaper(a.paperId)&&!a.frozenDisplay)||!['strict','free','single'].includes(a.mode))return false;
 if(a.finishedAt!=null&&(!Number.isFinite(a.finishedAt)||a.finishedAt<1))return false;
 if(!a.legacySummary&&!Number.isFinite(a.startedAt))return false;
 if(a.mode==='single'&&(!Number.isInteger(a.singleSection)||a.singleSection<0||a.singleSection>3))return false;
 if(a.answers&&(typeof a.answers!=='object'||Array.isArray(a.answers)))return false;
 if(a.timing&&(typeof a.timing!=='object'||Array.isArray(a.timing)))return false;
 if(a.sections&&(!Array.isArray(a.sections)||a.sections.length>4))return false;
 if(a.schema>=4&&(!a.frozen||!a.frozenDisplay||(a.finishedAt&&!a.scoreSnapshot)))return false;
 if(a.frozen){try{GENERIC_ENGINE.context(a);}catch{return false;}}
 for(const [n,v] of Object.entries(a.answers||{})){if(!/^(?:[1-9]|[1-9][0-9]|100)$/.test(n)||!letters.includes(v))return false;}
 return true;}
function exportBackup(){let payload=GENERIC_ENGINE.makeBackup(attempts,[...displayRevisions.values()],prefs,new Date().toISOString());let content=JSON.stringify(payload,null,2),blob=new Blob([content],{type:'application/json'});let url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Practice_Desk_Backup_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);notify('History backup exported.');}
function dbImportBackupBatch(records,revisions){
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(['attempts','revisions'],'readwrite');
  const store=tx.objectStore('attempts'),archive=tx.objectStore('revisions');
  for(const revision of revisions)archive.put(structuredClone(revision));
  for(const attempt of records)store.add(structuredClone(attempt));
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Backup transaction failed'));
  tx.onabort=()=>reject(tx.error||Error('Backup transaction aborted'));
 });
}
async function importBackup(file){
 if(!file)return;
 if(file.size>150*1024*1024){notify('Backup file exceeds 150 MB.');return;}
 let backup;
 try{backup=GENERIC_ENGINE.verifyBackup(JSON.parse(await file.text()));}
 catch(e){notify('Backup rejected: invalid format or integrity checksum.');console.warn('Backup',e);return;}
 if(!backup.attempts.length||backup.attempts.some(a=>!validImported(a))){
  notify('Backup rejected: at least one saved attempt is incomplete or incompatible.');return;
 }
 const incoming=GENERIC_ENGINE.planBackupMerge(attempts,backup.attempts,active?.id);
 if(!incoming.length){notify('These saved attempts are already present.');return;}
 if(!confirm(`Import ${incoming.length} saved attempts (including any unfinished tests)? Existing records will be preserved.`))return;
 if(db){
  try{await writeChain;await dbImportBackupBatch(incoming,backup.revisions);}
  catch(e){notify('Backup import failed; no records were imported.');console.warn('Backup import',e);return;}
 }
 for(const revision of backup.revisions){
  if(!displayRevisions.has(revision.id))displayRevisions.set(revision.id,revision);
  if(db)savedRevisionIds.add(revision.id);
 }
 attempts.push(...incoming);
 if(!db)fallbackSave();
 if(!active)restoreActive();
 render();notify(`Imported ${incoming.length} saved attempts.`);
}
async function upsertImported(a){let ix=attempts.findIndex(x=>x.id===a.id);if(ix>=0)attempts[ix]=a;else attempts.push(a);captureDisplayArchive(a);if(db)await queueWrite(()=>dbPutAttemptWithRevision(a));else fallbackSave();}
async function deleteOne(id){const a=record(id);if(!a||!a.finishedAt)return;if(!confirm(`Permanently delete this saved attempt from ${dateText(a.finishedAt)}? Export a backup first if needed.`))return;await removeAttempt(id);render();notify('Attempt deleted.');}
async function clearHistory(){let list=attempts.filter(a=>a.finishedAt);if(!list.length)return;if(!confirm(`Delete all ${list.length} completed attempt records from this browser? This cannot be undone without a backup.`))return;if(!confirm('Confirm permanent deletion of saved test history?'))return;for(let a of list)await removeAttempt(a.id);render();notify('Completed attempt history deleted.');}
function render(){if(screen==='exam'&&active){settleTimer();if(screen!=='exam')return;}if(screen==='exam'&&!active)screen='home';if(screen!=='exam')stopTracking();if(screen==='exam')drawExam();else if(screen==='results')drawResults();else if(screen==='history')drawHistory();else drawHome();}
document.addEventListener('keydown',e=>{if(screen!=='exam'||!active||active.pausedAt||e.target.closest('input,textarea,select'))return;const k=e.key.toLowerCase();if(k==='f'&&!e.ctrlKey&&!e.altKey&&!e.metaKey){e.preventDefault();toggleFullscreen();return;}if(letters.includes(k)){e.preventDefault();pickAnswer(k);}else if(k==='arrowright'){e.preventDefault();changeQuestion(Math.min(24,cursor+1));}else if(k==='arrowleft'){e.preventDefault();changeQuestion(Math.max(0,cursor-1));}else if(k==='m'){e.preventDefault();markQuestion();}});
document.addEventListener('visibilitychange',()=>{tabVisible=!document.hidden;if(active)GENERIC_ENGINE.event(active,{type:'VISIBILITY',nowMs:now(),visible:tabVisible});if(!tabVisible){stopTracking();if(active)upsertAttempt(active);}else{settleTimer();if(screen==='exam'){resetTracking();startTracking();render();}}});
window.addEventListener('pagehide',()=>{if(active){stopTracking();GENERIC_ENGINE.event(active,{type:'VISIBILITY',nowMs:now(),visible:false});saveActiveMirror();if(!db)fallbackSave();}});
setInterval(()=>{if(!active)return;let before=active.section;settleTimer();if(!active)return;if(screen==='exam'){if(before!==active.section)render();else updateClock();}},700);
$('app').innerHTML='<div class="panel pad">Opening your test library…</div>';initDisplayTools();initStorage();

