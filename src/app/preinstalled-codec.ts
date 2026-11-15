import {sha256} from "../domain/hash.ts";
import {validatePreinstalledExamCatalog,type PreinstalledExamCatalog} from "./preinstalled-exams.ts";

const MAX_EMBEDDED_BYTES=64*1024*1024;
type PackedPreinstalled={
 readonly format:"practice-desk-preinstalled-exams-gzip";
 readonly version:1;
 readonly encoding:"base64";
 readonly uncompressedBytes:number;
 readonly sha256:string;
 readonly data:string;
};
const packed=(value:unknown):value is PackedPreinstalled=>{
 if(!value||typeof value!=="object"||Array.isArray(value))return false;
 const x=value as Record<string,unknown>;
 return x.format==="practice-desk-preinstalled-exams-gzip"&&x.version===1&&x.encoding==="base64"&&
  Number.isSafeInteger(x.uncompressedBytes)&&Number(x.uncompressedBytes)>=0&&
  Number(x.uncompressedBytes)<=MAX_EMBEDDED_BYTES&&
  typeof x.sha256==="string"&&/^[a-f0-9]{64}$/.test(x.sha256)&&typeof x.data==="string";
};
const bytesFromBase64=(value:string):Uint8Array=>{
 if(value.length>MAX_EMBEDDED_BYTES*2)throw Error("Embedded exam catalog exceeds encoded size limit");
 let raw:string;
 try{raw=atob(value);}catch{throw Error("Embedded exam catalog has invalid base64");}
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
};
export async function decodePreinstalledExamCatalog(value:unknown):Promise<PreinstalledExamCatalog>{
 if(!packed(value))return validatePreinstalledExamCatalog(value);
 if(typeof DecompressionStream==="undefined")throw Error("This browser cannot open the compressed offline exam catalog");
 const compressed=bytesFromBase64(value.data);
 const compressedBuffer=new ArrayBuffer(compressed.byteLength);new Uint8Array(compressedBuffer).set(compressed);
 const stream=new Blob([compressedBuffer]).stream().pipeThrough(new DecompressionStream("gzip"));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 if(bytes.byteLength!==value.uncompressedBytes)throw Error("Embedded exam catalog size check failed");
 if(sha256(bytes)!==value.sha256)throw Error("Embedded exam catalog integrity check failed");
 const text=new TextDecoder().decode(bytes);
 let parsed:unknown;try{parsed=JSON.parse(text);}catch{throw Error("Embedded exam catalog JSON is invalid");}
 return validatePreinstalledExamCatalog(parsed);
}
