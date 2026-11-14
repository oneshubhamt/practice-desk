/** P48-1 CSP actual file:// browser-engine security acceptance.
 * A valid compiled app must boot, but an unrelated inline script and
 * inline event-handler payload must never execute in that same document.
 */
import {openHarness,check,route} from "./browser/fixtures.mjs";
const engine=process.argv[2]??"chromium";
const h=await openHarness({engine,artifactDir:"artifacts/acceptance-modern"});
const {page,context,errors}=await h.open();
try{
 const result=await page.evaluate(async()=>{
   const violations=[];
   document.addEventListener("securitypolicyviolation",e=>{
     violations.push({directive:e.violatedDirective,blocked:e.blockedURI});
   });
   window.__p48UnexpectedCode=false;
   const script=document.createElement("script");
   script.textContent="window.__p48UnexpectedCode=true";
   document.body.append(script);
   const button=document.createElement("button");
   button.setAttribute("onclick","window.__p48UnexpectedCode=true");
   document.body.append(button);button.click();
   await new Promise(resolve=>setTimeout(resolve,150));
   const loaded=Boolean(document.querySelector("#g-papers option"));
   const blocked=window.__p48UnexpectedCode===false;
   script.remove();button.remove();delete window.__p48UnexpectedCode;
   return {loaded,blocked,violations};
 });
 check(result.loaded,engine+" valid offline bundle did not bootstrap under CSP");
 check(result.blocked,engine+" arbitrary appended inline JS or event handler executed despite CSP");
 check(result.violations.some(x=>x.directive.includes("script-src")),
   engine+" browser did not report CSP rejection of injected executable JavaScript");
 await page.locator('[data-mode="free"]').click();
 await page.locator("#g-start").click();
 await route(page,"exam");
 await page.locator("input[data-choice]").first().click();
 check(await page.locator("input[data-choice]:checked").count()===1,
   engine+" security policy blocked legitimate exam answer controls");
 check(!errors.length,engine+" app runtime exception "+errors.join("; "));
 console.log("P48-1 SECURITY "+engine+" PASS: hash-bound file CSP, injected script/handler rejected, real exam works");
}catch(e){await h.diagnose("p48-security-"+engine,page,e);throw e;}
finally{await context.close();await h.finish();}
