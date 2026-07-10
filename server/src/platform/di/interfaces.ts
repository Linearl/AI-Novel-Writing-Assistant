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
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "updateMany" | "delete" | "deleteMany" | "count"
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
    "findUnique" | "findMany" | "create" | "update"
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
    "findUnique" | "findFirst" | "findMany" | "create" | "update" | "delete"
  >;

  /** Raw Prisma transaction helper — delegates to $transaction. */
  $transaction<R>(
    fn: (tx: PrismaClient) => Promise<R>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<R>;
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
