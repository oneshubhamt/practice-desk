import type { SourcePaperBank, ReviewPatchBank, QuestionPatch, ChoiceKey } from "./schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision } from "../domain/question.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { AssetId, ContentHash, OptionId, PaperId, PaperRevisionId, QuestionId, QuestionRevisionId, SectionId, AnswerKeyRevisionId, StimulusId } from "../domain/ids.js";
import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "../domain/validate.ts";

/** Shared initial state/constants; never rebuild primes for every question hash. */
const SHA_CONSTANTS = (() => {
  const primes: number[] = [];
  for (let candidate = 2; primes.length < 64; candidate++) {
    let prime = true;
    for (let divisor = 2; divisor * divisor <= candidate; divisor++) {
      if (candidate % divisor === 0) { prime = false; break; }
    }
    if (prime) primes.push(candidate);
  }
  return {
    k: new Uint32Array(primes.map(p => Math.floor((Math.cbrt(p) % 1) * 2 ** 32) >>> 0)),
    initial: new Uint32Array(primes.slice(0,8).map(p => Math.floor((Math.sqrt(p) % 1) * 2 ** 32) >>> 0)),
  };
})();

/** SHA-256, synchronous and browser-safe; no Node crypto or network API required. */
export function sha256(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor((bytes.length * 8) / 0x100000000));
  view.setUint32(padded.length - 4, (bytes.length * 8) >>> 0);
  const { k, initial } = SHA_CONSTANTS;
  const h = new Uint32Array(initial);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + 4 * i);
    for (let i = 16; i < 64; i++) {
      const left = w[i - 15] ?? 0, right = w[i - 2] ?? 0;
      w[i] = ((w[i - 16] ?? 0) +
        (rotr(left, 7) ^ rotr(left, 18) ^ (left >>> 3)) +
        (w[i - 7] ?? 0) +
        (rotr(right, 17) ^ rotr(right, 19) ^ (right >>> 10))) >>> 0;
    }
    let a = h[0] ?? 0, b = h[1] ?? 0, c = h[2] ?? 0, d = h[3] ?? 0;
    let e = h[4] ?? 0, f = h[5] ?? 0, g = h[6] ?? 0, z = h[7] ?? 0;
    for (let i = 0; i < 64; i++) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choose = (e & f) ^ (~e & g);
      const temp1 = (z + s1 + choose + (k[i] ?? 0) + (w[i] ?? 0)) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      z = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    for (const [i, value] of [a, b, c, d, e, f, g, z].entries()) {
      h[i] = ((h[i] ?? 0) + value) >>> 0;
    }
  }
  return Array.from(h, part => part.toString(16).padStart(8, "0")).join("");
}
const hash = (data: unknown): ContentHash => sha256(JSON.stringify(data)) as ContentHash;
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
        const options = merged.opts.map((text, index) => ({ id: optionId(stableId, "abcd"[index]!), text }));
        const editorialStatus = edition === "source"
          ? original.status === "ok" ? "verified" : original.status
          : patch.status === "corrected" ? "corrected"
            : patch.status === "caution" ? "caution"
              : original.status === "invalid" ? "invalid"
                : original.status === "caution" ? "caution" : "verified";
        const content = { kind: "single-choice" as const, prompt: merged.stem, options,
          ...(original.passageRef ? { stimulusId: `${source.id}:passage:${original.passageRef}` as StimulusId } : {}),
          ...(merged.images.stem ? { assetIds: [`${stableId}:stem` as AssetId] } : {}) };
        const fingerprint = hash({ content, editorialStatus, review: merged.review, explanation: merged.explanation, images: merged.images });
        const id = `${stableId}:${edition}:${fingerprint.slice(0,16)}` as QuestionRevisionId;
        const question = validateQuestionRevision({ id, questionId: stableId as QuestionId, revision: 1, contentHash: fingerprint,
          content, editorial: { status: editorialStatus, ...(merged.review ? { notes: merged.review } : {}) } });
        questions.push(question);
        entries.push({ questionRevisionId: id, answer: { kind: "single-choice", optionId: optionId(stableId, merged.key as ChoiceKey) } });
        // CGL Tier I source paper: 25 questions in each of four sections.
        const section = sections[Math.floor((original.n - 1) / 25)];
        if (!section) throw new Error("CGL source question out of section range");
        section.questionRevisionIds.push(id);
      }
      const keyFingerprint = hash(entries);
      const key = validateAnswerKeyRevision({ id: `${source.id}:${edition}:key:${keyFingerprint.slice(0,16)}` as AnswerKeyRevisionId,
        paperId, revision: 1, contentHash: keyFingerprint, entries }, questions);
      const timing = { kind: "sectional" as const,
        sectionLimits: sections.map(section => ({ sectionId: section.id, durationMs: 900000 })),
        transition: "manual" as const, allowEarlySubmit: true, pausePolicy: "forbidden" as const };
      const navigation = { questionNavigation: "free" as const, sectionNavigation: "sequential-locked" as const,
        allowFlagging: true, allowReview: true };
      const scoring = { defaultRule: { correctMarks: 2, incorrectMarks: -0.5, unansweredMarks: 0 } };
      const paperContent = { sections, timing, navigation, scoring, answerKeyRevisionId: key.id, edition };
      const fingerprint = hash(paperContent);
      const paper = validatePaperRevision({ id: `${source.id}:${edition}:${fingerprint.slice(0,16)}` as PaperRevisionId,
        paperId, revision: 1, contentHash: fingerprint, ...paperContent }, questions, key);
      results.push({ paper, key, questions });
    }
  }
  return results;
}
