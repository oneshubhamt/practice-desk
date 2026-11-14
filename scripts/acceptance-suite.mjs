/** Capability-tagged offline-browser acceptance runner.
 * Chromium exercises the complete retained browser-risk set. Firefox/WebKit
 * exercise only scenarios tagged cross-browser. Each scenario receives a fresh
 * context through the shared browser harness; one browser process is retained
 * per engine for speed without weakening isolation.
 */
import {mkdir,writeFile} from "node:fs/promises";
import {join} from "node:path";
import {performance} from "node:perf_hooks";
import {beginAcceptanceSuite,endAcceptanceSuite,root} from "./browser/fixtures.mjs";
import {acceptanceTags,scenarioRegistry,selectScenarios} from "./acceptance/registry.mjs";

const engine=process.argv[2]??"chromium";
const tagArg=process.argv[3]??null;
if(process.argv.length>4||!["chromium","firefox","webkit"].includes(engine)||
  (tagArg!==null&&!tagArg.startsWith("--tag=")))
 throw Error("Usage: node scripts/acceptance-suite.mjs chromium|firefox|webkit [--tag=<capability>]");
const tag=tagArg?.slice("--tag=".length)??null;
const selected=selectScenarios(engine,tag);
const skipped=scenarioRegistry.filter(item=>!selected.includes(item)).map(item=>item.id);
const result={format:"practice-desk-acceptance-suite",version:2,engine,tag,
 availableTags:acceptanceTags,expectedScenarios:selected.length,executed:[],skipped,pool:null,complete:false};
const out=join(root,"artifacts/acceptance-modern");
await mkdir(out,{recursive:true});
beginAcceptanceSuite(engine);
let error=null;
try{
 for(const item of selected){
  const begin=performance.now();
  console.log("::group::"+engine+" | "+item.id+" | "+item.tags.join(","));
  try{
   await item.run();
   result.executed.push({id:item.id,tags:item.tags,outcome:"pass",
    elapsedMs:Math.round(performance.now()-begin)});
   console.log("ASSERTION JOURNEY PASS "+item.id);
  }catch(e){
   result.executed.push({id:item.id,tags:item.tags,outcome:"fail",
    elapsedMs:Math.round(performance.now()-begin),error:String(e)});
   console.error("ASSERTION JOURNEY FAILED "+engine+" "+item.id,e);
   error=e;break;
  }finally{console.log("::endgroup::");}
 }
}catch(e){error=error??e;}
try{result.pool=await endAcceptanceSuite();}catch(e){error=error??e;}
result.complete=!error&&result.executed.length===selected.length;
await writeFile(join(out,"suite-"+engine+(tag?"-"+tag:"")+".json"),JSON.stringify(result,null,2));
if(!result.complete)throw error??Error("Incomplete tagged acceptance coverage");
console.log("ACCEPTANCE SUITE "+engine+" PASS; "+selected.length+
 " tagged scenarios, "+result.pool.browserLaunches+" browser launch");
