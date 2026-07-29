# 拆书分析

在分析参考小说、在线小说、长篇上传手稿、写作技巧、商业钩子、人物系统、情节结构或用户草稿时读取本页。

## 1. 分析范围

### 1.1 分析类型

| 类型 | 说明 | 产物 |
|------|------|------|
| 快速拆书 | 优先看清定位、结构、人物、写法 | overview + plot + character + style |
| 标准拆书 | 覆盖多数创作复用所需信息 | 全部（除timeline） |
| 完整拆书 | 生成全部分析小节 | 全部 |

### 1.2 分析小节

| 小节 | 说明 | 必要性 |
|------|------|--------|
| overview | 拆书总览 | 必要 |
| plot_structure | 剧情结构 | 必要 |
| timeline | 故事时间线 | 可选 |
| character_system | 人物系统 | 必要 |
| worldbuilding | 世界观与设定 | 必要 |
| themes | 主题表达 | 必要 |
| style_technique | 文风与技法 | 必要 |
| market_highlights | 商业化卖点 | 必要 |

## 2. 分析流程

### 2.1 确认范围

1. 确认分析类型（快速/标准/完整）
2. 确认分析范围（全书/前30章/特定角色）
3. 确认输出格式

### 2.2 冻结来源

1. 确定来源文本
2. 记录来源指纹
3. 确定覆盖范围

### 2.3 分段笔记

1. 按章节/场景分段
2. 提取关键信息
3. 记录原文证据

### 2.4 生成总览

1. 生成一句话定位
2. 提取题材标签
3. 分析整体优劣

### 2.5 生成小节

1. 逐个生成分析小节
2. 绑定章节证据
3. 记录推断与假设

## 3. 分析产物

### 3.1 分析总览

```markdown
# 分析总览

## 一句话定位
都市异能爽文，外卖员获得看见鬼的能力，逐步成长变强。

## 题材标签
- 都市
- 异能
- 灵异
- 爽文

## 卖点标签
- 底层逆袭
- 灵异悬疑
- 能力成长

## 目标读者
- 男频
- 18-35岁
- 喜欢爽文

## 整体优势
- 节奏快
- 爽点密集
- 设定新颖

## 整体短板
- 角色深度不足
- 世界观有漏洞
- 后期质量下降
```

### 3.2 剧情结构

```markdown
# 剧情结构

## 主线梗概
主角从普通外卖员成长为灵异高手的故事。

## 阶段推进
1. 获得能力（1-10章）
2. 第一次成长（11-30章）
3. 遇到强敌（31-50章）
4. 重大转折（51-80章）
5. 最终对决（81-100章）

## 冲突升级
- 小冲突：日常灵异事件
- 中冲突：势力冲突
- 大冲突：最终Boss

## 高光设计
- 第5章：第一次战斗
- 第20章：打败第一个强敌
- 第50章：重大转折
- 第100章：最终对决
```

### 3.3 人物系统

```markdown
# 人物系统

## 主角定位
- 身份：外卖员
- 能力：看见鬼
- 性格：坚韧、机智

## 配角功能
- 导师：提供指导
- 朋友：提供支持
- 对手：制造冲突

## 反派功能
- 最终Boss：主要对手
- 小Boss：阶段性对手

## 关系网络
- 主角-反派：敌对
- 主角-导师：师徒
- 主角-朋友：友情

## 成长弧线
- 起点：普通外卖员
- 转折：获得能力
- 高峰：战胜强敌
- 当前：受伤恢复中
```

### 3.4 文风与技法

```markdown
# 文风与技法

## 叙事视角
- 第一人称
- 主角视角

## 语言风格
- 口语化
- 简洁
- 节奏快

## 描写方式
- 动作描写为主
- 心理描写较少
- 环境描写简洁

## 可复用套路
- 开篇钩子：灵异事件
- 爽点设计：能力展示
- 节奏控制：高潮间隔
```

## 4. 分析工具

### 4.1 分析脚本

```bash
# 初始化分析工作区
python scripts/book_analysis.py init analyses/<小说名>

# 生成分析计划
python scripts/book_analysis.py plan analyses/<小说名>

# 执行分析
python scripts/book_analysis.py analyze analyses/<小说名> --section overview

# 生成报告
python scripts/book_analysis.py report analyses/<小说名>
```

### 4.2 检索索引

```bash
# 构建检索索引
python scripts/analysis_retrieval.py build analyses/<小说名>

# 查询
python scripts/analysis_retrieval.py query analyses/<小说名> --query "主角成长"
```

## 5. 分析产物管理

### 5.1 目录结构

```text
analyses/<小说名>/
├── analysis-state.yaml
├── source-manifest.md
├── coverage-map.md
├── overview.md
├── sections/
│   ├── plot-structure.md
│   ├── character-system.md
│   ├── worldbuilding.md
│   ├── themes.md
│   ├── style-technique.md
│   └── market-highlights.md
├── notes/
│   ├── chapter-001-notes.md
│   └── ...
├── pattern-cards.md
├── graph/
│   ├── nodes.jsonl
│   └── edges.jsonl
└── retrieval/
    └── analysis-index.sqlite3
```

### 5.2 工件状态

| 工件 | 状态 | 说明 |
|------|------|------|
| overview.md | confirmed | 分析总览 |
| sections/*.md | confirmed | 分析小节 |
| notes/*.md | draft | 分段笔记 |
| pattern-cards.md | draft | 可复用套路 |
