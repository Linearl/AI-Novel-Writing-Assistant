import type { Router } from "express";
import type { ApiResponse } from "@ai-novel/shared";
import { z } from "zod";
import { validate } from "../../../../middleware/validate";
import { prisma } from "../../../../db/prisma";
import { safeJsonParse } from "../../../../services/novel/worldContext/novelWorldProjection";
import { compareStructures, type FieldDiff } from "../../../../services/novel/worldContext/novelWorldStructureCompare";

const idParamsSchema = z.object({ id: z.string().min(1) });

interface ManualDiffResult {
  hasDifferences: boolean;
  fieldDiffs: FieldDiff[];
  worldVersion: number;
  novelSyncBaseVersion: number;
  worldUpdatedAt: string;
  novelLastSyncedAt: string | null;
}

export function registerManualDiffRoutes(input: {
  router: Router;
  idParamsSchema: typeof idParamsSchema;
}): void {
  const { router } = input;

  router.get("/:id/novel-world/manual-diff", validate({ params: idParamsSchema }), async (req, res, next) => {
    try {
      const { id: novelId } = req.params as z.infer<typeof idParamsSchema>;

      // 获取NovelWorld记录
      const novelWorldRows = await prisma.$queryRaw<Array<{
        id: string;
        sourceWorldId: string | null;
        structuredDataJson: string | null;
        syncBaseVersion: number | null;
        lastSyncedAt: Date | null;
      }>>`
        SELECT
          "id",
          "sourceWorldId",
          "structuredDataJson",
          "syncBaseVersion",
          "lastSyncedAt"
        FROM "NovelWorld"
        WHERE "novelId" = ${novelId}
        LIMIT 1
      `;

      const novelWorld = novelWorldRows[0];
      if (!novelWorld) {
        res.status(404).json({ success: false, error: "本书世界不存在。" } satisfies ApiResponse<never>);
        return;
      }

      if (!novelWorld.sourceWorldId) {
        res.status(400).json({ success: false, error: "本书世界未关联世界库样本。" } satisfies ApiResponse<never>);
        return;
      }

      // 获取World记录
      const world = await prisma.world.findUnique({
        where: { id: novelWorld.sourceWorldId },
        select: {
          id: true,
          name: true,
          version: true,
          updatedAt: true,
          structureJson: true,
          description: true,
          overviewSummary: true,
          axioms: true,
          background: true,
          geography: true,
          cultures: true,
          magicSystem: true,
          politics: true,
          races: true,
          religions: true,
          technology: true,
          conflicts: true,
          history: true,
          economy: true,
          factions: true,
        },
      });

      if (!world) {
        res.status(404).json({ success: false, error: "世界库样本不存在。" } satisfies ApiResponse<never>);
        return;
      }

      // 解析structureJson
      const worldStructure = safeJsonParse<Record<string, unknown> | null>(world.structureJson, null);
      const novelStructure = safeJsonParse<Record<string, unknown> | null>(novelWorld.structuredDataJson, null);

      // 对比结构（复用共享的compareStructures函数）
      const compareResult = compareStructures(worldStructure, novelStructure);

      const result: ManualDiffResult = {
        hasDifferences: compareResult.hasDifferences,
        fieldDiffs: compareResult.fieldDiffs,
        worldVersion: world.version,
        novelSyncBaseVersion: novelWorld.syncBaseVersion ?? 0,
        worldUpdatedAt: world.updatedAt.toISOString(),
        novelLastSyncedAt: novelWorld.lastSyncedAt?.toISOString() ?? null,
      };

      res.status(200).json({
        success: true,
        data: result,
        message: result.hasDifferences
          ? `发现 ${compareResult.fieldDiffs.length} 处差异。`
          : "世界库和本书世界内容一致。",
      } satisfies ApiResponse<ManualDiffResult>);
    } catch (error) {
      next(error);
    }
  });
}
