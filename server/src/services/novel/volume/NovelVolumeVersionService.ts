/**
 * NovelVolumeVersionService.ts
 *
 * Version management methods extracted from NovelVolumeService.
 * Pure extraction — no functional changes.
 */

import type {
  StorylineDiff,
  StorylineVersion,
  VolumeImpactResult,
  VolumePlan,
  VolumePlanDiff,
  VolumePlanDocument,
  VolumePlanVersion,
  VolumePlanVersionSummary,
  VolumeSyncPreview,
} from "@ai-novel/shared/types/novel";
import { prisma } from "../../../db/prisma";
import { logMemoryUsage } from "../../../runtime/memoryTelemetry";
import { buildVolumeDiff, buildVolumeDiffSummary, buildVolumeImpactResult, hasPayoffLedgerRelevantPlanChanges } from "./volumePlanUtils";
import type { VolumeImpactInput, VolumeSyncInput } from "./volumeModels";
import { mapVersionRow, mapVersionSummaryRow } from "./volumeModels";
import {
  activateStorylineVersionCompat,
  analyzeStorylineImpactCompat,
  createStorylineDraftCompat,
  freezeStorylineVersionCompat,
  getStorylineDiffCompat,
  listStorylineVersionsCompat,
} from "./volumeStorylineCompat";
import {
  serializeVolumeWorkspaceDocument,
} from "./volumeWorkspaceDocument";
import {
  getActiveVersionRow,
  getLatestVersionRow,
  persistActiveVolumeWorkspace,
  runVolumeWorkspaceTransaction,
} from "./volumeWorkspacePersistence";
import type { VolumeMemoryTelemetry } from "./volumeGenerationTelemetry";
import { getLegacyVolumeSource } from "./legacyVolumeSource";
import { mergeVolumeWorkspaceInput, normalizeVolumeWorkspaceDocument } from "./volumeWorkspaceDocument";

/**
 * Dependencies that version operations need from the owning NovelVolumeService instance.
 * Kept minimal to avoid circular coupling.
 */
export interface VersionServiceDeps {
  ensureVolumeWorkspace(novelId: string): Promise<VolumePlanDocument>;
  ensureActiveVersionRecord(
    tx: import("@prisma/client").Prisma.TransactionClient,
    novelId: string,
    document: VolumePlanDocument,
    diffSummary?: string,
  ): Promise<{ versionId: string; version: number }>;
  persistWorkspaceDocument(
    novelId: string,
    document: VolumePlanDocument,
    options?: {
      emitEvent?: boolean;
      syncPayoffLedger?: boolean;
    },
  ): Promise<VolumePlanDocument>;
  emitVolumeUpdated(novelId: string, reason: import("../../../events").VolumeUpdateReason): void;
  syncPayoffLedger(novelId: string): void;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseVersionDocument(novelId: string, contentJson: string): VolumePlanDocument {
  return normalizeVolumeWorkspaceDocument(novelId, contentJson, {
    source: "volume",
    activeVersionId: null,
  });
}

function parseVersionContent(novelId: string, contentJson: string): VolumePlan[] {
  return parseVersionDocument(novelId, contentJson).volumes;
}

// ---------------------------------------------------------------------------
// Version CRUD
// ---------------------------------------------------------------------------

export async function listVolumeVersions(novelId: string, deps: VersionServiceDeps): Promise<VolumePlanVersionSummary[]> {
  await deps.ensureVolumeWorkspace(novelId);
  const rows = await prisma.volumePlanVersion.findMany({
    where: { novelId },
    select: {
      id: true,
      novelId: true,
      version: true,
      status: true,
      diffSummary: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ version: "desc" }],
  });
  return rows.map(mapVersionSummaryRow);
}

export async function listVolumeVersionsWithContent(novelId: string, deps: VersionServiceDeps): Promise<VolumePlanVersion[]> {
  await deps.ensureVolumeWorkspace(novelId);
  const rows = await prisma.volumePlanVersion.findMany({
    where: { novelId },
    orderBy: [{ version: "desc" }],
  });
  return rows.map(mapVersionRow);
}

export async function getVolumeVersion(novelId: string, versionId: string, deps: VersionServiceDeps): Promise<VolumePlanVersion> {
  await deps.ensureVolumeWorkspace(novelId);
  const row = await prisma.volumePlanVersion.findFirst({
    where: { id: versionId, novelId },
  });
  if (!row) {
    throw new Error("卷级版本不存在。");
  }
  return mapVersionRow(row);
}

