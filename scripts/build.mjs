import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { build as bundleJavaScript } from 'esbuild';
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
// Bundle the generic engine into a self-contained, file://-safe browser script.
const bundleResult = await bundleJavaScript({
  entryPoints: [resolve(root, 'src/app/browser-engine.ts')],
  bundle: true, write: false, platform: 'browser', format: 'iife',
  globalName: 'PracticeDeskEngine', target: 'es2022', logLevel: 'silent',
});
const bundle = bundleResult.outputFiles[0].text +
  '\n globalThis.PD_ENGINE_FACTORY = PracticeDeskEngine.createBrowserEngine;\n';
new Script(bundle);
const genericResult = await bundleJavaScript({
  entryPoints: [resolve(root, 'src/app/generic-ui.ts')],
  bundle: true, write: false, platform: 'browser', format: 'iife',
  globalName: 'PracticeDeskGeneric', target: 'es2022', logLevel: 'silent',
});
const genericBundle = genericResult.outputFiles[0].text +
  '\n globalThis.PD_GENERIC_UI = PracticeDeskGeneric.mountExamWorkspace;\n'+
  'globalThis.PD_GENERIC_VALIDATE_RECORD = PracticeDeskGeneric.validateGenericStoredRecord;\n'+
  'globalThis.PD_GENERIC_RENDER_CGL = PracticeDeskGeneric.renderLegacyCglExam;\n';
new Script(genericBundle);
const runtime = (await read('src/app/legacy.ts')).replace(/^\/\/ @ts-nocheck\r?\n(?:\/\/[^\n]*\r?\n)?/,'');
new Script(runtime);
validateContent({
 papers:JSON.parse(await read('src/content/papers.json')),
 patches:JSON.parse(await read('src/content/patches.json')),
 solutions:JSON.parse(await read('src/content/solutions.json'))
});
payloads.APPLICATION=`<script>\n${bundle}\n${genericBundle}\n${runtime.trimEnd()}\n</script>`;
let html=await read('src/template.html');
for(const [key,value] of Object.entries(payloads)){
 const marker=`<!-- PD:${key} -->`;
 if(html.split(marker).length!==2)throw new Error('Expected one '+marker);
 html=html.replace(marker,value);
}
if(/<!-- PD:[A-Z_]+ -->/.test(html))throw new Error('Unreplaced marker');
await writeFile(resolve(root,'Practice_Desk_Offline_Mock_Tests.html'),html);
console.log(`Built ${Buffer.byteLength(html)} bytes.`);
