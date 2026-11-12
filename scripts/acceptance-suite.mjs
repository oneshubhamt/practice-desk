/** One browser process per engine; every original acceptance scenario runs with
 * its own fresh browser context, independent checks, and failure diagnostics.
 * This is a real execution harness, not static source scan or fake coverage.
 * Current verification contract: docs/QA_CURRENT.md.
 */
import {mkdir,readdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {beginAcceptanceSuite,endAcceptanceSuite,root} from "./browser/fixtures.mjs";

const engine=process.argv[2]??"chromium";
if(!["chromium","firefox","webkit"].includes(engine)||process.argv.length>3)
 throw Error("Usage: node scripts/acceptance-suite.mjs chromium|firefox|webkit");
const groups=[
  {
    "name": "authoring-content",
    "scripts": [
      "acceptance-authoring-visual",
      "acceptance-authoring-publication",
      "acceptance-p47-math",
      "acceptance-p49-p52-enhancements",
      "acceptance-p53-taxonomy",
      "acceptance-p54-authoring",
      "acceptance-p57a-bank",
      "acceptance-p58b-editorial",
      "acceptance-p58a-integrity"
    ],
    "mode": [
      "both",
      "both",
      "both",
      "both",
      "both",
      "both",
      "both",
      "both",
      "both"
    ]
  },
  {
    "name": "candidate-exam-and-editorial",
    "scripts": [
      "acceptance-p48-security",
      "acceptance-p48-architecture",
      "acceptance-p48-ux",
      "acceptance-flag-palette",
      "acceptance-session-policy",
      "acceptance-editorial-provenance",
      "acceptance-critical",
      "acceptance-bank-modes",
      "acceptance-drafts"
    ],
    "mode": [
      "both",
      "both",
      "both",
      "both",
      "chromium-only",
      "chromium-only",
      "chromium-only",
      "chromium-only",
      "chromium-only"
    ]
  },
  {
    "name": "history-recovery-learning",
    "scripts": [
      "acceptance-history-evidence",
      "acceptance-history-filters",
      "acceptance-resilience",
      "acceptance-partial-recovery",
      "acceptance-p55-learning",
      "acceptance-p56-integration",
      "acceptance-learning-lifecycle",
      "acceptance-recovery"
    ],
    "mode": [
      "chromium-only",
      "chromium-only",
      "chromium-only",
      "both",
      "both",
      "both",
      "chromium-only",
      "chromium-only"
    ]
  },
  {
    "name": "media-scale-navigation",
    "scripts": [
      "acceptance-p58c-scale",
      "acceptance-image-viewer",
      "acceptance-image-preparation",
      "acceptance-ui",
      "acceptance-stress",
      "acceptance-navigation"
    ],
    "mode": [
      "both",
      "both",
      "both",
      "chromium-only",
      "chromium-only",
      "both"
    ]
  }
];
const declared=groups.flatMap(x=>x.scripts);
const unretired=(await readdir(join(root,"scripts")))
 .filter(file=>/^acceptance-[a-z0-9-]+\.mjs$/.test(file))
 .filter(file=>file!=="acceptance-suite.mjs")
 .map(file=>file.slice(0,-4));
const same=(a,b)=>a.length===b.length&&a.slice().sort().every((x,i)=>x===b.slice().sort()[i]);
if(!same(declared,unretired))
 throw Error("Acceptance manifest changed without full assertion mapping: "+
  JSON.stringify({declared,unretired}));
const selected=groups.flatMap(group=>group.scripts
 .map((file,index)=>({file,group:group.name,mode:group.mode[index]})))
 .filter(s=>engine==="chromium"||s.mode==="both");
const expected=engine==="chromium"?32:20;
if(selected.length!==expected||new Set(selected.map(x=>x.file)).size!==expected)
 throw Error("Suite coverage manifest mismatch");
const result={format:"practice-desk-acceptance-suite",version:1,
 engine,expectedScenarios:expected,executed:[],
 skipped:declared.filter(x=>!selected.some(y=>y.file===x)),pool:null,complete:false};
const out=join(root,"artifacts/acceptance-modern");
await mkdir(out,{recursive:true});
beginAcceptanceSuite(engine);
let error=null;
try{
 for(const {file,group} of selected){
  const begin=performance.now();
  console.log("::group::"+engine+" | "+group+" | "+file);
  try{
   await import("./"+file+".mjs");
   result.executed.push({file,group,outcome:"pass",elapsedMs:Math.round(performance.now()-begin)});
   console.log("ASSERTION JOURNEY PASS "+file);
  }catch(e){
   result.executed.push({file,group,outcome:"fail",
    elapsedMs:Math.round(performance.now()-begin),error:String(e)});
   console.error("ASSERTION JOURNEY FAILED "+engine+" "+file,e);
   error=e;
   break;
  }finally{console.log("::endgroup::");}
 }
}catch(e){error=error??e;}
try{result.pool=await endAcceptanceSuite();}catch(e){error=error??e;}
result.complete=!error&&result.executed.length===expected;
await writeFile(join(out,"suite-"+engine+".json"),JSON.stringify(result,null,2));
if(!result.complete)throw error??Error("Incomplete journey coverage");
console.log("ACCEPTANCE SUITE "+engine+" PASS; "+expected+
 " independent journeys, "+result.pool.browserLaunches+" browser launch");
