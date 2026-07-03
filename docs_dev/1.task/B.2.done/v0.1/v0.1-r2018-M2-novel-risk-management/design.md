---
description: "小说项目风险管理系统 — 设计文档"
reqId: REQ-2018
created: 2026-06-26
---

# REQ-2018 设计文档

## 1. 架构概览

```
client/                                  server/
components/risk/                         services/novel/risk/
├── RiskDashboard.tsx        ──→        NovelRiskService.ts
├── RiskPanel.tsx                       modules/novel/risk/
├── RiskDetail.tsx                      ├── http/novelRiskRoutes.ts
├── RiskAssessmentBanner.tsx            ├── novelRiskSchemas.ts
├── RiskExportButton.tsx                └── novelRiskPersistence.ts
└── RiskImpactAnalysis.tsx
                                        shared/types/
                                        novelRisk.ts
                                        prisma/schema.prisma
                                        └── NovelRisk / RiskAuditLog
```

## 2. 数据模型

### 2.1 NovelRisk（新增 Prisma 模型）

```prisma
model NovelRisk {
  id              String   @id @default(uuid())
  novelId         String
  type            RiskType          // chapter | pipeline | quality | resource | continuity
  severity        RiskSeverity      // low | medium | high | critical
  status          RiskStatus        // open | ignored | accepted | resolved | reopened
  title           String
  description     String?
  chapterId       String?           // 关联章节（可选）
  chapterRange    String?           // 影响范围描述（如 "第3-7章"）
  volumeId        String?           // 关联卷
  impactAssessment String?          // 影响评估文本
  triggerSource   String?           // 触发来源（如 "qualityRepair", "beatSheetGeneration"）
  sourceMetadata  Json?             // 来源上下文原始数据
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  resolvedAt      DateTime?
  reopenedAt      DateTime?
  reopenedCount   Int      @default(0)
  exportedAt      DateTime?

  novel          Novel           @relation(fields: [novelId], references: [id])
  chapter        Chapter?        @relation(fields: [chapterId], references: [id])
  auditLogs      RiskAuditLog[]

  @@index([novelId, status])
  @@index([novelId, type])
  @@index([chapterId])
}

model RiskAuditLog {
  id          String   @id @default(uuid())
  riskId      String
  action      RiskAction  // created | ignored | accepted | resolved | reopened | comment_added
  actor       String      // system | user
  comment     String?
  prevStatus  RiskStatus?
  newStatus   RiskStatus?
  createdAt   DateTime @default(now())

  risk        NovelRisk  @relation(fields: [riskId], references: [id])

  @@index([riskId])
}
```

### 2.2 枚举与共享类型

```typescript
// shared/types/novelRisk.ts

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
  description?: string;
  chapterId?: string;
  chapterRange?: string;
  volumeId?: string;
  impactAssessment?: string;
  triggerSource?: string;
  sourceMetadata?: unknown;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  reopenedAt?: string;
  reopenedCount: number;
  auditLogs: RiskAuditLogRecord[];
}

export interface RiskAuditLogRecord {
  id: string;
  riskId: string;
  action: RiskAction;
  actor: "system" | "user";
  comment?: string;
  prevStatus?: RiskStatus;
  newStatus?: RiskStatus;
  createdAt: string;
}

// 风险评估结果
export interface RiskAssessment {
  totalRisks: number;
  openRisks: number;
  highImpactRisks: NovelRiskRecord[];
  plotImpactSummary: string;       // "可能影响剧情走向的风险概述"
  warningLevel: "none" | "info" | "warning" | "critical";
  affectedChapters: string[];      // 受影响章节 ID 列表
  downstreamImpactEstimate: string; // 下游影响预估描述
}

// 回溯影响评估
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

// 风险导出格式
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
```

## 3. API 设计

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/novels/:novelId/risks` | 获取风险列表（支持 query filter） |
| `GET` | `/api/novels/:novelId/risks/:riskId` | 获取单个风险详情 |
| `PATCH` | `/api/novels/:novelId/risks/:riskId/status` | 更新风险状态 |
| `POST` | `/api/novels/:novelId/risks/:riskId/reopen` | 重新打开已处理风险 |
| `GET` | `/api/novels/:novelId/risks/:riskId/reopen-impact` | 评估重新打开对下游的影响 |
| `GET` | `/api/novels/:novelId/risks/assessment` | 获取整体风险评估 |
| `POST` | `/api/novels/:novelId/risks/export` | 导出风险（query: format=md|json） |
| `POST` | `/api/novels/:novelId/risks` | 创建风险（内部调用） |

## 4. 前端组件树

```
RiskPanel (可折叠面板，放在步骤 7 下方)
├── RiskAssessmentBanner            // 警示横幅，自动显示
├── RiskFilters                     // 按类型/状态/严重程度过滤
├── RiskList                        // 风险列表
│   └── RiskItem                    // 单条风险摘要
│       ├── RiskStatusBadge         // 状态徽章
│       └── RiskSeverityIcon        // 严重程度图标
├── RiskDetail (展开/弹窗)          // 风险详情
│   ├── RiskTimeline                // 时间线（含审计日志）
│   └── RiskActions                 // 操作按钮（接受/忽略/重新打开）
├── RiskReopenImpactPanel           // 回溯影响评估面板
├── RiskAssessmentSummary           // 综合评估面板
└── RiskExportButton                // 导出按钮
```

## 5. 面板位置

风险面板插入到**步骤 7（质量修复）下方**：

```
步骤 6: 章节生成
步骤 7: 质量修复
  ↳ RiskPanel (风险面板 — 可折叠，默认展开)  ← 插入位置
步骤 8: 流水线完成
```

## 6. 导出格式

### 6.1 Markdown 导出

```markdown
# 项目风险报告 — 《小说名称》
> 导出时间: 2026-06-26

## 概览
| 状态 | 数量 |
|------|------|
| 未处理 | 3 |
| 已接受 | 1 |
| 已忽略 | 2 |
| 已修复 | 5 |

## 风险列表
### REQ-RISK-001: 章节 3 角色动机不一致
- **类型**: continuity
- **严重程度**: high
- **状态**: open
- **影响评估**: ...
```

### 6.2 JSON 导出

完整的 `RiskExport` 接口结构，方便程序化处理。

## 7. 与现有系统的关系

### 复用/扩展

- `DirectorQualityRepairRisk` 作为风险创建的一个来源（`triggerSource = "qualityRepair"`）
- 现有的 `ResourceRiskPanel` 组件可选择性重构为通用风险展示组件

### 不修改

- 自动导演流程中的质量门判断逻辑保持不变
- `buildDirectorQualityRepairRisk` 函数保持不变，但增加调用侧的风险记录逻辑

## 8. 实施顺序

1. **Phase 1**: 数据模型 + 后端 CRUD API（NovelRisk schema、service、routes）
2. **Phase 2**: 前端基础组件（RiskPanel、RiskList、RiskDetail）
3. **Phase 3**: 风险回溯与影响评估
4. **Phase 4**: 综合风险评估面板
5. **Phase 5**: 导出功能
