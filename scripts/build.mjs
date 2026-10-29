import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Script } from "node:vm";
import { build as bundleJavaScript } from "esbuild";
import { validateContent } from "../src/content/validate.ts";
const root=resolve(import.meta.dirname,"..");
const read=file=>readFile(resolve(root,file),"utf8");
const payloads={
 CSS:"<style>\n"+await read("src/styles/app.css")+"</style>",
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
 platform:"browser",format:"iife",target:"es2022",logLevel:"silent"
});
const runtime=compiled.outputFiles[0].text;
new Script(runtime);
payloads.APPLICATION="<script>\n"+runtime.trimEnd()+"\n</script>";
let html=await read("src/template.html");
for(const [name,body] of Object.entries(payloads)){
 const marker="<!-- PD:"+name+" -->";
 if(html.split(marker).length!==2)throw new Error("Expected one "+marker);
 html=html.replace(marker,body);
}
if(/<!-- PD:[A-Z_]+ -->/.test(html))throw new Error("Unreplaced marker");
await writeFile(resolve(root,"Practice_Desk_Offline_Mock_Tests.html"),html);
console.log("Built "+Buffer.byteLength(html)+" bytes (single offline HTML).");
