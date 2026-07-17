# README — REQ-7079 Prompts YAML 清理与内联 Prompt 迁移

- **编号**: REQ-7079
- **标题**: Prompts YAML 清理 + 内联 Prompt 迁移到 prompting/ 体系
- **优先级**: S3
- **版本**: 0.2
- **状态**: requirements_ready
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

将 3 个遗留 YAML prompt 和 4 处 service 内联 prompt 迁移到 `prompting/` 治理体系（PromptAsset + registry），然后删除旧 `prompts/` + `data/prompts/` 加载系统。

**Part A: YAML Prompt 迁移**（3 个）
- character-refine.yaml → character.refine PromptAsset
- llm-json-repair.yaml → llm.json-repair PromptAsset
- novel-character-extraction.yaml → novel.character-extraction PromptAsset

**Part B: 内联 Prompt 迁移**（4 处）
- intentPromptSupport.ts 意图解析 prompt
- characterPreparationSupplemental.ts 人名提取/修正/refine prompt

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7079-prompts-yaml-cleanup.md | ✅ |
| REQ-7079-prompts-yaml-cleanup-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
