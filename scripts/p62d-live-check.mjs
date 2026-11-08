#!/usr/bin/env node
/** P62-D: temporary source probe; exact real-PDF claims require observed data. */
import {stat,writeFile} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {join} from "node:path";
const dir=process.argv[2];if(!dir)throw Error("Pass source download directory");
const files=["cat-2024-quant.pdf","apfc-2023-reproduction.pdf"];
const items=[];
for(const filename of files){
 const path=join(dir,filename),size=(await stat(path)).size;
 const pdfInfo=execFileSync("pdfinfo",[path],{encoding:"utf8"});
 const pages=Number((pdfInfo.match(/^Pages:\s*(\d+)/m)||[])[1]);
 const text=execFileSync("pdftotext",["-layout",path,"-"],{encoding:"utf8",maxBuffer:6*1024*1024});
 const {readFile}=await import("node:fs/promises");
 const bytes=await readFile(path);
 const sha=createHash("sha256").update(bytes).digest("hex");
 const markers=filename.startsWith("cat")?
   ["Quantitative Ability","540","32768","Consider two sets"]:
   ["Her poetry","parochial","ineffable"];
 const matches=Object.fromEntries(markers.map(x=>[x,text.toLowerCase().includes(x.toLowerCase())]));
 items.push({filename,bytes:size,sha256:sha,pages,textChars:text.length,markers:matches});
}
const result={phase:"pdf-probe",files:items,verified:Boolean(items.every(x=>Object.values(x.markers).every(Boolean)))};
await writeFile(join(dir,"report.json"),JSON.stringify(result,null,2)+"\n");
console.log("P62-D SOURCE PROBE "+JSON.stringify(result));
if(!result.verified)process.exitCode=1;
