---
description: "DI 依赖注入架构——迁移指南与接口定义"
update_time: 2026-07-10
---

# Dependency Injection — 架构指南

> REQ-7019 产出物。本文件定义项目的 DI 模式、接口约定与迁移路径。

---

## 1. 设计决策

### 为什么选择工厂函数手动注入（而非 tsyringe）

| 维度 | 工厂函数手动注入 | tsyringe |
|------|----------------|----------|
| 外部依赖 | 零 | +2（tsyringe + reflect-metadata） |
| 学习成本 | 低 | 中（装饰器 + 反射） |
| 类型安全 | 高（TypeScript 接口 + 构造函数参数） | 高（装饰器 + Token） |
| 测试友好 | 高（直接传 mock） | 高（容器可替换注册） |
| 调试 | 显式传递，调用栈清晰 | 魔法依赖解析 |

**结论**：当前规模（3-5 个核心 service 改造）不需要 DI 容器的自动依赖解析。手工注入与项目现有模式一致，零外部依赖。

---

## 2. 接口定义

所有接口位于 `server/src/platform/di/interfaces.ts`：

```typescript
import type { IDatabase, ILlmClient, IEventBus } from "../../platform/di";
```

### 2.1 IDatabase

封装 PrismaClient 的 model 子对象访问，使用 `Pick` 类型精确暴露每个 model 的常用方法。

核心 model：
- `novel` — findUnique / findMany / create / update / updateMany / delete / deleteMany / count
- `chapter` — findUnique / findFirst / findMany / create / update / updateMany / delete / deleteMany / count
- `character` — findUnique / findFirst / findMany / create / update / delete / deleteMany / count
- `world` — findUnique / findFirst / findMany / create / update / delete / deleteMany
- `novelBible` — findUnique / findMany / create / update / upsert
- `generationJob` — findUnique / findMany / create / update
- `directorRun` — findUnique / findMany / create / update
- `novelWorkflowTask` — findUnique / findFirst / findMany / create / update / updateMany
- `volumePlan` — findUnique / findFirst / findMany / create / update / delete
- `chapterSummary` — findUnique / findFirst / findMany / create / update / delete

加上 `$transaction` 事务代理。

### 2.2 ILlmClient

```typescript
export interface ILlmClient {
  invoke(input: { systemPrompt?; userPrompt?; messages?; options? }): Promise<string>;
  invokeStructured<T>(input: { systemPrompt?; userPrompt?; messages?; schema; options? }): Promise<T>;
}
```

### 2.3 IEventBus

```typescript
export interface IEventBus {
  on<T>(eventType: string, handler: EventHandler<T>, priority?: number): void;
  off(eventType: string, handler: EventHandler): void;
  emit(event: { type: string; payload: unknown }): Promise<void>;
}
```

---

## 3. Service 改造模式

### 改造原则

1. **向后兼容**：构造函数参数保留默认值，生产代码零改动
2. **渐进式**：按 service 逐个改造，每个改造后立即跑测试
3. **不改变对外行为**：Service 的 public API 签名不变

### 改造模板

```typescript
import type { IDatabase, ILlmClient } from "../../platform/di";
import { prisma } from "../../db/prisma";
import { defaultLlmClient } from "../../llm/defaultLlmClient";

export class SomeService {
  constructor(
    private readonly db: IDatabase = prisma,
    private readonly llm: ILlmClient = defaultLlmClient,
  ) {}

  async doWork(novelId: string) {
    const novel = await this.db.novel.findUnique({ where: { id: novelId } });
    const result = await this.llm.invokeStructured({
      systemPrompt: "...",
      schema: mySchema,
    });
    return result;
  }
}
```

### 改造顺序（Phase 3）

1. `DirectorService`（最复杂的核心 service）
2. `NovelContextService` / `NovelCoreService`
3. `ChapterService`
4. `NovelWorkflowService`
5. `CharacterDynamicsService`

---

## 4. 测试注入模式

### 新模式（推荐）

```typescript
import { SomeService } from "../services/novel/SomeService";

test("doWork uses injected db", async () => {
  const mockDb = {
    novel: {
      findUnique: async () => ({ id: "n1", title: "Test" }),
    },
    chapter: {
      findMany: async () => [],
    },
    // ... other models as needed
  } as unknown as IDatabase;

  const service = new SomeService(mockDb);
  const result = await service.doWork("n1");
  expect(result).toBeDefined();
});
```

### 旧模式（逐步淘汰）

现有 `prismaMock.js` 通过 monkey-patch prisma 单例工作，适用于不使用 DI 的旧测试：

```javascript
const { mockPrismaMethod, withPrismaMock } = require("./helpers/prismaMock.js");
const { prisma } = require("../../dist/db/prisma.js");

await withPrismaMock(prisma.novel, "findUnique", async () => testNovel, async () => {
  // ... test code
});
```

**迁移原则**：新测试一律使用 DI mock，旧测试在修改时顺带迁移。

---

## 5. 文件结构

```
server/src/platform/di/
├── interfaces.ts      # IDatabase, ILlmClient, IEventBus, ILogger
├── index.ts           # barrel export
└── (adapters.ts)      # 真实适配器 — 后续按需添加

server/tests/helpers/
├── prismaMock.js      # monkey-patch 模式 mock（保留兼容）
├── fixtures.js        # 测试数据
├── mockServices.js    # service mock 工厂
└── testDb.js          # 测试数据库
```

---

## 6. 接口扩展指引

当新 service 需要访问 IDatabase 中尚未暴露的 Prisma model 时：

1. 在 `interfaces.ts` 的 `IDatabase` 接口中添加对应 `Pick<PrismaClient["model"], ...>` 声明
2. 在测试 mock 中补充该 model 的 stub
3. 确保 `pnpm typecheck` 和 `pnpm test` 通过

---

## 7. 常见问题

### Q: 为什么不用全局 DI 容器？

A: 项目当前规模下，构造函数注入已足够。全局容器增加隐式依赖和调试复杂度。若未来 service 数量显著增长，可平滑迁移到 tsyringe。

### Q: 如何处理单例依赖（如 prisma）？

A: 默认参数模式 `constructor(db: IDatabase = prisma)` 自动使用单例，测试时显式传入 mock 覆盖。

### Q: prismaMock.js 还能用吗？

A: 可以。现有测试继续使用，新测试优先使用 DI mock。两种方式共存不冲突。
