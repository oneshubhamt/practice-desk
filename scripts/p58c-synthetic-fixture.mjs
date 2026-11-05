/** P58-C near-realistic, deterministic, PUBLICLY SYNTHETIC scale fixture.
 * All prompts and citations are illustrative; these are not APFC PYQs.
 * The source operates at the declared staging ceiling (8 × 50 = 400).
 */
export const P58C_KINDS=["single-choice","multiple-select","numeric-entry","true-false","matching","free-response"];
const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/tAAAAABJRU5ErkJggg==";
export function makeP58cSources({files=8,each=50,duplicates=false,media=true}={}){
 if(!Number.isInteger(files)||files<1||files>8||!Number.isInteger(each)||each<1||files*each>400)
  throw Error("Unsupported synthetic scale");
 return Array.from({length:files},(_,bank)=>{
  const bankId="stress"+String(bank+1).padStart(2,"0");
  const images=media?[{id:"figure",dataUri:"data:image/png;base64,"+png,
   altText:"Synthetic 1px fixture for "+bankId}]:[];
  const stimulus=media?[{id:"figurecontext",kind:"image",mediaRef:"figure",
   altText:"Synthetic fixture figure belonging to "+bankId}]:[];
  return {
   format:"practice-desk-authoring",version:1,bankId,examId:"upsc-epfo-apfc",
   paperId:"p58c-synthetic-apfc",title:"P58-C synthetic mixed 400-question stress",
   edition:"custom",revision:1,
   scoring:{correctMarks:2.5,incorrectMarks:-5/6},
   timing:{kind:"whole-paper",minutes:120,pausePolicy:"allowed"},
   navigation:{questionNavigation:"free",sectionNavigation:"free",allowReview:true},
   sections:[{id:"general",title:"Mixed sections"}],
   ...(media?{media:images,stimuli:stimulus}:{}),
   questions:Array.from({length:each},(_,i)=>{
    const kind=duplicates&&bank===0&&i<42?"single-choice":P58C_KINDS[(i+bank)%6];
    const id="q"+bank+"_"+String(i).padStart(3,"0");
    const stem=duplicates&&bank===0&&i<42?
      "The same synthetic premise is intentionally repeated to test the five hundred candidate duplicate cap.":
      "Synthetic scenario "+bank+" case "+i+" asks for the appropriate test response; this is not an official paper.";
    const base={id,examSection:"general",
     syllabusHeadingId:["labour","economy","accountancy"][i%3],
     topic:"Synthetic bounds test "+Math.floor(i/10),
     kind,prompt:stem,
     explanation:"This is a synthetic source and key, supplied solely to exercise the offline authoring and scoring pipeline.",
     provenance:{kind:"ai-original",sourceNote:"P58-C fictional fixture; not genuine exam data."},
     qa:{status:"unchecked"},
     ...(media&&i===0?{stimulusRef:"figurecontext"}:{})
    };
    if(kind==="single-choice")return {...base,options:["A synthetic","B synthetic","C synthetic","D synthetic"],answer:"B"};
    if(kind==="multiple-select")return {...base,options:["First","Second","Third","Fourth"],answer:"A,C",minSelections:1,maxSelections:3};
    if(kind==="numeric-entry")return {...base,answer:[i+1],tolerance:0};
    if(kind==="true-false")return {...base,answer:true};
    if(kind==="matching")return {...base,
     leftItems:["One","Two","Three","Four"],rightItems:["Two","Four","One","Three"],
     answer:"1-C,2-A,3-D,4-B",partialCreditEach:0.5,partialPenaltyEach:0.1};
    return {...base,answer:"Synthetic answer requires manual evaluator"};
   })
  };
 });
}
export function stageOf(sources,selectedCount=200){
 const files=sources.map((source,i)=>({name:"source-"+(i+1)+".json",source}));
 const ids=sources.flatMap(source=>source.questions.map(q=>source.bankId+"::"+q.id));
 if(selectedCount>ids.length||selectedCount<0)throw Error("Invalid selected count");
 return {schema:1,files,selected:ids.slice(0,selectedCount)};
}
