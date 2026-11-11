import {escapeText} from "./html-escape.ts";

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
  if(key==="mplus")return state.error?state:{...state,memory:state.memory+read(state)};
  if(key==="mminus")return state.error?state:{...state,memory:state.memory-read(state)};
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

export function calculatorToggleHTML(state:ExamCalculatorState):string{
  return '<button class="btn exam-calculator-toggle" type="button" id="g-calculator" '+
    'aria-controls="g-calculator-panel" aria-expanded="'+state.open+'">▦ Calculator</button>';
}
const key=(value:CalculatorKey,label:string,extra="",ariaLabel?:string)=>
  '<button type="button" class="calc-key '+extra+'" data-calc-key="'+value+'"'+
  (ariaLabel?' aria-label="'+escapeText(ariaLabel)+'"':"")+'>'+escapeText(label)+'</button>';

export function calculatorPanelHTML(state:ExamCalculatorState):string{
  return '<section class="exam-calculator" id="g-calculator-panel" role="dialog" aria-label="Basic calculator"'+
    (state.open?"":' hidden')+'><div class="calc-title"><strong>Calculator</strong>'+
    '<button type="button" class="calc-close" data-calc-close aria-label="Close calculator">×</button></div>'+
    '<output id="g-calculator-display" class="calc-display" aria-live="polite">'+escapeText(state.display)+'</output>'+
    '<div class="calc-memory" aria-label="Calculator memory">'+
      key("mc","MC")+key("mr","MR")+key("ms","MS")+key("mplus","M+")+key("mminus","M−")+
    '</div><div class="calc-grid">'+
      key("backspace","⌫","calc-function","Backspace")+key("clear","C","calc-clear","Clear")+
      key("sign","+/−","calc-function","Change sign")+key("sqrt","√","calc-function","Square root")+
      key("7","7")+key("8","8")+key("9","9")+key("/","÷","calc-operator")+
      key("4","4")+key("5","5")+key("6","6")+key("*","×","calc-operator")+
      key("1","1")+key("2","2")+key("3","3")+key("-","−","calc-operator")+
      key("0","0")+key(".",".")+key("percent","%","calc-function","Percent")+key("+","+","calc-operator","Add")+
      key("reciprocal","1/x","calc-function","Reciprocal")+key("equals","=","calc-equals","Equals")+
    '</div></section>';
}

export function bindExamCalculator(
  root:HTMLElement,state:ExamCalculatorState,onChange:(next:ExamCalculatorState)=>void
):void{
  const toggle=root.querySelector<HTMLButtonElement>("#g-calculator");
  const panel=root.querySelector<HTMLElement>("#g-calculator-panel");
  const output=root.querySelector<HTMLOutputElement>("#g-calculator-display");
  if(!toggle||!panel||!output)return;
  let current=state;
  const refresh=():void=>{
    panel.hidden=!current.open;
    toggle.setAttribute("aria-expanded",String(current.open));
    output.textContent=current.display;
  };
  const commit=(next:ExamCalculatorState):void=>{current=next;onChange(next);refresh();};
  toggle.onclick=()=>commit({...current,open:!current.open});
  root.querySelector<HTMLButtonElement>("[data-calc-close]")!.onclick=()=>{
    commit({...current,open:false});toggle.focus();
  };
  root.querySelectorAll<HTMLButtonElement>("[data-calc-key]").forEach(button=>{
    button.onclick=()=>commit(calculatorPress(current,button.dataset.calcKey as CalculatorKey));
  });
}
