/** Test helper: choose a real paper through the user-visible edition filter.
 * Off-edition options must NOT be kept in the select just for old tests.
 */
async function selectCglFamily(page){
 await page.locator("#g-family").selectOption("builtin:ssc-cgl");
 await page.waitForFunction(()=>Boolean(
  document.querySelector('[data-edition="source"]')&&
  document.querySelector('[data-edition="reviewed"]')&&
  document.querySelector("#g-papers option")
 ));
}
export async function chooseModernPaper(page,id){
 const available=()=>page.locator("#g-papers option").evaluateAll((opts,want)=>
  opts.some(o=>o.value===want),id);
 if(!id.includes("cgl-")){
  if(!await available())await page.waitForFunction(want=>
   [...document.querySelectorAll("#g-papers option")].some(o=>o.value===want),id);
  await page.locator("#g-papers").selectOption(id);
  return;
 }
 if(!await available())await selectCglFamily(page);
 if(!await available()){
  for(const edition of ["source","reviewed"]){
   await page.getByRole("button",{name:new RegExp("^"+edition+"$","i")}).click();
   if(await available())break;
  }
 }
 if(!await available())throw Error("Paper not offered in either edition: "+id);
 await page.locator("#g-papers").selectOption(id);
}
export async function findModernPaper(page,edition,predicate){
 if(!(await page.getByRole("button",{name:new RegExp("^"+edition+"$","i")}).count()))
  await selectCglFamily(page);
 await page.getByRole("button",{name:new RegExp("^"+edition+"$","i")}).click();
 const options=await page.locator("#g-papers option").evaluateAll(opts=>
  opts.map(o=>({value:o.value,text:o.textContent??""})));
 const matching=options.find(o=>predicate(o));
 if(!matching)throw Error("No visible "+edition+" paper matches predicate");
 return matching.value;
}
