---
description: "REQ-2066 设计方案 — Skill 版本迁移架构设计"
req_id: "REQ-2066"
version: "0.2"
created: "2026-07-29"
updated: "2026-07-29"
---

# REQ-2066 设计方案 — Skill 版本迁移

## 1. 架构概览

### 1.1 目标架构

```text
Claude（或 Codex）：理解故事、规划、写作、审校、判断
  ↓
Skill / 合同：定义每个阶段必须消费什么、交付什么、如何验收
  ↓
Python 脚本：校验状态、保护冲突、构建索引、导出
  ↓
Markdown / YAML：作者可编辑的唯一权威
```

### 1.2 与上游 Skill 的对比

| 维度 | 上游 Skill | 我们的 Skill |
|------|-----------|-------------|
| 核心流程 | 从灵感到章节 | ✅ 同等覆盖 |
| Auto-Director | ⚠️ 部分（依赖 Codex） | ✅ 完整蒸馏 |
| 质量检查 | ⚠️ 基础 | ✅ 多层次 |
| 连续性管理 | ⚠️ 基础事实 | ✅ 事实+伏笔+资源+动态 |
| 写法资产 | ❌ 无 | ✅ 特征提取+复用 |
| 跨书图谱 | ✅ 有 | ❌ 暂不做 |

## 2. 文件结构设计

### 2.1 Skill 目录结构

```text
ai-novel-skill/
├── SKILL.md                    # Skill 主入口
├── AGENTS.md                   # AI 协作规范
├── README.md                   # 项目说明
├── requirements.txt            # Python 依赖
├── references/                 # 能力契约文档
│   ├── novel-brief.md         # 小说创建流程
│   ├── character-preparation.md # 角色准备
│   ├── story-and-volume-planning.md # 卷级规划
│   ├── chapter-production.md  # 章节生产
│   ├── continuity-management.md # 连续性管理
│   ├── quality-and-repair.md  # 质量检查
│   ├── book-analysis.md       # 拆书分析
│   ├── writing-techniques.md  # 写法资产
│   ├── token-usage.md         # Token 用量
│   ├── auto-director.md       # 自动导演
│   ├── workflow-routing.md    # 工作流路由
│   └── artifact-contracts.md  # 工件契约
├── scripts/                    # Python 脚本
│   ├── novelctl.py            # 小说状态控制
│   ├── continuity_store.py    # 连续性存储
│   ├── quality_checker.py     # 质量检查
│   ├── book_analysis.py       # 拆书分析
│   ├── writing_extractor.py   # 写法提取
│   ├── token_usage.py         # Token 用量
│   └── export_novel_txt.py    # 导出 TXT
├── templates/                  # 模板文件
│   ├── novel-brief.template.md
│   ├── chapter-contract.template.md
│   ├── character-profile.template.md
│   └── volume-plan.template.md
└── examples/                   # 示例
    ├── example-novel/
    │   ├── novel-brief.md
    │   ├── story-bible.md
    │   └── ...
    └── example-analysis/
        └── ...
```

### 2.2 核心文件说明

| 文件 | 说明 | 来源 |
|------|------|------|
| `SKILL.md` | Skill 主入口，定义使命、边界、路由 | 上游 Skill + 增强 |
| `references/*.md` | 能力契约，定义每个阶段的输入/输出/验收 | 上游 Skill + 增强 |
| `scripts/*.py` | Python 脚本，处理确定性状态 | 上游 Skill + 增强 |
| `templates/*.md` | 模板文件，标准化输出格式 | 上游 Skill |
| `examples/` | 示例文件，展示典型用法 | 新增 |

## 3. 核心能力蒸馏

### 3.1 小说创建流程

**来源**：`novelBrief` + `storyMacro` + `characterPrep`

**蒸馏内容**：
- 渐进式确认流程
- 书级设定生成
- 故事宏观规划
- 角色准备
- 卷级规划

**输出文件**：
- `novel-brief.md`：书级设定
- `story-bible.md`：世界观
- `character-roster.md`：角色名册

### 3.2 章节生产流程

