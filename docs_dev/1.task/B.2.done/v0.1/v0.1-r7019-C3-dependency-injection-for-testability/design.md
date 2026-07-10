---
description: "REQ-7019 依赖注入提升可测试性——技术设计"
update_time: 2026-07-10
---

# REQ-7019 技术设计

## 方案对比

### 候选方案

| 维度 | tsyringe | 工厂函数手动注入 |
|------|----------|-----------------|
| 学习成本 | 中（需了解装饰器 + reflect-metadata） | 低（纯 TypeScript 接口） |
| 依赖引入 | tsyringe + reflect-metadata | 零外部依赖 |
| 类型安全 | 高（装饰器 + Token 注入） | 高（TypeScript 接口 + 构造函数参数） |
| 测试友好 | 高（容器可替换注册） | 高（直接传 mock 对象） |
| 侵入性 | 中（需 `@injectable()` 装饰器） | 低（仅改构造函数签名） |
| 扩展性 | 高（自动解析依赖图） | 中（需手动管理依赖图） |
| 调试难度 | 中（魔法依赖解析） | 低（显式传递，调用栈清晰） |

### 推荐方案：工厂函数手动注入

**理由**：
1. 零外部依赖，不改变构建流程
2. 与项目现有 TypeScript 模式一致
3. 依赖关系显式可见，调试友好
4. 满足当前需求（3-5 个 service），不引入过度抽象
5. 未来如需自动注入可平滑迁移到 tsyringe

---

## 架构设计

### 依赖接口层

```
server/src/platform/di/
├── interfaces.ts       # IDatabase, ILlmClient, IEventBus 等
├── adapters.ts         # PrismaDatabaseAdapter, LlmClientAdapter
└── index.ts            # facade 导出
```

### Service 改造模式

```typescript
// interfaces.ts
export interface IDatabase {
  novel: Pick<PrismaClient["novel"], "findUnique" | "findMany" | "create" | "update">;
  chapter: Pick<PrismaClient["chapter"], "findUnique" | "findMany" | "create">;
  // ... 按需暴露
}

export interface ILlmClient {
  invoke(prompt: string, options?: LlmOptions): Promise<string>;
  invokeStructured<T>(prompt: string, schema: ZodSchema<T>): Promise<T>;
}

// directorService.ts
export class DirectorService {
  constructor(
    private db: IDatabase = prisma,
    private llm: ILlmClient = defaultLlmClient
  ) {}

  async runPipeline(novelId: string) {
    const novel = await this.db.novel.findUnique({ where: { id: novelId } });
    // ...
  }
}
```

**默认参数策略**：构造函数参数提供真实实现的默认值，生产代码无需改动构造函数调用，测试代码显式传入 mock。

### 测试注入模式

```typescript
// 测试中
import { DirectorService } from "../services/novel/director/DirectorService";

test("runPipeline creates chapters", async () => {
  const mockDb = {
    novel: {
      findUnique: async () => ({ id: "n1", title: "测试小说" }),
    },
    chapter: {
      create: async () => ({ id: "c1" }),
    },
  };
  const mockLlm = {
    invoke: async () => "生成的内容",
    invokeStructured: async () => ({}),
  };

  const service = new DirectorService(mockDb as any, mockLlm as any);
  await service.runPipeline("n1");
});
```

---

## 改造顺序

1. 定义接口（`IDatabase`、`ILlmClient`）
2. 改造 `DirectorService`（最复杂的核心 service）
3. 改造相关子 service（2-4 个）
4. 逐步改写测试

---

## 验证方案

1. 改造后：`pnpm typecheck` 通过
2. 改造后：`pnpm test` 通过（所有测试绿色）
3. 新测试：注入 mock 的测试不依赖 `prismaMock.js`
4. 并行测试：`node --test --concurrency=4 server/tests/` 通过
