---
description: "REQ-7028 Director 事件系统收敛 — 方案设计"
---

# REQ-7028 方案设计

## 1. 方案概述

对 Director 子系统的事件基础设施进行收敛：明确两套事件系统的职责分工 → State 文件去重 → takeover 文件收敛 → 建立统一事件出口。

### 1.1 设计目标

1. 消除两套事件系统的职责模糊
2. State 文件单一来源
3. Takeover 逻辑集中管理
4. 不破坏现有 Director 功能

### 1.2 关键决策

1. **保留两套事件系统**：EventBus 和 DirectorEventProjection 服务于不同层面，合并会导致耦合
2. **保留 director/state/ 子目录**：子目录版本是后续版本，根目录是旧版本
3. **新建 DirectorEventBridge**：桥接层而非合并，保持各自独立性

### 1.3 不在范围

- 不重构 Director 非 event/state 文件
- 不修改 EventBus 事件类型

---

## 2. 架构变更

### 2.1 变更前（当前状态）

```
EventBus (全局广播)          DirectorEventProjection (内部投影)
      │                              │
      ├── 7 种事件类型                ├── DirectorEventProjectionHelpers.ts (581行)
      │                              ├── 根目录 StateStore (旧版)
      │                              ├── 根目录 StateCommitter (旧版)
      │                              ├── 根目录 StateReader (旧版)
      │                              ├── state/StateStore (新版)
      │                              ├── state/StateCommitter (新版)
      │                              └── state/StateReader (新版)
      │
      └── runtime/ (36 文件, takeover 分散 9 文件)
```

### 2.2 变更后（目标状态）

```
EventBus (全局广播)          DirectorEventProjection (内部投影)
      │                              │
      ├── 7 种事件类型                ├── DirectorEventBridge (桥接层)
      │        ▲                      │        │
      │        └──────── 升级 ────────┘        │
      │                              ├── DirectorEventProjectionHelpers.ts (精简)
      │                              └── state/ (StateStore, StateCommitter, StateReader)

runtime/
├── takeover-index.ts    (统一入口, 1 文件)
├── takeover-read.ts     (读取, 1 文件)
├── takeover-write.ts    (写入, 1 文件)
└── takeover-validate.ts (校验, 1 文件)
```

---

## 3. 实施阶段

### Phase 1: 职责映射与文档化

在 EventBus 和 DirectorEventProjectionService 的类/接口上添加 JSDoc 注释，明确各自职责。

### Phase 2: State 文件去重

1. 审计根目录 State 文件的所有 import 引用
2. 将引用从根目录路径改为 `director/state/` 子目录路径
3. 删除根目录旧版 State 文件
4. typecheck 验证

### Phase 3: Takeover 收敛

1. 审计 9 个 takeover 文件的依赖和功能
2. 按读/写/校验三级聚类
3. 合并为 4 个文件
4. 更新所有调用方 import

### Phase 4: EventBridge 建立

1. 创建 `DirectorEventBridge.ts`
2. 定义 Director 内部事件类型到 EventBus 事件类型的映射
3. 提供 `emitAndMaybeBroadcast()` 统一出口

### Phase 5: 验证

typecheck + test + director 专项测试。

---

## 4. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| State 去重遗漏引用 | 中 | 高 | grep 全仓搜索后逐步迁移 |
| Takeover 收敛引入 bug | 中 | 中 | 收敛前后运行专项测试对比 |
| EventBridge 过度设计 | 低 | 低 | 先最小实现，逐步扩展 |

---

## 5. 验证方案

1. State 去重后：grep `from.*StateStore` 确认全部指向 `director/state/`
2. Takeover 收敛后：文件计数从 9 → 4
3. typecheck + test + director 专项测试全绿
