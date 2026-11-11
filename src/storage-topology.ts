/** Single current browser persistence topology.
 * These identifiers have no aliases, migration readers or dual-write paths.
 * Obsolete development storage is intentionally ignored.
 */
export const STORAGE_TOPOLOGY={
  preferences:"practiceDesk.preferences",
  practiceSetups:"practiceDesk.practiceSetups",
  revisionSettings:"practiceDesk.revision.settings",
  shortcuts:"practiceDesk.shortcuts",
  candidateToolsPrefix:"practiceDesk.candidateTools:",
  authoringDrafts:"practiceDesk.authoring.drafts",
  authoringStaging:"practiceDesk.authoring.staging",
  historyView:"practiceDesk.history.view",
  historyFallback:"practiceDesk.history.fallback",
  activeAttemptMirror:"practiceDesk.history.active",
  historyDatabase:"practiceDesk.history",
  historyDatabaseVersion:1,
  attemptsStore:"attempts",
  snapshotsStore:"snapshots"
} as const;
