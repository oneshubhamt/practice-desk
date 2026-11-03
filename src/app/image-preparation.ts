/** P47-3B: user-reviewed image preparation BEFORE a simple bank is frozen.
 * This tool never edits a verified exam package, database snapshot or score.
 * It neither downloads external assets nor changes embedded bytes automatically.
 * Browsers expose lossy (not guaranteed lossless) WebP via canvas.toBlob.
 * Therefore text/diagrams stay original; photos require automated fidelity
 * checks AND explicit user visual approval for a smaller WebP candidate.
 */
export type RasterAssessment={
 readonly sourceBytes:number;
 readonly candidateBytes:number;
 readonly width:number;
 readonly height:number;
 readonly psnrDb:number;
 readonly maxChannelError:number;
 readonly significantErrorFraction:number;
 readonly smallerBy:number;
 readonly accepted:boolean;
 readonly reason:string;
};
export const PREPARE_MAX_FILE_BYTES=10*1024*1024;
export const PREPARE_MAX_COMPARE_PIXELS=8*1024*1024;
export const PREPARE_WEBP_QUALITY=0.98;
export function assessRasterCandidate(input:Omit<RasterAssessment,"accepted"|"reason"|"smallerBy">):RasterAssessment{
 const {sourceBytes,candidateBytes,width,height,psnrDb,maxChannelError,significantErrorFraction}=input;
 const smallerBy=sourceBytes>0?1-candidateBytes/sourceBytes:0;
 const eligible=Number.isFinite(sourceBytes)&&Number.isFinite(candidateBytes)&&sourceBytes>0&&
  candidateBytes>0&&Number.isSafeInteger(width)&&Number.isSafeInteger(height)&&
  width>0&&height>0&&width*height<=PREPARE_MAX_COMPARE_PIXELS;
 const accepted=eligible&&smallerBy>=0.15&&psnrDb>=38&&maxChannelError<=64&&
  significantErrorFraction<=0.001;
 return {...input,smallerBy,accepted,
  reason:!eligible?"Invalid or excessively large raster":
   smallerBy<0.15?"WebP does not save at least 15%":
   psnrDb<38?"Pixel fidelity is below the conservative threshold":
   maxChannelError>64||significantErrorFraction>0.001?
    "Local contrast or stroke pixels change too much":"Eligible for manual side-by-side review"};
}
export function imageBytesLabel(bytes:number):string{
 return bytes>=1048576?(bytes/1048576).toFixed(2)+" MiB":(bytes/1024).toFixed(1)+" KiB";
}
export type ImagePreparation={open(trigger:HTMLElement):void;close():void;dispose():void;beforeRender():void;isOpen():boolean};
const element=<T extends keyof HTMLElementTagNameMap>(tag:T,cls?:string):HTMLElementTagNameMap[T]=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 return node;
};
const control=(label:string):HTMLButtonElement=>{
 const button=element("button","btn");button.type="button";button.textContent=label;return button;
};
function blobUrl(blob:Blob,links:Set<string>):string{
 const url=URL.createObjectURL(blob);links.add(url);return url;
}
const readImage=(url:string):Promise<HTMLImageElement>=>new Promise((resolve,reject)=>{
 const img=new Image();img.decoding="async";
 img.onload=()=>resolve(img);img.onerror=()=>reject(Error("Could not decode this image locally."));
 img.src=url;
});
function readAsDataUri(file:Blob):Promise<string>{
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(reader.error??Error("Local image conversion failed"));
  reader.readAsDataURL(file);
 });
}
function exportBlob(blob:Blob,name:string):void{
 const url=URL.createObjectURL(blob);
 const link=element("a");link.href=url;link.download=name;document.body.append(link);
 link.click();link.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function calculateFidelity(original:ImageData,decoded:ImageData):{
 psnrDb:number;maxChannelError:number;significantErrorFraction:number
}{
 if(original.width!==decoded.width||original.height!==decoded.height)
   return {psnrDb:0,maxChannelError:255,significantErrorFraction:1};
 const a=original.data,b=decoded.data;
 const stride=Math.max(1,Math.floor(a.length/(4*80000)));
 let squared=0,seen=0,significant=0,maximum=0;
 for(let i=0;i<a.length;i+=4*stride){
  for(let k=0;k<4;k++){
   const delta=Math.abs(a[i+k]!-b[i+k]!);
   squared+=delta*delta;seen++;
   maximum=Math.max(maximum,delta);
   if(delta>24)significant++;
  }
 }
 const mean=squared/Math.max(1,seen);
 return {psnrDb:mean===0?Infinity:10*Math.log10(255*255/mean),
  maxChannelError:maximum,significantErrorFraction:significant/Math.max(1,seen)};
}
export function createImagePreparation():ImagePreparation{
 let dialog:HTMLDialogElement|null=null,opening:HTMLElement|null=null,disposed=false;
 let links=new Set<string>(),operation=0;
 const release=()=>{
  for(const url of links)URL.revokeObjectURL(url);
  links.clear();
 };
 const close=():void=>{
  if(!dialog)return;
  operation++;
  const old=dialog;dialog=null;
  if(old.open)old.close();
  old.remove();release();
  if(opening?.isConnected)opening.focus({preventScroll:true});
  opening=null;
 };
 const open=(trigger:HTMLElement):void=>{
  if(disposed)return;
  close();opening=trigger;
  const d=element("dialog","generic-image-dialog generic-image-preparation");
  dialog=d;
  d.setAttribute("aria-label","Prepare examination image before importing a bank");
  const shell=element("div","generic-prepare-shell");
  const heading=element("h2");heading.textContent="Prepare an exam image";
  const info=element("p","fine");info.textContent=
   "Before creating a question bank: preserve diagrams and equations unchanged. For photographs, compare an optional high-quality WebP with the original at 200–400% before accepting it. No image is uploaded or saved in Practice Desk.";
  const picker=element("input");picker.type="file";picker.accept="image/png,image/jpeg,image/webp";picker.id="prep-image-file";
  const pickerLabel=element("label");pickerLabel.textContent="Choose a local PNG, JPEG or WebP image";
  pickerLabel.htmlFor=picker.id;
  const type=element("select");type.id="prep-image-type";
  for(const [value,label] of [["diagram","Diagram, fine print or mathematics — preserve original"],
    ["photo","Photograph — consider high-quality WebP"]]){
    const o=element("option");o.value=value;o.textContent=label;type.append(o);
  }
  const kindLabel=element("label");kindLabel.htmlFor=type.id;kindLabel.textContent="Image content";
  const assetId=element("input");assetId.id="prep-image-id";assetId.placeholder="e.g. fig-question-3";
  assetId.autocomplete="off";
  const assetLabel=element("label");assetLabel.htmlFor=assetId.id;assetLabel.textContent="Authored image ID (letters/numbers/-/_)";
  const alt=element("input");alt.id="prep-image-alt";alt.placeholder="Describe the diagram or photograph";
  const altLabel=element("label");altLabel.htmlFor=alt.id;altLabel.textContent="Accessible image description";
  const status=element("p","fine");status.id="prep-image-status";status.setAttribute("role","status");
  status.setAttribute("aria-live","polite");
  const previews=element("div","generic-prepare-previews");
  const original=element("img");original.alt="Original image preview";
  const candidate=element("img");candidate.alt="High-quality WebP candidate preview";
  const originalWrap=element("div","generic-prepare-preview");
  const candidateWrap=element("div","generic-prepare-preview");
  const origHead=element("h3");origHead.textContent="Original (unchanged)";
  const webpHead=element("h3");webpHead.textContent="Optimised WebP (when eligible)";
  originalWrap.append(origHead,original);candidateWrap.append(webpHead,candidate);
  previews.append(originalWrap,candidateWrap);
  const scale=element("select");scale.id="prep-image-scale";
  for(const value of [100,200,400]){
   const op=element("option");op.value=String(value);op.textContent=value+"% review zoom";
   scale.append(op);
  }
  const reviewLabel=element("label");reviewLabel.htmlFor=scale.id;reviewLabel.textContent="Review fine detail";
  const approval=element("input");approval.type="checkbox";approval.id="prep-image-approve";
  const approvalLabel=element("label");approvalLabel.htmlFor=approval.id;
  approvalLabel.append(approval,document.createTextNode(
   " I compared fine text, thin strokes and mathematical symbols at enlarged size; WebP is acceptable."));
  const exportOriginal=control("Download original image entry");
  const exportWebp=control("Download reviewed WebP image entry");
  const closeButton=control("Close");
  exportOriginal.disabled=true;exportWebp.disabled=true;approval.disabled=true;
  const actions=element("div","row");actions.append(exportOriginal,exportWebp,closeButton);
  shell.append(heading,info,pickerLabel,picker,kindLabel,type,assetLabel,assetId,
   altLabel,alt,status,reviewLabel,scale,previews,approvalLabel,actions);
  d.append(shell);document.body.append(d);
  let chosenFile:File|null=null,optimized:Blob|null=null,reviewEligible=false;
  let originalUrl="",candidateUrl="";
  const reset=():void=>{
   operation++;release();chosenFile=null;optimized=null;reviewEligible=false;
   original.removeAttribute("src");candidate.removeAttribute("src");
   exportOriginal.disabled=true;exportWebp.disabled=true;approval.disabled=true;approval.checked=false;
   candidateWrap.hidden=true;status.textContent="";
  };
  const updateApproval=()=>{
   exportWebp.disabled=!reviewEligible||!approval.checked;
  };
  approval.addEventListener("change",updateApproval);
  scale.addEventListener("change",()=>{
   const width=Number(scale.value);
   original.style.width=width+"%";candidate.style.width=width+"%";
  });
  const prepare=async():Promise<void>=>{
   reset();const run=operation;
   const file=picker.files?.[0];if(!file)return;
   if(!["image/png","image/jpeg","image/webp"].includes(file.type)||
     file.size<=0||file.size>PREPARE_MAX_FILE_BYTES){
    status.textContent="Choose a supported image of no more than 10 MiB.";return;
   }
   chosenFile=file;
   status.textContent="Reading original image locally…";
   try{
    originalUrl=blobUrl(file,links);original.src=originalUrl;
    const src=await readImage(originalUrl);
    if(run!==operation||dialog!==d)return;
    const w=src.naturalWidth,height=src.naturalHeight;
    if(!w||!height){status.textContent="No usable image dimensions.";return;}
    exportOriginal.disabled=false;
    if(type.value!=="photo"){
     status.textContent=imageBytesLabel(file.size)+" · "+w+"×"+height+
      " · Original retained. Diagram, text and maths images are not recompressed.";
     return;
    }
    if(w*height>PREPARE_MAX_COMPARE_PIXELS){
     status.textContent="Original retained ("+w+"×"+height+
      "). This photograph exceeds the safe in-browser fidelity-check budget.";
     return;
    }
    const canvas=element("canvas");canvas.width=w;canvas.height=height;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    if(!ctx)throw Error("Browser cannot inspect this image safely.");
    ctx.drawImage(src,0,0);
    const reference=ctx.getImageData(0,0,w,height);
    const blob=await new Promise<Blob|null>(resolve=>
      canvas.toBlob(resolve,"image/webp",PREPARE_WEBP_QUALITY));
    if(run!==operation||dialog!==d)return;
    if(!blob||blob.type!=="image/webp"){
     status.textContent="This browser cannot encode WebP locally; original retained.";return;
    }
    candidateUrl=blobUrl(blob,links);
    const converted=await readImage(candidateUrl);
    if(run!==operation||dialog!==d)return;
    if(converted.naturalWidth!==w||converted.naturalHeight!==height){
     status.textContent="WebP dimensions changed; original retained.";return;
    }
    const compare=element("canvas");compare.width=w;compare.height=height;
    const cc=compare.getContext("2d",{willReadFrequently:true});
    if(!cc)throw Error("Browser cannot verify the candidate pixels.");
    cc.drawImage(converted,0,0);
    const detail=calculateFidelity(reference,cc.getImageData(0,0,w,height));
    const verdict=assessRasterCandidate({sourceBytes:file.size,candidateBytes:blob.size,
      width:w,height, ...detail});
    if(!verdict.accepted){
     status.textContent="Original retained: "+verdict.reason+". "+
      imageBytesLabel(file.size)+" original, "+imageBytesLabel(blob.size)+" candidate.";
     return;
    }
    optimized=blob;reviewEligible=true;
    candidateWrap.hidden=false;candidate.src=candidateUrl;
    approval.disabled=false;status.textContent="Candidate saves "+
      Math.round(verdict.smallerBy*100)+"% ("+imageBytesLabel(file.size)+" → "+
      imageBytesLabel(blob.size)+"), with measured PSNR "+
      verdict.psnrDb.toFixed(1)+" dB. Compare small details at 200–400%; acceptance is not automatic.";
   }catch(error){
    status.textContent=error instanceof Error?error.message:"Cannot prepare image locally.";
   }
  };
  picker.addEventListener("change",()=>{void prepare();});
  type.addEventListener("change",()=>{if(picker.files?.length)void prepare();});
  const exportSnippet=async(optimizedSource:boolean)=>{
   const file=optimizedSource?optimized:chosenFile;
   if(!file||optimizedSource&&(!reviewEligible||!approval.checked))return;
   const id=assetId.value.trim();
   if(!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id)){
    status.textContent="Provide a valid image ID (letters/numbers/underscores/hyphens, up to 80).";
    assetId.focus();return;
   }
   const description=alt.value.trim();
   if(!description||description.length>500){
    status.textContent="Provide a meaningful accessible description (1–500 characters).";
    alt.focus();return;
   }
   const uri=await readAsDataUri(file);
   if(dialog!==d)return;
   const snippet={id,altText:description,dataUri:uri};
   exportBlob(new Blob([JSON.stringify(snippet,null,2)],{type:"application/json"}),
     "practice-desk-media-"+id+".json");
   status.textContent=(optimizedSource?"Reviewed WebP":"Original image")+
    " entry downloaded. Insert it into the simple-bank media array before importing, then reference its ID using question imageIds or optionImageIds. The bank importer computes and verifies the SHA-256 before freezing.";
  };
  exportOriginal.addEventListener("click",()=>{void exportSnippet(false);});
  exportWebp.addEventListener("click",()=>{void exportSnippet(true);});
  closeButton.addEventListener("click",close);
  d.addEventListener("cancel",event=>{event.preventDefault();close();});
  try{d.showModal();picker.focus({preventScroll:true});}
  catch{close();}
 };
 return {open,close,dispose:()=>{disposed=true;close();},beforeRender:close,isOpen:()=>Boolean(dialog)};
}
