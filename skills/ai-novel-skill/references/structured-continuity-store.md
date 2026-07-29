# 结构化连续性存储

在工作区已经存在 `continuity/data/`，或用户要求长期续写、迁移 YAML 连续性、SQLite 检索或恢复检查点时读取本页。

## 1. 权威边界

- `continuity/data/*.yaml` 是唯一连续性事实来源；只由章节验收后的主代理更新。
- `continuity/index.sqlite3`、`continuity/*.md` 与章节上下文包均为派生物。不得从 SQLite 或 Markdown 反写事实。
- 角色档案、`world-bible.md` 与已验收正文仍分别拥有其原有的事实边界；结构化存储只收录跨章动态状态、事实、伏笔、资源和关系约束。

## 2. 数据文件

### 2.1 manifest.yaml

版本、修订号、最后验收章节和检查点策略。

```yaml
version: "3.0"
revision: 1
last_accepted_chapter: 15
checkpoint_strategy: every_10_chapters
```

### 2.2 facts.yaml

以稳定 ID、章节来源、证据和状态保存事实。

```yaml
- id: fact-001
  text: "主角在第3章获得了超能力"
  category: "completed"
  chapter_order: 3
  source: "auto"
  status: "active"
```

### 2.3 payoffs.yaml

伏笔追踪。

```yaml
- id: payoff-001
  text: "主角的身世之谜"
  planted_chapter: 1
  status: "planted"
  related_facts: ["fact-001"]
```

### 2.4 resources.yaml

资源台账。

```yaml
- id: resource-001
  text: "主角获得的神秘玉佩"
  type: "item"
  acquired_chapter: 5
  status: "in_possession"
  owner: "protagonist"
```

### 2.5 character-state.yaml

角色动态状态。

```yaml
- character_id: "protagonist"
  name: "主角"
  current_status: "受伤恢复中"
  last_updated_chapter: 12
  relationships:
    - target: "antagonist"
      type: "敌对"
      last_interaction_chapter: 10
```

## 3. 操作命令

### 3.1 迁移工作区

```bash
# 预检
python scripts/continuity_store.py migrate novels/<小说名> --dry-run

# 执行迁移
python scripts/continuity_store.py migrate novels/<小说名>
```

### 3.2 验证连续性

```bash
python scripts/continuity_store.py validate novels/<小说名>
```

### 3.3 重建索引

```bash
python scripts/continuity_store.py build-index novels/<小说名>
```

### 3.4 组装上下文

```bash
python scripts/continuity_store.py assemble-context --chapter N --max-chars 9000
```

## 4. 定稿与恢复

1. 仅在正文 `accepted` 或安全的 `continue_with_warning` 后更新 YAML。
2. 验证 YAML，再重建 Markdown 视图和 SQLite 索引；最后更新恢复记录和状态。
3. SQLite 缺失、锁定或修订过期时，直接从 YAML 组装上下文并标记索引 stale；不得阻塞正文恢复或篡改 YAML。
4. 每十章或卷末创建一次 YAML checkpoint。

## 5. 上下文装配

### 5.1 最小上下文原则

- 优先使用最小上下文包
- 只加载当前章真正需要的内容
- 不要把整本书塞入上下文

### 5.2 上下文优先级

1. 本章计划与义务合同
2. 上一章实际尾段
3. 角色硬事实与参与角色的当下呈现
4. 禁止越界与受保护揭示
5. 当前卷窗口和节奏段职责
6. 当前场景涉及的世界规则、势力状态和舞台限制
7. 相关未兑现承诺和资源状态
8. 风格合约和参考写法

### 5.3 上下文预算

- 单章上下文不超过模型窗口的 80%
- 跨书资产最多占 35%、且不超过 2500 字符
- 优先级：硬约束 > 当前任务 > 前一章尾段 > 角色事实 > 卷窗口
