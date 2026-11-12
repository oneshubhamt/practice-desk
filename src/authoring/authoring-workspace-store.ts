import {
 AUTHORING_KEY,defaultAuthoringShelf,validateAuthoringShelf,
 type AuthoringDraftShelf
} from "./authoring-draft.ts";
import {
 STAGING_KEY,validateStagingWorkspace,type StagingWorkspace
} from "./authoring-staging.ts";

export interface AuthoringWorkspaceSnapshot {
 readonly shelf:AuthoringDraftShelf;
 readonly staging:StagingWorkspace|null;
 readonly shelfBlocked:boolean;
 readonly stagingBlocked:boolean;
 readonly shelfError:string;
 readonly stagingError:string;
}

export interface AuthoringStorageConflict {
 readonly shelfChanged:boolean;
 readonly stagingChanged:boolean;
}

export interface AuthoringWorkspaceStore {
 load():AuthoringWorkspaceSnapshot;
 saveShelf(value:AuthoringDraftShelf):AuthoringDraftShelf;
 saveStaging(value:StagingWorkspace|null):StagingWorkspace|null;
 resetUnreadableShelf(value:AuthoringDraftShelf):AuthoringDraftShelf;
 resetUnreadableStaging():void;
 externalChange(event:StorageEvent):AuthoringStorageConflict;
}

class LocalAuthoringWorkspaceStore implements AuthoringWorkspaceStore {
 private shelfStamp:string|null=null;
 private stagingStamp:string|null=null;
 private shelfBlocked=false;
 private stagingBlocked=false;

 constructor(private readonly storage:Storage){}

 load():AuthoringWorkspaceSnapshot{
  let shelf:AuthoringDraftShelf;
  let shelfError="";
  const shelfRaw=this.storage.getItem(AUTHORING_KEY);
  this.shelfStamp=shelfRaw;
  try{
   shelf=shelfRaw?validateAuthoringShelf(JSON.parse(shelfRaw)):defaultAuthoringShelf();
   this.shelfBlocked=false;
  }catch(error){
   this.shelfBlocked=true;
   shelf=defaultAuthoringShelf();
   shelfError="Existing local drafts could not be read: "+
    (error instanceof Error?error.message:"invalid data")+
    ". Export or recover the original storage before overwriting it.";
  }

  let staging:StagingWorkspace|null=null;
  let stagingError="";
  const stagingRaw=this.storage.getItem(STAGING_KEY);
  this.stagingStamp=stagingRaw;
  try{
   staging=stagingRaw?validateStagingWorkspace(JSON.parse(stagingRaw)):null;
   this.stagingBlocked=false;
  }catch(error){
   this.stagingBlocked=true;
   stagingError="Staging storage is unreadable; its original bytes are preserved. "+
    (error instanceof Error?error.message:"Invalid staged data");
  }

  return {
   shelf,staging,
   shelfBlocked:this.shelfBlocked,
   stagingBlocked:this.stagingBlocked,
   shelfError,stagingError
  };
 }

 saveShelf(value:AuthoringDraftShelf):AuthoringDraftShelf{
  if(this.shelfBlocked)
   throw new Error("Damaged saved draft data remains untouched. Export current work or repair the original storage before overwriting it.");
  if(this.storage.getItem(AUTHORING_KEY)!==this.shelfStamp)
   throw new Error("Another tab changed authoring drafts; export unsaved changes and reopen.");
  const validated=validateAuthoringShelf(value);
  const bytes=JSON.stringify(validated);
  this.storage.setItem(AUTHORING_KEY,bytes);
  this.shelfStamp=bytes;
  return validated;
 }

 saveStaging(value:StagingWorkspace|null):StagingWorkspace|null{
  if(this.stagingBlocked)
   throw new Error("Existing staged files are unreadable. Reset damaged staging explicitly.");
  if(this.storage.getItem(STAGING_KEY)!==this.stagingStamp)
   throw new Error("Another tab changed AI staging; export work and reopen without overwriting.");
  if(value){
   const validated=validateStagingWorkspace(value);
   const bytes=JSON.stringify(validated);
   this.storage.setItem(STAGING_KEY,bytes);
   this.stagingStamp=bytes;
   return validated;
  }
  this.storage.removeItem(STAGING_KEY);
  this.stagingStamp=null;
  return null;
 }

 resetUnreadableShelf(value:AuthoringDraftShelf):AuthoringDraftShelf{
  if(!this.shelfBlocked)
   throw new Error("Draft shelf is readable; use normal save instead.");
  if(this.storage.getItem(AUTHORING_KEY)!==this.shelfStamp)
   throw new Error("Another tab changed authoring drafts; reopen before resetting.");
  const validated=validateAuthoringShelf(value);
  const bytes=JSON.stringify(validated);
  this.storage.setItem(AUTHORING_KEY,bytes);
  this.shelfStamp=bytes;
  this.shelfBlocked=false;
  return validated;
 }

 resetUnreadableStaging():void{
  if(!this.stagingBlocked)
   throw new Error("Staging is readable; use normal discard instead.");
  if(this.storage.getItem(STAGING_KEY)!==this.stagingStamp)
   throw new Error("Another tab changed AI staging; reopen before resetting.");
  this.storage.removeItem(STAGING_KEY);
  this.stagingStamp=null;
  this.stagingBlocked=false;
 }

 externalChange(event:StorageEvent):AuthoringStorageConflict{
  const all=event.key===null;
  return {
   shelfChanged:(all||event.key===AUTHORING_KEY)&&
    this.storage.getItem(AUTHORING_KEY)!==this.shelfStamp,
   stagingChanged:(all||event.key===STAGING_KEY)&&
    this.storage.getItem(STAGING_KEY)!==this.stagingStamp
  };
 }
}

export function createAuthoringWorkspaceStore(
 storage:Storage=localStorage
):AuthoringWorkspaceStore{
 return new LocalAuthoringWorkspaceStore(storage);
}