export async function createVolumeDraft(
  novelId: string,
  input: import("./volumeModels").VolumeDraftInput,
  deps: VersionServiceDeps,
): Promise<VolumePlanVersion> {
  const workspace = await deps.ensureVolumeWorkspace(novelId);
  const latestVersion = await getLatestVersionRow(novelId);
  const baseVersion = typeof input.baseVersion === "number"
    ? await prisma.volumePlanVersion.findFirst({
      where: { novelId, version: input.baseVersion },
    })
    : null;
  const nextDocument = mergeVolumeWorkspaceInput(novelId, workspace, input);
  const previousDocument = baseVersion
    ? parseVersionDocument(novelId, baseVersion.contentJson)
    : workspace;
  const diffSummary = input.diffSummary?.trim() || buildVolumeDiffSummary(
    buildVolumeDiff(previousDocument.volumes, nextDocument.volumes, {
      id: "draft",
      novelId,
      version: (latestVersion?.version ?? 0) + 1,
      status: "draft",
    }).changedVolumes,
  );
  const created = await prisma.volumePlanVersion.create({
    data: {
      novelId,
      version: (latestVersion?.version ?? 0) + 1,
      status: "draft",
      contentJson: serializeVolumeWorkspaceDocument({
        ...nextDocument,
        activeVersionId: workspace.activeVersionId,
      }),
      diffSummary,
    },
  });
  return mapVersionRow(created);
}

export async function activateVolumeVersion(
  novelId: string,
  versionId: string,
  deps: VersionServiceDeps,
): Promise<VolumePlanVersion> {
  const currentDocument = await deps.ensureVolumeWorkspace(novelId);
  const target = await prisma.volumePlanVersion.findFirst({
    where: { id: versionId, novelId },
  });
  if (!target) {
    throw new Error("卷级版本不存在。");
  }
  const document = parseVersionDocument(novelId, target.contentJson);
  if (document.volumes.length === 0) {
    throw new Error("卷级版本内容为空。");
  }
  await runVolumeWorkspaceTransaction(async (tx) => {
    await tx.volumePlanVersion.updateMany({
      where: { novelId, status: "active" },
      data: { status: "frozen" },
    });
    const activatedDocument = {
      ...document,
      activeVersionId: target.id,
      source: "volume" as const,
    };
    await tx.volumePlanVersion.update({
      where: { id: target.id },
      data: {
        status: "active",
        contentJson: serializeVolumeWorkspaceDocument(activatedDocument),
      },
    });
    await persistActiveVolumeWorkspace(tx, novelId, activatedDocument, target.id);
  });
  const refreshed = await prisma.volumePlanVersion.findUnique({ where: { id: target.id } });
  if (!refreshed) {
    throw new Error("卷级版本激活失败。");
  }
  const shouldSyncPayoffLedger = hasPayoffLedgerRelevantPlanChanges(currentDocument.volumes, document.volumes);
  deps.emitVolumeUpdated(novelId, "version_activated");
  if (shouldSyncPayoffLedger) {
    deps.syncPayoffLedger(novelId);
  }
  return mapVersionRow(refreshed);
}

export async function freezeVolumeVersion(novelId: string, versionId: string): Promise<VolumePlanVersion> {
  const target = await prisma.volumePlanVersion.findFirst({
    where: { id: versionId, novelId },
    select: { id: true },
  });
  if (!target) {
    throw new Error("卷级版本不存在。");
  }
  const row = await prisma.volumePlanVersion.update({
    where: { id: target.id },
    data: { status: "frozen" },
  });
  return mapVersionRow(row);
}

