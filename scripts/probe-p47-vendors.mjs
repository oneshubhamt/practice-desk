/** P47-5A: isolated minified vendor footprint experiment, NOT production inclusion.
 * Usage: node scripts/probe-p47-vendors.mjs /absolute/node_modules
 */
import {build} from "esbuild";
import {readFile,readdir,stat,mkdir,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
import {gzipSync} from "node:zlib";
import assert from "node:assert/strict";
if(!process.argv[2])throw Error("Provide isolated vendor node_modules");
const modules=resolve(process.argv[2]);
const manifest=async name=>{
 const x=JSON.parse(await readFile(join(modules,name,"package.json"),"utf8"));
 return {name:x.name,version:x.version,license:x.license};
};
const katex=await manifest("katex"),wordgard=await manifest("wordgard");
assert.equal(katex.version,"0.19.1");
assert.equal(wordgard.version,"0.6.2");
const entry={
 math:[
  'import katex from "katex";',
  'export function render(tex,displayMode){return katex.renderToString(tex,',
  '{displayMode,output:"htmlAndMathml",trust:false,strict:"error",',
  'throwOnError:true,maxExpand:100,maxSize:10});}'
 ].join("\n"),
 "editor-minimal":[
  'import {Wordgard} from "wordgard/editor";',
  'import {blockDoc,paragraph,strong,emphasis} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'export function mount(host){return Wordgard.create({parent:host,doc:"<p>Text</p>",',
  'config:[blockDoc(),paragraph(),strong(),emphasis(),history()]});}'
 ].join("\n"),
 "editor-target":[
  'import {Wordgard,menuBar} from "wordgard/editor";',
  'import {blockDoc,paragraph,heading,bulletList,orderedList,strong,emphasis,underline,subscript,superscript} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'import {tables} from "wordgard/table";',
  'export function mount(host){return Wordgard.create({parent:host,doc:"<p>Text</p>",',
  'config:[blockDoc(),paragraph(),heading(),bulletList(),orderedList(),',
  'strong(),emphasis(),underline(),subscript(),superscript(),history(),tables(),menuBar()]});}'
 ].join("\n"),
 "editor-target-no-menu":[
  'import {Wordgard} from "wordgard/editor";',
  'import {blockDoc,paragraph,heading,bulletList,orderedList,strong,emphasis,underline,subscript,superscript} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'import {tables} from "wordgard/table";',
  'export function mount(host){return Wordgard.create({parent:host,doc:"<p>Text</p>",',
  'config:[blockDoc(),paragraph(),heading(),bulletList(),orderedList(),',
  'strong(),emphasis(),underline(),subscript(),superscript(),history(),tables()]});}'
 ].join("\n"),
 "editor-target-no-tables":[
  'import {Wordgard,menuBar} from "wordgard/editor";',
  'import {blockDoc,paragraph,heading,bulletList,orderedList,strong,emphasis,underline,subscript,superscript} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'export function mount(host){return Wordgard.create({parent:host,doc:"<p>Text</p>",',
  'config:[blockDoc(),paragraph(),heading(),bulletList(),orderedList(),',
  'strong(),emphasis(),underline(),subscript(),superscript(),history(),menuBar()]});}'
 ].join("\n"),
 "editor-full-schema":[
  'import {Wordgard,menuBar} from "wordgard/editor";',
  'import {fullSchema} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'import {tables} from "wordgard/table";',
  'export function mount(host){return Wordgard.create({parent:host,doc:"<p>Text</p>",',
  'config:[fullSchema(),history(),tables(),menuBar()]});}'
 ].join("\n")
};
const payloads={};
for(const [name,code] of Object.entries(entry)){
 const result=await build({
  stdin:{contents:code,resolveDir:process.cwd(),sourcefile:name+".ts",loader:"ts"},
  nodePaths:[modules],bundle:true,minify:true,treeShaking:true,
  platform:"browser",format:"iife",globalName:"P47VendorProbe",
  target:["es2022"],write:false,logLevel:"silent",metafile:true,legalComments:"none"
 });
 const js=result.outputFiles[0]; // esbuild stdin/write:false uses the <stdout> path
 if(!js||!js.contents.length)throw Error("Missing vendor bundle: "+name);
 payloads[name]={rawBytes:js.contents.length,gzipBytes:gzipSync(js.contents).length,
  moduleCount:Object.keys(result.metafile.inputs).length};
}
// Disposable fixture for true file:// browser verification, never deployed.
const browserEntry=[
  'import katex from "katex";',
  'import {Wordgard} from "wordgard/editor";',
  'import {blockDoc,paragraph,heading,strong,emphasis,underline,subscript,superscript,bulletList,orderedList} from "wordgard/schema";',
  'import {history} from "wordgard/history";',
  'import {tables} from "wordgard/table";',
  'window.P47BrowserProbe={',
  ' mount(host){return Wordgard.create({parent:host,doc:"<p>Start text</p><table><tr><td>A</td><td>B</td></tr></table>",',
  '  config:[blockDoc(),paragraph(),heading(),strong(),emphasis(),underline(),subscript(),superscript(),bulletList(),orderedList(),history(),tables()]});},',
  ' math(tex){return katex.renderToString(tex,{output:"htmlAndMathml",trust:false,strict:"error",throwOnError:true,maxExpand:100,maxSize:10});}',
  '};',
].join("\n");
const fixtureBuild=await build({
 stdin:{contents:browserEntry,resolveDir:process.cwd(),sourcefile:"vendor-browser-fixture.ts",loader:"ts"},
 nodePaths:[modules],bundle:true,minify:true,treeShaking:true,platform:"browser",format:"iife",
 target:["es2022"],write:false,logLevel:"silent",legalComments:"none"});
const fixtureJS=fixtureBuild.outputFiles[0]?.text;
if(!fixtureJS)throw Error("Missing browser fixture output");
const fixtureDir=resolve("artifacts/p47-5a");await mkdir(fixtureDir,{recursive:true});
const fixtureHTML=["<!doctype html><html><head><meta charset=\"utf-8\"><title>P47-5A disposable fixture</title></head>",
 "<body><button id=\"launch\">Start authoring</button><button id=\"close\">Close editor</button>",
 "<section id=\"editor\"></section><section id=\"math\"></section><script>",
 fixtureJS,
 "document.getElementById(\"launch\").onclick=()=>{window.p47Editor=P47BrowserProbe.mount(document.getElementById(\"editor\"));};",
 "document.getElementById(\"close\").onclick=()=>{window.p47Editor?.dom.remove();document.getElementById(\"launch\").focus();};",
 "document.getElementById(\"math\").innerHTML=P47BrowserProbe.math(\\"\\\\frac{a}{b}\\",false);",
 "</script></body></html>"].join("\n");
await writeFile(join(fixtureDir,"vendor-fixture.html"),fixtureHTML);
const fontsDir=join(modules,"katex/dist/fonts");
const files=await readdir(fontsDir),fonts={};
for(const ext of ["woff2","woff","ttf"]){
 const relevant=files.filter(f=>f.endsWith("."+ext));let bytes=0;
 for(const f of relevant)bytes+=(await stat(join(fontsDir,f))).size;
 fonts[ext]={count:relevant.length,bytes};
}
const css=await readFile(join(modules,"katex/dist/katex.min.css"));
const baseline=(await stat("Practice_Desk_Offline_Mock_Tests.html")).size;
const report={stage:"P47-5A isolated feasibility, no app vendor imports",
 versions:{katex,wordgard},
 baselineOfflineHTMLBytes:baseline,minifiedTreeShakenJS:payloads,
 fontInventory:fonts,katexRawCssBytes:css.length,
 buildPolicy:"Pristine full source in development; selectively import and tree-shake only needed features, minify code and CSS, inline verified WOFF2-only fonts after glyph tests, one file:// HTML",
 limitation:"Does not prove editable Wordgard widgets, tree-shaken font correctness or browser editing; transitive probe dependencies not yet production-locked"};
console.log(JSON.stringify(report));
if(payloads["editor-target"].rawBytes>=payloads["editor-full-schema"].rawBytes)
 console.error("WARNING: Current selected editor is not smaller than broad fullSchema; revisit extension list.");
