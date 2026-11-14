import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const ts=require("typescript");
import {existsSync} from "node:fs";
import {readdir,readFile} from "node:fs/promises";
import {dirname,join,relative,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const srcRoot=join(root,"src");
const posix=p=>p.split(sep).join("/");
const rel=p=>posix(relative(root,p));

async function walk(dir){
 const out=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const path=join(dir,entry.name);
  if(entry.isDirectory())out.push(...await walk(path));
  else if(entry.isFile()&&entry.name.endsWith(".ts"))out.push(path);
 }
 return out;
}
const files=await walk(srcRoot);
const source=new Map(await Promise.all(files.map(async file=>[rel(file),await readFile(file,"utf8")])));
const ast=new Map([...source].map(([file,text])=>[
 file,ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
]));

function importsOf(file){
 const imports=[];
 for(const node of ast.get(file).statements){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&
     ts.isStringLiteral(node.moduleSpecifier)){
   const spec=node.moduleSpecifier.text;
   let target=null;
   if(spec.startsWith(".")){
    let abs=resolve(root,dirname(file),spec);
    if(abs.endsWith(".js"))abs=abs.slice(0,-3)+".ts";
    if(!abs.endsWith(".ts")&&existsSync(abs+".ts"))abs+=".ts";
    target=rel(abs);
   }
   imports.push({spec,target,node});
  }
 }
 return imports;
}
const graph=new Map([...source.keys()].map(file=>[file,importsOf(file)]));
function identifiers(file){
 const names=[];const visit=node=>{if(ts.isIdentifier(node))names.push(node.text);ts.forEachChild(node,visit);};
 visit(ast.get(file));return names;
}
function callFacts(file){
 const facts=[];const visit=node=>{
  if(ts.isCallExpression(node)){
   const e=node.expression;
   if(ts.isIdentifier(e))facts.push({name:e.text,owner:null});
   else if(ts.isPropertyAccessExpression(e))
    facts.push({name:e.name.text,owner:ts.isIdentifier(e.expression)?e.expression.text:null});
  }
  ts.forEachChild(node,visit);
 };visit(ast.get(file));return facts;
}
function exportedFunctions(file){
 const names=[];
 for(const node of ast.get(file).statements)
  if(ts.isFunctionDeclaration(node)&&node.name&&node.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword))
   names.push(node.name.text);
 return names;
}
function assertNoCycle(nodes){
 const allowed=new Set(nodes),visiting=new Set(),done=new Set();
 const visit=node=>{
  if(done.has(node))return;
  assert.equal(visiting.has(node),false,"controller dependency cycle at "+node);
  visiting.add(node);
  for(const edge of graph.get(node)??[])if(edge.target&&allowed.has(edge.target))visit(edge.target);
  visiting.delete(node);done.add(node);
 };
 for(const node of nodes)visit(node);
}

test("dependency graph keeps foundational layers below app and third-party schedulers/editors behind adapters",()=>{
 for(const dir of ["domain","engine","history","learning"])
  for(const file of source.keys())if(file.startsWith("src/"+dir+"/"))
   for(const edge of graph.get(file))
    assert.ok(!edge.target?.startsWith("src/app/"),file+" must not depend on app layer: "+edge.spec);
 const fsrs=[...graph].flatMap(([file,edges])=>edges.filter(e=>e.spec==="ts-fsrs"||e.spec.startsWith("ts-fsrs/")).map(()=>file));
 assert.deepEqual([...new Set(fsrs)],["src/learning/fsrs-scheduler-adapter.ts"]);
 const wordgard=[...graph].flatMap(([file,edges])=>edges.filter(e=>e.spec==="wordgard"||e.spec.startsWith("wordgard/")).map(()=>file));
 assert.deepEqual([...new Set(wordgard)],["src/authoring/wordgard-adapter.ts"]);
});

test("application controllers form an acyclic capability graph and never depend back on the composition root",()=>{
 const names=["library-controller","result-controller","exam-controller","route-controller",
  "persistence-controller","history-controller","screen-controller","lifecycle-controller",
  "authoring-controller","learning-controller","storage-health-controller"];
 const controllers=names.map(x=>"src/app/"+x+".ts");
 for(const file of controllers){
  const imports=graph.get(file);
  assert.ok(imports.some(e=>e.spec==="./coordinator-context.ts"&&e.node.importClause?.isTypeOnly),
   file+" must consume its coordinator capability slice as a type-only dependency");
  assert.ok(!imports.some(e=>e.target==="src/app/generic-ui.ts"),file+" must not depend on generic-ui");
  assert.ok(!imports.some(e=>e.spec==="ts-fsrs"||e.spec.startsWith("ts-fsrs/")||
    e.spec==="wordgard"||e.spec.startsWith("wordgard/")),file+" must not import a vendor directly");
 }
 assertNoCycle(controllers);
});

