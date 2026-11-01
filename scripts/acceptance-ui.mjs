/** Modern-only responsive/layout/keyboard/a11y contracts; no v11 pixel comparator. */
import {openHarness,check,viewports,assertNoOverflow,route} from "./browser/fixtures.mjs";
const h=await openHarness({artifactDir:"artifacts/acceptance-modern"});
const scenes=[];
async function inspect(page,label,{result=false}={}){
 const s=await page.evaluate(()=>{
  const header=document.querySelector("header");
  const tools=document.querySelector(".display-tools");
  const trigger=document.querySelector("#displayTrigger");
  const box=el=>{const x=el.getBoundingClientRect();return {
   top:x.top,left:x.left,right:x.right,bottom:x.bottom,width:x.width};};
  return {
   width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,
   detached:tools?.parentElement===document.body&&!header?.contains(tools),
   aaPosition:getComputedStyle(tools).position,
   aa:box(trigger),headerPosition:getComputedStyle(header).position,
   headerDisplay:getComputedStyle(header).display,header:box(header),
   heading:document.querySelector(".results-heading")?.textContent??null,
   reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches,
   mainWidth:document.querySelector("main")?.getBoundingClientRect().width??null
  };
 });
 check(s.detached,"Aa is no longer direct-body sibling "+label);
 check(s.aaPosition==="fixed","Display control is no longer viewport fixed "+label);
 check(s.headerPosition==="static","Masthead became sticky "+label);
 check(s.aa.left>=-1&&s.aa.right<=s.width+1,"Aa outside viewport "+label);
 check(s.scrollWidth<=s.width+2,"horizontal overflow "+label+" "+JSON.stringify(s));
 check(s.reducedMotion,"reduced-motion profile not honoured "+label);
 if(result){
  check(s.headerDisplay==="none","large masthead incorrectly shown on Results");
  check(s.mainWidth>0&&s.mainWidth<=1135,"Results container lost compact responsive width");
 }
 scenes.push({label,...s});
 return s;
}
async function checkDisplay(page,label){
 const before=await page.locator("#displayTrigger").getAttribute("aria-expanded");
 check(before==="false","Aa popover starts expanded "+label);
 check(await page.locator("#displayTrigger").getAttribute("aria-label")==="Display settings",
  "Aa is missing accessible name");
 await page.locator("#displayTrigger").click();
 check(await page.locator("#displayPanel").isVisible(),"Aa popover inaccessible");
 check(await page.locator("#displayFullscreen").isVisible(),
  "fullscreen/immersive mode control clipped from Display popover "+label);
 check(await page.locator("#displayTrigger").getAttribute("aria-expanded")==="true",
  "Aa aria-expanded not synchronized");
 const panel=await page.locator("#displayPanel").boundingBox();
 const width=await page.evaluate(()=>innerWidth);
 const height=await page.evaluate(()=>innerHeight);
 check(panel&&panel.x>=-1&&panel.x+panel.width<=width+1&&
   panel.y>=-1&&panel.y+panel.height<=height+1,
  "Aa popover exceeds viewport dimensions "+label);
 check(await page.locator("#themeLight").getAttribute("aria-pressed")!==null,
  "theme Light lacks toggle state");
 check(await page.locator("#themeDark").getAttribute("aria-pressed")!==null,
  "theme Dark lacks toggle state");
 await page.locator("#themeDark").click();
 check(await page.locator("html").getAttribute("data-theme")==="dark","dark theme not applied");
 await page.locator("#themeLight").click();
 check(await page.locator("html").getAttribute("data-theme")==="light","light theme not restored");
 await page.locator("#fontMore").click();
 check(await page.locator("#fontReset").innerText()==="105%",
  "font size increase not visible");
 await page.locator("#fontReset").click();
 check(await page.locator("#fontReset").innerText()==="100%",
  "font reset not applied");
 await page.keyboard.press("Escape");
 check(await page.locator("#displayPanel").isHidden()&&
   await page.evaluate(()=>document.activeElement?.id)==="displayTrigger",
   "Escape failed to close popover and restore focus");
}
/** Direct computed-token colour contrasts, not frozen v11 pixel equality. */
async function assertContrast(page,label){
 const ratios=await page.evaluate(()=>{
  const style=getComputedStyle(document.documentElement);
  const hex=name=>{
   let v=style.getPropertyValue(name).trim().replace("#","");
   if(/^[a-f0-9]{3}$/i.test(v))v=[...v].map(x=>x+x).join("");
   if(!/^[a-f0-9]{6}$/i.test(v))throw Error("Bad CSS colour token "+name);
   return [0,2,4].map(i=>parseInt(v.slice(i,i+2),16)/255);
  };
  const luminance=rgb=>rgb.reduce((sum,x,i)=>{
   const l=x<=.04045?x/12.92:((x+.055)/1.055)**2.4;
   return sum+l*[.2126,.7152,.0722][i];
  },0);
  const ratio=(a,b)=>{
   const x=luminance(hex(a)),y=luminance(hex(b));
   return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
  };
  return {foreground:ratio("--ink","--bg"),secondary:ratio("--muted","--panel"),
   correct:ratio("--good","--panel"),incorrect:ratio("--bad","--panel")};
 });
 check(Object.values(ratios).every(x=>x>=4.5),
  "Insufficient current-app palette contrast "+label+" "+JSON.stringify(ratios));
 scenes.push({label:label+"-contrast",ratios});
}

