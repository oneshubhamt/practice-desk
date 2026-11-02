/** P45: one portable backup v3 archive, optionally gzip-compressed.
 * No new data schema and no network/dependency/runtime migration.
 * An explicit decompressed-size bound prevents unchecked gzip expansion. */
export const PLAIN_BACKUP_LIMIT=75*1024*1024;
/** Compressed archives have a separate bound; total decompressed JSON is still capped. */
export const GZIP_BACKUP_LIMIT=128*1024*1024;
export const EXPANDED_BACKUP_LIMIT=320*1024*1024;
const GZIP_BACKUP_THRESHOLD=40*1024*1024;
const gzipName=(name:string)=>/\.json\.gz$/i.test(name);

export async function backupDownload(serialized:string):Promise<{
 readonly blob:Blob;readonly extension:".json"|".json.gz";
 readonly plainBytes:number;readonly compressed:boolean;
}>{
 const plain=new Blob([serialized],{type:"application/json"});
 if(plain.size<=GZIP_BACKUP_THRESHOLD)
   return {blob:plain,extension:".json",plainBytes:plain.size,compressed:false};
 if(typeof CompressionStream!=="function")
   throw Error("This browser cannot compress a large backup. Use an up-to-date browser with offline gzip support; no incomplete export was created.");
 const encoded=plain.stream().pipeThrough(new CompressionStream("gzip"));
 const blob=await new Response(encoded).blob();
 if(blob.size>GZIP_BACKUP_LIMIT)
   throw Error("Compressed backup exceeds the 128 MiB gzip import ceiling. No incomplete export was created.");
 return {blob,extension:".json.gz",plainBytes:plain.size,compressed:true};
}

export async function readBackupFile(file:Blob&{readonly name:string}):Promise<unknown>{
 const compressed=gzipName(file.name);
 if(file.size>(compressed?GZIP_BACKUP_LIMIT:PLAIN_BACKUP_LIMIT))
   throw Error(compressed?"Gzip backup exceeds the 128 MiB compressed-file limit":
     "Plain backup exceeds 75 MiB. For large archives, use the app's .json.gz export.");
 if(!compressed)return JSON.parse(await file.text()) as unknown;
 if(typeof DecompressionStream!=="function")
   throw Error("This browser cannot read gzip backups. Use an up-to-date browser supporting offline gzip decompression.");
 const stream=file.stream().pipeThrough(new DecompressionStream("gzip"));
 const reader=stream.getReader();
 const parts:Uint8Array[]=[];
 let total=0;
 try{
   while(true){
     const {value,done}=await reader.read();
     if(done)break;
     total+=value.byteLength;
     if(total>EXPANDED_BACKUP_LIMIT)
       throw Error("Decompressed backup exceeds the 320 MiB safety limit");
     parts.push(value);
   }
 }catch(error){
   await reader.cancel().catch(()=>{});
   throw error;
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);
 let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)) as unknown;
}
