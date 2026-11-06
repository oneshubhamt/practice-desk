import type {RichDocument,RichInline} from "../domain/rich-document.ts";

const inlinePlain=(item:RichInline):string=>{
 switch(item.type){
  case "text":return item.text;
  case "math":return item.linearText;
  case "image":return item.altText;
 }
};
const rowPlain=(row:readonly RichInline[]):string=>row.map(inlinePlain).join("");
export function publicationPlainText(doc:RichDocument):string{
 const blocks=doc.blocks.map(block=>{
  switch(block.type){
   case "paragraph":case "heading":return rowPlain(block.content);
   case "list":return block.items.map(row=>rowPlain(row)).join("\n");
   case "table":return block.rows.map(row=>row.map(rowPlain).join(" | ")).join("\n");
   case "display-math":return block.linearText;
   case "image":return block.altText;
  }
 });
 return blocks.join("\n").trim();
}
