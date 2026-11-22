/** Read-only, restricted semantic HTML. No editor or Wordgard imports. */
import type {RichBlock,RichDocument,RichInline,RichMark} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
import {escapeText} from "./html-escape.ts";
import {mathRenderer} from "./math-renderer-provider.ts";
type ImageHTML=(assetId:string,alt:string)=>string;
export interface RichTextDecoration{
 readonly id:string;readonly start:number;readonly end:number;readonly color:string;
}
export interface RichRenderOptions{
 readonly annotatable?:boolean;
 readonly textDecorations?:(path:readonly number[],text:string)=>readonly RichTextDecoration[];
}
const tags:Readonly<Record<RichMark,string>>={
 strong:"strong",emphasis:"em",underline:"u",subscript:"sub",superscript:"sup",code:"code"
};
function markedText(text:string,marks:readonly RichMark[]|undefined):string{
 let html=escapeText(text);
 for(const mark of [...(marks??[])].reverse()){
  const tag=tags[mark];html="<"+tag+">"+html+"</"+tag+">";
 }
 return html;
}
function decoratedText(inline:Extract<RichInline,{type:"text"}>,path:readonly number[],options:RichRenderOptions):string{
 const decorations=(options.textDecorations?.(path,inline.text)??[])
  .filter(item=>Number.isSafeInteger(item.start)&&Number.isSafeInteger(item.end)&&
    item.start>=0&&item.end>item.start&&item.end<=inline.text.length);
 if(!decorations.length){
  const html=markedText(inline.text,inline.marks);
  return options.annotatable?'<span class="pd-rich-text-leaf" data-rich-path="'+path.join(".")+'">'+html+'</span>':html;
 }
 const boundaries=[0,inline.text.length,...decorations.flatMap(item=>[item.start,item.end])]
  .filter((value,index,self)=>self.indexOf(value)===index).sort((a,b)=>a-b);
 let html="";
 for(let i=0;i<boundaries.length-1;i++){
  const start=boundaries[i]!,end=boundaries[i+1]!;
  if(end<=start)continue;
  let segment=markedText(inline.text.slice(start,end),inline.marks);
  const active=decorations.filter(item=>item.start<=start&&item.end>=end)
    .sort((a,b)=>a.id.localeCompare(b.id));
  for(const item of active)segment='<mark class="candidate-highlight" data-candidate-highlight-id="'+
    escapeText(item.id)+'" data-highlight-color="'+escapeText(item.color)+'">'+segment+'</mark>';
  html+=segment;
 }
 return options.annotatable?'<span class="pd-rich-text-leaf" data-rich-path="'+path.join(".")+'">'+html+'</span>':html;
}
function inlineHTML(inline:RichInline,image:ImageHTML,path:readonly number[],options:RichRenderOptions):string{
 if(inline.type==="math")return mathRenderer.render({
  tex:inline.tex,linearText:inline.linearText,displayMode:false}).html;
 if(inline.type==="image")return image(inline.assetId,inline.altText);
 return decoratedText(inline,path,options);
}
function content(items:readonly RichInline[],image:ImageHTML,path:readonly number[],options:RichRenderOptions):string{
 return items.map((item,i)=>inlineHTML(item,image,[...path,i],options)).join("");
}
function blockHTML(block:RichBlock,image:ImageHTML,blockIndex:number,options:RichRenderOptions):string{
 switch(block.type){
  case "paragraph":return '<p class="pd-rich-paragraph">'+content(block.content,image,[blockIndex],options)+'</p>';
  case "heading":return '<h'+(block.level+1)+' class="pd-rich-heading">'+
    content(block.content,image,[blockIndex],options)+'</h'+(block.level+1)+'>';
  case "list":return '<'+(block.ordered?"ol":"ul")+' class="pd-rich-list">'+
    block.items.map((item,itemIndex)=>'<li>'+content(item,image,[blockIndex,itemIndex],options)+'</li>').join("")+
    '</'+(block.ordered?"ol":"ul")+'>';
  case "table":return '<div class="pd-rich-table-scroll" tabindex="0" role="region" aria-label="Question table"><table class="pd-rich-table"><tbody>'+
    block.rows.map((row,rowIndex)=>'<tr>'+row.map((cell,columnIndex)=>'<'+(rowIndex===0?"th":"td")+'>'+
      content(cell,image,[blockIndex,rowIndex,columnIndex],options)+'</'+(rowIndex===0?"th":"td")+'>').join("")+'</tr>').join("")+
    '</tbody></table></div>';
  case "display-math":return mathRenderer.render({
   tex:block.tex,linearText:block.linearText,displayMode:true}).html;
  case "image":return '<div class="pd-rich-image">'+image(block.assetId,block.altText)+'</div>';
 }
}
/** No implicit $-parsing, ever. Host supplies authenticated frozen asset IDs. */
export function richDocumentHTML(doc:RichDocument,knownAssets:ReadonlySet<string>,
 image:ImageHTML=()=> "",options:RichRenderOptions={}):string{
 const validated=validateRichDocument(doc,{knownAssets});
 return '<div class="pd-rich-content">'+validated.blocks.map((block,i)=>blockHTML(block,image,i,options)).join("")+'</div>';
}
export function authoredTextHTML(plain:string,rich:RichDocument|undefined,
 knownAssets:ReadonlySet<string>,image:ImageHTML=()=> "",options:RichRenderOptions={}):string{
 return rich?richDocumentHTML(rich,knownAssets,image,options):escapeText(plain);
}
