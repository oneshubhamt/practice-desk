import {mkdir,readFile,writeFile} from "node:fs/promises";
import {dirname,resolve} from "node:path";
import {Script} from "node:vm";
import {createHash} from "node:crypto";
import {build as bundleJavaScript,transform as minifySource} from "esbuild";
import {preparedKaTeXStyles} from "./prepare-katex-css.mjs";
import {validateContent} from "../src/content/validate.ts";
import {
 practiceDeskBuildTarget,practiceDeskCsp,practiceDeskHeadAdditions
} from "./build-target-config.mjs";

const root=resolve(import.meta.dirname,"..");
const read=file=>readFile(resolve(root,file),"utf8");

export async function buildPracticeDeskHtml(targetId){
 const target=practiceDeskBuildTarget(targetId);
 const katexStyles=await preparedKaTeXStyles(root);
 const nativeCss=(await minifySource(await read("src/styles/app.css"),{
  loader:"css",minify:true,logLevel:"silent"
 })).code;
 const katexLicense=await read("node_modules/katex/LICENSE");
 const wordgardLicense=await read("node_modules/wordgard/LICENSE");
 if(katexLicense.includes("*/")||katexLicense.includes("</style")||
    wordgardLicense.includes("*/")||wordgardLicense.includes("</style"))
  throw Error("Unsafe vendor license");

 const papers=await read("src/content/papers.json");
 const patches=await read("src/content/patches.json");
 const solutions=await read("src/content/solutions.json");
 validateContent({
  papers:JSON.parse(papers),patches:JSON.parse(patches),solutions:JSON.parse(solutions)
 });

 const compiled=await bundleJavaScript({
  entryPoints:[resolve(root,"src/app/bootstrap.ts")],bundle:true,write:false,
  platform:"browser",format:"iife",target:"es2022",logLevel:"silent",
  minify:true,legalComments:"none"
 });
 const runtime=compiled.outputFiles[0].text;
 new Script(runtime);
 const inlineScript="\n"+runtime.trimEnd()+"\n";
 const scriptHash=createHash("sha256").update(inlineScript,"utf8").digest("base64");
 const csp=practiceDeskCsp(target,scriptHash);
 const payloads={
  CSS:"<style>/* KaTeX 0.19.1 LICENSE\n"+katexLicense+"\n*/\n"+
    "/* Wordgard 0.6.2 LICENSE\n"+wordgardLicense+"\n*/\n"+
    nativeCss+"\n"+katexStyles.css+"</style>",
  PAPER_BANK:'<script id="paper-bank" type="application/json">'+papers.trim()+"</script>",
  REVIEW_PATCHES:'<script id="review-patches" type="application/json">'+patches.trim()+"</script>",
  SOLUTION_BANK:'<script id="solution-bank" type="application/json">'+solutions.trim()+"</script>",
  CSP:'<meta http-equiv="Content-Security-Policy" content="'+csp+'">',
  APPLICATION:"<script>"+inlineScript+"</script>"
 };

 let html=await read("src/template.html");
 for(const [name,body] of Object.entries(payloads)){
  const marker="<!-- PD:"+name+" -->";
  if(html.split(marker).length!==2)throw Error("Expected one "+marker);
  html=html.replace(marker,()=>body);
 }
 if(/<!-- PD:[A-Z_]+ -->/.test(html))throw Error("Unreplaced marker");
 const headAdditions=practiceDeskHeadAdditions(target);
 if(headAdditions){
  if(!html.includes("</head>"))throw Error("Template has no closing head");
  html=html.replace("</head>",headAdditions+"</head>");
 }
 return {
  target,html,
  stats:{
   bytes:Buffer.byteLength(html),
   katexFamilies:katexStyles.woff2Files.length,
   katexFontBytes:katexStyles.woff2Bytes,
   katexBase64Characters:katexStyles.inlinedBase64Bytes,
   scriptHash
  }
 };
}

export async function writePracticeDeskTarget(targetId){
 const result=await buildPracticeDeskHtml(targetId);
 const output=resolve(root,result.target.output);
 await mkdir(dirname(output),{recursive:true});
 await writeFile(output,result.html);
 return {...result,output};
}
