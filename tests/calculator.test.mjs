import test from "node:test";
import assert from "node:assert/strict";
import {calculatorPress,newExamCalculatorState} from "../src/app/exam-calculator.ts";
import {paperRevisionHash} from "../src/domain/integrity.ts";
import {validateExamPackage,startGenericAttempt} from "../src/app/exam-package.ts";
import {renderModelExam} from "../src/app/exam-view.ts";
import {importSimpleQuestionBank} from "../src/app/bank-import.ts";
import {composePracticeSet} from "../src/app/practice-compose.ts";
import {pkg} from "./fixtures/six-kinds.mjs";

const press=(keys,state=newExamCalculatorState())=>keys.reduce((s,key)=>calculatorPress(s,key),state);

test("basic calculator handles arithmetic, unary, memory and safe errors without eval",()=>{
 assert.equal(press(["8","*","7","equals"]).display,"56");
 assert.equal(press(["9","sqrt"]).display,"3");
 assert.equal(press(["2","5","percent"]).display,"0.25");
 assert.equal(press(["4","reciprocal"]).display,"0.25");
 assert.equal(press(["5","sign"]).display,"-5");
 let state=press(["1","2","ms","clear","mr"]);
 assert.equal(state.display,"12");
 state=press(["3","mplus","clear","mr"],state);
 assert.equal(state.display,"15");
 assert.equal(press(["8","/","0","equals"]).display,"Error");
 assert.equal(press(["9","sign","sqrt"]).display,"Error");
 assert.equal(press(["8","/","0","equals","4"]).display,"4","digit after error starts a new calculation");
});

test("calculator availability is explicit hash-bound paper policy and frozen into attempts",()=>{
 const base=structuredClone(pkg.paper);
 const enabledBase={...base,candidateTools:{calculator:"basic"}};
 const enabled={...pkg,paper:{...enabledBase,contentHash:paperRevisionHash(enabledBase)}};
 assert.notEqual(enabled.paper.contentHash,pkg.paper.contentHash);
 const bundle=validateExamPackage(enabled);
 const attempt=startGenericAttempt(bundle,"calc-policy",1000);
 assert.equal(attempt.frozen.paper.candidateTools.calculator,"basic");
 const html=renderModelExam(attempt,bundle,"",undefined,{focused:false},{...newExamCalculatorState(),open:true});
 assert.match(html,/id="g-calculator"/);
 assert.match(html,/id="g-calculator-panel"/);
 assert.doesNotMatch(renderModelExam(startGenericAttempt(validateExamPackage(pkg),"plain",1000),pkg),/id="g-calculator"/);
 const invalid=structuredClone(enabled);
 invalid.paper.candidateTools.calculator="scientific";
 assert.throws(()=>validateExamPackage(invalid),/candidateTools\.calculator/);
});

test("simple-bank authors can opt into basic calculator; absence stays disabled",()=>{
 const bank={format:"practice-desk-bank",version:1,bankId:"cat-calc",examId:"cat",
  title:"CAT calculator",revision:1,edition:"custom",
  scoring:{correctMarks:3,incorrectMarks:-1,unansweredMarks:0},
  timing:{kind:"whole-paper",minutes:40},tools:{calculator:"basic"},
  questions:[{id:"q1",section:"QA",type:"mcq",question:"2 + 2 = ?",
    options:["3","4","5","6"],answer:"B"}]};
 const enabled=importSimpleQuestionBank(bank);
 assert.equal(enabled.paper.candidateTools.calculator,"basic");
 assert.equal(validateExamPackage(enabled),enabled);
 const composed=composePracticeSet(enabled,{count:1,seed:"calculator-policy",filters:{}});
 assert.equal(composed.bundle.paper.candidateTools.calculator,"basic",
   "custom practice sets must preserve the source paper calculator policy");
 const plain=importSimpleQuestionBank({...bank,bankId:"cat-no-calc",tools:undefined});
 assert.equal(plain.paper.candidateTools,undefined);
 assert.throws(()=>importSimpleQuestionBank({...bank,bankId:"bad-calc",tools:{calculator:"scientific"}}),
   /tools\.calculator/);
});
