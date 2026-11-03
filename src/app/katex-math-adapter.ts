/** P47-5B: only KaTeX integration boundary; replaceable via MathRendererPort. */
import katex from "katex";
import type {MathExpression,MathRendererPort} from "../authoring/vendor-ports.ts";
import {escapeText} from "./html-escape.ts";

export const KATEX_VERSION="0.19.1" as const;
export const mathRenderer:MathRendererPort={
 provider:"katex@"+KATEX_VERSION,
 render(input:MathExpression){
  const linearText=typeof input.linearText==="string"&&input.linearText.trim()?
    input.linearText.slice(0,500):"Mathematical expression";
  const tex=typeof input.tex==="string"?input.tex:"";
  const block=input.displayMode===true;
  // Fail closed on malformed expressions, including direct adapter callers.
  if(!tex.trim()||tex.length>2048||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(tex)){
   return {html:fallback(tex,linearText,block),accessibleText:linearText};
  }
  try{
   const html=katex.renderToString(tex,{
    output:"htmlAndMathml",displayMode:block,throwOnError:true,
    strict:"error",trust:false,maxExpand:100,maxSize:8,
    macros:{} // no shared macro state between independent questions
   });
   // The HTML is emitted only by this pinned and locally bundled KaTeX.
   return {html:'<span class="pd-math '+(block?"pd-math-block":"pd-math-inline")+'">'+html+'</span>',
     accessibleText:linearText};
  }catch{
   return {html:fallback(tex,linearText,block),accessibleText:linearText};
  }
 }
};
function fallback(tex:string,linearText:string,block:boolean):string{
 return '<span class="pd-math pd-math-fallback'+(block?" pd-math-block":"")+
   '" role="math" aria-label="'+escapeText(linearText)+'">'+
   escapeText(tex.slice(0,2048)||linearText)+'</span>';
}
