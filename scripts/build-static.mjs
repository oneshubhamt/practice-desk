import {access,copyFile,mkdir,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {build} from "esbuild";
import {writePracticeDeskTarget} from "./build-target.mjs";
import {practiceDeskBuildTarget} from "./build-target-config.mjs";

const root=resolve(import.meta.dirname,"..");
const target=practiceDeskBuildTarget("static");
const out=resolve(root,"Practice_Desk_Static");
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
try{
 await access(resolve(root,
  "tools/fsrs-optimizer/node_modules/@open-spaced-repetition/binding-wasm32-wasip1/package.json"));
}catch{
 throw Error("Browser FSRS optimizer dependencies are missing. Run npm install --prefix tools/fsrs-optimizer first.");
}
await build({
 entryPoints:[resolve(root,"tools/fsrs-optimizer/browser-worker.mjs")],
 bundle:true,write:true,outdir:out,platform:"browser",format:"esm",target:"es2022",
 entryNames:"fsrs-optimizer.worker",assetNames:"[name]-[hash]",chunkNames:"[name]-[hash]",
 loader:{".wasm":"file"},conditions:["browser"],legalComments:"eof",minify:true,logLevel:"silent"
});
await copyFile(
 resolve(root,"tools/fsrs-optimizer/node_modules/@open-spaced-repetition/binding-wasm32-wasip1/fsrs-binding.wasm32-wasip1.wasm"),
 resolve(out,"fsrs-binding.wasm32-wasip1.wasm")
);
const result=await writePracticeDeskTarget(target.id);
await writeFile(resolve(out,"README.txt"),
 "Practice Desk static build\n\nServe this directory over localhost or HTTPS. "+
 "The dedicated FSRS optimizer Worker and WASM asset are local files; no optimizer backend is required. "+
 "The standalone file:// HTML remains available separately but does not enable in-app weight training.\n"
);
console.log("Built static Practice Desk with browser FSRS optimizer at "+out+
 " ("+result.stats.bytes+" HTML bytes)");
