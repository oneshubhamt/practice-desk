import {toAuthoringDraft} from "./external-bank.ts";
import {sha256} from "../domain/hash.ts";
import {taxonomyNode,taxonomyPathNodes,validateExamTaxonomy,type ExamTaxonomy} from "../domain/taxonomy.ts";

const BRIEF_FORMAT="practice-desk-authoring-brief";
const BLUEPRINT_FORMAT="practice-desk-content-blueprint";
const GROUPS=["subjects","topics","subtopics","difficulties","kinds","origins","sections","cognitive"] as const;
type Group=(typeof GROUPS)[number];
const stableIdPattern=/^[A-Za-z0-9][A-Za-z0-9_-]*$/u;
const plain=(value:unknown,label:string):Record<string,unknown>=>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error(label+" must be a plain object");
 return value as Record<string,unknown>;
};
const only=(value:Record<string,unknown>,fields:readonly string[],label:string):void=>{
 for(const field of Object.keys(value))if(!fields.includes(field))throw Error(label+" contains unsupported field "+field);
};
const text=(value:unknown,label:string,max=2000):string=>{
 if(typeof value!=="string"||!value.trim()||value!==value.trim()||value.length>max||
   /[\u0000-\u001f\u007f]/u.test(value))throw Error("Invalid "+label);
 return value;
};
const integer=(value:unknown,label:string,min=0,max=100000):number=>{
 if(!Number.isSafeInteger(value)||Number(value)<min||Number(value)>max)throw Error("Invalid "+label);
 return Number(value);
};
const bool=(value:unknown,label:string):boolean=>{
 if(typeof value!=="boolean")throw Error("Invalid "+label);
 return value;
};
const same=(a:unknown,b:unknown):boolean=>{
 if(Object.is(a,b))return true;
 if(Array.isArray(a)||Array.isArray(b))
  return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));
 if(a&&b&&typeof a==="object"&&typeof b==="object"){
  const aa=a as Record<string,unknown>,bb=b as Record<string,unknown>,ak=Object.keys(aa),bk=Object.keys(bb);
  return ak.length===bk.length&&ak.every(k=>Object.hasOwn(bb,k)&&same(aa[k],bb[k]));
 }
 return false;
};
const stringArray=(value:unknown,label:string,min:number,max:number):string[]=>{
 if(!Array.isArray(value)||value.length<min||value.length>max)throw Error("Invalid "+label);
 return value.map((item,index)=>text(item,label+"["+index+"]",2000));
};
const isGroup=(value:unknown):value is Group=>typeof value==="string"&&(GROUPS as readonly string[]).includes(value);

function validateEnvelope(value:unknown):Record<string,unknown>{
 const envelope=plain(value,"authoring brief sourceEnvelope");
 const sections=envelope.sections;
 if(!Array.isArray(sections)||!sections.length)throw Error("Authoring brief sourceEnvelope requires sections");
 const probes=sections.map((entry,index)=>{
  const section=plain(entry,"authoring brief section "+index);
  return {id:"brief_probe_"+String(index+1).padStart(2,"0"),examSection:text(section.id,"section id",80),
   kind:"single-choice",prompt:"Authoring-envelope validation placeholder "+String(index+1)+".",
   options:["One","Two"],answer:"A",explanation:"Synthetic parser probe only.",
   provenance:{kind:"ai-original",sourceNote:"Internal Authoring Brief validation only"},qa:{status:"unchecked"}};
 });
 try{toAuthoringDraft({...structuredClone(envelope),questions:probes});}
 catch(error){throw Error("Invalid Authoring Brief source envelope: "+(error instanceof Error?error.message:"unknown error"));}
 return envelope;
}

export function authoringClassificationPolicy(requirements:Record<string,unknown>):Readonly<Record<string,unknown>>{
 return {
  requireTaxonomy:requirements.requireTaxonomy===true,
  requireTopic:requirements.requireTopic===true,
  requireSubtopic:requirements.requireSubtopic===true,
  requireDifficulty:requirements.requireDifficulty===true,
  taxonomyAssignmentPolicy:"deepest-defensible",
  difficultyAssignmentPolicy:requirements.requireDifficulty===true?"required-by-blueprint":"when-defensible"
 };
}

