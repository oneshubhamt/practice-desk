/** Question-bank catalog lifecycle: removal must not strand the offline app. */
export async function catalogLifecycle(){
 const {mkdtemp,writeFile,readFile,rm}=await import("node:fs/promises");
 const {join}=await import("node:path");
 const {tmpdir}=await import("node:os");
 const {pathToFileURL}=await import("node:url");
 const {openHarness,check,root}=await import("../../browser/fixtures.mjs");
 const {buildPracticeDeskHtml}=await import("../../build-target.mjs");
 const {importModernPaper}=await import("../../paper-select.mjs");
 const base=JSON.parse(await readFile(join(root,"question-banks","catalog.json"),"utf8"));
 const dir=await mkdtemp(join(tmpdir(),"pd-catalog-removal-"));
 const variant=async(name,disabled)=>{
  const catalog=structuredClone(base);
  for(const family of catalog.families)if(disabled.includes(family.id))family.preinstalled=false;
  const built=await buildPracticeDeskHtml("standalone",{catalogOverride:catalog});
  const file=join(dir,"Practice-Desk-"+name+".html");await writeFile(file,built.html);return file;
 };
 const noCgl=await variant("no-cgl",["ssc-cgl"]);
 const noPfrda=await variant("no-pfrda",["pfrda-grade-a-2026-phase-ii"]);
 const empty=await variant("empty",base.families.map(f=>f.id));
 const engine=process.argv[2]??"chromium";
 const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
 try{
  const pfrdaWordCountCase=async(mode,untimed,expected,label)=>{
   const {page,errors}=await h.open({url:pathToFileURL(noCgl).href});
   check((await page.locator("#g-family option").first().innerText()).includes("PFRDA Grade A 2026"),
    label+": preinstalled PFRDA family unavailable");
   await page.locator('[data-mode="'+mode+'"]').click();
   if(mode==="single")await page.locator("#g-single-section").selectOption("0");
   if(untimed)await page.locator("#g-untimed").check();
   await page.locator("#g-start").click();
   await page.locator("#g-text").waitFor({state:"visible"});
   const count=await page.locator("#g-word-count").count();
   check((count===1)===expected,label+": Auto word-count visibility was incorrect");
   if(expected){
    await page.locator("#g-text").fill("A concise four word answer");
    check((await page.locator("#g-word-count").innerText())==="5 / 120 words",
     label+": advisory word count did not update live");
   }
   check(errors.length===0,label+" produced browser errors: "+errors.join(" / "));
  };
  await pfrdaWordCountCase("strict",false,false,"PFRDA strict simulation");
  await pfrdaWordCountCase("free",false,true,"PFRDA flexible full-paper practice");
  await pfrdaWordCountCase("single",false,true,"PFRDA section practice");
  await pfrdaWordCountCase("strict",true,true,"PFRDA untimed strict-navigation practice");
  await pfrdaWordCountCase("free",true,true,"PFRDA untimed flexible practice");
  await pfrdaWordCountCase("single",true,true,"PFRDA untimed section practice");

  for(const [file,expected,absent] of [
   [noCgl,"PFRDA Grade A 2026","SSC CGL"],
   [noPfrda,"SSC CGL","PFRDA Grade A 2026"]
  ]){
   const {page,errors}=await h.open({url:pathToFileURL(file).href});
   check(await page.locator("#g-family option").count()===1,
    "Single-bank build rendered the wrong family count");
   const familyText=await page.locator("#g-family option").first().innerText();
   check(familyText.includes(expected)&&!familyText.includes(absent),
    "Single-bank build retained a removed family: "+familyText);
   check(!(await page.locator("#g-start").isDisabled()),
    "Remaining preinstalled bank was not immediately startable");
   check(errors.length===0,"Single-bank build produced browser errors: "+errors.join(" / "));
  }

  const {page,errors}=await h.open({url:pathToFileURL(empty).href});
  check(await page.locator("#g-family option").count()===0,"Empty catalog rendered a phantom exam family");
  check(await page.locator("#g-papers option").count()===1,"Empty catalog did not render one neutral paper placeholder");
  check(await page.locator("#g-start").isDisabled(),"Empty catalog enabled Start without a paper");
  check(await page.locator("#g-authoring").isEnabled(),"Empty catalog disabled Authoring destination");
  check((await page.locator(".generic-warning").innerText()).includes("No examination bank is installed"),
   "Empty Library did not explain the removable-bank state");
  const pkg=JSON.parse(await readFile(join(root,"question-banks","pfrda","2026","mocks","day-01","revised","package.exam.json"),"utf8"));
  await importModernPaper(page,pkg,"pfrda-day1.json");
  await page.waitForFunction(()=>document.querySelectorAll("#g-family option").length===1);
  check((await page.locator("#g-family option").first().innerText()).includes("pfrda-grade-a-2026-phase-ii"),
   "Import into an empty Library did not create the PFRDA family");
  check(!(await page.locator("#g-start").isDisabled()),"Imported paper did not become startable");
  check(await page.locator(".generic-modes [data-mode]").count()===3,
   "PFRDA must expose its three structurally eligible modes");
  await page.locator('[data-mode="free"]').click();
  check((await page.locator(".preview-metrics").innerText()).includes("60:00"),
   "Flexible PFRDA must combine the declared 20+40-minute budget");
  await page.locator('[data-mode="single"]').click();
  await page.locator("#g-single-section").selectOption("0");
  check((await page.locator(".preview-metrics").innerText()).includes("20:00"),
   "Descriptive-only practice must use the declared 20-minute section limit");
  await page.locator("#g-start").click();
  await page.locator("#g-word-count").waitFor({state:"visible"});
  await page.locator("#g-text").fill("A concise four word answer");
  check((await page.locator("#g-word-count").innerText()).includes("5 / 120 words"),
   "PFRDA section practice must update its advisory counter during typing");
  check(errors.length===0,"Empty-catalog lifecycle produced browser errors: "+errors.join(" / "));
  console.log("QUESTION BANK LIFECYCLE PASS "+engine+
   ": each bank removable independently, zero-preinstall boot and import recovery work");
 }catch(error){throw error;}
 finally{await h.finish();await rm(dir,{recursive:true,force:true});}
}
