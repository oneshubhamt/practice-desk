import {OPTIMIZER_BROWSER_CAPABILITY} from "../tools/fsrs-optimizer/optimizer-policy.mjs";

export const BUILD_TARGETS=Object.freeze({
 standalone:Object.freeze({
  id:"standalone",
  output:"Practice_Desk_Offline_Mock_Tests.html",
  connectSource:"'none'",
  workerSource:"'none'",
  allowWasmEval:false,
  optimizerCapability:null
 }),
 static:Object.freeze({
  id:"static",
  output:"Practice_Desk_Static/index.html",
  connectSource:"'self'",
  workerSource:"'self'",
  allowWasmEval:true,
  optimizerCapability:OPTIMIZER_BROWSER_CAPABILITY
 })
});

export function practiceDeskBuildTarget(id){
 const target=BUILD_TARGETS[id];
 if(!target)throw Error("Unknown Practice Desk build target: "+id);
 return target;
}

export function practiceDeskCsp(target,scriptHash){
 if(typeof scriptHash!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(scriptHash))
  throw Error("Invalid runtime CSP digest");
 const script=["'sha256-"+scriptHash+"'"];
 if(target.allowWasmEval)script.push("'wasm-unsafe-eval'");
 return [
  "default-src 'none'",
  "script-src "+script.join(" "),
  "script-src-attr 'none'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "font-src data:",
  "connect-src "+target.connectSource,
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "worker-src "+target.workerSource
 ].join("; ");
}

export function practiceDeskHeadAdditions(target){
 return target.optimizerCapability?
  '<meta name="practice-desk-browser-optimizer" content="'+target.optimizerCapability+'">\n':"";
}
