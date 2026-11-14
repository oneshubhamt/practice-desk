/** Fast in-process syntax preflight for standalone QA/build scripts.
 * Behavioral acceptance remains in real browsers; this catches parse errors before that cost.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {transform} from "esbuild";

const scripts=fileURLToPath(new URL("../scripts/",import.meta.url));
test("all current browser and agent scripts parse in-process under the locked toolchain",async()=>{
 const paths=[
  ...(await readdir(scripts)).filter(name=>name.endsWith(".mjs")).map(name=>join(scripts,name)),
  ...(await readdir(join(scripts,"browser"))).filter(name=>name.endsWith(".mjs"))
    .map(name=>join(scripts,"browser",name))
 ];
 assert.ok(paths.some(x=>x.endsWith("acceptance-resilience.mjs")));
 assert.ok(paths.some(x=>x.endsWith("question-bank-agent.mjs")));
 const failures=[];
 for(const file of paths){
  try{
   await transform(await readFile(file,"utf8"),{
    loader:"js",format:"esm",target:"node26",sourcefile:file,logLevel:"silent"
   });
  }catch(error){failures.push(file+": "+String(error));}
 }
 assert.deepEqual(failures,[]);
});
