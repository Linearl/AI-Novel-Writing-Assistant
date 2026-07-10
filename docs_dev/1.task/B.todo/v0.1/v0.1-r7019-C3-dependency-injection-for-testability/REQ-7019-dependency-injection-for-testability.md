---
description: "REQ-7019 依赖注入提升可测试性——需求文档"
update_time: 2026-07-10
---

# REQ-7019 依赖注入提升可测试性

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7019 |
| 优先级 | P1 |
| 版本 | 0.1 |
| 状态 | 📋 待办 |
| 来源 | 架构诊断报告 2026-07-10 第2条发现 |

---

## 1. 背景与问题

全项目无 DI 容器。测试通过 `prismaMock.js` 直接 monkey-patch Prisma 方法，存在以下问题：

1. **脆弱**：monkey-patch 耦合 Prisma 内部实现，Prisma 升级可能破坏 mock
2. **非线程安全**：并行测试时 monkey-patch 可能互相覆盖
3. **无法 mock Prisma 以外的依赖**：LLM 客户端、文件系统、外部 API 等依赖无法被 mock
4. **测试与实现紧耦合**：测试必须知道 service 内部使用了哪些 Prisma 方法

`server/tests/helpers/prismaMock.js` 提供 `mockPrismaMethod` / `mockPrismaModel` / `withPrismaMock` 三个工具函数，是当前唯一可用的 mock 机制。

**不改会怎样**：
- 测试脆弱性随代码增长而加剧
- 新增 service 无法编写独立单元测试
- 并行测试无法安全执行
- 无法对 AI 调用链做确定性测试

---

## 2. 目标与范围

### 2.1 目标

1. 评估轻量 DI 方案（tsyringe 或工厂函数手动注入），选型并记录决策
2. 从 director 核心模块开始引入 DI：改造 3-5 个核心 service 的构造函数接收依赖接口
3. 改写 10-15 个相关测试使用注入 mock 替代 monkey-patch
4. 制定 DI 迁移指南，覆盖后续模块

### 2.2 In Scope

**后端**：
- DI 方案调研文档（tsyringe vs. 工厂函数注入 vs. InversifyJS）
- `server/src/services/novel/director/` — 核心 service 改造（3-5 个）
- 依赖接口定义（`IDatabase`、`ILlmClient` 等）
- `server/tests/` — 相关测试改写（10-15 个）
- DI 迁移指南文档（`docs/architecture/dependency-injection.md`）

### 2.3 Out of Scope

- 不做全套 IoC 容器（不需要装饰器驱动的自动注入）
- 不改造全部 service（分阶段推进，本次仅 director 核心）
- 不修改前端代码
- 不引入运行时 DI 框架的额外构建步骤

---

## 3. 需求详情

### 3.1 DI 方案选型

WHEN 评估 DI 方案，THE SYSTEM SHALL 对比以下选项：

| 方案 | 优点 | 缺点 |
|------|------|------|
| tsyringe | 成熟、装饰器驱动 | 需 reflect-metadata、装饰器开销 |
| 工厂函数手动注入 | 零依赖、简单直接 | 需手动管理依赖图 |
| InversifyJS | 功能完整 | 过于重量级 |

推荐倾向：工厂函数手动注入（构造函数接收接口参数），渐进式引入。

### 3.2 Service 改造模式

```typescript
// 改造前
class DirectorService {
  async runPipeline(novelId: string) {
    const novel = await prisma.novel.findUnique({ where: { id: novelId } });
    // ... 直接依赖 prisma 全局单例
  }
}

// 改造后
interface IDatabase {
  novel: PrismaClient["novel"];
  // ... 其他模型
}

class DirectorService {
  constructor(private db: IDatabase, private llm: ILlmClient) {}
  
  async runPipeline(novelId: string) {
    const novel = await this.db.novel.findUnique({ where: { id: novelId } });
    // ... 通过注入的依赖操作
  }
}
```

### 3.3 测试改写模式

```typescript
// 改造前：monkey-patch
mockPrismaMethod("novel.findUnique", mockNovel);
const service = new DirectorService();

// 改造后：注入 mock
const mockDb = { novel: { findUnique: mockFn } };
const mockLlm = { invoke: mockLlmFn };
const service = new DirectorService(mockDb, mockLlm);
```

---

## 4. 验收标准

- [ ] DI 方案选型文档已产出（选型结论 + 决策理由）
- [ ] 3-5 个 director 核心 service 已改造为构造函数注入
- [ ] 依赖接口定义清晰（`IDatabase`、`ILlmClient` 等）
- [ ] 10-15 个相关测试已改写为注入 mock，不再使用 monkey-patch
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过（改写后的测试全部绿色）
- [ ] DI 迁移指南文档已产出

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 改造破坏现有功能 | 分批改造，每批后跑全量测试 |
| 接口定义不准确 | 从现有调用推导接口，迭代完善 |
| 并行测试时 mock 状态污染 | 每个测试独立创建 mock 实例 |
| 装饰器引入 reflect-metadata | 优先使用工厂函数注入，避免装饰器 |
