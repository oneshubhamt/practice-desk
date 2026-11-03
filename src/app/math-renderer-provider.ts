/** Single composition root: change this module when swapping the math engine.
 * Read-only views depend on MathRendererPort, not KaTeX implementation details.
 */
import type {MathRendererPort} from "../authoring/vendor-ports.ts";
import {mathRenderer as katexMathRenderer} from "./katex-math-adapter.ts";
export const mathRenderer:MathRendererPort=katexMathRenderer;
