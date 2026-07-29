# 小说创建流程

在用户要求创建新小说、从灵感开始、规划长篇、或提供想法开书时读取本页。

## 1. 渐进确认流程

### 1.1 无想法开书

当用户明确说"我没有想法"时：

1. 读取 [opening-seeds.md](opening-seeds.md)
2. 执行发散与质量门控
3. 输出 5 条一句话开书种子
4. 询问用户选择、修改或提供自己的想法

### 1.2 有想法开书

当用户提供想法时：

1. 生成 2 份新书简报预览
2. 每份包含：书名、一句话定位、目标读者/回报、主角路径、核心冲突、早期钩子、推进循环、结局方向
3. 两份预览必须在卖点、冲突、主角路径、推进循环、调性或结局方向上有明显差异
4. 等待用户选择、组合或委托方向

### 1.3 确认设置

用户选择方向后，确认以下高影响力设置：

- 读者频道（男频/女频/大众）
- 连载形态（免费连载/付费连载/完本）
- 主要阅读回报（成长与反转/爽感与升级/悬疑与解谜/情感与关系）
- 目标字数
- 叙事视角
- 节奏与语言倾向

每次只询问 2-3 个最影响后续的选择，提供 2-4 个互斥选项，推荐项放第一。

## 2. 书级设定产物

### 2.1 novel-brief.md

```markdown
# 小说简报

## 基本信息
- 书名：
- 一句话定位：
- 目标读者：
- 主要阅读回报：
- 连载形态：
- 目标字数：

## 故事引擎
- 主角欲望：
- 核心冲突：
- 早期钩子：
- 推进循环：
- 结局方向：

## 前 30 章承诺
- 前 3 章必须完成：
- 前 10 章必须完成：
- 前 30 章必须完成：

## 风格约定
- 叙事视角：
- 节奏倾向：
- 语言风格：
- 内容边界：
```

### 2.2 story-bible.md

```markdown
# 故事圣经

## 世界框架
- 世界类型：
- 时代背景：
- 地理范围：

## 规则系统
- 核心规则：
- 能力体系：
- 限制条件：

## 势力格局
- 主要势力：
- 势力关系：
- 冲突焦点：

## 阶段划分
- 第一阶段：
- 第二阶段：
- 第三阶段：
```

## 3. 状态管理

### 3.1 novel-state.yaml

```yaml
version: "1.0"
novel:
  title: ""
  status: "planning"  # planning / writing / paused / completed
  created_at: ""
  updated_at: ""

progress:
  current_volume: 0
  current_chapter: 0
  total_volumes: 0
  total_chapters: 0

confirmations:
  reader_channel: false
  publication_format: false
  primary_reward: false
  target_word_count: false
  narrative_pov: false
```

## 4. 工作区初始化

### 4.1 目录结构

```text
novels/<小说名>/
├── novel-brief.md
├── story-bible.md
├── novel-state.yaml
├── characters/
├── volumes/
├── chapters/
├── continuity/
└── production/
```

### 4.2 初始化命令

```bash
python scripts/novelctl.py init novels/<小说名> --title "<小说名>"
python scripts/novelctl.py set-opening-choices novels/<小说名> --channel "男频" --publication-format "免费连载" --primary-reader-reward "成长与反转"
```
