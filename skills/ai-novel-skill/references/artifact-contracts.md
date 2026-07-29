# 工件契约

在创建工作区、更改工件状态或决定哪些下游文件变为过时时读取本页。

## 1. 工件分类

### 1.1 创作工件

| 工件 | 路径 | 权威性 | 保护级别 |
|------|------|--------|----------|
| novel-brief.md | 根目录 | 权威 | 用户确认后保护 |
| story-bible.md | 根目录 | 权威 | 用户确认后保护 |
| character-roster.md | characters/ | 权威 | 用户确认后保护 |
| volume-strategy.md | volumes/ | 权威 | 用户确认后保护 |
| volume-skeleton.md | volumes/ | 权威 | 用户确认后保护 |
| beat-sheet.md | volumes/ | 权威 | 用户确认后保护 |
| chapter-plan.md | chapters/ | 权威 | 用户确认后保护 |
| chapter-draft.md | chapters/ | 权威 | 用户编辑后保护 |

### 1.2 状态工件

| 工件 | 路径 | 权威性 | 说明 |
|------|------|--------|------|
| novel-state.yaml | 根目录 | 派生 | 进度状态 |
| director-state.yaml | state/ | 派生 | 导演状态 |
| continuity/data/*.yaml | continuity/ | 权威 | 连续性事实 |
| quality-debt.md | production/ | 记录 | 质量债务 |
| token-usage.jsonl | production/ | 记录 | Token 账本 |

### 1.3 分析工件

| 工件 | 路径 | 权威性 | 说明 |
|------|------|--------|------|
| analysis-state.yaml | analyses/ | 权威 | 分析状态 |
| overview.md | analyses/ | 权威 | 分析总览 |
| sections/*.md | analyses/ | 权威 | 分析小节 |

## 2. 状态转换

### 2.1 工件状态

| 状态 | 含义 | 允许操作 |
|------|------|----------|
| `draft` | 草稿 | 编辑、删除 |
| `confirmed` | 用户确认 | 保护、只读 |
| `stale` | 过时 | 重新生成 |
| `archived` | 归档 | 只读 |

### 2.2 状态转换规则

```text
draft → confirmed (用户确认)
confirmed → stale (上游依赖变更)
stale → draft (重新生成)
draft → archived (归档)
```

### 2.3 过时判定

当上游工件变更时，下游工件变为过时：

| 上游变更 | 受影响的下游 |
|----------|--------------|
| novel-brief.md | story-bible, character-roster, volume-*, chapter-* |
| story-bible.md | volume-*, chapter-* |
| character-roster.md | chapter-* |
| volume-strategy.md | volume-skeleton, beat-sheet, chapter-* |
| chapter-plan.md | chapter-draft |

## 3. 保护规则

### 3.1 用户编辑保护

- 用户编辑的工件不被自动覆盖
- 只有用户明确授权后才能修改
- 修改前必须确认用户意图

### 3.2 确认后保护

- 用户确认的工件标记为 `confirmed`
- `confirmed` 状态的工件不被自动修改
- 只有用户明确要求或上游依赖变更时才能修改

### 3.3 过时处理

- 过时的工件标记为 `stale`
- `stale` 状态的工件需要重新生成
- 重新生成前必须确认用户意图

## 4. 迁移规则

### 4.1 工作区迁移

从旧版工作区迁移时：

1. 读取旧版工件
2. 映射到新版格式
3. 保留用户编辑
4. 标记需要确认的工件

### 4.2 格式转换

```bash
python scripts/novelctl.py migrate novels/<小说名> --dry-run
python scripts/novelctl.py migrate novels/<小说名>
```
