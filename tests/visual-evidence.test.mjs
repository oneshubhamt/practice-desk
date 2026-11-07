/** Evidence-mode gate is a test-only side effect, never a correctness oracle.
 * Absence of explicit human-visual-review opt-in must not create screenshots.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,rm,stat,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {visualReviewEnabled,captureVisualEvidence} from "../scripts/browser/visual-evidence.mjs";

test("Visual evidence opt-in is an explicit exact-string gate",()=>{
 assert.equal(visualReviewEnabled({}),false);
 for(const value of ["", "0", "true", "yes", "01", "on"])
  assert.equal(visualReviewEnabled({PRACTICE_DESK_VISUAL_REVIEW:value}),false);
 assert.equal(visualReviewEnabled({PRACTICE_DESK_VISUAL_REVIEW:"1"}),true);
});
test("Visual evidence: default passing tests never capture; explicit opt-in captures actual requested image",async()=>{
 const old=process.env.PRACTICE_DESK_VISUAL_REVIEW;
 const root=await mkdtemp(join(tmpdir(),"pd-visual-contract-"));
 const path=join(root,"images","explicit.png");
 let captures=0;
 const page={async screenshot(options){
  captures++;
  assert.equal(options.path,path);
  assert.equal(options.animations,"disabled");
  assert.equal(options.fullPage,true);
  await writeFile(path,"captured");
 }};
 try{
  delete process.env.PRACTICE_DESK_VISUAL_REVIEW;
  assert.equal(await captureVisualEvidence(page,path,{fullPage:true}),false);
  assert.equal(captures,0,"ordinary CI should never request screenshot");
  await assert.rejects(()=>stat(path),{code:"ENOENT"});
  process.env.PRACTICE_DESK_VISUAL_REVIEW="1";
  assert.equal(await captureVisualEvidence(page,path,{fullPage:true}),true);
  assert.equal(captures,1);
  assert.equal(await readFile(path,"utf8"),"captured");
 }finally{
  if(old===undefined)delete process.env.PRACTICE_DESK_VISUAL_REVIEW;
  else process.env.PRACTICE_DESK_VISUAL_REVIEW=old;
  await rm(root,{recursive:true,force:true});
 }
});
