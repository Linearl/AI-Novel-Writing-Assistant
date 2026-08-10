---
description: "REQ-2067 任务清单 — 补齐 Skill Python 脚本与核心能力"
req_id: "REQ-2067"
version: "0.2"
created: "2026-07-29"
updated: "2026-07-29"
---

# REQ-2067 任务清单

## 阶段一：核心脚本（3-5天）

### T1.1 实现 novelctl.py 核心框架
- **优先级**：P0
- **预估**：2天
- **依赖**：无
- **DoD**：
  - [x] 创建脚本框架和命令解析
  - [x] 实现 `init` 命令（工作区初始化）
  - [x] 实现 `status` 命令（状态查看）
  - [x] 实现 `validate` 命令（schema 校验）
  - [x] 编写单元测试

### T1.2 实现 novelctl.py 高级命令
- **优先级**：P0
- **预估**：2天
- **依赖**：T1.1
- **DoD**：
  - [x] 实现 `recover` 命令（恢复检查点）
  - [x] 实现 `context` 命令（上下文组装）
  - [x] 实现 `step` 命令（步骤管理）
  - [x] 编写单元测试

### T1.3 实现 continuity_store.py
- **优先级**：P0
- **预估**：2天
- **依赖**：T1.1
- **DoD**：
  - [x] 实现 YAML 校验（facts, payoffs, resources, character-state）
  - [x] 实现索引构建（JSONL → SQLite）
  - [x] 实现索引重建（从 YAML 恢复）
  - [x] 实现增量更新
  - [x] 编写单元测试

## 阶段二：跨书资产（3-5天）

### T2.1 实现 asset_graph.py 核心框架
- **优先级**：P1
- **预估**：2天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建脚本框架和命令解析
  - [x] 实现 `init` 命令（资产库初始化）
  - [x] 实现 `publish` 命令（发布资产）
  - [x] 实现 `validate` 命令（资产校验）
  - [x] 编写单元测试

### T2.2 实现 asset_graph.py 同步与图谱
- **优先级**：P1
- **预估**：3天
- **依赖**：T2.1
- **DoD**：
  - [x] 实现 `import` 命令（导入资产）
  - [x] 实现 `reconcile` 命令（冲突协调）
  - [x] 实现 `build` 命令（构建图谱）
  - [x] 实现 `neighbors` 命令（邻域查询）
  - [x] 实现 `context` 命令（上下文查询）
  - [x] 实现 `timeline` 命令（时间线）
  - [x] 实现 `impact` 命令（影响分析）
  - [x] 编写单元测试

### T2.3 补充 cross-book-asset-graph.md 文档
- **优先级**：P1
- **预估**：1天
- **依赖**：T2.2
- **DoD**：
  - [x] 参考上游文档重写
  - [x] 添加使用示例
  - [x] 添加 API 参考

## 阶段三：分析检索（2-3天）

### T3.1 实现 analysis_retrieval.py
- **优先级**：P1
- **预估**：3天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 实现分段缓存（segment cache）
  - [x] 实现增量分析（incremental analysis）
  - [x] 实现检索接口（retrieve）
  - [x] 实现覆盖地图（coverage map）
  - [x] 编写单元测试

## 阶段四：辅助脚本（2-3天）

### T4.1 实现 export_novel_txt.py
- **优先级**：P2
- **预估**：1天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 实现章节导出
  - [x] 实现全书导出
  - [x] 支持格式选项
  - [x] 编写单元测试

### T4.2 实现 token_usage.py
- **优先级**：P2
- **预估**：1天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 实现 Token 统计
  - [x] 实现报告生成
  - [x] 实现趋势分析
  - [x] 编写单元测试

### T4.3 实现辅助脚本
- **优先级**：P3
- **预估**：1天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 实现 check_continuity_workspace.py
  - [x] 实现 sync_skill_mirror.py
  - [x] 实现 trend_snapshot.py
  - [x] 编写单元测试

## 阶段五：集成验证（2-3天）

### T5.1 集成测试
- **优先级**：P0
- **预估**：2天
- **依赖**：阶段四完成
- **DoD**：
  - [ ] 端到端工作区管理测试
  - [ ] 端到端连续性管理测试
  - [ ] 端到端跨书资产管理测试
  - [ ] 性能测试

### T5.2 文档完善
- **优先级**：P1
- **预估**：1天
- **依赖**：T5.1
- **DoD**：
  - [ ] 更新 README.md
  - [ ] 编写使用指南
  - [ ] 编写示例文档

## 依赖关系图

```
阶段一：核心脚本
├── T1.1 novelctl.py 核心框架
│     └── T1.2 novelctl.py 高级命令
├── T1.3 continuity_store.py
└── 阶段一完成
      ├── T2.1 asset_graph.py 核心框架
      │     └── T2.2 asset_graph.py 同步与图谱
      │           └── T2.3 补充文档
      ├── T3.1 analysis_retrieval.py
      ├── T4.1 export_novel_txt.py
      ├── T4.2 token_usage.py
      └── T4.3 辅助脚本
            └── 阶段四完成
                  └── T5.1 集成测试
                        └── T5.2 文档完善
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 上游脚本复杂 | 延期 | 先实现核心命令，迭代完善 |
| YAML schema 不兼容 | 返工 | 参考上游，保持兼容 |
| 测试覆盖不足 | 质量问题 | 强制 TDD |
| 性能问题 | 用户体验 | 使用缓存和惰性加载 |
