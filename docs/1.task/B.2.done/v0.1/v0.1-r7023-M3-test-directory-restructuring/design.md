---
description: "REQ-7023 测试目录重构与覆盖率接入 —— 技术设计"
update_time: 2026-07-10
---

# REQ-7023 技术设计

## 架构变更

### 变更前（当前状态）

```
server/tests/
├── agentFooTest.test.js
├── agentBarTest.test.js
├── directorBazTest.test.js
├── novelQuxTest.test.js
├── ... (~220 个文件平铺)
└── helpers/
```

### 变更后（目标状态）

```
server/tests/
├── agents/
│   ├── agentFooTest.test.js
│   └── agentBarTest.test.js
├── director/
│   └── directorBazTest.test.js
├── novel/
│   └── novelQuxTest.test.js
├── prompting/
├── routes/
├── runtime/
├── tools/
├── utils/
│   └── helpers/
└── fixtures/
```

---

## 实施阶段

### Phase 1: 方案设计

1. 对 ~220 个测试文件进行领域归类（按文件名/内容分析）
2. 制定目录结构方案
3. 确认覆盖率工具选型（c8 vs Node 22+ 内置）
4. tsx + node --test 可行性验证

### Phase 2: 增量迁移

逐领域迁移测试文件：
1. 创建目标子目录
2. 使用 `git mv` 移动文件（保留 git history）
3. 更新测试文件内部 import 路径（相对路径可能变化）
4. 运行该领域测试确认通过
5. 提交，继续下一领域

**推荐迁移顺序**（按文件数量从少到多）：tools/ → routes/ → prompting/ → llm/ → agents/ → novel/ → director/ → runtime/

### Phase 3: 覆盖率接入

1. 安装 c8 或配置 Node 22+ `--experimental-test-coverage`
2. 配置 `package.json` 新增 `test:coverage` script
3. 生成首份覆盖率报告
4. 配置 CI 覆盖率门禁（50% 阈值）

### Phase 4: CI 集成与规则固化

1. 更新 CI pipeline 加入覆盖率检查
2. 文档化测试目录规范（写入 CLAUDE.md / docs/architecture/testing.md）

---

## 覆盖率工具选择

| 项目 | c8 | Node 22 内置 |
|------|-----|-------------|
| 依赖 | 需安装 npm 包 | 零依赖 |
| 成熟度 | 生产就绪 | 实验性 |
| 报告格式 | text/html/lcov | text/html |
| 源映射 | CJS source map | 要求原生 ESM |
| 推荐 | ✅ 首选（与 CJS dist/ 兼容） | 备选（需 esm flag） |

**最终选择**：优先 c8。原因：项目当前跑测试在 CJS dist/ 上，c8 对 CJS + source map 的支持最成熟。

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 相对 import 路径断裂 | 高 | 低 | git mv 保留历史 + grep 验证 + CI |
| 覆盖率初始值过低（<50%） | 中 | 低 | 50% 为初期值，接受当前实际 |
| tsx 与 Prisma 不兼容 | 中 | 中 | 先最小化验证，失败则记录原因 |
| 迁移与并行开发冲突 | 低 | 高 | 分批迁移，每批合并窗口短 |

---

## 验证方案

1. 每批迁移后运行该领域测试 + typecheck
2. 全部迁移完成后 `pnpm test` 全量通过
3. `pnpm test:coverage` 生成报告
4. CI 覆盖率检查正确触发（不阻断为预期，但需报告）
