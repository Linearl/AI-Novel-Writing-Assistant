# 拆书分析检索

在索引或查询长分析工作区、构建 BookGraph 节点或边、追踪故事关系、使用全文检索或附加可选嵌入时读取本页。

## 1. 检索索引

### 1.1 索引构建

```bash
# 构建分析索引
python scripts/analysis_retrieval.py build analyses/<小说名>
```

### 1.2 索引结构

```text
analyses/<小说名>/retrieval/
├── analysis-index.sqlite3    # SQLite 索引
├── graph/
│   ├── nodes.jsonl          # 图节点
│   └── edges.jsonl          # 图边
└── embeddings/              # 嵌入向量（可选）
```

### 1.3 索引内容

- 章节笔记
- 分析小节
- 角色信息
- 情节关系
- 主题表达

## 2. 检索方式

### 2.1 图遍历

用于明确的关系：

```bash
# 查询节点邻居
python scripts/analysis_retrieval.py neighbors analyses/<小说名>/graph <node-id> --depth 2

# 查询关系路径
python scripts/analysis_retrieval.py path analyses/<小说名>/graph <start-id> <end-id>
```

### 2.2 词汇搜索

用于命名事实：

```bash
# 全文搜索
python scripts/analysis_retrieval.py search analyses/<小说名> --query "主角成长"

# 按类别搜索
python scripts/analysis_retrieval.py search analyses/<小说名> --category character --query "反派"
```

### 2.3 向量召回

用于语义相似（可选）：

```bash
# 向量搜索
python scripts/analysis_retrieval.py semantic analyses/<小说名> --query "主角如何变强" --top-k 5
```

## 3. 查询接口

### 3.1 基本查询

```bash
# 查询分析结果
python scripts/analysis_retrieval.py query analyses/<小说名> --query "主角成长弧线"

# 查询特定小节
python scripts/analysis_retrieval.py query analyses/<小说名> --section character_system --query "反派功能"
```

### 3.2 高级查询

```bash
# 组合查询
python scripts/analysis_retrieval.py query analyses/<小说名> --query "主角成长" --section character_system --chapter 1-30

# 带过滤的查询
python scripts/analysis_retrieval.py query analyses/<小说名> --query "冲突" --filter "type:plot_structure"
```

## 4. 图结构

### 4.1 节点类型

| 类型 | 说明 | 属性 |
|------|------|------|
| character | 角色 | name, role, traits |
| event | 事件 | title, chapter, impact |
| theme | 主题 | name, expression |
| technique | 技法 | name, effect |
| relationship | 关系 | source, target, type |

### 4.2 边类型

| 类型 | 说明 | 属性 |
|------|------|------|
| appears_in | 出现在 | chapter, role |
| causes | 导致 | impact, confidence |
| relates_to | 相关 | relevance, evidence |
| contrasts | 对比 | dimension |
| supports | 支持 | evidence |

### 4.3 图查询

```bash
# 查询角色关系
python scripts/analysis_retrieval.py graph-query analyses/<小说名>/graph --type character --query "主角关系网"

# 查询事件链
python scripts/analysis_retrieval.py graph-query analyses/<小说名>/graph --type event --query "主线事件"
```

## 5. 检索结果

### 5.1 结果格式

```json
{
  "query": "主角成长弧线",
  "results": [
    {
      "type": "section",
      "file": "sections/character-system.md",
      "content": "主角从普通外卖员成长为灵异高手...",
      "relevance": 0.95,
      "evidence": "第3章获得能力，第10章打败小Boss..."
    },
    {
      "type": "note",
      "file": "notes/chapter-003-notes.md",
      "content": "主角获得超能力...",
      "relevance": 0.85,
      "evidence": "原文引用..."
    }
  ],
  "total": 2
}
```

### 5.2 结果使用

1. 评估相关性
2. 验证证据
3. 提取关键信息
4. 应用到当前任务

## 6. 检索原则

### 6.1 权威边界

- 分析索引是派生物
- 原始分析文件是权威
- 不从索引反写分析

### 6.2 检索边界

- 只检索已索引的内容
- 不检索未分析的文本
- 不伪造检索结果

### 6.3 使用边界

- 检索结果是参考
- 需要验证后使用
- 不直接作为事实
