# 任务清单 — REQ-7077 超大文件拆分

## 阶段 0：需求确认

- [ ] 需求文档已生成
- [ ] 设计文档已生成
- [ ] 任务清单已生成

## 阶段 1：P1 — Shared 层拆分

### T1: 拆分 shared/types/novel.ts (1208行)
- [ ] 分析 novel.ts 现有结构，确定拆分边界
- [ ] 创建 novel-core.ts / novel-volume.ts / novel-chapter.ts / novel-outline.ts
- [ ] 创建 novel.ts facade re-export
- [ ] 更新所有 import 路径（如需）
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm typecheck` 通过

### T2: 拆分 shared/types/styleEngine.ts (856行)
- [ ] 创建 styleEngine-config.ts / styleEngine-analysis.ts / styleEngine-adaptation.ts
- [ ] 创建 styleEngine.ts facade re-export
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm typecheck` 通过

### T3: 拆分 shared/types/novelDirector.ts (810行)
- [ ] 创建 novelDirector-pipeline.ts / novelDirector-snapshot.ts / novelDirector-cursor.ts
- [ ] 创建 novelDirector.ts facade re-export
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm typecheck` 通过

### T4: 拆分 shared/types/directorWorkflowStepCatalogData.ts (706行)
- [ ] 创建 workflowStep-basic.ts / workflowStep-structured.ts
- [ ] 创建原文件 facade re-export
- [ ] `pnpm --filter @ai-novel/shared build` 通过
- [ ] `pnpm typecheck` 通过

## 阶段 2：P2 — Server 层拆分

### T5: 拆分 chapterLayeredContextHelpers.ts (1046行)
- [ ] 创建 context-layer-character.ts / context-layer-world.ts / context-layer-plot.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过
- [ ] 运行相关测试

### T6: 拆分 NovelPromptMaterialExporter.ts (771行)
- [ ] 创建 exporter-section.ts / exporter-assembly.ts / exporter-format.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

### T7: 拆分 fallback.ts (731行)
- [ ] 创建 fallback-recovery.ts / fallback-retry.ts / fallback-escalation.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

### T8: 拆分 DirectorRuntimeStore.ts (727行)
- [ ] 创建 runtimeStore-session.ts / runtimeStore-cursor.ts / runtimeStore-metadata.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

### T9: 拆分 NovelWorldInstanceService.ts (711行)
- [ ] 创建 worldInstance-crud.ts / worldInstance-validation.ts / worldInstance-query.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

### T10: 拆分 registry.ts (704行)
- [ ] 创建 registry-novel.ts / registry-character.ts / registry-world.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

### T11: 拆分 novelDirectorAutoExecutionRuntime.ts (700行)
- [ ] 创建 autoRuntime-init.ts / autoRuntime-execute.ts / autoRuntime-checkpoint.ts
- [ ] 创建 facade re-export
- [ ] `pnpm typecheck` 通过

## 阶段 3：P3 — Client 层拆分

### T12: 拆分 TaskCenterPage.tsx (724行)
- [ ] 创建 TaskCenterFilters.tsx / TaskCenterList.tsx / TaskCenterDetail.tsx
- [ ] 重构 TaskCenterPage.tsx 为主框架
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test:client` 通过

### T13: 拆分 NovelWorkspaceRail.tsx (704行)
- [ ] 创建 WorkspaceRailNav.tsx / WorkspaceRailPanel.tsx
- [ ] 重构 NovelWorkspaceRail.tsx 为主框架
- [ ] `pnpm typecheck` 通过

### T14: 拆分 NovelExistingProjectTakeoverDialog.tsx (700行)
- [ ] 创建 TakeoverForm.tsx / TakeoverValidation.tsx
- [ ] 重构对话框为主框架
- [ ] `pnpm typecheck` 通过

## 阶段 4：验证

### T15: 全量验证
- [ ] `pnpm build` 全量构建通过
- [ ] `pnpm test:all` 全部测试通过
- [ ] `pnpm typecheck` 零新增错误

## 阶段 5：收尾

### T16: 文档与提交
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更