**来源**：`chapterProduction` + `quality`

**蒸馏内容**：
- 章节计划合同
- 正文生成
- 审核流程
- 修复流程
- 状态回灌

**输出文件**：
- `chapters/chapter-XXX/plan.md`：章节计划
- `chapters/chapter-XXX/draft.md`：正文
- `chapters/chapter-XXX/review.md`：审核报告

### 3.3 连续性管理

**来源**：`continuity` + `fact` + `payoff`

**蒸馏内容**：
- 事实追踪
- 伏笔管理
- 资源台账
- 角色状态

**输出文件**：
- `continuity/data/facts.yaml`：事实
- `continuity/data/payoffs.yaml`：伏笔
- `continuity/data/resources.yaml`：资源

### 3.4 Auto-Director（独特能力）

**来源**：`autoDirector` + `pipeline` + `recovery`

**蒸馏内容**：
- 自动导演流程
- 检查点恢复
- 质量门控
- 中断处理

**输出文件**：
- `state/novel-state.yaml`：小说状态
- `state/director-state.yaml`：导演状态

## 4. 接口设计

### 4.1 用户交互接口

**启动命令**：
```text
# 从灵感开始
使用 produce-long-form-novel 帮我从一个灵感开始规划长篇小说。

# 继续已有小说
使用 produce-long-form-novel 继续 novels/都市异能/，先判断下一步该做什么。

# 分析参考作品
使用 produce-long-form-novel 分析这本书的写法。
```

**输出格式**：
- 预览模式：返回对话中的 bounded artifact
- 工作区模式：写入 Markdown/YAML 文件

### 4.2 Python 脚本接口

**novelctl.py**：
```bash
# 初始化工作区
python scripts/novelctl.py init novels/<小说名> --title "<小说名>"

# 设置初始选项
python scripts/novelctl.py set-opening-choices novels/<小说名> --channel "男频" --publication-format "免费连载"

# 查看状态
python scripts/novelctl.py status novels/<小说名> --format markdown

# 查看下一步
python scripts/novelctl.py next novels/<小说名>
```

**continuity_store.py**：
```bash
# 迁移工作区
python scripts/continuity_store.py migrate novels/<小说名> --dry-run
python scripts/continuity_store.py migrate novels/<小说名>

# 验证连续性
python scripts/continuity_store.py validate novels/<小说名>

# 重建索引
python scripts/continuity_store.py build-index novels/<小说名>
```

## 5. 错误处理

### 5.1 生成失败

- **情况**：LLM 返回空内容或格式错误
- **处理**：重试（最多 3 次），失败后记录质量债务
- **恢复**：用户可手动修复或重新生成

### 5.2 连续性冲突

- **情况**：新生成内容与已有事实冲突
- **处理**：暂停并报告冲突，等待用户决策
- **恢复**：用户选择保留或覆盖

### 5.3 状态丢失

- **情况**：工作区文件损坏或丢失
- **处理**：从 YAML checkpoint 恢复
- **恢复**：自动重建 SQLite 索引

## 6. 性能约束

### 6.1 上下文窗口

- **限制**：单章上下文不超过模型窗口的 80%
- **策略**：按优先级裁剪上下文
- **监控**：Token 用量追踪

### 6.2 文件大小

- **限制**：单文件不超过 500 行
- **策略**：拆分为多个模块
- **监控**：文件大小检查

## 7. 安全约束

### 7.1 数据保护

- **原则**：用户编辑的内容受保护，不被自动覆盖
- **策略**：仅在明确授权后修改已有内容
- **恢复**：所有修改可回滚

### 7.2 隐私保护

- **原则**：小说内容不上传到外部服务
- **策略**：仅使用本地 LLM 或用户授权的 API
- **监控**：网络请求日志

## 8. 测试策略

### 8.1 单元测试

- Python 脚本：覆盖核心逻辑
- 模板生成：验证输出格式

### 8.2 集成测试

- 端到端流程：从灵感到章节
- 恢复测试：中断后继续

### 8.3 用户验收测试

- 示例小说：用真实创作验证
- 对比测试：与上游 Skill 对比
