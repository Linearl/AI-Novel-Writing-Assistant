---
description: "REQ-7034 Novel Application Services 门面收缩 — 原始冻结副本"
---

# REQ-7034 Novel Application Services 门面收缩（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7034 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第13条发现 |
| 关联需求 | 无 |

---

## 核心目标

1. 审计所有 130 方法，分类为"纯委托"和"跨服务协调"
2. 收缩门面：仅保留跨服务协调方法（如 `createNovelWithWorld`），单服务方法由调用方直接使用子服务
3. 更新路由注册和所有调用方
4. 目标：门面从 130 方法缩减到 20-30 个，`NovelApplicationServices.ts` <200 行

## 现状

- NovelApplicationContracts.ts 定义 ~130 方法接口
- NovelApplicationServices.ts 694 行，~90% 是纯委托（1 行 `return this.subService.method(params)`）

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
