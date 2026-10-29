import test from "node:test";
import assert from "node:assert/strict";
import { assertWriteVersion,nextWriteVersion } from "../src/history/concurrency.ts";
test("new records cannot be overwritten and concurrent revisions conflict",()=>{
 assert.doesNotThrow(()=>assertWriteVersion(undefined,null));
 assert.equal(nextWriteVersion(null),1);
 assert.throws(()=>assertWriteVersion({saveRevision:1},null),/already created/);
 assert.doesNotThrow(()=>assertWriteVersion({saveRevision:3},3));
 assert.equal(nextWriteVersion(3),4);
 assert.throws(()=>assertWriteVersion({saveRevision:4},3),/Another tab changed/);
 assert.throws(()=>assertWriteVersion(undefined,3),/Another tab changed/);
 assert.doesNotThrow(()=>assertWriteVersion({},0));
});
