import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Script} from 'node:vm';
test('single-file release contains a complete inline app',async()=>{
 const html=await readFile(new URL('../Practice_Desk_Offline_Mock_Tests.html',import.meta.url),'utf8');
 assert.match(html,/^<!doctype html>/i);
 assert.equal((html.match(/<style>/g)||[]).length,1);
 assert.equal((html.match(/type="application\/json"/g)||[]).length,3);
 assert.equal((html.match(/<script>/g)||[]).length,1);
 assert.doesNotMatch(html,/<!-- PD:[A-Z_]+ -->/);
 assert.doesNotMatch(html,/<script[^>]+src=|<link[^>]+rel=["']stylesheet/i);
 const code=html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)?.[1];
 assert.ok(code);assert.doesNotThrow(()=>new Script(code));
});
