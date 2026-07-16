---
description: "REQ-7064 决策日志"
update_time: 2026-07-14
---

# 决策日志 — Service DI 迁移

## 决策 1：沿用手工注入，不引入 DI 容器

- **决策点**：是否引入 tsyringe 等 DI 容器
- **选择**：不引入，沿用 REQ-7019 定义的构造函数手工注入模式
- **理由**：5 个 Service 规模不需要容器；零外部依赖；与项目现有风格一致
- **日期**：2026-07-14

## 决策 2：逐 Service 改造，ChapterService 先行

- **决策点**：改造顺序
- **选择**：ChapterService → NovelContextService → NovelCoreService → NovelWorkflowService → CharacterDynamicsService → DirectorService
- **理由**：从最简单的 CRUD Service 开始验证改造模式，积累经验后再处理复杂的 DirectorService
- **日期**：2026-07-14

## 决策 3：IEventBus 本次不注入

- **决策点**：是否一并注入 IEventBus
- **选择**：不注入，当前 5 个 Service 均未使用事件总线
- **理由**：YAGNI，保留扩展空间但不提前注入
- **日期**：2026-07-14

## 决策 4：旧 prismaMock 测试不强制迁移

- **决策点**：是否一次性迁移所有使用 prismaMock 的旧测试
- **选择**：不强制，标记 deprecated，修改时顺带迁移
- **理由**：降低本次改动范围，避免不必要的回归风险
- **日期**：2026-07-14
