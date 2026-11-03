/** Narrow P47-5A application-owned adapter contracts. No vendor imports. */
import type {RichDocument} from "../domain/rich-document.ts";
export type AuthoringEditCommand=
 | {readonly type:"strong"|"emphasis"|"underline"|"subscript"|"superscript"|"code"|
   "paragraph"|"heading2"|"heading3"|"bullet-list"|"numbered-list"|"undo"|"redo"}
 | {readonly type:"insert-math";readonly tex:string;readonly linearText:string;readonly display:boolean}
 | {readonly type:"insert-image";readonly assetId:string;readonly altText:string}
 | {readonly type:"insert-table";readonly rows:number;readonly columns:number};
export interface EditorSession{
  execute(command:AuthoringEditCommand):boolean;
  getDocument():RichDocument;
  setDocument(doc:RichDocument):void;
  focus():void;
  destroy():void;
}
export interface AuthoringEditorPort{
  readonly provider:string;
  mount(target:HTMLElement,draft:RichDocument,
    onChange:(doc:RichDocument)=>void,knownAssets:ReadonlySet<string>):Promise<EditorSession>;
}
export type MathExpression={readonly tex:string;readonly linearText:string;readonly displayMode:boolean};
export type MathMarkup={readonly html:string;readonly accessibleText:string};
export interface MathRendererPort{
  readonly provider:string;
  render(input:MathExpression):MathMarkup;
}
