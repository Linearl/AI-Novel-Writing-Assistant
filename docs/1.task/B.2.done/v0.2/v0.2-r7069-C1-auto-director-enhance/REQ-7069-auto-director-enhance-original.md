---
reqId: 7060
title: "Auto-Director 增强 — 需求文档（冻结副本）"
status: requirements_ready
priority: P1
complexity: C1
estimatedEffort: "5-6天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7060: Auto-Director 增强 — 冻结副本

> 此为需求冻结副本，仅在需求评审通过后更新。工作副本见 `REQ-7060-auto-director-enhance.md`。

## 1. 需求背景

### 1.1 问题描述

当前 Auto-Director 在以下维度存在体验缺口：
- 创建新小说项目时缺少引导式向导，用户需手动逐步配置
- 自动导演执行过程中用户离开页面后无法及时获知进度和暂停状态
- 待审核章节长时间无人处理导致流水线停滞
- 缺少散文级质量检测能力，仅有章节级审校
- 冲突强度（conflictLevel）为硬编码值，缺少用户可调控的曲线编辑
- 待审状态切换时上下文不足，审校结果质量受限
- 资源上下文散落在多处，组装逻辑不统一

### 1.2 目标用户

所有使用 Auto-Director 功能的用户，特别是首次使用系统的新用户、长时间挂机运行自动导演的用户、追求散文质量的作者。

## 2. 功能需求概要

| 编号 | 功能 | 优先级 | 预估 |
|------|------|--------|------|
| FR-1 | 5 步创建向导 | P1 | 2.5 天 |
| FR-2 | 桌面通知系统 | P1 | 0.7 天 |
| FR-3 | 待审自动提升 | P2 | 0.7 天 |
| FR-4 | 散文质量检测器 | P2 | 0.7 天 |
| FR-5 | 冲突等级曲线 | P2 | 0.7 天 |
| FR-6 | 待审上下文注入 | P2 | 0.4 天 |
| FR-7 | 资源上下文重构 | P2 | 0.4 天 |

## 3. 上游参考

所有子功能在上游仓库 `AI-Novel-Writing-Assistant-main` 中有完备参考实现。

| 上游路径 | 对应子功能 |
|----------|-----------|
| `client/src/pages/novels/autoDirector/`（9 文件） | FR-1 |
| `client/src/lib/autoDirectorPauseNotifications.ts` | FR-2 |
| `server/src/services/novel/state/PendingReviewAutoPromotionService.ts` | FR-3 |
| `server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts` | FR-4 |

## 4. 验收标准

详见工作副本 `REQ-7060-auto-director-enhance.md` 第 4 节。

## 5. 冻结日期

2026-07-14（需求创建日冻结）
