import {readFile} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {readQuestionBankManifestGraph} from "../../scripts/question-bank-catalog.mjs";

export const repositoryRoot=resolve(fileURLToPath(new URL("../..",import.meta.url)));
let baselinePromise=null;
async function baseline(){
 if(!baselinePromise)baselinePromise=(async()=>{
  const graph=await readQuestionBankManifestGraph(repositoryRoot);
  const family=graph.families.find(x=>x.family.id==="ssc-cgl");
  if(!family)throw Error("Archived SSC CGL fixture is unavailable");
  const sources={},patches={},solutions={};
  for(const paper of family.papers){
   const base=dirname(paper.path),archive=paper.archive;
   if(!archive)throw Error("CGL archive metadata missing for "+paper.paperId);
   sources[paper.paperId]=JSON.parse(await readFile(join(repositoryRoot,base,archive.originalSource),"utf8"));
   patches[paper.paperId]=JSON.parse(await readFile(join(repositoryRoot,base,archive.reviewedPatches),"utf8"));
   solutions[paper.paperId]=JSON.parse(await readFile(join(repositoryRoot,base,archive.reviewedSolutions),"utf8"));
  }
  return {sources,patches,solutions};
 })();
 return baselinePromise;
}
export async function loadCglFixture(){return structuredClone(await baseline());}
export async function loadQuestionBankGraph(){return readQuestionBankManifestGraph(repositoryRoot);}
