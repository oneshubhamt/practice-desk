import {writePracticeDeskTarget} from "./build-target.mjs";

const result=await writePracticeDeskTarget("standalone");
console.log("Built "+result.stats.bytes+" bytes (single offline HTML). "+
 "KaTeX: "+result.stats.katexFamilies+" WOFF2 families, "+
 result.stats.katexFontBytes+" font bytes inlined as "+
 result.stats.katexBase64Characters+" base64 data-URI characters.");
