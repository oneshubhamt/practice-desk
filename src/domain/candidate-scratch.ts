import type {OptionId,QuestionRevisionId,StimulusId} from "./ids.js";
import type {QuestionRevision,StimulusDefinition} from "./question.js";
import type {RichDocument,RichInline} from "./rich-document.ts";

export const CANDIDATE_HIGHLIGHT_COLORS=["yellow","green","pink"] as const;
export type CandidateHighlightColor=typeof CANDIDATE_HIGHLIGHT_COLORS[number];

export type CandidateHighlightSurface=
 | {readonly kind:"question-prompt";readonly questionRevisionId:QuestionRevisionId}
 | {readonly kind:"option-text";readonly questionRevisionId:QuestionRevisionId;readonly optionId:OptionId}
 | {readonly kind:"stimulus-passage";readonly stimulusId:StimulusId}
 | {readonly kind:"stimulus-table-cell";readonly stimulusId:StimulusId;
    readonly row:"header"|number;readonly column:number}
 | {readonly kind:"stimulus-caption";readonly stimulusId:StimulusId};

export type CandidateTextAnchor=
 | {readonly kind:"plain";readonly start:number;readonly end:number}
 | {readonly kind:"rich";readonly path:readonly number[];readonly start:number;readonly end:number};

export interface CandidateHighlight{
 readonly id:string;
 readonly surface:CandidateHighlightSurface;
 readonly anchor:CandidateTextAnchor;
 readonly color:CandidateHighlightColor;
}

export interface CandidateElimination{
 readonly questionRevisionId:QuestionRevisionId;
 readonly optionIds:readonly OptionId[];
}

/** Candidate-owned annotations are durable attempt evidence, never an answer,
 * score input, authored question field, or learning/FSRS rating.
 */
export interface CandidateScratch{
 readonly schema:1;
 readonly eliminations:readonly CandidateElimination[];
 readonly highlights:readonly CandidateHighlight[];
}

export const emptyCandidateScratch=():CandidateScratch=>({
 schema:1,eliminations:[],highlights:[]
});

export type CandidateCandidateScratchContext={
 readonly questions:readonly QuestionRevision[];
 readonly stimuli:readonly StimulusDefinition[];
};

