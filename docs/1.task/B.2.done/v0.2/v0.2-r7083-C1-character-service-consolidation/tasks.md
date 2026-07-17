# 任务清单 — REQ-7083 Character Service Consolidation

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 决策日志已生成
- [x] 未决项已澄清（见 decision_log.md）

## 阶段 1：目录结构搭建

### T1: 建立新目录结构
- [x] 创建 `services/character/preparation/` 子目录
- [x] 创建 `services/character/resource/` 子目录
- [x] 创建 `services/character/consistency/` 子目录
- [x] 创建 `services/character/profile/` 子目录
- [x] 创建 `services/character/arc/` 子目录
- [x] 创建 `services/character/exit/` 子目录

### T2: 创建领域服务框架
- [x] 创建 `CharacterDomainService.ts` 统一入口骨架
- [x] 创建 `CharacterMapper.ts` 统一序列化骨架
- [x] 创建 `services/character/index.ts` facade 导出

## 阶段 2：序列化收敛

### T3: 审计现有序列化实现
- [x] 列出 11 个文件中所有角色数据格式转换函数
- [x] 识别公共字段映射（名称、描述、属性、关系等）
- [x] 识别各子模块特有的序列化需求
- [x] 输出审计报告，确认 CharacterMapper 接口设计

### T4: 实现 CharacterMapper
- [x] 实现核心字段映射方法（toDTO、fromDTO、toPrisma、fromPrisma）
- [x] 实现子模块专用序列化扩展
- [x] 编写 CharacterMapper 单元测试
- [x] `pnpm typecheck` 通过

## 阶段 3：代码迁移

### T5: 迁移 characterPrep → preparation
- [x] 移动 6 个文件到 `services/character/preparation/`
- [x] 更新文件内部导入路径（相对路径和绝对路径）
- [x] 替换内联序列化调用为 CharacterMapper
- [x] 处理 `characterPreparationSupplemental.ts` 的 13 处内联 prompt

### T6: 迁移 characterResource → resource
- [x] 移动 4 个文件到 `services/character/resource/`
- [x] 更新文件内部导入路径
- [x] 替换内联序列化调用为 CharacterMapper

### T7: 迁移 novel/characters → arc
- [x] 移动 2 个文件到 `services/character/arc/`
- [x] 更新文件内部导入路径
- [x] 替换内联序列化调用为 CharacterMapper

### T8: 迁移 characterProfile → profile
- [x] 移动文件到 `services/character/profile/`
- [x] 更新文件内部导入路径

### T9: 迁移 characterExit → exit
- [x] 移动文件到 `services/character/exit/`
- [x] 更新文件内部导入路径

### T10: 迁移 characterConsistency → consistency
- [x] 移动文件到 `services/character/consistency/`
- [x] 更新文件内部导入路径

### T11: 整合现有 services/character/ 的 5 个文件
- [x] 评估 5 个文件在新结构中的位置
- [x] 基础 CRUD 逻辑保留在领域服务根层或整合到 CharacterDomainService
- [x] 库同步、生成逻辑归入对应子目录

## 阶段 4：内联 Prompt 迁移

### T12: 审计内联 prompt
- [x] 确认全部 23 处内联 prompt 位置
- [x] 按功能分类（角色生成、画像描摹、退场推断等）

### T13: 迁移 prompt 到 prompting/ 体系
- [x] 为每类 prompt 创建 PromptAsset
- [x] 在 `prompting/registry.ts` 注册
- [x] 替换原内联调用为 registry 引用
- [x] 验证 prompt 语义不变

## 阶段 5：导入路径全量更新

### T14: 搜索并更新旧导入路径
- [x] `grep` 全仓库搜索 `services/novel/characterPrep`
- [x] `grep` 全仓库搜索 `services/novel/characterResource`
- [x] `grep` 全仓库搜索 `services/novel/characters`（区分 novel 角色上下文）
- [x] `grep` 全仓库搜索 `services/novel/characterProfile`
- [x] `grep` 全仓库搜索 `services/novel/characterExit`
- [x] `grep` 全仓库搜索 `characterConsistency`
- [x] 逐处更新为新路径
- [x] `pnpm typecheck` 确认零残留

## 阶段 6：验证

### T15: 类型检查与构建
- [x] `pnpm typecheck` 零错误
- [x] `pnpm build` 成功

### T16: 测试验证
- [x] `pnpm test` 全量通过
- [x] `pnpm --filter @ai-novel/server test:routes` 通过
- [x] 手动验证核心角色流程（创建角色、生成阵容、角色弧线）

### T17: 最终检查
- [x] 确认所有旧目录路径不再被 import
- [x] 确认 `services/character/` 结构符合设计文档
- [x] 确认 CharacterMapper 被所有角色子模块使用

## 阶段 7：收尾

### T18: 文档与提交
- [x] 更新 `run_result.json` 状态为 `done`
- [x] 更新 `tasks.md` 所有任务勾选
- [x] 更新 `README.md` 状态
- [x] 提交变更
