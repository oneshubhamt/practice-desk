import test from "node:test";
import assert from "node:assert/strict";
import {resolveExamShortcut,EXAM_SHORTCUT_HELP} from "../src/app/exam-shortcuts.ts";
const c={key:"a",alt:false,repeat:false,paused:false,focusedRadio:false,
 editable:false,blocked:false,allowFlagging:true};
const decide=p=>resolveExamShortcut({...c,...p});
test("P47-4 keyboard table: answer, native radio arrows, Alt navigate, flag and fullscreen",()=>{
 assert.deepEqual(decide({key:"a"}),{kind:"answer",index:0});
 assert.deepEqual(decide({key:"D"}),{kind:"answer",index:3});
 assert.deepEqual(decide({key:"ArrowLeft"}),{kind:"navigate",delta:-1});
 assert.deepEqual(decide({key:"ArrowRight"}),{kind:"navigate",delta:1});
 assert.equal(decide({key:"ArrowRight",focusedRadio:true}),null);
 assert.deepEqual(decide({key:"ArrowRight",focusedRadio:true,alt:true}),{kind:"navigate",delta:1});
 assert.deepEqual(decide({key:"m"}),{kind:"flag"});
 assert.deepEqual(decide({key:"f"}),{kind:"fullscreen"});
 assert.match(EXAM_SHORTCUT_HELP,/radio/);
});
test("P47-4 blocks shortcuts during editing, modal or Display, and Alt/repeated key actions",()=>{
 for(const key of ["a","m","f","ArrowLeft","ArrowRight"]){
  assert.equal(decide({key,editable:true}),null);
  assert.equal(decide({key,blocked:true}),null);
 }
 for(const key of ["a","m","f"]){assert.equal(decide({key,alt:true}),null);
  assert.equal(decide({key,repeat:true}),null);}
 assert.equal(decide({key:"m",allowFlagging:false}),null);
});
test("P47-4 paused state allows only a single flag command",()=>{
 assert.deepEqual(decide({key:"m",paused:true}),{kind:"flag"});
 for(const key of ["a","f","ArrowLeft","ArrowRight"])
  assert.equal(decide({key,paused:true}),null);
 assert.equal(decide({key:"m",paused:true,repeat:true}),null);
 assert.equal(decide({key:"m",paused:true,allowFlagging:false}),null);
});
