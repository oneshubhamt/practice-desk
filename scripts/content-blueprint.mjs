#!/usr/bin/env node
/** P60-B: versioned source-only content blueprint and bounded coverage audit.
 * Does not alter the canonical question compiler, scorer, Wordgard, app or history.
 * Taxonomy/difficulty/cognitive tags are AUTHOR claims, not independent source proof.
 */
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {inspectExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {publicationPlainText} from "../src/authoring/authoring-publisher.ts";
import {syllabusHeading} from "../src/learning/syllabus-taxonomy.ts";

const FORMAT="practice-desk-content-blueprint",TAG_FORMAT="practice-desk-cognitive-tags";
const GROUPS=["subjects","topics","subtopics","difficulties","kinds","origins","sections","cognitive"];
const DIFFICULTIES=["easy","medium","hard"];
const KINDS=["single-choice","multiple-select","numeric-entry","true-false","matching","free-response"];
const ORIGINS=["ai-original","manual","reconstruction","official-pyq"];
const COGNITIVE=["recall","conceptual","application","reasoning"];
const MAX_PLAN=1024*1024,MAX_SOURCE=25*1024*1024,MAX_TOTAL=5000,MAX_FILES=32;
const hash=s=>createHash("sha256").update(s).digest("hex");
const fail=(message)=>{throw Error(message);};
const obj=(x,label,keys)=>{
 if(x===null||typeof x!=="object"||Array.isArray(x)||Object.getPrototypeOf(x)!==Object.prototype)
  fail(label+" must be a JSON object");
 for(const key of Object.keys(x))if(!keys.includes(key))fail(label+": unknown field "+key);
 return x;
};
const list=(x,label,max,min=0)=>{
 if(!Array.isArray(x)||x.length<min||x.length>max)fail(label+" must have "+min+".."+max+" entries");
 return x;
};
const str=(x,label,max=160)=>{
 if(typeof x!=="string"||!x.trim()||x!==x.trim()||x.length>max||/[\u0000-\u001f\u007f]/.test(x))
  fail(label+" must be nonempty, trimmed printable text (max "+max+")");
 return x;
};
const int=(x,label,min,max)=>{
 if(!Number.isSafeInteger(x)||x<min||x>max)fail(label+" must be an integer from "+min+" to "+max);
 return x;
};
const bool=(x,label)=>{if(typeof x!=="boolean")fail(label+" must be boolean");return x;};
const date=(x,label)=>{
 str(x,label,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(x))fail(label+" must be YYYY-MM-DD");
 const d=new Date(x+"T00:00:00Z");
 if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==x)fail(label+" must be a real ISO date");
 return x;
};
const sourceKey=(q)=>q.syllabusHeadingId?"heading:"+q.syllabusHeadingId:
 "subject:"+(q.subject||"Unclassified");
const topicKey=(s,t)=>JSON.stringify([s,t]);
const subtopicKey=(s,t,u)=>JSON.stringify([s,t,u]);
const normalize=(x)=>typeof x==="string"?x.normalize("NFKC").toLocaleLowerCase("en").replace(/^\s*(?:q(?:uestion)?\s*)?\d+[.)\s]+/iu,"").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," "):"";
const matchesSpecified=(actual,expected)=>{
 if(Array.isArray(expected))return Array.isArray(actual)&&actual.length===expected.length&&
  expected.every((v,i)=>matchesSpecified(actual[i],v));
 if(expected!==null&&typeof expected==="object")return actual!==null&&typeof actual==="object"&&
  Object.entries(expected).every(([key,val])=>matchesSpecified(actual[key],val));
 return isDeepStrictEqual(actual,expected);
};
const tokenSet=stem=>new Set(stem.split(" ").filter(Boolean));
const bigrams=stem=>{const words=stem.split(" ").filter(Boolean),out=new Set();
 for(let i=0;i<words.length-1;i++)out.add(words[i]+" "+words[i+1]);return out;};
const similarity=(a,b)=>{if(!a.size||!b.size)return 0;
 let common=0;for(const word of a)if(b.has(word))common++;
 return common/(a.size+b.size-common);};
