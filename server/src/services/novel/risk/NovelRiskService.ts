import { prisma } from "../../../db/prisma";
import type {
  NovelRiskRecord,
  RiskAction,
  RiskAssessment,
  RiskAuditLogRecord,
  RiskReopenImpact,
  RiskSeverity,
  RiskStatus,
  RiskType,
} from "@ai-novel/shared";

function toRecord(row: any): NovelRiskRecord {
  return {
    id: row.id,
    novelId: row.novelId,
    type: row.type as RiskType,
    severity: row.severity as RiskSeverity,
    status: row.status as RiskStatus,
    title: row.title,
    description: row.description,
    chapterId: row.chapterId,
    chapterRange: row.chapterRange,
    volumeId: row.volumeId,
    impactAssessment: row.impactAssessment,
    triggerSource: row.triggerSource,
    sourceMetadata: row.sourceMetadata ? JSON.parse(row.sourceMetadata) : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    reopenedAt: row.reopenedAt?.toISOString() ?? null,
    reopenedCount: row.reopenedCount,
    auditLogs: (row.auditLogs ?? []).map(toAuditLogRecord),
  };
}

function toAuditLogRecord(row: any): RiskAuditLogRecord {
  return {
    id: row.id,
    riskId: row.riskId,
    action: row.action as RiskAction,
    actor: row.actor as "system" | "user",
    comment: row.comment,
    prevStatus: row.prevStatus as RiskStatus | null,
    newStatus: row.newStatus as RiskStatus | null,
    createdAt: row.createdAt.toISOString(),
  };
}

