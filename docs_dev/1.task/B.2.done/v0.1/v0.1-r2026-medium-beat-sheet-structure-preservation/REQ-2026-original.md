---
description: "REQ-2026 节奏板重生成结构保持验证 — 原始需求冻结副本"
---

# REQ-2026 节奏板重生成结构保持验证（原始副本）

> 冻结日期：2026-06-30
> 状态：📋 待办

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2026 |
| 优先级 | P1 |
| 来源 | 代码分析 — REQ-2007 的 referenceExisting 仅为低优先级参考，无结构约束 |
| 前置需求 | REQ-2007（referenceExisting 选项） |
| 分类 | 2xxx 核心功能开发 |
| 复杂度 | medium |

---

## 1. 问题描述

### 1.1 现状

REQ-2007 为节奏板重生成添加了 `referenceExisting` 选项，将旧 beat sheet 摘要和已细化章节摘要作为 `reference` group（priority 55-60）注入 prompt。但存在三个缺口：

| 缺口 | 影响 |
| ---- | ---- |
| prompt 中无结构保持指令 | LLM 可自由改变 beat 数量、key、章节数分配 |
| `reference` group 优先级低，token 紧张时被 drop | 参考信息可能根本不会出现在最终 prompt 中 |
| 无后处理验证 | LLM 输出结构不一致时无法感知，直接接受 |

### 1.2 影响链路

```
节奏板全量替换（mergeBeatSheet）
  ↓ 新 beats 可能与旧结构完全不同
章节列表生成时 buildExistingBeatBlocks()
  ↓ 旧章节按 beatKey/span 匹配到新 beat
resolveFullVolumeResumeState() 逐 beat 比对章节数
  ↓ 大概率：新旧结构不一致 → 从不一致处开始全部重生成
已有章节的 purpose/taskSheet/sceneCards 丢失或错位
```

### 1.3 关键文件

| 文件 | 作用 |
| ---- | ---- |
| `server/src/prompting/prompts/novel/volume/contextBlocks.ts` | 上下文块构建，reference group 优先级 |
| `server/src/prompting/prompts/novel/volume/beatSheet.prompts.ts` | Beat sheet prompt 模板 |
| `server/src/services/novel/volume/volumeBeatSheetGeneration.ts` | Beat sheet 生成函数 |
| `server/src/services/novel/volume/volumeGenerationHelpers.ts` | mergeBeatSheet、mergeChapterList、resolveVolumeChapterBeatKey |

---

## 2. 目标

1. 当 `referenceExisting=true` 时，prompt 中包含结构保持硬性指令
2. LLM 输出后验证新旧 beat 结构一致性（beat 数量、key、章节数）
3. 验证失败时自动重试（最多 1 次），将失败原因注入 guidance
4. 与现有 `resolveFullVolumeResumeState()` 形成两层保护

## 3. 验收标准

- [ ] referenceExisting=true 时，prompt 中包含结构保持指令段
- [ ] `existing_beat_sheet` context block 提升到 preferred group
- [ ] LLM 输出 beats 后，验证函数检查 beat 数量、key、章节数
- [ ] 验证失败时自动重试，重试 prompt 中包含失败原因
- [ ] 重试仍失败时正常返回（降级为 LLM 最佳输出），记录 warning 日志
- [ ] referenceExisting=false 时行为不变（无验证、无约束）
- [ ] 首次生成（无已有 beat sheet）时行为不变

## 4. Out of Scope

- 强制保留已有 beat 结构的 Beat 锁定机制（方案 C，留作后续需求）
- 章节列表层的匹配逻辑改造（现有 resolveFullVolumeResumeState 已足够）
- 前端 UI 变更
