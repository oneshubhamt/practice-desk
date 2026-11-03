/** P47-5C: the ONLY Wordgard runtime boundary. Editor is mounted only on Library authoring action.
 * Upstream Wordgard is pinned, pristine and never patched. Persistence owns only RichDocument.
 */
import {Wordgard} from "wordgard/editor";
import {GardState} from "wordgard/state";
import {Leaf,Node,Elt,serialize} from "wordgard/doc";
import {blockDoc,paragraph,heading,bulletList,orderedList,
 strong,emphasis,underline,subscript,superscript,code} from "wordgard/schema";
import {tables} from "wordgard/table";
import {history,undo,redo} from "wordgard/history";
import {Command,toggleMark,setTextblockType,toggleList} from "wordgard/command";
import {Strong,Emphasis,Underline,Subscript,Superscript,Code,
 Paragraph,Heading,BulletList,OrderedList} from "wordgard/types";
import type {AuthoringEditorPort,EditorSession,AuthoringEditCommand} from "./vendor-ports.ts";
import type {RichDocument} from "../domain/rich-document.ts";
import {validateRichDocument} from "../domain/rich-document.ts";
import {richToWordgardHTML,wordgardHTMLToRich,encodeAuthorAtom,decodeAuthorAtom} from "./wordgard-document-bridge.ts";

const label=(encoded:string):string=>{
 try{
  const atom=decodeAuthorAtom(encoded);
  if(atom.type==="math"||atom.type==="display-math")return "∑ "+atom.linearText.slice(0,100);
  return "Figure "+atom.assetId+": "+atom.altText.slice(0,70);
 }catch{return "Invalid authoring token";}
};
const inlineToken=Leaf.Type.define<string>("PDLocalInlineToken",{
 inline:true,validate:"string",selectable:true,
 shape:{structure:(p:string)=>Elt.mk("span",{
  class:"pd-author-token", "data-pd-token":p,"aria-label":label(p)
 },[label(p)])},
 parseRules:[{selector:"span[data-pd-token]",readElement:element=>
  element.getAttribute("data-pd-token")??""}],
 toText:node=>label(node.param as string)
});
const blockToken=Leaf.Type.define<string>("PDLocalBlockToken",{
 group:Node.Group.Content,validate:"string",selectable:true,
 shape:{structure:(p:string)=>Elt.mk("div",{
  class:"pd-author-token pd-author-block-token",
  "data-pd-block-token":p,"aria-label":label(p)
 },[label(p)])},
 parseRules:[{selector:"div[data-pd-block-token]",readElement:element=>
  element.getAttribute("data-pd-block-token")??""}],
 toText:node=>label(node.param as string)
});
const markType={strong:Strong,emphasis:Emphasis,underline:Underline,
 subscript:Subscript,superscript:Superscript,code:Code};

