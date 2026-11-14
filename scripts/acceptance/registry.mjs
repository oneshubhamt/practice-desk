import {candidateCore,statusPalette} from "./scenarios/candidate.mjs";
import {authoringPublication,externalBankAuthoring} from "./scenarios/authoring.mjs";
import {storageResilience,partialRecovery} from "./scenarios/storage.mjs";
import {fileNavigation} from "./scenarios/navigation.mjs";
import {imageViewer,imagePreparation,mathRendering} from "./scenarios/media.mjs";
import {cspSecurity} from "./scenarios/security.mjs";
import {calendarIntegration} from "./scenarios/calendar.mjs";
import {responsiveUi} from "./scenarios/ui.mjs";
import {resultStress} from "./scenarios/scale.mjs";

const scenario=(id,tags,run)=>Object.freeze({id,tags:Object.freeze(["browser",...tags]),run});
export const scenarioRegistry=Object.freeze([
 scenario("candidate-core",["smoke","candidate","history","learning"],candidateCore),
 scenario("status-palette",["candidate","visual-state"],statusPalette),
 scenario("authoring-publication",["smoke","authoring","publication"],authoringPublication),
 scenario("external-bank-authoring",["authoring","import","editorial"],externalBankAuthoring),
 scenario("storage-resilience",["storage","recovery","concurrency"],storageResilience),
 scenario("partial-recovery",["storage","recovery","cross-browser"],partialRecovery),
 scenario("file-navigation",["navigation","file-url","cross-browser"],fileNavigation),
 scenario("image-viewer",["media","focus","keyboard","cross-browser"],imageViewer),
 scenario("image-preparation",["media","authoring","file-input"],imagePreparation),
 scenario("math-rendering",["media","math"],mathRendering),
 scenario("csp-security",["security","csp","cross-browser"],cspSecurity),
 scenario("calendar-integration",["calendar","integration"],calendarIntegration),
 scenario("responsive-ui",["ui","responsive","a11y"],responsiveUi),
 scenario("result-stress",["results","history","scale","deep"],resultStress)
]);

const ids=new Set(),knownTags=new Set();
for(const item of scenarioRegistry){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id))throw Error("Invalid acceptance scenario id: "+item.id);
 if(ids.has(item.id))throw Error("Duplicate acceptance scenario id: "+item.id);
 ids.add(item.id);
 if(typeof item.run!=="function")throw Error("Scenario has no executable run function: "+item.id);
 if(!item.tags.length||new Set(item.tags).size!==item.tags.length)throw Error("Invalid tags for "+item.id);
 for(const tag of item.tags){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag))throw Error("Invalid scenario tag: "+tag);
  knownTags.add(tag);
 }
}
export const acceptanceTags=Object.freeze([...knownTags].sort());

export function selectScenarios(engine,tag=null){
 if(!["chromium","firefox","webkit"].includes(engine))throw Error("Unsupported acceptance engine: "+engine);
 if(tag!==null&&!knownTags.has(tag))throw Error("Unknown acceptance tag: "+tag);
 const engineSet=engine==="chromium"?scenarioRegistry:
  scenarioRegistry.filter(item=>item.tags.includes("cross-browser"));
 const selected=tag===null?engineSet:engineSet.filter(item=>item.tags.includes(tag));
 if(!selected.length)throw Error("No acceptance scenarios selected for "+engine+(tag?" tag="+tag:""));
 return selected;
}
