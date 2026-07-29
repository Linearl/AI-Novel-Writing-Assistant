# 工作流路由

当请求跨越多个路由、下一步不明确、或现有工作区可能不完整时读取本页。

## 1. 路由识别

### 1.1 主要路由

| 路由 | 触发条件 | 产物 |
|------|----------|------|
| 创建小说 | 从灵感开始、新书开书 | novel-brief.md |
| 规划卷级 | 卷战略、骨架、节奏板 | volume-*.md |
| 规划章节 | 章节计划、细化 | chapter-plan.md |
| 审计修复 | 诊断、修复、重写 | review-report.md |
| 继续小说 | 续写、恢复、继续 | chapter-draft.md |
| 分析参考 | 拆书、分析、学习 | analysis-*.md |
| 趋势分析 | 榜单、趋势、机会 | trend-*.md |

### 1.2 路由优先级

1. 用户显式指定的路由
2. 根据当前状态推断的路由
3. 询问用户确认

## 2. 状态检查

### 2.1 工作区存在性

```bash
python scripts/novelctl.py status novels/<小说名> --format markdown
```

### 2.2 下一步建议

```bash
python scripts/novelctl.py next novels/<小说名>
```

### 2.3 状态字段

```yaml
# novel-state.yaml
progress:
  current_phase: "planning"  # planning / writing / paused / completed
  current_volume: 1
  current_chapter: 15
  last_completed_chapter: 14
```

## 3. 路由决策

### 3.1 从灵感开始

1. 执行渐进确认
2. 生成 novel-brief.md
3. 生成 story-bible.md
4. 进入角色准备

### 3.2 继续已有小说

1. 读取 novel-state.yaml
2. 确定当前阶段
3. 加载相关上下文
4. 继续执行

### 3.3 分析参考作品

1. 确认分析范围
2. 生成分析计划
3. 执行分析
4. 输出分析报告

### 3.4 趋势分析

1. 确认平台/频道/时间窗口
2. 捕获榜单
3. 提取信号
4. 生成机会卡

## 4. 状态恢复

### 4.1 检查点恢复

```bash
python scripts/novelctl.py validate novels/<小说名>
python scripts/novelctl.py reconcile novels/<小说名>
```

### 4.2 中断恢复

1. 读取 director-state.yaml
2. 确定上次完成的章节
3. 加载连续性状态
4. 生成下一章上下文
5. 继续执行

### 4.3 质量问题恢复

1. 读取 quality-debt.md
2. 确定未解决债务
3. 决定修复优先级
4. 执行修复或记录

## 5. 路由切换

### 5.1 从创建切换到继续

当用户说"继续写"时：
1. 保存当前状态
2. 切换到继续路由
3. 从上次中断处继续

### 5.2 从继续切换到分析

当用户说"分析这本书"时：
1. 暂停当前执行
2. 切换到分析路由
3. 执行分析
4. 返回继续路由

### 5.3 从分析切换到创建

当用户说"基于分析创建新书"时：
1. 保存分析结果
2. 切换到创建路由
3. 使用分析结果指导创建
