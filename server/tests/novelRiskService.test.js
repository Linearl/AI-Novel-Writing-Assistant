const test = require("node:test");
const assert = require("node:assert/strict");

/**
 * REQ-2018 后端单元测试：NovelRiskService
 *
 * 在任何 require 之前，通过拦截 require.cache 注入 mock prisma。
 * 测试 createRisk、listRisks、updateRiskStatus、getAssessment、exportRisks（含 Markdown）、getReopenImpact。
 */

// ============================================================
// Mock Prisma — 注入到 require cache
// ============================================================

function createMockPrisma() {
  const store = { risks: [], auditLogs: [] };
  let idCounter = 0;

  function makeRow(data) {
    idCounter++;
    const id = `risk-${idCounter}`;
    const now = new Date();
    return {
      id,
      novelId: data.novelId,
      type: data.type ?? "quality",
      severity: data.severity ?? "medium",
      status: data.status ?? "open",
      title: data.title ?? "测试风险",
      description: data.description ?? null,
      chapterId: data.chapterId ?? null,
      chapterRange: data.chapterRange ?? null,
      volumeId: data.volumeId ?? null,
      impactAssessment: data.impactAssessment ?? null,
      triggerSource: data.triggerSource ?? null,
      sourceMetadata: data.sourceMetadata ?? null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      reopenedAt: null,
      reopenedCount: 0,
      auditLogs: [],
    };
  }

  const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

  const mockPrisma = {
    novelRisk: {
      findMany: async ({ where, include, orderBy }) => {
        let rows = store.risks.filter((r) => r.novelId === where.novelId);
        if (where.status) rows = rows.filter((r) => r.status === where.status);
        if (where.type) rows = rows.filter((r) => r.type === where.type);
        if (where.severity) rows = rows.filter((r) => r.severity === where.severity);
        if (orderBy) {
          rows = [...rows].sort((a, b) => {
            for (const rule of orderBy) {
              const key = Object.keys(rule)[0];
              const dir = rule[key];
              let cmp = 0;
              if (key === "severity") {
                cmp = (SEVERITY_ORDER[b.severity] ?? 0) - (SEVERITY_ORDER[a.severity] ?? 0);
              } else if (key === "createdAt") {
                cmp = b.createdAt.getTime() - a.createdAt.getTime();
              } else if (key === "order") {
                cmp = (a.order ?? 0) - (b.order ?? 0);
              }
              if (cmp !== 0) return cmp;
            }
            return 0;
          });
        }
        return rows.map((r) => ({
          ...r,
          auditLogs: include?.auditLogs
            ? store.auditLogs.filter((a) => a.riskId === r.id).sort((a, b) => a.createdAt - b.createdAt)
            : undefined,
        }));
      },
      findFirst: async ({ where, include }) => {
        const row = store.risks.find((r) => r.id === where.id && r.novelId === where.novelId);
        if (!row) return null;
        return {
          ...row,
          auditLogs: include?.auditLogs
            ? store.auditLogs.filter((a) => a.riskId === row.id).sort((a, b) => a.createdAt - b.createdAt)
            : undefined,
        };
      },
      create: async ({ data, include }) => {
        const row = makeRow(data);
        if (data.auditLogs?.create) {
          const logData = data.auditLogs.create;
          const log = {
            id: `log-${store.auditLogs.length + 1}`,
            riskId: row.id,
            action: logData.action,
            actor: logData.actor,
            comment: logData.comment ?? null,
            prevStatus: logData.prevStatus ?? null,
            newStatus: logData.newStatus ?? null,
            createdAt: new Date(),
          };
          store.auditLogs.push(log);
          row.auditLogs = [log];
        }
        store.risks.push(row);
        return { ...row, auditLogs: include?.auditLogs ? row.auditLogs : undefined };
      },
      update: async ({ where, data, include }) => {
        const row = store.risks.find((r) => r.id === where.id);
        if (!row) throw new Error("Risk not found");
        if (data.status) row.status = data.status;
        if (data.resolvedAt) row.resolvedAt = data.resolvedAt;
        if (data.reopenedAt) row.reopenedAt = data.reopenedAt;
        if (data.reopenedCount?.increment) row.reopenedCount += data.reloadedCount?.increment ?? 0;
        if (data.reopenedCount?.increment) row.reopenedCount += data.reopenedCount.increment;
        row.updatedAt = new Date();
        if (data.auditLogs?.create) {
          const logData = data.auditLogs.create;
          const log = {
            id: `log-${store.auditLogs.length + 1}`,
            riskId: row.id,
            action: logData.action,
            actor: logData.actor,
            comment: logData.comment ?? null,
            prevStatus: logData.prevStatus ?? null,
            newStatus: logData.newStatus ?? null,
            createdAt: new Date(),
          };
          store.auditLogs.push(log);
        }
        return {
          ...row,
          auditLogs: include?.auditLogs
            ? store.auditLogs.filter((a) => a.riskId === row.id).sort((a, b) => a.createdAt - b.createdAt)
            : undefined,
        };
      },
    },
    chapter: { findMany: async () => [] },
    volume: { findMany: async () => [] },
  };

  return { mockPrisma, store };
}

