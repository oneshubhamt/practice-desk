/** A pure keyboard-command table; no duplicate exam listener or state ownership. */
export type ShortcutContext={readonly key:string;readonly alt:boolean;readonly repeat:boolean;
 readonly paused:boolean;readonly focusedRadio:boolean;readonly editable:boolean;
 readonly blocked:boolean;readonly allowFlagging:boolean};
export type ShortcutCommand=
 | {readonly kind:"navigate";readonly delta:-1|1}
 | {readonly kind:"answer";readonly index:0|1|2|3}
 | {readonly kind:"flag"}|{readonly kind:"fullscreen"};
export const EXAM_SHORTCUT_HELP="A–D answer single-choice; Left/Right navigate except on native radios, "+
 "where Alt+Left/Right navigates; M marks/unmarks for review even when paused; F toggles full screen. "+
 "Typing, Display and modal dialogs suspend shortcuts.";
export function resolveExamShortcut(c:ShortcutContext):ShortcutCommand|null{
 if(c.blocked||c.editable)return null;
 const key=c.key.toLowerCase(),arrow=key==="arrowleft"||key==="arrowright";
 if(c.alt&&!arrow)return null;
 if(c.paused)return key==="m"&&!c.alt&&!c.repeat&&c.allowFlagging?{kind:"flag"}:null;
 if(arrow){if(c.focusedRadio&&!c.alt)return null;
   return {kind:"navigate",delta:key==="arrowright"?1:-1};}
 if(c.alt||c.repeat)return null;
 if(key==="f")return {kind:"fullscreen"};
 if(key==="m")return c.allowFlagging?{kind:"flag"}:null;
 if(key==="a"||key==="b"||key==="c"||key==="d")
   return {kind:"answer",index:(key.charCodeAt(0)-97) as 0|1|2|3};
 return null;
}
