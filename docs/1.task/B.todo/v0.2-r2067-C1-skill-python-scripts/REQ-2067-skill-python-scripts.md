---
description: "REQ-2067 需求文档 — 补齐 Skill Python 脚本与核心能力"
req_id: "REQ-2067"
title: "补齐 Skill Python 脚本与核心能力"
version: "0.2"
priority: "P0"
status: "approved"
created: "2026-07-29"
---

# REQ-2067 补齐 Skill Python 脚本与核心能力

## 背景

REQ-2066 完成了 Skill 文档蒸馏（40个文件），但 Python 脚本全部缺失（0/9）。
这导致 Skill 仅能作为文档参考，无法独立运行。

## 需求

### 核心需求

1. **确定性状态管理** - 通过 Python 脚本实现工作区初始化、校验、恢复
2. **跨书资产图谱** - 支持多书共享IP、角色、世界设定
3. **拆书分析检索** - 分段缓存、增量分析、检索
4. **辅助工具** - TXT导出、Token统计、连续性检查

### 功能列表

| 脚本 | 功能 | 优先级 |
|------|------|--------|
| `novelctl.py` | 工作区管理（init, status, recover, context） | P0 |
| `continuity_store.py` | YAML连续性管理（validate, index, rebuild） | P0 |
| `asset_graph.py` | 跨书资产图谱（publish, sync, graph, impact） | P1 |
| `analysis_retrieval.py` | 拆书分析检索（segment, cache, retrieve） | P1 |
| `export_novel_txt.py` | TXT导出 | P2 |
| `token_usage.py` | Token用量统计 | P2 |
| `check_continuity_workspace.py` | 连续性工作区检查 | P2 |
| `sync_skill_mirror.py` | Skill镜像同步 | P3 |
| `trend_snapshot.py` | 热点趋势快照 | P3 |

## 约束

### 架构约束

- **Codex 是唯一的创作引擎** - Python只处理确定性状态
- **Markdown/YAML 是权威源** - SQLite/JSONL是可重建索引
- **不引入外部依赖** - 仅用 Python 标准库 + PyYAML

### 接口约束

- 所有脚本必须支持 `--help`
- 所有脚本必须返回 exit code（0=成功，非0=失败）
- 所有脚本必须输出 UTF-8
- 所有脚本必须支持 `--dry-run` 模式

### 数据约束

- YAML 文件必须通过 schema 校验
- JSONL 文件必须可重建
- SQLite 索引必须可丢弃

## 验收标准

### 功能验收

- [ ] 所有 P0 脚本可独立运行
- [ ] 所有命令有 `--help` 文档
- [ ] 所有命令支持 `--dry-run`
- [ ] 所有 YAML 校验通过
- [ ] 所有索引可重建

### 质量验收

- [ ] 单元测试覆盖率 >= 80%
- [ ] 类型检查通过（mypy）
- [ ] 代码风格检查通过（ruff）
- [ ] 文档完整（docstring + README）

### 集成验收

- [ ] novelctl 可管理工作区生命周期
- [ ] continuity_store 可管理连续性数据
- [ ] asset_graph 可管理跨书资产
- [ ] analysis_retrieval 可管理拆书分析

## 输出物

### 代码

```
skills/ai-novel-skill/scripts/
├── novelctl.py
├── continuity_store.py
├── asset_graph.py
├── analysis_retrieval.py
├── export_novel_txt.py
├── token_usage.py
├── check_continuity_workspace.py
├── sync_skill_mirror.py
└── trend_snapshot.py
```

### 文档

```
skills/ai-novel-skill/references/
├── cross-book-asset-graph.md（补充）
└── ai-novel-writing-assistant-v2-adapter.md（补充）
```

### 测试

```
skills/ai-novel-skill/tests/
├── test_novelctl.py
├── test_continuity_store.py
├── test_asset_graph.py
└── ...
```

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 上游脚本复杂度高 | 延期 | 先实现核心命令，迭代完善 |
| YAML schema 不兼容 | 返工 | 参考上游 schema，保持兼容 |
| 测试覆盖不足 | 质量问题 | 强制 TDD，先写测试 |
| 性能问题 | 用户体验 | 使用惰性加载和缓存 |
