---
reqId: 7072
title: "散文质量检测器 — 技术设计"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "0.7天"
version: v0.2
created: 2026-07-16
---

# REQ-7072: 散文质量检测器 — 技术设计

## 1. 核心函数

```typescript
function detectProseQuality(content: string): ProseQualityReport
function buildProseQualityAuditReport(input: ProseQualityAuditReportInput): RuntimeAuditReport | null
```

## 2. 检测流程

```
输入: 章节正文 (string)
  → buildTextSegments(content) 拆为 { text, line } 数组，过滤代码块和引用行
  → 逐行执行 9 个扫描器，每个发现 addFinding()
  → 汇总 ProseQualityReport { findings, hasBlockingFindings }
  → (可选) buildProseQualityAuditReport() 转为 RuntimeAuditReport
```

## 3. 安全机制

- 代码块（``` ... ```）和引用行（>）不扫描
- 引号内文本豁免占位符/工程术语检测（`isInsideQuote`）
- 对话行（以引号开头/结尾）豁免 period_stutter 检测
- 每种问题码上限 8 条
- 总计上限 40 条

## 4. 集成点

`ChapterContentFinalizationService.finalizeChapterContent()` 内部:

```
runAcceptanceGateOnly()
→ detectProseQuality(content)     // <-- 新增
→ buildRuntimePackage()
```

检测结果并入 `runtimePackage.audit`（或新增 `proseQuality` 字段）。

## 5. 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts` | **新建** | 检测器实现 |
| `server/src/services/novel/runtime/ChapterContentFinalizationService.ts` | **修改** | 集成调用点 |
| `server/tests/proseQuality.test.ts` | **新建** | 单元测试 |
