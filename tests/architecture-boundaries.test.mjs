import test from "node:test";
import assert from "node:assert/strict";
import {readdir} from "node:fs/promises";
import {dirname,join,relative,resolve,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {build} from "esbuild";

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
const sourceFiles=(await walk(srcRoot)).map(rel).sort();
const parsed=await build({
 absWorkingDir:root,
 stdin:{
  contents:sourceFiles.map(file=>'import "./'+file+'";').join("\n"),
  resolveDir:root,sourcefile:"qa-import-graph.ts",loader:"ts"
 },
 bundle:true,packages:"external",external:["@director/calendar","@director/calendar/*"],
 write:false,metafile:true,format:"esm",platform:"browser",
 target:"es2022",logLevel:"silent",tsconfig:"tsconfig.json"
});
assert.ok(parsed.metafile);
const inputs=parsed.metafile.inputs;
const keyFor=file=>{
 const normalized=posix(file);
 const key=Object.keys(inputs).find(k=>posix(k)===normalized||posix(k).endsWith("/"+normalized));
 assert.ok(key,"esbuild metafile missing "+file);
 return key;
};
const resolveImport=(file,path)=>{
 if(path.startsWith(".")){
  let target=posix(relative(root,resolve(root,dirname(file),path)));
  if(target.endsWith(".js"))target=target.slice(0,-3)+".ts";
  return target;
 }
 if(path.startsWith("src/"))return path.endsWith(".js")?path.slice(0,-3)+".ts":path;
 return null;
};
const graph=new Map(sourceFiles.map(file=>{
 const row=inputs[keyFor(file)];
 return [file,row.imports.map(entry=>({
  spec:entry.path,target:resolveImport(file,entry.path),kind:entry.kind,external:Boolean(entry.external)
 }))];
}));
const importsOf=file=>graph.get(file)??[];
const targets=file=>new Set(importsOf(file).map(x=>x.target).filter(Boolean));
const bareUsers=prefix=>sourceFiles.filter(file=>
 importsOf(file).some(x=>x.spec===prefix||x.spec.startsWith(prefix+"/")));

function assertNoCycle(nodes){
 const allowed=new Set(nodes),visiting=new Set(),done=new Set();
 const visit=node=>{
  if(done.has(node))return;
  assert.equal(visiting.has(node),false,"runtime controller dependency cycle at "+node);
  visiting.add(node);
  for(const edge of importsOf(node))if(edge.target&&allowed.has(edge.target))visit(edge.target);
  visiting.delete(node);done.add(node);
 };
 for(const node of nodes)visit(node);
}

test("parser-backed import graph keeps foundational layers below application composition",()=>{
 for(const dir of ["domain","engine","history","learning"])
  for(const file of sourceFiles.filter(x=>x.startsWith("src/"+dir+"/")))
   for(const edge of importsOf(file))
    assert.ok(!edge.target?.startsWith("src/app/"),file+" must not depend on app layer: "+edge.spec);
});

test("third-party scheduler and editor dependencies terminate at their adapters",()=>{
 assert.deepEqual(bareUsers("ts-fsrs"),["src/learning/fsrs-scheduler-adapter.ts"]);
 assert.deepEqual(bareUsers("wordgard"),["src/authoring/wordgard-adapter.ts"]);
});

test("application controllers are acyclic runtime capabilities and never depend back on generic-ui or vendors",()=>{
 const names=["library-controller","result-controller","exam-controller","route-controller",
  "persistence-controller","history-controller","screen-controller","lifecycle-controller",
  "authoring-controller","learning-controller","storage-health-controller"];
 const controllers=names.map(x=>"src/app/"+x+".ts");
 for(const file of controllers){
  assert.ok(!targets(file).has("src/app/generic-ui.ts"),file+" must not depend on generic-ui");
  assert.ok(!importsOf(file).some(e=>e.spec==="ts-fsrs"||e.spec.startsWith("ts-fsrs/")||
    e.spec==="wordgard"||e.spec.startsWith("wordgard/")),file+" must not import a vendor directly");
 }
 assertNoCycle(controllers);
});

test("composition root and authoring modules preserve one-way ownership boundaries",()=>{
 const generic=targets("src/app/generic-ui.ts");
 for(const file of ["authoring-controller","learning-controller","calendar-controller","lifecycle-controller",
  "library-controller","result-controller","exam-controller","route-controller","screen-controller",
  "history-controller","persistence-controller","storage-health-controller"])
  assert.ok(generic.has("src/app/"+file+".ts"),"composition root missing "+file);

 const studio=targets("src/authoring/authoring-studio.ts");
 for(const target of ["src/authoring/authoring-studio-view.ts",
  "src/authoring/authoring-workspace-store.ts","src/authoring/authoring-workflow.ts"])
  assert.ok(studio.has(target),"authoring studio must delegate through "+target);

 const view=targets("src/authoring/authoring-studio-view.ts");
 for(const forbidden of ["src/authoring/authoring-workspace-store.ts",
  "src/authoring/authoring-workflow.ts","src/authoring/wordgard-adapter.ts"])
  assert.ok(!view.has(forbidden),"pure authoring view must not import "+forbidden);

 for(const file of ["src/authoring/authoring-workspace-store.ts","src/authoring/authoring-workflow.ts"])
  assert.ok(![...targets(file)].some(x=>x.startsWith("src/app/")),
   file+" must stay below application UI composition");

 for(const name of ["html-escape","question-content-view","exam-view","stored-record-validator","review-media-view"])
  assert.ok(!targets("src/app/"+name+".ts").has("src/app/generic-ui.ts"),
   name+" must remain independent of the composition root");
});

test("storage/media/calendar dependency topology has no second persistence path",()=>{
 const persistence=targets("src/app/persistence-controller.ts");
 assert.ok(persistence.has("src/history/workspace-store.ts"),
  "persistence controller must delegate durable storage through WorkspaceStore");

 for(const file of ["src/app/image-preparation.ts","src/app/image-viewer.ts"]){
  const deps=targets(file);
  assert.ok(!deps.has("src/app/generic-ui.ts"),file+" must not depend on composition root");
  assert.ok(![...deps].some(x=>x.startsWith("src/history/")||x==="src/storage-topology.ts"),
   file+" must not acquire persistence ownership");
 }

 const calendar=importsOf("src/app/calendar-controller.ts");
 assert.ok(calendar.some(e=>e.spec==="@director/calendar"));
 assert.ok(calendar.some(e=>e.spec==="@director/calendar/adapters/practice-desk"));
 const calTargets=targets("src/app/calendar-controller.ts");
 assert.ok(!calTargets.has("src/history/workspace-store.ts"));
 assert.ok(!calTargets.has("src/storage-topology.ts"));
});