export const wordgardEditorPort:AuthoringEditorPort={
 provider:"wordgard@0.6.2",
 async mount(target:HTMLElement,draft:RichDocument,onChange:(doc:RichDocument)=>void,
  knownAssets:ReadonlySet<string>):Promise<EditorSession>{
  const config=[
   blockDoc(),paragraph(),heading(),bulletList({blockItems:false}),
   orderedList({blockItems:false}),strong(),emphasis(),underline(),
   subscript(),superscript(),code(),tables({cellContent:"inline",headerCells:false,cellSpanning:false}),
   history(),GardState.schemaElement.of(inlineToken),
   GardState.schemaElement.of(blockToken)
  ];
  let alive=true;
  let view:Wordgard;
  let lastCanonical="";
  const read=():RichDocument=>{
   if(!alive)throw Error("Authoring editor is closed");
   // Serialize the document MODEL, never trust the mutable contenteditable DOM.
   const html=serialize(view.state.doc).toHTML();
   return wordgardHTMLToRich(html,knownAssets);
  };
  const changed=():void=>{
   if(!alive)return;
   const doc=read();
   const canonical=JSON.stringify(doc);
   if(canonical!==lastCanonical){lastCanonical=canonical;onChange(doc);}
  };
  const build=(doc:RichDocument):Wordgard=>{
   const normalized=validateRichDocument(doc,{knownAssets});
   lastCanonical=JSON.stringify(normalized);
   return Wordgard.create({parent:target,doc:richToWordgardHTML(normalized,knownAssets),
    config:[...config,Wordgard.updateListener.of(update=>{
     if(update.docChanged)changed();
    })]});
  };
  view=build(draft);
  const paste=(event:ClipboardEvent)=>{
   if(!alive||!(event.target instanceof window.Node)||!view.dom.contains(event.target))return;
   // Refuse rich external markup, remote image URLs and arbitrary HTML; text
   // remains pasteable. Wordgard will parse the text without executing HTML.
   if(!event.clipboardData?.types.includes("text/html"))return;
   event.preventDefault();event.stopImmediatePropagation();
   const value=event.clipboardData.getData("text/plain");
   if(!value)return;
   const {from,to}=view.state.selection.replacementRange;
   // Built-in command preserves typing/undo semantics and editor selections.
   Command.dispatch(view,(awaited,source)=>{
    if(awaited.state.readOnly)return false;
    return {changes:{from,to,insert:[Leaf.text(source)],fit:true},
      userEvent:"input.paste",scrollIntoView:true};
   },value);
   changed();
  };
  target.addEventListener("paste",paste,true);
  const replace=(doc:RichDocument):void=>{
   if(!alive)throw Error("Editor is disposed");
   view.dom.remove();
   view=build(doc);
   changed();
  };
  const execute=(action:AuthoringEditCommand):boolean=>{
   if(!alive)return false;
   let applied=false;
   switch(action.type){
    case "strong":case "emphasis":case "underline":
    case "subscript":case "superscript":case "code":
     applied=Command.dispatch(view,toggleMark,markType[action.type]);break;
    case "paragraph":applied=Command.dispatch(view,setTextblockType,Paragraph);break;
    case "heading2":applied=Command.dispatch(view,setTextblockType,Heading.of(2));break;
    case "heading3":applied=Command.dispatch(view,setTextblockType,Heading.of(3));break;
    case "bullet-list":applied=Command.dispatch(view,toggleList,BulletList);break;
    case "numbered-list":applied=Command.dispatch(view,toggleList,OrderedList.default!);break;
    case "undo":applied=Command.dispatch(view,undo);break;
    case "redo":applied=Command.dispatch(view,redo);break;
    case "insert-math":{
     // Validate the complete token BEFORE touching Wordgard state.
     const block={format:"practice-desk-rich",version:1,
      blocks:[action.display?{type:"display-math",tex:action.tex,linearText:action.linearText}:
       {type:"paragraph",content:[{type:"math",tex:action.tex,linearText:action.linearText}]}]};
     validateRichDocument(block,{knownAssets});
     if(action.display){
      const current=read();
      replace(validateRichDocument({...current,blocks:[...current.blocks,
       {type:"display-math",tex:action.tex,linearText:action.linearText}]},{knownAssets}));
     }else{
      const {from,to}=view.state.selection.replacementRange;
      view.dispatch({changes:{from,to,insert:[inlineToken.of(encodeAuthorAtom({
       type:"math",tex:action.tex,linearText:action.linearText}))],fit:true},
       userEvent:"input.author.math",scrollIntoView:true});
      changed();
     }
     applied=true;break;
    }
    case "insert-image":{
     validateRichDocument({format:"practice-desk-rich",version:1,blocks:[
      {type:"paragraph",content:[{type:"image",assetId:action.assetId,altText:action.altText}]}]},
      {knownAssets});
     const {from,to}=view.state.selection.replacementRange;
     view.dispatch({changes:{from,to,insert:[inlineToken.of(encodeAuthorAtom({
      type:"image",assetId:action.assetId,altText:action.altText}))],fit:true},
      userEvent:"input.author.image",scrollIntoView:true});
     changed();applied=true;break;
    }
    case "insert-table":{
     if(!Number.isInteger(action.rows)||!Number.isInteger(action.columns)||
      action.rows<1||action.rows>20||action.columns<1||action.columns>10)
      throw Error("Table must have 1–20 rows and 1–10 columns");
     const doc=read();
     const rows=Array.from({length:action.rows},()=>Array.from({length:action.columns},
      ()=>[] as const));
     replace(validateRichDocument({...doc,blocks:[...doc.blocks,{type:"table",rows}]},{knownAssets}));
     applied=true;break;
    }
   }
   if(applied)changed();
   return applied;
  };
  return {
   getDocument:read,
   setDocument:replace,
   execute,
   focus:()=>{if(alive)view.focus();},
   destroy:()=>{
    if(!alive)return;
    alive=false;
    target.removeEventListener("paste",paste,true);
    view.dom.remove();
   }
  };
 }
};
