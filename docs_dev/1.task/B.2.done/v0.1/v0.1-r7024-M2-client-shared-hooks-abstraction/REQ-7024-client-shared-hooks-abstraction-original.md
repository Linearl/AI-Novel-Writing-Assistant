---
description: "REQ-7024 客户端共享 Hooks 抽象与大文件拆分 — 原始冻结副本"
---

# REQ-7024 客户端共享 Hooks 抽象与大文件拆分（原始冻结副本）

> 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7024 |
| 优先级 | P2 |
| 来源 | 架构诊断报告 2026-07-10 第7条发现 |
| 关联需求 | 无 |

---

## 核心目标

1. 创建 `hooks/useApiMutation.ts` — 封装 `useMutation` + toast + invalidate 模式
2. 创建 `hooks/useApiQuery.ts`（如需要）— 封装带错误处理的 `useQuery` 默认参数
3. 拆分 `NovelWorkspaceRail.tsx` 为 layout shell + data provider + navigation controller（每个 <300 行）
4. 拆分 3 个 >800 行文件到合理大小（目标 <600 行）
5. 将至少 20 处 inline mutation 模式替换为 `useApiMutation`

## 受影响文件

| 文件 | 当前行数 | 目标行数 | 操作 |
|------|----------|----------|------|
| `NovelWorkspaceRail.tsx` | 678 | 3 文件各 <300 | 拆分 |
| `PromptSlotPanel.tsx` | 843 | <600 | 拆分 |
| `WorldVisualizationBoard.tsx` | 837 | <600 | 拆分 |
| `WritingFormulaPage.tsx` | 811 | <600 | 拆分 |
| ~20 处 inline mutation | — | — | 替换为 useApiMutation |

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
