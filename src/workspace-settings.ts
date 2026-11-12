/** Built-in CGL runtime policy belongs to workspace/application state, not ExamPackage. */
export type CglPracticeMode="strict"|"free"|"single";

/** Pure persisted workspace contracts. Browser storage adapters live in app/. */
export interface DisplayPreferences{
 readonly schema:1;
 readonly dark:boolean;
 readonly scale:number;
}
export const DEFAULT_PREFERENCES:DisplayPreferences={schema:1,dark:false,scale:100};
export function validateDisplayPreferences(value:unknown):DisplayPreferences{
 if(!value||typeof value!=="object"||Array.isArray(value))
   throw new Error("Invalid display preferences");
 const p=value as Partial<DisplayPreferences>;
 if(p.schema!==1||typeof p.dark!=="boolean"||!Number.isInteger(p.scale)||p.scale!<85||p.scale!>140)
   throw new Error("Invalid display preferences");
 return {schema:1,dark:p.dark,scale:p.scale!};
}

export interface FamilySetup {
 readonly paperRevisionId:string;
 readonly mode:CglPracticeMode;
 readonly section:number;
 readonly untimed:boolean;
 readonly edition:"source"|"reviewed";
}
export interface PracticeSetups {
 readonly schema:2;
 readonly selectedFamilyId:string;
 readonly families:Readonly<Record<string,FamilySetup>>;
}
const validId=(s:unknown,max=600):s is string=>
 typeof s==="string"&&Boolean(s.trim())&&s.length<=max&&
 s!=="__proto__"&&s!=="constructor"&&s!=="prototype";

export function validatePracticeSetups(value:unknown):PracticeSetups{
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error("Invalid exam family setups");
 const raw=value as Record<string,unknown>;
 if(raw.schema!==2||!validId(raw.selectedFamilyId,600)||
   !raw.families||typeof raw.families!=="object"||Array.isArray(raw.families))
   throw Error("Invalid exam family setups");
 const entries=Object.entries(raw.families);
 if(!entries.length||entries.length>1000||!Object.hasOwn(raw.families,raw.selectedFamilyId))
   throw Error("Invalid exam family setups");
 const families:Record<string,FamilySetup>={};
 for(const [familyId,entry] of entries){
   if(!validId(familyId,600)||!entry||typeof entry!=="object"||Array.isArray(entry))
     throw Error("Invalid exam family setup");
   const v=entry as Record<string,unknown>;
   if(!validId(v.paperRevisionId)||!["strict","free","single"].includes(String(v.mode))||
     !Number.isSafeInteger(v.section)||Number(v.section)<0||Number(v.section)>1999||
     typeof v.untimed!=="boolean"||!["source","reviewed"].includes(String(v.edition)))
     throw Error("Invalid exam family setup");
   families[familyId]={paperRevisionId:v.paperRevisionId,mode:v.mode as CglPracticeMode,
     section:v.section as number,untimed:v.untimed,edition:v.edition as "source"|"reviewed"};
 }
 return {schema:2,selectedFamilyId:raw.selectedFamilyId,families};
}
