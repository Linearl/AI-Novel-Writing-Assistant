---
id: REQ-7083
title: "Character Service Consolidation"
status: requirements_ready
priority: C1
version: "1.0"
created: "2026-07-17"
updated: "2026-07-17"
---

# REQ-7083 — Character Service Consolidation

## 1. 目标

将分散在 7 个目录、11 个文件中的角色相关代码统一收敛到 `services/character/` 领域服务下，消除序列化碎片化，建立统一的 CharacterMapper 层，并将内联 prompt 迁移到 `prompting/` 体系。

## 2. 范围

### 包含

- 建立 `services/character/` 领域服务目录结构
- 创建 `CharacterDomainService.ts` 统一入口
- 创建 `CharacterMapper.ts` 统一序列化/DTO 层
- 迁移 `services/novel/characterPrep/` (6 文件) → `services/character/preparation/`
- 迁移 `services/novel/characterResource/` (4 文件) → `services/character/resource/`
- 迁移 `services/novel/characters/` (2 文件) → `services/character/arc/`
- 迁移 `services/novel/characterProfile/` → `services/character/profile/`
- 迁移 `services/novel/characterExit/` → `services/character/exit/`
- 迁移 `services/characterConsistency/` → `services/character/consistency/`
- 合并现有 `services/character/` 的 5 个文件到新的领域服务结构
- 消除 11 个文件中的独立序列化实现，收敛到 CharacterMapper
- 处理 `characterPreparationSupplemental.ts` 的 13 处内联 prompt 及其他文件共 23 处内联 prompt
- 更新所有跨模块的导入路径

### 不包含

- 角色功能的业务逻辑重写
- API 接口变更
- 数据库 Schema 变更

## 3. 非目标

- 不改变角色功能的对外行为
- 不引入新的角色子模块
- 不修改 Prisma Schema

## 4. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | `services/character/` 目录包含统一入口 `CharacterDomainService.ts` 和 `CharacterMapper.ts` |
| AC-2 | 所有 7 个原有角色目录的代码已迁移到 `services/character/` 对应子目录下 |
| AC-3 | CharacterMapper 提供统一的角色数据序列化/DTO 接口，替代分散在 11 个文件中的独立实现 |
| AC-4 | 23 处内联 prompt 已迁移到 `server/src/prompting/` 体系并注册到 registry |
| AC-5 | 所有跨模块导入路径已更新，旧路径不再被引用 |
| AC-6 | `pnpm typecheck` 零错误 |
| AC-7 | `pnpm test` 全量通过 |
| AC-8 | `pnpm build` 成功 |

## 5. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 导入路径变更数量大，容易遗漏 | 高 | 使用 grep 全仓库搜索旧路径，确保零残留 |
| 序列化逻辑合并可能改变行为 | 高 | 先提取现有序列化逻辑的测试用例，再统一 |
| 内联 prompt 迁移影响生成质量 | 中 | 保持语义不变，仅改变存放位置和注册方式 |
| 迁移过程中并行开发冲突 | 中 | 优先完成迁移，暂缓其他角色相关开发 |

## 6. 依赖

- 前置依赖：内联 prompt 迁移建议先处理或与之一并处理（本任务中一并处理 `characterPreparationSupplemental.ts` 的 13 处内联 prompt）
