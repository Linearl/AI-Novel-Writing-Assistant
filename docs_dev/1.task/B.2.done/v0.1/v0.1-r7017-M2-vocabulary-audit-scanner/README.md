---
description: "REQ-7017 词汇库审校扫描器 — 任务总线"
---

# REQ-7017 词汇库审校扫描器

> 创建日期：2026-07-10
> 目标版本：0.1
> 状态：✅ 已完成（全部 8 个任务完成）

---

## 1. 任务概述

### 1.1 需求来源

现有审校体系完全依赖 LLM（AuditService 轻审校/完整审校），存在 token 消耗大、可能误报漏报的问题。现有一批从木棉写作小红书账号 OCR 提取的写作替换词素材，需要结构化入库，在审校流程中增加一层确定性规则扫描——纯文本匹配，零 token 消耗，作为 LLM 审校的补充。

### 1.2 核心内容

1. 词汇库数据层：三类素材（僵尸词、高频替换词、隔断词）结构化入库
2. 确定性扫描器：纯规则匹配引擎，扫描章节正文并输出统计结果
3. 完整审校集成：AuditService.auditChapter 挂载扫描，生成 AuditReport
4. 执行审校集成：NovelCoreReviewService.reviewChapter 挂载扫描，生成 ReviewIssue
5. 修复 Prompt 注入：扫描命中详情 + 替换建议注入 AI 修复 prompt
6. 前端展示：扫描结果融入已有机审校报告 UI

### 1.3 前置条件

- 无外部依赖
- 依赖 FileToDbSyncService 同步机制（已有 precedent：antiAiRules、writingTechniques）
- 依赖已有审校报告 UI（ChapterExecutionReferencePanel ChapterRuntimeAuditCard）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7017-vocabulary-audit-scanner.md` | 需求工作副本 | 否 |
| `REQ-7017-vocabulary-audit-scanner-original.md` | 冻结副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 🆕 需求就绪 | 创建任务包 |

---

## 4. 执行清单

- [x] T1: 词库表设计、数据模型与 YAML 数据文件
- [x] T2: 词汇扫描引擎核心（VocabAuditScanner 服务）
- [x] T3: FileToDbSyncService 集成 — 启动时将 YAML 同步到数据库
- [x] T4: 完整审校集成 — AuditService.auditChapter 挂载扫描
- [x] T5: 执行审校集成 — NovelCoreReviewService.reviewChapter 挂载扫描
- [x] T6: 修复 Prompt 注入 — 扫描结果注入 repair context
- [x] T7: 前端展示 — 审校报告融入词汇扫描结果
- [x] T8: 词库数据提取 — 从木棉素材 OCR 提取并整理为 YAML
