/** Pure-in-the-browser bridge: Wordgard documents are transient; only this AST persists.
 * Never admit arbitrary HTML, URI attributes or unknown vendor document nodes.
 */
import type {RichBlock,RichDocument,RichInline,RichMark} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
import {escapeText} from "../app/html-escape.ts";
export type AuthoringAtom=
 | {type:"math";tex:string;linearText:string}
 | {type:"image";assetId:string;altText:string}
 | {type:"display-math";tex:string;linearText:string}
 | {type:"block-image";assetId:string;altText:string};
const tag:Record<RichMark,string>={
 strong:"strong",emphasis:"em",underline:"u",subscript:"sub",superscript:"sup",code:"code"
};
const tagToMark:Readonly<Record<string,RichMark>>={
 STRONG:"strong",B:"strong",EM:"emphasis",I:"emphasis",U:"underline",
 SUB:"subscript",SUP:"superscript",CODE:"code"
};
export function encodeAuthorAtom(atom:AuthoringAtom):string{
 return encodeURIComponent(JSON.stringify(atom));
}
export function decodeAuthorAtom(encoded:string):AuthoringAtom{
 if(encoded.length>7500)throw Error("Oversized inline author token");
 const value=JSON.parse(decodeURIComponent(encoded)) as unknown;
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid author token");
 const x=value as Record<string,unknown>;
 if(x.type==="math"||x.type==="display-math"){
  if(Object.keys(x).some(k=>!["type","tex","linearText"].includes(k))||
   typeof x.tex!=="string"||typeof x.linearText!=="string")
   throw Error("Invalid mathematical token");
  return {type:x.type,tex:x.tex,linearText:x.linearText};
 }
 if(x.type==="image"||x.type==="block-image"){
  if(Object.keys(x).some(k=>!["type","assetId","altText"].includes(k))||
   typeof x.assetId!=="string"||typeof x.altText!=="string")
   throw Error("Invalid local asset token");
  return {type:x.type,assetId:x.assetId,altText:x.altText};
 }
 throw Error("Unknown editor token");
}
function writeInline(inline:RichInline):string{
 if(inline.type==="math")
  return '<span data-pd-token="'+escapeText(encodeAuthorAtom(inline))+'"></span>';
 if(inline.type==="image")
  return '<span data-pd-token="'+escapeText(encodeAuthorAtom(inline))+'"></span>';
 let content=escapeText(inline.text);
 for(const mark of [...(inline.marks??[])].reverse()){
  const name=tag[mark];content="<"+name+">"+content+"</"+name+">";
 }
 return content;
}
const inlineHTML=(items:readonly RichInline[])=>items.map(writeInline).join("");
function writeBlock(block:RichBlock):string{
 switch(block.type){
  case "paragraph":return "<p>"+inlineHTML(block.content)+"</p>";
  case "heading":return "<h"+block.level+">"+inlineHTML(block.content)+"</h"+block.level+">";
  case "list":return "<"+(block.ordered?"ol":"ul")+">"+
    block.items.map(row=>"<li>"+inlineHTML(row)+"</li>").join("")+
    "</"+(block.ordered?"ol":"ul")+">";
  case "table":return "<table><tbody>"+
    block.rows.map(row=>"<tr>"+row.map(cell=>"<td>"+inlineHTML(cell)+"</td>").join("")+"</tr>").join("")+
    "</tbody></table>";
  case "display-math":
   return '<div data-pd-block-token="'+escapeText(encodeAuthorAtom(block))+'"></div>';
  case "image":
   return '<div data-pd-block-token="'+escapeText(encodeAuthorAtom({...block,type:"block-image"}))+'"></div>';
 }
}
/** Only validated app-owned AST is ever serialized as editor HTML. */
export function richToWordgardHTML(doc:RichDocument,known:ReadonlySet<string>):string{
 const value=validateRichDocument(doc,{knownAssets:known});
 return value.blocks.length?value.blocks.map(writeBlock).join(""):"<p></p>";
}
function readInline(container:ParentNode):RichInline[]{
 const result:RichInline[]=[];
 const appendText=(text:string,marks:RichMark[])=>{
  if(!text)return;
  const normalized=[...new Set(marks)];
  const last=result.at(-1);
  if(last?.type==="text"&&JSON.stringify(last.marks??[])===JSON.stringify(normalized)){
    result[result.length-1]={type:"text",text:last.text+text,...(normalized.length?{marks:normalized}:{})};
  }else result.push({type:"text",text,...(normalized.length?{marks:normalized}:{})});
 };
 const visit=(node:Node,marks:RichMark[])=>{
  if(node.nodeType===Node.TEXT_NODE){appendText(node.textContent??"",marks);return;}
  if(!(node instanceof Element))throw Error("Unsupported editor node");
  const el=node;
  if(el.hasAttribute("data-pd-token")){
   if(el.tagName!=="SPAN")throw Error("Unsupported embedded token");
   const atom=decodeAuthorAtom(el.getAttribute("data-pd-token")??"");
   if(atom.type!=="math"&&atom.type!=="image")throw Error("Incorrect inline token kind");
   result.push(atom);return;
  }
  const mark=tagToMark[el.tagName];
  if(mark){for(const child of el.childNodes)visit(child,[...marks,mark]);return;}
  if(el.tagName==="BR"){appendText("\n",marks);return;}
  throw Error("Unsupported editor inline markup: "+el.tagName);
 };
 for(const node of container.childNodes)visit(node,[]);
 return result;
}
function readBlock(node:Node):RichBlock{
 if(!(node instanceof Element))throw Error("Unwrapped text outside a block");
 if(node.hasAttribute("data-pd-block-token")){
  if(node.tagName!=="DIV")throw Error("Incorrect block token");
  const atom=decodeAuthorAtom(node.getAttribute("data-pd-block-token")??"");
  if(atom.type==="display-math")return atom;
  if(atom.type==="block-image")return {type:"image",assetId:atom.assetId,altText:atom.altText};
  throw Error("Incorrect block token kind");
 }
 if(node.tagName==="P")return {type:"paragraph",content:readInline(node)};
 if(node.tagName==="H2"||node.tagName==="H3")
  return {type:"heading",level:node.tagName==="H2"?2:3,content:readInline(node)};
 if(node.tagName==="UL"||node.tagName==="OL"){
  const items=[...node.children].map(child=>{
   if(child.tagName!=="LI")throw Error("Invalid list item");
   if(child.children.length===1&&child.children[0]?.tagName==="P")return readInline(child.children[0]);
   return readInline(child);
  });
  return {type:"list",ordered:node.tagName==="OL",items};
 }
 if(node.tagName==="TABLE"){
  const trs=[...node.querySelectorAll("tr")];
  const rows=trs.map(tr=>[...tr.children].map(cell=>{
   if(cell.tagName!=="TD"&&cell.tagName!=="TH")throw Error("Invalid table cell");
   return readInline(cell);
  }));
  return {type:"table",rows};
 }
 throw Error("Unsupported editor block markup: "+node.tagName);
}
/** Converts only Wordgard's serialized model, not live contenteditable DOM. */
export function wordgardHTMLToRich(html:string,known:ReadonlySet<string>):RichDocument{
 if(html.length>150000)throw Error("Editor document too large");
 const parsed=new DOMParser().parseFromString("<main id=\"pd-editor-content\">"+html+"</main>","text/html");
 const container=parsed.querySelector("#pd-editor-content");
 if(!container)throw Error("Invalid editor document");
 const blocks=[...container.childNodes].filter(n=>n.nodeType!==Node.TEXT_NODE||
  (n.textContent??"").trim()).map(readBlock);
 return validateRichDocument({format:"practice-desk-rich",version:1,blocks},{knownAssets:known});
}
