/** Narrow P47-5A application-owned adapter contracts. No vendor imports. */
import type {RichDocument} from "./rich-document.ts";
export interface EditorSession{
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
