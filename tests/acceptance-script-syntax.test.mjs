/** Fast in-process syntax preflight for QA/build scripts.
 * Behavioral acceptance remains in real browsers; this catches parse errors first.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {transform} from "esbuild";

const scripts=fileURLToPath(new URL("../scripts/",import.meta.url));
async function modules(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())out.push(...await modules(path));
  else if(entry.isFile()&&entry.name.endsWith(".mjs"))out.push(path);
 }
 return out;
}
test("all current browser and agent scripts parse in-process under the locked toolchain",async()=>{
 const paths=await modules(scripts);
 assert.ok(paths.some(x=>x.endsWith("acceptance/registry.mjs")));
 assert.ok(paths.some(x=>x.endsWith("acceptance/scenarios/storage.mjs")));
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
