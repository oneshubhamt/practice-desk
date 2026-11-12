import test from "node:test";
import assert from "node:assert/strict";
import {pkg} from "./fixtures/six-kinds.mjs";
import {startGenericAttempt} from "../src/app/exam-package.ts";
import {transitionGenericAttempt} from "../src/engine/generic-attempt.ts";
import {saveWorkspaceRecord} from "../src/app/persistence-controller.ts";
import {BASIC_CALCULATOR_V1,newExamCalculatorState} from "../src/domain/calculator.ts";
import {candidateToolStorageKey,writeCalculatorWorkspace} from "../src/app/candidate-tool-state.ts";

class MemoryStorage{
 #rows=new Map();
 get length(){return this.#rows.size;}
 key(i){return [...this.#rows.keys()][i]??null;}
 getItem(k){return this.#rows.get(k)??null;}
 setItem(k,v){this.#rows.set(String(k),String(v));}
 removeItem(k){this.#rows.delete(k);}
 clear(){this.#rows.clear();}
}

test("terminal persistence clears all candidate-only scratch regardless of completion path",async()=>{
 const storage=new MemoryStorage();
 const prior=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
 Object.defineProperty(globalThis,"localStorage",{value:storage,configurable:true});
 try{
  const pending={...startGenericAttempt(pkg,"terminal-cleanup",1000),saveRevision:1};
  const questions=new Map(pending.frozen.questions.map(q=>[q.id,q]));
  const completed=transitionGenericAttempt(pending,{type:"SUBMIT_ATTEMPT",nowMs:1100},questions);
  const qid=completed.frozen.questions[0].id;
  writeCalculatorWorkspace(storage,completed.id,BASIC_CALCULATOR_V1,newExamCalculatorState());
  const calculatorStates=new Map([[completed.id,newExamCalculatorState()]]);
  const choiceDrafts=new Map([[completed.id+"|"+qid,{questionId:qid,optionIds:[],message:"draft"}]]);
  let mirrorWrites=0;
  const owner={
   fallbackConflict:false,storageFault:false,warning:"",draw(){},disposed:false,
   records:new Map([[pending.id,pending]]),attempt:completed,calculatorStates,choiceDrafts,
   pendingWrites:0,updateStorageHealth(){},writeQueue:Promise.resolve(),
   storageBackend:{kind:"indexeddb",write:async()=>{}},
   writeMirror(){mirrorWrites++;},lastCommittedAt:null,
   recordStorageFailure(error){throw error;},go(){throw new Error("unexpected route change");}
  };
  assert.notEqual(storage.getItem(candidateToolStorageKey(completed.id)),null);
  assert.equal(await saveWorkspaceRecord(owner,completed),true);
  assert.equal(calculatorStates.has(completed.id),false);
  assert.equal([...choiceDrafts.keys()].some(key=>key.startsWith(completed.id+"|")),false);
  assert.equal(storage.getItem(candidateToolStorageKey(completed.id)),null);
  assert.equal(mirrorWrites,1,"terminal attempt mirror remains available for persistence recovery");
 }finally{
  if(prior)Object.defineProperty(globalThis,"localStorage",prior);
  else delete globalThis.localStorage;
 }
});
