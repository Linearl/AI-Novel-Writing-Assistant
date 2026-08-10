# AI Novel Skill 使用指南

本指南帮助你快速上手 AI Novel Skill，理解如何使用 Python 脚本管理小说创作工作区。

## 快速开始

### 1. 环境准备

**前置条件**：
- Python 3.10+
- PyYAML（`pip install pyyaml`）

**安装**：
```bash
# 克隆或复制 Skill 目录
cp -r skills/ai-novel-skill /path/to/your/workspace/

# 安装依赖
cd /path/to/your/workspace/ai-novel-skill
pip install -r requirements.txt
```

### 2. 创建第一个工作区

```bash
# 初始化工作区
python scripts/novelctl.py init --title "我的小说" --genre fantasy --target-words 500000

# 查看状态
python scripts/novelctl.py status
```

## 核心工作流

### 工作区管理（novelctl.py）

#### 初始化

```bash
# 基本初始化
python scripts/novelctl.py init --title "玄幻小说" --genre xuanhuan

# 完整初始化
python scripts/novelctl.py init \
  --title "都市异能" \
  --genre urban_fantasy \
  --target-words 1000000 \
  --force  # 强制覆盖现有工作区
```

#### 查看状态

```bash
# 查看工作区状态
python scripts/novelctl.py status

# 输出示例：
# Workspace: ./my-novel
# Title: 都市异能
# Genre: urban_fantasy
# Phase: writing
# Volume: 1
# Chapter: 15
# Last Completed: 14
```

#### 验证工作区

```bash
# 验证 schema 和文件完整性
python scripts/novelctl.py validate

# 输出示例：
# workspace validation passed
```

#### 组装上下文

```bash
# 为第 15 章组装上下文
python scripts/novelctl.py context 15

# 输出到文件
python scripts/novelctl.py context 15 --output context-packages/chapter-015.md

# 限制上下文大小（默认 5500 字符）
python scripts/novelctl.py context 15 --max-chars 4000
```

#### 管理步骤

```bash
# 列出所有步骤
python scripts/novelctl.py step list

# 标记步骤完成
python scripts/novelctl.py step complete --step novel_brief
python scripts/novelctl.py step complete --step story_bible
```

#### 恢复检查点

```bash
# 恢复到最新检查点
python scripts/novelctl.py recover

# 恢复到指定章节
python scripts/novelctl.py recover --chapter 10
```

### 连续性管理（continuity_store.py）

#### 验证连续性数据

```bash
# 验证所有 YAML 文件
python scripts/continuity_store.py validate

# 输出示例：
# continuity validation passed
```

#### 构建索引

```bash
# 从 YAML 构建 SQLite 索引
python scripts/continuity_store.py build

# 指定数据库路径
python scripts/continuity_store.py build --db custom/index.sqlite3
```

#### 重建索引

```bash
# 删除现有索引并重建
python scripts/continuity_store.py rebuild
```

#### 查询数据

```bash
# 查询所有 facts
python scripts/continuity_store.py query facts

# 查询指定 ID
python scripts/continuity_store.py query facts --id fact-001

# JSON 格式输出
python scripts/continuity_store.py query payoffs --format json

# 查询角色状态
python scripts/continuity_store.py query characters --id protagonist
```

### 跨书资产图谱（asset_graph.py）

#### 初始化资产库

```bash
# 初始化资产库
python scripts/asset_graph.py init libraries

# 指定 universe ID
python scripts/asset_graph.py init libraries --universe-id my-universe
```

#### 发布资产

```bash
# 创建资产文件
cat > my-character.yaml << EOF
id: char-001
namespace: universe
type: character
version: "1.0"
status: draft
governance: author_approval
content:
  name: "张三"
  description: "主角"
  abilities: ["剑术", "内功"]
EOF

# 发布（需要作者批准）
python scripts/asset_graph.py publish libraries my-character.yaml --author-approved
```

#### 导入资产到工作区

```bash
# Fork 模式（独立副本，不与原资产同步）
python scripts/asset_graph.py import libraries novels/my-novel char-001 --mode fork

# Sync 模式（保持链接，原资产更新时可同步）
python scripts/asset_graph.py import libraries novels/my-novel char-001 --mode sync
```

#### 构建图谱

```bash
# 构建资产关系图谱
python scripts/asset_graph.py build libraries
```

#### 查询邻域

```bash
# 查询资产的邻域（深度 2）
python scripts/asset_graph.py neighbors libraries char-001 --depth 2

# JSON 格式
python scripts/asset_graph.py neighbors libraries char-001 --format json
```

#### 获取上下文

```bash
# 获取多个资产的上下文
python scripts/asset_graph.py context libraries novels/my-novel \
  --assets char-001,char-002 \
  --max-depth 2 \
  --max-chars 4000

# 输出到文件
python scripts/asset_graph.py context libraries novels/my-novel \
  --assets char-001 \
  --output context-packages/assets.md
```

#### 查看时间线

```bash
# 查看宇宙事件时间线
python scripts/asset_graph.py timeline libraries

# JSON 格式
python scripts/asset_graph.py timeline libraries --format json
```