export async function getVolumeDiff(novelId: string, versionId: string, compareVersion: number | undefined, deps: VersionServiceDeps): Promise<VolumePlanDiff> {
  await deps.ensureVolumeWorkspace(novelId);
  const target = await prisma.volumePlanVersion.findFirst({
    where: { id: versionId, novelId },
  });
  if (!target) {
    throw new Error("卷级版本不存在。");
  }
  let baseline: VolumePlan[] = [];
  if (typeof compareVersion === "number") {
    const compareRow = await prisma.volumePlanVersion.findFirst({
      where: { novelId, version: compareVersion },
    });
    baseline = compareRow ? parseVersionContent(novelId, compareRow.contentJson) : [];
  } else {
    const previousRow = await prisma.volumePlanVersion.findFirst({
      where: { novelId, version: { lt: target.version } },
      orderBy: { version: "desc" },
    });
    baseline = previousRow ? parseVersionContent(novelId, previousRow.contentJson) : [];
  }
  const candidate = parseVersionContent(novelId, target.contentJson);
  return buildVolumeDiff(baseline, candidate, {
    id: target.id,
    novelId,
    version: target.version,
    status: target.status,
    diffSummary: target.diffSummary,
  });
}

export async function analyzeVolumeImpact(
  novelId: string,
  input: VolumeImpactInput,
  deps: VersionServiceDeps,
): Promise<VolumeImpactResult> {
  const workspace = await deps.ensureVolumeWorkspace(novelId);
  let candidateVolumes = input.volumes
    ? mergeVolumeWorkspaceInput(novelId, workspace, { volumes: input.volumes }).volumes
    : workspace.volumes;
  let sourceVersion: number | null = null;

  if (!input.volumes && input.versionId) {
    const version = await prisma.volumePlanVersion.findFirst({
      where: { id: input.versionId, novelId },
    });
    if (!version) {
      throw new Error("卷级版本不存在。");
    }
    candidateVolumes = parseVersionContent(novelId, version.contentJson);
    sourceVersion = version.version;
  }

  return buildVolumeImpactResult(novelId, workspace.volumes, candidateVolumes, sourceVersion);
}

// ---------------------------------------------------------------------------
// Storyline compat delegation
// ---------------------------------------------------------------------------

export async function listStorylineVersionsCompatFn(novelId: string, deps: VersionServiceDeps): Promise<StorylineVersion[]> {
  return listStorylineVersionsCompat({
    novelId,
    listVolumeVersions: () => listVolumeVersionsWithContent(novelId, deps),
    parseVersionContent: (contentJson) => parseVersionContent(novelId, contentJson),
  });
}

export async function createStorylineDraftCompatFn(
  novelId: string,
  input: { content: string; diffSummary?: string; baseVersion?: number },
  deps: VersionServiceDeps,
) {
  return createStorylineDraftCompat(
    {
      novelId,
      getLegacySource: () => getLegacyVolumeSource(novelId),
      createVolumeDraft: (draftInput) => createVolumeDraft(novelId, draftInput, deps),
    },
    input,
  );
}

export async function activateStorylineVersionCompatFn(novelId: string, versionId: string, deps: VersionServiceDeps): Promise<StorylineVersion> {
  return activateStorylineVersionCompat(
    {
      novelId,
      activateVolumeVersion: (targetVersionId) => activateVolumeVersion(novelId, targetVersionId, deps),
      parseVersionContent: (contentJson) => parseVersionContent(novelId, contentJson),
    },
    versionId,
  );
}

export async function freezeStorylineVersionCompatFn(novelId: string, versionId: string, deps: VersionServiceDeps): Promise<StorylineVersion> {
  return freezeStorylineVersionCompat(
    {
      novelId,
      freezeVolumeVersion: (targetVersionId) => freezeVolumeVersion(novelId, targetVersionId),
      parseVersionContent: (contentJson) => parseVersionContent(novelId, contentJson),
    },
    versionId,
  );
}

export async function getStorylineDiffCompatFn(novelId: string, versionId: string, compareVersion: number | undefined, deps: VersionServiceDeps): Promise<StorylineDiff> {
  return getStorylineDiffCompat(
    {
      getVolumeDiff: (targetVersionId, targetCompareVersion) => getVolumeDiff(novelId, targetVersionId, targetCompareVersion, deps),
    },
    novelId,
    versionId,
    compareVersion,
  );
}

export async function analyzeStorylineImpactCompatFn(novelId: string, input: { content?: string; versionId?: string }, deps: VersionServiceDeps) {
  return analyzeStorylineImpactCompat(
    {
      novelId,
      getLegacySource: () => getLegacyVolumeSource(novelId),
      analyzeVolumeImpact: (impactInput) => analyzeVolumeImpact(novelId, impactInput, deps),
    },
    input,
  );
}
