/** Deterministic, offline KaTeX 0.19.1 CSS/font preparation.
 * Preserve all necessary WOFF2 glyph families; remove unused WOFF/TTF formats.
 * Complete pinned library source is supplied by npm, never patched here.
 */
import {readFile} from "node:fs/promises";
import {resolve,join} from "node:path";
import {transform} from "esbuild";
export const KATEX_EXPECTED_VERSION="0.19.1";
export async function preparedKaTeXStyles(root:string):Promise<{
 css:string;woff2Files:readonly string[];woff2Bytes:number;inlinedBase64Bytes:number
}>{
 const pkg=JSON.parse(await readFile(resolve(root,"node_modules/katex/package.json"),"utf8"));
 if(pkg.version!==KATEX_EXPECTED_VERSION)throw Error("Unpinned KaTeX release");
 let css=await readFile(resolve(root,"node_modules/katex/dist/katex.min.css"),"utf8");
 const directory=resolve(root,"node_modules/katex/dist/fonts");
 const embedded=new Map<string,{uri:string;size:number}>();
 let faces=0;
 const sourceMatches=[...css.matchAll(/@font-face\s*\{[^}]*\}/g)];
 if(sourceMatches.length<15||sourceMatches.length>60)throw Error("Unexpected KaTeX font-face inventory");
 for(const match of sourceMatches){
   const face=match[0],src=face.match(/src:([^;}]+)/);
   if(!src)throw Error("Font face lacks src");
   const matchFont=src[1]!.match(/url\((?:["']?)(?:\.\/)?fonts\/([A-Za-z0-9_.-]+\.woff2)(?:["']?)\)\s*format\((?:["']?)woff2(?:["']?)\)/);
   if(!matchFont)throw Error("Font has no local WOFF2 source");
   const name=matchFont[1]!;
   let saved=embedded.get(name);
   if(!saved){
     const bytes=await readFile(join(directory,name));
     saved={size:bytes.byteLength,uri:"data:font/woff2;base64,"+bytes.toString("base64")};
     embedded.set(name,saved);
   }
   const substituted=face.replace(src[0],'src:url("'+saved.uri+'") format("woff2")');
   if(substituted===face)throw Error("KaTeX CSS font substitution failed");
   css=css.replace(face,substituted);
   faces++;
 }
 if(faces!==sourceMatches.length||embedded.size<15)throw Error("KaTeX WOFF2 font coverage incomplete");
 // Absolute, relative and remote CSS fetches are prohibited in our one-file build.
 for(const url of css.matchAll(/url\(\s*["']?([^)"']+)/g)){
   if(!url[1]?.startsWith("data:font/woff2;base64,"))
     throw Error("KaTeX CSS contains non-inline resource URL");
 }
 const min=(await transform(css,{loader:"css",minify:true,logLevel:"silent"})).code;
 if(min.includes("fonts/")||min.includes("url(http"))throw Error("KaTeX font pipeline left unresolved URL");
 return {css:min,
   woff2Files:[...embedded.keys()].sort(),
   woff2Bytes:[...embedded.values()].reduce((n,s)=>n+s.size,0),
   inlinedBase64Bytes:[...embedded.values()].reduce((n,s)=>n+s.uri.length,0)};
}
