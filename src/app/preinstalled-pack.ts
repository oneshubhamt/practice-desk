import {hashJson} from "../domain/hash.ts";
import type {ExamPackage} from "../domain/exam-package.ts";
import type {QuestionContent,QuestionRevision,ImageAsset,StimulusDefinition} from "../domain/question.ts";
import type {PreinstalledExamCatalog} from "./preinstalled-exams.ts";

export const PREINSTALLED_PACKED_FORMAT="practice-desk-preinstalled-packed" as const;
type PackedQuestion=Omit<QuestionRevision,"content">&{readonly contentRef:string};
type PackedPackage=Omit<ExamPackage,"questions"|"assets"|"stimuli">&{
 readonly questions:readonly PackedQuestion[];
 readonly assetRefs:readonly string[];
 readonly stimulusRefs:readonly string[];
};
export interface PackedPreinstalledExamCatalog{
 readonly format:typeof PREINSTALLED_PACKED_FORMAT;
 readonly version:1;
 readonly families:PreinstalledExamCatalog["families"];
 readonly contentTable:Readonly<Record<string,QuestionContent>>;
 readonly assetTable:Readonly<Record<string,ImageAsset>>;
 readonly stimulusTable:Readonly<Record<string,StimulusDefinition>>;
 readonly packages:readonly PackedPackage[];
}
const remember=<T>(table:Record<string,T>,value:T):string=>{
 const key=hashJson(value),prior=table[key];
 if(prior!==undefined&&JSON.stringify(prior)!==JSON.stringify(value))
  throw Error("Content-address collision in embedded exam catalog");
 if(prior===undefined)table[key]=value;
 return key;
};
export function packPreinstalledExamCatalog(catalog:PreinstalledExamCatalog):PackedPreinstalledExamCatalog{
 const contentTable:Record<string,QuestionContent>={},assetTable:Record<string,ImageAsset>={},
  stimulusTable:Record<string,StimulusDefinition>={};
 const packages=catalog.packages.map(pkg=>{
  const {questions,assets,stimuli,...rest}=pkg;
  return {...rest,
   questions:questions.map(q=>{const {content,...meta}=q;return {...meta,contentRef:remember(contentTable,content)};}),
   assetRefs:(assets??[]).map(asset=>remember(assetTable,asset)),
   stimulusRefs:(stimuli??[]).map(stimulus=>remember(stimulusTable,stimulus))
  };
 });
 return {format:PREINSTALLED_PACKED_FORMAT,version:1,families:catalog.families,
  contentTable,assetTable,stimulusTable,packages};
}
const record=(value:unknown,label:string):Record<string,unknown>=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(label+" must be an object");
 return value as Record<string,unknown>;
};
const refs=(value:unknown,label:string):string[]=>{
 if(!Array.isArray(value)||value.some(x=>typeof x!=="string"))throw Error(label+" must be string references");
 return value as string[];
};
export function unpackPreinstalledExamCatalog(value:unknown):unknown{
 if(!value||typeof value!=="object"||Array.isArray(value)||
   (value as Record<string,unknown>).format!==PREINSTALLED_PACKED_FORMAT)return value;
 const packed=record(value,"Packed preinstalled catalog");
 if(packed.version!==1||!Array.isArray(packed.families)||!Array.isArray(packed.packages))
  throw Error("Unsupported packed preinstalled exam catalog");
 const contents=record(packed.contentTable,"Packed question-content table"),
  assets=record(packed.assetTable,"Packed asset table"),
  stimuli=record(packed.stimulusTable,"Packed stimulus table");
 const packages=(packed.packages as unknown[]).map((raw,index)=>{
  const row=record(raw,"Packed package "+index),
   questionRows=Array.isArray(row.questions)?row.questions:[],
   assetRefs=refs(row.assetRefs,"Packed package asset refs"),
   stimulusRefs=refs(row.stimulusRefs,"Packed package stimulus refs");
  if(!Array.isArray(row.questions))throw Error("Packed package questions must be an array");
  const questions=questionRows.map((rawQuestion,qIndex)=>{
   const q=record(rawQuestion,"Packed question "+qIndex),contentRef=q.contentRef;
   if(typeof contentRef!=="string"||contents[contentRef]===undefined)throw Error("Missing packed question content");
   const {contentRef:_ref,...meta}=q;return {...meta,content:contents[contentRef]};
  });
  const resolve=(table:Record<string,unknown>,ref:string,label:string)=>{
   const item=table[ref];if(item===undefined)throw Error("Missing packed "+label);return item;
  };
  const {assetRefs:_assets,stimulusRefs:_stimuli,questions:_questions,...rest}=row;
  return {...rest,questions,
   assets:assetRefs.map(ref=>resolve(assets,ref,"asset")),
   stimuli:stimulusRefs.map(ref=>resolve(stimuli,ref,"stimulus"))};
 });
 return {format:"practice-desk-preinstalled-exams",version:1,families:packed.families,packages};
}
