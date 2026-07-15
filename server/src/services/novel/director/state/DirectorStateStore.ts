import type { DirectorArtifactRef } from "@ai-novel/shared";
import { DirectorStateReader, type DirectorCanonicalState } from "./DirectorStateReader";
import { DirectorStateCommitter } from "./DirectorStateCommitter";

export class DirectorStateStore {
  private readonly reader: DirectorStateReader;
  private readonly committer: DirectorStateCommitter;

  constructor(input: {
    reader?: DirectorStateReader;
    committer?: DirectorStateCommitter;
  } = {}) {
    this.reader = input.reader ?? new DirectorStateReader();
    this.committer = input.committer ?? new DirectorStateCommitter();
  }

  readTaskState(taskId: string): Promise<DirectorCanonicalState | null> {
    return this.reader.readByTaskId(taskId);
  }

  // ─── Step lifecycle ────────────────────────────────────────────────────────

  commitStepStarted(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    input?: unknown;
  }): Promise<void> {
    return this.committer.commitStepStarted(input);
  }

  commitStepCompleted(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    output?: unknown;
    artifacts?: DirectorArtifactRef[];
  }): Promise<void> {
    return this.committer.commitStepCompleted(input);
  }

  commitStepFailed(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    error: string;
  }): Promise<void> {
    return this.committer.commitStepFailed(input);
  }

  commitStepBlocked(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    reason: string;
    code?: string | null;
  }): Promise<void> {
    return this.committer.commitStepBlocked(input);
  }

  commitStepCancelled(input: {
    runId?: string | null;
    taskId: string;
    novelId?: string | null;
    stepId: string;
    nodeKey?: string | null;
    label?: string | null;
    reason?: string | null;
  }): Promise<void> {
    return this.committer.commitStepCancelled(input);
  }

  // ─── Existing methods ──────────────────────────────────────────────────────

  recordPipelineDispatch(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    commandType: string;
    summary: string;
  }): Promise<void> {
    return this.committer.recordPipelineDispatch(input);
  }

  markRuntimeWaitingGate(input: {
    runtimeId?: string | null;
    taskId: string;
    novelId?: string | null;
    message: string;
  }): Promise<void> {
    return this.committer.markRuntimeWaitingGate(input);
  }

  recordArtifactsIndexed(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    nodeKey: string;
    artifacts: DirectorArtifactRef[];
  }): Promise<void> {
    return this.committer.recordArtifactsIndexed(input);
  }

  recordRecoveryHint(input: {
    taskId: string;
    novelId?: string | null;
    runtimeId?: string | null;
    nodeKey: string;
    reason: string;
    resumeFrom?: string | null;
  }): Promise<void> {
    return this.committer.recordRecoveryHint(input);
  }
}
