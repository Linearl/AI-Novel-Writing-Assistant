import { prisma } from "../../../db/prisma";
import type {
  NovelRiskRecord,
  RiskAction,
  RiskAssessment,
  RiskAuditLogRecord,
  RiskSeverity,
  RiskStatus,
  RiskType,
} from "@ai-novel/shared/types/novelRisk";

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

  async exportRisks(novelId: string, novelTitle: string) {
    const risks = await this.listRisks(novelId);
    const summary = {
      total: risks.length,
      open: risks.filter((r) => r.status === "open").length,
      resolved: risks.filter((r) => r.status === "resolved").length,
      ignored: risks.filter((r) => r.status === "ignored").length,
      accepted: risks.filter((r) => r.status === "accepted").length,
      reopened: risks.filter((r) => r.status === "reopened").length,
    };
    return {
      exportedAt: new Date().toISOString(),
      novelId,
      novelTitle,
      summary,
      risks,
    };
  }
}

export const novelRiskService = new NovelRiskService();
