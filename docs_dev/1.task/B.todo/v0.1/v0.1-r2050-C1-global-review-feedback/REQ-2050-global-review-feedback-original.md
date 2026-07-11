---
description: "REQ-2050 全局审校 + 跨章节问题回灌"
---

# REQ-2050 全局审校 + 跨章节问题回灌

> 状态：🆕 激活（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2050 |
| 优先级 | P1 |
| 来源 | 审校质量分析 — 当前审校只能逐章进行，缺少跨章节视角 |
| 关联需求 | 无 |
| 分类 | 2xxx 核心功能开发 |
| 复杂度 | complex |

---

## 1. 背景与问题

### 1.1 现状

当前审校系统仅支持逐章审校，每章独立审校后输出本章问题清单。这种模式存在以下局限：

1. **角色一致性缺失**：无法检测角色在不同章节中的性格矛盾、称谓不一致
2. **伏笔呼应断裂**：无法检测前文埋下的伏笔在后文是否得到回应
3. **情节连贯性盲区**：无法检测跨章节的时间线矛盾、因果链断裂
4. **节奏全局失衡**：无法从全书视角评估张力曲线、信息密度分布
5. **设定冲突隐蔽**：无法检测世界观设定在不同章节间的自相矛盾

### 1.2 影响

- 逐章审校只能发现"章内问题"，"跨章问题"需要人工逐章比对
- 审校效率低，遗漏率高
- 作者无法获得全局性的改进建议

---

## 2. 目标与范围

### 2.1 目标

1. 用户可选择审校范围（当前卷 / 指定范围）
2. 每章传全文 + 结构化摘要，总 budget 320K tokens
3. 全局审输出跨章节问题清单（crossChapterIssues）
4. 问题按 primaryFixChapter 分组，回灌到逐章修复

### 2.2 In Scope

- 全局审校 prompt（audit.global）：定义跨章节审校维度和输出格式
- GlobalReviewIssue 数据模型：Prisma schema + migration
- 全局审校 context builder：全局层 + 章节层 context 组装
- 全局审校 API 端点：POST /api/novels/:id/global-review
- Scope 选择 + token budget 自动裁剪
- 跨章节问题回灌到逐章审校 context block
- 手动触发 + 卷完成自动触发

### 2.3 Out of Scope

- 全局审校结果的前端展示 UI（本期仅做 API + 回灌）
- 跨书籍审校（仅限单本小说内）
- 全局审校的自动修复（仅输出问题和修复方向，不自动修改文本）

---

## 3. 需求详情

### 3.1 功能1：全局审校 prompt（audit.global）

WHEN 用户触发全局审校
THE SYSTEM SHALL 使用 audit.global prompt 对选定范围内的章节进行跨章节审校

审校维度：
1. 角色一致性（性格、称谓、能力设定）
2. 伏笔呼应（埋设 vs 回收）
3. 情节连贯性（时间线、因果链）
4. 节奏与张力（全书曲线）
5. 设定自洽性（世界观、规则体系）

### 3.2 功能2：GlobalReviewIssue 数据模型 + API

WHEN 全局审校完成
THE SYSTEM SHALL 将跨章节问题写入 GlobalReviewIssue 表

字段：
- novelId: 关联小说
- reviewRunId: 本次审校运行标识
- severity: 问题严重程度（critical / major / minor）
- category: 问题类别（character_consistency / plot_continuity / foreshadowing / pacing / worldbuilding）
- description: 问题描述
- fixDirection: 修复方向
- affectedChapters: 受影响章节 ID 列表
- primaryFixChapter: 主要修复应在的章节 ID
- status: 处理状态（pending / acknowledged / fixed / dismissed）

### 3.3 功能3：Scope 选择 + 320K budget 自动裁剪

WHEN 用户发起全局审校
THE SYSTEM SHALL 提供以下 scope 选项：

| 选项 | 说明 |
|------|------|
| 当前卷 | 自动选当前卷所有章节 |
| 指定范围 | 用户输入 startOrder-endOrder |
| 自动裁剪 | 按 320K budget 自动裁剪，提示"本次覆盖 N 章" |

Token budget 分配：
- 系统 prompt + 输出格式：~2K
- 全局层（注入一次）：~8K（book_contract ~1K, story_macro ~1K, 角色弧线规划 ~3K, 伏笔总账 ~2K, 当前卷概览 ~1K）
- 章节层（每章 ~6-10K）：~300K（结构化摘要 ~1K + 全文 ~5-9K）
- 预留输出：~10K
- 可审章节数：~300K / 8K ≈ 37章

### 3.4 功能4：跨章节问题回灌到逐章审校 context

WHEN 逐章审校开始
THE SYSTEM SHALL 查询 GlobalReviewIssue 表中 status = 'pending' 且 affectedChapters 包含当前章的记录
AND 将这些 issue 注入为 context block "global_review_feedback"（priority 105，高于 chapter_mission）

### 3.5 功能5：手动触发 + 卷完成自动触发

WHEN 用户在审校面板点击"全局审校"按钮
OR 当前卷所有章节审校完成
THE SYSTEM SHALL 触发全局审校流程

---

## 4. 验收标准

### 4.1 功能验收

- [ ] 用户可选择全局审校 scope（当前卷 / 指定范围）
- [ ] 全局审校按 320K budget 自动裁剪章节数量
- [ ] 全局审校输出 crossChapterIssues 数组
- [ ] GlobalReviewIssue 正确写入数据库
- [ ] 逐章审校时自动注入 global_review_feedback context block
- [ ] 卷完成时自动触发全局审校

### 4.2 技术验收

- [ ] GlobalReviewIssue Prisma model 正确创建
- [ ] GlobalReviewIssue API 端点可用（CRUD）
- [ ] 全局审校 context builder 正确组装全局层 + 章节层
- [ ] pnpm typecheck 通过
- [ ] pnpm test 通过

### 4.3 回归验收

- [ ] 现有逐章审校流程不受影响
- [ ] 无 global_review_feedback 时逐章审校正常运行
- [ ] 全局审校不影响章节生成流程

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 320K budget 在大卷（>40章）时可能不足 | 自动裁剪 + 提示用户"本次覆盖 N 章" |
| 全局审校 LLM 调用耗时较长 | 异步执行 + SSE 进度推送 |
| 回灌问题数量过多可能挤占逐章审校 context | 按 severity 优先注入，限制最多 10 条 |
| growthPath 数据可能不完整 | 缺失时跳过角色弧线段，不阻断全局审 |

---

## 6. 关联与边界

- 与逐章审校（audit.chapter）的关系：互补 — 逐章审先跑，全局审补充跨章节问题
- 与 story_macro 的关系：读取 growthPath、characterDynamics 用于角色弧线推导
- 与 book_contract 的关系：读取全书契约用于全局上下文
- 与伏笔系统的关系：读取伏笔总账用于伏笔呼应检测
- 与章节生成流程的关系：回灌问题注入逐章审校 context，不阻断生成

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-12 | 创建 | 初始版本 — req 路由生成（原始冻结副本） |