/** Narrow, focused automated semantic rules; NOT full WCAG/AT certification. */
async function semanticAudit(page,label){
 const issues=await page.evaluate(()=>{
  const problems=[];
  const unique=["displayTrigger","displayPanel",...(document.querySelector("#g-papers")?["g-start"]:[])];
  for(const id of unique)if(document.querySelectorAll("#"+id).length!==1)
   problems.push("duplicate/missing #"+id);
  const trigger=document.querySelector("#displayTrigger");
  if(trigger?.getAttribute("aria-controls")!=="displayPanel")
   problems.push("Aa aria-controls mismatch");
  const buttons=[...document.querySelectorAll('button[aria-pressed]')];
  for(const el of buttons)if(!["true","false"].includes(el.getAttribute("aria-pressed")))
   problems.push("nonboolean aria-pressed on "+(el.id||el.textContent.slice(0,24)));
  for(const el of document.querySelectorAll("[role=tab][aria-selected]"))
   if(!["true","false"].includes(el.getAttribute("aria-selected")))
    problems.push("invalid tab selection state");
  for(const el of document.querySelectorAll('img:not([alt])'))problems.push("image without alt");
  return problems;
 });
 check(!issues.length,"semantic rules "+label+" "+issues.join("; "));
}
try{
 for(const [name,viewport] of Object.entries(viewports)){
  const {page,errors,context}=await h.open({viewport,reducedMotion:"reduce"});
  try{
   await inspect(page,name+"-library");
   const independent=await page.locator(".app-independent-footer").innerText();
   check(independent.includes("Not affiliated"),"independent educational footer missing "+name);
   await semanticAudit(page,name+"-library");
   check(await page.locator("#g-papers").isEnabled(),"library question picker disabled "+name);
   if(name==="laptop"){
    const start=await page.locator("#g-start").boundingBox();
    check(start&&start.y+start.height<=viewport.height,"Start not in laptop first fold");
   }
   await assertContrast(page,name+" light");
   await checkDisplay(page,name);
   await page.locator("#displayTrigger").click();
   await page.locator("#themeDark").click();
   await assertContrast(page,name+" dark");
   await page.locator("#themeLight").click();
   await page.keyboard.press("Escape");
   // Replace the historical Pass36 screenshot suite with a measurable
   // product invariant: the 18px conditional gap only when a resume card exists.
   check(await page.locator("#g-pending-attempts").count()===0,
    "fresh Library unexpectedly shows unfinished-attempt panel "+name);
   await page.locator("#g-start").click();await route(page,"exam");
   await page.locator("#g-library").click();await route(page,"library");
   await page.locator("#g-pending-attempts").waitFor({state:"visible"});
   const resumeSpacing=await page.evaluate(()=>{
    const pending=document.querySelector("#g-pending-attempts")?.getBoundingClientRect();
    const papers=document.querySelector(".home-grid")?.getBoundingClientRect();
    return pending&&papers?papers.top-pending.bottom:null;
   });
   check(resumeSpacing!==null&&Math.abs(resumeSpacing-18)<=1,
    "pending-to-paper selector gap should remain 18px "+name+", observed "+resumeSpacing);
   scenes.push({label:name+"-resume-spacing",pixels:resumeSpacing});
   await page.addStyleTag({content:"body{min-height:3100px!important}"});
   await page.evaluate(()=>window.scrollTo({top:700,behavior:"instant"}));
   await page.waitForFunction(()=>window.scrollY>350);
   const scrolled=await inspect(page,name+"-library-scrolled");
   check(scrolled.header.bottom<0&&Math.abs(scrolled.aa.top-(viewport.width<=500?10:12))<=2,
    "header must scroll while Aa floats "+name);
   await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
   await page.locator("#g-history").click();await route(page,"history");
   await inspect(page,name+"-history");
   const historyAttribution=await page.locator(".app-independent-footer").innerText();
   check(historyAttribution.includes("Not affiliated")&&
    historyAttribution.toLowerCase().includes("imported"),
    "History independent/imported educational attribution missing "+name);
   await page.locator("#g-library").click();await route(page,"library");
   await page.locator("#g-learning").click();await route(page,"learning");
   await inspect(page,name+"-learning");
   await page.locator("#learning-close").click();await route(page,"library");
   await page.locator('[data-mode="single"]').click();
   await page.locator("#g-single-section").selectOption("0");
   await page.locator("#g-start").click();await route(page,"exam");
   check(await page.locator(".navigator-help summary").innerText()==="Keyboard shortcuts",
    "Navigator keyboard controls missing "+name);
   check(await page.locator("#g-flag").getAttribute("aria-pressed")==="false",
    "Unmarked flag unexpectedly active "+name);
   await page.locator(".exam-question input[data-choice]").first().click();
   await page.locator("#g-flag").click();
   check(await page.locator("#g-flag").getAttribute("aria-pressed")==="true"&&
     await page.locator('[data-q="0"]').evaluate(el=>el.classList.contains("marked")),
    "Mark-for-review state lost "+name);
   await page.locator("#g-flag").click();
   check(await page.locator("#g-flag").getAttribute("aria-pressed")==="false",
    "Mark-for-review toggle failed "+name);
   await inspect(page,name+"-exam");
   check(await page.locator(".exam-question input[data-choice]:checked").count()===1,
    "semantic answer control lost "+name);
   await page.locator("#g-exam-full").click();
   check(await page.locator("header").isHidden()&&
     await page.locator("#displayTrigger").isVisible(),"immersive route display access lost");
   await page.locator("#g-exam-full").click();
   await page.locator("#g-submit").click();await route(page,"result");
   const result=await inspect(page,name+"-results-low-evidence",{result:true});
   await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:"instant"}));
   await page.waitForFunction(()=>window.scrollY>350);
   const scrolledResult=await inspect(page,name+"-results-scrolled",{result:true});
   check(Math.abs(scrolledResult.aa.top-(viewport.width<=500?10:12))<=2,
    "floating Aa became inaccessible on long Results "+name);
   await checkDisplay(page,name+"-scrolled-results");
   await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
   check(await page.locator(".result-performance-overview .score").count()===5,
    "five primary metrics missing "+name);
   check(await page.locator(".result-scoring-details").evaluate(x=>!x.open),
    "Scoring details not initially collapsed "+name);
   check(await page.locator(".result-opportunities .coach-card").count()===3,
    "Results coaching cards missing "+name);
   check(await page.locator("#g-next-work").count()===1,
    "Next-work coaching action lost "+name);
   check(await page.locator(".result-speed-grid").count()===0,
    "unsupported speed classification shown on one answered item "+name);
   check(await page.locator("#result-review .generic-review").count()===0,
    "hidden result review rendered eagerly "+name);
   await page.locator("#result-tab-review").click();await page.locator("#result-review").waitFor({state:"visible"});
   await page.evaluate(()=>window.scrollTo({top:document.body.scrollHeight,behavior:"instant"}));
   await page.waitForFunction(()=>window.scrollY>350);
   await inspect(page,name+"-review-scrolled",{result:true});
   await checkDisplay(page,name+"-scrolled-review");
   await page.evaluate(()=>window.scrollTo({top:0,behavior:"instant"}));
   await semanticAudit(page,name+"-review");
   const tabs=page.locator("#result-tab-review");
   await tabs.focus();await page.keyboard.press("ArrowRight");
   check(await page.locator("#result-timing").isVisible(),
    "native keyboard arrow did not switch to timing "+name);
   await assertNoOverflow(page,name+"-timing");
   check(!errors.length,name+" browser exceptions "+errors.join("; "));
   console.log("MODERN UI "+name+" fixed Aa/scrolled header/Result semantics PASS");
  }catch(e){await h.diagnose("ui-"+name,page,e);throw e;}
  finally{await context.close();}
 }
 await h.evidence("ui-summary",{scenes:scenes.length,records:scenes,
  claim:"Modern current UI contracts; not screen-reader, physical-device or WCAG certification"});
}finally{await h.finish();}
console.log("MODERN UI PASS "+scenes.length+" state measurements");