### 分析检索（analysis_retrieval.py）

#### 列出分段

```bash
# 列出分析的所有分段
python scripts/analysis_retrieval.py list analysis-001

# JSON 格式
python scripts/analysis_retrieval.py list analysis-001 --format json
```

#### 读取分段

```bash
# 读取指定分段
python scripts/analysis_retrieval.py read analysis-001 segment-001.md
```

#### 写入分段

```bash
# 从文件写入
python scripts/analysis_retrieval.py write analysis-001 segment-001.md --input notes.md

# 从标准输入写入
echo "分析内容" | python scripts/analysis_retrieval.py write analysis-001 segment-001.md
```

#### 检索上下文

```bash
# 检索所有分段
python scripts/analysis_retrieval.py retrieve analysis-001

# 限制大小
python scripts/analysis_retrieval.py retrieve analysis-001 --max-chars 4000

# 输出到文件
python scripts/analysis_retrieval.py retrieve analysis-001 --output context.md
```

#### 查看覆盖情况

```bash
# 查看分析覆盖情况
python scripts/analysis_retrieval.py coverage analysis-001

# JSON 格式
python scripts/analysis_retrieval.py coverage analysis-001 --format json
```

### Token 使用统计（token_usage.py）

#### 记录使用量

```bash
# 记录操作
python scripts/token_usage.py record "chapter_generation" \
  --prompt-tokens 5000 \
  --completion-tokens 2000 \
  --chapter 15 \
  --model "claude-sonnet-4-6" \
  --cost 0.15
```

#### 查看汇总

```bash
# 查看总使用量
python scripts/token_usage.py summary

# JSON 格式
python scripts/token_usage.py summary --format json
```

#### 按章节统计

```bash
# 查看各章节使用量
python scripts/token_usage.py by-chapter

# JSON 格式
python scripts/token_usage.py by-chapter --format json
```

#### 按操作统计

```bash
# 查看各操作使用量
python scripts/token_usage.py by-operation

# JSON 格式
python scripts/token_usage.py by-operation --format json
```

### TXT 导出（export_novel_txt.py）

#### 导出全书

```bash
# 导出为纯文本
python scripts/export_novel_txt.py --output novel.txt

# 导出为 Markdown
python scripts/export_novel_txt.py --output novel.md --format markdown
```

### 工作区检查（check_continuity_workspace.py）

```bash
# 检查工作区连续性资产
python scripts/check_continuity_workspace.py ./my-novel

# 输出示例：
# CONTINUITY CHECK: OK
# All required assets exist and recorded stable sources still match their fingerprints.
```

### Skill 镜像同步（sync_skill_mirror.py）

```bash
# 检查镜像是否同步
python scripts/sync_skill_mirror.py check /source/skill /installed/skill

# 同步镜像
python scripts/sync_skill_mirror.py sync /source/skill /installed/skill
```

### 热点趋势分析（trend_snapshot.py）

```bash
# 验证快照
python scripts/trend_snapshot.py validate trends/snapshot-2026-07-29.jsonl

# 汇总快照
python scripts/trend_snapshot.py summarize trends/snapshot-2026-07-29.jsonl

# 对比两个快照
python scripts/trend_snapshot.py compare trends/july.jsonl trends/august.jsonl
```

## 完整工作流示例

### 示例 1：创建新小说

```bash
# 1. 初始化工作区
python scripts/novelctl.py init --title "修仙传说" --genre xianxia

# 2. 创建小说简介
cat > novel-brief.md << 'EOF'
# 修仙传说

## 核心设定
- 主角：李明，普通大学生，意外获得修仙传承
- 世界观：现代都市 + 隐藏修仙界
- 核心冲突：修仙者之间的争斗与凡人世界的平衡

## 故事主线
李明在获得修仙传承后，逐渐揭开修仙界的秘密，同时保护家人和朋友的安全。
EOF

# 3. 创建角色
mkdir -p characters
cat > characters/protagonist.md << 'EOF'
# 李明

## 基本信息
- 年龄：22岁
- 职业：大学生
- 能力：修仙（初期炼气期）

## 性格特点
- 善良正直
- 责任心强
- 勇敢果断
EOF

# 4. 验证工作区
python scripts/novelctl.py validate

# 5. 开始写作...
```

### 示例 2：章节生产

```bash
# 1. 组装第 1 章上下文
python scripts/novelctl.py context 1 --output context-packages/chapter-001.md

# 2. 写作（Claude 会读取上下文并生成内容）
# ... Claude 生成章节内容 ...

# 3. 保存章节
cat > chapters/chapter-001.md << 'EOF'
# 第一章 意外传承

李明走在回家的路上...
EOF

# 4. 记录 Token 使用
python scripts/token_usage.py record "chapter_1" \
  --prompt-tokens 3000 \
  --completion-tokens 1500 \
  --chapter 1

# 5. 更新连续性
cat > continuity/facts.yaml << 'EOF'
- id: fact-001
  text: "李明在第1章获得修仙传承"
  category: "completed"
  chapter_order: 1
  source: "auto"
  status: "active"
EOF

# 6. 标记步骤完成
python scripts/novelctl.py step complete --step chapter_draft
```

