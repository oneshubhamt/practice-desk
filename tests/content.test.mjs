import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateContent} from '../scripts/validate.mjs';
const load=async name=>JSON.parse(await readFile(new URL('../src/content/'+name+'.json',import.meta.url),'utf8'));
test('all packs satisfy structural invariants',async()=>{
 const data={papers:await load('papers'),patches:await load('patches'),solutions:await load('solutions')};
 assert.deepEqual(validateContent(data),{sourcePapers:5,questions:500});
 for(const p of Object.values(data.papers)){
  assert.equal(p.questions.length,100);
  assert.equal(new Set(p.questions.map(q=>q.n)).size,100);
  assert.equal(Object.keys(data.solutions[p.id]||{}).length,50);
 }
});
test('validator rejects malformed records',()=>{
 const paper={id:'test',questions:[{n:1,stem:'Question?',opts:['A','B','C','D'],key:'a'}]};
 const d={papers:{test:paper},patches:{},solutions:{}};
 assert.doesNotThrow(()=>validateContent(d));
 paper.questions.push({...paper.questions[0]});
 assert.throws(()=>validateContent(d),/Duplicate/);
 paper.questions.pop();d.patches.test={2:{key:'b'}};
 assert.throws(()=>validateContent(d),/Orphan patch/);
});
