/** Inert HTML for frozen question media, stimuli and all six response kinds. */
import type {ExamPackage} from "./exam-package.ts";
import type {QuestionRevision,CandidateResponse} from "../domain/question.js";
import type {RichDocument} from "../domain/rich-document.ts";
import {authoredTextHTML} from "./rich-content-view.ts";
import {escapeText} from "./html-escape.ts";
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
/** Only explicit normalized rich content is interpreted; plain strings remain inert. */
export function renderAuthoredText(bundle:ExamPackage,plain:string,rich?:RichDocument):string{
 const knownAssets=new Set(bundle.assets?.map(asset=>asset.id)??[]);
 return authoredTextHTML(plain,rich,knownAssets,(id,alt)=>assetHTML(bundle,[id],alt));
}
function renderAuthoredTextWithoutImages(bundle:ExamPackage,plain:string,rich?:RichDocument):string{
 const knownAssets=new Set(bundle.assets?.map(asset=>asset.id)??[]);
 return authoredTextHTML(plain,rich,knownAssets,()=>"");
}
export function renderQuestionPrompt(bundle:ExamPackage,q:QuestionRevision):string{
 const content=q.content;
 return content.richPrompt?
   '<div class="generic-prompt pd-rich-prompt" role="heading" aria-level="2">'+
     renderAuthoredText(bundle,content.prompt,content.richPrompt)+'</div>':
   '<h2 class="generic-prompt">'+escapeText(content.prompt)+'</h2>';
}
export function renderGenericControls(bundle:ExamPackage,q:QuestionRevision,response?:CandidateResponse):string{
  const c=q.content;
  if(c.kind==="single-choice"||c.kind==="multiple-select"){
    const selected=response?.kind==="single-choice"?[response.optionId]:response?.kind==="multiple-select"?response.optionIds:[];
    const kind=c.kind==="single-choice"?"radio":"checkbox";
    const legend=kind==="radio"?"Select one option":"Select applicable options";
    return '<fieldset class="generic-choices"><legend>'+legend+'</legend>'+ 
      '<p class="generic-choice-narrow-legend" aria-hidden="true">'+legend+'</p>'+
      c.options.map((o,i)=>{
        const media=assetHTML(bundle,o.assetIds,"Image for option "+String.fromCharCode(65+i));
        const text=o.richText?'<div class="pd-rich-choice-text"><b>'+String.fromCharCode(65+i)+'.</b> '+
           renderAuthoredTextWithoutImages(bundle,o.text,o.richText)+'</div>':
           '<span><b>'+String.fromCharCode(65+i)+'.</b> '+escapeText(o.text)+'</span>';
        const label='<label class="generic-choice"><input type="'+kind+'" name="generic-answer" data-choice="'+escapeText(o.id)+'"'+
          (selected.includes(o.id)?" checked":"")+'>'+text+'</label>';
        // No interactive image enlargement control nested inside an answer
        // label: expanding an option diagram can never select that answer.
        return media?'<div class="generic-choice-media-row">'+label+
          '<div class="generic-choice-media">'+media+'</div></div>':label;
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
  if(c.kind==="free-response")return '<label class="picker" for="g-text">Written response</label><textarea id="g-text" rows="6">'+
    (response?.kind==="free-response"?escapeText(response.text):"")+'</textarea><button class="btn primary" id="g-save">Save response</button>';
  const pairs=response?.kind==="matching"?response.pairs:[];
  return '<div class="generic-matches">'+c.leftItems.map(left=>{
    const media=assetHTML(bundle,left.assetIds,"Image for matching item "+left.text);
    const label='<label>'+(left.richText?'<div class="pd-rich-choice-text">'+renderAuthoredTextWithoutImages(bundle,left.text,left.richText)+'</div>':
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
export function stimulusHTML(bundle:ExamPackage,q:QuestionRevision):string{
 const stimulus=bundle.stimuli?.find(s=>s.id===q.content.stimulusId);
 if(!stimulus)return "";
 if(stimulus.kind==="passage"||stimulus.kind==="case")
   return '<section class="generic-stimulus" role="region" tabindex="0" aria-label="'+
     escapeText((stimulus.title||(stimulus.kind==="case"?"Case study":"Reading passage"))+
       " — scroll to read full text")+'"><b>'+escapeText(stimulus.title||"Reading passage")+
     '</b>'+(stimulus.richText?renderAuthoredText(bundle,stimulus.text,stimulus.richText):
       '<p>'+escapeText(stimulus.text)+'</p>'+assetHTML(bundle,stimulus.assetIds,
         "Image accompanying "+(stimulus.title||"reading passage")))+'</section>';
 if(stimulus.kind==="table")return '<section class="generic-stimulus"><b>'+escapeText(stimulus.title||"Table")+'</b><div class="scroll-table"><table><tr>'+
   stimulus.columns.map((c,i)=>'<th>'+renderAuthoredText(bundle,c,stimulus.richColumns?.[i])+'</th>').join("")+'</tr>'+
   stimulus.rows.map((r,i)=>'<tr>'+r.map((c,j)=>'<td>'+
     renderAuthoredText(bundle,c,stimulus.richRows?.[i]?.[j])+'</td>').join("")+'</tr>').join("")+'</table></div></section>';
 if ("assetId" in stimulus) return '<section class="generic-stimulus">'+
    assetHTML(bundle,[stimulus.assetId],stimulus.altText)+
    '<div>'+renderAuthoredText(bundle,stimulus.caption||stimulus.altText,stimulus.richCaption)+'</div></section>';
  return "";
}
