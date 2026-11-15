import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadQuestionBankCatalog,readQuestionBankManifestGraph} from "../../scripts/question-bank-catalog.mjs";

export const repositoryRoot=resolve(fileURLToPath(new URL("../..",import.meta.url)));

let baselinePromise=null;
async function baseline(){
 if(!baselinePromise)baselinePromise=loadQuestionBankCatalog(repositoryRoot).then(loaded=>{
  if(!loaded.legacy)throw Error("SSC CGL fixture is not preinstalled");
  return {
   sources:JSON.parse(loaded.legacy.papersRaw),
   patches:JSON.parse(loaded.legacy.patchesRaw),
   solutions:JSON.parse(loaded.legacy.solutionsRaw)
  };
 });
 return baselinePromise;
}
export async function loadCglFixture(){
 return structuredClone(await baseline());
}
export async function loadQuestionBankGraph(){
 return readQuestionBankManifestGraph(repositoryRoot);
}
