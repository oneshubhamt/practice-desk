import {readdir} from "node:fs/promises";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
const profile=process.argv[2]??"all";
if(!["fast","deep","all"].includes(profile))
 throw Error("Usage: node scripts/node-suite.mjs fast|deep|all");
const root=fileURLToPath(new URL("../",import.meta.url)),testsDir=join(root,"tests");
const deep=new Set(["agent-benchmark.test.mjs","authoring-scale.test.mjs","result-scale.test.mjs"]);
const files=(await readdir(testsDir)).filter(x=>x.endsWith(".test.mjs")).sort();
const selected=profile==="all"?files:profile==="deep"?files.filter(x=>deep.has(x)):files.filter(x=>!deep.has(x));
if(!selected.length)throw Error("No Node tests selected for "+profile);
console.log("NODE_SUITE "+profile+" "+selected.length+" files"+(profile==="deep"?" ["+selected.join(", ")+"]":""));
const child=spawn(process.execPath,["--test",...selected.map(x=>join("tests",x))],{
 cwd:root,stdio:"inherit",env:{...process.env,PRACTICE_DESK_VISUAL_REVIEW:"0"}
});
const result=await new Promise((resolve,reject)=>{
 child.once("error",reject);child.once("exit",(code,signal)=>resolve({code,signal}));
});
if(result.code!==0||result.signal)process.exitCode=result.code??1;
