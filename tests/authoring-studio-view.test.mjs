import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const source=path=>readFile(new URL("../"+path,import.meta.url),"utf8");

test("authoring studio delegates pure field/view generation without creating a second controller",async()=>{
 const studio=await source("src/authoring/authoring-studio.ts");
 const view=await source("src/authoring/authoring-studio-view.ts");
 assert.match(studio,/from "\.\/authoring-studio-view\.ts"/);
 assert.ok(studio.split("\n").length<1000,"Studio should remain state/event orchestration, not a view monolith");
 const executable=view.replace(/^import .*$/gm,"");
 assert.doesNotMatch(executable,/\b(?:document|window|localStorage|indexedDB)\s*\./);
 assert.doesNotMatch(view,/authoring-workspace-store|authoring-workflow|wordgard-adapter/);
 for(const helper of ["controls","evidenceEditor","stagedDetail","toolbar","preview","sectionManager"])
  assert.doesNotMatch(studio,new RegExp("function "+helper+"\\("),helper+" belongs in the pure view module");
});
