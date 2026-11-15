import test from "node:test";
import assert from "node:assert/strict";
import {countWords,wordCountBand,shouldShowWordCount,WORD_COUNT_OVERRIDES} from "../src/domain/word-count.ts";

test("word count uses one whitespace-delimited canonical rule",()=>{
 assert.equal(countWords(""),0);
 assert.equal(countWords("  one\n two\tthree  "),3);
 assert.equal(countWords("hyphenated-word"),1);
});

test("word-count guidance escalates at 80%, 90% and only turns over after the limit",()=>{
 assert.equal(wordCountBand(79,100),"normal");
 assert.equal(wordCountBand(80,100),"caution");
 assert.equal(wordCountBand(89,100),"caution");
 assert.equal(wordCountBand(90,100),"warning");
 assert.equal(wordCountBand(100,100),"warning");
 assert.equal(wordCountBand(101,100),"over");
});

test("published paper override vocabulary has one canonical Auto representation",()=>{
 assert.deepEqual([...WORD_COUNT_OVERRIDES],["shown","hidden"]);
});
test("Auto shows in practice modes and hides in exam simulation; explicit policy wins",()=>{
 for(const mode of ["full-paper-practice","section-practice","custom-practice"])
  assert.equal(shouldShowWordCount(undefined,mode),true,mode);
 assert.equal(shouldShowWordCount(undefined,"exam-simulation"),false);
 assert.equal(shouldShowWordCount("shown","exam-simulation"),true);
 assert.equal(shouldShowWordCount("hidden","custom-practice"),false);
});
