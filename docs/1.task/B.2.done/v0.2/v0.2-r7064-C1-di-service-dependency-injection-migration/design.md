---
description: "REQ-7064 Service DI 迁移方案设计"
update_time: 2026-07-14
---

# 设计文档 — Service 层 DI 依赖注入迁移

## 1. 架构决策

### 决策：构造函数手工注入（沿用 REQ-7019）

**选择**：构造函数参数注入，默认值绑定单例
**替代方案**：tsyringe 容器自动注入（已排除，见 REQ-7019 对比表）
**理由**：项目规模（5 个 Service）不需要容器的自动解析；手工注入零外部依赖，与现有模式一致

### 决策：逐 Service 改造，不批量重写

**选择**：每次改造一个 Service → 跑测试 → 提交 → 下一个
**理由**：降低回归风险，每步可验证，出问题容易定位

---

## 2. 接口复用

直接使用 `server/src/platform/di/interfaces.ts` 已有接口：

```typescript
// IDatabase — 封装 PrismaClient model 访问
// ILlmClient — invoke / invokeStructured
// IEventBus — on / off / emit（本次不注入，保留扩展）
```

不新增接口，不修改现有接口定义。

---

## 3. 各 Service 改造要点

### DirectorService（复杂度：高）

- 注入：`IDatabase` + `ILlmClient`
- 特殊点：使用 `$transaction`，需确认 `IDatabase.$transaction` 覆盖其事务用法
- 改造影响面：最广，自动导演核心，需最严格测试

### NovelContextService / NovelCoreService（复杂度：中）

- 注入：`IDatabase`
- 两个 Service 共享小说上下文加载逻辑，改造时注意接口一致性

### ChapterService（复杂度：低）

- 注入：`IDatabase`
- 标准 CRUD，改造最简单，适合作为改造模板验证

### NovelWorkflowService（复杂度：中）

- 注入：`IDatabase`
- 工作流状态机，状态转换逻辑需完整覆盖

### CharacterDynamicsService（复杂度：中）

- 注入：`IDatabase`
- 角色动态计算，注意与 NovelContextService 的数据依赖

---

## 4. 测试策略

### 新测试模式（DI mock）

```typescript
// 每个 Service 测试文件顶部定义 mockDb
const mockDb = {
  novel: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    // ...按需补充
  },
  chapter: { findMany: jest.fn() },
} as unknown as IDatabase;

const service = new ChapterService(mockDb);
```

### 旧测试处理

- `prismaMock.js` 添加 `@deprecated`，不删除
- 现有使用 `prismaMock.js` 的测试在被修改时顺带迁移
- 不强制一次性迁移所有旧测试

---

## 5. 回滚策略

每个 Service 改造独立提交，回滚粒度为单个 commit：

```
git revert <single-service-commit>
```

构造函数默认值确保回滚后生产代码行为不变。
