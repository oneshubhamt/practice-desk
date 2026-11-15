import {readFile,writeFile,mkdir} from "node:fs/promises";
import {dirname,join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {loadQuestionBankCatalog,readQuestionBankManifestGraph} from "./question-bank-catalog.mjs";
import {builtinCglPackages} from "../src/app/exam-package.ts";
import {compileExternalQuestionBank} from "../src/authoring/external-bank.ts";
import {validateExamPackage} from "../src/domain/exam-package.ts";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const readJson=async path=>JSON.parse(await readFile(join(root,path),"utf8"));
const writeJson=async(path,value)=>{
 const target=join(root,path);await mkdir(dirname(target),{recursive:true});
 await writeFile(target,JSON.stringify(value,null,2)+"\n");
};
const loaded=await loadQuestionBankCatalog(root);
const graph=await readQuestionBankManifestGraph(root);

if(loaded.legacy){
 const sources=JSON.parse(loaded.legacy.papersRaw);
 const patches=JSON.parse(loaded.legacy.patchesRaw);
 const solutions=JSON.parse(loaded.legacy.solutionsRaw);
 const packages=builtinCglPackages(sources,patches,solutions);
 const cgl=graph.families.find(row=>row.family.id==="ssc-cgl");
 if(!cgl)throw Error("CGL manifest graph unavailable");
 for(const paper of cgl.papers){
  const source=packages.find(pkg=>pkg.paper.paperId===paper.paperId&&pkg.paper.edition==="source");
  const reviewed=packages.find(pkg=>pkg.paper.paperId===paper.paperId&&pkg.paper.edition==="reviewed");
  if(!source||!reviewed)throw Error("CGL edition pair missing for "+paper.paperId);
  validateExamPackage(source);validateExamPackage(reviewed);
  if(reviewed.paper.sourcePaperRevisionId!==source.paper.id||
     reviewed.paper.sourceAnswerKeyRevisionId!==source.answerKey.id)
   throw Error("CGL reviewed lineage mismatch for "+paper.paperId);
  const base=dirname(paper.path);
  await writeJson(join(base,"original","package.exam.json"),source);
  await writeJson(join(base,"revised","package.exam.json"),reviewed);
 }
}

for(const family of graph.families){
 if(family.exam.representation!=="exam-packages")continue;
 for(const paper of family.papers){
  const manifest=await readJson(paper.path);
  for(const edition of Object.values(manifest.editions)){
   if(!edition.authoring||!edition.package)continue;
   const base=dirname(paper.path);
   const authored=await readJson(join(base,edition.authoring));
   const pkg=validateExamPackage(compileExternalQuestionBank(authored));
   await writeJson(join(base,edition.package),pkg);
  }
 }
}
console.log("Canonical package materialization complete.");
