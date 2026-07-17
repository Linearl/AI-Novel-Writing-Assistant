# 任务清单 - REQ-7079 Prompts YAML 清理与内联 Prompt 迁移

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 任务清单已生成

## 阶段 1：YAML Prompt 迁移

### T1: 迁移 character-refine.yaml -> character.refine PromptAsset
- [x] 读取 `prompts/character-refine.yaml` 内容
- [x] 创建 `prompting/prompts/character/characterRefine.prompts.ts` PromptAsset
- [x] 在 `prompting/registry.ts` 中注册 `character.refine@v1`
- [x] 更新 `characterPreparationSupplemental.ts` 调用方改为导入 `characterRefineSystemPrompt` + `characterRefinePrompt.render()`
- [x] `pnpm typecheck` 通过

### T2: 迁移 llm-json-repair.yaml -> llm.json-repair PromptAsset
- [x] 读取 `prompts/llm-json-repair.yaml` 内容
- [x] 创建 `prompting/prompts/llm/llmJsonRepair.prompts.ts` PromptAsset（新建 llm/ 目录）
- [x] 在 `prompting/registry.ts` 中注册 `llm.json-repair@v1`
- [x] 更新 `structuredInvokeRepair.ts` 调用方改为导入 `llmJsonRepairSystemPrompt`
- [x] `pnpm typecheck` 通过

### T3: 迁移 novel-character-extraction.yaml -> novel.character-extraction PromptAsset
- [x] 读取 `prompts/novel-character-extraction.yaml` 内容
- [x] 创建 `prompting/prompts/novel/novelCharacterExtraction.prompts.ts` PromptAsset
- [x] 在 `prompting/registry.ts` 中注册 `novel.character-extraction@v1`
- [x] 更新 `novelCoreCharacterService.ts` 调用方改为导入 `novelCharacterExtractionSystemPrompt`
- [x] `pnpm typecheck` 通过

## 阶段 2：内联 Prompt 迁移

### T4: 迁移意图解析 prompt（intentPromptSupport.ts）
- [x] 确认 `planner.intent.parse@v1` PromptAsset 已注册（`plannerIntent.prompt.ts`）
- [x] `intentPromptSupport.ts` 是 prompt builder helper（非 service 文件），prompt 通过 PromptAsset 消费
- [x] 意图解析功能保持一致（planner 62 测试通过）
- [x] `pnpm typecheck` 通过

### T5: 迁移人名提取 prompt（characterPreparationSupplemental.ts:412）
- [x] 创建 `prompting/prompts/character/characterPrepNameExtraction.prompts.ts` PromptAsset
- [x] 在 `prompting/registry.ts` 中注册 `character.prepNameExtraction@v1`
- [x] 更新 `characterPreparationSupplemental.ts` 导入 `characterPrepNameExtractionSystemPrompt`
- [x] 验证人名提取功能保持一致
- [x] `pnpm typecheck` 通过

### T6: 迁移人名修正 prompt（characterPreparationSupplemental.ts:435）
- [x] 创建 `prompting/prompts/character/characterPrepNameRepair.prompts.ts` PromptAsset
- [x] 使用 PromptAsset render input 处理动态变量（validNamesText、invalidNamesText、candidatesJson）
- [x] 更新 `characterPreparationSupplemental.ts` 调用 `characterPrepNameRepairPrompt.render()`
- [x] 验证人名修正功能保持一致
- [x] `pnpm typecheck` 通过

### T7: 迁移 refine user prompt（characterPreparationSupplemental.ts:639）
- [x] 合并到 `characterRefinePrompt`（render 包含 system + user 消息）
- [x] 更新 `characterPreparationSupplemental.ts` 调用 `characterRefinePrompt.render()` 获取完整消息
- [x] 验证角色调整功能保持一致
- [x] `pnpm typecheck` 通过

## 阶段 3：清理旧文件

### T8: 删除旧 prompt 加载系统
- [x] 确认 `server/src/data/prompts/` 无其他用途（grep 零残留引用）
- [x] 删除 `server/src/prompts/` 目录（3 个 YAML 文件）
- [x] 删除 `server/src/data/prompts/` 旧加载器（index.ts、loader.ts、renderer.ts、types.ts）
- [x] 确认无其他文件引用旧加载器

## 阶段 4：验证

### T9: 全量验证
- [x] `pnpm typecheck` 零错误
- [x] tools 测试 94 通过、planner 测试 62 通过
- [x] 手动确认 `prompts/` 目录已删除
- [x] 手动确认 `data/prompts/` 已清理
- [x] 验证所有迁移的 prompt 功能与迁移前一致（prompt 文本逐字迁移，行为不变）
- [x] governance 测试 "registered prompt assets auditable" 通过（确认新 prompt 已注册）

## 阶段 5：收尾

### T10: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
