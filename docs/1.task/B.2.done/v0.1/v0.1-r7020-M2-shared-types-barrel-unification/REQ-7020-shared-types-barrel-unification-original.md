---
description: "REQ-7020 共享类型 Barrel 统一导出——需求文档（冻结副本）"
update_time: 2026-07-10
---

# REQ-7020 共享类型 Barrel 统一导出（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7020 |
| 优先级 | P0 |
| 来源 | 架构诊断报告 2026-07-10 第3条发现 |

---

## 核心目标

1. 统一两个 barrel 文件，`shared/index.ts` 包含所有 `shared/types/index.ts` 中的模块
2. 拆分 `chapterRuntime.ts` (1,044行) 为按子域文件
3. 审计全项目 import 语句，将 `@ai-novel/shared/types/X` 深层导入替换为 `@ai-novel/shared`
4. 为 shared 包添加基础 zod schema 验证测试

## 受影响文件

- `shared/index.ts` — 扩展导出
- `shared/types/index.ts` — 保持同步
- `shared/types/chapterRuntime.ts` — 拆分为 3-5 个子文件
- 全项目约 500 个 import 语句 — 替换深层导入

## 验收标准

- `shared/index.ts` 导出 >= `shared/types/index.ts` 导出
- `chapterRuntime.ts` 已拆分
- 全项目无深层导入
- typecheck + build + test 通过

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
