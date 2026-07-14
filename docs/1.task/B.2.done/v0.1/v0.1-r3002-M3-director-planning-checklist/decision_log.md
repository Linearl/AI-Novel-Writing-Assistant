---
description: "REQ-3002 决策日志"
---

# REQ-3002 决策日志

| # | 决策点 | 选择 | 理由 |
| --- | --- | --- | --- |
| D1 | Checklist 位置 | 放在 DirectorRuntimeProjectionCard 内部，visibleRiskBadges 区域下方 | 与现有 Badge 逻辑紧耦合，放在同一组件内维护成本最低；在 ProgressPanel 层级放会增加 props 传递 |
| D2 | 展开/折叠默认状态 | 默认折叠 | 避免信息过载，用户需要时再展开；折叠态已有摘要信息"缺少 N 项" |
| D3 | 是否替换 Risk Badge | 替换"缺少规划资源"Badge 为 Checklist | Badge 和 Checklist 信息重复；保留 Badge 会显得冗余 |
| D4 | artifactType 中文映射位置 | 前端常量 | 映射表是纯 UI 展示逻辑，不需要后端感知；避免后端多一次序列化 |
| D5 | 降级策略 | missingArtifactTypes 缺失时保留原有 Badge | 向后兼容旧版后端，零破坏性 |
