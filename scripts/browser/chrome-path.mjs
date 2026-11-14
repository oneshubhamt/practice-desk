/** Test-harness-only executable discovery: one Chrome binary and one
 * validation per Node process. The browser scenarios already require an
 * installed Chrome, so neither acceptance nor WASM smoke needs Playwright's
 * separately downloaded Chromium distribution.
 */
import {spawnSync} from "node:child_process";

let resolved=null;
export function chromePath(){
 if(resolved)return resolved;
 for(const name of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
  const version=spawnSync(name,["--version"],{encoding:"utf8",timeout:4000});
  if(version.status!==0)continue;
  const location=spawnSync("which",[name],{encoding:"utf8",timeout:4000});
  const path=location.status===0?location.stdout.trim():"";
  if(path)return resolved=path;
 }
 throw Error("Chromium acceptance and WASM smoke require an installed Chrome executable");
}
