# 任务清单 — REQ-7079 Prompts YAML 清理与内联 Prompt 迁移

## 阶段 0：需求确认

- [ ] 需求文档已生成
- [ ] 设计文档已生成
- [ ] 任务清单已生成

## 阶段 1：YAML Prompt 迁移

### T1: 迁移 character-refine.yaml → character.refine PromptAsset
- [ ] 读取 `prompts/character-refine.yaml` 内容
- [ ] 创建 `prompting/character/characterRefine.ts` PromptAsset
- [ ] 在 `prompting/registry.ts` 中注册 `character.refine`
- [ ] 更新 `data/prompts/` 调用方改为 `getPromptAsset('character.refine')`
- [ ] `pnpm typecheck` 通过

### T2: 迁移 llm-json-repair.yaml → llm.json-repair PromptAsset
- [ ] 读取 `prompts/llm-json-repair.yaml` 内容
- [ ] 创建 `prompting/llm/llmJsonRepair.ts` PromptAsset
- [ ] 在 `prompting/registry.ts` 中注册 `llm.json-repair`
- [ ] 更新调用方代码
- [ ] `pnpm typecheck` 通过

### T3: 迁移 novel-character-extraction.yaml → novel.character-extraction PromptAsset
- [ ] 读取 `prompts/novel-character-extraction.yaml` 内容
- [ ] 创建 `prompting/novel/novelCharacterExtraction.ts` PromptAsset
- [ ] 在 `prompting/registry.ts` 中注册 `novel.character-extraction`
- [ ] 更新调用方代码
- [ ] `pnpm typecheck` 通过

## 阶段 2：内联 Prompt 迁移

### T4: 迁移意图解析 prompt（intentPromptSupport.ts）
- [ ] 创建 `prompting/agent/intentParse.ts` PromptAsset
- [ ] 定义 context 接口接收动态变量（INTENT_NAMES、input.goal 等）
- [ ] 更新 `agents/planner/intentPromptSupport.ts` 改为调用 PromptAsset
- [ ] 验证意图解析功能保持一致
- [ ] `pnpm typecheck` 通过

### T5: 迁移人名提取 prompt（characterPreparationSupplemental.ts:412）
- [ ] 创建 `prompting/character/characterPrepNameExtraction.ts` PromptAsset
- [ ] 在 `prompting/registry.ts` 中注册
- [ ] 更新 `characterPreparationSupplemental.ts` line 412 调用 PromptAsset
- [ ] 验证人名提取功能保持一致
- [ ] `pnpm typecheck` 通过

### T6: 迁移人名修正 prompt（characterPreparationSupplemental.ts:435）
- [ ] 创建 `prompting/character/characterPrepNameRepair.ts` PromptAsset
- [ ] 使用 slots 处理动态变量（validNames、allInvalid）
- [ ] 更新 `characterPreparationSupplemental.ts` lines 435-448 调用 PromptAsset
- [ ] 验证人名修正功能保持一致
- [ ] `pnpm typecheck` 通过

### T7: 迁移 refine user prompt（characterPreparationSupplemental.ts:639）
- [ ] 评估是否合并到现有 `character.refine.prompt.ts` 或创建独立 prompt
- [ ] 创建或更新 PromptAsset
- [ ] 更新 `characterPreparationSupplemental.ts` lines 639-647 调用 PromptAsset
- [ ] 验证角色调整功能保持一致
- [ ] `pnpm typecheck` 通过

## 阶段 3：清理旧文件

### T8: 删除旧 prompt 加载系统
- [ ] 确认 `server/src/data/prompts/` 无其他用途
- [ ] 删除 `server/src/prompts/` 目录（3 个 YAML 文件）
- [ ] 删除 `server/src/data/prompts/` 旧加载器
- [ ] 更新可能引用了旧加载器的其他文件

## 阶段 4：验证

### T9: 全量验证
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm test` 全部通过
- [ ] 手动确认 `prompts/` 目录已删除
- [ ] 手动确认 `data/prompts/` 已清理
- [ ] 验证所有迁移的 prompt 功能与迁移前一致

## 阶段 5：收尾

### T10: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
