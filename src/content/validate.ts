import type {
  ChoiceKey,
  ReviewEditorialStatus,
  SourceEditorialStatus,
} from "./schema.js";

export interface ContentValidationSummary {
  readonly sourcePapers: number;
  readonly questions: number;
  readonly patches: number;
  readonly solutions: number;
}

type UnknownRecord = Record<string, unknown>;

const CHOICES = ["a", "b", "c", "d"] as const;
const PAPER_FIELDS = ["id", "date", "name", "kind", "questions", "passages"];
const QUESTION_FIELDS = [
  "n", "stem", "opts", "key", "original", "status", "review", "explanation",
  "images", "sourcePage", "edition", "transcription", "sources", "passageRef",
];
const PATCH_FIELDS = [
  "stem", "opts", "key", "status", "review", "explanation", "revised", "sources",
];
const IMAGE_FIELDS = ["stem", "options"];
const SOURCE_STATUSES: readonly SourceEditorialStatus[] = ["ok", "caution", "invalid"];
const REVIEW_STATUSES: readonly ReviewEditorialStatus[] = ["corrected", "caution"];
const IMAGE_DATA_URI = /^data:image\/(?:webp|png|jpeg|gif);base64,[A-Za-z0-9+/]+={0,2}$/;
const PAPER_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const QUESTION_NUMBER = /^[1-9][0-9]*$/;
const SAFE_WEB_URL = /^https?:\/\/[^\s]+$/i;

function fail(path: string, reason: string): never {
  throw new Error("Content validation failed at " + path + ": " + reason);
}

function asRecord(value: unknown, path: string): UnknownRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "expected an object");
  }
  return value as UnknownRecord;
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) return fail(path, "expected an array");
  return value as unknown[];
}

function assertOnlyKeys(record: UnknownRecord, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(record)) {
    if (!allowed.includes(key)) fail(path + "." + key, "unknown field; update the content schema deliberately");
  }
}

function assertString(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== "string" || (!allowEmpty && value.trim().length === 0)) {
    return fail(path, allowEmpty ? "expected a string" : "expected a non-empty string");
  }
  return value;
}

function assertPositiveInteger(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    return fail(path, "expected a positive safe integer");
  }
  return value;
}

function assertChoice(value: unknown, path: string): ChoiceKey {
  if (typeof value !== "string" || !CHOICES.includes(value as ChoiceKey)) {
    return fail(path, "expected one of a, b, c or d");
  }
  return value as ChoiceKey;
}

function assertSourceReference(value: unknown, path: string): void {
  const source = asRecord(value, path);
  assertOnlyKeys(source, ["title", "url"], path);
  assertString(source["title"], path + ".title");
  const url = assertString(source["url"], path + ".url");
  if (!SAFE_WEB_URL.test(url)) fail(path + ".url", "expected an http(s) URL");
}

function assertSourceReferences(value: unknown, path: string): void {
  asArray(value, path).forEach((source, index) => assertSourceReference(source, path + "[" + index + "]"));
}

function assertDataImage(value: unknown, path: string): void {
  const uri = assertString(value, path);
  if (!IMAGE_DATA_URI.test(uri)) {
    fail(path, "expected a self-contained raster image data URI");
  }
}

function assertImages(value: unknown, path: string): void {
  const images = asRecord(value, path);
  assertOnlyKeys(images, IMAGE_FIELDS, path);

  if (Object.hasOwn(images, "stem")) assertDataImage(images["stem"], path + ".stem");
  if (Object.hasOwn(images, "options")) {
    const options = asRecord(images["options"], path + ".options");
    for (const [index, image] of Object.entries(options)) {
      if (!["0", "1", "2", "3"].includes(index)) {
        fail(path + ".options." + index, "option image index must be between 0 and 3");
      }
      assertDataImage(image, path + ".options." + index);
    }
  }
}

function assertFourOptions(value: unknown, path: string): void {
  const options = asArray(value, path);
  if (options.length !== 4) fail(path, "expected exactly four options in the current source-paper format");
  options.forEach((option, index) => assertString(option, path + "[" + index + "]"));
}

function validateSourceQuestion(value: unknown, path: string): { n: number; passageRef?: string } {
  const question = asRecord(value, path);
  assertOnlyKeys(question, QUESTION_FIELDS, path);
  const n = assertPositiveInteger(question["n"], path + ".n");
  assertString(question["stem"], path + ".stem");
  assertFourOptions(question["opts"], path + ".opts");
  assertChoice(question["key"], path + ".key");
  assertChoice(question["original"], path + ".original");

  if (typeof question["status"] !== "string" ||
      !SOURCE_STATUSES.includes(question["status"] as SourceEditorialStatus)) {
    fail(path + ".status", "unknown source editorial status");
  }
  assertString(question["review"], path + ".review", true);
  assertString(question["explanation"], path + ".explanation", true);
  assertImages(question["images"], path + ".images");
  assertPositiveInteger(question["sourcePage"], path + ".sourcePage");
  if (question["edition"] !== "original") fail(path + ".edition", "source-bank records must remain original");
  assertString(question["transcription"], path + ".transcription");

  if (Object.hasOwn(question, "sources")) assertSourceReferences(question["sources"], path + ".sources");
  let passageRef: string | undefined;
  if (Object.hasOwn(question, "passageRef")) passageRef = assertString(question["passageRef"], path + ".passageRef");
  return passageRef === undefined ? { n } : { n, passageRef };
}