function plain(value:unknown,label:string):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw Error("Invalid "+label);
 return value as Record<string,unknown>;
}
function only(row:Record<string,unknown>,allowed:readonly string[],label:string):void{
 for(const key of Object.keys(row))if(!allowed.includes(key))
  throw Error(label+"."+key+": unsupported field");
}
function id(value:unknown,label:string):string{
 if(typeof value!=="string"||!value.trim()||value!==value.trim()||value.length>512||
   /[\u0000-\u001f\u007f]/u.test(value))throw Error("Invalid "+label);
 return value;
}
function index(value:unknown,label:string,min=0):number{
 if(!Number.isSafeInteger(value)||Number(value)<min)throw Error("Invalid "+label);
 return Number(value);
}
function textLeaf(doc:RichDocument,path:readonly number[]):string|null{
 if(path.some(part=>!Number.isSafeInteger(part)||part<0))return null;
 const block=doc.blocks[path[0]!];
 if(!block)return null;
 let item:RichInline|undefined;
 if(block.type==="paragraph"||block.type==="heading"){
  if(path.length!==2)return null;
  item=block.content[path[1]!];
 }else if(block.type==="list"){
  if(path.length!==3)return null;
  item=block.items[path[1]!]?.[path[2]!];
 }else if(block.type==="table"){
  if(path.length!==4)return null;
  item=block.rows[path[1]!]?.[path[2]!]?.[path[3]!];
 }else return null;
 return item?.type==="text"?item.text:null;
}
function validateAnchor(anchorValue:unknown,plainText:string,rich:RichDocument|undefined,label:string):void{
 const anchor=plain(anchorValue,label);
 if(anchor.kind==="plain"){
  only(anchor,["kind","start","end"],label);
  if(rich)throw Error(label+": rich content requires a structural rich-text anchor");
  const start=index(anchor.start,label+".start"),end=index(anchor.end,label+".end",1);
  if(end<=start||end>plainText.length)throw Error(label+": range exceeds source text");
  return;
 }
 if(anchor.kind==="rich"){
  only(anchor,["kind","path","start","end"],label);
  if(!rich||!Array.isArray(anchor.path)||anchor.path.length<2||anchor.path.length>4)
   throw Error(label+": invalid rich-text anchor");
  const path=anchor.path.map((part,i)=>index(part,label+".path["+i+"]"));
  const leaf=textLeaf(rich,path);
  if(leaf===null)throw Error(label+": path does not identify a highlightable text leaf");
  const start=index(anchor.start,label+".start"),end=index(anchor.end,label+".end",1);
  if(end<=start||end>leaf.length)throw Error(label+": range exceeds source text leaf");
  return;
 }
 throw Error(label+": unsupported anchor kind");
}
function target(
 surfaceValue:unknown,context:CandidateScratchContext,label:string
):{plain:string;rich?:RichDocument}{
 const surface=plain(surfaceValue,label);
 if(surface.kind==="question-prompt"){
  only(surface,["kind","questionRevisionId"],label);
  const questionId=id(surface.questionRevisionId,label+".questionRevisionId");
  const q=context.questions.find(question=>question.id===questionId);
  if(!q)throw Error(label+": unknown question");
  return {plain:q.content.prompt,...(q.content.richPrompt?{rich:q.content.richPrompt}:{})};
 }
 if(surface.kind==="option-text"){
  only(surface,["kind","questionRevisionId","optionId"],label);
  const questionId=id(surface.questionRevisionId,label+".questionRevisionId");
  const optionId=id(surface.optionId,label+".optionId");
  const q=context.questions.find(question=>question.id===questionId);
  if(!q||(q.content.kind!=="single-choice"&&q.content.kind!=="multiple-select"))
   throw Error(label+": option surface requires a choice question");
  const option=q.content.options.find(item=>item.id===optionId);
  if(!option)throw Error(label+": unknown option");
  return {plain:option.text,...(option.richText?{rich:option.richText}:{})};
 }
 if(surface.kind==="stimulus-passage"){
  only(surface,["kind","stimulusId"],label);
  const stimulusId=id(surface.stimulusId,label+".stimulusId");
  const s=context.stimuli.find(stimulus=>stimulus.id===stimulusId);
  if(!s||(s.kind!=="passage"&&s.kind!=="case"))
   throw Error(label+": passage surface requires a passage/case stimulus");
  return {plain:s.text,...(s.richText?{rich:s.richText}:{})};
 }
 if(surface.kind==="stimulus-table-cell"){
  only(surface,["kind","stimulusId","row","column"],label);
  const stimulusId=id(surface.stimulusId,label+".stimulusId");
  const s=context.stimuli.find(stimulus=>stimulus.id===stimulusId);
  if(!s||s.kind!=="table")throw Error(label+": table-cell surface requires a table stimulus");
  const column=index(surface.column,label+".column");
  if(column>=s.columns.length)throw Error(label+": table column is out of range");
  if(surface.row==="header"){
   return {plain:s.columns[column]!,...(s.richColumns?.[column]?{rich:s.richColumns[column]}:{})};
  }
  const row=index(surface.row,label+".row");
  if(row>=s.rows.length)throw Error(label+": table row is out of range");
  return {plain:s.rows[row]![column]!,...(s.richRows?.[row]?.[column]?{rich:s.richRows[row]![column]}:{})};
 }
 if(surface.kind==="stimulus-caption"){
  only(surface,["kind","stimulusId"],label);
  const stimulusId=id(surface.stimulusId,label+".stimulusId");
  const s=context.stimuli.find(stimulus=>stimulus.id===stimulusId);
  if(!s||(s.kind!=="chart"&&s.kind!=="image"))
   throw Error(label+": caption surface requires an image/chart stimulus");
  return {plain:s.caption??s.altText,...(s.richCaption?{rich:s.richCaption}:{})};
 }
 throw Error(label+": unsupported highlight surface");
}


export function candidateHighlightSurfaceKey(surface:CandidateHighlightSurface):string{
 switch(surface.kind){
  case "question-prompt":return "question-prompt|"+surface.questionRevisionId;
  case "option-text":return "option-text|"+surface.questionRevisionId+"|"+surface.optionId;
  case "stimulus-passage":return "stimulus-passage|"+surface.stimulusId;
  case "stimulus-table-cell":return "stimulus-table-cell|"+surface.stimulusId+"|"+surface.row+"|"+surface.column;
  case "stimulus-caption":return "stimulus-caption|"+surface.stimulusId;
 }
}

export function candidateHighlightsForSurface(
 scratch:CandidateScratch,surface:CandidateHighlightSurface
):readonly CandidateHighlight[]{
 const key=candidateHighlightSurfaceKey(surface);
 return scratch.highlights.filter(item=>candidateHighlightSurfaceKey(item.surface)===key);
}

function anchorsOverlap(a:CandidateTextAnchor,b:CandidateTextAnchor):boolean{
 if(a.kind!==b.kind)return false;
 if(a.kind==="rich"&&b.kind==="rich"&&
   (a.path.length!==b.path.length||a.path.some((part,i)=>part!==b.path[i])))return false;
 return a.start<b.end&&b.start<a.end;
}

