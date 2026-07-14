---
description: "REQ-7064 Service 层 DI 依赖注入迁移"
update_time: 2026-07-14
---

# REQ-7064 Service 层 DI 依赖注入迁移

> 状态：🚧 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7064 |
| 优先级 | P1 |
| 来源 | 技术债审计，[dependency-injection.md](../../../2.tech/architecture/dependency-injection.md) |
| 关联需求 | REQ-7019（DI 架构设计与接口定义） |

---

## 1. 背景与问题

`server/src/platform/di/interfaces.ts` 已定义 `IDatabase`、`ILlmClient`、`IEventBus` 接口，`mockServices.js` 已创建，但 5 个核心 Service 仍在直接 import prisma 单例和 `defaultLlmClient`，无法在测试中注入 mock，导致：

- 单元测试依赖 monkey-patch（`prismaMock.js`），隔离性差，难以覆盖数据库交互边界
- Service 之间隐式耦合，重构和替换实现困难
- 无法为不同环境（测试/dev/prod）注入不同实现

不改的后果：测试永远打不穿 Service 与真实 DB 的边界，重构风险持续累积。

---

## 2. 目标与范围

### 2.1 目标

1. 5 个核心 Service 全部改为构造函数注入，默认值保持向后兼容
2. 新测试使用 DI mock，覆盖 80%+ 行分支
3. 旧 `prismaMock.js` 测试在修改时顺带迁移，不强制一次性全改

### 2.2 In Scope

**后端 Service 改造**（按优先级）：
- `DirectorService`（最复杂，自动导演核心）
- `NovelContextService` / `NovelCoreService`（小说上下文管理）
- `ChapterService`（章节 CRUD）
- `NovelWorkflowService`（工作流状态机）
- `CharacterDynamicsService`（角色动态）

**测试迁移**：
- 新增 DI mock 测试，每个 Service 至少覆盖核心业务路径
- `prismaMock.js` 不删除，标记为 legacy

### 2.3 Out of Scope

- 不引入 DI 容器（tsyringe 等），手工注入已足够
- 不改造上述 5 个之外的 Service
- 不改变任何 Service 的 public API 签名
- 不改造 `ILlmClient` 的具体实现类

---

## 3. 需求详情

### 3.1 Service 改造模式

每个 Service 改造遵循统一模式：

```typescript
import type { IDatabase, ILlmClient } from "../../platform/di";
import { prisma } from "../../db/prisma";
import { defaultLlmClient } from "../../llm/defaultLlmClient";

export class SomeService {
  constructor(
    private readonly db: IDatabase = prisma,
    private readonly llm: ILlmClient = defaultLlmClient,
  ) {}
}
```

关键约束：
- **默认参数**：`= prisma` / `= defaultLlmClient`，生产代码零改动
- **不改 public API**：所有现有调用方无需修改
- **只注入实际使用的依赖**：不是每个 Service 都需要全部接口

### 3.2 测试迁移模式

新测试使用 DI mock：

```typescript
const mockDb = {
  novel: { findUnique: async () => ({ id: "n1", title: "Test" }) },
  chapter: { findMany: async () => [] },
} as unknown as IDatabase;

const service = new SomeService(mockDb);
```

### 3.3 改造顺序与依赖

| 顺序 | Service | 复杂度 | 依赖接口 |
|------|---------|--------|---------|
| 1 | DirectorService | 高 | IDatabase + ILlmClient |
| 2 | NovelContextService | 中 | IDatabase |
| 3 | NovelCoreService | 中 | IDatabase |
| 4 | ChapterService | 低 | IDatabase |
| 5 | NovelWorkflowService | 中 | IDatabase |
| 6 | CharacterDynamicsService | 中 | IDatabase |

---

## 4. 验收标准

1. **接口符合性**：5 个 Service 均通过 `IDatabase` / `ILlmClient` 接口注入（`pnpm typecheck` 通过）
2. **向后兼容**：现有调用方无需任何修改，所有现有测试继续通过（`pnpm test` 通过）
3. **测试覆盖**：每个 Service 新增 DI mock 单测，覆盖核心业务路径（行覆盖率 ≥ 80%）
4. **prismaMock 标记**：`prismaMock.js` 添加 `@deprecated` 注释，说明新测试使用 DI mock

---

## 5. 风险与未决项

| 项目 | 说明 |
|------|------|
| DirectorService 事务边界 | `$transaction` 在 `IDatabase` 中已暴露，需确认 DirectorService 的事务用法是否完整覆盖 |
| IEventBus 是否需要注入 | 当前 5 个 Service 未使用事件总线，本次不注入，保留扩展空间 |
| `defaultLlmClient` 可测试性 | 当前作为模块级单例导出，测试时可通过构造函数参数覆盖，无需改造导出方式 |
