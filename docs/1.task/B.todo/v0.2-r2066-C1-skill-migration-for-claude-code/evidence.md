# 证据材料 — REQ-2066

## 1. 需求分析证据

### 1.1 诊断报告

**文件**：[2026-07-29-ani-book-skill-migration-diagnosis.md](../../../3.analysis/diagnosis/2026-07-29-ani-book-skill-migration-diagnosis.md)

**结论**：
- 可以做 Skill 版本，且我们的版本会更完整
- 上游 Skill 的核心能力：从灵感到章节、连续性管理、Token 用量
- 我们的独特优势：Auto-Director、质量检查、写法资产
- 建议分阶段蒸馏

### 1.2 上游 Skill 分析

**文件**：`temp/ani-book-skill-main.zip`（已解压到 `temp/ani-book-skill-analysis/`）

**核心发现**：
- 上游 Skill 使用 Codex + Python 脚本模式
- 22 个 reference 文档定义能力契约
- 9 个 Python 脚本处理确定性状态
- Markdown/YAML 作为权威数据源

## 2. 架构设计证据

### 2.1 目标架构

```text
Claude（或 Codex）：理解故事、规划、写作、审校、判断
  ↓
Skill / 合同：定义每个阶段必须消费什么、交付什么、如何验收
  ↓
Python 脚本：校验状态、保护冲突、构建索引、导出
  ↓
Markdown / YAML：作者可编辑的唯一权威
```

### 2.2 文件结构

```text
ai-novel-skill/
├── SKILL.md                    # Skill 主入口
├── AGENTS.md                   # AI 协作规范
├── README.md                   # 项目说明
├── requirements.txt            # Python 依赖
├── references/                 # 能力契约文档（12-15 个）
├── scripts/                    # Python 脚本（7-10 个）
├── templates/                  # 模板文件
└── examples/                   # 示例
```

## 3. 任务分解证据

### 3.1 阶段划分

| 阶段 | 内容 | 工期 | 依赖 |
|------|------|------|------|
| 阶段一 | 核心蒸馏 | 2-3 周 | 无 |
| 阶段二 | 增强能力 | 2-3 周 | 阶段一完成 |
| 阶段三 | 测试验证 | 1-2 周 | 阶段二完成 |

### 3.2 关键路径

```
T1.1 创建 Skill 骨架
  → T1.2 蒸馏小说创建流程
    → T1.4 蒸馏卷级规划
      → T1.5 蒸馏章节生产
        → T1.6 蒸馏连续性管理
        → T1.7 蒸馏质量检查
  → T1.3 蒸馏角色准备
    → T1.4 蒸馏卷级规划
```

## 4. 风险评估证据

### 4.1 高风险项

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| Python 脚本翻译困难 | 中 | 高 | 参考上游实现，保持接口一致 |
| Auto-Director Skill 化复杂 | 高 | 高 | 分阶段蒸馏，先核心后增强 |

### 4.2 中风险项

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 测试覆盖不足 | 中 | 中 | 强制 80% 覆盖率 |
| 用户验收不通过 | 低 | 高 | 早期收集反馈，迭代改进 |

## 5. 决策记录证据

### 5.1 核心决策

1. **以 Claude Code 为第一迁移对象**
   - 理由：生态成熟、配置完善、差异化
   - 影响：需要适配 Claude Code Skill 格式

2. **蒸馏而非重写**
   - 理由：保留核心流程、高效、完整
   - 影响：需要识别核心能力、设计蒸馏边界

3. **不做跨书图谱**
   - 理由：暂无需求、降低复杂度
   - 影响：Skill 版本不支持跨书复用

4. **分阶段蒸馏**
   - 理由：便于管理、可回滚
   - 影响：3 个阶段，3-4 周工期

5. **保持接口一致**
   - 理由：降低学习成本、便于迁移
   - 影响：需要适配上游 Skill 文件结构

6. **使用 Python 脚本**
   - 理由：与上游一致、生态丰富
   - 影响：需要安装 Python 依赖

## 6. 验收标准证据

### 6.1 核心功能验收

- [ ] Skill 可在 Claude Code 中激活
- [ ] 可从灵感开始执行渐进式确认
- [ ] 可生成 novel-brief.md
- [ ] 可执行角色准备、卷级规划
- [ ] 可生成章节计划、正文、审核报告
- [ ] 可更新连续性状态

### 6.2 Auto-Director 验收

- [ ] 可读取状态并继续
- [ ] 可执行质量修复
- [ ] 可记录质量债务
- [ ] 可暂停等待用户决策

### 6.3 输出格式验收

- [ ] 工作区模式输出 Markdown/YAML
- [ ] 预览模式返回对话中的 bounded artifact
- [ ] 文件大小符合约束（<500 行）

## 7. 参考材料

### 7.1 上游 Skill

- 文件：`temp/ani-book-skill-analysis/ani-book-skill-main/`
- 核心文件：SKILL.md、references/、scripts/

### 7.2 当前项目

- 诊断报告：`docs/3.analysis/diagnosis/2026-07-29-ani-book-skill-migration-diagnosis.md`
- 任务包：`docs/1.task/B.todo/v0.2-r2066-C1-skill-migration-for-claude-code/`
