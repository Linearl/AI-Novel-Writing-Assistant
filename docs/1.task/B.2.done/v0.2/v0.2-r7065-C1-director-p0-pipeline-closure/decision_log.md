---
description: "REQ-7065 导演引擎 P0 Pipeline 闭环收口 — 决策日志"
update_time: 2026-07-14
---

## 决策记录

### D1: 是否一次性删除旧 adapter

- **决策**：渐进降级（标记 deprecated → 验证 → 清理）
- **理由**：旧 adapter 承载了多个 phase service 的执行路径，一次性删除风险高。先让核心四个 StepModule 走新路径，adapter 保留兼容。
- **日期**：2026-07-14

### D2: DIRECTOR_PROGRESS 是否直接删除

- **决策**：保留为 fallback，不删除
- **理由**：旧 UI（任务中心）仍在消费 DIRECTOR_PROGRESS 格式，直接删除会导致旧 UI 进度显示为空。策略是优先消费 inspectProgress，DIRECTOR_PROGRESS 作为后备。
- **日期**：2026-07-14

### D3: Workspace Analyzer 与 Artifact Ledger 集成方式

- **决策**：Workspace Analyzer 调用 Artifact Ledger 的分析方法，不反向依赖
- **理由**：Artifact Ledger 是真相层，应保持纯粹的数据访问+分析职责。Workspace Analyzer 作为消费方编排分析流程。
- **日期**：2026-07-14

### D4: Delta 写入粒度

- **决策**：以 StepRun / Event / Artifact 为单位增量追加，不按字段级 delta
- **理由**：字段级 delta 实现复杂且收益有限。记录级增量已能解决全量序列化的性能问题（从 O(N) 降为 O(1)）。
- **日期**：2026-07-14

### D5: 是否新增数据库 migration

- **决策**：不新增
- **理由**：DirectorRun/DirectorStepRun/DirectorEvent/DirectorArtifact 表已足够支撑增量写入，无需 schema 变更。
- **日期**：2026-07-14
