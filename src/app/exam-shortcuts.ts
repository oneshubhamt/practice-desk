import {STORAGE_TOPOLOGY} from "../storage-topology.ts";
/** P52: pure exam keyboard policy plus a small local-only preference schema.
 * No new listener: the existing coordinator owns exam keyboard dispatch.
 * Untrusted localStorage is never allowed to introduce privileged chords.
 */
export type ShortcutContext={readonly key:string;readonly alt:boolean;readonly repeat:boolean;
 readonly paused:boolean;readonly focusedRadio:boolean;readonly editable:boolean;
 readonly blocked:boolean;readonly allowFlagging:boolean};
export type ShortcutCommand=
 | {readonly kind:"navigate";readonly delta:-1|1}
 | {readonly kind:"answer";readonly index:0|1|2|3}
 | {readonly kind:"flag"}|{readonly kind:"fullscreen"};
export type ShortcutBindings={
 readonly previous:string;readonly next:string;
 readonly answerA:string;readonly answerB:string;readonly answerC:string;readonly answerD:string;
 readonly flag:string;readonly fullscreen:string;
};
export const SHORTCUTS_KEY=STORAGE_TOPOLOGY.shortcuts;
export const SHORTCUT_FIELDS=[
 ["previous","Previous question"],["next","Next question"],
 ["answerA","Choose A"],["answerB","Choose B"],
 ["answerC","Choose C"],["answerD","Choose D"],
 ["flag","Flag question"],["fullscreen","Full-screen mode"]
] as const;
export const DEFAULT_SHORTCUTS:Readonly<ShortcutBindings>=Object.freeze({
 previous:"arrowleft",next:"arrowright",answerA:"a",answerB:"b",
 answerC:"c",answerD:"d",flag:"m",fullscreen:"f"
});
export const SHORTCUT_KEY_CHOICES:readonly string[]=[
 "arrowleft","arrowright",...Array.from("abcdefghijklmnopqrstuvwxyz"),..."1234567890"
];
const answerFields=["answerA","answerB","answerC","answerD"] as const;
export function validateShortcutBindings(input:unknown):ShortcutBindings{
 if(!input||typeof input!=="object"||Array.isArray(input)||
    ![Object.prototype,null].includes(Object.getPrototypeOf(input)))throw Error("Invalid keyboard shortcuts");
 const data=input as Record<string,unknown>;
 if(Object.keys(data).length!==SHORTCUT_FIELDS.length||
    Object.keys(data).some(k=>!SHORTCUT_FIELDS.some(([name])=>name===k)))
   throw Error("Unsupported keyboard shortcut field");
 const entries=SHORTCUT_FIELDS.map(([name])=>data[name]);
 if(SHORTCUT_FIELDS.some(([name])=>{
   const x=data[name];
   return typeof x!=="string"||!SHORTCUT_KEY_CHOICES.includes(x)||
     (answerFields.includes(name as typeof answerFields[number])&&
      (x==="arrowleft"||x==="arrowright"));
 }))
   throw Error("Unsupported shortcut key; answer choices require letters or digits");
 if(new Set(entries).size!==entries.length)
   throw Error("Shortcut conflict: assign a different key to every action");
 return Object.fromEntries(SHORTCUT_FIELDS.map(([name])=>[name,data[name]])) as ShortcutBindings;
}
export function readShortcutBindings(storage?:Pick<Storage,"getItem">):ShortcutBindings{
 try{
  const target=storage??(typeof localStorage==="undefined"?null:localStorage);
  if(!target)return DEFAULT_SHORTCUTS; // Pure renderer also runs in Node.
  const raw=target.getItem(SHORTCUTS_KEY);
  return raw?validateShortcutBindings(JSON.parse(raw)):DEFAULT_SHORTCUTS;
 }catch{return DEFAULT_SHORTCUTS;}
}
export function writeShortcutBindings(value:unknown,storage?:Pick<Storage,"setItem">):ShortcutBindings{
 const valid=validateShortcutBindings(value);
 const target=storage??(typeof localStorage==="undefined"?null:localStorage);
 if(!target)throw Error("Local shortcut storage unavailable");
 target.setItem(SHORTCUTS_KEY,JSON.stringify(valid));
 return valid;
}
export const shortcutKeyLabel=(key:string):string=>key==="arrowleft"?"←":
 key==="arrowright"?"→":key.length===1?key.toUpperCase():key;
export const EXAM_SHORTCUT_HELP="A–D answer single-choice; Left/Right navigate except on native radios, "+
 "where Alt+Left/Right navigates; M marks/unmarks for review even when paused; F toggles full screen. "+
 "Typing, Display and modal dialogs suspend shortcuts.";
export function examShortcutHelp(bindings:ShortcutBindings=readShortcutBindings()):string{
 const b=bindings;
 return "Answer "+[b.answerA,b.answerB,b.answerC,b.answerD].map(shortcutKeyLabel).join("/")+
   " for options A–D; "+shortcutKeyLabel(b.previous)+"/"+shortcutKeyLabel(b.next)+
   " previous/next (use Alt with navigation keys when a native radio is focused); "+
   shortcutKeyLabel(b.flag)+" marks for review even while paused; "+
   shortcutKeyLabel(b.fullscreen)+" toggles full screen. Typing, IME, Display and dialogs suspend shortcuts.";
}
export function resolveExamShortcut(c:ShortcutContext,bindings:ShortcutBindings=DEFAULT_SHORTCUTS):ShortcutCommand|null{
 if(c.blocked||c.editable)return null;
 const key=c.key.toLowerCase();
 // Paused exams cannot navigate, even through an Alt-modified mapping.
 if(c.paused)return !c.alt&&!c.repeat&&key===bindings.flag&&c.allowFlagging?{kind:"flag"}:null;
 // The focused native radio keeps unmodified arrows for its own semantics.
 if(key===bindings.previous||key===bindings.next){
   if(c.focusedRadio&&!c.alt)return null;
   return {kind:"navigate",delta:key===bindings.next?1:-1};
 }
 if(c.alt||c.repeat)return null;
 if(key===bindings.fullscreen)return {kind:"fullscreen"};
 if(key===bindings.flag)return c.allowFlagging?{kind:"flag"}:null;
 const i=[bindings.answerA,bindings.answerB,bindings.answerC,bindings.answerD].indexOf(key);
 return i>=0?{kind:"answer",index:i as 0|1|2|3}:null;
}