const rootIdForDeficit=(taxonomy:ExamTaxonomy,row:Record<string,unknown>):string|undefined=>{
 const raw=row.group==="subjects"?row.key:row.group==="topics"||row.group==="subtopics"?row.subjectKey:undefined;
 if(typeof raw!=="string"||!raw.startsWith("taxonomy:"))return undefined;
 const id=raw.slice(9),node=taxonomyNode(taxonomy,id);
 return node?.kind==="subject"?node.id:undefined;
};
export function buildAuthoringTaxonomySlice(
 value:ExamTaxonomy,deficits:readonly Record<string,unknown>[],requestedNow:number
):{taxonomy:ExamTaxonomy;scope:Readonly<Record<string,unknown>>}{
 const taxonomy=validateExamTaxonomy(value),roots: string[]=[];
 const subjectRows=deficits.filter(row=>row.group==="subjects");
 const fallbackRows=deficits.filter(row=>row.group==="topics"||row.group==="subtopics");
 const choose=(rows:readonly Record<string,unknown>[]):void=>{
  let capacity=0;
  for(const row of rows){
   const id=rootIdForDeficit(taxonomy,row);
   if(!id||roots.includes(id))continue;
   roots.push(id);capacity+=typeof row.remaining==="number"?Math.max(1,row.remaining):1;
   if(capacity>=Math.max(1,requestedNow))break;
  }
 };
 choose(subjectRows);if(!roots.length)choose(fallbackRows);
 if(!roots.length){
  for(const node of taxonomy.nodes){
   if(node.kind!=="subject")continue;
   roots.push(node.id);
   if(roots.length>=Math.max(1,requestedNow))break;
  }
 }
 const selected=new Set(roots);
 for(const node of taxonomy.nodes){
  const path=taxonomyPathNodes(taxonomy,node.id);
  if(path.some(parent=>selected.has(parent.id)))for(const part of path)selected.add(part.id);
 }
 const nodes=taxonomy.nodes.filter(node=>selected.has(node.id));
 const sliced=validateExamTaxonomy({...taxonomy,nodes});
 return {taxonomy:sliced,scope:{mode:"batch-relevant",totalNodes:taxonomy.nodes.length,
  includedNodes:nodes.length,omittedNodes:taxonomy.nodes.length-nodes.length,selectedRootIds:roots}};
}

