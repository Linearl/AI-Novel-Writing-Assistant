---
description: "REQ-7023 测试目录重构与覆盖率接入 —— 需求文档"
update_time: 2026-07-10
---

# REQ-7023 测试目录重构与覆盖率接入

## 基本信息

| 字段 | 内容 |
|------|------|
| 需求编号 | REQ-7023 |
| 优先级 | P2 |
| 版本 | 0.1 |
| 状态 | 📋 待办 |
| 来源 | 2026-07-10 全量架构诊断报告 第6条发现 |

---

## 1. 背景与问题

server/tests/ 目录结构混乱：
- ~220 个测试文件平铺在根目录，仅字母排序
- 集成测试和单元测试混在一起，无法快速区分
- 无覆盖率工具，不知道哪些代码被测试覆盖
- 测试跑在编译后 dist/ CJS 上，需先 build，反馈循环慢

**不改会怎样**：测试文件持续增长，查找定位越来越难；新模块加测试时无目录规范可依；覆盖率盲区可能导致未测试的代码路径进入生产。

---

## 2. 目标与范围

### 2.1 目标

1. 按领域重构测试目录结构：`tests/director/`、`tests/novel/`、`tests/prompting/` 等
2. 引入覆盖率工具（c8 或 Node 22+ `--experimental-test-coverage`）
3. 评估 `tsx + node --test` 直接跑 TypeScript 源的可行性（减少构建步骤）
4. 在 CI/pre-commit 中配置覆盖率门禁（初期 50%，逐步提升至 80%）

### 2.2 In Scope

- `server/tests/` 目录结构重组
- 覆盖率工具选型与接入
- CI 覆盖率门禁配置
- 评估 tsx 方案

### 2.3 Out of Scope

- 不写新测试（只重组现有测试 + 接入覆盖率）
- 不修改 client/ 端测试
- 不改变测试框架（继续使用 Node.js built-in test runner）

---

## 3. 需求详情

### 3.1 测试目录重构方案

**目标结构**：

```
server/tests/
├── agents/          # Agent 相关测试
├── director/        # Auto-director 相关测试
├── graphs/          # LangGraph 图编排测试
├── llm/             # LLM 客户端测试
├── novel/           # Novel service 测试
├── prompting/       # Prompt 系统测试
├── routes/          # API 路由测试
├── runtime/         # Runtime orchestrator 测试
├── tools/           # 工具测试
├── utils/           # 测试助手/工具函数
└── fixtures/        # 测试 fixtures
```

**迁移策略**：增量迁移，不是一次性全部挪动。每批迁移一个领域后验证 CI 通过再继续下一批。

### 3.2 覆盖率工具选型

候选方案：
| 方案 | 优点 | 缺点 |
|------|------|------|
| c8 | 成熟稳定，V8 直接插桩 | 需依赖安装 |
| Node 22+ `--experimental-test-coverage` | 内置，零依赖 | 实验性 flag，指标粗糙 |
| nyc (istanbul) | 最成熟 | 较重，配置复杂 |

推荐：优先 c8（成熟 + 轻量），备选 Node 22+ 内置方案。

### 3.3 tsx + node --test 评估

验证是否可以直接用 tsx 将 .test.ts 作为 ESM/TypeScript 源运行，跳过 build 步骤。

需验证：
- TypeScript 装饰器支持情况
- Prisma client 导入兼容性
- 与已有 `server/tests/` 的 `tsconfig.json` 兼容性

### 3.4 CI 覆盖率门禁

```json
// 初期配置
{
  "coverageThreshold": {
    "lines": 50,
    "branches": 50,
    "functions": 50,
    "statements": 50
  }
}
```

第二期目标：70%，最终目标：80%。

---

## 4. 验收标准

- [ ] `server/tests/` 按领域分级，不再是平铺结构
- [ ] 覆盖率报告可生成（`pnpm test:coverage` 命令可用）
- [ ] tsx + node --test 评估结论文档化（可/不可行 + 理由）
- [ ] CI 覆盖率门禁 50% 已配置
- [ ] 现有所有测试仍通过
- [ ] `pnpm typecheck` 通过

---

## 5. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 大量文件移动导致 import 路径断裂 | 每批迁移后全局 grep + CI 验证 |
| 覆盖率工具与 CJS 编译后代码不兼容 | 先验证 c8 + source map 正确映射 |
| tsx 方案不可行 | 记录原因，维持现有 build 流程 |
| 迁移过程中并行开发冲突 | 分批迁移，每批快速合并 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
|------|------|------|
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
