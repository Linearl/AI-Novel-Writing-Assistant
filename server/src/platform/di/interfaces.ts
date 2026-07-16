/**
 * Core service interfaces for Dependency Injection.
 *
 * These interfaces decouple services from concrete implementations (Prisma, LLM
 * clients, event bus) enabling test-friendly constructor injection. Production
 * code passes real implementations; tests inject lightweight mocks.
 *
 * Usage pattern (zero-change backward compatibility):
 *
 *   class DirectorService {
 *     constructor(
 *       private db: IDatabase = prisma,
 *       private llm: ILlmClient = defaultLlmClient,
 *       private bus: IEventBus = novelEventBus,
 *     ) {}
 *   }
 *
 * @see docs/architecture/dependency-injection.md for migration guide.
 */

import type { PrismaClient } from "@prisma/client";
import type { ZodType } from "zod";

// ---------------------------------------------------------------------------
// IDatabase — Prisma-backed data access abstraction
// ---------------------------------------------------------------------------

/**
 * Narrowed delegates for each Prisma model used across services.
 * `Pick` restricts each model to only the methods services actually call,
 * keeping the mock surface small and explicit.
 */
export interface IDatabase {
  readonly novel: Pick<
    PrismaClient["novel"],
    "findUnique" | "findMany" | "create" | "update" | "updateMany" | "delete" | "deleteMany" | "count"
  >;

  readonly chapter: Pick<
    PrismaClient["chapter"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany" | "delete" | "deleteMany" | "count" | "aggregate"
  >;

  readonly character: Pick<
    PrismaClient["character"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany" | "count"
  >;

  readonly world: Pick<
    PrismaClient["world"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany"
  >;

  readonly novelBible: Pick<
    PrismaClient["novelBible"],
    "findUnique" | "findMany" | "create" | "update" | "upsert"
  >;

  readonly generationJob: Pick<
    PrismaClient["generationJob"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany"
  >;

  readonly directorRun: Pick<
    PrismaClient["directorRun"],
    "findUnique" | "findMany" | "create" | "update"
  >;

  readonly novelWorkflowTask: Pick<
    PrismaClient["novelWorkflowTask"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany"
  >;

  readonly volumePlan: Pick<
    PrismaClient["volumePlan"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly chapterSummary: Pick<
    PrismaClient["chapterSummary"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "upsert"
  >;

  readonly chapterRepairVersion: Pick<
    PrismaClient["chapterRepairVersion"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly characterCandidate: Pick<
    PrismaClient["characterCandidate"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany" | "delete" | "deleteMany"
  >;

  readonly characterRelation: Pick<
    PrismaClient["characterRelation"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "upsert"
  >;

  readonly characterRelationStage: Pick<
    PrismaClient["characterRelationStage"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany"
  >;

  readonly characterVolumeAssignment: Pick<
    PrismaClient["characterVolumeAssignment"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany"
  >;

  readonly characterFactionTrack: Pick<
    PrismaClient["characterFactionTrack"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly characterTimeline: Pick<
    PrismaClient["characterTimeline"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany" | "count"
  >;

  readonly chapterArtifactSyncCheckpoint: Pick<
    PrismaClient["chapterArtifactSyncCheckpoint"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly ragIndexJob: Pick<
    PrismaClient["ragIndexJob"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany" | "delete" | "count"
  >;

  readonly worldPropertyLibrary: Pick<
    PrismaClient["worldPropertyLibrary"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "upsert"
  >;

  readonly knowledgeDocument: Pick<
    PrismaClient["knowledgeDocument"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly knowledgeChunk: Pick<
    PrismaClient["knowledgeChunk"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany" | "count"
  >;

  readonly consistencyFact: Pick<
    PrismaClient["consistencyFact"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly storylineVersion: Pick<
    PrismaClient["storylineVersion"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany"
  >;

  readonly novelWorld: Pick<
    PrismaClient["novelWorld"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany"
  >;

  readonly qualityReport: Pick<
    PrismaClient["qualityReport"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly baseCharacter: Pick<
    PrismaClient["baseCharacter"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  readonly novelSnapshot: Pick<
    PrismaClient["novelSnapshot"],
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete" | "deleteMany" | "count"
  >;

  /** Raw Prisma transaction helper — delegates to $transaction. */
  $transaction: Pick<PrismaClient, "$transaction">["$transaction"];
}

// ---------------------------------------------------------------------------
// ILlmClient — LLM invocation abstraction
// ---------------------------------------------------------------------------

export interface ILlmInvokeOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  taskType?: string;
  label?: string;
  maxRepairAttempts?: number;
}

export interface ILlmClient {
  /**
   * Plain-text LLM invocation.
   */
  invoke(input: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: Array<{ role: string; content: string }>;
    options?: ILlmInvokeOptions;
  }): Promise<string>;

  /**
   * Structured (JSON) LLM invocation with Zod schema validation.
   */
  invokeStructured<T>(input: {
    systemPrompt?: string;
    userPrompt?: string;
    messages?: Array<{ role: string; content: string }>;
    schema: ZodType<T>;
    options?: ILlmInvokeOptions;
  }): Promise<T>;
}

// ---------------------------------------------------------------------------
// IEventBus — Application event bus abstraction
// ---------------------------------------------------------------------------

export type EventHandler<T = unknown> = (event: T) => void | Promise<void>;

export interface IEventBus {
  on<T = unknown>(eventType: string, handler: EventHandler<T>, priority?: number): void;
  off(eventType: string, handler: EventHandler): void;
  emit(event: { type: string; payload: unknown }): Promise<void>;
}

// ---------------------------------------------------------------------------
// ILogger — Structured logger abstraction
// ---------------------------------------------------------------------------

export interface ILogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}
