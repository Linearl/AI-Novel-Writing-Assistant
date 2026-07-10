# REQ-2048 氛围写作参考卡 — 任务总表

> status: requirements_ready
> updated: 2026-07-10

## 阶段零：前置确认

- [x] 需求澄清与 grill-me 盘问完成（15 个决策点全部确认）
- [x] 编号分配：REQ-2048，2xxx 核心功能开发
- [x] 任务包骨架已建

## 任务列表

### T1: Prisma Schema — 新增 AtmosphereCard 表

- 依赖：无
- DoD：两个 schema 文件同步更新，migration 生成成功，typecheck 通过
- 估时：0.5h
- 状态：pending

### T2: 氛围卡 MD 文件 — 从 OCR 素材提取并结构化

- 依赖：无
- DoD：`server/src/data/atmosphereCards/` 目录下 15 个 MD 文件，全部含 frontmatter + body
- 估时：2h
- 状态：pending

### T3: AtmosphereCardService + FileToDbSyncService 集成

- 依赖：T1, T2
- DoD：`AtmosphereCardService` 支持 list/get/toggle/toggleAll；`FileToDbSyncService` 新增 `syncAtmosphereCardsFromFileSystem()`
- 估时：1.5h
- 状态：pending

### T4: 修复 Prompt 生成器 — 氛围匹配 + 注入逻辑

- 依赖：T3
- DoD：`server/src/prompting/prompts/atmosphereCard/` 下新增 prompt；AI 输出 `matched[]` + `suggestedNew[]`；注入结构为 氛围 > 技法 > 引擎
- 估时：2h
- 状态：pending

### T5: 后端 API — 氛围卡 CRUD + 启停路由

- 依赖：T3
- DoD：`/api/atmosphere-cards` 路由提供 list/get/toggle/toggleAll
- 估时：1h
- 状态：pending

### T6: 前端路由 + 侧边栏 + Tab 页

- 依赖：T5
- DoD：路由 `/atmosphere-cards`；侧边栏写法引擎与反AI规则之间；支持卡片列表/详情/启停/关联技法跳转
- 估时：2h
- 状态：pending

### T7: 审校修复流程集成 — ChapterRepairStreamRuntime 挂载

- 依赖：T4, T5
- DoD：修复阶段触发氛围匹配；注入修复 prompt；匹配失败+建议写入运行日志不阻断
- 估时：1.5h
- 状态：pending

### T8: Bootstrap 同步 + 端到端验证

- 依赖：T1-T7
- DoD：启动时自动同步；端到端验证通过
- 估时：1h
- 状态：pending

---

## 预估总工时：11.5h

## 依赖图

```
T1 ──→ T3 ──→ T4 ──→ T7 ──→ T8
      ↗              ↗
T2 ──┘              │
                T5 ──→ T6 ──┘
```
