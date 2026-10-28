import test from "node:test";
import assert from "node:assert/strict";
import { renderGenericControls, examTimeRemaining, validateGenericStoredRecord } from "../src/app/generic-ui.ts";
import { readableAnswer } from "../src/app/exam-package.ts";

const stub={format:"practice-desk-exam",version:1,examId:"example",
 title:"Example",paper:{},answerKey:{},questions:[],assets:[]};
const revision=(content)=>({id:"q",questionId:"q",revision:1,contentHash:"0".repeat(64),
 editorial:{status:"verified"},content});
test("six exam question response kinds render editable, escaped controls",()=>{
 const cases=[
  [{kind:"single-choice",prompt:"x",options:[{id:"1",text:"<script>"},{id:"2",text:"Second"}]},"data-choice"],
  [{kind:"multiple-select",prompt:"x",options:[{id:"1",text:"First"},{id:"2",text:"Second"}]},"checkbox"],
  [{kind:"numeric-entry",prompt:"x",numericRules:{minimum:0,maximum:100}},"type=\"number\""],
  [{kind:"true-false",prompt:"x"},"data-bool"],
  [{kind:"matching",prompt:"x",leftItems:[{id:"a",text:"A"}],rightItems:[{id:"b",text:"B"}]},"data-match"],
  [{kind:"free-response",prompt:"x",responseRules:{maxWords:20}},"textarea"],
 ];
 for(const [content,marker] of cases)assert.match(renderGenericControls(stub,revision(content)),new RegExp(marker));
 const html=renderGenericControls(stub,revision(cases[0][0]));
 assert.ok(!html.includes("<script>"));
 assert.ok(html.includes("&lt;script&gt;"));
});
test("timer display derives from paper policy, not CGL constants",()=>{
 const state={sectionIndex:1,elapsedMs:5000,sectionElapsedMs:2000};
 assert.equal(examTimeRemaining({timing:{kind:"untimed"}},state),null);
 assert.equal(examTimeRemaining({timing:{kind:"whole-paper",durationMs:12000}},state),7000);
 assert.equal(examTimeRemaining({timing:{kind:"sectional",sectionLimits:[{sectionId:"one",durationMs:3000},{sectionId:"two",durationMs:9000}]},
 sections:[{id:"one"},{id:"two"}]},state),7000);
});

test("review answers resolve human labels for all six question kinds",()=>{
 const options=[{id:"a",text:"Label A"},{id:"b",text:"Label B"}];
 const q=(content)=>revision(content);
 assert.equal(readableAnswer(q({kind:"single-choice",options}),{kind:"single-choice",optionId:"a"}),"Label A");
 assert.equal(readableAnswer(q({kind:"multiple-select",options}),{kind:"multiple-select",optionIds:["a","b"]}),"Label A; Label B");
 assert.equal(readableAnswer(q({kind:"numeric-entry"}),{kind:"numeric-entry",value:3.5}),"3.5");
 assert.equal(readableAnswer(q({kind:"true-false"}),{kind:"true-false",value:false}),"False");
 assert.equal(readableAnswer(q({kind:"matching",leftItems:[{id:"l",text:"Left"}],rightItems:[{id:"r",text:"Right"}]}),
  {kind:"matching",pairs:[{leftId:"l",rightId:"r"}]}),"Left → Right");
 assert.equal(readableAnswer(q({kind:"free-response"}),{kind:"free-response",evaluation:"manual"}),"Manual assessment required");
});

test("generic history rejects malformed stored records before import",()=>{
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-attempt",id:"fake"}),/Invalid generic/);
 assert.throws(()=>validateGenericStoredRecord({recordType:"generic-package",id:"wrong",bundle:{paper:{id:"x"}}}),/identity/);
});
