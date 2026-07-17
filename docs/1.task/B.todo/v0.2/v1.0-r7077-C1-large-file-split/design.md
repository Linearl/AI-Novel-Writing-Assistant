# 设计文档 — REQ-7077 超大文件拆分

## 1. 超大文件清单

### P1 — Shared 层（4 个）

| 文件 | 行数 | 拆分策略 |
|------|------|----------|
| `shared/types/novel.ts` | 1208 | 按领域拆分为 novel-core.ts（基础 CRUD 类型）、novel-volume.ts（卷相关）、novel-chapter.ts（章节相关）、novel-outline.ts（大纲相关），novel.ts 作为 facade re-export |
| `shared/types/styleEngine.ts` | 856 | 按功能拆分为 styleEngine-config.ts（配置类型）、styleEngine-analysis.ts（分析类型）、styleEngine-adaptation.ts（适配类型），styleEngine.ts 作为 facade |
| `shared/types/novelDirector.ts` | 810 | 按阶段拆分为 novelDirector-pipeline.ts（流水线类型）、novelDirector-snapshot.ts（快照类型）、novelDirector-cursor.ts（游标类型），novelDirector.ts 作为 facade |
| `shared/types/directorWorkflowStepCatalogData.ts` | 706 | 按步骤分组拆分为 workflowStep-basic.ts（基础步骤）、workflowStep-structured.ts（结构化步骤），原文件作为 facade |

### P2 — Server 层（7 个）

| 文件 | 行数 | 拆分策略 |
|------|------|----------|
| `server/src/services/novel/director/helpers/chapterLayeredContextHelpers.ts` | 1046 | 按层次拆分为 context-layer-character.ts、context-layer-world.ts、context-layer-plot.ts，helpers 文件作为 facade |
| `server/src/services/novel/director/export/NovelPromptMaterialExporter.ts` | 771 | 按导出阶段拆分为 exporter-section.ts、exporter-assembly.ts、exporter-format.ts，主文件作为 facade |
| `server/src/services/novel/director/fallback.ts` | 731 | 按回退策略拆分为 fallback-recovery.ts、fallback-retry.ts、fallback-escalation.ts，fallback.ts 作为 facade |
| `server/src/services/novel/director/runtime/DirectorRuntimeStore.ts` | 727 | 按存储域拆分为 runtimeStore-session.ts、runtimeStore-cursor.ts、runtimeStore-metadata.ts，主文件作为 facade |
| `server/src/services/world/NovelWorldInstanceService.ts` | 711 | 按操作类型拆分为 worldInstance-crud.ts、worldInstance-validation.ts、worldInstance-query.ts，主文件作为 facade |
| `server/src/prompting/registry.ts` | 704 | 按 Prompt 类别拆分为 registry-novel.ts、registry-character.ts、registry-world.ts，registry.ts 作为 facade |
| `server/src/services/novel/director/runtime/novelDirectorAutoExecutionRuntime.ts` | 700 | 按生命周期拆分为 autoRuntime-init.ts、autoRuntime-execute.ts、autoRuntime-checkpoint.ts，主文件作为 facade |

### P3 — Client 层（3 个）

| 文件 | 行数 | 拆分策略 |
|------|------|----------|
| `client/src/pages/TaskCenterPage.tsx` | 724 | 拆分为 TaskCenterPage.tsx（主页面框架）、TaskCenterFilters.tsx（过滤组件）、TaskCenterList.tsx（列表组件）、TaskCenterDetail.tsx（详情面板） |
| `client/src/components/NovelWorkspaceRail.tsx` | 704 | 拆分为 NovelWorkspaceRail.tsx（主框架）、WorkspaceRailNav.tsx（导航区）、WorkspaceRailPanel.tsx（面板区） |
| `client/src/components/NovelExistingProjectTakeoverDialog.tsx` | 700 | 拆分为 TakeoverDialog.tsx（对话框框架）、TakeoverForm.tsx（表单）、TakeoverValidation.tsx（校验逻辑） |

## 2. 拆分原则

1. **单向依赖**：子模块可以依赖父模块的类型，不能反向依赖
2. **Facade 模式**：原文件保留为 index.ts，re-export 所有子模块的公共 API
3. **功能内聚**：每个子模块职责单一，按功能域而非文件类型拆分
4. **保持接口**：外部调用方的 import 路径不变（通过 facade 实现），仅当必要时更新导入路径

## 3. 测试策略

- 每个阶段拆分完成后立即运行类型检查和测试
- 类型检查通过后验证构建
- 全部完成后运行全量测试
