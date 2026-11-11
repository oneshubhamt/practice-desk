import test from "node:test";
import assert from "node:assert/strict";
import {BASIC_CALCULATOR_V1,calculatorPress,newExamCalculatorState} from "../src/domain/calculator.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {calculatorPanelHTML} from "../src/app/exam-calculator.ts";
import {candidateToolStorageKey,clearCandidateToolWorkspace,readCalculatorWorkspace,
 writeCalculatorWorkspace} from "../src/app/candidate-tool-state.ts";
import {importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {composePracticeSet} from "../src/app/practice-compose.ts";
import {pkg} from "./fixtures/six-kinds.mjs";

const press=(keys,state=newExamCalculatorState())=>keys.reduce((s,key)=>calculatorPress(s,key),state);

test("basic-v1 calculator semantics are deterministic and versioned",()=>{
 assert.equal(BASIC_CALCULATOR_V1,"basic-v1");
 assert.equal(press(["8","*","7","equals"]).display,"56");
 assert.equal(press(["2","+","3","*","4","equals"]).display,"20",
   "binary operators execute immediately left-to-right");
 const once=press(["2","+","3","equals"]);
 assert.equal(calculatorPress(once,"equals").display,"5","repeated equals is deliberately a no-op");
 assert.equal(press(["2","5","percent"]).display,"0.25","percent is unary x/100");
 assert.equal(press(["1","/","3","equals"]).display,"0.333333333333");
 assert.equal(press(["1","2","3","4","5","6","7","8","9","0","1","2","3","4","5","6"]).display,
   "123456789012345","input is capped at 15 digits");
 assert.equal(press(["2","+","*","3","equals"]).display,"6",
   "an operator entered before a new operand replaces the pending operator");
});

test("basic-v1 unary, memory, clear and safe-error semantics remain finite",()=>{
 assert.equal(press(["9","sqrt"]).display,"3");
 assert.equal(press(["4","reciprocal"]).display,"0.25");
 assert.equal(press(["5","sign"]).display,"-5");
 let state=press(["1","2","ms"]);
 state={...state,open:true};
 state=calculatorPress(state,"clear");
 assert.equal(state.display,"0");
 assert.equal(state.memory,12,"C preserves memory");
 assert.equal(state.open,true,"C preserves panel-open state");
 state=press(["3","mplus","clear","mr"],state);
 assert.equal(state.display,"15");
 assert.equal(press(["8","/","0","equals"]).display,"Error");
 assert.equal(press(["9","sign","sqrt"]).display,"Error");
 assert.equal(press(["0","reciprocal"]).display,"Error");
 assert.equal(press(["8","/","0","equals","4"]).display,"4",
   "digit after error starts a new calculation");
 const overflow=calculatorPress({...newExamCalculatorState(),display:String(Number.MAX_VALUE),
   memory:Number.MAX_VALUE},"mplus");
 assert.equal(overflow.display,"Error");
 assert.equal(overflow.memory,Number.MAX_VALUE,"memory overflow does not corrupt the stored register");
});

test("calculator availability is explicit versioned hash-bound paper policy and frozen into attempts",()=>{
 const base=structuredClone(pkg.paper);
 const enabledBase={...base,candidateTools:{calculator:BASIC_CALCULATOR_V1}};
 const enabled={...pkg,paper:{...enabledBase,contentHash:paperRevisionHash(enabledBase)}};
 assert.notEqual(enabled.paper.contentHash,pkg.paper.contentHash);
 const bundle=validateExamPackage(enabled);
 const attempt=startGenericAttempt(bundle,"calc-policy",1000);
 assert.equal(attempt.frozen.paper.candidateTools.calculator,BASIC_CALCULATOR_V1);
 const html=renderModelExam(attempt,bundle,"",undefined,{focused:false},{...newExamCalculatorState(),open:true});
 assert.match(html,/id="g-calculator"/);
 assert.match(html,/id="g-calculator-panel"/);
 assert.doesNotMatch(renderModelExam(startGenericAttempt(validateExamPackage(pkg),"plain",1000),pkg),/id="g-calculator"/);
 for(const invalidProfile of ["basic","scientific"]){
   const invalid=structuredClone(enabled);
   invalid.paper.candidateTools.calculator=invalidProfile;
   assert.throws(()=>validateExamPackage(invalid),/candidateTools\.calculator/);
 }
});

test("simple-bank authors opt into basic-v1; custom composition preserves the exact profile",()=>{
 const bank={format:"practice-desk-bank",version:1,bankId:"cat-calc",examId:"cat",
  title:"CAT calculator",revision:1,edition:"custom",
  scoring:{correctMarks:3,incorrectMarks:-1,unansweredMarks:0},
  timing:{kind:"whole-paper",minutes:40},tools:{calculator:BASIC_CALCULATOR_V1},
  questions:[{id:"q1",section:"QA",type:"mcq",question:"2 + 2 = ?",
    options:["3","4","5","6"],answer:"B"}]};
 const enabled=importSimpleQuestionBank(bank);
 assert.equal(enabled.paper.candidateTools.calculator,BASIC_CALCULATOR_V1);
 assert.equal(validateExamPackage(enabled),enabled);
 const composed=composePracticeSet(enabled,{count:1,seed:"calculator-policy",filters:{}});
 assert.equal(composed.bundle.paper.candidateTools.calculator,BASIC_CALCULATOR_V1,
   "custom practice sets must preserve the source paper calculator profile");
 const plain=importSimpleQuestionBank({...bank,bankId:"cat-no-calc",tools:undefined});
 assert.equal(plain.paper.candidateTools,undefined);
 for(const invalidProfile of ["basic","scientific"])
   assert.throws(()=>importSimpleQuestionBank({...bank,bankId:"bad-"+invalidProfile,
     tools:{calculator:invalidProfile}}),/tools\.calculator/);
});

test("calculator scratch state recovers separately from attempts and fails closed on tampering",()=>{
 const values=new Map();
 const storage={
   getItem:key=>values.get(key)??null,
   setItem:(key,value)=>{values.set(key,value);},
   removeItem:key=>{values.delete(key);}
 };
 const attemptId="attempt:recover-calc";
 const pending=press(["4","+","6"],{...newExamCalculatorState(),open:true});
 assert.equal(writeCalculatorWorkspace(storage,attemptId,BASIC_CALCULATOR_V1,pending),true);
 const recovered=readCalculatorWorkspace(storage,attemptId,BASIC_CALCULATOR_V1);
 assert.deepEqual(recovered,pending);
 assert.equal(calculatorPress(recovered,"equals").display,"10",
   "pending operation survives workspace recovery");
 assert.equal(readCalculatorWorkspace(storage,attemptId,"basic-v2").display,"0",
   "a different future profile cannot reinterpret basic-v1 scratch state");

 const key=candidateToolStorageKey(attemptId);
 const corrupt=JSON.parse(values.get(key));
 corrupt.calculator.state.memory=null;
 values.set(key,JSON.stringify(corrupt));
 assert.deepEqual(readCalculatorWorkspace(storage,attemptId,BASIC_CALCULATOR_V1),newExamCalculatorState(),
   "invalid scratch state resets safely without entering scored attempt data");

 const attempt=startGenericAttempt(validateExamPackage(pkg),"separate-attempt",1000);
 assert.equal("calculatorState" in attempt,false);
 assert.equal("candidateToolWorkspace" in attempt,false);
 clearCandidateToolWorkspace(storage,attemptId);
 assert.equal(values.has(key),false);
});

test("calculator markup exposes keyboard/focus and labelled control semantics",()=>{
 const html=calculatorPanelHTML({...newExamCalculatorState(),open:true});
 assert.match(html,/role="dialog"/);
 assert.match(html,/id="g-calculator-display"[^>]*tabindex="0"[^>]*aria-label="Calculator display"/);
 assert.match(html,/role="group" aria-label="Calculator memory"/);
 assert.match(html,/role="group" aria-label="Calculator keypad"/);
 assert.match(html,/data-calc-key="\/"[^>]*aria-label="Divide"/);
 assert.match(html,/data-calc-key="backspace"[^>]*calc-backspace/);
 assert.match(html,/data-calc-key="0"[^>]*calc-zero/);
 assert.match(html,/data-calc-key="equals"[^>]*calc-equals[^>]*aria-label="Equals"/);
 assert.ok(html.indexOf('data-calc-key="percent"')<html.indexOf('data-calc-key="4"'),
   "CAT geometry keeps percent at the right of the 7/8/9/divide row");
 assert.ok(html.indexOf('data-calc-key="reciprocal"')<html.indexOf('data-calc-key="1"'),
   "CAT geometry keeps reciprocal at the right of the 4/5/6/multiply row");
});
