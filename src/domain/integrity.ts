import type { QuestionRevision } from "./question.js";
import type { AnswerKeyRevision } from "./answer-key.js";
import type { PaperRevision } from "./exam.js";
import type { ContentHash } from "./ids.js";
import { hashJson } from "./hash.ts";

export function questionRevisionHash(value:Pick<QuestionRevision,"content"|"editorial">):ContentHash{
 return hashJson({content:value.content,editorial:value.editorial}) as ContentHash;
}
export function answerKeyRevisionHash(value:Pick<AnswerKeyRevision,"entries">):ContentHash{
 return hashJson(value.entries) as ContentHash;
}
export function paperRevisionHash(value:Pick<PaperRevision,
 "sections"|"timing"|"navigation"|"scoring"|"answerKeyRevisionId"|"edition">):ContentHash{
 return hashJson({sections:value.sections,timing:value.timing,navigation:value.navigation,
   scoring:value.scoring,answerKeyRevisionId:value.answerKeyRevisionId,edition:value.edition}) as ContentHash;
}
export function assertRevisionHashes(
 questions:readonly QuestionRevision[],key:AnswerKeyRevision,paper:PaperRevision
):void{
 for(const question of questions)
   if(question.contentHash!==questionRevisionHash(question))
     throw new Error("Question revision content hash mismatch: "+question.id);
 if(key.contentHash!==answerKeyRevisionHash(key))
   throw new Error("Answer-key revision content hash mismatch");
 if(paper.contentHash!==paperRevisionHash(paper))
   throw new Error("Paper revision content hash mismatch");
}
