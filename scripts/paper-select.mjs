/** Test helper: choose a real paper through the user-visible edition filter.
 * Off-edition options must NOT be kept in the select just for old tests.
 */
export async function chooseModernPaper(page,id){
 const available=()=>page.locator("#g-papers option").evaluateAll((opts,want)=>
  opts.some(o=>o.value===want),id);
 if(!await available()){
  for(const edition of ["source","reviewed"]){
   await page.locator('[data-edition="'+edition+'"]').click();
   if(await available())break;
  }
 }
 if(!await available())throw Error("Paper not offered in either edition: "+id);
 await page.locator("#g-papers").selectOption(id);
}
export async function findModernPaper(page,edition,predicate){
 await page.locator('[data-edition="'+edition+'"]').click();
 const options=await page.locator("#g-papers option").evaluateAll(opts=>
  opts.map(o=>({value:o.value,text:o.textContent??""})));
 const matching=options.find(o=>predicate(o));
 if(!matching)throw Error("No visible "+edition+" paper matches predicate");
 return matching.value;
}
