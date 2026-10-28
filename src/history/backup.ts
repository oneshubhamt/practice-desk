import { sha256 } from "../content/import-cgl.ts";

/** Display assets are archived once per paper revision, not once per attempt. */
export interface ArchivedDisplayRevision {
  readonly id: string;
  readonly paperId: string;
  readonly displayPaper: Record<string, unknown>;
}
export interface BackupV2 {
  readonly format: "practice-desk-backup";
  readonly version: 2;
  readonly exportedAt: string;
  readonly attempts: readonly Record<string, unknown>[];
  readonly revisions: readonly ArchivedDisplayRevision[];
  readonly preferences: unknown;
  readonly manifest: {
    readonly algorithm: "sha256";
    readonly digest: string;
    readonly attemptCount: number;
    readonly revisionCount: number;
  };
}
type Core = Omit<BackupV2, "manifest">;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const digest = (core: Core): string => sha256(JSON.stringify(core));

export function archiveDisplayRevision(id: string, paperId: string, displayPaper: Record<string, unknown>): ArchivedDisplayRevision {
  if (!id || !paperId || !displayPaper || !Array.isArray(displayPaper.questions)) throw new Error("Invalid display revision");
  return clone({ id, paperId, displayPaper });
}

export function makeBackup(
  attempts: readonly Record<string, unknown>[], revisions: readonly ArchivedDisplayRevision[],
  preferences: unknown, exportedAt: string,
): BackupV2 {
  if (!Number.isFinite(Date.parse(exportedAt))) throw new Error("Invalid export timestamp");
  const core = clone({ format: "practice-desk-backup" as const, version: 2 as const,
    exportedAt, attempts, revisions, preferences });
  return { ...core, manifest: { algorithm: "sha256", digest: digest(core),
    attemptCount: core.attempts.length, revisionCount: core.revisions.length } };
}

export function verifyBackup(raw: unknown): BackupV2 {
  if (!raw || typeof raw !== "object") throw new Error("Invalid backup");
  const b = raw as Partial<BackupV2>;
  if (b.format !== "practice-desk-backup" || b.version !== 2 ||
      !Array.isArray(b.attempts) || !Array.isArray(b.revisions) ||
      b.attempts.length > 5000 || b.revisions.length > 500 ||
      typeof b.exportedAt !== "string" || !Number.isFinite(Date.parse(b.exportedAt))) throw new Error("Invalid backup format");
  if (b.attempts.some(a => !a || typeof a !== "object" || typeof a.id !== "string" || a.id.length > 200) ||
      b.revisions.some(r => !r || typeof r.id !== "string" || typeof r.paperId !== "string" ||
        !r.displayPaper || !Array.isArray(r.displayPaper.questions)) ||
      new Set(b.attempts.map(a => a.id)).size !== b.attempts.length ||
      new Set(b.revisions.map(r => r.id)).size !== b.revisions.length) throw new Error("Invalid backup records");
  const { manifest, ...core } = b;
  if (!manifest || manifest.algorithm !== "sha256" ||
      manifest.attemptCount !== b.attempts.length || manifest.revisionCount !== b.revisions.length ||
      manifest.digest !== digest(core as Core)) throw new Error("Backup integrity check failed");
  return b as BackupV2;
}