export class NovelRiskService {
  async listRisks(novelId: string, filters?: { status?: RiskStatus; type?: RiskType; severity?: RiskSeverity }): Promise<NovelRiskRecord[]> {
    const rows = await prisma.novelRisk.findMany({
      where: {
        novelId,
        ...(filters?.status ? { status: filters.status } : {}),
        ...(filters?.type ? { type: filters.type } : {}),
        ...(filters?.severity ? { severity: filters.severity } : {}),
      },
      include: { auditLogs: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toRecord);
  }

  async getRisk(novelId: string, riskId: string): Promise<NovelRiskRecord | null> {
    const row = await prisma.novelRisk.findFirst({
      where: { id: riskId, novelId },
      include: { auditLogs: { orderBy: { createdAt: "asc" } } },
    });
    return row ? toRecord(row) : null;
  }

  async createRisk(input: {
    novelId: string;
    type: RiskType;
    severity: RiskSeverity;
    title: string;
    description?: string;
    chapterId?: string;
    chapterRange?: string;
    volumeId?: string;
    impactAssessment?: string;
    triggerSource?: string;
    sourceMetadata?: unknown;
  }): Promise<NovelRiskRecord> {
    const row = await prisma.novelRisk.create({
      data: {
        novelId: input.novelId,
        type: input.type,
        severity: input.severity,
        title: input.title,
        description: input.description ?? null,
        chapterId: input.chapterId ?? null,
        chapterRange: input.chapterRange ?? null,
        volumeId: input.volumeId ?? null,
        impactAssessment: input.impactAssessment ?? null,
        triggerSource: input.triggerSource ?? null,
        sourceMetadata: input.sourceMetadata ? JSON.stringify(input.sourceMetadata) : null,
        auditLogs: {
          create: {
            action: "created",
            actor: "system",
            newStatus: "open",
          },
        },
      },
      include: { auditLogs: true },
    });
    return toRecord(row);
  }

  async updateRiskStatus(
    novelId: string,
    riskId: string,
    newStatus: RiskStatus,
    actor: "system" | "user" = "user",
    comment?: string,
  ): Promise<NovelRiskRecord | null> {
    const existing = await prisma.novelRisk.findFirst({ where: { id: riskId, novelId } });
    if (!existing) return null;

    const prevStatus = existing.status as RiskStatus;
    const row = await prisma.novelRisk.update({
      where: { id: riskId },
      data: {
        status: newStatus,
        ...(newStatus === "resolved" ? { resolvedAt: new Date() } : {}),
        ...(newStatus === "reopened" ? { reopenedAt: new Date(), reopenedCount: { increment: 1 } } : {}),
        auditLogs: {
          create: {
            action: newStatus as unknown as string,
            actor,
            comment,
            prevStatus,
            newStatus,
          },
        },
      },
      include: { auditLogs: { orderBy: { createdAt: "asc" } } },
    });
    return toRecord(row);
  }

  async getAssessment(novelId: string): Promise<RiskAssessment> {
    const risks = await this.listRisks(novelId);
    const openRisks = risks.filter((r) => r.status === "open" || r.status === "reopened");
    const highImpactRisks = openRisks.filter((r) => r.severity === "high" || r.severity === "critical");
    const affectedChapters = [...new Set(openRisks.map((r) => r.chapterId).filter(Boolean))] as string[];

    let warningLevel: RiskAssessment["warningLevel"] = "none";
    if (highImpactRisks.length > 0) warningLevel = "critical";
    else if (openRisks.length > 3) warningLevel = "warning";
    else if (openRisks.length > 0) warningLevel = "info";

    return {
      totalRisks: risks.length,
      openRisks: openRisks.length,
      highImpactRisks,
      plotImpactSummary: highImpactRisks.length > 0
        ? `有 ${highImpactRisks.length} 个高影响风险可能改变剧情走向`
        : "当前无高影响风险",
      warningLevel,
      affectedChapters,
      downstreamImpactEstimate: `${affectedChapters.length} 个章节可能受影响`,
    };
  }

  async exportRisks(novelId: string, novelTitle: string, format?: "json" | "md"): Promise<{ format: string; content: string }> {
    const risks = await this.listRisks(novelId);
    const summary = {
      total: risks.length,
      open: risks.filter((r) => r.status === "open").length,
      resolved: risks.filter((r) => r.status === "resolved").length,
      ignored: risks.filter((r) => r.status === "ignored").length,
      accepted: risks.filter((r) => r.status === "accepted").length,
      reopened: risks.filter((r) => r.status === "reopened").length,
    };

    if (format === "md") {
      const lines: string[] = [];
      lines.push(`# 风险报告 — ${novelTitle}`);
      lines.push("");
      lines.push(`导出时间：${new Date().toLocaleString("zh-CN")}`);
      lines.push("");
      lines.push("## 概览");
      lines.push("");
      lines.push(`| 指标 | 数量 |`);
      lines.push(`|------|------|`);
      lines.push(`| 总计 | ${summary.total} |`);
      lines.push(`| 未处理 | ${summary.open} |`);
      lines.push(`| 已修复 | ${summary.resolved} |`);
      lines.push(`| 已接受 | ${summary.accepted} |`);
      lines.push(`| 已忽略 | ${summary.ignored} |`);
      lines.push(`| 已重开 | ${summary.reopened} |`);
      lines.push("");

      const SEVERITY_LABELS: Record<string, string> = { low: "低", medium: "中", high: "高", critical: "严重" };
      const STATUS_LABELS: Record<string, string> = { open: "未处理", ignored: "已忽略", accepted: "已接受", resolved: "已修复", reopened: "已重开" };
      const TYPE_LABELS: Record<string, string> = { chapter: "章节", pipeline: "流水线", quality: "质量", resource: "资源", continuity: "连续性" };

      if (risks.length > 0) {
        lines.push("## 风险列表");
        lines.push("");
        for (const risk of risks) {
          const severity = SEVERITY_LABELS[risk.severity] ?? risk.severity;
          const status = STATUS_LABELS[risk.status] ?? risk.status;
          const type = TYPE_LABELS[risk.type] ?? risk.type;
          lines.push(`### [${severity}] ${risk.title}`);
          lines.push("");
          lines.push(`- **类型**：${type}　**状态**：${status}　**创建时间**：${risk.createdAt}`);
          if (risk.description) lines.push(`- **描述**：${risk.description}`);
          if (risk.chapterRange) lines.push(`- **章节范围**：${risk.chapterRange}`);
          if (risk.impactAssessment) lines.push(`- **影响评估**：${risk.impactAssessment}`);
          if (risk.triggerSource) lines.push(`- **触发来源**：${risk.triggerSource}`);
          if (risk.reopenedCount > 0) lines.push(`- **重开次数**：${risk.reopenedCount}`);
          lines.push("");
        }
      }

      return { format: "md", content: lines.join("\n") };
    }

    return {
      format: "json",
      content: JSON.stringify({
        exportedAt: new Date().toISOString(),
        novelId,
        novelTitle,
        summary,
        risks,
      }, null, 2),
    };
  }

  async getReopenImpact(novelId: string, riskId: string): Promise<RiskReopenImpact | null> {
    const risk = await this.getRisk(novelId, riskId);
    if (!risk) return null;

    const affectedChapterIds = risk.chapterId
      ? [risk.chapterId]
      : risk.chapterRange
        ? (await prisma.chapter.findMany({
            where: { novelId },
            select: { id: true },
            orderBy: { order: "asc" },
            take: 10,
          })).map((ch) => ch.id)
        : [];

    const chapters = affectedChapterIds.length > 0
      ? await prisma.chapter.findMany({
          where: { id: { in: affectedChapterIds } },
          select: { id: true, title: true },
          orderBy: { order: "asc" },
        })
      : [];

    const affectedChapters = chapters.map((ch) => ({
      chapterId: ch.id,
      chapterTitle: ch.title,
      volumeNumber: 0,
      impactReason: `风险「${risk.title}」关联此章节，重新开放后可能需要重新生成或修复`,
    }));

    const hasHighSeverity = risk.severity === "high" || risk.severity === "critical";
    const estimatedRepairCost = hasHighSeverity
      ? `高风险重开：预计需要重新审校 ${affectedChapters.length} 章，建议人工逐章审查`
      : affectedChapters.length > 3
        ? `中等修复成本：涉及 ${affectedChapters.length} 章，可自动修复后人工确认`
        : affectedChapters.length > 0
          ? `低修复成本：涉及 ${affectedChapters.length} 章，可自动修复`
          : "无直接章节影响";

    return {
      risk,
      affectedChapters,
      estimatedRepairCost,
      recommendManualReview: hasHighSeverity || risk.reopenedCount >= 2,
    };
  }
}

export const novelRiskService = new NovelRiskService();
