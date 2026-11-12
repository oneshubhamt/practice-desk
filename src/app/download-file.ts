/** Shared browser download lifecycle for generated local files. */
export function downloadBlob(blob:Blob,name:string):void{
 const url=URL.createObjectURL(blob);
 const link=document.createElement("a");
 link.href=url;
 link.download=name;
 link.hidden=true;
 document.body.append(link);
 try{link.click();}
 finally{
  link.remove();
  window.setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
}
export function downloadText(name:string,text:string,type="application/json"):void{
 downloadBlob(new Blob([text],{type}),name);
}