### 示例 3：跨书资产复用

```bash
# 1. 初始化资产库
python scripts/asset_graph.py init libraries --universe-id xianxia-universe

# 2. 发布角色到资产库
cat > my-character.yaml << 'EOF'
id: xianxia-protagonist-001
namespace: reusable
type: character
version: "1.0"
status: draft
governance: author_approval
content:
  name: "天才少年"
  archetype: "主角模板"
  abilities: ["剑术", "炼丹", "阵法"]
  personality: ["正义", "聪明", "重情义"]
EOF

python scripts/asset_graph.py publish libraries my-character.yaml --author-approved

# 3. 在新小说中导入
python scripts/asset_graph.py import libraries novels/new-novel xianxia-protagonist-001 --mode fork

# 4. 使用导入的资产
python scripts/asset_graph.py context libraries novels/new-novel \
  --assets xianxia-protagonist-001 \
  --output context-packages/protagonist.md
```

## 常见问题

### Q1: 如何验证工作区是否正确？

```bash
python scripts/novelctl.py validate
python scripts/continuity_store.py validate
python scripts/check_continuity_workspace.py ./my-novel
```

### Q2: 如何恢复到之前的章节？

```bash
# 查看状态
python scripts/novelctl.py status

# 恢复到第 10 章
python scripts/novelctl.py recover --chapter 10
```

### Q3: 如何查看 Token 使用情况？

```bash
# 总使用量
python scripts/token_usage.py summary

# 按章节
python scripts/token_usage.py by-chapter

# 按操作
python scripts/token_usage.py by-operation
```

### Q4: 如何管理跨书资产？

```bash
# 初始化资产库
python scripts/asset_graph.py init libraries

# 发布资产
python scripts/asset_graph.py publish libraries asset.yaml --author-approved

# 导入到工作区
python scripts/asset_graph.py import libraries novels/my-novel asset-id --mode sync

# 查看图谱
python scripts/asset_graph.py build libraries
python scripts/asset_graph.py neighbors libraries asset-id
```

### Q5: 如何导出小说？

```bash
# 纯文本
python scripts/export_novel_txt.py --output novel.txt

# Markdown
python scripts/export_novel_txt.py --output novel.md --format markdown
```

## 进阶用法

### 1. 自动化工作流

创建 shell 脚本自动化常见任务：

```bash
#!/bin/bash
# scripts/auto-export.sh

WORKSPACE=$1
OUTPUT=$2

python scripts/novelctl.py validate -w $WORKSPACE || exit 1
python scripts/continuity_store.py validate -w $WORKSPACE || exit 1
python scripts/export_novel_txt.py -w $WORKSPACE -o $OUTPUT
```

### 2. 集成到 Claude Code

在 SKILL.md 中引用脚本：

```markdown
## 生产循环

1. 组装上下文：`python scripts/novelctl.py context $CHAPTER`
2. 生成章节（Claude 完成）
3. 保存章节到 `chapters/chapter-$CHAPTER.md`
4. 更新连续性数据
5. 记录 Token 使用
```

### 3. 批量处理

```bash
# 为所有章节组装上下文
for i in {1..20}; do
  python scripts/novelctl.py context $i --output context-packages/chapter-$(printf "%03d" $i).md
done
```

## 故障排除

### 问题 1: YAML 校验失败

```bash
# 检查具体错误
python scripts/continuity_store.py validate

# 常见原因：
# - 缺少必填字段（id, text）
# - 枚举值无效（status, category）
# - 重复 ID
```

### 问题 2: 索引构建失败

```bash
# 重建索引
python scripts/continuity_store.py rebuild

# 检查数据库
ls -lh continuity/index.sqlite3
```

### 问题 3: 上下文超限

```bash
# 限制上下文大小
python scripts/novelctl.py context 15 --max-chars 4000

# 或分段获取
python scripts/novelctl.py context 15 --max-chars 2000
```

### 问题 4: 资产导入冲突

```bash
# 查看导入状态
cat continuity/asset-links.yaml

# 手动解决冲突（编辑 YAML）
# 或重新导入（Fork 模式）
python scripts/asset_graph.py import libraries novels/my-novel asset-id --mode fork
```

## 最佳实践

1. **定期验证**：每次修改后运行 `validate` 命令
2. **使用版本控制**：将 YAML 文件纳入 Git 管理
3. **备份重要数据**：定期备份 `continuity/` 目录
4. **记录 Token 使用**：便于追踪成本
5. **使用资产库**：复用角色、世界观等资产
6. **保持文档更新**：及时更新 novel-brief 和 story-bible

## 获取帮助

```bash
# 查看脚本帮助
python scripts/novelctl.py --help
python scripts/novelctl.py init --help

# 查看 Skill 文档
cat SKILL.md
cat README.md
```

## 相关文档

- [SKILL.md](SKILL.md) - Skill 主文档
- [README.md](README.md) - 项目说明
- [COMPATIBILITY.md](COMPATIBILITY.md) - 兼容性报告
- [references/](references/) - 能力契约文档
- [templates/](templates/) - 模板文件
- [examples/](examples/) - 示例小说
