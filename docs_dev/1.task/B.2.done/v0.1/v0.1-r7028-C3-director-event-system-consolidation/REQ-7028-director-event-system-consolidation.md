---
description: "REQ-7028 Director 事件系统收敛"
---

# REQ-7028 Director 事件系统收敛

> 状态：⏳ 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7028 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第11条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

Director 子系统（124 文件）有以下架构问题：

### 1.1 两套事件系统并行

| 系统 | 位置 | 事件类型数 | 职责 |
|------|------|-----------|------|
| EventBus | `events/EventBus.ts` | 7 | 全局事件广播 |
| DirectorEventProjection | `director/` 内 | — | Director 内部状态投影 |

两套系统无明确桥接，各自独立运行。开发者不清楚何时用哪个。

### 1.2 Director State 文件重复

Director 根目录存在 `StateStore`、`StateCommitter`、`StateReader` 文件，同时 `director/state/` 子目录也有一份。两份版本功能重叠，维护成本翻倍。

### 1.3 Takeover 文件分散

runtime/ 有 36 个文件，takeover 逻辑分散在 9 个文件中，缺乏统一入口。

不改的后果：事件系统持续分化，新功能可能选择错误的事件通道，state 文件双版本最终产生行为分歧。

---

## 2. 目标与范围

### 2.1 目标

1. 明确 EventBus 与 Director 投影的职责分工——EventBus 用于跨模块广播，Director 投影用于内部状态持久化
2. 去重 director state 文件：保留 `director/state/` 子目录，移除根目录下的旧版本
3. 制定 takeover 9→4 文件收敛计划
4. 建立 Director 内部事件的统一出口

### 2.2 In Scope

**后端**：
- `server/src/events/EventBus.ts` — 明确职责边界（添加文档/接口注释）
- `server/src/services/novel/director/DirectorEventProjectionService.ts` — 明确职责边界
- `server/src/services/novel/director/DirectorEventProjectionHelpers.ts` — 收敛/拆分（581行）
- `server/src/services/novel/director/StateStore.ts` — 移除根目录旧版本
- `server/src/services/novel/director/StateCommitter.ts` — 移除根目录旧版本
- `server/src/services/novel/director/StateReader.ts` — 移除根目录旧版本
- `server/src/runtime/` — takeover 文件收敛（9→4）

### 2.3 Out of Scope

- 不修改 EventBus 的跨模块事件类型定义
- 不重构 Director 的非 state/event 文件
- 不新增事件类型

---

## 3. 需求详情

### 3.1 事件系统职责分工

WHEN 需要广播事件到多个模块，THE SYSTEM SHALL 使用 `EventBus`。
WHEN 需要持久化 Director 内部状态变化，THE SYSTEM SHALL 使用 `DirectorEventProjectionService`。

在 EventBus 和 DirectorEventProjectionService 之间建立明确的类型桥接层（`DirectorEventBridge`），使得 Director 内部事件可以按需升级为全局事件。

### 3.2 State 文件去重

WHEN 存在根目录和 state/ 子目录两份 state 文件，THE SYSTEM SHALL 审计所有 import 引用 → 将根目录版本的调用方迁移到 `director/state/` → 移除根目录旧版本。

### 3.3 Takeover 收敛

WHEN takeover 逻辑分散在 9 个文件中，THE SYSTEM SHALL 按功能聚类：
- `takeover-read.ts` — 读取当前状态
- `takeover-write.ts` — 写入/更新状态
- `takeover-validate.ts` — 校验 takeover 条件
- `takeover-index.ts` — 统一入口 facade

### 3.4 Director 内部事件统一出口

WHEN Director 内部产生事件，THE SYSTEM SHALL 通过 `DirectorEventEmitter` 统一发出，不再各自直接操作 EventBus 或 ProjectionService。

---

## 4. 验收标准

- [ ] EventBus 和 DirectorEventProjectionService 的职责边界有明确文档注释
- [ ] 根目录 StateStore/StateCommitter/StateReader 已移除，所有调用方指向 `director/state/`
- [ ] takeover 文件从 9 个减少到 4 个
- [ ] DirectorEventBridge 建立，支持内部事件升级为全局事件
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] `pnpm --filter @ai-novel/server test:director` 专项测试通过（如有）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| State 文件去重遗漏引用 | grep 全仓搜索所有 import 路径后逐一迁移 |
| Takeover 收敛破坏运行时行为 | 收敛前后运行 director 专项测试对比 |
| EventBridge 引入额外复杂度 | 先建桥接，确认稳定后再推广使用 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