// 在加载服务之前，将 mock prisma 注入到 require cache
const prismaPath = require.resolve("../dist/db/prisma.js");
const { mockPrisma, store } = createMockPrisma();

// 直接预设 require cache，阻止真实模块执行
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { prisma: mockPrisma },
};

const { NovelRiskService } = require("../dist/services/novel/risk/NovelRiskService.js");

function freshService() {
  return new NovelRiskService();
}

// ============================================================
// createRisk
// ============================================================

test("createRisk: creates risk with audit log", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({
    novelId: "novel-1",
    type: "quality",
    severity: "high",
    title: "章节连贯性问题",
    description: "第3章与第4章角色性格不一致",
  });
  assert.equal(risk.novelId, "novel-1");
  assert.equal(risk.type, "quality");
  assert.equal(risk.severity, "high");
  assert.equal(risk.status, "open");
  assert.equal(risk.title, "章节连贯性问题");
  assert.equal(store.risks.length, 1);
  assert.equal(store.auditLogs.length, 1);
  assert.equal(store.auditLogs[0].action, "created");
  assert.equal(store.auditLogs[0].actor, "system");
});

test("createRisk: stores optional fields", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({
    novelId: "novel-1",
    type: "continuity",
    severity: "critical",
    title: "重规划要求",
    chapterId: "ch-5",
    chapterRange: "5-8",
    volumeId: "vol-1",
    impactAssessment: "影响后续3章",
    triggerSource: "auto_director",
    sourceMetadata: { noticeCode: "REPLAN" },
  });
  assert.equal(risk.chapterId, "ch-5");
  assert.equal(risk.chapterRange, "5-8");
  assert.equal(risk.volumeId, "vol-1");
  assert.equal(risk.impactAssessment, "影响后续3章");
  assert.equal(risk.triggerSource, "auto_director");
  assert.deepEqual(risk.sourceMetadata, { noticeCode: "REPLAN" });
  assert.equal(store.risks.length, 1);
});

// ============================================================
// listRisks
// ============================================================

test("listRisks: returns risks ordered by severity desc then createdAt desc", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  await service.createRisk({ novelId: "novel-1", severity: "low", title: "低风险" });
  await service.createRisk({ novelId: "novel-1", severity: "critical", title: "严重风险" });
  await service.createRisk({ novelId: "novel-1", severity: "medium", title: "中风险" });

  const risks = await service.listRisks("novel-1");
  assert.equal(risks.length, 3);
  assert.equal(risks[0].severity, "critical");
  assert.equal(risks[1].severity, "medium");
  assert.equal(risks[2].severity, "low");
});

