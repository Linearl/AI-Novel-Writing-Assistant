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
  - [ ] 创建 Skill 目录结构
  - [ ] 编写 SKILL.md 主入口
  - [ ] 编写 AGENTS.md 协作规范
  - [ ] 编写 README.md 项目说明
  - [ ] 创建 requirements.txt

### T1.2 蒸馏小说创建流程
- **优先级**：P0
- **预估**：3 天
- **依赖**：T1.1
- **DoD**：
  - [ ] 创建 references/novel-brief.md
  - [ ] 创建 references/story-bible.md（如果需要）
  - [ ] 创建 templates/novel-brief.template.md
  - [ ] 创建 examples/example-novel/novel-brief.md

### T1.3 蒸馏角色准备
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.1
- **DoD**：
  - [ ] 创建 references/character-preparation.md
  - [ ] 创建 templates/character-profile.template.md
  - [ ] 创建 examples/example-novel/characters/

### T1.4 蒸馏卷级规划
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.2, T1.3
- **DoD**：
  - [ ] 创建 references/story-and-volume-planning.md
  - [ ] 创建 templates/volume-plan.template.md
  - [ ] 创建 examples/example-novel/volumes/

### T1.5 蒸馏章节生产
- **优先级**：P0
- **预估**：3 天
- **依赖**：T1.4
- **DoD**：
  - [ ] 创建 references/chapter-production.md
  - [ ] 创建 templates/chapter-contract.template.md
  - [ ] 创建 examples/example-novel/chapters/

### T1.6 蒸馏连续性管理
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.5
- **DoD**：
  - [ ] 创建 references/continuity-management.md
  - [ ] 创建 scripts/continuity_store.py
  - [ ] 创建 templates/continuity-data.template.yaml

### T1.7 蒸馏质量检查
- **优先级**：P0
- **预估**：2 天
- **依赖**：T1.5
- **DoD**：
  - [ ] 创建 references/quality-and-repair.md
  - [ ] 创建 scripts/quality_checker.py
  - [ ] 创建 templates/quality-report.template.md

## 阶段二：增强能力（2-3 周）

### T2.1 蒸馏 Auto-Director
- **优先级**：P1
- **预估**：3 天
- **依赖**：阶段一完成
- **DoD**：
  - [ ] 创建 references/auto-director.md
  - [ ] 创建 scripts/novelctl.py
  - [ ] 创建 templates/novel-state.template.yaml

### T2.2 蒸馏拆书分析
- **优先级**：P2
- **预估**：2 天
- **依赖**：阶段一完成
- **DoD**：
  - [ ] 创建 references/book-analysis.md
  - [ ] 创建 scripts/book_analysis.py
  - [ ] 创建 examples/example-analysis/

### T2.3 蒸馏写法资产
- **优先级**：P2
- **预估**：2 天
- **依赖**：阶段一完成
- **DoD**：
  - [ ] 创建 references/writing-techniques.md
  - [ ] 创建 scripts/writing_extractor.py
  - [ ] 创建 templates/writing-technique.template.md

### T2.4 蒸馏 Token 用量
- **优先级**：P2
- **预估**：1 天
- **依赖**：阶段一完成
- **DoD**：
  - [ ] 创建 references/token-usage.md
  - [ ] 创建 scripts/token_usage.py

### T2.5 蒸馏 TXT 导入导出
- **优先级**：P3
- **预估**：1 天
- **依赖**：阶段一完成
- **DoD**：
  - [ ] 创建 scripts/export_novel_txt.py
  - [ ] 创建 templates/export.template.txt

## 阶段三：测试与验证（1-2 周）

### T3.1 单元测试
- **优先级**：P1
- **预估**：2 天
- **依赖**：阶段二完成
- **DoD**：
  - [ ] 编写 Python 脚本单元测试
  - [ ] 覆盖率 >= 80%

### T3.2 集成测试
- **优先级**：P1
- **预估**：2 天
- **依赖**：T3.1
- **DoD**：
  - [ ] 端到端流程测试
  - [ ] 恢复测试

### T3.3 用户验收测试
- **优先级**：P0
- **预估**：2 天
- **依赖**：T3.2
- **DoD**：
  - [ ] 用示例小说验证完整流程
  - [ ] 与上游 Skill 对比测试
  - [ ] 收集用户反馈

### T3.4 文档完善
- **优先级**：P1
- **预估**：1 天
- **依赖**：T3.3
- **DoD**：
  - [ ] 完善 README.md
  - [ ] 编写使用指南
  - [ ] 编写示例文档

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
