/**
 * Novel reset routes — 提供重置各步骤产物的API
 *
 * 步骤3：角色准备
 * 步骤4：卷战略/卷骨架
 * 步骤5：节奏/拆章
 * 步骤6：章节执行
 * 步骤7：质量修复
 *
 * 注意：步骤之间有依赖关系（3→4→5→6→7），重置时会自动级联重置后续步骤
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../../../db/prisma";
import type { ApiResponse } from "@ai-novel/shared";
import { logger } from "../../../services/logging/LoggerService";

/* ── Zod schemas ───────────────────────────────────────────────────── */

const resetStepSchema = z.object({
  novelId: z.string().min(1, "小说ID不能为空"),
});

/* ── Helper: 级联重置步骤7（质量修复）───────────────────────────────── */

async function resetStep7QualityFix(tx: any, novelId: string) {
  // 删除修复版本
  const repairVersions = await tx.chapterRepairVersion.deleteMany({
    where: { novelId },
  });

  // 删除同步检查点
  const syncCheckpoints = await tx.chapterArtifactSyncCheckpoint.deleteMany({
    where: { novelId },
  });

  // 清空章节的执行数据
  const chaptersReset = await tx.chapter.updateMany({
    where: { novelId },
    data: {
      content: "",
      repairHistory: null,
      qualityScore: null,
      continuityScore: null,
      characterScore: null,
      pacingScore: null,
      riskFlags: null,
      tensionLevel: "medium",
      locked: false,
      generationState: "planned",
      chapterStatus: "unplanned",
    },
  });

  return {
    repairVersions: repairVersions.count,
    syncCheckpoints: syncCheckpoints.count,
    chaptersReset: chaptersReset.count,
  };
}

/* ── Route handlers ────────────────────────────────────────────────── */

/**
 * POST /novels/:novelId/reset/step3
 * 重置步骤3（角色准备）的产物
 *
 * 清除内容：
 * - Character（所有角色）
 * - CharacterRelation（所有角色关系）
 * - CharacterCastOption（角色阵容选项）
 * - CharacterCastOptionMember（阵容成员）
 * - CharacterCastOptionRelation（阵容关系）
 * - CharacterTimeline（角色时间线）
 * - CharacterVolumeAssignment（卷级角色分配）
 * - CharacterRelationStage（角色关系阶段）
 *
 * 注意：会自动级联重置步骤4、5、6和7
 */
