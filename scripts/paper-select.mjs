/** Test helper: discover papers through user-visible family and edition controls.
 * It deliberately knows no exam IDs, family IDs or paper-id prefixes.
 */
const offered=async(page,id)=>page.locator("#g-papers option").evaluateAll((opts,want)=>
 opts.some(o=>o.value===want),id);
const familyValues=async page=>page.locator("#g-family option").evaluateAll(opts=>
 opts.map(o=>o.value).filter(Boolean));
const editionValues=async page=>page.locator("[data-edition]").evaluateAll(nodes=>
 [...new Set(nodes.map(node=>node.getAttribute("data-edition")).filter(Boolean))]);

async function exposePaper(page,id){
 if(await offered(page,id))return true;
 for(const family of await familyValues(page)){
  await page.locator("#g-family").selectOption(family);
  if(await offered(page,id))return true;
  for(const edition of await editionValues(page)){
   const button=page.locator('[data-edition="'+edition+'"]');
   if(await button.count())await button.click();
   if(await offered(page,id))return true;
  }
 }
 return false;
}
export async function chooseModernPaper(page,id){
 if(!await exposePaper(page,id))throw Error("Paper not offered by any installed family/edition: "+id);
 await page.locator("#g-papers").selectOption(id);
}
export async function findModernPaper(page,edition,predicate){
 for(const family of await familyValues(page)){
  await page.locator("#g-family").selectOption(family);
  const button=page.locator('[data-edition="'+edition+'"]');
  if(!(await button.count()))continue;
  await button.click();
  const options=await page.locator("#g-papers option").evaluateAll(opts=>
   opts.map(o=>({value:o.value,text:o.textContent??""})));
  const matching=options.find(o=>predicate(o));
  if(matching)return matching.value;
 }
 throw Error("No visible "+edition+" paper matches predicate in any installed family");
}