export function candidateHighlightIdsOverlapping(
 scratch:CandidateScratch,fragments:readonly Pick<CandidateHighlight,"surface"|"anchor">[]
):readonly string[]{
 const ids=new Set<string>();
 for(const item of scratch.highlights)for(const fragment of fragments){
  if(candidateHighlightSurfaceKey(item.surface)===candidateHighlightSurfaceKey(fragment.surface)&&
     anchorsOverlap(item.anchor,fragment.anchor))ids.add(item.id);
 }
 return [...ids];
}

export function addCandidateHighlights(
 scratch:CandidateScratch,highlights:readonly CandidateHighlight[],context:CandidateScratchContext
):CandidateScratch{
 if(!highlights.length)return scratch;
 return validateCandidateScratch({...scratch,highlights:[...scratch.highlights,...highlights]},context);
}

export function removeCandidateHighlights(
 scratch:CandidateScratch,highlightIds:readonly string[]
):CandidateScratch{
 if(!highlightIds.length)return scratch;
 const remove=new Set(highlightIds);
 const highlights=scratch.highlights.filter(item=>!remove.has(item.id));
 return highlights.length===scratch.highlights.length?scratch:{...scratch,highlights};
}

export function eliminatedOptionIdsForQuestion(
 scratch:CandidateScratch,questionRevisionId:QuestionRevisionId
):readonly OptionId[]{
 return scratch.eliminations.find(row=>row.questionRevisionId===questionRevisionId)?.optionIds??[];
}

export function setCandidateOptionEliminated(
 scratch:CandidateScratch,question:QuestionRevision,optionId:OptionId,eliminated:boolean
):CandidateScratch{
 if(question.content.kind!=="single-choice"&&question.content.kind!=="multiple-select")
   throw Error("Option elimination requires a choice question");
 const option=question.content.options.find(item=>item.id===optionId);
 if(!option)throw Error("Unknown option for candidate elimination");
 const previous=scratch.eliminations.find(row=>row.questionRevisionId===question.id)?.optionIds??[];
 const had=previous.includes(optionId);
 if(had===eliminated)return scratch;
 const selected=new Set(previous);
 if(eliminated)selected.add(optionId);else selected.delete(optionId);
 const optionIds=question.content.options.filter(item=>selected.has(item.id)).map(item=>item.id);
 const retained=scratch.eliminations.filter(row=>row.questionRevisionId!==question.id);
 return {...scratch,eliminations:optionIds.length?
   [...retained,{questionRevisionId:question.id,optionIds}]:retained};
}

export function validateCandidateScratch(value:unknown,context:CandidateScratchContext):CandidateScratch{
 const root=plain(value,"candidate scratch");
 only(root,["schema","eliminations","highlights"],"candidate scratch");
 if(root.schema!==1||!Array.isArray(root.eliminations)||!Array.isArray(root.highlights)||
   root.eliminations.length>context.questions.length||root.highlights.length>5000)
  throw Error("Invalid candidate scratch");
 const questionIds=new Set<string>();
 const eliminations=root.eliminations.map((entryValue,i)=>{
  const label="candidate scratch eliminations["+i+"]",entry=plain(entryValue,label);
  only(entry,["questionRevisionId","optionIds"],label);
  const questionRevisionId=id(entry.questionRevisionId,label+".questionRevisionId") as QuestionRevisionId;
  if(questionIds.has(questionRevisionId))throw Error(label+": duplicate question");
  questionIds.add(questionRevisionId);
  const q=context.questions.find(question=>question.id===questionRevisionId);
  if(!q||(q.content.kind!=="single-choice"&&q.content.kind!=="multiple-select"))
   throw Error(label+": elimination requires a choice question");
  const choices=q.content;
  if(!Array.isArray(entry.optionIds)||!entry.optionIds.length||
    entry.optionIds.length>choices.options.length)
   throw Error(label+": invalid eliminated options");
  const optionIds=entry.optionIds.map((option,j)=>id(option,label+".optionIds["+j+"]") as OptionId);
  if(new Set(optionIds).size!==optionIds.length||
    optionIds.some(optionId=>!choices.options.some(option=>option.id===optionId)))
   throw Error(label+": unknown or duplicate option");
  return {questionRevisionId,optionIds};
 });
 const highlightIds=new Set<string>();
 const highlights=root.highlights.map((entryValue,i)=>{
  const label="candidate scratch highlights["+i+"]",entry=plain(entryValue,label);
  only(entry,["id","surface","anchor","color"],label);
  const highlightId=id(entry.id,label+".id");
  if(highlightIds.has(highlightId))throw Error(label+": duplicate highlight ID");
  highlightIds.add(highlightId);
  if(!CANDIDATE_HIGHLIGHT_COLORS.includes(entry.color as CandidateHighlightColor))
   throw Error(label+": unsupported highlight color");
  const source=target(entry.surface,context,label+".surface");
  validateAnchor(entry.anchor,source.plain,source.rich,label+".anchor");
  return entryValue as CandidateHighlight;
 });
 return {schema:1,eliminations,highlights};
}
