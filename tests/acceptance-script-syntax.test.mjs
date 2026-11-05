/** Static preflight: catch browser-acceptance .mjs syntax errors in fast Node
 * CI BEFORE slow real Playwright browser/dependency installation jobs start.
 * This only checks parse validity; behavioral acceptance stays in all engines.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
const scripts=fileURLToPath(new URL("../scripts/",import.meta.url));
test("all current browser/agent standalone scripts parse under the locked Node runtime",()=>{
 const paths=[
  ...readdirSync(scripts).filter(name=>name.endsWith(".mjs")).map(name=>join(scripts,name)),
  ...readdirSync(join(scripts,"browser")).filter(name=>name.endsWith(".mjs"))
   .map(name=>join(scripts,"browser",name))
 ];
 assert.ok(paths.some(x=>x.endsWith("acceptance-resilience.mjs")));
 assert.ok(paths.some(x=>x.endsWith("question-bank-agent.mjs")));
 for(const file of paths){
  const r=spawnSync(process.execPath,["--check",file],{
   encoding:"utf8",timeout:10000,maxBuffer:100000
  });
  assert.equal(r.error,undefined,file+": "+String(r.error));
  assert.equal(r.status,0,file+": "+r.stderr);
 }
});
