# 自动导演

当用户委托决策、请求章节范围、恢复中断运行、到达里程碑审批或遇到阻塞条件时读取本页。

## 1. 自动导演流程

### 1.1 完整链路

```text
方向判断 → 故事发动机 → 章节计划 → 完整正文 → 审查回灌
    ↑                                                    ↓
    └─────────────── 连续性状态与下一章 ───────────────┘
```

### 1.2 阶段说明

| 阶段 | 产物 | 审批 |
|------|------|------|
| 方向判断 | novel-brief.md | 用户确认 |
| 故事发动机 | story-bible.md | 用户确认 |
| 角色准备 | character-roster.md | 用户确认 |
| 卷战略 | volume-strategy.md | 用户确认 |
| 卷骨架 | volume-skeleton.md | 用户确认 |
| 节奏板 | beat-sheet.md | 用户确认 |
| 章节清单 | chapter-list.md | 用户确认 |
| 章节细化 | chapter-plan.md | 自动 |
| 章节执行 | chapter-draft.md | 自动 |
| 审核修复 | review-report.md | 自动 |
| 状态回灌 | continuity-update | 自动 |

## 2. 检查点恢复

### 2.1 状态文件

```yaml
# state/director-state.yaml
version: "1.0"
current_phase: "chapter_execution"
current_volume: 1
current_chapter: 15
last_completed_chapter: 14
status: "running"  # running / paused / blocked / completed

checkpoints:
  - chapter: 10
    timestamp: ""
    state_hash: ""
  - chapter: 14
    timestamp: ""
    state_hash: ""
```

### 2.2 恢复流程

1. 读取 `director-state.yaml`
2. 确定上次完成的章节
3. 加载该章节的连续性状态
4. 生成下一章的上下文包
5. 继续执行

### 2.3 中断处理

| 中断类型 | 处理方式 |
|----------|----------|
| 用户暂停 | 保存状态，等待用户继续 |
| 生成失败 | 重试（最多3次），失败后暂停 |
| 质量问题 | 记录债务，允许继续 |
| 阻塞问题 | 暂停，等待用户决策 |

## 3. 质量门控

### 3.1 门控规则

- 局部问题 → 继续推进 + 记录质量债务
- 全局阻塞 → 暂停全局链

### 3.2 局部问题（不阻断）

- `local_patch_plan`：本地可修复
- `continue_with_warning`：带警告继续
- `patchable_obligation_gap`：可补的义务缺口
- `draft_obligation_unmet`：草稿义务未满足
- `defer_and_continue`：延后继续

### 3.3 全局阻塞（阻断）

- `stop_for_replan`：需要重规划
- `replan_required`：必须重规划
- `recommendedAction=replan`：推荐重规划
- 不可恢复的生成失败
- 运行时安全/数据完整性失败

## 4. 运行模式

### 4.1 先准备到可开写

- 适用于第一本书
- 执行完整准备流程
- 到章节可执行时暂停

### 4.2 全书自动成书

- 用户已确认所有设置
- 自动执行完整流程
- 遇到阻塞时暂停

### 4.3 按范围执行

- 全书 / 前 N 章 / 第 1 卷
- 只执行指定范围
- 范围完成后暂停

### 4.4 正文后去 AI 检测与修正

- 叠加质量闭环
- 生成后自动检测 AI 味
- 自动修正模板感

## 5. 用户交互

### 5.1 委托决策

用户可以说"你来定"、"不要问我"、"直接生成"，表示可撤销的项目级委托。

### 5.2 暂停与恢复

- 用户可以随时暂停
- 状态自动保存
- 可从检查点恢复

### 5.3 干预

- 用户可以修改设置
- 用户可以重写章节
- 用户可以调整计划
