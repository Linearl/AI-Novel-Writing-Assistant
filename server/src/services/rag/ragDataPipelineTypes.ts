/**
 * Shared types for RAG data pipeline functions.
 */
import type { PrismaClient } from "@prisma/client";
import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import type { RagJobProgressSnapshot } from "./ragIndexServiceHelpers";

export interface RagPipelineDeps {
  prisma: PrismaClient;
  embeddingService: EmbeddingService;
  vectorStoreService: VectorStoreService;
  /** Callback the class provides so pipeline functions can update job progress. */
  updateJobProgress: (jobId: string, progress: Omit<RagJobProgressSnapshot, "updatedAt">) => Promise<void>;
  /** Callback the class provides so pipeline functions can check cancellation. */
  assertJobNotCancelled: (jobId: string) => Promise<void>;
}