test("listRisks: filters by status", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  await service.createRisk({ novelId: "novel-1", title: "风险1" });
  const created = await service.createRisk({ novelId: "novel-1", title: "风险2" });
  await service.updateRiskStatus("novel-1", created.id, "resolved", "user");

  const openRisks = await service.listRisks("novel-1", { status: "open" });
  assert.equal(openRisks.length, 1);
  assert.equal(openRisks[0].title, "风险1");

  const resolvedRisks = await service.listRisks("novel-1", { status: "resolved" });
  assert.equal(resolvedRisks.length, 1);
  assert.equal(resolvedRisks[0].title, "风险2");
});

test("listRisks: filters by type", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  await service.createRisk({ novelId: "novel-1", type: "quality", title: "质量风险" });
  await service.createRisk({ novelId: "novel-1", type: "continuity", title: "连续性风险" });

  const qualityRisks = await service.listRisks("novel-1", { type: "quality" });
  assert.equal(qualityRisks.length, 1);
  assert.equal(qualityRisks[0].type, "quality");
});

// ============================================================
// updateRiskStatus
// ============================================================

test("updateRiskStatus: transitions status and creates audit log", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({ novelId: "novel-1", title: "测试" });
  assert.equal(risk.status, "open");

  const updated = await service.updateRiskStatus("novel-1", risk.id, "accepted", "user", "可接受");
  assert.equal(updated.status, "accepted");
  assert.equal(store.auditLogs.length, 2);
  assert.equal(store.auditLogs[1].action, "accepted");
  assert.equal(store.auditLogs[1].prevStatus, "open");
  assert.equal(store.auditLogs[1].newStatus, "accepted");
  assert.equal(store.auditLogs[1].actor, "user");
  assert.equal(store.auditLogs[1].comment, "可接受");
});

test("updateRiskStatus: resolves risk and sets resolvedAt", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({ novelId: "novel-1", title: "测试" });
  const updated = await service.updateRiskStatus("novel-1", risk.id, "resolved", "system");
  assert.equal(updated.status, "resolved");
  assert.ok(updated.resolvedAt !== null);
});

test("updateRiskStatus: reopens risk and increments reopenedCount", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({ novelId: "novel-1", title: "测试" });
  await service.updateRiskStatus("novel-1", risk.id, "resolved", "user");
  const reopened = await service.updateRiskStatus("novel-1", risk.id, "reopened", "user", "问题复发");
  assert.equal(reopened.status, "reopened");
  assert.equal(reopened.reopenedCount, 1);
  assert.ok(reopened.reopenedAt !== null);
});

test("updateRiskStatus: returns null for non-existent risk", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const result = await service.updateRiskStatus("novel-1", "fake-id", "resolved");
  assert.equal(result, null);
});

// ============================================================
// getAssessment
// ============================================================

test("getAssessment: computes warning level based on open high-impact risks", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();

  let assessment = await service.getAssessment("novel-1");
  assert.equal(assessment.warningLevel, "none");
  assert.equal(assessment.totalRisks, 0);

  await service.createRisk({ novelId: "novel-1", severity: "low", title: "低风险" });
  assessment = await service.getAssessment("novel-1");
  assert.equal(assessment.warningLevel, "info");
  assert.equal(assessment.totalRisks, 1);
  assert.equal(assessment.openRisks, 1);

  await service.createRisk({ novelId: "novel-1", severity: "high", title: "高风险" });
  assessment = await service.getAssessment("novel-1");
  assert.equal(assessment.warningLevel, "critical");
  assert.equal(assessment.highImpactRisks.length, 1);
});

test("getAssessment: resolves risks to reduce warning level", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();

  const r1 = await service.createRisk({ novelId: "novel-1", severity: "high", title: "高风险" });
  await service.createRisk({ novelId: "novel-1", severity: "low", title: "低风险" });

  let assessment = await service.getAssessment("novel-1");
  assert.equal(assessment.warningLevel, "critical");

  await service.updateRiskStatus("novel-1", r1.id, "resolved", "user");
  assessment = await service.getAssessment("novel-1");
  assert.equal(assessment.warningLevel, "info");
  assert.equal(assessment.highImpactRisks.length, 0);
});

