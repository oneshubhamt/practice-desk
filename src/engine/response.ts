import type { CandidateResponse, QuestionRevision } from "../domain/question.js";

/** Reject invalid candidate input at the engine boundary, independently of UI controls. */
export function validateResponse(question: QuestionRevision, response: CandidateResponse): void {
  // The same validator protects active UI events and untrusted persisted
  // candidate responses. No extra keys may hide unsigned response metadata.
  if(!response||typeof response!=="object"||Array.isArray(response)||
     ![Object.prototype,null].includes(Object.getPrototypeOf(response)))
    throw new Error("Invalid candidate response object");
  const allowed:Record<CandidateResponse["kind"],readonly string[]>={
    "single-choice":["kind","optionId"],
    "multiple-select":["kind","optionIds"],
    "numeric-entry":["kind","value"],
    "true-false":["kind","value"],
    "matching":["kind","pairs"],
    "free-response":["kind","text"]
  };
  const fields=allowed[response.kind];
  if(!fields||Object.keys(response).some(key=>!fields.includes(key)))
    throw new Error("Candidate response: unsupported field or kind");
  const content = question.content;
  if (response.kind !== content.kind) throw new Error("Response kind does not match question");
  switch (content.kind) {
    case "single-choice": {
      if (response.kind !== "single-choice" || !content.options.some(o => o.id === response.optionId)) throw new Error("Unknown option");
      break;
    }
    case "multiple-select": {
      if (response.kind !== "multiple-select") throw new Error("Wrong response");
      const ids = response.optionIds;
      if (new Set(ids).size !== ids.length || ids.length < (content.minSelections ?? 1) ||
          ids.length > (content.maxSelections ?? content.options.length) ||
          ids.some(id => !content.options.some(o => o.id === id))) throw new Error("Invalid multiple selection");
      break;
    }
    case "numeric-entry": {
      if (response.kind !== "numeric-entry" || !Number.isFinite(response.value) ||
          (content.numericRules.minimum !== undefined && response.value < content.numericRules.minimum) ||
          (content.numericRules.maximum !== undefined && response.value > content.numericRules.maximum) ||
          (content.numericRules.allowNegative === false && response.value < 0) ||
          (content.numericRules.decimalPlaces !== undefined &&
            Number(response.value.toFixed(content.numericRules.decimalPlaces)) !== response.value)) throw new Error("Invalid numeric entry");
      break;
    }
    case "true-false": {
      if (response.kind !== "true-false" || typeof response.value !== "boolean") throw new Error("Invalid boolean");
      break;
    }
    case "matching": {
      if(response.kind !== "matching"||!Array.isArray(response.pairs)||
         response.pairs.some(pair=>!pair||typeof pair!=="object"||Array.isArray(pair)||
           ![Object.prototype,null].includes(Object.getPrototypeOf(pair))||
           Object.keys(pair).some(key=>!["leftId","rightId"].includes(key))))
        throw new Error("Invalid matching response pair fields");
      if (new Set(response.pairs.map(p => p.leftId)).size !== response.pairs.length ||
          new Set(response.pairs.map(p => p.rightId)).size !== response.pairs.length ||
          response.pairs.some(p => !content.leftItems.some(i => i.id === p.leftId) ||
            !content.rightItems.some(i => i.id === p.rightId))) throw new Error("Invalid matching response");
      break;
    }
    case "free-response": {
      if (response.kind !== "free-response" || typeof response.text !== "string") throw new Error("Invalid text");
      const words = response.text.trim() ? response.text.trim().split(/\s+/).length : 0;
      if ((content.responseRules.minWords !== undefined && words < content.responseRules.minWords) ||
          (content.responseRules.maxWords !== undefined && words > content.responseRules.maxWords)) throw new Error("Invalid response length");
      break;
    }
  }
}
