---
description: "P2 安全问题修复任务包 — 基于 2026-07-01 全量代码审计"
status: in_progress
priority: p2
created: 2026-07-01
updated: 2026-07-01
---

# P2 安全问题修复

> 任务编号：REQ-7009
> 复杂度：complex
> 来源：2026-07-01-全量代码审计-full

## 概述

修复审计报告中 4 个 P2 级安全问题，消除潜在的安全风险。

## 问题清单

| ID | 问题 | 文件 | 影响 |
|----|------|------|------|
| SEC-003 | 文件路径遍历风险 | ComicCharacterImageService.ts, DramaShotKeyframeService.ts | 攻击者可通过 ../ 读取任意文件 |
| SEC-004 | 无 CSRF 保护 | app.ts | 攻击者可诱导已认证用户发起状态变更请求 |
| SEC-005 | 错误响应泄露内部信息 | errorHandler.ts | 攻击者可获取文件路径、数据库结构等 |
| SEC-006 | Prisma raw query 需审计参数化 | NovelWorldSyncService.ts 等 | 潜在 SQL 注入风险 |

## 修复方案

详见 [REQ-7009.md](./REQ-7009.md) 和 [design.md](./design.md)

## 验证标准

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 路径遍历测试用例通过
- [ ] 错误响应不包含内部信息
- [ ] 所有 raw query 参数化验证

## 状态

- [x] 需求分析
- [x] 设计文档
- [ ] 代码实现
- [ ] 测试验证
- [ ] 完成归档
