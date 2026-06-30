/**
 * Shared types, errors, and utility helpers for RagIndexService.
 *
 * Extracted from RagIndexService.ts to keep individual files under the 600-line target.
 */
import type { RagJobStatus, RagJobType, RagOwnerType } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReindexScope = "novel" | "world" | "all";

export interface RagJobProgressSnapshot {
  stage:
    | "queued"
    | "loading_source"
    | "chunking"
    | "embedding"
    | "ensuring_collection"
    | "deleting_existing"
    | "upserting_vectors"
    | "writing_metadata"
    | "completed"
    | "cancelled"
    | "failed";
  label: string;
  detail?: string;
  current?: number;
  total?: number;
  percent: number;
  documents?: number;
  chunks?: number;
  updatedAt: string;
}

export interface RagJobPayloadRecord extends Record<string, unknown> {
  progress?: RagJobProgressSnapshot;
}

export interface RagJobSummaryRecord {
  id: string;
  tenantId: string;
  jobType: RagJobType;
  ownerType: RagOwnerType;
  ownerId: string;
  status: RagJobStatus;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  progress?: RagJobProgressSnapshot;
}

export interface PendingOwner {
  ownerType: RagOwnerType;
  ownerId: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RagJobCancelledError extends Error {
  constructor() {
    super("RAG job cancelled.");
    this.name = "RagJobCancelledError";
  }
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

export function isCjk(text: string): boolean {
  return /[一-鿿]/.test(text);
}

export function buildJoinedText(...parts: Array<string | null | undefined>): string {
  return parts
    .map((item) => (item ?? "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
