---
description: "REQ-7019 依赖注入提升可测试性——任务清单"
update_time: 2026-07-10
---

# REQ-7019 任务清单

## Phase 1: 调研与选型

- [ ] 1.1 调研 tsyringe：API 设计、依赖、与项目 TypeScript 配置兼容性
- [ ] 1.2 调研工厂函数手动注入模式：参考项目现有代码模式
- [ ] 1.3 输出选型对比文档（写在 design.md），给出推荐方案
- [ ] 1.4 与用户确认选型决策

## Phase 2: 接口定义与基础设施

- [ ] 2.1 定义核心依赖接口（`IDatabase`、`ILlmClient`、`IEventBus` 等）
- [ ] 2.2 接口文件落位：`server/src/platform/di/interfaces.ts`
- [ ] 2.3 实现真实适配器（`PrismaDatabaseAdapter`、`LlmClientAdapter`）

## Phase 3: 核心 Service 改造

- [ ] 3.1 改造第 1 个 service：构造函数注入 + 保留默认参数（向后兼容）
- [ ] 3.2 改造第 2-3 个 service
- [ ] 3.3 改造第 4-5 个 service
- [ ] 3.4 每改造一个 service 后立即跑相关测试验证

## Phase 4: 测试改写

- [ ] 4.1 改写第 1 批测试（5 个）：用注入 mock 替代 monkey-patch
- [ ] 4.2 改写第 2 批测试（5 个）
- [ ] 4.3 改写第 3 批测试（5 个）
- [ ] 4.4 确保改写后测试全部通过，且覆盖率不下降

## Phase 5: 文档与验证

- [ ] 5.1 编写 DI 迁移指南（`docs/architecture/dependency-injection.md`）
- [ ] 5.2 全量验证：`pnpm typecheck` + `pnpm test`
- [ ] 5.3 验证并行测试安全性（`node --test --concurrency=4 server/tests/`）

---

## DoD

- DI 方案选型文档已产出
- 3-5 个核心 service 已改造为构造函数注入
- 10-15 个测试已改写为注入 mock
- typecheck + 全量测试通过
- 并行测试安全执行
- DI 迁移指南文档已产出
