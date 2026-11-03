/** P47-5A: application-owned ports. Vendor packages must not escape adapters. */
import type {RichDocument} from "./rich-document.ts";
export interface EditorSession{
 readDraft():RichDocument;
 replaceDraft(value:RichDocument):void;
 focus():void;
 dispose():void;
}
export interface AuthoringEditorPort{
 readonly provider:string;
 mount(options:{
   readonly host:HTMLElement;
   readonly draft:RichDocument;
   readonly imageAssetIds:ReadonlySet<string>;
   readonly onChange:(draft:RichDocument)=>void;
 }):Promise<EditorSession>;
}
export interface MathExpression{
 readonly tex:string;
 readonly linearText:string;
 readonly displayMode:boolean;
}
export interface MathRenderResult{
 /** HTML from a strictly configured trusted local renderer, not an author string. */
 readonly html:string;
 readonly accessibleText:string;
}
export interface MathRendererPort{
 readonly provider:string;
 render(value:MathExpression):MathRenderResult;
}
