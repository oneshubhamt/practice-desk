import type { EditorialRecord } from "../domain/question.js";
import type { PaperRevision } from "../domain/exam.js";

/** Frozen post-test editorial metadata is distinct from correctness or
 * authority of an answer key. Never turn an imported label into an
 * independently verified or official determination.
 */
export function editorialStatusLabel(record:Pick<EditorialRecord,"status"|"changes">):string{
 switch(record.status){
  case "verified": return "Marked verified by source or author";
  case "corrected": return record.changes?.includes("answer-key")?
    "Key corrected · recorded editorial change":
    "Editorial correction recorded · type may vary";
  case "caution": return record.changes?.includes("wording")?
    "Wording caution · review notes; answer key not certified here":
    "Editorial caution · review notes; answer key not certified here";
  case "invalid": return "Defective · excluded from automated scoring";
  case "draft": return "Draft · excluded from automated scoring";
  case "under-review": return "Under review · excluded from automated scoring";
  case "incomplete-source": return "Incomplete source · excluded from automated scoring";
  case "superseded": return "Superseded · excluded from automated scoring";
 }
}


export function paperEditionLabel(
 paper:Pick<PaperRevision,"edition"|"revision"|"sourcePaperRevisionId">
):string{
 if(paper.edition==="custom")return "Custom practice revision r"+paper.revision;
 if(paper.edition==="source")return "Source edition r"+paper.revision;
 return "Reviewed edition r"+paper.revision+
  (paper.sourcePaperRevisionId?" · exact Source lineage pinned":"");
}
