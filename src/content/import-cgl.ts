import type { SourcePaperBank, ReviewPatchBank, QuestionPatch, ChoiceKey } from "./schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision } from "../domain/question.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { AssetId, OptionId, PaperId, PaperRevisionId, QuestionId, QuestionRevisionId, SectionId, AnswerKeyRevisionId, StimulusId } from "../domain/ids.js";
import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "../domain/validate.ts";

export { sha256 } from "../domain/hash.ts";
import { questionRevisionHash, answerKeyRevisionHash, paperRevisionHash } from "../domain/integrity.ts";
const optionId = (question: string, letter: string): OptionId => `${question}:option:${letter}` as OptionId;
const sectionNames = ["Reasoning", "General Awareness", "Quantitative Aptitude", "English"] as const;

/** Source-bank importer: no changes to the published JSON or v11 runtime. */
export function importCglBank(papers: SourcePaperBank, patches: ReviewPatchBank) {
  const results: { paper: PaperRevision; key: AnswerKeyRevision; questions: QuestionRevision[] }[] = [];
  for (const source of Object.values(papers)) {
    for (const edition of ["source", "reviewed"] as const) {
      const paperId = source.id as PaperId;
      const patchMap = edition === "reviewed" ? patches[source.id] ?? {} : {};
      const questions: QuestionRevision[] = [];
      const entries: AnswerKeyRevision["entries"][number][] = [];
      const sections: { id: SectionId; title: string; questionRevisionIds: QuestionRevisionId[] }[] =
        sectionNames.map((title, i) => ({ id: `${source.id}:section:${i + 1}` as SectionId, title, questionRevisionIds: [] }));
      for (const original of source.questions) {
        const patch: QuestionPatch = patchMap[String(original.n)] ?? {};
        const merged = { ...original, ...patch };
        const stableId = `${source.id}:q:${original.n}`;
        const options = merged.opts.map((text, index) => ({
          id: optionId(stableId, "abcd"[index]!), text,
          ...(merged.images.options?.[index] ? { assetIds: [`${stableId}:option:${index}` as AssetId] } : {}),
        }));
        const editorialStatus = edition === "source"
          ? original.status === "ok" ? "verified" : original.status
          : patch.status === "corrected" ? "corrected"
            : patch.status === "caution" ? "caution"
              : original.status === "invalid" ? "invalid"
                : original.status === "caution" ? "caution" : "verified";
        const content = { kind: "single-choice" as const, prompt: merged.stem, options,
          ...(original.passageRef ? { stimulusId: `${source.id}:passage:${original.passageRef}` as StimulusId } : {}),
          ...(merged.images.stem ? { assetIds: [`${stableId}:stem` as AssetId] } : {}) };
        const editorial = { status: editorialStatus as QuestionRevision["editorial"]["status"],
          sourcePage: original.sourcePage,
          ...(merged.review ? { notes: merged.review } : {}),
          ...(merged.sources?.length ? { sources: merged.sources } : {}) };
        const fingerprint = questionRevisionHash({content,editorial});
        const id = `${stableId}:${edition}:${fingerprint.slice(0,16)}` as QuestionRevisionId;
        const question = validateQuestionRevision({ id, questionId: stableId as QuestionId, revision: 1, contentHash: fingerprint,
          content, editorial });
        questions.push(question);
        entries.push({ questionRevisionId: id, answer: { kind: "single-choice", optionId: optionId(stableId, merged.key as ChoiceKey) } });
        // CGL Tier I source paper: 25 questions in each of four sections.
        const section = sections[Math.floor((original.n - 1) / 25)];
        if (!section) throw new Error("CGL source question out of section range");
        section.questionRevisionIds.push(id);
      }
      const keyFingerprint = answerKeyRevisionHash({entries});
      const key = validateAnswerKeyRevision({ id: `${source.id}:${edition}:key:${keyFingerprint.slice(0,16)}` as AnswerKeyRevisionId,
        paperId, revision: 1, contentHash: keyFingerprint, entries }, questions);
      const timing = { kind: "sectional" as const,
        sectionLimits: sections.map(section => ({ sectionId: section.id, durationMs: 900000 })),
        transition: "manual" as const, allowEarlySubmit: true, pausePolicy: "forbidden" as const };
      const navigation = { questionNavigation: "free" as const, sectionNavigation: "sequential-locked" as const,
        allowFlagging: true, allowReview: true };
      const scoring = { defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 } };
      const paperContent = { sections, timing, navigation, scoring, answerKeyRevisionId: key.id, edition };
      const fingerprint = paperRevisionHash(paperContent);
      const paper = validatePaperRevision({ id: `${source.id}:${edition}:${fingerprint.slice(0,16)}` as PaperRevisionId,
        paperId, revision: 1, contentHash: fingerprint, ...paperContent }, questions, key);
      results.push({ paper, key, questions });
    }
  }
  return results;
}
