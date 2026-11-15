/** Question-bank catalog lifecycle: removal must not strand the offline app. */
export async function catalogLifecycle(){
 const {mkdtemp,writeFile,readFile,rm}=await import("node:fs/promises");
 const {join}=await import("node:path");
 const {tmpdir}=await import("node:os");
 const {pathToFileURL}=await import("node:url");
 const {openHarness,check,root}=await import("../../browser/fixtures.mjs");
 const {buildPracticeDeskHtml}=await import("../../build-target.mjs");
 const catalog=JSON.parse(await readFile(join(root,"question-banks","catalog.json"),"utf8"));
 for(const family of catalog.families)family.preinstalled=false;
 const built=await buildPracticeDeskHtml("standalone",{catalogOverride:catalog});
 const dir=await mkdtemp(join(tmpdir(),"pd-empty-catalog-")),file=join(dir,"Practice-Desk-empty.html");
 await writeFile(file,built.html);
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 try{
  const {page,errors}=await h.open({url:pathToFileURL(file).href});
  check(await page.locator("#g-family option").count()===0,"Empty catalog rendered a phantom exam family");
  check(await page.locator("#g-papers option").count()===1,"Empty catalog did not render one neutral paper placeholder");
  check(await page.locator("#g-start").isDisabled(),"Empty catalog enabled Start without a paper");
  check(!(await page.locator("#g-import").isDisabled()),"Empty catalog disabled package import");
  check((await page.locator(".generic-warning").innerText()).includes("No examination bank is installed"),
   "Empty Library did not explain the removable-bank state");
  const pkg=await readFile(join(root,"question-banks","pfrda","2026","mocks","day-01","revised","package.exam.json"),"utf8");
  await page.locator("#g-file").setInputFiles({name:"pfrda-day1.json",mimeType:"application/json",buffer:Buffer.from(pkg)});
  await page.waitForFunction(()=>document.querySelectorAll("#g-family option").length===1);
  check((await page.locator("#g-family option").first().innerText()).includes("pfrda-grade-a-2026-phase-ii"),
   "Import into an empty Library did not create the PFRDA family");
  check(!(await page.locator("#g-start").isDisabled()),"Imported paper did not become startable");
  check(errors.length===0,"Empty-catalog lifecycle produced browser errors: "+errors.join(" / "));
  console.log("QUESTION BANK LIFECYCLE PASS "+engine+": zero preinstalls boots, import remains usable");
 }catch(error){throw error;}
 finally{await h.finish();await rm(dir,{recursive:true,force:true});}
}
