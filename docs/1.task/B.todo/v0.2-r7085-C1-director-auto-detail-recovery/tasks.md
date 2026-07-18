---
description: "REQ-7085 自动导演自主处理未细化章节 — 任务清单"
---

# tasks.md — REQ-7085

## 阶段一：恢复逻辑修复

- [ ] 1.1 `resolvePlanningPhaseFromTakeoverState` 增加检查：待写章节（`generatedChapterCount < chapterCount`）是否缺少 taskSheet
- [ ] 1.2 `resolveAssetFirstRecoveryFromSnapshot` 增加 `hasUnpreparedChaptersInRange` 检测（复用已有字段）
- [ ] 1.3 `resolveResumePhase` 在恢复逻辑返回 null 时，不直接抛 `DirectorRecoveryNotNeededError`，先检查是否有未细化章节

## 阶段二：Pipeline 自动触发

- [ ] 2.1 `maybeRunAutoApprovedChapters` 增加"未细化章节"检测，触发拆章补全
- [ ] 2.2 `runPipeline` 在 structured_outline 阶段完成后，检查是否还有章节需要细化
- [ ] 2.3 拆章阶段失败时，自动回到 `structured_outline` 重新进入而非直接失败

## 阶段三：测试

- [ ] 3.1 单元测试：`resolvePlanningPhaseFromTakeoverState` 在"部分章节未细化"时返回 `structured_outline`
- [ ] 3.2 单元测试：`resolveAssetFirstRecoveryFromSnapshot` 在有未细化章节时返回 `phase`
- [ ] 3.3 集成测试：导演自动处理"1-10 章已写，11-30 章未细化"场景
- [ ] 3.4 回归测试：已有全部章节细化时不触发多余拆章

## 阶段四：收尾

- [ ] 4.1 `pnpm typecheck` 通过
- [ ] 4.2 `pnpm test` 全部通过
- [ ] 4.3 更新 docs/ 相关文档