test("composition, authoring view and pure presentation ownership are enforced structurally",()=>{
 const genericImports=new Set(graph.get("src/app/generic-ui.ts").map(e=>e.target).filter(Boolean));
 for(const file of ["authoring-controller","learning-controller","calendar-controller","lifecycle-controller",
  "library-controller","result-controller","exam-controller","route-controller","screen-controller",
  "history-controller","persistence-controller","storage-health-controller"])
  assert.ok(genericImports.has("src/app/"+file+".ts"),"composition root missing "+file);
 assert.deepEqual(exportedFunctions("src/app/generic-ui.ts").filter(x=>x==="mountExamWorkspace"),["mountExamWorkspace"]);
 const studioImports=new Set(graph.get("src/authoring/authoring-studio.ts").map(e=>e.target).filter(Boolean));
 for(const target of ["src/authoring/authoring-studio-view.ts",
  "src/authoring/authoring-workspace-store.ts","src/authoring/authoring-workflow.ts"])
  assert.ok(studioImports.has(target),"authoring studio must delegate through "+target);
 const viewImports=new Set(graph.get("src/authoring/authoring-studio-view.ts").map(e=>e.target).filter(Boolean));
 for(const forbidden of ["src/authoring/authoring-workspace-store.ts",
  "src/authoring/authoring-workflow.ts","src/authoring/wordgard-adapter.ts"])
  assert.ok(!viewImports.has(forbidden),"pure authoring view must not import "+forbidden);
 for(const global of ["document","window","localStorage","indexedDB"])
  assert.ok(!identifiers("src/authoring/authoring-studio-view.ts").includes(global),
    "pure authoring view must not touch "+global);
 for(const file of ["src/authoring/authoring-workspace-store.ts","src/authoring/authoring-workflow.ts"])
  assert.ok(!(graph.get(file)??[]).some(e=>e.target?.startsWith("src/app/")),
    file+" must stay below application UI composition");
 for(const file of ["html-escape","question-content-view","exam-view","stored-record-validator","review-media-view"]){
  const path="src/app/"+file+".ts";
  assert.ok(!(graph.get(path)??[]).some(e=>e.target==="src/app/generic-ui.ts"),path+" must not depend on the composition root");
  for(const global of ["document","window"])assert.ok(!identifiers(path).includes(global),path+" must remain DOM-global independent");
 }
});

test("lifecycle, candidate cleanup and raw browser-storage ownership each have one structural owner",()=>{
 const genericCalls=callFacts("src/app/generic-ui.ts"),lifeCalls=callFacts("src/app/lifecycle-controller.ts");
 assert.ok(!genericCalls.some(x=>x.name==="setInterval"),"composition root must not own the exam clock");
 assert.ok(lifeCalls.some(x=>x.name==="setInterval"&&x.owner==="window"),"lifecycle controller must own the timer");
 assert.ok(lifeCalls.some(x=>x.name==="clearInterval"&&x.owner==="window"),"lifecycle controller must dispose the timer");
 for(const file of ["src/app/persistence-controller.ts","src/app/storage-health-controller.ts"]){
  assert.ok(!identifiers(file).includes("indexedDB"),file+" must use the storage backend contract");
  assert.ok(!callFacts(file).some(x=>x.name==="transaction"),file+" must not open raw storage transactions");
 }
 const candidates=["src/app/persistence-controller.ts","src/app/exam-controller.ts",
  "src/app/route-controller.ts","src/app/lifecycle-controller.ts"];
 assert.deepEqual(candidates.filter(file=>callFacts(file).some(x=>x.name==="clearCandidateToolWorkspace")),
  ["src/app/persistence-controller.ts"]);
 for(const file of ["src/app/image-preparation.ts","src/app/image-viewer.ts"]){
  const ids=identifiers(file);
  for(const global of ["indexedDB","localStorage","sessionStorage","fetch"])
   assert.ok(!ids.includes(global),file+" must remain storage/network independent");
  assert.ok(!(graph.get(file)??[]).some(e=>e.target==="src/app/generic-ui.ts"),file+" must not depend on composition root");
 }
 assert.ok(!callFacts("src/app/image-viewer.ts").some(x=>x.name==="createObjectURL"),
  "verified image viewer must not introduce object-URL lifetime state");
});


test("Calendar controller consumes the vendor through adapters while Practice Desk remains the durability owner",()=>{
 const imports=graph.get("src/app/calendar-controller.ts");
 assert.ok(imports.some(e=>e.spec==="@director/calendar"));
 assert.ok(imports.some(e=>e.spec==="@director/calendar/adapters/practice-desk"));
 assert.ok(imports.some(e=>e.spec==="./coordinator-context.ts"&&e.node.importClause?.isTypeOnly));
 const ids=identifiers("src/app/calendar-controller.ts");
 for(const forbidden of ["indexedDB","localStorage","sessionStorage","MemoryCalendarRepository","openIndexedDb"])
  assert.ok(!ids.includes(forbidden),"Calendar controller must not own a private persistence backend: "+forbidden);
});
