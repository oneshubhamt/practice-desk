import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { createHash } from "node:crypto";
import { build as bundleJavaScript,transform as minifySource } from "esbuild";
import { preparedKaTeXStyles } from "./prepare-katex-css.mjs";
import { validateContent } from "../src/content/validate.ts";
const root=resolve(import.meta.dirname,"..");
const read=file=>readFile(resolve(root,file),"utf8");
const katexStyles=await preparedKaTeXStyles(root);
const nativeCss=(await minifySource(await read("src/styles/app.css"),{
 loader:"css",minify:true,logLevel:"silent"
})).code;
const katexLicense=await read("node_modules/katex/LICENSE");
const wordgardLicense=await read("node_modules/wordgard/LICENSE");
// The full MIT notice travels in the self-contained user-facing artifact.
if(katexLicense.includes("*/")||katexLicense.includes("</style")||
 wordgardLicense.includes("*/")||wordgardLicense.includes("</style"))throw Error("Unsafe vendor license");
const payloads={
 CSS:"<style>/* KaTeX 0.19.1 LICENSE\n"+katexLicense+"\n*/\n"+
   "/* Wordgard 0.6.2 LICENSE\n"+wordgardLicense+"\n*/\n"+
   nativeCss+"\n"+katexStyles.css+"</style>",
 PAPER_BANK:'<script id="paper-bank" type="application/json">'+(await read("src/content/papers.json")).trim()+"</script>",
 REVIEW_PATCHES:'<script id="review-patches" type="application/json">'+(await read("src/content/patches.json")).trim()+"</script>",
 SOLUTION_BANK:'<script id="solution-bank" type="application/json">'+(await read("src/content/solutions.json")).trim()+"</script>"
};
validateContent({
 papers:JSON.parse(await read("src/content/papers.json")),
 patches:JSON.parse(await read("src/content/patches.json")),
 solutions:JSON.parse(await read("src/content/solutions.json"))
});
const compiled=await bundleJavaScript({
 entryPoints:[resolve(root,"src/app/bootstrap.ts")],bundle:true,write:false,
 platform:"browser",format:"iife",target:"es2022",logLevel:"silent",minify:true,legalComments:"none"
});
const runtime=compiled.outputFiles[0].text;
new Script(runtime);
// CSP: the only executable script is this exact compiler output, not any
// later injected script. A new build regenerates its hash deterministically.
// Keep the original self-contained file:// distribution and local data/fonts.
const inlineScript="\n"+runtime.trimEnd()+"\n";
const scriptHash=createHash("sha256").update(inlineScript,"utf8").digest("base64");
const csp=[
  "default-src 'none'",
  "script-src 'sha256-"+scriptHash+"'",
  "script-src-attr 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "connect-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src 'none'"
].join("; ");
payloads.CSP='<meta http-equiv="Content-Security-Policy" content="'+csp+'">';
payloads.APPLICATION="<script>"+inlineScript+"</script>";
let html=await read("src/template.html");
for(const [name,body] of Object.entries(payloads)){
 const marker="<!-- PD:"+name+" -->";
 if(html.split(marker).length!==2)throw new Error("Expected one "+marker);
 //  html=html.replace(marker,body);, $1 etc. inside bundled vendor JS must remain exact source bytes.
 html=html.replace(marker,()=>body);
}
if(/<!-- PD:[A-Z_]+ -->/.test(html))throw new Error("Unreplaced marker");
await writeFile(resolve(root,"Practice_Desk_Offline_Mock_Tests.html"),html);
console.log("Built "+Buffer.byteLength(html)+" bytes (single offline HTML). "+
  "KaTeX: "+katexStyles.woff2Files.length+" WOFF2 families, "+
  katexStyles.woff2Bytes+" font bytes inlined as "+
  katexStyles.inlinedBase64Bytes+" base64 data-URI characters.");
