export type RiskType = "chapter" | "pipeline" | "quality" | "resource" | "continuity";
export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "ignored" | "accepted" | "resolved" | "reopened";
export type RiskAction = "created" | "ignored" | "accepted" | "resolved" | "reopened" | "comment_added";

export interface NovelRiskRecord {
  id: string;
  novelId: string;
  type: RiskType;
  severity: RiskSeverity;
  status: RiskStatus;
  title: string;
  description?: string | null;
  chapterId?: string | null;
  chapterRange?: string | null;
  volumeId?: string | null;
  impactAssessment?: string | null;
  triggerSource?: string | null;
  sourceMetadata?: unknown;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  reopenedAt?: string | null;
  reopenedCount: number;
  auditLogs: RiskAuditLogRecord[];
}

export interface RiskAuditLogRecord {
  id: string;
  riskId: string;
  action: RiskAction;
  actor: "system" | "user";
  comment?: string | null;
  prevStatus?: RiskStatus | null;
  newStatus?: RiskStatus | null;
  createdAt: string;
}

export interface RiskAssessment {
  totalRisks: number;
  openRisks: number;
  highImpactRisks: NovelRiskRecord[];
  plotImpactSummary: string;
  warningLevel: "none" | "info" | "warning" | "critical";
  affectedChapters: string[];
  downstreamImpactEstimate: string;
}

export interface RiskReopenImpact {
  risk: NovelRiskRecord;
  affectedChapters: Array<{
    chapterId: string;
    chapterTitle: string;
    volumeNumber: number;
    impactReason: string;
  }>;
  estimatedRepairCost: string;
  recommendManualReview: boolean;
}

export interface RiskExport {
  exportedAt: string;
  novelId: string;
  novelTitle: string;
  summary: {
    total: number;
    open: number;
    resolved: number;
    ignored: number;
    accepted: number;
    reopened: number;
  };
  risks: NovelRiskRecord[];
}
