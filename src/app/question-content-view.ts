/** Inert HTML for frozen question media, stimuli and all six response kinds. */
import type {ExamPackage} from "../domain/exam-package.ts";
import type {QuestionRevision,CandidateResponse} from "../domain/question.js";
import type {OptionId} from "../domain/ids.js";
import type {RichDocument,RichInline} from "../domain/rich-document.ts";
import type {CandidateHighlightSurface,CandidateScratch} from "../domain/candidate-scratch.ts";
import {authoredTextHTML} from "./rich-content-view.ts";
import {
 candidateAnnotatedPlainHTML,candidateHighlightSurfaceAttributes,candidateRichRenderOptions
} from "./candidate-highlight-view.ts";
import {escapeText} from "./html-escape.ts";
import {countWords,wordCountBand} from "../domain/word-count.ts";
function richAssetIds(doc:RichDocument|undefined):ReadonlySet<string>{
 const ids=new Set<string>();
 if(!doc)return ids;
 const inline=(items:readonly RichInline[])=>{
  for(const item of items)if(item.type==="image")ids.add(item.assetId);
 };
 for(const block of doc.blocks){
  if(block.type==="paragraph"||block.type==="heading")inline(block.content);
  else if(block.type==="list")block.items.forEach(inline);
  else if(block.type==="table")block.rows.forEach(row=>row.forEach(inline));
  else if(block.type==="image")ids.add(block.assetId);
 }
 return ids;
}
export function assetHTML(bundle:ExamPackage,ids:readonly string[]|undefined,fallbackAlt="Question figure"):string{
  return (ids??[]).map(id=>{
    const a=bundle.assets?.find(x=>x.id===id);
    // Author-supplied descriptions win; context is only a fallback when
    // imported media has no explicit alt text.
    if(!a)return "";
    const alt=escapeText(a.altText??fallbackAlt);
    // The URL is serialized exactly once. No extra/base64 thumbnail, asset
    // copy, on-demand network fetch, or new persisted binary is created.
    // ARIA launch control stays usable even inside an exam's disabled fieldset.
    return '<span class="generic-media-frame"><img class="generic-figure" src="'+
      escapeText(a.dataUri)+'" alt="'+alt+'" decoding="async">'+
      '<span role="button" tabindex="0" class="generic-image-open" data-image-open '+
      'aria-label="Enlarge image: '+alt+'">Enlarge image</span></span>';
  }).join("");
}
export function supplementalAssetHTML(bundle:ExamPackage,ids:readonly string[]|undefined,
 rich:RichDocument|undefined,fallbackAlt="Question figure"):string{
 const embedded=richAssetIds(rich);
 return assetHTML(bundle,(ids??[]).filter(id=>!embedded.has(id)),fallbackAlt);
}
/** Only explicit normalized rich content is interpreted; plain strings remain inert. */
export function renderAuthoredText(bundle:ExamPackage,plain:string,rich?:RichDocument):string{
 const knownAssets=new Set(bundle.assets?.map(asset=>asset.id)??[]);
 return authoredTextHTML(plain,rich,knownAssets,(id,alt)=>assetHTML(bundle,[id],alt));
}
function renderAuthoredTextWithoutImages(bundle:ExamPackage,plain:string,rich?:RichDocument):string{
 const knownAssets=new Set(bundle.assets?.map(asset=>asset.id)??[]);
 return authoredTextHTML(plain,rich,knownAssets,()=> "");
}
function candidateAuthoredText(
 bundle:ExamPackage,plain:string,rich:RichDocument|undefined,scratch:CandidateScratch,
 surface:CandidateHighlightSurface,image:(id:string,alt:string)=>string
):string{
 const knownAssets=new Set(bundle.assets?.map(asset=>asset.id)??[]);
 return rich?authoredTextHTML(plain,rich,knownAssets,image,candidateRichRenderOptions(scratch,surface)):
   candidateAnnotatedPlainHTML(plain,scratch,surface);
}
export function renderQuestionPrompt(bundle:ExamPackage,q:QuestionRevision,scratch?:CandidateScratch):string{
 const content=q.content;
 if(!scratch)return content.richPrompt?
   '<div class="generic-prompt pd-rich-prompt" role="heading" aria-level="2">'+
     renderAuthoredText(bundle,content.prompt,content.richPrompt)+'</div>':
   '<h2 class="generic-prompt">'+escapeText(content.prompt)+'</h2>';
 const surface:CandidateHighlightSurface={kind:"question-prompt",questionRevisionId:q.id};
 const attrs=candidateHighlightSurfaceAttributes(surface,content.richPrompt?"rich":"plain");
 const body=candidateAuthoredText(bundle,content.prompt,content.richPrompt,scratch,surface,
   (id,alt)=>assetHTML(bundle,[id],alt));
 return content.richPrompt?
   '<div class="generic-prompt pd-rich-prompt" role="heading" aria-level="2"'+attrs+'>'+body+'</div>':
   '<h2 class="generic-prompt"'+attrs+'>'+body+'</h2>';
}
export function renderGenericControls(
 bundle:ExamPackage,q:QuestionRevision,response?:CandidateResponse,
 options:Readonly<{
  showWordCount?:boolean;eliminatedOptionIds?:readonly OptionId[];candidateScratch?:CandidateScratch;
 }>={}
):string{
  const c=q.content;
  if(c.kind==="single-choice"||c.kind==="multiple-select"){
    const selected=response?.kind==="single-choice"?[response.optionId]:response?.kind==="multiple-select"?response.optionIds:[];
    const kind=c.kind==="single-choice"?"radio":"checkbox";
    const legend=kind==="radio"?"Select one option":"Select applicable options";
    return '<fieldset class="generic-choices"><legend>'+legend+'</legend>'+ 
      '<p class="generic-choice-narrow-legend" aria-hidden="true">'+legend+'</p>'+
      c.options.map((o,i)=>{
        const optionLabel=String.fromCharCode(65+i);
        const eliminated=Boolean(options.eliminatedOptionIds?.includes(o.id));
        const media=assetHTML(bundle,o.assetIds,"Image for option "+optionLabel);
        const scratch=options.candidateScratch;
        const surface:CandidateHighlightSurface={kind:"option-text",questionRevisionId:q.id,optionId:o.id};
        const attrs=scratch?candidateHighlightSurfaceAttributes(surface,o.richText?"rich":"plain"):"";
        const body=scratch?candidateAuthoredText(bundle,o.text,o.richText,scratch,surface,()=> ""):
          renderAuthoredTextWithoutImages(bundle,o.text,o.richText);
        const text=o.richText?'<div class="pd-rich-choice-text"><b>'+optionLabel+'.</b><div'+attrs+'>'+body+'</div></div>':
          '<span><b>'+optionLabel+'.</b> <span'+attrs+'>'+body+'</span></span>';
        const label='<label class="generic-choice"><input type="'+kind+'" name="generic-answer" data-choice="'+escapeText(o.id)+'"'+
          (selected.includes(o.id)?" checked":"")+'>'+text+'</label>';
        const strike='<button type="button" class="btn quiet choice-elimination" data-eliminate="'+escapeText(o.id)+
          '" aria-pressed="'+eliminated+'" aria-label="'+(eliminated?"Restore":"Eliminate")+' option '+optionLabel+
          '" title="'+(eliminated?"Restore":"Eliminate")+' option '+optionLabel+'">'+
          (eliminated?"Restore":"Strike")+'</button>';
        const actionRow='<div class="generic-choice-action-row '+(eliminated?"eliminated":"")+'">'+label+strike+'</div>';
        // Elimination is deliberately a sibling control, never nested in the
        // answer label: striking an option cannot select or clear an answer.
        // Image enlargement remains outside the answer label for the same reason.
        return media?'<div class="generic-choice-media-row">'+actionRow+
          '<div class="generic-choice-media">'+media+'</div></div>':actionRow;
      }).join("")+
      '</fieldset>';
  }
  if(c.kind==="true-false")return '<fieldset class="generic-choices"><legend>Choose a response</legend>'+
    [true,false].map(value=>'<label class="generic-choice"><input type="radio" name="generic-boolean" data-bool="'+value+'"'+
     (response?.kind==="true-false"&&response.value===value?" checked":"")+'><span>'+(value?"True":"False")+'</span></label>').join("")+'</fieldset>';
  if(c.kind==="numeric-entry")return '<label class="picker" for="g-number">Numeric answer</label><input type="number" step="any" id="g-number"'+
    (c.numericRules.minimum!==undefined?' min="'+c.numericRules.minimum+'"':"")+
    (c.numericRules.maximum!==undefined?' max="'+c.numericRules.maximum+'"':"")+
    ' value="'+(response?.kind==="numeric-entry"?escapeText(response.value):"")+'"><button class="btn primary" id="g-save">Save answer</button>';
  if(c.kind==="free-response"){
    const value=response?.kind==="free-response"?response.text:"";
    const limit=c.responseRules.wordLimit;
    const count=countWords(value);
    const band=limit?wordCountBand(count,limit):"normal";
    const counter=options.showWordCount?
      '<span class="generic-word-count" id="g-word-count" data-word-count-state="'+band+
      '" aria-label="Word count: '+count+(limit?' of '+limit:'')+' words">'+
      count+(limit?' / '+limit:'')+' words</span>':"";
    return '<div class="generic-written-response"><div class="generic-written-response-head">'+
      '<label class="picker" for="g-text">Written response</label>'+counter+'</div>'+
      '<textarea id="g-text" rows="10"'+(counter?' aria-describedby="g-word-count"':"")+'>'+
      escapeText(value)+'</textarea><button class="btn primary" id="g-save">Save response</button></div>';
  }
  const pairs=response?.kind==="matching"?response.pairs:[];
  return '<div class="generic-matches">'+c.leftItems.map(left=>{
    const media=assetHTML(bundle,left.assetIds,"Image for matching item "+left.text);
    const label='<label>'+(left.richText?'<div class="pd-rich-choice-text">'+
      renderAuthoredTextWithoutImages(bundle,left.text,left.richText)+'</div>':
      '<span>'+escapeText(left.text)+'</span>')+
      '<select data-match="'+escapeText(left.id)+'"><option value="">Not matched</option>'+
      c.rightItems.map(right=>'<option value="'+escapeText(right.id)+'"'+
        (pairs.some(p=>p.leftId===left.id&&p.rightId===right.id)?" selected":"")+'>'+escapeText(right.text)+'</option>').join("")+
      '</select></label>';
    return media?'<div class="generic-match-media-row">'+label+media+'</div>':label;
  }).join("")+'</div>'+
    '<p class="generic-inline-warning" id="g-match-feedback" role="status" aria-live="polite" aria-atomic="true"></p>'+
    '<button class="btn primary" id="g-save">Save matches</button>';
}
export function stimulusHTML(bundle:ExamPackage,q:QuestionRevision,scratch?:CandidateScratch):string{
 const stimulus=bundle.stimuli?.find(s=>s.id===q.content.stimulusId);
 if(!stimulus)return "";
 if(stimulus.kind==="passage"||stimulus.kind==="case"){
   const title=escapeText(stimulus.title||(stimulus.kind==="case"?"Case study":"Reading passage"));
   const label=escapeText((stimulus.title||(stimulus.kind==="case"?"Case study":"Reading passage"))+
     " — scroll to read full text");
   if(!scratch)return '<section class="generic-stimulus" role="region" tabindex="0" aria-label="'+label+'"><b>'+
     title+'</b>'+(stimulus.richText?renderAuthoredText(bundle,stimulus.text,stimulus.richText):
       '<p>'+escapeText(stimulus.text)+'</p>')+
     supplementalAssetHTML(bundle,stimulus.assetIds,stimulus.richText,
       "Image accompanying "+(stimulus.title||"reading passage"))+'</section>';
   const surface:CandidateHighlightSurface={kind:"stimulus-passage",stimulusId:stimulus.id};
   const attrs=candidateHighlightSurfaceAttributes(surface,stimulus.richText?"rich":"plain");
   const body=candidateAuthoredText(bundle,stimulus.text,stimulus.richText,scratch,surface,
     (id,alt)=>assetHTML(bundle,[id],alt));
   return '<section class="generic-stimulus" role="region" tabindex="0" aria-label="'+label+'"><b>'+
     title+'</b>'+(stimulus.richText?'<div'+attrs+'>'+body+'</div>':'<p'+attrs+'>'+body+'</p>')+
     supplementalAssetHTML(bundle,stimulus.assetIds,stimulus.richText,
       "Image accompanying "+(stimulus.title||"reading passage"))+'</section>';
 }
 if(stimulus.kind==="table"){
   if(!scratch)return '<section class="generic-stimulus"><b>'+escapeText(stimulus.title||"Table")+
     '</b><div class="scroll-table"><table><tr>'+
     stimulus.columns.map((text,i)=>'<th>'+renderAuthoredText(bundle,text,stimulus.richColumns?.[i])+'</th>').join("")+
     '</tr>'+stimulus.rows.map((row,i)=>'<tr>'+row.map((text,j)=>'<td>'+
       renderAuthoredText(bundle,text,stimulus.richRows?.[i]?.[j])+'</td>').join("")+'</tr>').join("")+
     '</table></div></section>';
   const cell=(text:string,rich:RichDocument|undefined,row:"header"|number,column:number,tag:"th"|"td")=>{
     const surface:CandidateHighlightSurface={kind:"stimulus-table-cell",stimulusId:stimulus.id,row,column};
     const attrs=candidateHighlightSurfaceAttributes(surface,rich?"rich":"plain");
     return '<'+tag+attrs+'>'+candidateAuthoredText(bundle,text,rich,scratch,surface,
       (id,alt)=>assetHTML(bundle,[id],alt))+'</'+tag+'>';
   };
   return '<section class="generic-stimulus"><b>'+escapeText(stimulus.title||"Table")+
     '</b><div class="scroll-table"><table><tr>'+
     stimulus.columns.map((text,i)=>cell(text,stimulus.richColumns?.[i],"header",i,"th")).join("")+
     '</tr>'+stimulus.rows.map((row,i)=>'<tr>'+row.map((text,j)=>
       cell(text,stimulus.richRows?.[i]?.[j],i,j,"td")).join("")+'</tr>').join("")+
     '</table></div></section>';
 }
 if("assetId" in stimulus){
   if(!scratch)return '<section class="generic-stimulus">'+
     assetHTML(bundle,[stimulus.assetId],stimulus.altText)+
     '<div>'+renderAuthoredText(bundle,stimulus.caption||stimulus.altText,stimulus.richCaption)+'</div></section>';
   const surface:CandidateHighlightSurface={kind:"stimulus-caption",stimulusId:stimulus.id};
   const attrs=candidateHighlightSurfaceAttributes(surface,stimulus.richCaption?"rich":"plain");
   const caption=stimulus.caption||stimulus.altText;
   return '<section class="generic-stimulus">'+assetHTML(bundle,[stimulus.assetId],stimulus.altText)+
     '<div'+attrs+'>'+candidateAuthoredText(bundle,caption,stimulus.richCaption,scratch,surface,
       (id,alt)=>assetHTML(bundle,[id],alt))+'</div></section>';
 }
 return "";
}