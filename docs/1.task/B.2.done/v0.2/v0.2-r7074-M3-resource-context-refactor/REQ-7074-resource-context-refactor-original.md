---
description: "REQ-7074 资源上下文重构——需求文档"
---

# REQ-7074 资源上下文重构

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7074 |
| 优先级 | P3 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | REQ-7069 的 FR-7，上游参考 `ResourceContextBuilder` 统一接口 |

---

## 1. 背景与问题

章节生成的上下文组装逻辑已集中化——`GenerationContextAssembler.assemble()` 是单一入口。但上下文在传递给 LLM 前被拆解为分层上下文块（`chapterLayeredContext.ts`、`chapterLayeredContextBlocks.ts`、`chapterLayeredContextHelpers.ts`、`chapterLayeredContextShared.ts` 共 4 个文件），职责碎片化：

- 相同的上下文组装逻辑在不同 helper 中重复出现
- 新增加一个上下文字段需要在多个文件中分别修改
- 文件名暗示的"分层"边界在实际代码中已经模糊

## 2. 目标与范围

### 2.1 目标

1. 将 4 个分层上下文文件收敛为统一的结构化接口
2. 使 REQ-7075（待审上下文注入）只需在一个位置新增字段

### 2.2 In Scope

- 设计统一的上下文块构建接口
- 合并 `chapterLayeredContext.ts` + `chapterLayeredContextBlocks.ts` + `chapterLayeredContextHelpers.ts` → 保持调用方接口不变
- 删除不再使用的共享代码路径

### 2.3 Out of Scope

- 新增上下文字段（由 REQ-7075 在本包完成后处理）
- `GenerationContextAssembler.assemble()` 本身的逻辑变更（组装入口不变）
- 上下文性能优化（如缓存策略）

---

## 3. 需求详情

当前文件结构及重构方向：

| 当前文件 | 状态 | 重构后 |
|----------|------|--------|
| `chapterLayeredContext.ts` | 主入口 | 保留为 facade，对外接口不变 |
| `chapterLayeredContextBlocks.ts` | 碎片化块定义 | 并入 helpers |
| `chapterLayeredContextHelpers.ts` | 核心构建逻辑 | 保留并扩充，吸纳 blocks |
| `chapterLayeredContextShared.ts` | 共享类型+工具 | 拆分：类型并入 types 文件，工具并入 helpers |

目标：4 文件缩减为 2-3 文件，调用方（如 `chapterWriter.prompts.ts`）零改动。

---

## 4. 验收标准

- [ ] 调用方（章节写作 prompt、审校 prompt 等）接口不变
- [ ] 新增一个上下文字段只需修改 1 处（验证：模拟新增一个字段，不应超过 2 个文件变更）
- [ ] 删除的代码路径无害（无隐藏调用方）
- [ ] typecheck 通过
- [ ] 现有章节生成管道功能不退化（全文生成端到端走通）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 重构破坏隐藏的调用链 | grep 全仓库确认所有 imports |
| 4 文件合并后单文件过长（>700 行） | 如果合并后超过 700 行，保留 2 文件结构 |

---

## 6. 关联与边界

- 前置条件：无。本包可独立执行
- 为 REQ-7075（FR-6 待审上下文注入）提供干净的扩展点
- 影响的调用链：ChapterStreamGenerationOrchestrator → chapterLayeredContext → chapterWriter.prompts

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