async function resetStep3Characters(req: Request, res: Response, next: NextFunction) {
  try {
    const novelId = req.params.novelId as string;

    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      res.status(404).json({ success: false, error: "小说不存在" } satisfies ApiResponse<never>);
      return;
    }

    logger.info(`[reset.step3] novelId=${novelId} 开始重置角色准备`);

    // 按依赖顺序删除（先删除子表）
    const deletedCounts = await prisma.$transaction(async (tx) => {
      // 级联重置步骤7（质量修复）
      const step7Result = await resetStep7QualityFix(tx, novelId);

      // 级联重置步骤6（章节执行）
      const repairVersions = await tx.chapterRepairVersion.deleteMany({
        where: { novelId },
      });
      const syncCheckpoints = await tx.chapterArtifactSyncCheckpoint.deleteMany({
        where: { novelId },
      });

      // 级联重置步骤5（节奏/拆章）
      const summaries = await tx.chapterSummary.deleteMany({
        where: { novelId },
      });
      const chaptersReset = await tx.chapter.updateMany({
        where: { novelId },
        data: {
          title: "未命名章节",
          expectation: null,
          conflictLevel: null,
          revealLevel: null,
          targetWordCount: null,
          mustAvoid: null,
          taskSheet: null,
          sceneCards: null,
          hook: null,
          generationState: "planned",
          chapterStatus: "unplanned",
        },
      });

      // 级联重置步骤4（卷战略）
      const volumes = await tx.volumePlan.findMany({
        where: { novelId },
        select: { id: true },
      });
      const volumeIds = volumes.map((v) => v.id);

      const chapterPlans = volumeIds.length > 0
        ? await tx.volumeChapterPlan.deleteMany({
            where: { volumeId: { in: volumeIds } },
          })
        : { count: 0 };

      const volumeVersions = await tx.volumePlanVersion.deleteMany({
        where: { novelId },
      });

      const volumesDeleted = await tx.volumePlan.deleteMany({
        where: { novelId },
      });

      // 清空小说的卷相关字段
      await tx.novel.update({
        where: { id: novelId },
        data: {
          outline: null,
          structuredOutline: null,
        },
      });

      // 重置步骤3（角色准备）
      const relationStages = await tx.characterRelationStage.deleteMany({
        where: { novelId },
      });

      const timelines = await tx.characterTimeline.deleteMany({
        where: { novelId },
      });

      const volumeAssignments = await tx.characterVolumeAssignment.deleteMany({
        where: { novelId },
      });

      const castOptions = await tx.characterCastOption.findMany({
        where: { novelId },
        select: { id: true },
      });
      const castOptionIds = castOptions.map((opt) => opt.id);

      const castOptionMembers = castOptionIds.length > 0
        ? await tx.characterCastOptionMember.deleteMany({
            where: { optionId: { in: castOptionIds } },
          })
        : { count: 0 };

      const castOptionRelations = castOptionIds.length > 0
        ? await tx.characterCastOptionRelation.deleteMany({
            where: { optionId: { in: castOptionIds } },
          })
        : { count: 0 };

      const castOptionsDeleted = await tx.characterCastOption.deleteMany({
        where: { novelId },
      });

      const relations = await tx.characterRelation.deleteMany({
        where: { novelId },
      });

      const characters = await tx.character.deleteMany({
        where: { novelId },
      });

      return {
        characters: characters.count,
        relations: relations.count,
        castOptions: castOptionsDeleted.count,
        castOptionMembers: castOptionMembers.count,
        castOptionRelations: castOptionRelations.count,
        timelines: timelines.count,
        volumeAssignments: volumeAssignments.count,
        relationStages: relationStages.count,
        chapterPlans: chapterPlans.count,
        volumeVersions: volumeVersions.count,
        volumes: volumesDeleted.count,
        summaries: summaries.count,
        chaptersReset: chaptersReset.count,
        repairVersions: repairVersions.count,
        syncCheckpoints: syncCheckpoints.count,
        step7: step7Result,
        cascadedSteps: [4, 5, 6, 7],
      };
    });

    const totalDeleted = Object.values(deletedCounts).reduce<number>((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
    logger.info(`[reset.step3] novelId=${novelId} 重置完成，已级联重置步骤4/5/6/7，共删除 ${totalDeleted} 条记录`, deletedCounts);

    res.status(200).json({
      success: true,
      data: deletedCounts,
      message: `已重置角色准备，并级联重置步骤4、5、6和7`,
    } satisfies ApiResponse<typeof deletedCounts>);
  } catch (error) {
    logger.error(`[reset.step3] 重置失败`, error);
    next(error);
  }
}

/**
 * POST /novels/:novelId/reset/step4
 * 重置步骤4（卷战略/卷骨架）的产物
 *
 * 清除内容：
 * - VolumePlan（卷计划）
 * - VolumePlanVersion（卷计划版本）
 * - VolumeChapterPlan（章节规划）
 *
 * 注意：会自动级联重置步骤5、6和7
 */
async function resetStep4VolumeStrategy(req: Request, res: Response, next: NextFunction) {
  try {
    const novelId = req.params.novelId as string;

    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      res.status(404).json({ success: false, error: "小说不存在" } satisfies ApiResponse<never>);
      return;
    }

    logger.info(`[reset.step4] novelId=${novelId} 开始重置卷战略`);

    const deletedCounts = await prisma.$transaction(async (tx) => {
      // 重置步骤7（质量修复）
      const step7Result = await resetStep7QualityFix(tx, novelId);

      // 重置步骤6（章节执行）
      const repairVersions = await tx.chapterRepairVersion.deleteMany({
        where: { novelId },
      });
      const syncCheckpoints = await tx.chapterArtifactSyncCheckpoint.deleteMany({
        where: { novelId },
      });

      // 重置步骤5（节奏/拆章）
      const summaries = await tx.chapterSummary.deleteMany({
        where: { novelId },
      });
      const chaptersResetForStep5 = await tx.chapter.updateMany({
        where: { novelId },
        data: {
          title: "未命名章节",
          expectation: null,
          conflictLevel: null,
          revealLevel: null,
          targetWordCount: null,
          mustAvoid: null,
          taskSheet: null,
          sceneCards: null,
          hook: null,
          generationState: "planned",
          chapterStatus: "unplanned",
        },
      });

      // 重置步骤4（卷战略/卷骨架）
      const volumes = await tx.volumePlan.findMany({
        where: { novelId },
        select: { id: true },
      });
      const volumeIds = volumes.map((v) => v.id);

      const chapterPlans = volumeIds.length > 0
        ? await tx.volumeChapterPlan.deleteMany({
            where: { volumeId: { in: volumeIds } },
          })
        : { count: 0 };

      const versions = await tx.volumePlanVersion.deleteMany({
        where: { novelId },
      });

      const volumesDeleted = await tx.volumePlan.deleteMany({
        where: { novelId },
      });

      // 清空小说的卷相关字段
      await tx.novel.update({
        where: { id: novelId },
        data: {
          outline: null,
          structuredOutline: null,
        },
      });

      return {
        chapterPlans: chapterPlans.count,
        versions: versions.count,
        volumes: volumesDeleted.count,
        summaries: summaries.count,
        chaptersReset: chaptersResetForStep5.count,
        repairVersions: repairVersions.count,
        syncCheckpoints: syncCheckpoints.count,
        step7: step7Result,
        cascadedSteps: [5, 6, 7],
      };
    });

    const totalDeleted = Object.values(deletedCounts).reduce<number>((sum, count) => sum + (typeof count === 'number' ? count : 0), 0);
    logger.info(`[reset.step4] novelId=${novelId} 重置完成，已级联重置步骤5/6/7，共删除 ${totalDeleted} 条记录`, deletedCounts);

    res.status(200).json({
      success: true,
      data: deletedCounts,
      message: `已重置卷战略，并级联重置步骤5、6和7`,
    } satisfies ApiResponse<typeof deletedCounts>);
  } catch (error) {
    logger.error(`[reset.step4] 重置失败`, error);
    next(error);
  }
}

