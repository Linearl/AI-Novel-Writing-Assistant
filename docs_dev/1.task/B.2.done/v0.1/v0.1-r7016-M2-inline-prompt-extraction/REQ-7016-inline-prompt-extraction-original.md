---
description: "REQ-7016 内联 Prompt 提取与模板引擎 — 原始冻结副本"
---

# REQ-7016 内联 Prompt 提取与模板引擎（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7016 |
| 优先级 | P2 |
| 来源 | 2026-07-09 内联 Prompt 诊断报告 |
| 关联需求 | 无 |

---

## 核心目标

1. 开发通用 Prompt 模板引擎（YAML 加载 + `{variable}` 渲染）
2. 提取 3 处符合条件的内联 prompt 为 YAML
3. 改造原调用方使用模板引擎

## 提取标准

- 纯静态（无 `${}` 模板变量）
- 中文字符 > 100 个 OR 行数 > 10 行

## 待提取清单

| # | 文件 | 行数 | 中文字符 |
|---|------|------|---------|
| 1 | `novelCoreCharacterService.ts` systemPrompt | 27 | ~500 |
| 2 | `structuredInvokeRepair.ts` repairSystem | 13 | ~400 |
| 3 | `characterPreparationSupplemental.ts` 角色微调 systemPrompt | 9 | ~120 |

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 创建 | 冻结副本 |