async function load(path,max,label){
 const raw=await readFile(path,"utf8");
 if(Buffer.byteLength(raw)>max)fail(label+" exceeds byte limit "+max);
 let parsed;
 try{parsed=JSON.parse(raw);}catch{fail(label+" is not valid JSON");}
 return {raw,value:parsed,digest:hash(raw)};
}
function validateSubject(examId,s){
 str(s,"subjectKey",180);
 if(s.startsWith("heading:")){
  if(!syllabusHeading(examId,s.slice(8)))fail("Unknown official broad syllabus heading "+s+" for "+examId);
 }else if(!s.startsWith("subject:")||!s.slice(8).trim()||s.length>180)
  fail("subjectKey must be heading:<official-id> or subject:<user label>");
 return s;
}
function validateBlueprint(value){
 const b=obj(value,"blueprint",["format","version","id","examId","paperId","revision",
  "targetCount","allowPartial","syllabus","requirements","quotas","paperRules"]);
 if(b.format!==FORMAT||b.version!==1)fail("Expected "+FORMAT+" v1");
 str(b.id,"id",80);str(b.examId,"examId",80);str(b.paperId,"paperId",80);
 int(b.revision,"revision",1,1000000);int(b.targetCount,"targetCount",1,MAX_TOTAL);
 if(b.allowPartial!==undefined)bool(b.allowPartial,"allowPartial");
 if(b.paperRules!==undefined){
  const policy=obj(b.paperRules,"paperRules",["scoring","timing","navigation","sections"]);
  if(!Object.keys(policy).length)fail("paperRules cannot be empty");
  const legal={scoring:["correctMarks","incorrectMarks"],
   timing:["kind","minutes","pausePolicy","sectionTransition","allowEarlySubmit"],
   navigation:["questionNavigation","sectionNavigation","allowReview"]};
  for(const k of Object.keys(legal)){
   if(policy[k]!==undefined)obj(policy[k],"paperRules."+k,legal[k]);
  }
  if(policy.sections!==undefined){
   for(const entry of list(policy.sections,"paperRules.sections",40,1))
    obj(entry,"paperRules.sections[]",["id","title","minutes"]);
  }
 }
 const s=obj(b.syllabus,"syllabus",["basis","asOfDate","reference"]);
 if(!["user-defined","official-source-attributed","inferred-practice"].includes(s.basis))
  fail("Syllabus basis is attribution only: user-defined, official-source-attributed or inferred-practice");
 date(s.asOfDate,"syllabus.asOfDate");str(s.reference,"syllabus.reference",500);
 const r=obj(b.requirements,"requirements",
  ["requireTopic","requireSubtopic","requireDifficulty","requireExplanation",
   "minCitations","allowedOrigins","maxTopicSharePercent","excludedTopics"]);
 for(const k of ["requireTopic","requireSubtopic","requireDifficulty","requireExplanation"])
  if(r[k]!==undefined)bool(r[k],"requirements."+k);
 if(r.minCitations!==undefined)int(r.minCitations,"requirements.minCitations",0,12);
 if(r.maxTopicSharePercent!==undefined)int(r.maxTopicSharePercent,"requirements.maxTopicSharePercent",1,100);
 if(r.allowedOrigins!==undefined){
  const kinds=list(r.allowedOrigins,"allowedOrigins",ORIGINS.length,1);
  if(new Set(kinds).size!==kinds.length||kinds.some(k=>!ORIGINS.includes(k)))
   fail("allowedOrigins must list unique supported author claims");
 }
 if(r.excludedTopics!==undefined){
  const seen=new Set();
  for(const x of list(r.excludedTopics,"excludedTopics",100)){
   obj(x,"excluded topic",["subjectKey","topic"]);
   validateSubject(b.examId,x.subjectKey);str(x.topic,"excluded topic",120);
   const k=topicKey(x.subjectKey,x.topic);if(seen.has(k))fail("Repeated excluded topic");seen.add(k);
  }
 }
 const quotas=obj(b.quotas??{},"quotas",GROUPS);
 for(const group of GROUPS){
  if(quotas[group]===undefined)continue;
  const data=obj(quotas[group],"quotas."+group,["exhaustive","targets"]);
  const exhaustive=data.exhaustive===undefined?false:bool(data.exhaustive,group+".exhaustive");
  const targets=list(data.targets,group+".targets",MAX_TOTAL,1);
  const seen=new Set();let total=0;
  for(const x of targets){
   const isTopic=group==="topics",isSubtopic=group==="subtopics";
   obj(x,group+" target",isSubtopic?["subjectKey","topic","subtopic","count"]:
    isTopic?["subjectKey","topic","count"]:["key","count"]);
   int(x.count,group+" count",0,b.targetCount);
   let key;
   if(isTopic||isSubtopic){
    validateSubject(b.examId,x.subjectKey);str(x.topic,"topic",120);
    if(isSubtopic)str(x.subtopic,"subtopic",120);
    key=isSubtopic?subtopicKey(x.subjectKey,x.topic,x.subtopic):topicKey(x.subjectKey,x.topic);
   }else{
    key=str(x.key,group+" key",180);
    if(group==="subjects")validateSubject(b.examId,key);
    if(group==="difficulties"&&!DIFFICULTIES.includes(key))fail("Invalid difficulty quota "+key);
    if(group==="kinds"&&!KINDS.includes(key))fail("Invalid question-kind quota "+key);
    if(group==="origins"&&!ORIGINS.includes(key))fail("Invalid provenance quota "+key);
    if(group==="cognitive"&&!COGNITIVE.includes(key))fail("Invalid cognitive quota "+key);
   }
   if(seen.has(key))fail("Duplicate "+group+" quota "+key);
   seen.add(key);total+=x.count;
  }
  if(total>b.targetCount)fail(group+" quotas exceed requested total");
  if(exhaustive&&total!==b.targetCount)fail(group+" exhaustive quotas must sum to targetCount");
 }
 if(r.requireSubtopic&&!r.requireTopic)fail("requireSubtopic requires requireTopic");
 // Parent quota cannot be smaller than one of its child allocations.
 const mapped=g=>new Map((quotas[g]?.targets??[]).map(x=>[g==="topics"?topicKey(x.subjectKey,x.topic):
  g==="subtopics"?subtopicKey(x.subjectKey,x.topic,x.subtopic):x.key,x.count]));
 const roots=mapped("subjects"),topics=mapped("topics");
 const bySubject=new Map(),byTopic=new Map();
 for(const x of quotas.topics?.targets??[])
  bySubject.set(x.subjectKey,(bySubject.get(x.subjectKey)??0)+x.count);
 for(const x of quotas.subtopics?.targets??[]){
  const p=topicKey(x.subjectKey,x.topic);
  byTopic.set(p,(byTopic.get(p)??0)+x.count);
 }
 for(const [root,total] of bySubject)if(roots.has(root)&&total>roots.get(root))
  fail("Combined topic allocations exceed parent subject quota: "+root);
 for(const [p,total] of byTopic)if(topics.has(p)&&total>topics.get(p))
  fail("Combined subtopic allocations exceed parent topic quota: "+p);
 for(const x of quotas.topics?.targets??[]){
  if(roots.has(x.subjectKey)&&x.count>roots.get(x.subjectKey))
   fail("Topic quota exceeds its parent subject quota: "+x.topic);
  if(quotas.subjects?.exhaustive&&!roots.has(x.subjectKey))
   fail("Topic quota references an unallocated exhaustive subject: "+x.subjectKey);
 }
 for(const x of quotas.subtopics?.targets??[]){
  const parent=topicKey(x.subjectKey,x.topic);
  if(roots.has(x.subjectKey)&&x.count>roots.get(x.subjectKey))
   fail("Subtopic quota exceeds subject quota: "+x.subtopic);
  if(topics.has(parent)&&x.count>topics.get(parent))
   fail("Subtopic quota exceeds its parent topic quota: "+x.subtopic);
  if(quotas.subjects?.exhaustive&&!roots.has(x.subjectKey))
   fail("Subtopic quota references an unallocated exhaustive subject: "+x.subjectKey);
  if(quotas.topics?.exhaustive&&!topics.has(parent))
   fail("Subtopic quota references an unallocated exhaustive topic: "+x.topic);
 }
 return b;
}
function audit(plan,sources,tagDoc,{offset=0,limit=12,priorSources=[]}={}){
 const issues=[],all=[],batches=[],sourceHashes=[],bankIds=new Set(),questionIds=new Set();
 const add=(code,message,path="$",severity="error")=>issues.push({code,severity,basis:severity==="warning"?"heuristic":"deterministic",path,message});
 const first=sources[0]?.value,head=first?{scoring:first.scoring,timing:first.timing,navigation:first.navigation,sections:first.sections}:null;
 for(const [k,expected] of Object.entries(plan.paperRules??{}))
  if(first&&!matchesSpecified(first[k],expected))add("paper-policy-mismatch","Authored "+k+" does not match user blueprint paperRules."+k,"paperRules."+k);
 for(const {value:source,digest} of sources){
  sourceHashes.push(digest);
  const at="banks["+(batches.length)+"]";
  const bankId=source?.bankId;
  if(typeof bankId!=="string"||!bankId){add("bank-id-invalid","Missing stable bankId",at);continue;}
  if(bankIds.has(bankId))add("duplicate-bank-id","Repeated bankId "+bankId,at);
  bankIds.add(bankId);
  if(source.examId!==plan.examId||source.paperId!==plan.paperId||source.revision!==plan.revision)
   add("paper-mismatch","Paper examId/paperId/revision does not match blueprint",at);
  if(!isDeepStrictEqual(source.scoring,head.scoring)||
    !isDeepStrictEqual(source.timing,head.timing)||
    !isDeepStrictEqual(source.navigation,head.navigation)||
    !isDeepStrictEqual(source.sections,head.sections))
   add("paper-rules-mismatch","Batches have different scoring/timing/navigation/physical sections",at);
  const check=inspectExternalQuestionBank(source);
  if(!check.valid)add("source-invalid","Canonical P57/P59 source QA failed for "+bankId,at);
  batches.push({bankId,count:check.questionCount,sourceValid:check.valid,
   qaErrors:check.quality?.summary.errors??check.issues.length,
   qaWarnings:check.quality?.summary.warnings??0});
  for(const row of (check.issues??[]).filter(x=>x.severity==="error").slice(0,3))
   add("source-qa-error",row.message,at+":"+row.path);
  if(!Array.isArray(source.questions))continue;
  for(const q of source.questions){
   if(!q||typeof q!=="object"||typeof q.id!=="string")continue;
   if(questionIds.has(q.id))add("duplicate-question-id","Repeated question ID "+q.id,at);
   questionIds.add(q.id);
   all.push({bankId,q});
  }
 }
 if(all.length>MAX_TOTAL)add("too-many-questions","Audit limit exceeded");
 const tags=new Map(),seenTags=new Set();
 if(tagDoc!==undefined){
  try{
   const doc=obj(tagDoc,"cognitive tags",["format","version","tags"]);
   if(doc.format!==TAG_FORMAT||doc.version!==1)fail("Invalid cognitive tags v1");
   for(const entry of list(doc.tags,"cognitive tags",MAX_TOTAL)){
    obj(entry,"cognitive tag",["bankId","questionId","level"]);
    str(entry.bankId,"cognitive bank",80);str(entry.questionId,"cognitive question",80);
    if(!COGNITIVE.includes(entry.level))fail("Unsupported cognitive tag");
    const id=JSON.stringify([entry.bankId,entry.questionId]);
    if(seenTags.has(id))fail("Duplicate cognitive tag");
    seenTags.add(id);tags.set(id,entry.level);
   }
  }catch(error){add("cognitive-tags-invalid",error.message,"cognitive");}
 }
 const counts=Object.fromEntries(GROUPS.map(g=>[g,new Map()]));
 const tick=(g,key)=>counts[g].set(key,(counts[g].get(key)??0)+1);
 const stems=new Map(),nearSeen=[],topicShare=new Map(),answerPositions={A:0,B:0,C:0,D:0};
 let nearDuplicateCandidates=0,nearDuplicateScanTruncated=false;
 // Prior banks are for deduplication only: never counted against delivery quotas.
 for(const prior of priorSources){
  const source=prior.value??prior;
  const check=inspectExternalQuestionBank(source);
  if(!check.valid){add("comparison-source-invalid","Prior comparison bank failed canonical QA");continue;}
  if(source.examId!==plan.examId){add("comparison-exam-mismatch","Prior bank must belong to the same examination");continue;}
  for(const q of source.questions){
   const stem=normalize(typeof q.prompt==="string"?q.prompt:publicationPlainText(q.prompt));
   if(!stem)continue;
   const name=source.bankId+"/"+q.id;
   if(!stems.has(stem))stems.set(stem,name);
   if(stem.length>=55)nearSeen.push({bankId:source.bankId,name,words:tokenSet(stem),grams:bigrams(stem)});
  }
 }
 const cognitiveRequired=Boolean(plan.quotas?.cognitive);
 if(cognitiveRequired&&!tagDoc)add("cognitive-tags-missing","Cognitive quotas require explicit attributed tag sidecar");
 const originAllowed=plan.requirements.allowedOrigins;
 const excluded=new Set((plan.requirements.excludedTopics??[]).map(x=>topicKey(x.subjectKey,x.topic)));
 for(const {bankId,q} of all){
  const name=bankId+"/"+q.id,root=sourceKey(q),topic=q.topic??"",subtopic=q.subtopic??"";
  tick("subjects",root);tick("sections",q.examSection??"unspecified");
  tick("difficulties",q.difficulty||"unspecified");
  tick("kinds",q.kind||"unspecified");
  tick("origins",q.provenance?.kind||"unspecified");
  if(topic){
   tick("topics",topicKey(root,topic));
   const map=topicShare.get(root)??new Map();map.set(topic,(map.get(topic)??0)+1);topicShare.set(root,map);
  }
  if(topic&&subtopic)tick("subtopics",subtopicKey(root,topic,subtopic));
  const id=JSON.stringify([bankId,q.id]);
  if(tags.has(id))tick("cognitive",tags.get(id));
  else if(cognitiveRequired)add("cognitive-tag-missing","Missing author-attributed cognitive level for "+name,"questions["+name+"]");
  if(plan.requirements.requireTopic&&!topic)add("topic-required","Missing topic on "+name,"questions["+name+"]");
  if(plan.requirements.requireSubtopic&&!subtopic)add("subtopic-required","Missing subtopic on "+name,"questions["+name+"]");
  if(plan.requirements.requireDifficulty&&!q.difficulty)add("difficulty-required","Missing difficulty on "+name,"questions["+name+"]");
  if(plan.requirements.requireExplanation){
   const raw=q.explanation;
   let present=typeof raw==="string"?raw.trim():null;
   if(raw&&typeof raw==="object"){
    try{present=publicationPlainText(raw).trim();}catch{present="";}
   }
   if(!present)add("explanation-required","Missing worked explanation on "+name,"questions["+name+"]");
  }
  if((q.provenance?.sources?.length??0)<(plan.requirements.minCitations??0))
   add("citations-required","Insufficient attributed citations on "+name,"questions["+name+"]");
  if(originAllowed&&!originAllowed.includes(q.provenance?.kind))
   add("origin-not-allowed","Source origin is outside requested policy on "+name,"questions["+name+"]");
  if(excluded.has(topicKey(root,topic)))add("excluded-topic","Excluded topic present on "+name,"questions["+name+"]");
  let visibleStem="";
  try{visibleStem=typeof q.prompt==="string"?q.prompt:publicationPlainText(q.prompt);}catch{}
  const stem=normalize(visibleStem);
  if(stem){
   const earlier=stems.get(stem);
   if(earlier)add("duplicate-stem","Repeated normalized question stem "+name+" and "+earlier,"questions["+name+"]");
   else stems.set(stem,name);
   if(stem.length>=55){
    const words=tokenSet(stem),grams=bigrams(stem);
    for(const prior of nearSeen){
     if(prior.bankId===bankId||Math.abs(prior.words.size-words.size)>Math.max(prior.words.size,words.size)*0.25)continue;
     if(similarity(words,prior.words)>=0.78&&similarity(grams,prior.grams)>=0.62){
      if(nearDuplicateCandidates<200)
       add("near-duplicate-candidate","Possible near-duplicate "+name+" and "+prior.name+"; independently resolve before publishing","questions["+name+"]","warning");
      else nearDuplicateScanTruncated=true;
      nearDuplicateCandidates++;
     }
    }
    nearSeen.push({bankId,name,words,grams});
   }
  }
  if(q.kind==="single-choice"&&"ABCD".includes(q.answer)&&q.answer.length===1)answerPositions[q.answer]++;
 }
 for(const tagged of tags.keys()){
  if(!all.some(x=>JSON.stringify([x.bankId,x.q.id])===tagged))
   add("cognitive-tag-unknown","Tag does not correspond to an audited source question","cognitive");
 }
 const actualCount=all.length;
 const partialDelivery=plan.allowPartial===true&&actualCount<plan.targetCount;
 if(actualCount>plan.targetCount||(!partialDelivery&&actualCount!==plan.targetCount))
  add("target-count","Actual "+actualCount+" vs requested "+plan.targetCount);
 const coverage={};
 for(const group of GROUPS){
  const targets=plan.quotas?.[group]?.targets??[];
  coverage[group]=targets.map(x=>{
   const k=group==="topics"?topicKey(x.subjectKey,x.topic):
    group==="subtopics"?subtopicKey(x.subjectKey,x.topic,x.subtopic):x.key;
   const actual=counts[group].get(k)??0;
   return {key:k,target:x.count,actual,difference:actual-x.count};
  });
  for(const row of coverage[group])if(row.difference>0||(row.difference<0&&!partialDelivery))
   add("quota-mismatch",group+" "+row.key+": expected "+row.target+", found "+row.actual,"quotas."+group);
  // Explicit partial delivery discloses deficits; oversupply and unallocated items still block.
  if(plan.quotas?.[group]?.exhaustive){
   const specified=new Set(coverage[group].map(x=>x.key));
   let outside=0;
   for(const [k,n] of counts[group])if(!specified.has(k))outside+=n;
   if(outside)add("unallocated-category",group+" has "+outside+" questions outside exhaustive allocations","quotas."+group);
  }
 }
 const maxShare=plan.requirements.maxTopicSharePercent??100;
 for(const [root,map] of topicShare){
  const total=counts.subjects.get(root)??0;
  for(const [topic,n] of map)if(total>0&&n*100>maxShare*total)
   add("topic-overconcentration",root+"/"+topic+" covers "+n+" of "+total+" questions (> "+maxShare+"%)","requirements.maxTopicSharePercent");
 }
 if(nearDuplicateScanTruncated)
  add("near-duplicate-report-truncated","More than 200 cross-batch candidates; inspect the entire source set","questions","warning");
 const issueCount=issues.length,blockingCount=issues.filter(x=>x.severity==="error").length;
 const coverageSummary={};
 for(const group of GROUPS){
  const rows=coverage[group];
  const mismatches=rows.filter(x=>x.difference!==0);
  coverageSummary[group]={totalTargets:rows.length,mismatches:mismatches.length,
   shown:Math.min(12,rows.length),remainingTargets:Math.max(0,rows.length-12)};
  coverage[group]=[...mismatches,...rows.filter(x=>x.difference===0)].slice(0,12);
 }
 const countsByGroup=Object.fromEntries(GROUPS.map(g=>[g,counts[g].size]));
 const observed=Object.fromEntries(GROUPS.map(g=>{
  const sorted=[...counts[g].entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return [g,{totalCategories:sorted.length,shown:sorted.slice(0,12).map(([key,count])=>({key,count})),
   remainingCategories:Math.max(0,sorted.length-12)}];
 }));
 return {format:"practice-desk-blueprint-audit",version:1,valid:blockingCount===0,
  readyForPublication:blockingCount===0,partialDeliveryAllowed:plan.allowPartial===true,
  partialDelivery,remainingCount:Math.max(0,plan.targetCount-actualCount),
  nearDuplicateCandidates,nearDuplicateScanTruncated,
  blueprintId:plan.id,examId:plan.examId,paperId:plan.paperId,revision:plan.revision,
  requestedCount:plan.targetCount,actualCount,sourceCount:sources.length,sourceHashes,
  factualVerification:"not-performed",cognitiveVerification:tagDoc?"author-attributed-not-independently-verified":"not-performed",
  coverage,coverageSummary,observed,categoryCardinality:countsByGroup,answerPositionCounts:answerPositions,batches,
  issues:{offset,limit,total:issueCount,blocking:blockingCount,warnings:issueCount-blockingCount,
   nextOffset:offset+limit<issueCount?offset+limit:null,
   remaining:Math.max(0,issueCount-offset-limit),items:issues.slice(offset,offset+limit)}};
}
const emit=v=>process.stdout.write(JSON.stringify(v,null,2)+"\n");
const failure=message=>{
 process.stderr.write(JSON.stringify({valid:false,code:"blueprint-input-invalid",message},null,2)+"\n");
 process.exitCode=2;
};
async function main(){
 const [command,...args]=process.argv.slice(2);
 if(!["validate","audit"].includes(command))fail("Usage: content-blueprint.mjs validate <plan.json> | audit <plan.json> <source.json>... [--cognitive tags.json] [--against prior-bank.json]... [--offset N] [--limit 1..50]");
 if(command==="validate"&&args.length!==1)fail("validate takes only one blueprint file");
 if(command==="audit"&&args.length<2)fail("audit needs blueprint and at least one source");
 const planFile=await load(args[0],MAX_PLAN,"Blueprint");
 const plan=validateBlueprint(planFile.value);
 if(command==="validate"){
  emit({format:"practice-desk-blueprint-validation",version:1,valid:true,
   id:plan.id,targetCount:plan.targetCount,examId:plan.examId,paperId:plan.paperId,
   revision:plan.revision,sha256:planFile.digest,
   quotaGroups:GROUPS.filter(g=>plan.quotas?.[g]),
   factualVerification:"not-performed",note:"A valid blueprint does not authenticate the curriculum or prove question quality."});
  return;
 }
 const files=[],priorPaths=[];let tagPath=null,limit=12,offset=0;
 for(let i=1;i<args.length;i++){
  if(args[i]==="--cognitive"||args[i]==="--limit"||args[i]==="--offset"||args[i]==="--against"){
   if(i+1>=args.length)fail("Missing argument after "+args[i]);
   if(args[i]==="--cognitive"){
    if(tagPath)fail("Duplicate --cognitive");tagPath=args[++i];
   }else if(args[i]==="--against"){
    priorPaths.push(args[++i]);
   }else if(args[i]==="--limit"){
    const num=Number(args[++i]);
    if(!Number.isSafeInteger(num)||num<1||num>50)fail("Limit must be 1..50");
    limit=num;
   }else{
    const num=Number(args[++i]);
    if(!Number.isSafeInteger(num)||num<0||num>1000000)fail("Offset must be 0..1000000");
    offset=num;
   }
  }else if(args[i].startsWith("--"))fail("Unknown flag "+args[i]);
  else files.push(args[i]);
 }
 if(files.length<1||files.length>MAX_FILES)fail("Supply 1.."+MAX_FILES+" source JSON files");
 const sources=[];
 for(const path of files)sources.push(await load(path,MAX_SOURCE,"Source"));
 const tags=tagPath?(await load(tagPath,MAX_PLAN,"Cognitive tags")).value:undefined;
 if(priorPaths.length>MAX_FILES)fail("Too many comparison banks");
 const priorSources=[];
 for(const path of priorPaths)priorSources.push(await load(path,MAX_SOURCE,"Prior comparison source"));
 const result=audit(plan,sources,tags,{limit,offset,priorSources});
 result.blueprintSha256=planFile.digest;
 emit(result);
 if(!result.valid)process.exitCode=1;
}
export {validateBlueprint,audit as auditBlueprint};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(e){failure(e instanceof Error?e.message:"Unknown failure");}
}
