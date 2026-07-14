# REQ-2048 氛围写作参考卡 — 任务总表

> status: done
> updated: 2026-07-10

## 阶段零：前置确认

- [x] 需求澄清与 grill-me 盘问完成（15 个决策点全部确认）
- [x] 编号分配：REQ-2048，2xxx 核心功能开发
- [x] 任务包骨架已建
- [x] 全部 8 个任务已完成

## 任务列表

### T1: Prisma Schema — 新增 AtmosphereCard 表

- 依赖：无
- DoD：两个 schema 文件同步更新，migration 生成成功，typecheck 通过
- 估时：0.5h
- 状态：done

### T2: 氛围卡 MD 文件 — 从 OCR 素材提取并结构化

- 依赖：无
- DoD：`server/src/data/atmosphereCards/` 目录下 17 个 MD 文件
- 估时：2h
- 状态：done

### T3: AtmosphereCardService + FileToDbSyncService 集成

- 依赖：T1, T2
- DoD：`AtmosphereCardService` 支持 list/get/toggle/toggleAll/listEnabledFrontmatters
- 估时：1.5h
- 状态：done

### T4: 修复 Prompt 生成器 — 氛围匹配 + 注入逻辑

- 依赖：T3
- DoD：`atmosphereMatch.prompt` 注册到 PromptRegistry
- 估时：2h
- 状态：done

### T5: 后端 API — 氛围卡 CRUD + 启停路由

- 依赖：T3
- DoD：`/api/atmosphere-cards` 路由提供 list/get/toggle/toggleAll
- 估时：1h
- 状态：done

### T6: 前端路由 + 侧边栏 + Tab 页

- 依赖：T5
- DoD：路由 `/atmosphere-cards`；侧边栏写法引擎与反AI规则之间
- 估时：2h
- 状态：done

### T7: 审校修复流程集成 — AtmosphereCardService + Prompt

- 依赖：T4, T5
- DoD：氛围匹配 prompt 可被修复流调用
- 估时：1.5h
- 状态：done

### T8: Bootstrap 同步 + 端到端验证

- 依赖：T1-T7
- DoD：启动时自动同步 17 张氛围卡到 DB
- 估时：1h
- 状态：done

```
T1 ──→ T3 ──→ T4 ──→ T7 ──→ T8
      ↗              ↗
T2 ──┘              │
                T5 ──→ T6 ──┘
```