/**
 * POST /novels/:novelId/reset/step5
 * 重置步骤5（节奏/拆章）的产物
 *
 * 清除内容：
 * - Chapter的规划数据（保留记录，清除规划信息）
 * - ChapterSummary（章节摘要）
 * - 清除卷计划中的章节关联
 *
 * 注意：会自动级联重置步骤6和步骤7
 */
async function resetStep5StructuredOutline(req: Request, res: Response, next: NextFunction) {
  try {
    const novelId = req.params.novelId as string;

    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      res.status(404).json({ success: false, error: "小说不存在" } satisfies ApiResponse<never>);
      return;
    }

    logger.info(`[reset.step5] novelId=${novelId} 开始重置节奏/拆章`);

    const deletedCounts = await prisma.$transaction(async (tx) => {
      // 重置步骤7（质量修复）
      const step7Result = await resetStep7QualityFix(tx, novelId);

      // 重置步骤6（章节执行）
      const repairVersions = await tx.chapterRepairVersion.deleteMany({
        where: { novelId },
      });
      const syncCheckpoints = await tx.chapterArtifactSyncCheckpoint.deleteMany({
        where: { novelId },
      });

      // 删除章节摘要
      const summaries = await tx.chapterSummary.deleteMany({
        where: { novelId },
      });

      // 清空章节的规划数据（保留章节记录）
      const chaptersReset = await tx.chapter.updateMany({
        where: { novelId },
        data: {
          title: "未命名章节",
          expectation: null,
          conflictLevel: null,
          revealLevel: null,
          targetWordCount: null,
          mustAvoid: null,
          taskSheet: null,
          sceneCards: null,
          hook: null,
          generationState: "planned",
          chapterStatus: "unplanned",
        },
      });

      // 删除卷计划中的章节规划关联
      const volumes = await tx.volumePlan.findMany({
        where: { novelId },
        select: { id: true },
      });
      const volumeIds = volumes.map((v) => v.id);

      const chapterPlansDeleted = volumeIds.length > 0
        ? await tx.volumeChapterPlan.deleteMany({
            where: { volumeId: { in: volumeIds } },
          })
        : { count: 0 };

      return {
        summaries: summaries.count,
        chaptersReset: chaptersReset.count,
        chapterPlansDeleted: chapterPlansDeleted.count,
        repairVersions: repairVersions.count,
        syncCheckpoints: syncCheckpoints.count,
        step7: step7Result,
        cascadedSteps: [6, 7],
      };
    });

    logger.info(`[reset.step5] novelId=${novelId} 重置完成，已级联重置步骤6/7`, deletedCounts);

    res.status(200).json({
      success: true,
      data: deletedCounts,
      message: `已重置节奏/拆章，并级联重置步骤6和步骤7`,
    } satisfies ApiResponse<typeof deletedCounts>);
  } catch (error) {
    logger.error(`[reset.step5] 重置失败`, error);
    next(error);
  }
}

