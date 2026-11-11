import {access,mkdir,readFile,rm,writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {build} from "esbuild";

const root=resolve(import.meta.dirname,".."),out=resolve(root,"Practice_Desk_Static");
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
try{
 await access(resolve(root,"tools/fsrs-optimizer/node_modules/@open-spaced-repetition/binding-wasm32-wasip1/package.json"));
}catch{
 throw Error("Browser FSRS optimizer dependencies are missing. Run npm install --prefix tools/fsrs-optimizer first.");
}
await build({
 entryPoints:[resolve(root,"tools/fsrs-optimizer/browser-worker.mjs")],
 bundle:true,write:true,outdir:out,platform:"browser",format:"esm",target:"es2022",
 entryNames:"fsrs-optimizer.worker",assetNames:"[name]-[hash]",chunkNames:"[name]-[hash]",
 loader:{".wasm":"file"},conditions:["browser"],legalComments:"eof",minify:true,logLevel:"silent"
});
let html=await readFile(resolve(root,"Practice_Desk_Offline_Mock_Tests.html"),"utf8");
html=html.replace("connect-src 'none'","connect-src 'self'")
 .replace("worker-src 'none'","worker-src 'self'")
 .replace(/script-src ('sha256-[^']+')/, "script-src $1 'wasm-unsafe-eval'");
if(!html.includes("worker-src 'self'")||!html.includes("connect-src 'self'")||!html.includes("'wasm-unsafe-eval'"))
 throw Error("Could not prepare static optimizer CSP");
html=html.replace("</head>",
 '<meta name="practice-desk-browser-optimizer" content="wasm32-wasip1-0.6.1">\n</head>');
await writeFile(resolve(out,"index.html"),html);
await writeFile(resolve(out,"README.txt"),
 "Practice Desk static build\n\nServe this directory over localhost or HTTPS. The dedicated FSRS optimizer Worker and WASM asset are local files; no optimizer backend is required. The standalone file:// HTML remains available separately but does not enable in-app weight training.\n");
console.log("Built static Practice Desk with browser FSRS optimizer at "+out);
