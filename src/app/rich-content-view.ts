/** Read-only, restricted semantic HTML. No editor or Wordgard imports. */
import type {RichBlock,RichDocument,RichInline,RichMark} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
import {escapeText} from "./html-escape.ts";
import {mathRenderer} from "./katex-math-adapter.ts";
type ImageHTML=(assetId:string,alt:string)=>string;
const tags:Readonly<Record<RichMark,string>>={
 strong:"strong",emphasis:"em",underline:"u",subscript:"sub",superscript:"sup",code:"code"
};
function inlineHTML(inline:RichInline,image:ImageHTML):string{
 if(inline.type==="math")return mathRenderer.render({
  tex:inline.tex,linearText:inline.linearText,displayMode:false}).html;
 if(inline.type==="image")return image(inline.assetId,inline.altText);
 let html=escapeText(inline.text);
 for(const mark of [...(inline.marks??[])].reverse()){
  const tag=tags[mark];html="<"+tag+">"+html+"</"+tag+">";
 }
 return html;
}
function content(items:readonly RichInline[],image:ImageHTML):string{
 return items.map(item=>inlineHTML(item,image)).join("");
}
function blockHTML(block:RichBlock,image:ImageHTML):string{
 switch(block.type){
  case "paragraph":return '<p class="pd-rich-paragraph">'+content(block.content,image)+'</p>';
  case "heading":return '<h'+(block.level+1)+' class="pd-rich-heading">'+content(block.content,image)+'</h'+(block.level+1)+'>';
  case "list":return '<'+(block.ordered?"ol":"ul")+' class="pd-rich-list">'+
    block.items.map(item=>'<li>'+content(item,image)+'</li>').join("")+
    '</'+(block.ordered?"ol":"ul")+'>';
  case "table":return '<div class="pd-rich-table-scroll" tabindex="0" role="region" aria-label="Question table"><table class="pd-rich-table"><tbody>'+
    block.rows.map((row,i)=>'<tr>'+row.map(cell=>'<'+(i===0?"th":"td")+'>'+
      content(cell,image)+'</'+(i===0?"th":"td")+'>').join("")+'</tr>').join("")+
    '</tbody></table></div>';
  case "display-math":return mathRenderer.render({
   tex:block.tex,linearText:block.linearText,displayMode:true}).html;
  case "image":return '<div class="pd-rich-image">'+image(block.assetId,block.altText)+'</div>';
 }
}
/** No implicit $-parsing, ever. Host supplies authenticated frozen asset IDs. */
export function richDocumentHTML(doc:RichDocument,knownAssets:ReadonlySet<string>,
 image:ImageHTML=()=> ""):string{
 const validated=validateRichDocument(doc,{knownAssets});
 return '<div class="pd-rich-content">'+validated.blocks.map(block=>blockHTML(block,image)).join("")+'</div>';
}
export function authoredTextHTML(plain:string,rich:RichDocument|undefined,
 knownAssets:ReadonlySet<string>,image:ImageHTML=()=> ""):string{
 return rich?richDocumentHTML(rich,knownAssets,image):escapeText(plain);
}
