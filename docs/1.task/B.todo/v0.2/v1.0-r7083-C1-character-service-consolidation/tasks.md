# 任务清单 — REQ-7083 Character Service Consolidation

## 阶段 0：需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 决策日志已生成
- [ ] 未决项已澄清（见 decision_log.md）

## 阶段 1：目录结构搭建

### T1: 建立新目录结构
- [ ] 创建 `services/character/preparation/` 子目录
- [ ] 创建 `services/character/resource/` 子目录
- [ ] 创建 `services/character/consistency/` 子目录
- [ ] 创建 `services/character/profile/` 子目录
- [ ] 创建 `services/character/arc/` 子目录
- [ ] 创建 `services/character/exit/` 子目录

### T2: 创建领域服务框架
- [ ] 创建 `CharacterDomainService.ts` 统一入口骨架
- [ ] 创建 `CharacterMapper.ts` 统一序列化骨架
- [ ] 创建 `services/character/index.ts` facade 导出

## 阶段 2：序列化收敛

### T3: 审计现有序列化实现
- [ ] 列出 11 个文件中所有角色数据格式转换函数
- [ ] 识别公共字段映射（名称、描述、属性、关系等）
- [ ] 识别各子模块特有的序列化需求
- [ ] 输出审计报告，确认 CharacterMapper 接口设计

### T4: 实现 CharacterMapper
- [ ] 实现核心字段映射方法（toDTO、fromDTO、toPrisma、fromPrisma）
- [ ] 实现子模块专用序列化扩展
- [ ] 编写 CharacterMapper 单元测试
- [ ] `pnpm typecheck` 通过

## 阶段 3：代码迁移

### T5: 迁移 characterPrep → preparation
- [ ] 移动 6 个文件到 `services/character/preparation/`
- [ ] 更新文件内部导入路径（相对路径和绝对路径）
- [ ] 替换内联序列化调用为 CharacterMapper
- [ ] 处理 `characterPreparationSupplemental.ts` 的 13 处内联 prompt

### T6: 迁移 characterResource → resource
- [ ] 移动 4 个文件到 `services/character/resource/`
- [ ] 更新文件内部导入路径
- [ ] 替换内联序列化调用为 CharacterMapper

### T7: 迁移 novel/characters → arc
- [ ] 移动 2 个文件到 `services/character/arc/`
- [ ] 更新文件内部导入路径
- [ ] 替换内联序列化调用为 CharacterMapper

### T8: 迁移 characterProfile → profile
- [ ] 移动文件到 `services/character/profile/`
- [ ] 更新文件内部导入路径

### T9: 迁移 characterExit → exit
- [ ] 移动文件到 `services/character/exit/`
- [ ] 更新文件内部导入路径

### T10: 迁移 characterConsistency → consistency
- [ ] 移动文件到 `services/character/consistency/`
- [ ] 更新文件内部导入路径

### T11: 整合现有 services/character/ 的 5 个文件
- [ ] 评估 5 个文件在新结构中的位置
- [ ] 基础 CRUD 逻辑保留在领域服务根层或整合到 CharacterDomainService
- [ ] 库同步、生成逻辑归入对应子目录

## 阶段 4：内联 Prompt 迁移

### T12: 审计内联 prompt
- [ ] 确认全部 23 处内联 prompt 位置
- [ ] 按功能分类（角色生成、画像描摹、退场推断等）

### T13: 迁移 prompt 到 prompting/ 体系
- [ ] 为每类 prompt 创建 PromptAsset
- [ ] 在 `prompting/registry.ts` 注册
- [ ] 替换原内联调用为 registry 引用
- [ ] 验证 prompt 语义不变

## 阶段 5：导入路径全量更新

### T14: 搜索并更新旧导入路径
- [ ] `grep` 全仓库搜索 `services/novel/characterPrep`
- [ ] `grep` 全仓库搜索 `services/novel/characterResource`
- [ ] `grep` 全仓库搜索 `services/novel/characters`（区分 novel 角色上下文）
- [ ] `grep` 全仓库搜索 `services/novel/characterProfile`
- [ ] `grep` 全仓库搜索 `services/novel/characterExit`
- [ ] `grep` 全仓库搜索 `characterConsistency`
- [ ] 逐处更新为新路径
- [ ] `pnpm typecheck` 确认零残留

## 阶段 6：验证

### T15: 类型检查与构建
- [ ] `pnpm typecheck` 零错误
- [ ] `pnpm build` 成功

### T16: 测试验证
- [ ] `pnpm test` 全量通过
- [ ] `pnpm --filter @ai-novel/server test:routes` 通过
- [ ] 手动验证核心角色流程（创建角色、生成阵容、角色弧线）

### T17: 最终检查
- [ ] 确认所有旧目录路径不再被 import
- [ ] 确认 `services/character/` 结构符合设计文档
- [ ] 确认 CharacterMapper 被所有角色子模块使用

## 阶段 7：收尾

### T18: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
