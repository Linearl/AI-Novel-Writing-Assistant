# 上下文与连续性

当请求涉及续写、长期一致性、角色状态、世界规则、前几章、参考、风格、事实、资源或伏笔时读取本页。

## 1. 上下文管理

### 1.1 上下文优先级

按优先级读取：

1. 本章计划与义务合同
2. 上一章实际尾段
3. 角色硬事实与参与角色的当下呈现
4. 禁止越界与受保护揭示
5. 当前卷窗口和节奏段职责
6. 当前场景涉及的世界规则、势力状态和舞台限制
7. 相关未兑现承诺和资源状态
8. 风格合约和参考写法

### 1.2 最小上下文原则

- 优先使用最小上下文包
- 只加载当前章真正需要的内容
- 不要把整本书塞入上下文

### 1.3 上下文预算

- 单章上下文不超过模型窗口的 80%
- 优先级：硬约束 > 当前任务 > 前一章尾段 > 角色事实 > 卷窗口

## 2. 连续性管理

### 2.1 连续性数据

```yaml
# continuity/data/facts.yaml
- id: fact-001
  text: "主角在第3章获得了超能力"
  category: "completed"
  chapter_order: 3
  source: "auto"
  status: "active"

# continuity/data/payoffs.yaml
- id: payoff-001
  text: "主角的身世之谜"
  planted_chapter: 1
  status: "planted"
  related_facts: ["fact-001"]

# continuity/data/resources.yaml
- id: resource-001
  text: "主角获得的神秘玉佩"
  type: "item"
  acquired_chapter: 5
  status: "in_possession"
  owner: "protagonist"

# continuity/data/character-state.yaml
- character_id: "protagonist"
  name: "主角"
  current_status: "受伤恢复中"
  last_updated_chapter: 12
  relationships:
    - target: "antagonist"
      type: "敌对"
      last_interaction_chapter: 10
```

### 2.2 连续性检查

```bash
# 检查连续性
python scripts/continuity_store.py validate novels/<小说名>

# 重建索引
python scripts/continuity_store.py build-index novels/<小说名>

# 组装上下文
python scripts/continuity_store.py assemble-context --chapter N --max-chars 9000
```

### 2.3 连续性更新

章节正文验收后：

1. 更新 YAML 连续性事实
2. 更新受影响的角色资产
3. 更新质量债务
4. 更新恢复记录
5. 更新状态索引

## 3. 上下文包

### 3.1 上下文包结构

```markdown
# 上下文包 - 第15章

## 章节目标
- 即时目标：打败第一个强敌
- 主要阻力：强敌实力强大

## 参与角色
| 角色 | 作用 | 当下呈现 |
|------|------|----------|
| 主角 | 主角 | 受伤，但决心战斗 |
| 反派 | 对手 | 状态良好，实力强大 |

## 必需约束
- 事实：主角在第3章获得能力
- 伏笔：主角身世之谜
- 资源：神秘玉佩
- 世界规则：能力使用有代价

## 禁止越界
- 不能让主角轻易获胜
- 不能暴露能力者身份
- 不能违反世界规则

## 章末牵引
- 旧钩子：主角身世之谜
- 新钩子：更强的敌人出现
```

### 3.2 上下文包生成

```bash
# 生成上下文包
python scripts/continuity_store.py assemble-context novels/<小说名> --chapter 15 --max-chars 9000

# 验证上下文包
python scripts/continuity_store.py validate-context novels/<小说名> --chapter 15
```

## 4. 恢复管理

### 4.1 检查点

```yaml
# state/checkpoints.yaml
- chapter: 10
  timestamp: "2026-07-29T10:00:00+08:00"
  state_hash: "abc123"
  status: "completed"

- chapter: 14
  timestamp: "2026-07-29T11:00:00+08:00"
  state_hash: "def456"
  status: "completed"
```

### 4.2 恢复流程

1. 读取检查点
2. 加载连续性状态
3. 生成上下文包
4. 继续执行

### 4.3 中断处理

| 中断类型 | 处理方式 |
|----------|----------|
| 用户暂停 | 保存状态，等待用户继续 |
| 生成失败 | 重试（最多3次），失败后暂停 |
| 质量问题 | 记录债务，允许继续 |
| 阻塞问题 | 暂停，等待用户决策 |
