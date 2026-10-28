import type { CandidateResponse, QuestionRevision } from "../domain/question.js";

/** Reject invalid candidate input at the engine boundary, independently of UI controls. */
export function validateResponse(question: QuestionRevision, response: CandidateResponse): void {
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
      if (response.kind !== "matching" || new Set(response.pairs.map(p => p.leftId)).size !== response.pairs.length ||
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