function validatePatch(value: unknown, path: string): void {
  const patch = asRecord(value, path);
  assertOnlyKeys(patch, PATCH_FIELDS, path);

  if (Object.hasOwn(patch, "stem")) assertString(patch["stem"], path + ".stem");
  if (Object.hasOwn(patch, "opts")) assertFourOptions(patch["opts"], path + ".opts");
  if (Object.hasOwn(patch, "key")) assertChoice(patch["key"], path + ".key");
  if (Object.hasOwn(patch, "status") &&
      (typeof patch["status"] !== "string" ||
       !REVIEW_STATUSES.includes(patch["status"] as ReviewEditorialStatus))) {
    fail(path + ".status", "unknown reviewed editorial status");
  }
  if (Object.hasOwn(patch, "review")) assertString(patch["review"], path + ".review", true);
  if (Object.hasOwn(patch, "explanation")) assertString(patch["explanation"], path + ".explanation", true);
  if (Object.hasOwn(patch, "revised") && typeof patch["revised"] !== "boolean") {
    fail(path + ".revised", "expected a boolean");
  }
  if (Object.hasOwn(patch, "sources")) assertSourceReferences(patch["sources"], path + ".sources");
}

function assertQuestionNumberKey(key: string, path: string, knownQuestions: ReadonlySet<number>): void {
  if (!QUESTION_NUMBER.test(key)) fail(path, "question key must be a positive decimal integer");
  if (!knownQuestions.has(Number(key))) fail(path, "references a question that does not exist in the source paper");
}

/**
 * Validates the existing source/patch/solution JSON without mutating it.
 * Strict checks make malformed content fail the build instead of shipping.
 */
export function validateContent(input: {
  readonly papers: unknown;
  readonly patches: unknown;
  readonly solutions: unknown;
}): ContentValidationSummary {
  const papers = asRecord(input.papers, "papers");
  const patches = asRecord(input.patches, "patches");
  const solutions = asRecord(input.solutions, "solutions");
  const paperQuestions = new Map<string, Set<number>>();
  let questionCount = 0;
  let patchCount = 0;
  let solutionCount = 0;

  if (Object.keys(papers).length === 0) fail("papers", "no source papers");

  for (const [paperId, rawPaper] of Object.entries(papers)) {
    if (!PAPER_ID.test(paperId)) fail("papers." + paperId, "paper ID must be a lowercase slug");
    const paper = asRecord(rawPaper, "papers." + paperId);
    assertOnlyKeys(paper, PAPER_FIELDS, "papers." + paperId);
    if (paper["id"] !== paperId) fail("papers." + paperId + ".id", "must match its bank key");
    assertString(paper["date"], "papers." + paperId + ".date");
    assertString(paper["name"], "papers." + paperId + ".name");
    assertString(paper["kind"], "papers." + paperId + ".kind");

    const passages = asRecord(paper["passages"], "papers." + paperId + ".passages");
    for (const [passageId, text] of Object.entries(passages)) {
      if (!/^[A-Za-z0-9_-]+$/.test(passageId)) fail("papers." + paperId + ".passages." + passageId, "invalid passage ID");
      assertString(text, "papers." + paperId + ".passages." + passageId);
    }

    const questions = asArray(paper["questions"], "papers." + paperId + ".questions");
    if (questions.length === 0) fail("papers." + paperId + ".questions", "paper must contain questions");
    const seen = new Set<number>();

    questions.forEach((rawQuestion, index) => {
      const path = "papers." + paperId + ".questions[" + index + "]";
      const question = validateSourceQuestion(rawQuestion, path);
      if (seen.has(question.n)) fail(path + ".n", "duplicate question number " + question.n);
      seen.add(question.n);
      if (question.passageRef !== undefined && !Object.hasOwn(passages, question.passageRef)) {
        fail(path + ".passageRef", "references missing passage " + question.passageRef);
      }
    });

    paperQuestions.set(paperId, seen);
    questionCount += questions.length;
  }

  for (const [paperId, rawPack] of Object.entries(patches)) {
    const knownQuestions = paperQuestions.get(paperId);
    if (!knownQuestions) fail("patches." + paperId, "references an unknown source paper");
    const pack = asRecord(rawPack, "patches." + paperId);
    for (const [number, patch] of Object.entries(pack)) {
      const path = "patches." + paperId + "." + number;
      assertQuestionNumberKey(number, path, knownQuestions);
      validatePatch(patch, path);
      patchCount += 1;
    }
  }

  for (const [paperId, rawPack] of Object.entries(solutions)) {
    const knownQuestions = paperQuestions.get(paperId);
    if (!knownQuestions) fail("solutions." + paperId, "references an unknown source paper");
    const pack = asRecord(rawPack, "solutions." + paperId);
    for (const [number, solution] of Object.entries(pack)) {
      const path = "solutions." + paperId + "." + number;
      assertQuestionNumberKey(number, path, knownQuestions);
      assertString(solution, path);
      solutionCount += 1;
    }
  }

  return {
    sourcePapers: Object.keys(papers).length,
    questions: questionCount,
    patches: patchCount,
    solutions: solutionCount,
  };
}
