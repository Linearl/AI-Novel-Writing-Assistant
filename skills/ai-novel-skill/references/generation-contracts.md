# 生成合同

在运行或更改完整生产链时读取本页。

## 1. 生产链

### 1.1 完整链路

```text
方向判断 → 故事发动机 → 章节计划 → 完整正文 → 审查回灌
    ↑                                                    ↓
    └─────────────── 连续性状态与下一章 ───────────────┘
```

### 1.2 阶段说明

| 阶段 | 输入 | 输出 | 审批 |
|------|------|------|------|
| 方向判断 | 灵感/想法 | novel-brief.md | 用户确认 |
| 故事发动机 | novel-brief.md | story-bible.md | 用户确认 |
| 角色准备 | story-bible.md | character-roster.md | 用户确认 |
| 卷战略 | character-roster.md | volume-strategy.md | 用户确认 |
| 卷骨架 | volume-strategy.md | volume-skeleton.md | 用户确认 |
| 节奏板 | volume-skeleton.md | beat-sheet.md | 用户确认 |
| 章节清单 | beat-sheet.md | chapter-list.md | 用户确认 |
| 章节细化 | chapter-list.md | chapter-plan.md | 自动 |
| 章节执行 | chapter-plan.md | chapter-draft.md | 自动 |
| 审核修复 | chapter-draft.md | review-report.md | 自动 |
| 状态回灌 | review-report.md | continuity-update | 自动 |

## 2. 生成规则

### 2.1 输入规则

- 消费权威上游工件
- 不从聊天历史重建
- 保持最小上下文

### 2.2 输出规则

- 生成一个完整工件
- 检查验收条件
- 记录 Token 用量

### 2.3 状态规则

- 更新状态文件
- 记录质量债务
- 更新恢复记录

## 3. 生成约束

### 3.1 里程碑审批

以下阶段需要用户审批：

- 方向判断
- 故事发动机
- 角色准备
- 卷战略
- 卷骨架
- 节奏板
- 章节清单

### 3.2 自动执行

以下阶段自动执行：

- 章节细化
- 章节执行
- 审核修复
- 状态回灌

### 3.3 中断处理

- 用户可以随时暂停
- 状态自动保存
- 可从检查点恢复

## 4. 生成质量

### 4.1 质量门控

- 每个阶段检查验收条件
- 发现问题记录质量债务
- 局部问题不阻断全局

### 4.2 质量债务

- 记录非阻塞问题
- 允许继续执行
- 后续修复

### 4.3 质量修复

- 局部修复优先
- 重写只在必要时
- 推荐重规划最后

## 5. 生成工具

### 5.1 状态检查

```bash
# 检查生产状态
python scripts/novelctl.py status novels/<小说名> --format markdown

# 检查下一步
python scripts/novelctl.py next novels/<小说名>
```

### 5.2 生产执行

```bash
# 执行完整生产链
python scripts/novelctl.py produce novels/<小说名> --range 1-10

# 执行单章
python scripts/novelctl.py produce novels/<小说名> --chapter 1
```

### 5.3 状态恢复

```bash
# 恢复中断
python scripts/novelctl.py resume novels/<小说名>

# 检查恢复点
python scripts/novelctl.py checkpoints novels/<小说名>
```

## 6. 生成监控

### 6.1 进度监控

```bash
# 查看进度
python scripts/novelctl.py progress novels/<小说名>

# 查看历史
python scripts/novelctl.py history novels/<小说名>
```

### 6.2 质量监控

```bash
# 查看质量债务
python scripts/novelctl.py quality-debt novels/<小说名>

# 查看审核报告
python scripts/novelctl.py review-reports novels/<小说名>
```

### 6.3 Token 监控

```bash
# 查看 Token 用量
python scripts/token_usage.py summarize novels/<小说名>

# 查看详细账本
python scripts/token_usage.py detail novels/<小说名>
```
