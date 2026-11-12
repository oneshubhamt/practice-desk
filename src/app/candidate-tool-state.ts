import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
import {sha256} from "../domain/hash.ts";
import {BASIC_CALCULATOR_V1,newExamCalculatorState,
 type CalculatorOperator,type CalculatorProfile,type ExamCalculatorState} from "../domain/calculator.ts";

const PREFIX=STORAGE_TOPOLOGY.candidateToolsPrefix;
const OPERATORS=new Set<CalculatorOperator>(["+","-","*","/"]);
const MAX_DISPLAY=24;

export interface CandidateToolWorkspaceV1{
 readonly schema:1;
 readonly attemptId:string;
 readonly calculator:{
   readonly profile:CalculatorProfile;
   readonly state:ExamCalculatorState;
 };
}

export const candidateToolStorageKey=(attemptId:string):string=>
  PREFIX+sha256(attemptId).slice(0,32);

function validState(value:unknown):value is ExamCalculatorState{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const s=value as Record<string,unknown>;
 if(Object.keys(s).some(k=>!["open","display","accumulator","pending","replaceInput","memory","error"].includes(k)))
   return false;
 if(typeof s.open!=="boolean"||typeof s.display!=="string"||s.display.length<1||
   s.display.length>MAX_DISPLAY||typeof s.replaceInput!=="boolean"||
   typeof s.memory!=="number"||!Number.isFinite(s.memory)||typeof s.error!=="boolean")return false;
 if(s.accumulator!==null&&(typeof s.accumulator!=="number"||!Number.isFinite(s.accumulator)))return false;
 if(s.pending!==null&&(typeof s.pending!=="string"||!OPERATORS.has(s.pending as CalculatorOperator)))return false;
 if(s.error!== (s.display==="Error"))return false;
 if(s.error&&(s.accumulator!==null||s.pending!==null||s.replaceInput!==true))return false;
 if(!s.error){
   if(!/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s.display)||
      !Number.isFinite(Number(s.display)))return false;
 }
 return true;
}

export function parseCandidateToolWorkspace(
 value:unknown,attemptId:string,profile:CalculatorProfile
):ExamCalculatorState|null{
 if(!value||typeof value!=="object"||Array.isArray(value))return null;
 const row=value as Record<string,unknown>;
 if(Object.keys(row).some(k=>!["schema","attemptId","calculator"].includes(k))||
   row.schema!==1||row.attemptId!==attemptId||!row.calculator||
   typeof row.calculator!=="object"||Array.isArray(row.calculator))return null;
 const calc=row.calculator as Record<string,unknown>;
 if(Object.keys(calc).some(k=>!["profile","state"].includes(k))||
   calc.profile!==profile||!validState(calc.state))return null;
 return calc.state;
}

/** Best-effort candidate workspace recovery. It is deliberately separate from
 * attempts/backups/scoring; failure must never make an exam unsavable. */
export function readCalculatorWorkspace(
 storage:Pick<Storage,"getItem">,attemptId:string,profile:CalculatorProfile
):ExamCalculatorState{
 try{
   const raw=storage.getItem(candidateToolStorageKey(attemptId));
   if(!raw)return newExamCalculatorState();
   return parseCandidateToolWorkspace(JSON.parse(raw),attemptId,profile)??newExamCalculatorState();
 }catch{return newExamCalculatorState();}
}
export function writeCalculatorWorkspace(
 storage:Pick<Storage,"setItem">,attemptId:string,profile:CalculatorProfile,state:ExamCalculatorState
):boolean{
 try{
   const row:CandidateToolWorkspaceV1={schema:1,attemptId,calculator:{profile,state}};
   storage.setItem(candidateToolStorageKey(attemptId),JSON.stringify(row));
   return true;
 }catch{return false;}
}
export function clearCandidateToolWorkspace(
 storage:Pick<Storage,"removeItem">,attemptId:string
):void{
 try{storage.removeItem(candidateToolStorageKey(attemptId));}catch{}
}

export const CURRENT_CALCULATOR_PROFILE=BASIC_CALCULATOR_V1;
