import type { RagIndexJob } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { ragConfig } from "../../config/rag";
import { getRagEmbeddingSettings } from "../settings/RagSettingsService";
import { EmbeddingService } from "./EmbeddingService";
import { VectorStoreService } from "./VectorStoreService";
import type { RagJobStatus, RagJobType, RagOwnerType } from "./types";
import type { ReindexScope } from "./ragIndexJobOperations";
import { collectOwners, syncKnowledgeDocumentIndexStatus } from "./ragIndexJobOperations";
import {
  RagJobCancelledError,
  createProgressSnapshot,
  parseJobPayload,
  type RagJobPayloadRecord,
  type RagJobProgressSnapshot,
  type RagJobSummaryRecord,
} from "./ragIndexServiceHelpers";
import {
  deleteOwnerChunks,
  upsertOwnerChunks,
} from "./ragIndexServiceDataPipeline";

// Re-export so existing consumers (RagWorker, index.ts) keep working.
export { RagJobCancelledError } from "./ragIndexServiceHelpers";
export type { RagJobProgressSnapshot, RagJobSummaryRecord } from "./ragIndexServiceHelpers";
export type { ReindexScope } from "./ragIndexJobOperations";

export class RagIndexService {
  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly vectorStoreService: VectorStoreService,
  ) {}

  private buildDeps() {
    return {
      prisma,
      embeddingService: this.embeddingService,
      vectorStoreService: this.vectorStoreService,
      updateJobProgress: this.updateJobProgress.bind(this),
      assertJobNotCancelled: this.assertJobNotCancelled.bind(this),
    };
  }

  private async assertJobNotCancelled(jobId: string): Promise<void> {
    const job = await prisma.ragIndexJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (!job) {
      throw new Error("RAG job not found.");
    }
    if (job.status === "cancelled") {
      throw new RagJobCancelledError();
    }
  }

  private async updateJobProgress(jobId: string, progress: Omit<RagJobProgressSnapshot, "updatedAt">): Promise<void> {
    const record = await prisma.ragIndexJob.findUnique({
      where: { id: jobId },
      select: { payloadJson: true },
    });
    if (!record) {
      return;
    }
    const payload = parseJobPayload(record.payloadJson);
    payload.progress = createProgressSnapshot(progress);
    await prisma.ragIndexJob.update({
      where: { id: jobId },
      data: {
        payloadJson: JSON.stringify(payload),
      },
    });
  }

  private serializeJob(job: RagIndexJob): RagJobSummaryRecord {
    const payload = parseJobPayload(job.payloadJson);
    return {
      id: job.id,
      tenantId: job.tenantId,
      jobType: job.jobType as RagJobType,
      ownerType: job.ownerType as RagOwnerType,
      ownerId: job.ownerId,
      status: job.status as RagJobStatus,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      runAfter: job.runAfter,
      lastError: job.lastError,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      progress: payload.progress,
    };
  }

  // -------------------------------------------------------------------------
  // Public API — enqueue
  // -------------------------------------------------------------------------

  async enqueueOwnerJob(
    jobType: RagJobType,
    ownerType: RagOwnerType,
    ownerId: string,
    options?: {
      tenantId?: string;
      payload?: Record<string, unknown>;
      runAfter?: Date;
      maxAttempts?: number;
    },
  ) {
    const tenantId = options?.tenantId ?? ragConfig.defaultTenantId;
    const existing = await prisma.ragIndexJob.findFirst({
      where: {
        tenantId,
        jobType,
        ownerType,
        ownerId,
        status: { in: ["queued", "running"] as RagJobStatus[] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return existing;
    }
    const created = await prisma.ragIndexJob.create({
      data: {
        tenantId,
        jobType,
        ownerType,
        ownerId,
        status: "queued",
        attempts: 0,
        maxAttempts: options?.maxAttempts ?? ragConfig.workerMaxAttempts,
        runAfter: options?.runAfter ?? new Date(),
        payloadJson: JSON.stringify({
          ...(options?.payload ?? {}),
          progress: createProgressSnapshot({
            stage: "queued",
            label: "等待执行",
            detail: "索引任务已进入队列。",
            percent: 0,
          }),
        } satisfies RagJobPayloadRecord),
      },
    });
    return created;
  }

  async enqueueUpsert(ownerType: RagOwnerType, ownerId: string, tenantId?: string) {
    return this.enqueueOwnerJob("upsert", ownerType, ownerId, { tenantId });
  }

  async enqueueDelete(ownerType: RagOwnerType, ownerId: string, tenantId?: string) {
    return this.enqueueOwnerJob("delete", ownerType, ownerId, { tenantId });
  }

  async enqueueReindex(scope: ReindexScope, id?: string, tenantId?: string) {
    const owners = await collectOwners(prisma, scope, id);
    const jobs = await Promise.all(
      owners.map((owner) =>
        this.enqueueOwnerJob("rebuild", owner.ownerType, owner.ownerId, { tenantId }),
      ),
    );
    return {
      scope,
      id: id ?? null,
      count: jobs.length,
      jobs,
    };
  }

  // -------------------------------------------------------------------------
  // Public API — job lifecycle
  // -------------------------------------------------------------------------

  async getNextRunnableJob(): Promise<RagIndexJob | null> {
    return prisma.ragIndexJob.findFirst({
      where: {
        status: "queued",
        runAfter: { lte: new Date() },
      },
      orderBy: [{ runAfter: "asc" }, { createdAt: "asc" }],
    });
  }

  async updateJobStatus(jobId: string, payload: {
    status: RagJobStatus;
    attempts?: number;
    runAfter?: Date;
    lastError?: string | null;
  }) {
    const current = await prisma.ragIndexJob.findUnique({
      where: { id: jobId },
      select: { status: true, payloadJson: true },
    });
    if (!current) {
      throw new Error("RAG job not found.");
    }
    if (current.status === "cancelled" && payload.status !== "cancelled") {
      return prisma.ragIndexJob.findUnique({
        where: { id: jobId },
      }) as Promise<RagIndexJob>;
    }

    const job = await prisma.ragIndexJob.update({
      where: { id: jobId },
      data: {
        status: payload.status,
        attempts: payload.attempts,
        runAfter: payload.runAfter,
        lastError: payload.lastError,
      },
    });
    if (payload.status === "queued") {
      await this.updateJobProgress(job.id, {
        stage: "queued",
        label: payload.lastError ? "等待重试" : "等待执行",
        detail: payload.lastError ? `任务已重新排队：${payload.lastError}` : "索引任务已进入队列。",
        percent: 0,
      });
    } else if (payload.status === "running") {
      await this.updateJobProgress(job.id, {
        stage: "loading_source",
        label: "开始处理",
        detail: "索引 worker 已开始处理任务。",
        percent: 0.02,
      });
    } else if (payload.status === "succeeded") {
      await this.updateJobProgress(job.id, {
        stage: "completed",
        label: "索引完成",
        detail: "索引任务已完成。",
        percent: 1,
      });
    } else if (payload.status === "cancelled") {
      const progress = parseJobPayload(current.payloadJson).progress;
      await this.updateJobProgress(job.id, {
        stage: "cancelled",
        label: "任务已取消",
        detail: payload.lastError ?? "索引任务已取消。",
        current: progress?.current,
        total: progress?.total,
        documents: progress?.documents,
        chunks: progress?.chunks,
        percent: progress?.percent ?? 0,
      });
    } else if (payload.status === "failed") {
      await this.updateJobProgress(job.id, {
        stage: "failed",
        label: "索引失败",
        detail: payload.lastError ?? "索引任务失败。",
        percent: 1,
      });
    }
    await syncKnowledgeDocumentIndexStatus(
      prisma,
      job.ownerType as RagOwnerType,
      job.ownerId,
      payload.status,
      job.jobType as RagJobType,
    );
    return job;
  }

  async listJobs(limit = 100, status?: RagJobStatus) {
    return prisma.ragIndexJob.findMany({
      where: status ? { status } : {},
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: Math.min(Math.max(limit, 1), 500),
    });
  }

  async listJobSummaries(limit = 100, status?: RagJobStatus): Promise<RagJobSummaryRecord[]> {
    const jobs = await this.listJobs(limit, status);
    return jobs.map((job) => this.serializeJob(job));
  }

  async processJob(job: RagIndexJob): Promise<{ chunks: number }> {
    await getRagEmbeddingSettings();
    await this.assertJobNotCancelled(job.id);
    const tenantId = job.tenantId || ragConfig.defaultTenantId;
    const ownerType = job.ownerType as RagOwnerType;
    const jobType = job.jobType as RagJobType;
    if (jobType === "delete") {
      await this.updateJobProgress(job.id, {
        stage: "deleting_existing",
        label: "清理旧索引",
        detail: "正在删除现有知识库索引。",
        percent: 0.4,
      });
      const result = await deleteOwnerChunks(this.buildDeps(), ownerType, job.ownerId, tenantId, job.id);
      await this.updateJobProgress(job.id, {
        stage: "completed",
        label: "索引完成",
        detail: result.deleted > 0 ? `已删除 ${result.deleted} 条旧分块。` : "没有需要删除的旧分块。",
        current: result.deleted,
        total: result.deleted,
        chunks: result.deleted,
        percent: 1,
      });
      return { chunks: 0 };
    }
    return upsertOwnerChunks(this.buildDeps(), ownerType, job.ownerId, tenantId, job.id);
  }
}