export function validateAuthoringBrief(
 value:unknown,options:{readonly standardOnly?:boolean}={}
):Readonly<Record<string,unknown>>{
 const raw=plain(value,"authoring brief");
 only(raw,["format","version","valid","blueprint","workflow","task","paper","sourcePolicy","classification",
  "taxonomy","taxonomyScope","itemWritingPriorities","priorityDeficits","deficitSummary","dedupe","outputContract",
  "learnerFocusIncluded","learnerFocus","personalisationIntent","factualVerification","note"],"authoring brief");
 if(raw.format!==BRIEF_FORMAT||raw.version!==1||raw.valid!==true)
  throw Error("Expected a valid practice-desk-authoring-brief v1");
 const blueprint=plain(raw.blueprint,"authoring brief blueprint");
 only(blueprint,["id","sha256","examId","paperId","revision"],"authoring brief blueprint");
 text(blueprint.id,"blueprint id",120);text(blueprint.examId,"blueprint examId",120);
 text(blueprint.paperId,"blueprint paperId",120);integer(blueprint.revision,"blueprint revision",1,1000000);
 if(typeof blueprint.sha256!=="string"||!/^[a-f0-9]{64}$/u.test(blueprint.sha256))
  throw Error("Invalid authoring brief blueprint sha256");
 const workflow=plain(raw.workflow,"authoring brief workflow");
 only(workflow,["singleAgentCompatible","multipleAgentsRequired"],"authoring brief workflow");
 if(workflow.singleAgentCompatible!==true||workflow.multipleAgentsRequired!==false)
  throw Error("Authoring Brief workflow contract mismatch");
 const task=plain(raw.task,"authoring brief task");
 only(task,["targetCount","alreadyAuthored","remainingCount","requestedNow","suggestedQuestionIds"],"authoring brief task");
 const target=integer(task.targetCount,"task.targetCount",1,5000),already=integer(task.alreadyAuthored,"task.alreadyAuthored",0,5000),
  remaining=integer(task.remainingCount,"task.remainingCount",0,5000),requested=integer(task.requestedNow,"task.requestedNow",0,20);
 if(already+remaining!==target||requested>remaining)throw Error("Authoring Brief task counts are inconsistent");
 const suggested=stringArray(task.suggestedQuestionIds,"task.suggestedQuestionIds",requested,requested);
 if(new Set(suggested).size!==suggested.length||suggested.some(id=>!stableIdPattern.test(id)||id.length>80))
  throw Error("Invalid suggested question IDs");
 const paper=plain(raw.paper,"authoring brief paper");
 only(paper,["scoring","timing","navigation","sections","tools","practiceModes"],"authoring brief paper");
 if(!paper.scoring||!paper.timing||!paper.navigation||!Array.isArray(paper.sections)||!paper.sections.length)
  throw Error("Authoring Brief paper contract is incomplete");
 const sourcePolicy=plain(raw.sourcePolicy,"authoring brief sourcePolicy");
 only(sourcePolicy,["syllabus","minCitations","allowedOrigins","excludedTopics","maxTopicSharePercent"],"authoring brief sourcePolicy");
 plain(sourcePolicy.syllabus,"sourcePolicy.syllabus");
 integer(sourcePolicy.minCitations,"sourcePolicy.minCitations",0,12);
 if(!Array.isArray(sourcePolicy.allowedOrigins)||!Array.isArray(sourcePolicy.excludedTopics))
  throw Error("Invalid Authoring Brief source policy");
 integer(sourcePolicy.maxTopicSharePercent,"sourcePolicy.maxTopicSharePercent",1,100);
 const classification=plain(raw.classification,"authoring brief classification");
 only(classification,["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty",
  "taxonomyAssignmentPolicy","difficultyAssignmentPolicy"],"authoring brief classification");
 for(const key of ["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty"] as const)bool(classification[key],"classification."+key);
 if(classification.taxonomyAssignmentPolicy!=="deepest-defensible")throw Error("Invalid taxonomy assignment policy");
 if(!["when-defensible","required-by-blueprint"].includes(String(classification.difficultyAssignmentPolicy)))
  throw Error("Invalid difficulty assignment policy");
 let taxonomy:ExamTaxonomy|undefined;
 if(raw.taxonomy!==undefined){
  taxonomy=validateExamTaxonomy(raw.taxonomy);
  if(taxonomy.examId!==blueprint.examId)throw Error("Authoring Brief taxonomy examId mismatch");
  const scope=plain(raw.taxonomyScope,"authoring brief taxonomyScope");
  only(scope,["mode","totalNodes","includedNodes","omittedNodes","selectedRootIds"],"authoring brief taxonomyScope");
  if(scope.mode!=="batch-relevant")throw Error("Invalid taxonomy scope");
  const total=integer(scope.totalNodes,"taxonomyScope.totalNodes",taxonomy.nodes.length,500),
   included=integer(scope.includedNodes,"taxonomyScope.includedNodes",1,500),
   omitted=integer(scope.omittedNodes,"taxonomyScope.omittedNodes",0,500);
  if(included!==taxonomy.nodes.length||included+omitted!==total)throw Error("Taxonomy scope counts are inconsistent");
  stringArray(scope.selectedRootIds,"taxonomyScope.selectedRootIds",1,100);
 }else if(raw.taxonomyScope!==undefined)throw Error("taxonomyScope requires taxonomy");
 if(classification.requireTaxonomy===true&&!taxonomy)throw Error("Required Authoring Brief taxonomy is missing");
 stringArray(raw.itemWritingPriorities,"itemWritingPriorities",1,8);
 if(!Array.isArray(raw.priorityDeficits)||raw.priorityDeficits.length>24)throw Error("Invalid priorityDeficits");
 for(const [index,valueDeficit] of raw.priorityDeficits.entries()){
  const row=plain(valueDeficit,"priorityDeficit "+index);
  if(!isGroup(row.group))throw Error("Invalid priority deficit group");
  const allowed=row.group==="topics"?["group","subjectKey","topic","target","actual","remaining"]:
   row.group==="subtopics"?["group","subjectKey","topic","subtopic","target","actual","remaining"]:
   ["group","key","target","actual","remaining"];
  only(row,allowed,"priorityDeficit "+index);
  const t=integer(row.target,"priority deficit target",0,5000),a=integer(row.actual,"priority deficit actual",0,5000),
   r=integer(row.remaining,"priority deficit remaining",1,5000);
  if(Math.max(0,t-a)!==r)throw Error("Priority deficit arithmetic mismatch");
 }
 const summary=plain(raw.deficitSummary,"authoring brief deficitSummary");
 only(summary,["shown","remaining","byGroup","note"],"authoring brief deficitSummary");
 if(integer(summary.shown,"deficitSummary.shown",0,24)!==raw.priorityDeficits.length)
  throw Error("Deficit summary shown count mismatch");
 integer(summary.remaining,"deficitSummary.remaining",0,5000);plain(summary.byGroup,"deficitSummary.byGroup");
 text(summary.note,"deficitSummary.note",2000);
 const dedupe=plain(raw.dedupe,"authoring brief dedupe");
 only(dedupe,["comparisonSourceCount","nearDuplicateCandidates"],"authoring brief dedupe");
 integer(dedupe.comparisonSourceCount,"dedupe.comparisonSourceCount",0,1000);
 if(!Array.isArray(dedupe.nearDuplicateCandidates))throw Error("Invalid nearDuplicateCandidates");
 const output=plain(raw.outputContract,"authoring brief outputContract");
 only(output,["sourceEnvelope","add","question"],"authoring brief outputContract");
 const envelope=validateEnvelope(output.sourceEnvelope);
 stringArray(output.add,"outputContract.add",1,4);
 const question=plain(output.question,"outputContract.question");
 only(question,["coreRequired","classification","kindSpecific","qa"],"authoring brief question contract");
 stringArray(question.coreRequired,"outputContract.question.coreRequired",6,20);
 if(!same(question.classification,classification))throw Error("Question classification contract drift");
 plain(question.kindSpecific,"outputContract.question.kindSpecific");text(question.qa,"outputContract.question.qa",1000);
 for(const field of ["scoring","timing","navigation","sections","tools","practiceModes"] as const)
  if((paper[field]!==undefined||envelope[field]!==undefined)&&!same(paper[field],envelope[field]))
   throw Error("Authoring Brief paper/sourceEnvelope mismatch: "+field);
 const learnerIncluded=bool(raw.learnerFocusIncluded,"learnerFocusIncluded");
 if(options.standardOnly&&learnerIncluded)throw Error("Load a standard non-personalised Authoring Brief");
 if(!learnerIncluded&&(raw.learnerFocus!==undefined||raw.personalisationIntent!==undefined))
  throw Error("Standard Authoring Brief cannot contain learner focus");
 if(learnerIncluded&&(!raw.learnerFocus||!raw.personalisationIntent))
  throw Error("Personalised Authoring Brief is missing learner focus metadata");
 if(raw.factualVerification!=="not-performed")throw Error("Invalid Authoring Brief factualVerification");
 text(raw.note,"authoring brief note",3000);
 return structuredClone(raw);
}
export const validateStandardAuthoringBrief=(value:unknown):Readonly<Record<string,unknown>>=>
 validateAuthoringBrief(value,{standardOnly:true});