/**
 * POST /novels/:novelId/reset/step6
 * 重置步骤6（章节执行）的产物
 *
 * 清除内容：
 * - Chapter的正文内容和其他执行数据
 * - ChapterRepairVersion（修复版本）
 * - ChapterArtifactSyncCheckpoint（同步检查点）
 *
 * 注意：会自动级联重置步骤7
 */
async function resetStep6ChapterExecution(req: Request, res: Response, next: NextFunction) {
  try {
    const novelId = req.params.novelId as string;

    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      res.status(404).json({ success: false, error: "小说不存在" } satisfies ApiResponse<never>);
      return;
    }

    logger.info(`[reset.step6] novelId=${novelId} 开始重置章节执行`);

    const deletedCounts = await prisma.$transaction(async (tx) => {
      // 重置步骤7（质量修复）
      const step7Result = await resetStep7QualityFix(tx, novelId);

      return {
        ...step7Result,
        cascadedStep7: true,
      };
    });

    logger.info(`[reset.step6] novelId=${novelId} 重置完成，已级联重置步骤7`, deletedCounts);

    res.status(200).json({
      success: true,
      data: deletedCounts,
      message: `已重置章节执行，并级联重置步骤7`,
    } satisfies ApiResponse<typeof deletedCounts>);
  } catch (error) {
    logger.error(`[reset.step6] 重置失败`, error);
    next(error);
  }
}

/* ── Router factory ────────────────────────────────────────────────── */

export function createNovelResetRoutes(): Router {
  const router = Router();

  /**
   * POST /novels/:novelId/reset/step3
   * 重置步骤3（角色准备）的产物
   */
  router.post("/:novelId/reset/step3", resetStep3Characters);

  /**
   * POST /novels/:novelId/reset/step4
   * 重置步骤4（卷战略/卷骨架）的产物
   */
  router.post("/:novelId/reset/step4", resetStep4VolumeStrategy);

  /**
   * POST /novels/:novelId/reset/step5
   * 重置步骤5（节奏/拆章）的产物
   */
  router.post("/:novelId/reset/step5", resetStep5StructuredOutline);

  /**
   * POST /novels/:novelId/reset/step6
   * 重置步骤6（章节执行）的产物
   */
  router.post("/:novelId/reset/step6", resetStep6ChapterExecution);

  return router;
}
