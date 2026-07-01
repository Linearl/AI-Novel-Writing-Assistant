import { prisma } from "../../db/prisma";
import type { AgentToolName } from "../types";
import type { AgentToolDefinition } from "./toolTypes";
import {
  auditPayoffHealthInputSchema,
  auditPayoffHealthOutputSchema,
  auditVolumeThemeCoverageInputSchema,
  auditVolumeThemeCoverageOutputSchema,
  getThemeHierarchyInputSchema,
  getThemeHierarchyOutputSchema,
} from "./themeConsistencyToolSchemas";

export const themeConsistencyToolDefinitions: Partial<
  Record<AgentToolName, AgentToolDefinition<Record<string, unknown>, Record<string, unknown>>>
> = {
  audit_payoff_health: {
    name: "audit_payoff_health",
    title: "伏笔健康度审计",
    description: "扫描伏笔账本，统计各状态数量，标记逾期和失败项。",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: auditPayoffHealthInputSchema,
    outputSchema: auditPayoffHealthOutputSchema,
    execute: async (_context, rawInput) => {
      const input = auditPayoffHealthInputSchema.parse(rawInput);

      const items = await prisma.payoffLedgerItem.findMany({
        where: { novelId: input.novelId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          ledgerKey: true,
          title: true,
          summary: true,
          currentStatus: true,
          targetStartChapterOrder: true,
          targetEndChapterOrder: true,
          lastTouchedChapterOrder: true,
          statusReason: true,
        },
      });

      if (items.length === 0) {
        return auditPayoffHealthOutputSchema.parse({
          novelId: input.novelId,
          totalItems: 0,
          statusCounts: [],
          overdueItems: [],
          failedItems: [],
          healthScore: 1,
          summary: "无伏笔数据。",
        });
      }

      // Group by status
      const statusMap = new Map<string, number>();
      for (const item of items) {
        statusMap.set(item.currentStatus, (statusMap.get(item.currentStatus) ?? 0) + 1);
      }

      const overdueItems = items.filter((i) => i.currentStatus === "overdue");
      const failedItems = items.filter((i) => i.currentStatus === "failed");

      const statusCounts = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        riskLevel: status === "overdue" || status === "failed"
          ? ("high" as const)
          : status === "setup" || status === "hinted"
            ? ("low" as const)
            : ("medium" as const),
      }));

      const unresolvedCount = overdueItems.length + failedItems.length;
      const healthScore = items.length > 0 ? 1 - unresolvedCount / items.length : 1;

      const summary = [
        `共 ${items.length} 条伏笔。`,
        `已收束 ${statusMap.get("paid_off") ?? 0} 条，`,
        `进行中 ${statusMap.get("pending_payoff") ?? 0} 条，`,
        overdueItems.length > 0 ? `逾期 ${overdueItems.length} 条，` : "",
        failedItems.length > 0 ? `失败 ${failedItems.length} 条，` : "",
        `健康分 ${(healthScore * 100).toFixed(0)}%。`,
      ]
        .filter(Boolean)
        .join("");

      return auditPayoffHealthOutputSchema.parse({
        novelId: input.novelId,
        totalItems: items.length,
        statusCounts,
        overdueItems: overdueItems.map((i) => ({
          id: i.id,
          ledgerKey: i.ledgerKey,
          title: i.title,
          summary: i.summary,
          currentStatus: i.currentStatus,
          targetStartChapterOrder: i.targetStartChapterOrder,
          targetEndChapterOrder: i.targetEndChapterOrder,
          lastTouchedChapterOrder: i.lastTouchedChapterOrder,
          statusReason: i.statusReason ?? null,
        })),
        failedItems: failedItems.map((i) => ({
          id: i.id,
          ledgerKey: i.ledgerKey,
          title: i.title,
          summary: i.summary,
          currentStatus: i.currentStatus,
          targetStartChapterOrder: i.targetStartChapterOrder,
          targetEndChapterOrder: i.targetEndChapterOrder,
          lastTouchedChapterOrder: i.lastTouchedChapterOrder,
          statusReason: i.statusReason ?? null,
        })),
        healthScore,
        summary,
      });
    },
  },

  audit_volume_theme_coverage: {
    name: "audit_volume_theme_coverage",
    title: "卷主题覆盖率审计",
    description: "检查每卷 mainPromise 是否有章节级 purpose 覆盖。",
    category: "inspect",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: auditVolumeThemeCoverageInputSchema,
    outputSchema: auditVolumeThemeCoverageOutputSchema,
    execute: async (_context, rawInput) => {
      const input = auditVolumeThemeCoverageInputSchema.parse(rawInput);

      const volumes = await prisma.volumePlan.findMany({
        where: { novelId: input.novelId },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          title: true,
          mainPromise: true,
          chapters: {
            orderBy: { chapterOrder: "asc" },
            select: {
              chapterOrder: true,
              purpose: true,
            },
          },
        },
      });

      if (volumes.length === 0) {
        return auditVolumeThemeCoverageOutputSchema.parse({
          novelId: input.novelId,
          volumeCount: 0,
          volumes: [],
          overallCoverageRatio: 0,
          summary: "无卷规划数据。",
        });
      }

      let totalChapters = 0;
      let totalWithPurpose = 0;

      const volumeItems = volumes.map((vol) => {
        const chapterCount = vol.chapters.length;
        const withPurpose = vol.chapters.filter(
          (ch) => ch.purpose !== null && ch.purpose.trim().length > 0,
        ).length;
        const uncoveredOrders = vol.chapters
          .filter((ch) => ch.purpose === null || ch.purpose.trim().length === 0)
          .map((ch) => ch.chapterOrder);

        totalChapters += chapterCount;
        totalWithPurpose += withPurpose;

        return {
          volumeId: vol.id,
          volumeSortOrder: vol.sortOrder,
          volumeTitle: vol.title,
          mainPromise: vol.mainPromise ?? null,
          chapterCount,
          chaptersWithPurpose: withPurpose,
          coverageRatio: chapterCount > 0 ? withPurpose / chapterCount : 0,
          uncoveredChapterOrders: uncoveredOrders,
        };
      });

      const overallRatio = totalChapters > 0 ? totalWithPurpose / totalChapters : 0;

      const summary = [
        `共 ${volumes.length} 卷，${totalChapters} 个章节计划。`,
        overallRatio === 1
          ? "全部章节已有 purpose。"
          : `覆盖率 ${(overallRatio * 100).toFixed(0)}%，${totalChapters - totalWithPurpose} 个章节缺少 purpose。`,
      ].join("");

      return auditVolumeThemeCoverageOutputSchema.parse({
        novelId: input.novelId,
        volumeCount: volumes.length,
        volumes: volumeItems,
        overallCoverageRatio: overallRatio,
        summary,
      });
    },
  },

  get_theme_hierarchy: {
    name: "get_theme_hierarchy",
    title: "主题层级聚合",
    description: "聚合 Bible → VolumePlan → VolumeChapterPlan 三层主题结构。",
    category: "read",
    riskLevel: "low",
    domainAgent: "NovelAgent",
    resourceScopes: ["novel"],
    inputSchema: getThemeHierarchyInputSchema,
    outputSchema: getThemeHierarchyOutputSchema,
    execute: async (_context, rawInput) => {
      const input = getThemeHierarchyInputSchema.parse(rawInput);

      const [bible, volumes] = await Promise.all([
        prisma.novelBible.findUnique({
          where: { novelId: input.novelId },
          select: {
            mainPromise: true,
            coreSetting: true,
            characterArcs: true,
          },
        }),
        prisma.volumePlan.findMany({
          where: { novelId: input.novelId },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            sortOrder: true,
            title: true,
            mainPromise: true,
            summary: true,
            chapters: {
              orderBy: { chapterOrder: "asc" },
              select: {
                id: true,
                chapterOrder: true,
                title: true,
                purpose: true,
                summary: true,
              },
            },
          },
        }),
      ]);

      const totalChapterPlanCount = volumes.reduce(
        (acc, vol) => acc + vol.chapters.length,
        0,
      );

      const volumeItems = volumes.map((vol) => ({
        volumeId: vol.id,
        sortOrder: vol.sortOrder,
        title: vol.title,
        mainPromise: vol.mainPromise ?? null,
        summary: vol.summary ?? null,
        chapters: vol.chapters.map((ch) => ({
          volumeChapterPlanId: ch.id,
          chapterOrder: ch.chapterOrder,
          title: ch.title,
          purpose: ch.purpose ?? null,
          summary: ch.summary,
        })),
      }));

      const summary = [
        bible ? "圣经已建立。" : "无圣经数据。",
        `共 ${volumes.length} 卷，${totalChapterPlanCount} 个章节计划。`,
      ].join("");

      return getThemeHierarchyOutputSchema.parse({
        novelId: input.novelId,
        bible: {
          exists: Boolean(bible),
          mainPromise: bible?.mainPromise ?? null,
          coreSetting: bible?.coreSetting ?? null,
          characterArcs: bible?.characterArcs ?? null,
        },
        volumes: volumeItems,
        totalVolumeCount: volumes.length,
        totalChapterPlanCount,
        summary,
      });
    },
  },
};
