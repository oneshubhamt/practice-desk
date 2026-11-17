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
import {inspectExternalQuestionBank,toAuthoringDraft} from "../src/authoring/external-bank.ts";
import {publicationPlainText} from "../src/authoring/authoring-publisher.ts";
import {resolveTaxonomyPath,taxonomyNode,taxonomyPathNodes,validateExamTaxonomy} from "../src/domain/taxonomy.ts";
import {validateLearnerFocusPacket} from "../src/learning/learner-focus.ts";

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
const finite=(x,label,min,max)=>{
 if(typeof x!=="number"||!Number.isFinite(x)||x<min||x>max)
  fail(label+" must be a finite number from "+min+" to "+max);
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
const classification=(q,taxonomy)=>{
 const subject=String(q?.subject??"").trim(),topic=String(q?.topic??"").trim(),subtopic=String(q?.subtopic??"").trim();
 if(!taxonomy||!subject)return {subject,topic,subtopic,node:null,root:null};
 const node=resolveTaxonomyPath(taxonomy,[subject,...(topic?[topic]:[]),...(subtopic?[subtopic]:[])])??null;
 const root=node?taxonomyPathNodes(taxonomy,node.id)[0]??null:null;
 return {subject,topic,subtopic,node,root};
};
const sourceKey=(q,taxonomy)=>{
 const c=classification(q,taxonomy);
 return c.root?"taxonomy:"+c.root.id:"subject:"+(c.subject||"Unclassified");
};
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
function validateSubject(examId,s,taxonomy){
 str(s,"subjectKey",180);
 if(s.startsWith("taxonomy:")){
  if(!taxonomy)fail("taxonomy:<id> subject keys require an exam taxonomy");
  if(taxonomy.examId!==examId)fail("Taxonomy exam does not match blueprint exam");
  const node=taxonomyNode(taxonomy,s.slice(9));
  if(!node||node.kind!=="subject")fail("Unknown taxonomy subject "+s+" for "+examId);
 }else if(!s.startsWith("subject:")||!s.slice(8).trim()||s.length>180)
  fail("subjectKey must be taxonomy:<subject-id> or subject:<user label>");
 return s;
}
function validateBlueprint(value,taxonomy=undefined){
 const b=obj(value,"blueprint",["format","version","id","examId","paperId","revision",
  "targetCount","allowPartial","syllabus","taxonomyId","requirements","quotas","paperRules"]);
 if(b.format!==FORMAT||b.version!==1)fail("Expected "+FORMAT+" v1");
 str(b.id,"id",80);str(b.examId,"examId",80);str(b.paperId,"paperId",80);
 int(b.revision,"revision",1,1000000);int(b.targetCount,"targetCount",1,MAX_TOTAL);
 if(taxonomy){
  taxonomy=validateExamTaxonomy(taxonomy);
  if(taxonomy.examId!==b.examId)fail("Taxonomy examId does not match blueprint");
 }
 if(b.taxonomyId!==undefined){
  str(b.taxonomyId,"taxonomyId",120);
  if(!taxonomy||taxonomy.id!==b.taxonomyId)fail("Blueprint taxonomyId requires the matching taxonomy");
 }
 if(b.allowPartial!==undefined)bool(b.allowPartial,"allowPartial");
 if(b.paperRules!==undefined){
  const policy=obj(b.paperRules,"paperRules",["scoring","timing","navigation","tools","practiceModes","sections"]);
  if(!Object.keys(policy).length)fail("paperRules cannot be empty");
  const marking=(value,label,complete=false)=>{
   const rule=obj(value,label,["correctMarks","incorrectMarks","unansweredMarks"]);
   if(complete&&["correctMarks","incorrectMarks","unansweredMarks"].some(k=>rule[k]===undefined))
    fail(label+" must declare correctMarks, incorrectMarks and unansweredMarks");
   if(rule.correctMarks!==undefined)finite(rule.correctMarks,label+".correctMarks",0,1000);
   if(rule.incorrectMarks!==undefined)finite(rule.incorrectMarks,label+".incorrectMarks",-1000,0);
   if(rule.unansweredMarks!==undefined)finite(rule.unansweredMarks,label+".unansweredMarks",-1000,1000);
   if(rule.correctMarks!==undefined&&rule.incorrectMarks!==undefined&&rule.unansweredMarks!==undefined&&
      (rule.unansweredMarks<rule.incorrectMarks||rule.unansweredMarks>rule.correctMarks))
    fail(label+".unansweredMarks must lie between incorrect and correct marks");
   return rule;
  };
  if(policy.scoring!==undefined){
   const score=obj(policy.scoring,"paperRules.scoring",
    ["correctMarks","incorrectMarks","unansweredMarks","decimalPlaces","byQuestionKind"]);
   marking({correctMarks:score.correctMarks,incorrectMarks:score.incorrectMarks,
    unansweredMarks:score.unansweredMarks},"paperRules.scoring");
   if(score.decimalPlaces!==undefined)int(score.decimalPlaces,"paperRules.scoring.decimalPlaces",0,6);
   if(score.byQuestionKind!==undefined){
    const by=obj(score.byQuestionKind,"paperRules.scoring.byQuestionKind",KINDS);
    for(const [kind,rule] of Object.entries(by))marking(rule,"paperRules.scoring.byQuestionKind."+kind,true);
   }
  }
  if(policy.timing!==undefined){
   const timing=obj(policy.timing,"paperRules.timing",
    ["kind","minutes","pausePolicy","sectionTransition","allowEarlySubmit"]);
   if(timing.kind!==undefined&&!["untimed","whole-paper","sectional"].includes(timing.kind))
    fail("paperRules.timing.kind is unsupported");
   if(timing.minutes!==undefined)int(timing.minutes,"paperRules.timing.minutes",1,600);
   if(timing.pausePolicy!==undefined&&!["allowed","forbidden"].includes(timing.pausePolicy))
    fail("paperRules.timing.pausePolicy is unsupported");
   if(timing.sectionTransition!==undefined&&!["manual","automatic"].includes(timing.sectionTransition))
    fail("paperRules.timing.sectionTransition is unsupported");
   if(timing.allowEarlySubmit!==undefined)bool(timing.allowEarlySubmit,"paperRules.timing.allowEarlySubmit");
  }
  if(policy.navigation!==undefined){
   const navigation=obj(policy.navigation,"paperRules.navigation",
    ["questionNavigation","sectionNavigation","allowReview"]);
   if(navigation.questionNavigation!==undefined&&!["free","forward-only"].includes(navigation.questionNavigation))
    fail("paperRules.navigation.questionNavigation is unsupported");
   if(navigation.sectionNavigation!==undefined&&!["free","sequential-locked"].includes(navigation.sectionNavigation))
    fail("paperRules.navigation.sectionNavigation is unsupported");
   if(navigation.allowReview!==undefined)bool(navigation.allowReview,"paperRules.navigation.allowReview");
  }
  if(policy.tools!==undefined){
   const tools=obj(policy.tools,"paperRules.tools",["calculator","wordCount"]);
   if(tools.calculator!==undefined&&tools.calculator!=="basic-v1")
    fail('paperRules.tools.calculator must be "basic-v1"');
   if(tools.wordCount!==undefined&&!["auto","shown","hidden"].includes(tools.wordCount))
    fail("paperRules.tools.wordCount is unsupported");
  }
  if(policy.practiceModes!==undefined){
   const modes=list(policy.practiceModes,"paperRules.practiceModes",3,1);
   if(new Set(modes).size!==modes.length||modes.some(x=>!["strict","free","single"].includes(x)))
    fail("paperRules.practiceModes must contain unique strict/free/single values");
  }
  if(policy.sections!==undefined){
   const ids=new Set(),titles=new Set();
   for(const entry of list(policy.sections,"paperRules.sections",40,1)){
    const section=obj(entry,"paperRules.sections[]",["id","title","minutes","scoringOverride"]);
    const id=str(section.id,"paperRules.sections[].id",80);
    if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)||ids.has(id))
     fail("paperRules.sections[].id must be unique stable IDs");
    ids.add(id);
    const title=str(section.title,"paperRules.sections[].title",100);
    if(titles.has(title))fail("paperRules.sections[].title must be unique");
    titles.add(title);
    if(section.minutes!==undefined)int(section.minutes,"paperRules.sections[].minutes",0,600);
    if(section.scoringOverride!==undefined)marking(section.scoringOverride,"paperRules.sections[].scoringOverride",true);
   }
  }
 }
 const s=obj(b.syllabus,"syllabus",["basis","asOfDate","reference"]);
 if(!["user-defined","official-source-attributed","inferred-practice"].includes(s.basis))
  fail("Syllabus basis is attribution only: user-defined, official-source-attributed or inferred-practice");
 date(s.asOfDate,"syllabus.asOfDate");str(s.reference,"syllabus.reference",500);
 const r=obj(b.requirements,"requirements",
  ["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty","requireExplanation",
   "minCitations","allowedOrigins","maxTopicSharePercent","excludedTopics"]);
 for(const k of ["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty","requireExplanation"])
  if(r[k]!==undefined)bool(r[k],"requirements."+k);
 if(r.requireTaxonomy&&!taxonomy)fail("requireTaxonomy requires the matching exam taxonomy");
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
   validateSubject(b.examId,x.subjectKey,taxonomy);str(x.topic,"excluded topic",120);
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
    validateSubject(b.examId,x.subjectKey,taxonomy);str(x.topic,"topic",120);
    if(isSubtopic)str(x.subtopic,"subtopic",120);
    key=isSubtopic?subtopicKey(x.subjectKey,x.topic,x.subtopic):topicKey(x.subjectKey,x.topic);
   }else{
    key=str(x.key,group+" key",180);
    if(group==="subjects")validateSubject(b.examId,key,taxonomy);
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
function audit(plan,sources,tagDoc,{offset=0,limit=12,priorSources=[],coverageLimit=12,taxonomy=undefined}={}){
 const issues=[],all=[],batches=[],sourceHashes=[],bankIds=new Set(),questionIds=new Set();
 const add=(code,message,path="$",severity="error")=>issues.push({code,severity,basis:severity==="warning"?"heuristic":"deterministic",path,message});
 const first=sources[0]?.value,head=first?{scoring:first.scoring,timing:first.timing,navigation:first.navigation,
  tools:first.tools,practiceModes:first.practiceModes,sections:first.sections}:null;
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
    !isDeepStrictEqual(source.tools,head.tools)||
    !isDeepStrictEqual(source.practiceModes,head.practiceModes)||
    !isDeepStrictEqual(source.sections,head.sections))
   add("paper-rules-mismatch","Batches have different scoring/timing/navigation/tools/practice modes/physical sections",at);
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
 const stems=new Map(),nearSeen=[],topicShare=new Map(),answerPositions={};
 const optionLabel=index=>String.fromCharCode(65+index);
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
   if(stem.length>=55)nearSeen.push({bankId:source.bankId,name,kind:q.kind,prior:true,words:tokenSet(stem),grams:bigrams(stem)});
  }
 }
 const cognitiveRequired=Boolean(plan.quotas?.cognitive);
 if(cognitiveRequired&&!tagDoc)add("cognitive-tags-missing","Cognitive quotas require explicit attributed tag sidecar");
 const originAllowed=plan.requirements.allowedOrigins;
 const excluded=new Set((plan.requirements.excludedTopics??[]).map(x=>topicKey(x.subjectKey,x.topic)));
 for(const {bankId,q} of all){
  const c=classification(q,taxonomy);
  const name=bankId+"/"+q.id,root=sourceKey(q,taxonomy),topic=q.topic??"",subtopic=q.subtopic??"";
  if(plan.requirements.requireTaxonomy&&!c.node)
   add("taxonomy-classification-required","Question classification does not resolve through the bound exam taxonomy on "+name,"questions["+name+"]");
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
     if(prior.kind!==q.kind||(prior.bankId===bankId&&!prior.prior)||
      Math.abs(prior.words.size-words.size)>Math.max(prior.words.size,words.size)*0.25)continue;
     if(similarity(words,prior.words)>=0.78&&similarity(grams,prior.grams)>=0.62){
      if(nearDuplicateCandidates<200)
       add("near-duplicate-candidate","Possible near-duplicate "+name+" and "+prior.name+"; independently resolve before publishing","questions["+name+"]","warning");
      else nearDuplicateScanTruncated=true;
      nearDuplicateCandidates++;
     }
    }
    nearSeen.push({bankId,name,kind:q.kind,words,grams});
   }
  }
  if(q.kind==="single-choice"){
   for(let i=0;i<q.options.length;i++)answerPositions[optionLabel(i)]??=0;
   const answer=String(q.answer??"").toUpperCase(),index=answer.length===1?answer.charCodeAt(0)-65:-1;
   if(index>=0&&index<q.options.length)answerPositions[answer]++;
  }
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
  // Partial batches need not yet have their final topic mix. Assess the
  // maximum share against the requested final count, but never allow a topic
  // to exceed what could be repaired by remaining questions.
  // When a subject allocation exists, the final denominator is that
  // subject's planned count, not the entire paper.
  const subjectTarget=plan.quotas?.subjects?.targets?.find(x=>x.key===root)?.count;
  const denominator=partialDelivery?(subjectTarget??plan.targetCount):total;
  for(const [topic,n] of map)if(denominator>0&&n*100>maxShare*denominator)
   add("topic-overconcentration",root+"/"+topic+" covers "+n+
    " questions (> "+maxShare+"% of "+denominator+"-question "+
    (partialDelivery?"planned":"actual")+" denominator)","requirements.maxTopicSharePercent");
 }
 if(nearDuplicateScanTruncated)
  add("near-duplicate-report-truncated","More than 200 cross-batch candidates; inspect the entire source set","questions","warning");
 const issueCount=issues.length,blockingCount=issues.filter(x=>x.severity==="error").length;
 const coverageSummary={};
 for(const group of GROUPS){
  const rows=coverage[group];
  const mismatches=rows.filter(x=>x.difference!==0);
  coverageSummary[group]={totalTargets:rows.length,mismatches:mismatches.length,
   shown:Math.min(coverageLimit,rows.length),remainingTargets:Math.max(0,rows.length-coverageLimit)};
  coverage[group]=[...mismatches,...rows.filter(x=>x.difference===0)].slice(0,coverageLimit);
 }
 const countsByGroup=Object.fromEntries(GROUPS.map(g=>[g,counts[g].size]));
 const observed=Object.fromEntries(GROUPS.map(g=>{
  const sorted=[...counts[g].entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  return [g,{totalCategories:sorted.length,shown:sorted.slice(0,12).map(([key,count])=>({key,count})),
   remainingCategories:Math.max(0,sorted.length-12)}];
 }));
 return {format:"practice-desk-blueprint-audit",version:1,valid:blockingCount===0,
  readyForPublication:blockingCount===0&&!partialDelivery,partialDeliveryAllowed:plan.allowPartial===true,
  partialDelivery,remainingCount:Math.max(0,plan.targetCount-actualCount),
  nearDuplicateCandidates,nearDuplicateScanTruncated,
  comparisonSourceCount:priorSources.length,
  blueprintId:plan.id,examId:plan.examId,paperId:plan.paperId,revision:plan.revision,
  requestedCount:plan.targetCount,actualCount,sourceCount:sources.length,sourceHashes,
  factualVerification:"not-performed",cognitiveVerification:tagDoc?"author-attributed-not-independently-verified":"not-performed",
  coverage,coverageSummary,observed,categoryCardinality:countsByGroup,answerPositionCounts:answerPositions,batches,
  issues:{offset,limit,total:issueCount,blocking:blockingCount,warnings:issueCount-blockingCount,
   nextOffset:offset+limit<issueCount?offset+limit:null,
   remaining:Math.max(0,issueCount-offset-limit),items:issues.slice(offset,offset+limit)}};
}
const briefGroupOrder=["subjects","topics","subtopics","difficulties","kinds","origins","sections","cognitive"];
const stableSourceId=(value,label)=>{
 str(value,label,80);
 if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value))
  fail(label+" must use letters, numbers, underscores or hyphens");
 return value;
};
const briefKey=(group,key)=>{
 if(group==="topics"||group==="subtopics"){
  try{
   const parts=JSON.parse(key);
   if(Array.isArray(parts))return group==="topics"?
    {subjectKey:parts[0],topic:parts[1]}:
    {subjectKey:parts[0],topic:parts[1],subtopic:parts[2]};
  }catch{}
 }
 return {key};
};
const sourceEnvelope=(plan,sources,bankId,title)=>{
 let envelope;
 if(sources.length){
  envelope=structuredClone(sources[0].value);
  delete envelope.questions;delete envelope.stimuli;delete envelope.media;
 }else{
  const rules=plan.paperRules;
  if(!rules?.scoring||rules.scoring.correctMarks===undefined||rules.scoring.incorrectMarks===undefined||
     !rules?.timing?.kind||!Array.isArray(rules.sections)||!rules.sections.length)
   fail("brief without an existing source requires blueprint paperRules.scoring, paperRules.timing.kind and at least one paperRules.sections entry");
  const timing=structuredClone(rules.timing);
  const navigation=rules.navigation?structuredClone(rules.navigation):{
   questionNavigation:"free",
   sectionNavigation:timing.kind==="sectional"?"sequential-locked":"free",
   allowReview:true
  };
  envelope={
   format:"practice-desk-authoring",version:1,bankId,examId:plan.examId,paperId:plan.paperId,
   title,edition:"custom",revision:plan.revision,scoring:structuredClone(rules.scoring),
   timing,navigation,sections:structuredClone(rules.sections),
   ...(rules.tools?{tools:structuredClone(rules.tools)}:{}),
   ...(rules.practiceModes?{practiceModes:structuredClone(rules.practiceModes)}:{})
  };
 }
 envelope.bankId=bankId;envelope.title=title;
 envelope.examId=plan.examId;envelope.paperId=plan.paperId;envelope.revision=plan.revision;
 const sections=envelope.sections;
 if(!Array.isArray(sections)||!sections.length)
  fail("Authoring brief paper envelope must contain at least one physical section");
 try{
  const probes=sections.map((section,index)=>({
   id:"brief_probe_"+String(index+1).padStart(2,"0"),examSection:section.id,kind:"single-choice",
   prompt:"Authoring-envelope validation placeholder for section "+String(index+1)+".",
   options:["One","Two"],answer:"A",
   explanation:"Synthetic parser probe only; never emitted as authored content.",
   provenance:{kind:"ai-original",sourceNote:"Internal brief-envelope validation only"},
   qa:{status:"unchecked"}
  }));
  toAuthoringDraft({...structuredClone(envelope),questions:probes});
 }catch(error){
  fail("Authoring brief paper envelope is not a valid canonical source configuration: "+
   (error instanceof Error?error.message:"unknown validation failure"));
 }
 return envelope;
};
function buildAuthoringBrief(plan,planSha,sources,tagDoc,{priorSources=[],batchSize=8,bankId,title,taxonomy=undefined,learnerFocus=undefined}={}){
 stableSourceId(bankId,"--bank-id");
 str(title,"--title",180);
 if(sources.some(x=>x.value?.bankId===bankId))
  fail("--bank-id must be new for this authored batch");
 const planning={...plan,allowPartial:true};
 const tagsForEmpty=sources.length||tagDoc?tagDoc:{format:TAG_FORMAT,version:1,tags:[]};
 const audited=audit(planning,sources,tagsForEmpty,{limit:50,offset:0,priorSources,coverageLimit:MAX_TOTAL,taxonomy});
 if(audited.issues.blocking)
  fail("Cannot build authoring brief while current sources contradict the blueprint: "+
   audited.issues.items.filter(x=>x.severity==="error").slice(0,3).map(x=>x.code).join(", "));
 const deficits=[];
 for(const group of briefGroupOrder){
  for(const row of audited.coverage[group]??[]){
   if(row.difference>=0)continue;
   deficits.push({group,...briefKey(group,row.key),target:row.target,actual:row.actual,remaining:-row.difference});
  }
 }
 const byGroup=new Map(briefGroupOrder.map(group=>[group,deficits.filter(x=>x.group===group)]));
 const priorityDeficits=[];
 for(let round=0;priorityDeficits.length<24;round++){
  let added=false;
  for(const group of briefGroupOrder){
   const row=byGroup.get(group)?.[round];
   if(row&&priorityDeficits.length<24){priorityDeficits.push(row);added=true;}
  }
  if(!added)break;
 }
 const deficitByGroup=Object.fromEntries(briefGroupOrder.map(group=>{
  const rows=byGroup.get(group)??[],shown=priorityDeficits.filter(x=>x.group===group).length;
  return [group,{total:rows.length,shown,remaining:Math.max(0,rows.length-shown)}];
 }).filter(([,v])=>v.total>0));
 const requestedNow=Math.min(batchSize,audited.remainingCount);
 const envelope=sourceEnvelope(plan,sources,bankId,title);
 const occupiedIds=new Set(sources.flatMap(x=>Array.isArray(x.value?.questions)?
  x.value.questions.map(q=>q?.id).filter(id=>typeof id==="string"):[]));
 const suggestedQuestionIds=[];
 const prefix=bankId.slice(0,70).replace(/[-_]+$/u,"")||"batch";
 for(let serial=1;suggestedQuestionIds.length<requestedNow&&serial<=10000;serial++){
  const candidate=prefix+"-q"+String(serial).padStart(2,"0");
  if(candidate.length<=80&&!occupiedIds.has(candidate)){
   suggestedQuestionIds.push(candidate);occupiedIds.add(candidate);
  }
 }
 if(suggestedQuestionIds.length!==requestedNow)fail("Unable to reserve stable question IDs for requested batch");
 const sourcePolicy={
  syllabus:structuredClone(plan.syllabus),
  minCitations:plan.requirements.minCitations??0,
  allowedOrigins:structuredClone(plan.requirements.allowedOrigins??ORIGINS),
  excludedTopics:structuredClone(plan.requirements.excludedTopics??[]),
  maxTopicSharePercent:plan.requirements.maxTopicSharePercent??100
 };
 const classification={
  requireTaxonomy:plan.requirements.requireTaxonomy===true,
  requireTopic:plan.requirements.requireTopic===true,
  requireSubtopic:plan.requirements.requireSubtopic===true,
  requireDifficulty:plan.requirements.requireDifficulty===true
 };
 return {
  format:"practice-desk-authoring-brief",version:1,valid:true,
  blueprint:{id:plan.id,sha256:planSha,examId:plan.examId,paperId:plan.paperId,revision:plan.revision},
  workflow:{singleAgentCompatible:true,multipleAgentsRequired:false},
  task:{targetCount:plan.targetCount,alreadyAuthored:audited.actualCount,
   remainingCount:audited.remainingCount,requestedNow,suggestedQuestionIds},
  paper:{
   scoring:structuredClone(envelope.scoring),timing:structuredClone(envelope.timing),
   navigation:structuredClone(envelope.navigation),sections:structuredClone(envelope.sections),
   ...(envelope.tools?{tools:structuredClone(envelope.tools)}:{}),
   ...(envelope.practiceModes?{practiceModes:structuredClone(envelope.practiceModes)}:{})
  },
  sourcePolicy,classification,
  ...(taxonomy?{taxonomy:{id:taxonomy.id,title:taxonomy.title,basis:taxonomy.basis,
    asOfDate:taxonomy.asOfDate,reference:taxonomy.reference,nodes:taxonomy.nodes}}:{}),
  ...(learnerFocus?{
   learnerFocus:structuredClone(learnerFocus),
   personalisationIntent:{
    mode:learnerFocus.mode,intent:learnerFocus.intent,
    compositionPolicy:learnerFocus.compositionPolicy,
    guidance:structuredClone(learnerFocus.generationGuidance)
   }
  }:{}),
  itemWritingPriorities:[
   "Spend reasoning on exam-relevant substance, not Practice Desk mechanics.",
   "For automatically scored items, make the keyed answer uniquely defensible and distractors plausible.",
   "Avoid answer leakage, accidental hints, trivia-only wording traps and semantic duplicates.",
   "Use explanations to justify the key and resolve the misconception or distinction being tested.",
   "Research and verify legal, numerical, current and PYQ claims; never infer authority from this packet."
  ],
  priorityDeficits,
  deficitSummary:{shown:priorityDeficits.length,remaining:Math.max(0,deficits.length-priorityDeficits.length),
   byGroup:deficitByGroup,
   note:"Quota groups overlap; satisfy these constraints jointly rather than summing their remaining counts. Bounded output is interleaved across active quota groups so one dimension cannot hide all others."},
  dedupe:{comparisonSourceCount:audited.comparisonSourceCount,
   nearDuplicateCandidates:audited.nearDuplicateCandidates},
  outputContract:{
   sourceEnvelope:envelope,
   add:["questions","optional stimuli/media only when the authored items need shared context or images"],
   question:{
    coreRequired:["id","examSection","kind","prompt","answer","provenance","qa",
     ...(plan.requirements.requireExplanation===true?["explanation"]:[])],
    classification,
    kindSpecific:{
     "single-choice":"options: 2..26; one defensible keyed option",
     "multiple-select":"options: 2..26; answer plus optional selection/partial-credit fields",
     "numeric-entry":"numeric answer(s); optional tolerance",
     "true-false":"boolean or True/False answer",
     "matching":"leftItems/rightItems: 1..26 each",
     "free-response":"manual/self-assessed; wordLimit only when defensible"
    },
    qa:"Author-created or materially changed items remain unchecked/needs-review; do not self-certify."
   }
  },
  learnerFocusIncluded:Boolean(learnerFocus),
  factualVerification:"not-performed",
  note:"Decision-ready authoring context only. It omits existing question bodies, media bytes and repository/package placement. Research and verify factual, legal, current and PYQ claims outside this packet."
 };
}
const emit=v=>process.stdout.write(JSON.stringify(v,null,2)+"\n");
const failure=message=>{
 process.stderr.write(JSON.stringify({valid:false,code:"blueprint-input-invalid",message},null,2)+"\n");
 process.exitCode=2;
};
async function main(){
 const [command,...args]=process.argv.slice(2);
 const usage="Usage: content-blueprint.mjs validate <plan.json> [--taxonomy taxonomy.json] | audit <plan.json> <source.json>... [--taxonomy taxonomy.json] [--cognitive tags.json] [--against prior-bank.json]... [--offset N] [--limit 1..50] | brief <plan.json> [existing-source.json ...] --bank-id ID --title TITLE [--taxonomy taxonomy.json] [--learner-focus focus.json] [--batch-size 1..20] [--cognitive tags.json] [--against prior-bank.json]...";
 if(!["validate","audit","brief"].includes(command))fail(usage);
 if(command==="audit"&&args.length<2)fail("audit needs blueprint and at least one source");
 if(command==="brief"&&args.length<1)fail(usage);
 const planFile=await load(args[0],MAX_PLAN,"Blueprint");
 const files=[],priorPaths=[];let tagPath=null,taxonomyPath=null,focusPath=null,limit=12,offset=0,batchSize=8,bankId=null,title=null;
 for(let i=1;i<args.length;i++){
  const flag=args[i];
  if(["--taxonomy","--learner-focus","--cognitive","--limit","--offset","--against","--batch-size","--bank-id","--title"].includes(flag)){
   if(i+1>=args.length)fail("Missing argument after "+flag);
   if(flag==="--taxonomy"){
    if(taxonomyPath)fail("Duplicate --taxonomy");taxonomyPath=args[++i];
   }else if(flag==="--learner-focus"){
    if(command!=="brief")fail("--learner-focus is only valid for brief");
    if(focusPath)fail("Duplicate --learner-focus");focusPath=args[++i];
   }else if(flag==="--cognitive"){
    if(command==="validate")fail("--cognitive is not valid for validate");
    if(tagPath)fail("Duplicate --cognitive");tagPath=args[++i];
   }else if(flag==="--against"){
    priorPaths.push(args[++i]);
   }else if(flag==="--limit"){
    if(command!=="audit")fail("--limit is only valid for audit");
    const num=Number(args[++i]);
    if(!Number.isSafeInteger(num)||num<1||num>50)fail("Limit must be 1..50");
    limit=num;
   }else if(flag==="--offset"){
    if(command!=="audit")fail("--offset is only valid for audit");
    const num=Number(args[++i]);
    if(!Number.isSafeInteger(num)||num<0||num>1000000)fail("Offset must be 0..1000000");
    offset=num;
   }else if(flag==="--batch-size"){
    if(command!=="brief")fail("--batch-size is only valid for brief");
    const num=Number(args[++i]);
    if(!Number.isSafeInteger(num)||num<1||num>20)fail("Batch size must be 1..20");
    batchSize=num;
   }else if(flag==="--bank-id"){
    if(command!=="brief"||bankId!==null)fail("Duplicate or misplaced --bank-id");
    bankId=args[++i];
   }else{
    if(command!=="brief"||title!==null)fail("Duplicate or misplaced --title");
    title=args[++i];
   }
  }else if(flag.startsWith("--"))fail("Unknown flag "+flag);
  else files.push(flag);
 }
 if(command==="validate"&&files.length)fail("validate accepts only the blueprint and optional --taxonomy");
 const taxonomy=taxonomyPath?validateExamTaxonomy((await load(taxonomyPath,MAX_PLAN,"Taxonomy")).value):undefined;
 const plan=validateBlueprint(planFile.value,taxonomy);
 const learnerFocus=focusPath?validateLearnerFocusPacket((await load(focusPath,MAX_PLAN,"Learner focus")).value):undefined;
 if(learnerFocus&&learnerFocus.examId!==plan.examId)fail("Learner focus examId does not match blueprint examId");
 if(command==="validate"){
  emit({format:"practice-desk-blueprint-validation",version:1,valid:true,
   id:plan.id,targetCount:plan.targetCount,examId:plan.examId,paperId:plan.paperId,
   revision:plan.revision,sha256:planFile.digest,
   ...(taxonomy?{taxonomyId:taxonomy.id}:{}),
   quotaGroups:GROUPS.filter(g=>plan.quotas?.[g]),
   factualVerification:"not-performed",note:"A valid blueprint does not authenticate the curriculum or prove question quality."});
  return;
 }
 if(command==="audit"&&(files.length<1||files.length>MAX_FILES))
  fail("Supply 1.."+MAX_FILES+" source JSON files");
 if(command==="brief"&&files.length>MAX_FILES)fail("Supply at most "+MAX_FILES+" existing source JSON files");
 const sources=[];
 for(const path of files)sources.push(await load(path,MAX_SOURCE,"Source"));
 const tags=tagPath?(await load(tagPath,MAX_PLAN,"Cognitive tags")).value:undefined;
 if(priorPaths.length>MAX_FILES)fail("Too many comparison banks");
 const priorSources=[];
 for(const path of priorPaths)priorSources.push(await load(path,MAX_SOURCE,"Prior comparison source"));
 if(command==="brief"){
  const result=buildAuthoringBrief(plan,planFile.digest,sources,tags,{priorSources,batchSize,bankId,title,taxonomy,learnerFocus});
  emit(result);return;
 }
 const result=audit(plan,sources,tags,{limit,offset,priorSources,taxonomy});
 result.blueprintSha256=planFile.digest;
 emit(result);
 if(!result.valid)process.exitCode=1;
}
export {validateBlueprint,audit as auditBlueprint};
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{await main();}catch(e){failure(e instanceof Error?e.message:"Unknown failure");}
}
