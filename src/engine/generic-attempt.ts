import type {FrozenAttemptContent,ManualGrade,NotebookLineage,PracticeComposition} from "../domain/attempt.js";
import type {SessionState} from "./session.ts";
import type {scoreAttempt} from "./scoring.ts";
import type {SourceKeyReference} from "./source-comparison.ts";
import type {SourceReviewReference} from "./review-source.ts";

export type CompletionReason="time-expired"|"submitted"|"section-submitted";

export interface GenericAttempt {
 readonly recordType: "generic-attempt";
 /** 0 before first durable write; persistence advances monotonically from 1. */
 readonly saveRevision: number;
 readonly id: string;
 readonly packageId: string;
 readonly startedAt: number;
 readonly updatedAt: number;
 readonly finishedAt: number | null;
 readonly frozen: FrozenAttemptContent;
 readonly state: SessionState;
 readonly result?: ReturnType<typeof scoreAttempt>;
 readonly manualGrades?: readonly ManualGrade[];
 readonly sourceKeyReference?: SourceKeyReference;
 /** Optional frozen original wording, media and source answer for revised exams. */
 readonly sourceReviewReference?: SourceReviewReference;
 /** Null while unfinished; mandatory provenance once the attempt completes. */
 readonly completionReason: CompletionReason|null;
 readonly notebookLineage?: NotebookLineage;
 /** Hash-covered seed, filter and source revision manifest for an authored custom subset. */
 readonly practiceComposition?: PracticeComposition;
 readonly explanations?: Readonly<Record<string,string>>;
}
