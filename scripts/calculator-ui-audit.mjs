import {openHarness,starterBank,route} from "./browser/fixtures.mjs";
import {mkdir} from "node:fs/promises";
import {join} from "node:path";

const h=await openHarness({engine:"chromium"});
const out=join(process.cwd(),"artifacts","calculator-ui-audit");
await mkdir(out,{recursive:true});

async function scene(name,viewport,{dark=false,stress=false}={}){
 const {page,context,errors}=await h.open({viewport,colorScheme:dark?"dark":"light"});
 try{
  const bank=await starterBank();
  const calc={...bank,bankId:"cat-calculator-visual",examId:"cat",
   title:"CAT calculator visual audit",tools:{calculator:"basic"}};
  await page.locator("#g-file").setInputFiles({name:"cat-calculator.json",
   mimeType:"application/json",buffer:Buffer.from(JSON.stringify(calc))});
  await page.waitForFunction(()=>document.querySelector("#g-papers")?.value==="bank:cat-calculator-visual:paper:r1");
  if(stress){
   await page.locator("#displayTrigger").click();
   for(let i=0;i<8;i++)await page.locator("#fontMore").click();
   await page.locator("#displayClose").click();
  }
  await page.locator("#g-start").click();await route(page,"exam");
  await page.locator("#g-calculator").click();
  await page.locator('[data-calc-key="1"]').click();
  await page.locator('[data-calc-key="2"]').click();
  await page.locator('[data-calc-key="3"]').click();
  await page.locator('[data-calc-key="."]').click();
  await page.locator('[data-calc-key="4"]').click();
  await page.locator('[data-calc-key="5"]').click();
  await page.screenshot({path:join(out,name+"-context.png"),fullPage:true,animations:"disabled"});
  await page.locator("#g-calculator-panel").screenshot({path:join(out,name+"-panel.png"),animations:"disabled"});
  const metrics=await page.locator("#g-calculator-panel").evaluate(el=>{
    const r=el.getBoundingClientRect(),style=getComputedStyle(el);
    const keys=[...el.querySelectorAll(".calc-key")].map(k=>{
      const b=k.getBoundingClientRect();return {w:Math.round(b.width),h:Math.round(b.height)};
    });
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
      fontSize:style.fontSize,keys,viewport:{w:innerWidth,h:innerHeight},
      scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight};
  });
  console.log("CALCULATOR_UI_METRICS "+name+" "+JSON.stringify(metrics));
  if(errors.length)throw Error(errors.join("; "));
 }finally{await context.close();}
}

try{
 await scene("desktop-light",{width:1366,height:768});
 await scene("desktop-dark",{width:1366,height:768},{dark:true});
 await scene("phone",{width:390,height:844});
 await scene("narrow-195-140",{width:195,height:844},{stress:true});
 console.log("CALCULATOR_UI_AUDIT_COMPLETE");
}finally{await h.finish();}