const deficitKey=(group:Group,row:Record<string,unknown>):Record<string,unknown>=>{
 if(group==="topics")return {subjectKey:text(row.subjectKey,"topic subjectKey",180),topic:text(row.topic,"topic",160)};
 if(group==="subtopics")return {subjectKey:text(row.subjectKey,"subtopic subjectKey",180),topic:text(row.topic,"topic",160),
  subtopic:text(row.subtopic,"subtopic",160)};
 return {key:text(row.key,group+" key",180)};
};
const initialDeficits=(quotas:Record<string,unknown>):Record<string,unknown>[]=>{
 const out:Record<string,unknown>[]=[];
 for(const group of GROUPS){
  if(quotas[group]===undefined)continue;
  const block=plain(quotas[group],group+" quota");
  only(block,["exhaustive","targets"],group+" quota");
  if(block.exhaustive!==undefined)bool(block.exhaustive,group+".exhaustive");
  if(!Array.isArray(block.targets)||!block.targets.length)throw Error("Invalid "+group+" quota targets");
  for(const targetValue of block.targets){
   const target=plain(targetValue,group+" target"),count=integer(target.count,group+" target count",0,5000);
   if(!count)continue;
   out.push({group,...deficitKey(group,target),target:count,actual:0,remaining:count});
  }
 }
 return out;
};
const interleaved=(deficits:readonly Record<string,unknown>[]):Record<string,unknown>[]=>{
 const by=new Map<Group,Record<string,unknown>[]>(GROUPS.map(group=>[group,deficits.filter(row=>row.group===group)]));
 const out:Record<string,unknown>[]=[];
 for(let round=0;out.length<24;round++){
  let added=false;
  for(const group of GROUPS){
   const row=by.get(group)?.[round];
   if(row&&out.length<24){out.push(row);added=true;}
  }
  if(!added)break;
 }
 return out;
};
const sourceEnvelopeFromBlueprint=(plan:Record<string,unknown>,bankId:string,title:string):Record<string,unknown>=>{
 const rules=plain(plan.paperRules,"blueprint paperRules");
 const scoring=plain(rules.scoring,"paperRules.scoring"),timing=plain(rules.timing,"paperRules.timing");
 if(typeof timing.kind!=="string"||!Array.isArray(rules.sections)||!rules.sections.length)
  throw Error("Initial Authoring Brief requires paperRules.scoring, paperRules.timing.kind and sections");
 const navigation=rules.navigation===undefined?{
  questionNavigation:"free",sectionNavigation:timing.kind==="sectional"?"sequential-locked":"free",allowReview:true
 }:structuredClone(plain(rules.navigation,"paperRules.navigation"));
 const envelope:Record<string,unknown>={format:"practice-desk-authoring",version:1,bankId,
  examId:plan.examId,paperId:plan.paperId,title,edition:"custom",revision:plan.revision,
  scoring:structuredClone(scoring),timing:structuredClone(timing),navigation,
  sections:structuredClone(rules.sections)};
 if(rules.tools!==undefined)envelope.tools=structuredClone(rules.tools);
 if(rules.practiceModes!==undefined)envelope.practiceModes=structuredClone(rules.practiceModes);
 validateEnvelope(envelope);return envelope;
};

