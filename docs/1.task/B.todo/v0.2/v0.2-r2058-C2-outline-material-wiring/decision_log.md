---
description: "REQ-2058 决策留痕"
update_time: 2026-07-18
---
# REQ-2058 决策留痕

| 日期 | 决策 | 理由 |
| --- | --- | --- |
| 2026-07-18 | outline 通过 buildCommonNovelContext 注入（而非单独 context block） | 与 v1 行为一致；一处改动覆盖所有卷生成步骤；outline 是 book_contract 的一部分，语义上属于"小说契约" |
| 2026-07-18 | material_index 设为 preferred 而非 required | 材料系统可选（用户可能未上传任何材料）；不阻断无材料场景的正常生成 |
| 2026-07-18 | B2 两轮加载在 orchestrator 层实现，不改 invokeStructuredLlm | REQ-2054 设计决策延续；保持核心调用链稳定；两轮逻辑仅在卷生成层 |
| 2026-07-18 | 首期覆盖 4 个步骤（strategy/beatSheet/chapterList/chapterDetail） | 这 4 个步骤最需要用户素材参考；critique/skeleton/rebalance 可后续按需扩展 |
| 2026-07-18 | 独立任务包而非追加到 REQ-2054 | REQ-2054 已归档（status: done）；本任务包有独立的范围和验收标准 |
| 2026-07-18 | 卷生成步骤 INPUT 上下文预算统一放宽至 3000 | 原预算 1600-1800 在无 outline 时设定；加入 outline + material_index 后需要更大空间；3000 与 directorBlueprint（2400）同级偏上 |
