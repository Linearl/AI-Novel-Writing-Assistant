---
description: "REQ-7072 散文质量检测器——需求文档"
---

# REQ-7072 散文质量检测器

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7072 |
| 优先级 | P2 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | 上游仓库 `AI-Novel-Writing-Assistant-main` 参考实现 `server/src/services/novel/runtime/proseQuality/ProseQualityDetector.ts`（450 行） |

---

## 1. 背景与问题

AI 生成的章节正文可能包含"退化"痕迹——AI 味句式、工程术语泄漏到正文、占位符残留、生成截断、段落/句子复读等。这些质量问题目前只在审校阶段由 LLM 检查，效率低且成本高。

需要一个纯正则的快速扫描器，零 LLM 成本，可嵌入章节生成管道末尾，第一时间发现问题。

## 2. 目标与范围

### 2.1 目标

1. 实现 9 种问题码的纯正则文本检测器
2. 检测结果生成标准 RuntimeAuditReport 格式
3. 集成到章节定稿管道（ChapterContentFinalizationService）

### 2.2 In Scope

- `detectProseQuality(content: string): ProseQualityReport` 主入口
- `buildProseQualityAuditReport(input): RuntimeAuditReport | null` 标准格式转换
- 9 种检测规则（P1→P9 见需求详情）
- 安全机制：代码块/引用行豁免、引号内文本豁免、每种码上限 8 条、总数上限 40 条

### 2.3 Out of Scope

- LLM 复核（后续迭代可能加入）
- 自动修复（修复策略由现有 ChapterRuntimePipeline 处理）
- 规则热更新/可配置（第一版硬编码）

---

## 3. 需求详情

### 9 种检测规则

| P1 | 问题码 | 严重级 | 说明 |
|----|--------|--------|------|
| P1 | `prose_negative_flip` | high | AI 式"不是……，而是……"否定翻转句 |
| P2 | `prose_dash_or_ellipsis` | high | 机器式破折号/省略号停顿制造 |
| P3 | `prose_period_stutter` | medium | 连续过短句号（≤8 字符 x6），节奏碎裂 |
| P4 | `prose_long_paragraph` | medium | 超过 220 字符的超长段落 |
| P5 | `prose_verbatim_repeat` | critical | 相邻段落完全相同 或 同一句出现 ≥3 次 |
| P6 | `prose_truncation` | critical | 正文结尾无完整句读，疑似截断 |
| P7 | `prose_ai_self_reference` | critical | AI 身份/拒绝话术泄漏 |
| P8 | `prose_placeholder_leak` | critical | 占位符/TODO/TBD/待补充 残留 |
| P9 | `prose_engineering_term_leak` | high/medium | 工程术语泄漏（细纲/情节点/prompt/schema 等） |

### 集成点

`ChapterContentFinalizationService.finalizeChapterContent()` 内部，`runAcceptanceGateOnly()` 之后、`buildRuntimePackage()` 之前，调用 `detectProseQuality(content)`，结果并入 `runtimePackage.audit`。

---

## 4. 验收标准

- [ ] 9 种规则各自能检测到对应问题（用样本文本验证）
- [ ] 代码块、引用行不被检测
- [ ] 引号内文本豁免占位符/工程术语检测
- [ ] 每种码最多 8 条、总计最多 40 条
- [ ] `buildProseQualityAuditReport` 输出符合 RuntimeAuditReport 格式
- [ ] 集成到 ChapterContentFinalizationService 不破坏现有管道
- [ ] typecheck 通过
- [ ] 单元测试覆盖所有 9 种规则

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| regex 误报（非 AI 味文本被标记） | 可调阈值 + 引号豁免 + 上限控制 |
| 中文正则边界 case | 用样本文本做参数化测试 |

---

## 6. 关联与边界

- 集成点：`ChapterContentFinalizationService.finalizeChapterContent()`（server/src/services/novel/runtime/）
- 输出类型：`RuntimeAuditReport`（shared/types/chapterCore.ts:134）
- 与 REQ-7075（FR-6 待审上下文）的关系：prose 检测结果可待审审校上下文的一部分
- 零外部依赖：不调 LLM、不读 DB、不需要新 npm 包

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