export function buildInitialAuthoringBrief(
 blueprintValue:unknown,blueprintRaw:string,
 options:{readonly bankId:string;readonly title:string;readonly batchSize?:number;readonly taxonomy?:unknown}
):Readonly<Record<string,unknown>>{
 const plan=plain(blueprintValue,"blueprint");
 only(plan,["format","version","id","examId","paperId","revision","targetCount","allowPartial","syllabus",
  "taxonomyId","requirements","quotas","paperRules"],"blueprint");
 if(plan.format!==BLUEPRINT_FORMAT||plan.version!==1)throw Error("Expected practice-desk-content-blueprint v1");
 const id=text(plan.id,"blueprint id",80),examId=text(plan.examId,"blueprint examId",80),
  paperId=text(plan.paperId,"blueprint paperId",80),revision=integer(plan.revision,"blueprint revision",1,1000000),
  targetCount=integer(plan.targetCount,"blueprint targetCount",1,5000);
 if(plan.allowPartial!==undefined)bool(plan.allowPartial,"blueprint allowPartial");
 const syllabus=plain(plan.syllabus,"blueprint syllabus");
 only(syllabus,["basis","asOfDate","reference"],"blueprint syllabus");
 if(!["user-defined","official-source-attributed","inferred-practice"].includes(String(syllabus.basis)))
  throw Error("Invalid blueprint syllabus basis");
 text(syllabus.asOfDate,"blueprint syllabus asOfDate",10);text(syllabus.reference,"blueprint syllabus reference",500);
 const requirements=plain(plan.requirements,"blueprint requirements");
 only(requirements,["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty","requireExplanation",
  "minCitations","allowedOrigins","maxTopicSharePercent","excludedTopics"],"blueprint requirements");
 for(const key of ["requireTaxonomy","requireTopic","requireSubtopic","requireDifficulty","requireExplanation"] as const)
  if(requirements[key]!==undefined)bool(requirements[key],"requirements."+key);
 if(requirements.requireSubtopic===true&&requirements.requireTopic!==true)
  throw Error("requireSubtopic requires requireTopic");
 const quotas=plain(plan.quotas??{},"blueprint quotas"),deficits=initialDeficits(quotas),priority=interleaved(deficits);
 const taxonomy=options.taxonomy===undefined?undefined:validateExamTaxonomy(options.taxonomy);
 if(taxonomy&&taxonomy.examId!==examId)throw Error("Taxonomy examId does not match blueprint");
 if(plan.taxonomyId!==undefined&&(!taxonomy||taxonomy.id!==text(plan.taxonomyId,"blueprint taxonomyId",120)))
  throw Error("Blueprint taxonomyId requires the matching taxonomy");
 if(requirements.requireTaxonomy===true&&!taxonomy)throw Error("Blueprint requires a taxonomy");
 const bankId=text(options.bankId,"bankId",80),title=text(options.title,"title",180);
 if(!stableIdPattern.test(bankId))throw Error("bankId must use letters, numbers, underscores or hyphens");
 const batchSize=integer(options.batchSize??8,"batchSize",1,20),requestedNow=Math.min(batchSize,targetCount);
 const suggestedQuestionIds:string[]=[];
 const prefix=bankId.slice(0,70).replace(/[-_]+$/u,"")||"batch";
 for(let serial=1;suggestedQuestionIds.length<requestedNow&&serial<=10000;serial++){
  const candidate=prefix+"-q"+String(serial).padStart(2,"0");
  if(candidate.length<=80)suggestedQuestionIds.push(candidate);
 }
 const envelope=sourceEnvelopeFromBlueprint(plan,bankId,title);
 const classification=authoringClassificationPolicy(requirements);
 const sourcePolicy={syllabus:structuredClone(syllabus),minCitations:integer(requirements.minCitations??0,"minCitations",0,12),
  allowedOrigins:structuredClone(Array.isArray(requirements.allowedOrigins)?requirements.allowedOrigins:
   ["ai-original","manual","reconstruction","official-pyq"]),
  excludedTopics:structuredClone(Array.isArray(requirements.excludedTopics)?requirements.excludedTopics:[]),
  maxTopicSharePercent:integer(requirements.maxTopicSharePercent??100,"maxTopicSharePercent",1,100)};
 const byGroup=Object.fromEntries(GROUPS.map(group=>{
  const rows=deficits.filter(row=>row.group===group),shown=priority.filter(row=>row.group===group).length;
  return [group,{total:rows.length,shown,remaining:Math.max(0,rows.length-shown)}];
 }).filter(([,value])=>(value as {total:number}).total>0));
 const taxonomyContext=taxonomy?buildAuthoringTaxonomySlice(taxonomy,deficits,requestedNow):undefined;
 const brief:Record<string,unknown>={format:BRIEF_FORMAT,version:1,valid:true,
  blueprint:{id,sha256:sha256(blueprintRaw),examId,paperId,revision},
  workflow:{singleAgentCompatible:true,multipleAgentsRequired:false},
  task:{targetCount,alreadyAuthored:0,remainingCount:targetCount,requestedNow,suggestedQuestionIds},
  paper:{scoring:structuredClone(envelope.scoring),timing:structuredClone(envelope.timing),
   navigation:structuredClone(envelope.navigation),sections:structuredClone(envelope.sections),
   ...(envelope.tools?{tools:structuredClone(envelope.tools)}:{}),
   ...(envelope.practiceModes?{practiceModes:structuredClone(envelope.practiceModes)}:{})},
  sourcePolicy,classification,
  ...(taxonomyContext?{taxonomy:taxonomyContext.taxonomy,taxonomyScope:taxonomyContext.scope}:{}),
  itemWritingPriorities:[
   "Spend reasoning on exam-relevant substance, not Practice Desk mechanics.",
   "For automatically scored items, make the keyed answer uniquely defensible and distractors plausible.",
   "Use the deepest defensible taxonomy node supported by the item; root-only is valid when the item genuinely spans the subject.",
   "Assign difficulty when it is defensible from the item; do not invent precision merely to fill metadata.",
   "Research and verify legal, numerical, current and PYQ claims; never infer authority from this packet."
  ],
  priorityDeficits:priority,
  deficitSummary:{shown:priority.length,remaining:Math.max(0,deficits.length-priority.length),byGroup,
   note:"Quota groups overlap; satisfy these constraints jointly rather than summing their remaining counts. Bounded output is interleaved across active quota groups."},
  dedupe:{comparisonSourceCount:0,nearDuplicateCandidates:[]},
  outputContract:{sourceEnvelope:envelope,
   add:["questions","optional stimuli/media only when the authored items need shared context or images"],
   question:{coreRequired:["id","examSection","kind","prompt","answer","provenance","qa",
    ...(requirements.requireExplanation===true?["explanation"]:[])],classification,
    kindSpecific:{"single-choice":"options: 2..26; one defensible keyed option",
     "multiple-select":"options: 2..26; answer plus optional selection/partial-credit fields",
     "numeric-entry":"numeric answer(s); optional tolerance","true-false":"boolean or True/False answer",
     "matching":"leftItems/rightItems: 1..26 each","free-response":"manual/self-assessed; wordLimit only when defensible"},
    qa:"Author-created or materially changed items remain unchecked/needs-review; do not self-certify."}},
  learnerFocusIncluded:false,factualVerification:"not-performed",
  note:"Decision-ready authoring context only. It omits existing question bodies, media bytes and repository/package placement. Research and verify factual, legal, current and PYQ claims outside this packet."};
 return validateStandardAuthoringBrief(brief);
}
