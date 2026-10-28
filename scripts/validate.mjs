export function validateContent({papers, patches, solutions}){
 const ids=Object.keys(papers);
 if(!ids.length)throw new Error('No source papers');
 let count=0;
 for(const id of ids){
  const paper=papers[id];
  if(paper.id!==id||!Array.isArray(paper.questions)||!paper.questions.length)throw new Error('Malformed paper '+id);
  const seen=new Set();
  for(const q of paper.questions){
   if(!Number.isInteger(q.n)||seen.has(q.n))throw new Error('Duplicate question '+id+'/'+q.n);
   seen.add(q.n);count++;
   if(typeof q.stem!=='string'||!q.stem.trim())throw new Error('Empty stem '+id+'/'+q.n);
   if(!Array.isArray(q.opts)||q.opts.length!==4||q.opts.some(v=>typeof v!=='string'))throw new Error('Invalid options '+id+'/'+q.n);
   if(typeof q.key!=='string'||q.key.length!==1||!'abcd'.includes(q.key))throw new Error('Invalid answer '+id+'/'+q.n);
  }
  for(const n of Object.keys(patches[id]||{}))if(!seen.has(Number(n)))throw new Error('Orphan patch '+id+'/'+n);
  for(const n of Object.keys(solutions[id]||{}))if(!seen.has(Number(n)))throw new Error('Orphan solution '+id+'/'+n);
 }
 for(const id of [...Object.keys(patches),...Object.keys(solutions)])if(!(id in papers))throw new Error('Orphan pack '+id);
 return {sourcePapers:ids.length,questions:count};
}
