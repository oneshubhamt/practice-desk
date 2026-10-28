import type { SourcePaperBank, ReviewPatchBank, QuestionPatch, ChoiceKey } from "./schema.js";
import type { PaperRevision } from "../domain/exam.js";
import type { QuestionRevision } from "../domain/question.js";
import type { AnswerKeyRevision } from "../domain/answer-key.js";
import type { AssetId, ContentHash, OptionId, PaperId, PaperRevisionId, QuestionId, QuestionRevisionId, SectionId, AnswerKeyRevisionId, StimulusId } from "../domain/ids.js";
import { validateAnswerKeyRevision, validatePaperRevision, validateQuestionRevision } from "../domain/validate.js";

/** Small synchronous SHA-256 implementation for offline/file:// compatibility. */
function sha256(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const length = bytes.length;
  const padded = new Uint8Array(Math.ceil((length + 9) / 64) * 64);
  padded.set(bytes);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  const bits = length * 8;
  view.setUint32(padded.length - 8, Math.floor(bits / 0x100000000));
  view.setUint32(padded.length - 4, bits >>> 0);
  const k = new Uint32Array([
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4b,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ]);
  const h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const w = new Uint32Array(64);
  const rotate = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const a = w[i - 15]!, b = w[i - 2]!;
      w[i] = (w[i - 16]! + (rotate(a,7) ^ rotate(a,18) ^ (a >>> 3)) +
        w[i - 7]! + (rotate(b,17) ^ rotate(b,19) ^ (b >>> 10))) >>> 0;
    }
    let [a,b,c,d,e,f,g,z] = h;
    for (let i = 0; i < 64; i++) {
      const s1 = rotate(e!,6) ^ rotate(e!,11) ^ rotate(e!,25);
      const ch = (e! & f!) ^ (~e! & g!);
      const t1 = (z! + s1 + ch + k[i]! + w[i]!) >>> 0;
      const s0 = rotate(a!,2) ^ rotate(a!,13) ^ rotate(a!,22);
      const maj = (a! & b!) ^ (a! & c!) ^ (b! & c!);
      const t2 = (s0 + maj) >>> 0;
      z=g;g=f;f=e;e=(d!+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    for (const [i,v] of [a,b,c,d,e,f,g,z].entries()) h[i] = (h[i]! + v!) >>> 0;
  }
  return Array.from(h, n => n.toString(16).padStart(8,"0")).join("");
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
