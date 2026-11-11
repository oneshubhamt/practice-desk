/**
 * Versioned, deterministic calculator semantics for candidate-facing exam tools.
 *
 * basic-v1 contract:
 * - binary operators execute immediately from left to right; there is no precedence stack
 * - equals executes the one pending binary operation once; repeated equals is a no-op
 * - percent is unary x/100 (not context-sensitive percentage-of-accumulator behaviour)
 * - sqrt and reciprocal are unary; sqrt(negative), reciprocal(0), and division by 0 produce Error
 * - input accepts at most 15 digits excluding sign/decimal point
 * - finite results are rounded through 12 significant digits for stable display
 * - C clears the active calculation but preserves memory and whether the panel is open
 * - MC/MR/MS/M+/M- are one finite memory register; overflowing memory arithmetic produces Error
 * - Backspace after a committed result/error begins from 0 rather than editing that result
 *
 * Any intentional behavioural change requires a new CalculatorProfile rather than silently
 * changing this contract, because the profile is hash-bound to the paper revision.
 */
export const BASIC_CALCULATOR_V1="basic-v1" as const;
export type CalculatorProfile=typeof BASIC_CALCULATOR_V1;
export type CalculatorOperator="+"|"-"|"*"|"/";
export type CalculatorKey=
  "0"|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"."|
  "+"|"-"|"*"|"/"|"equals"|"clear"|"backspace"|"sign"|"sqrt"|"percent"|"reciprocal"|
  "mc"|"mr"|"ms"|"mplus"|"mminus";

export interface ExamCalculatorState{
  readonly open:boolean;
  readonly display:string;
  readonly accumulator:number|null;
  readonly pending:CalculatorOperator|null;
  readonly replaceInput:boolean;
  readonly memory:number;
  readonly error:boolean;
}

export const newExamCalculatorState=():ExamCalculatorState=>({
  open:false,display:"0",accumulator:null,pending:null,replaceInput:false,memory:0,error:false
});

const read=(state:ExamCalculatorState):number=>{
  const value=Number(state.display);
  return Number.isFinite(value)?value:0;
};
const formatted=(value:number):string=>{
  if(!Number.isFinite(value))return "Error";
  const clean=Object.is(value,-0)?0:Number(value.toPrecision(12));
  const plain=String(clean);
  return plain.length<=15?plain:clean.toExponential(8).replace(/\.0+(?=e)/,"");
};
const failed=(state:ExamCalculatorState):ExamCalculatorState=>({
  ...state,display:"Error",accumulator:null,pending:null,replaceInput:true,error:true
});
const apply=(left:number,right:number,operator:CalculatorOperator):number=>{
  if(operator==="+")return left+right;
  if(operator==="-")return left-right;
  if(operator==="*")return left*right;
  return right===0?Number.NaN:left/right;
};
const show=(state:ExamCalculatorState,value:number,replaceInput=true):ExamCalculatorState=>{
  const display=formatted(value);
  return display==="Error"?failed(state):{...state,display,replaceInput,error:false};
};

export function calculatorPress(state:ExamCalculatorState,key:CalculatorKey):ExamCalculatorState{
  if(/^\d$/.test(key)){
    const digit=key;
    if(state.error||state.replaceInput||state.display==="0")
      return {...state,display:digit,replaceInput:false,error:false};
    if(state.display.replace("-","").replace(".","").length>=15)return state;
    return {...state,display:state.display+digit,error:false};
  }
  if(key==="."){
    if(state.error||state.replaceInput)return {...state,display:"0.",replaceInput:false,error:false};
    if(state.display.includes("."))return state;
    return {...state,display:state.display+".",replaceInput:false};
  }
  if(key==="clear")
    return {...newExamCalculatorState(),open:state.open,memory:state.memory};
  if(key==="backspace"){
    if(state.error||state.replaceInput)return {...state,display:"0",replaceInput:false,error:false};
    const next=state.display.length>1?state.display.slice(0,-1):"0";
    return {...state,display:next==="-"?"0":next};
  }
  if(key==="mc")return {...state,memory:0};
  if(key==="mr")return show(state,state.memory,true);
  if(key==="ms")return state.error?state:{...state,memory:read(state)};
  if(key==="mplus"||key==="mminus"){
    if(state.error)return state;
    const next=key==="mplus"?state.memory+read(state):state.memory-read(state);
    return Number.isFinite(next)?{...state,memory:next}:failed(state);
  }
  if(key==="sign")return state.error?state:show(state,-read(state),state.replaceInput);
  if(key==="sqrt"){
    const value=read(state);return value<0?failed(state):show(state,Math.sqrt(value));
  }
  if(key==="reciprocal"){
    const value=read(state);return value===0?failed(state):show(state,1/value);
  }
  if(key==="percent")return state.error?state:show(state,read(state)/100);
  if(key==="+"||key==="-"||key==="*"||key==="/"){
    if(state.error)return {...newExamCalculatorState(),open:state.open,memory:state.memory,
      accumulator:0,pending:key,replaceInput:true};
    if(state.pending&&state.accumulator!==null&&state.replaceInput)
      return {...state,pending:key};
    let value=read(state);
    if(state.pending&&state.accumulator!==null){
      value=apply(state.accumulator,value,state.pending);
      if(!Number.isFinite(value))return failed(state);
    }
    const display=formatted(value);
    return display==="Error"?failed(state):{...state,display,accumulator:value,pending:key,
      replaceInput:true,error:false};
  }
  if(key==="equals"){
    if(state.error||!state.pending||state.accumulator===null)return state;
    const value=apply(state.accumulator,read(state),state.pending);
    if(!Number.isFinite(value))return failed(state);
    const display=formatted(value);
    return {...state,display,accumulator:null,pending:null,replaceInput:true,error:false};
  }
  return state;
}
