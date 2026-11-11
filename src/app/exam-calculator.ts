import {escapeText} from "./html-escape.ts";
import {calculatorPress,type CalculatorKey,type ExamCalculatorState} from "../domain/calculator.ts";

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
    '<output id="g-calculator-display" class="calc-display" tabindex="0" aria-label="Calculator display" aria-live="polite">'+
      escapeText(state.display)+'</output>'+
    '<div class="calc-memory" role="group" aria-label="Calculator memory">'+
      key("mc","MC","","Clear memory")+key("mr","MR","","Recall memory")+
      key("ms","MS","","Store displayed value in memory")+
      key("mplus","M+","","Add displayed value to memory")+
      key("mminus","M−","","Subtract displayed value from memory")+
    '</div><div class="calc-grid" role="group" aria-label="Calculator keypad">'+
      key("backspace","⌫","calc-function","Backspace")+key("clear","C","calc-clear","Clear calculation")+
      key("sign","+/−","calc-function","Change sign")+key("sqrt","√","calc-function","Square root")+
      key("7","7")+key("8","8")+key("9","9")+key("/","÷","calc-operator","Divide")+
      key("4","4")+key("5","5")+key("6","6")+key("*","×","calc-operator","Multiply")+
      key("1","1")+key("2","2")+key("3","3")+key("-","−","calc-operator","Subtract")+
      key("0","0")+key(".",".","","Decimal point")+key("percent","%","calc-function","Percent")+
      key("+","+","calc-operator","Add")+key("reciprocal","1/x","calc-function","Reciprocal")+
      key("equals","=","calc-equals","Equals")+
    '</div></section>';
}

const keyboardKey=(event:KeyboardEvent):CalculatorKey|null=>{
  if(/^\d$/.test(event.key))return event.key as CalculatorKey;
  if(["+","-","*","/","."].includes(event.key))return event.key as CalculatorKey;
  if(event.key==="x"||event.key==="X")return "*";
  if(event.key==="%")return "percent";
  if(event.key==="Backspace")return "backspace";
  if(event.key==="Delete")return "clear";
  if(event.key==="Enter"||event.key==="=")return "equals";
  return null;
};

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
  const close=():void=>{commit({...current,open:false});toggle.focus();};
  toggle.onclick=()=>{
    const opening=!current.open;
    commit({...current,open:opening});
    if(opening)output.focus();
  };
  root.querySelector<HTMLButtonElement>("[data-calc-close]")!.onclick=close;
  root.querySelectorAll<HTMLButtonElement>("[data-calc-key]").forEach(button=>{
    button.onclick=()=>commit(calculatorPress(current,button.dataset.calcKey as CalculatorKey));
  });
  panel.onkeydown=event=>{
    if(event.ctrlKey||event.metaKey||event.altKey)return;
    // Calculator keystrokes must never bubble into exam-answer shortcuts.
    event.stopPropagation();
    if(event.key==="Escape"){event.preventDefault();close();return;}
    // Preserve ordinary Enter/Space activation when focus is on a real key.
    if(event.target!==output)return;
    const mapped=keyboardKey(event);
    if(!mapped)return;
    event.preventDefault();commit(calculatorPress(current,mapped));
  };
}
