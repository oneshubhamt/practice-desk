/**
 * Materially improve Day 1 while preserving the exact earlier source.
 * Generates canonical source + revised practice files; never edits the original
 * archive/recovered-day1.authoring.json or the verbatim recovery snapshot.
 * The formal source/reviewed publishing gate still requires independent review.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {explanations,revisedOptions} from './review-content.mjs';
const directory=dirname(fileURLToPath(import.meta.url));
const source=JSON.parse(readFileSync(join(directory,'archive','recovered-day1.authoring.json'),'utf8'));
if(source.questions.length!==51)throw Error('Source must retain one précis + 50 MCQs');
if(Object.keys(explanations).length!==50||Object.keys(revisedOptions).length!==12)
 throw Error('Incomplete editorial content inventory');
const title='PFRDA Grade A 2026 — Day 1';
source.title=title+' — Original Source (20-mark English rubric)';
source.questions[0].scoringOverride={correctMarks:20,incorrectMarks:0,unansweredMarks:0};
const revised=structuredClone(source);
revised.revision=2;
revised.title=title+' — Revised Practice';

// The source passage itself remains byte-for-byte unchanged. In the revised
// candidate view the neutral stimulus heading no longer supplies the title.
revised.stimuli[0].title='Untitled passage for précis';

const published=(publisher,title,url,provision)=>({publisher,title,url,stance:'supports',
 ...(provision?{provision,asOfDate:'2026-11-15'}:{})});
const icai=published('ICAI','AS 2: Valuation of Inventories',
 'https://kb.icai.org/pdfs/69232asb55316-as2.pdf');
const costing=published('ICMAI','Cost Accounting study material',
 'https://www.icmai.in/upload/Students/Syllabus2022/Inter_Stdy_Mtrl/P8.pdf');
const priceVariance=published('ICMAI','Standard Costing and Variance Analysis',
 'https://icmai.in/upload/Students/Syllabus2022/Inter_Stdy_Mtrl/P12_160824.pdf');
const cra=published('PFRDA','Central Recordkeeping Agency functions',
 'https://pfrda.org.in/en/intermediaries/registered-intermediaries/central-record-keeping-agency');
const nps=published('PFRDA','NPS for All Citizen Models',
 'https://pfrda.org.in/en/schemes/national-pension-system/nps-for-all-citizen-models');
const bop=published('RBI','Balance of Payments: Concepts and Definitions',
 'https://rbi.org.in/scripts/PublicationsView.aspx?id=13013');
const sources={3:[icai],6:[costing],9:[cra],18:[costing],30:[costing],
 33:[nps],40:[priceVariance],42:[bop],43:[nps]};

for(let i=1;i<=50;i++){
 const q=revised.questions[i];
 if(q.id!==`day1-general-${String(i).padStart(2,'0')}`)
  throw Error('Source identity changed at '+i);
 if(typeof explanations[i]!=='string'||explanations[i].length<150)
  throw Error('Explanation missing or too thin for '+i);
 q.explanation=explanations[i];
 if(revisedOptions[i]){
  if(revisedOptions[i].length!==4||new Set(revisedOptions[i]).size!==4)
   throw Error('Invalid reviewed distractors at '+i);
  q.options=revisedOptions[i];
 }
 if(sources[i]){
  const existing=q.provenance.sources??[];
  q.provenance.sources=[...existing,...sources[i]];
 }
 if(i===49){
  const existing=q.provenance.sources??[];
  q.provenance.sources=existing.map(s=>s.publisher==='Ministry of Corporate Affairs'?
   {...s,provision:'Sections 173(1), 410 and 421'}:s);
 }
 q.qa={...q.qa,status:'needs-review'};
}

const originalQs=source.questions.slice(1);
const revisedQs=revised.questions.slice(1);
if(revisedQs.some((q,i)=>q.id!==originalQs[i].id||q.answer!==originalQs[i].answer||q.prompt!==originalQs[i].prompt))
 throw Error('Reviewed questions must keep original IDs, keys and stems');
const dump=(parts,data)=>writeFileSync(join(directory,...parts),JSON.stringify(data,null,2)+'\n');
dump(['original','bank.authoring.json'],source);
dump(['revised','bank.authoring.json'],revised);
console.log('Wrote original-source and improved practice authoring banks; 50 explanations and 12 distractor sets reviewed.');
