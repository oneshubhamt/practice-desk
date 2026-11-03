/* P47-6 one-time, TypeScript-symbol-aware full stateful-coordinator extraction.
 * The validated scoring, timing, storage and DOM semantics are not rewritten:
 * every captured mutable value remains owned by one typed coordinator context.
 */
import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const path='src/app/generic-ui.ts',src=readFileSync(path,'utf8');
const cfg=ts.readConfigFile('tsconfig.json',ts.sys.readFile);
const opts=ts.parseJsonConfigFileContent(cfg.config,ts.sys,'.').options;
const program=ts.createProgram([path],opts),checker=program.getTypeChecker(),sf=program.getSourceFile(path);
const outer=sf.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='mountExamWorkspace');
if(!outer?.body)throw Error('P47-6 cannot find mountExamWorkspace');
const stmts=outer.body.statements;
const byName=new Map(),symbols=new Map(),declStarts=new Set();
function bind(id){
 const sym=checker.getSymbolAtLocation(id);
 if(sym){symbols.set(sym,id.getText(sf));declStarts.add(id.getStart(sf));}
}
outer.parameters.forEach(p=>bind(p.name));
for(const statement of stmts){
 if(ts.isVariableStatement(statement)){
  for(const dec of statement.declarationList.declarations)
   if(ts.isIdentifier(dec.name)){byName.set(dec.name.text,statement);bind(dec.name);}
 }else if(ts.isFunctionDeclaration(statement)&&statement.name){
  byName.set(statement.name.text,statement);bind(statement.name);
 }
}
const needed=new Set(),fragments=new Map(),patches=[];
const imported=sf.statements.filter(ts.isImportDeclaration).map(s=>s.getText(sf)).join('\n');
function extract(node,overrides=[]){
 const start=node.getStart(sf),end=node.end,changes=[...overrides];
 const excludes=overrides.map(([from,to])=>[from,to]);
 function visit(child){
  if(excludes.some(([from,to])=>child.getStart(sf)>=from&&child.end<=to))return;
  if(ts.isShorthandPropertyAssignment(child)){
   const sym=checker.getShorthandAssignmentValueSymbol(child),name=sym&&symbols.get(sym);
   if(name){needed.add(name);changes.push([child.getStart(sf),child.end,name+':owner.'+name]);return;}
  }
  if(ts.isIdentifier(child)){
   const sym=checker.getSymbolAtLocation(child),name=sym&&symbols.get(sym);
   if(name&&!declStarts.has(child.getStart(sf))){
    needed.add(name);changes.push([child.getStart(sf),child.end,'owner.'+name]);
   }
  }
  ts.forEachChild(child,visit);
 }
 visit(node);
 changes.sort((a,b)=>b[0]-a[0]);
 let result=src.slice(start,end);
 for(const [from,to,content] of changes){
  if(from<start||to>end)throw Error('P47-6 transformation span out of range');
  result=result.slice(0,from-start)+content+result.slice(to-start);
 }
 return result;
}
function add(file,code){if(!fragments.has(file))fragments.set(file,[]);fragments.get(file).push(code);}
function moveFunction(name,file,target){
 const n=byName.get(name);if(!ts.isFunctionDeclaration(n))throw Error('Missing function '+name);
 const params=n.parameters.map(p=>p.getText(sf)).join(',');
 const args=n.parameters.map(p=>p.name.getText(sf)).join(',');
 let moved=extract(n).replace('function '+name+'(', 'export function '+target+'(owner:CoordinatorContext'+(params?',':''));
 moved=moved.replace(/^async export function /,'export async function ');
 if(!moved.includes('function '+target+'('))throw Error('P47-6 function conversion '+name);
 add(file,moved);
 const returns=n.type?.getText(sf)??'void';
 const wrapper=(n.modifiers?.some(x=>x.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'')+
   'function '+name+'('+params+'):'+returns+'{return '+target+'(owner'+(args?','+args:'')+');}';
 patches.push([n.getStart(sf),n.end,wrapper]);
}
function moveArrow(name,file,target){
 const stmt=byName.get(name),decl=stmt?.declarationList?.declarations?.find(d=>d.name.getText(sf)===name);
 const init=decl?.initializer;
 if(!init||!ts.isArrowFunction(init)||stmt.declarationList.declarations.length!==1)
  throw Error('Expected arrow '+name);
 const params=init.parameters.map(p=>p.getText(sf)).join(',');
 const args=init.parameters.map(p=>p.name.getText(sf)).join(',');
 const resultType=init.type?':'+init.type.getText(sf):'';
 const asynchronous=init.modifiers?.some(x=>x.kind===ts.SyntaxKind.AsyncKeyword)?'async ':'';
 add(file,'export const '+target+'='+asynchronous+'(owner:CoordinatorContext'+(params?','+params:'')+')'+
   resultType+'=>'+extract(init.body)+';');
 patches.push([stmt.getStart(sf),stmt.end,
   'const '+name+'=('+params+')'+resultType+'=>'+target+'(owner'+(args?','+args:'')+');']);
}
const functionMoves=[
 ['listHTML','library-controller.ts','renderLibraryHTML'],
 ['packageForAttempt','result-controller.ts','packageForResult'],
 ['examHTML','exam-controller.ts','renderCurrentExamHTML'],
 ['resultHTML','result-controller.ts','renderCurrentResultHTML'],
 ['activateRoute','route-controller.ts','activateWorkspaceRoute'],
 ['dispatchVisibility','lifecycle-controller.ts','dispatchWorkspaceVisibility'],
 ['cleanup','lifecycle-controller.ts','disposeWorkspace']
];
for(const args of functionMoves)moveFunction(...args);
const arrowMoves=[
 ['dispatch','exam-controller.ts','dispatchExamEvent'],
 ['downloadBackup','persistence-controller.ts','downloadHistoryBackup'],
 ['importHistory','persistence-controller.ts','importHistoryBackup'],
 ['writeMirror','persistence-controller.ts','writeEmergencyMirror'],
 ['save','persistence-controller.ts','saveWorkspaceRecord'],
 ['removeSavedAttempt','persistence-controller.ts','removeWorkspaceAttempt'],
 ['deleteAllCompleted','persistence-controller.ts','deleteCompletedWorkspaceAttempts'],
 ['showStorageEstimate','persistence-controller.ts','showWorkspaceStorageEstimate'],
 ['requestPersistentStorage','persistence-controller.ts','requestWorkspacePersistentStorage'],
 ['applyFamily','library-controller.ts','applyLibraryFamily'],
 ['saveSelection','library-controller.ts','persistLibrarySelection'],
 ['changeHistoryQuery','history-controller.ts','changeHistoryFilters'],
 ['go','route-controller.ts','navigateWorkspace'],
 ['storageSnapshot','persistence-controller.ts','workspaceStorageHealth'],
 ['updateStorageHealth','persistence-controller.ts','updateWorkspaceStorageHealth'],
 ['recordStorageFailure','persistence-controller.ts','reportWorkspaceStorageFailure'],
 ['notice','screen-controller.ts','reportWorkspaceNotice'],
 ['visibility','lifecycle-controller.ts','handleWorkspaceVisibility'],
 ['keyboard','lifecycle-controller.ts','handleWorkspaceKeyboard'],
 ['pagehide','lifecycle-controller.ts','checkpointWorkspacePagehide'],
 ['storage','lifecycle-controller.ts','detectConcurrentStorageChange'],
 ['addNotebookCard','learning-controller.ts','addLearningNotebookCard'],
 ['addResultCards','learning-controller.ts','addLearningResultCards']
];
for(const args of arrowMoves)moveArrow(...args);
for(const [name,file,target,factory] of [
 ['authoringStudio','authoring-controller.ts','createWorkspaceAuthoringStudio','createQuestionAuthoringStudio'],
 ['learningDesk','learning-controller.ts','createWorkspaceLearningDesk','createLearningDesk']
]){
 const stmt=byName.get(name),init=stmt.declarationList.declarations[0].initializer;
 add(file,'export function '+target+'(owner:CoordinatorContext):ReturnType<typeof '+factory+
  '>{return '+extract(init)+';}');
 patches.push([stmt.getStart(sf),stmt.end,'let '+name+':ReturnType<typeof '+factory+'>;']);
 needed.add(name);
}
const timerStatement=byName.get('timer'),timerInit=timerStatement.declarationList.declarations[0].initializer;
add('lifecycle-controller.ts','export function startWorkspaceTimer(owner:CoordinatorContext):number{return '+
  extract(timerInit)+';}');
patches.push([timerStatement.getStart(sf),timerStatement.end,'let timer:number=0;']);
const hydrate=stmts.filter(ts.isExpressionStatement).find(s=>s.getText(sf).startsWith('(async()=>'));
if(!hydrate)throw Error('Expected IndexedDB/fallback hydration');
add('persistence-controller.ts','export function hydrateWorkspaceStorage(owner:CoordinatorContext):void{\n'+
 extract(hydrate)+'\n}');
patches.push([hydrate.getStart(sf),hydrate.end,'hydrateWorkspaceStorage(owner);']);
const draw=byName.get('draw'),nodes=draw.body.statements;
const statement=filter=>nodes.find(s=>ts.isIfStatement(s)&&s.expression.getText(sf)===filter);
const history=statement('view==="history"'),library=statement('view==="library"');
const result=statement('view==="result"&&attempt');
const examIndex=nodes.findIndex(s=>ts.isIfStatement(s)&&s.expression.getText(sf)==='view!=="exam"||!attempt');
if(!history||!library||!result||examIndex<0)throw Error('Changed renderer boundaries');
for(const [n,file,target] of [
 [history,'history-controller.ts','bindHistoryScreen'],
 [library,'library-controller.ts','bindLibraryScreen'],
 [result,'result-controller.ts','bindResultScreen']
]){
 const body=extract(n.thenStatement).slice(1,-1);
 add(file,'export function '+target+'(owner:CoordinatorContext):void{\n'+body+'\n}');
}
const examNodes=nodes.slice(examIndex+1);
let examBody=examNodes.map(n=>extract(n)).join('\n');
examBody=examBody.replaceAll('owner.attempt.frozen','owner.attempt!.frozen')
 .replaceAll('owner.attempt.state','owner.attempt!.state');
add('exam-controller.ts','export function bindExamScreen(owner:CoordinatorContext):void{\n'+examBody+'\n}');
const alters=[
 [history.getStart(sf),history.end,'if(owner.view==="history"){bindHistoryScreen(owner);return;}'],
 [library.getStart(sf),library.end,'if(owner.view==="library"){bindLibraryScreen(owner);return;}'],
 [result.getStart(sf),result.end,'if(owner.view==="result"&&owner.attempt){bindResultScreen(owner);return;}'],
 [examNodes[0].getStart(sf),examNodes.at(-1).end,'bindExamScreen(owner);']
];
add('screen-controller.ts',extract(draw,alters).replace('function draw(',
 'export function drawWorkspaceScreen(owner:CoordinatorContext,'));
patches.push([draw.getStart(sf),draw.end,'function draw():void{drawWorkspaceScreen(owner);}']);
needed.add('builtins');
fragments.set('result-controller.ts',fragments.get('result-controller.ts')
 .map(x=>x.replace('cachedCglPackages(owner.sources,owner.patches,owner.solutions)','owner.builtins')));
const contextFields=[],contextGetters=[];
for(const name of [...needed].sort()){
 const node=outer.parameters.find(p=>p.name.getText(sf)===name)?.name??
  stmts.flatMap(s=>ts.isVariableStatement(s)?s.declarationList.declarations:[])
   .find(d=>d.name.getText(sf)===name)?.name??
  stmts.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text===name)?.name;
 if(!node)throw Error('Missing capability '+name);
 const sym=checker.getSymbolAtLocation(node),type=checker.getTypeOfSymbolAtLocation(sym,node);
 let typename=checker.typeToString(type,node,
  ts.TypeFormatFlags.NoTruncation|ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
 if(name==='sources')typename='SourcePaperBank';
 if(name==='patches')typename='ReviewPatchBank';
 if(name==='families')typename='()=>ExamFamily[]';
 if(['mirrorKey','storageKey','dbName','historyQueryKey'].includes(name))typename='string';
 const statement=byName.get(name);
 const mutable=statement&&ts.isVariableStatement(statement)&&
  ((statement.declarationList.flags&ts.NodeFlags.Const)===0);
 contextFields.push(' '+(mutable?'':'readonly ')+name+':'+typename+';');
 contextGetters.push(' get '+name+'(){return '+name+';},'+
  (mutable?'set '+name+'(value){'+name+'=value;},':''));
}
const contextHeader=[
 'import type {ExamFamily} from "./exam-families.ts";',
 'import type {PaperRevisionId} from "../domain/ids.ts";',
 'import type {ScreenRenderer} from "./screen-renderer.ts";',
 'import type {ImageViewer} from "./image-viewer.ts";',
 'import type {ImagePreparation} from "./image-preparation.ts";',
 'import type {AuthoringStudioController} from "../authoring/authoring-studio.ts";'
].join('\n');
const extra={ 'screen-controller.ts':[
 'import {bindHistoryScreen} from "./history-controller.ts";',
 'import {bindLibraryScreen} from "./library-controller.ts";',
 'import {bindResultScreen} from "./result-controller.ts";',
 'import {bindExamScreen} from "./exam-controller.ts";'].join('\n')};
const files={};
files['coordinator-context.ts']='/** Single typed capability owner; mutable backing state is never cloned. */\n'+
 imported+'\n'+contextHeader+'\nexport interface CoordinatorContext{\n'+contextFields.join('\n')+'\n}\n';
for(const [file,blocks] of fragments)files[file]='/** P47-6 module: '+file+' */\n'+
 imported+'\nimport type {CoordinatorContext} from "./coordinator-context.ts";\n'+
 (extra[file]??'')+'\n'+blocks.join('\n\n')+'\n';
const ownerCode='\n const owner:CoordinatorContext={\n'+contextGetters.join('\n')+'\n };\n'+
 ' authoringStudio=createWorkspaceAuthoringStudio(owner);\n'+
 ' learningDesk=createWorkspaceLearningDesk(owner);\n'+
 ' timer=startWorkspaceTimer(owner);\n';
const insertion=src.indexOf(' router=createNativeRouter(activateRoute);',outer.getStart(sf));
if(insertion<0)throw Error('Missing router start');
patches.push([insertion,insertion,ownerCode]);
patches.sort((a,b)=>b[0]-a[0]);
let output=src;
for(const [from,to,value] of patches)output=output.slice(0,from)+value+output.slice(to);
const newImports=[
 'import {createWorkspaceAuthoringStudio} from "./authoring-controller.ts";',
 'import {createWorkspaceLearningDesk,addLearningNotebookCard,addLearningResultCards} from "./learning-controller.ts";',
 'import {startWorkspaceTimer,handleWorkspaceVisibility,handleWorkspaceKeyboard,checkpointWorkspacePagehide,detectConcurrentStorageChange,dispatchWorkspaceVisibility,disposeWorkspace} from "./lifecycle-controller.ts";',
 'import type {CoordinatorContext} from "./coordinator-context.ts";',
 'import {renderLibraryHTML,bindLibraryScreen,applyLibraryFamily,persistLibrarySelection} from "./library-controller.ts";',
 'import {packageForResult,renderCurrentResultHTML,bindResultScreen} from "./result-controller.ts";',
 'import {renderCurrentExamHTML,dispatchExamEvent,bindExamScreen} from "./exam-controller.ts";',
 'import {activateWorkspaceRoute,navigateWorkspace} from "./route-controller.ts";',
 'import {drawWorkspaceScreen,reportWorkspaceNotice} from "./screen-controller.ts";',
 'import {bindHistoryScreen,changeHistoryFilters} from "./history-controller.ts";',
 'import {downloadHistoryBackup,importHistoryBackup,writeEmergencyMirror,saveWorkspaceRecord,removeWorkspaceAttempt,deleteCompletedWorkspaceAttempts,showWorkspaceStorageEstimate,requestWorkspacePersistentStorage,workspaceStorageHealth,updateWorkspaceStorageHealth,reportWorkspaceStorageFailure,hydrateWorkspaceStorage} from "./persistence-controller.ts";'
].join('\n');
const anchor=output.indexOf('let builtinCache:');
if(anchor<0)throw Error('Missing cache boundary');
output=output.slice(0,anchor)+newImports+'\n\n'+output.slice(anchor);
for(const [file,data] of Object.entries(files))writeFileSync('src/app/'+file,data);
writeFileSync(path,output);
console.log('P47-6 generated',Object.keys(files).length,'independent modules; coordinator lines',output.split('\n').length,'context capabilities',needed.size);
