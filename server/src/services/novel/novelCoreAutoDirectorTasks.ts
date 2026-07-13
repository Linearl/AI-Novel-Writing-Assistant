import type { NovelAutoDirectorTaskSummary } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import { mapNovelAutoDirectorTaskSummary } from "../task/novelWorkflowTaskSummary";
import { getArchivedTaskIdSet } from "../task/taskArchive";
import type { NovelWorkflowService } from "./workflow/NovelWorkflowService";

export async function listLatestVisibleAutoDirectorTasksByNovelIds(
  novelIds: string[],
  workflowService: NovelWorkflowService,
  allowHealing = false,
): Promise<Map<string, NovelAutoDirectorTaskSummary>> {
  const uniqueNovelIds = Array.from(new Set(novelIds.filter((id) => id.trim().length > 0)));
  if (uniqueNovelIds.length === 0) {
    return new Map();
  }

  const rows = await prisma.novelWorkflowTask.findMany({
    where: {
      lane: "auto_director",
      novelId: {
        in: uniqueNovelIds,
      },
    },
    select: {
      id: true,
      novelId: true,
      lane: true,
      status: true,
      progress: true,
      currentStage: true,
      currentItemKey: true,
      currentItemLabel: true,
      checkpointType: true,
      checkpointSummary: true,
      resumeTargetJson: true,
      seedPayloadJson: true,
      lastError: true,
      heartbeatAt: true,
      finishedAt: true,
      milestonesJson: true,
      title: true,
      updatedAt: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  });

  if (rows.length === 0) {
    return new Map();
  }

  if (allowHealing) {
    const healed = await Promise.all(
      rows.map((row) => workflowService.healAutoDirectorTaskState(row.id, row)),
    );
    if (healed.some(Boolean)) {
      return listLatestVisibleAutoDirectorTasksByNovelIds(uniqueNovelIds, workflowService, false);
    }
  }

  const archivedTaskIds = await getArchivedTaskIdSet("novel_workflow", rows.map((row) => row.id));
  const visibleRows: typeof rows = [];
  const seenNovelIds = new Set<string>();
  for (const row of rows) {
    if (!row.novelId || archivedTaskIds.has(row.id) || seenNovelIds.has(row.novelId)) {
      continue;
    }
    visibleRows.push(row);
    seenNovelIds.add(row.novelId);
  }

  const liveTaskIds = visibleRows
    .filter((row) => row.status === "queued" || row.status === "running" || row.status === "waiting_approval")
    .map((row) => row.id);
  const latestLiveStepLabelByTaskId = new Map<string, string>();
  if (liveTaskIds.length > 0) {
    const liveSteps = await prisma.directorStepRun.findMany({
      where: {
        taskId: {
          in: liveTaskIds,
        },
        status: {
          in: ["running", "waiting_approval", "blocked_scope"],
        },
      },
      select: {
        taskId: true,
        label: true,
      },
      orderBy: [{ updatedAt: "desc" }, { startedAt: "desc" }],
    });
    for (const step of liveSteps) {
      if (!latestLiveStepLabelByTaskId.has(step.taskId) && step.label.trim().length > 0) {
        latestLiveStepLabelByTaskId.set(step.taskId, step.label.trim());
      }
    }
  }

  const taskByNovelId = new Map<string, NovelAutoDirectorTaskSummary>();
  for (const row of visibleRows) {
    const novelId = row.novelId;
    if (!novelId) {
      continue;
    }
    const rowCurrentItemLabel = row.currentItemLabel?.trim() || null;
    taskByNovelId.set(novelId, mapNovelAutoDirectorTaskSummary({
      ...row,
      currentItemLabel: rowCurrentItemLabel ?? latestLiveStepLabelByTaskId.get(row.id) ?? row.currentItemLabel,
    }));
  }
  return taskByNovelId;
}
