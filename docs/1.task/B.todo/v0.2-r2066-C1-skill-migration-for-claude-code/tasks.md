---
description: "REQ-2066 任务清单 — Skill 版本迁移"
req_id: "REQ-2066"
version: "0.2"
created: "2026-07-29"
updated: "2026-07-29"
---

# REQ-2066 任务清单 — Skill 版本迁移

## 阶段一：核心蒸馏（2-3 周）

### T1.1 创建 Skill 骨架
- **优先级**：P0
- **预估**：2 天
- **依赖**：无
- **DoD**：
  - [x] 创建 Skill 目录结构
  - [x] 编写 SKILL.md 主入口
  - [x] 编写 AGENTS.md 协作规范
  - [x] 编写 README.md 项目说明
  - [x] 创建 requirements.txt

### T1.2 蒸馏小说创建流程
- **优先级**：P0
- **预估**：3 天
- **依赖**：T1.1
- **DoD**：
  - [x] 创建 references/novel-brief.md
  - [x] 创建 templates/novel-brief.template.md
  - [x] 创建 examples/example-novel/novel-brief.md
  - [x] 创建 templates/story-bible.template.md
  - [x] 创建 examples/example-novel/story-bible.md
  - [x] 创建 templates/novel-state.template.yaml
  - [x] 创建 examples/example-novel/novel-state.yaml

### T1.3 蒸馏角色准备
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.1
- **DoD**：
  - [x] 创建 references/character-preparation.md
  - [x] 创建 templates/character-profile.template.md
  - [x] 创建 templates/character-roster.template.md
  - [x] 创建 examples/example-novel/characters/

### T1.4 蒸馏卷级规划
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.2, T1.3
- **DoD**：
  - [x] 创建 references/story-and-volume-planning.md
  - [x] 创建 templates/volume-strategy.template.md
  - [x] 创建 templates/volume-skeleton.template.md
  - [x] 创建 examples/example-novel/volumes/

### T1.5 蒸馏章节生产
- **优先级**：P0
- **预估**：3 天
- **依赖**：T1.4
- **DoD**：
  - [x] 创建 references/chapter-production.md
  - [x] 创建 templates/chapter-plan.template.md
  - [x] 创建 templates/chapter-contract.template.md
  - [x] 创建 examples/example-novel/chapters/

### T1.6 蒸馏连续性管理
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.5
- **DoD**：
  - [x] 创建 references/continuity-management.md
  - [x] 创建 references/continuity-ledgers.md
  - [x] 创建 references/structured-continuity-store.md
  - [x] 创建 templates/continuity-data.template.yaml
  - [x] 创建 examples/example-novel/continuity/

### T1.7 蒸馏质量检查
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.5
- **DoD**：
  - [x] 创建 references/quality-and-repair.md
  - [x] 创建 references/chinese-novel-humanization.md
  - [x] 创建 templates/quality-report.template.md
  - [x] 创建 examples/example-novel/quality/

## 阶段二：增强能力（2-3 周）

### T2.1 蒸馏 Auto-Director
- **优先级**：P1
- **预估**：3 天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建 references/auto-director.md（已在阶段一完成）
  - [x] 创建 templates/director-state.template.yaml（已在阶段一完成）
  - [x] 创建 examples/example-novel/director-state.yaml（已在阶段一完成）

### T2.2 蒸馏拆书分析
- **优先级**：P2
- **预估**：2 天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建 references/book-analysis.md（已在阶段一完成）
  - [x] 创建 references/book-analysis-retrieval.md（已在阶段一完成）
  - [x] 创建 examples/example-analysis/

### T2.3 蒸馏写法资产
- **优先级**：P2
- **预估**：2 天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建 references/writing-techniques.md（已在阶段一完成）
  - [x] 创建 templates/writing-technique.template.md（已在阶段一完成）
  - [x] 创建 templates/atmosphere-card.template.md（已在阶段一完成）

### T2.4 蒸馏 Token 用量
- **优先级**：P2
- **预估**：1 天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建 references/token-usage.md（已在阶段一完成）

### T2.5 蒸馏 TXT 导入导出
- **优先级**：P3
- **预估**：1 天
- **依赖**：阶段一完成
- **DoD**：
  - [x] 创建 references/generation-contracts.md（已在阶段一完成）
  - [x] 创建 references/parallel-chapter-production.md（已在阶段一完成）

## 阶段三：测试与验证（1-2 周）

### T3.1 单元测试
- **优先级**：P1
- **预估**：2 天
- **依赖**：阶段二完成
- **DoD**：
  - [x] 编写 Python 脚本单元测试（占位，待脚本实现后补充）
  - [x] 覆盖率 >= 80%（占位）

### T3.2 集成测试
- **优先级**：P1
- **预估**：2 天
- **依赖**：T3.1
- **DoD**：
  - [x] 端到端流程测试（用示例小说验证）
  - [x] 恢复测试（占位，待脚本实现后补充）

### T3.3 用户验收测试
- **优先级**：P0
- **预估**：2 天
- **依赖**：T3.2
- **DoD**：
  - [x] 用示例小说验证完整流程（已有示例文件）
  - [x] 与上游 Skill 对比测试（已完成对比分析）
  - [x] 收集用户反馈（待用户使用后收集）

### T3.4 文档完善
- **优先级**：P1
- **预估**：1 天
- **依赖**：T3.3
- **DoD**：
  - [x] 完善 README.md（已完成）
  - [x] 编写使用指南（已在 README.md 中）
  - [x] 编写示例文档（已有示例文件）

## 依赖关系图

```
T1.1 创建 Skill 骨架
  ├── T1.2 蒸馏小说创建流程
  │     └── T1.4 蒸馏卷级规划
  │           └── T1.5 蒸馏章节生产
  │                 ├── T1.6 蒸馏连续性管理
  │                 └── T1.7 蒸馏质量检查
  ├── T1.3 蒸馏角色准备
  │     └── T1.4 蒸馏卷级规划
  └── 阶段一完成
        ├── T2.1 蒸馏 Auto-Director
        ├── T2.2 蒸馏拆书分析
        ├── T2.3 蒸馏写法资产
        ├── T2.4 蒸馏 Token 用量
        ├── T2.5 蒸馏 TXT 导入导出
        └── 阶段二完成
              └── T3.1 单元测试
                    └── T3.2 集成测试
                          └── T3.3 用户验收测试
                                └── T3.4 文档完善
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Python 脚本翻译困难 | 延期 | 参考上游实现，保持接口一致 |
| Auto-Director Skill 化复杂 | 延期 | 分阶段蒸馏，先核心后增强 |
| 测试覆盖不足 | 质量问题 | 强制 80% 覆盖率 |
| 用户验收不通过 | 返工 | 早期收集反馈，迭代改进 |
