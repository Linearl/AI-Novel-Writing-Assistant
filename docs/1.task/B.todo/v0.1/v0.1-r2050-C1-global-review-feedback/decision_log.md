---
description: "REQ-2050 决策留痕"
---

# REQ-2050 决策日志

## D1: 全局审触发时机 = 手动 + 卷完成自动

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 全局审校支持两种触发方式：手动触发（用户在审校面板点击"全局审校"）+ 卷完成自动触发（当前卷所有章节审校完成后自动触发） |
| 原因 | 手动触发给予用户控制权，可在任意时刻发起全局视角检查；卷完成自动触发确保每卷结束时都有全局校验，避免遗漏。两者互补，不冲突。 |
| 影响 | 需要实现卷完成检测逻辑，以及手动触发 API 端点 |
| 备选方案 | 仅手动触发 — 依赖用户记得触发，容易遗漏；仅自动触发 — 用户无法在任意时刻发起全局审 |

## D2: 与逐章审互补关系

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 全局审校与逐章审校为互补关系：逐章审先跑，全局审补充跨章节问题。全局审输出的跨章节问题回灌到逐章审校 context 中。 |
| 原因 | 逐章审专注于章内质量，全局审专注于跨章一致性。两者分工明确，避免重复。全局审的结果回灌到逐章审，形成"全局发现问题 → 逐章修复"的闭环。 |
| 影响 | 逐章审校需要支持 global_review_feedback context block 注入 |
| 备选方案 | 全局审替代逐章审 — 丢失章内细节审校能力；全局审与逐章审独立 — 无法形成修复闭环 |

## D3: 角色弧线从 growthPath 推导

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 角色弧线规划数据从 story_macro.growthPath + characterDynamics 推导，不新建角色弧线表 |
| 原因 | story_macro 已包含 growthPath（角色成长轨迹）和 characterDynamics（角色关系变化），足以推导角色弧线。新建表会增加维护成本和数据冗余。 |
| 影响 | context builder 需要从 story_macro 中提取并格式化角色弧线信息（~3K tokens） |
| 备选方案 | 新建 CharacterArc 表 — 数据冗余，且需要额外维护同步逻辑 |

## D4: 320K token budget

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 全局审校总预算为 320K tokens，其中系统 prompt ~2K、全局层 ~8K、章节层 ~300K、预留输出 ~10K |
| 原因 | 320K 足够覆盖大多数模型的上下文窗口，章节层按每章 ~8K 估算可覆盖约 37 章，满足单卷审校需求。超出时自动裁剪。 |
| 影响 | 超过 37 章的卷需要自动裁剪，提示用户"本次覆盖 N 章" |
| 备选方案 | 无限制 — 可能超出模型上下文窗口导致截断；200K — 章节数过少，大卷无法一次审完 |

## D5: 全局审输出格式（crossChapterIssues）

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 全局审输出为 crossChapterIssues 数组，每个 issue 包含 severity、category、description、fixDirection、affectedChapters、primaryFixChapter |
| 原因 | 结构化输出便于程序解析和存入 GlobalReviewIssue 表。primaryFixChapter 字段明确问题应在哪个章节修复，便于回灌到逐章审校。 |
| 影响 | prompt 需要定义严格的输出 schema，解析器需要处理格式异常 |
| 备选方案 | 非结构化文本输出 — 解析困难，容易遗漏问题 |

## D6: 回灌通过 GlobalReviewIssue 表 + context block

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-12 |
| 决策人 | AI |
| 决策 | 跨章节问题通过 GlobalReviewIssue 表持久化，逐章审校时通过 context block "global_review_feedback"（priority 105）注入 |
| 原因 | 持久化到数据库便于追踪问题状态（pending/acknowledged/fixed/dismissed）和跨审校运行对比。context block 方式复用现有审校 context 注入机制，侵入性低。 |
| 影响 | 逐章审校 context builder 需要新增查询 GlobalReviewIssue 和注入 context block 的逻辑 |
| 备选方案 | 内存传递 — 不持久化，跨运行丢失；直接修改章节内容 — 风险太高，不符合"仅输出修复方向"原则 |
