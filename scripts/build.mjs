import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import ts from 'typescript';
import { dirname, posix } from 'node:path';
import { validateContent } from '../src/content/validate.ts';
const root = resolve(import.meta.dirname, '..');
const read = file => readFile(resolve(root,file),'utf8');
const payloads = {
  CSS: `<style>\n${await read('src/styles/app.css')}</style>`,
  PAPER_BANK: `<script id="paper-bank" type="application/json">${(await read('src/content/papers.json')).trim()}</script>`,
  REVIEW_PATCHES: `<script id="review-patches" type="application/json">${(await read('src/content/patches.json')).trim()}</script>`,
  SOLUTION_BANK: `<script id="solution-bank" type="application/json">${(await read('src/content/solutions.json')).trim()}</script>`,
};
// Compile the strict TypeScript engine into the same file://-safe script as the UI.
const modules = new Map();
async function compileModule(id) {
  if (modules.has(id)) return;
  const source = await read(id);
  const compiled = ts.transpileModule(source, { fileName: id, compilerOptions: {
    target: 9, module: 1,
  }}).outputText;
  modules.set(id, compiled);
  for (const match of compiled.matchAll(/require\(["'](\.[^"']+)["']\)/g)) {
    const child = posix.normalize(posix.join(posix.dirname(id), match[1])).replace(/\.js$/, '.ts');
    await compileModule(child);
  }
}
await compileModule('src/app/browser-engine.ts');
const bundle = `(function(){
const modules = Object.create(null), cache = Object.create(null);
${[...modules].map(([id,code])=>`modules[${JSON.stringify(id)}] = function(require,module,exports){${code}};`).join('\n')}
function load(id) {
 if (cache[id]) return cache[id].exports;
 const factory = modules[id];
 if (!factory) throw new Error('Missing embedded module: '+id);
 const module = {exports:{}}; cache[id] = module;
 factory(function(spec){ const target = spec.startsWith('.') ?
   spec.split('/').reduce((parts,segment)=>segment==='..'?(parts.pop(),parts):segment==='.'?parts:(parts.push(segment),parts),id.split('/').slice(0,-1)).join('/').replace(/\\.js$/,'.ts') : spec;
   return load(target); },module,module.exports);
 return module.exports;
}
globalThis.PD_ENGINE_FACTORY = load('src/app/browser-engine.ts').createBrowserEngine;
})();`;
new Script(bundle);
const runtime = (await read('src/app/legacy.ts')).replace(/^\/\/ @ts-nocheck\r?\n(?:\/\/[^\n]*\r?\n)?/,'');
new Script(runtime);
validateContent({
 papers:JSON.parse(await read('src/content/papers.json')),
 patches:JSON.parse(await read('src/content/patches.json')),
 solutions:JSON.parse(await read('src/content/solutions.json'))
});
payloads.APPLICATION=`<script>\n${bundle}\n${runtime.trimEnd()}\n</script>`;
let html=await read('src/template.html');
for(const [key,value] of Object.entries(payloads)){
 const marker=`<!-- PD:${key} -->`;
 if(html.split(marker).length!==2)throw new Error('Expected one '+marker);
 html=html.replace(marker,value);
}
if(/<!-- PD:[A-Z_]+ -->/.test(html))throw new Error('Unreplaced marker');
await writeFile(resolve(root,'Practice_Desk_Offline_Mock_Tests.html'),html);
console.log(`Built ${Buffer.byteLength(html)} bytes.`);
