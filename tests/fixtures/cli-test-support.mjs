/** Shared test-only process and filesystem boundary helpers.
 * Only real CLI tests use these: do not replace pure reference oracles with a
 * self-confirming production helper. Every spawn remains a separate process.
 */
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";

export function runJsonCli(program,args,{timeout=30000,maxBuffer=2*1024*1024,cwd}={}){
 const result=spawnSync(process.execPath,[program,...args],{
  encoding:"utf8",timeout,maxBuffer,...(cwd?{cwd}:{})
 });
 assert.equal(result.error,undefined,String(result.error));
 let data;
 try{data=JSON.parse(result.stdout||result.stderr);}
 catch{assert.fail("CLI must produce machine-readable JSON; stdout="+result.stdout+" stderr="+result.stderr);}
 return {...result,data};
}

export async function inTempDir(prefix,run){
 const dir=await mkdtemp(join(tmpdir(),prefix));
 try{return await run(dir);}
 finally{await rm(dir,{recursive:true,force:true});}
}