// ============================================================
// exportRisks (JSON format)
// ============================================================

test("exportRisks: returns JSON format by default", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  await service.createRisk({ novelId: "novel-1", title: "风险1" });
  const result = await service.exportRisks("novel-1", "测试小说");
  assert.equal(result.format, "json");
  const parsed = JSON.parse(result.content);
  assert.equal(parsed.novelTitle, "测试小说");
  assert.equal(parsed.novelId, "novel-1");
  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.summary.open, 1);
  assert.equal(parsed.risks.length, 1);
});

// ============================================================
// exportRisks (Markdown format)
// ============================================================

test("exportRisks: returns Markdown format when format='md'", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  await service.createRisk({ novelId: "novel-1", severity: "high", title: "连贯性断裂", description: "第5章剧情断裂" });
  await service.createRisk({ novelId: "novel-1", severity: "low", title: "措辞优化", chapterRange: "3-4" });
  const result = await service.exportRisks("novel-1", "测试小说", "md");
  assert.equal(result.format, "md");
  assert.ok(result.content.includes("# 风险报告 — 测试小说"));
  assert.ok(result.content.includes("## 概览"));
  assert.ok(result.content.includes("| 总计 | 2 |"));
  assert.ok(result.content.includes("| 未处理 | 2 |"));
  assert.ok(result.content.includes("## 风险列表"));
  assert.ok(result.content.includes("[高] 连贯性断裂"));
  assert.ok(result.content.includes("[低] 措辞优化"));
  assert.ok(result.content.includes("第5章剧情断裂"));
  assert.ok(result.content.includes("3-4"));
});

test("exportRisks: Markdown with no risks has no risk list section", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const result = await service.exportRisks("novel-1", "空小说", "md");
  assert.equal(result.format, "md");
  assert.ok(result.content.includes("| 总计 | 0 |"));
  assert.ok(!result.content.includes("## 风险列表"));
});

// ============================================================
// getReopenImpact
// ============================================================

test("getReopenImpact: returns null for non-existent risk", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const result = await service.getReopenImpact("novel-1", "fake-id");
  assert.equal(result, null);
});

test("getReopenImpact: computes impact for existing risk", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({
    novelId: "novel-1",
    severity: "high",
    title: "严重质量风险",
    chapterId: "ch-5",
  });

  const impact = await service.getReopenImpact("novel-1", risk.id);
  assert.ok(impact !== null);
  assert.equal(impact.risk.id, risk.id);
  assert.equal(impact.risk.title, "严重质量风险");
  assert.equal(impact.recommendManualReview, true);
  assert.ok(typeof impact.estimatedRepairCost === "string");
  assert.ok(impact.estimatedRepairCost.length > 0);
});

test("getReopenImpact: recommends manual review for high severity", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({
    novelId: "novel-1",
    severity: "critical",
    title: "严重风险",
  });
  const impact = await service.getReopenImpact("novel-1", risk.id);
  assert.equal(impact.recommendManualReview, true);
});

test("getReopenImpact: recommends manual review for risk reopened 2+ times", async () => {
  store.risks.length = 0;
  store.auditLogs.length = 0;
  const service = freshService();
  const risk = await service.createRisk({
    novelId: "novel-1",
    severity: "low",
    title: "反复出现的风险",
  });
  await service.updateRiskStatus("novel-1", risk.id, "reopened", "user");
  await service.updateRiskStatus("novel-1", risk.id, "reopened", "user");

  const impact = await service.getReopenImpact("novel-1", risk.id);
  assert.equal(impact.recommendManualReview, true);
  assert.equal(impact.risk.reopenedCount, 2);
});
