import { randomUUID } from "node:crypto";
import { prisma } from "../../../../db/prisma";
import type { DirectorArtifactRef } from "@ai-novel/shared";

function createEventId(runId?: string | null, type?: string): string {
  return [runId?.trim() || "task", type?.trim() || "event", randomUUID()].join(":");
}

export class DirectorStateCommitter {
  // ─── Step lifecycle methods ────────────────────────────────────────────────

  async commitStepStarted(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    input?: unknown;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runId, `step_started.${input.stepId}`),
        runId: input.runId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "node_started",
        nodeKey: input.nodeKey ?? null,
        summary: input.label ?? `Step ${input.stepId} started.`,
        severity: "low",
        metadataJson: input.input !== undefined ? JSON.stringify({ stepInput: input.input }) : null,
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async commitStepCompleted(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    output?: unknown;
    artifacts?: DirectorArtifactRef[];
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runId, `step_completed.${input.stepId}`),
        runId: input.runId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "node_completed",
        nodeKey: input.nodeKey ?? null,
        summary: input.label ?? `Step ${input.stepId} completed.`,
        severity: "low",
        metadataJson: JSON.stringify({
          artifactIds: input.artifacts?.map((a) => a.id) ?? [],
          artifactTypes: input.artifacts?.map((a) => a.artifactType) ?? [],
        }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async commitStepFailed(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    error: string;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runId, `step_failed.${input.stepId}`),
        runId: input.runId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "node_failed",
        nodeKey: input.nodeKey ?? null,
        summary: input.label
          ? `${input.label}失败：${input.error}`
          : `Step ${input.stepId} failed: ${input.error}`,
        severity: "medium",
        metadataJson: JSON.stringify({ error: input.error }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async commitStepBlocked(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    reason: string;
    code?: string | null;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runId, `step_blocked.${input.stepId}`),
        runId: input.runId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "approval_required",
        nodeKey: input.nodeKey ?? null,
        summary: input.label
          ? `${input.label}已被阻塞：${input.reason}`
          : `Step ${input.stepId} blocked: ${input.reason}`,
        severity: "high",
        metadataJson: JSON.stringify({ reason: input.reason, code: input.code ?? null }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async commitStepCancelled(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    reason?: string | null;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runId, `step_cancelled.${input.stepId}`),
        runId: input.runId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "run_resumed",
        nodeKey: input.nodeKey ?? null,
        summary: input.label
          ? `${input.label}已被取消${input.reason ? `：${input.reason}` : ""}`
          : `Step ${input.stepId} cancelled${input.reason ? `: ${input.reason}` : ""}`,
        severity: "low",
        metadataJson: JSON.stringify({ reason: input.reason ?? null }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  // ─── Existing methods ──────────────────────────────────────────────────────
  async recordPipelineDispatch(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    runtimeCommandId?: string | null;
    executionId?: string | null;
    commandType: string;
    summary: string;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runtimeId, "pipeline_dispatch"),
        runId: input.runtimeId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "run_resumed",
        summary: input.summary,
        severity: "low",
        metadataJson: JSON.stringify({
          commandType: input.commandType,
          commandId: input.runtimeCommandId ?? null,
          executionId: input.executionId ?? null,
        }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async markRuntimeWaitingGate(input: {
    runtimeId?: string | null;
    taskId: string;
    novelId?: string | null;
    message: string;
  }): Promise<void> {
    await prisma.novelWorkflowTask.update({
      where: { id: input.taskId },
      data: {
        status: "waiting_approval",
        currentItemLabel: input.message,
      },
    }).catch(() => undefined);
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runtimeId, "approval_required"),
        runId: input.runtimeId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "approval_required",
        summary: input.message,
        severity: "medium",
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async recordArtifactsIndexed(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    nodeKey: string;
    artifacts: DirectorArtifactRef[];
  }): Promise<void> {
    if (input.artifacts.length === 0) {
      return;
    }
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runtimeId, `artifact_indexed.${input.nodeKey}`),
        runId: input.runtimeId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "artifact_indexed",
        nodeKey: input.nodeKey,
        summary: "导演步骤已提交最新产物索引。",
        severity: "low",
        metadataJson: JSON.stringify({
          artifactIds: input.artifacts.map((artifact) => artifact.id),
          artifactTypes: input.artifacts.map((artifact) => artifact.artifactType),
        }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }

  async recordRecoveryHint(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    nodeKey: string;
    reason: string;
    resumeFrom?: string | null;
  }): Promise<void> {
    await prisma.directorEvent.create({
      data: {
        id: createEventId(input.runtimeId, `recovery_hint.${input.nodeKey}`),
        runId: input.runtimeId ?? null,
        taskId: input.taskId,
        novelId: input.novelId ?? null,
        type: "run_resumed",
        nodeKey: input.nodeKey,
        summary: input.reason,
        severity: "low",
        metadataJson: JSON.stringify({
          resumeFrom: input.resumeFrom ?? null,
        }),
        occurredAt: new Date(),
      },
    }).catch(() => undefined);
  }
}
