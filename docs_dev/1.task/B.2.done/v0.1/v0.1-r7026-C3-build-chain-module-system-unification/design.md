---
description: "REQ-7026 构建链模块系统统一 — 方案设计"
---

# REQ-7026 方案设计

## 1. 方案概述

这是一个研究型任务包，核心思路是：先在独立分支实验 + 基准测试，得出数据驱动的结论，再形成迁移计划。不做盲目实施。

### 1.1 设计目标

1. 通过数据驱动决策（基准测试），不做主观判断
2. 实验在独立分支进行，不影响主分支
3. 最终交付可操作的迁移路线图（含 rollback 方案）
4. 即使 go/no-go 是 "no-go"，任务包也有明确交付价值（避免未来重复评估）

### 1.2 关键决策

1. **研究先行**：不预设"一定要迁移"，先调研再决策
2. **实验隔离**：tsx 原型在独立分支创建，不污染主分支
3. **数据驱动**：内存/启动时间/请求延迟用基准测试数据说话
4. **ROI 分析**：迁移成本必须小于长期收益

### 1.3 不在范围

- 不做实际生产迁移（如 go，迁移是后续独立任务包）
- 不做 client 迁移（client 已是 ESNext + Vite）
- 不做 Docker/CI/CD 迁移

## 2. 调研设计

### 2.1 tsx 基准测试方案

**测试环境**：
- 同一台机器，Node.js 20.x LTS
- server 启动后运行 30 分钟稳态再采样
- 使用 `process.memoryUsage().rss` 每 10s 采样一次
- 使用 `wrk` 或 `autocannon` 对 health endpoint 施压（100 req/s）

**对比组**：
| 组 | 运行时 | 启动方式 |
|----|--------|----------|
| A（当前） | tsc → node dist/app.js | `tsc && node dist/app.js` |
| B（实验） | tsx | `tsx src/app.ts` |

**测量指标**：
| 指标 | 测量方法 | 目标 |
|------|----------|------|
| 冷启动时间 | `time` 命令，10 次取 P50/P95 | B < A × 2 |
| 稳态 RSS 内存 | 30 分钟后 5 分钟采样平均值 | B < A × 1.15 |
| 请求延迟 P50 | autocannon 30s | B ~= A |
| 请求延迟 P99 | autocannon 30s | B ~= A |

### 2.2 CJS 互操作测试方案

**依赖盘点**：
```bash
# 列出所有 server 依赖
cd server && node -e "const p = require('./package.json'); Object.keys(p.dependencies).forEach(d => console.log(d))"
```

对每个依赖，检查其 `package.json` 的 `type` 字段和 `exports` 配置：
- 有 `"type": "module"` → ESM 原生支持，无风险
- 无 `"type": "module"` 且 exports 中有 `import` → 双模支持，低风险
- 无 `"type": "module"` 且 exports 中无 `import` → CJS-only，高风险

对高风险依赖，在 tsx 下测试 `import` 行为。

### 2.3 Project References 实验方案

在独立分支中：
1. 修改 `server/tsconfig.json`，添加 `references: [{ path: "../shared" }]`
2. 修改 `shared/tsconfig.json`，添加 `composite: true`
3. 修改 server 的路径别名，从 `../shared/dist/*` 改为 `../shared/src/*`
4. 验证：`tsc --build` 自动编译 shared + server
5. 验证 VS Code 智能提示是否正常

### 2.4 调研文档落位

所有调研产出统一放在 `docs_dev/2.tech/analysis/` 下：

```
docs_dev/2.tech/analysis/
├── 2026-07-10-build-chain-unification-report.md    # 综合评估报告
├── 2026-07-10-tsx-benchmark-data.md                 # 基准测试数据
├── 2026-07-10-cjs-interop-matrix.md                 # CJS 兼容性矩阵
└── 2026-07-10-project-references-evaluation.md      # Project References 评估
```

## 3. 接口定义

无新增 API 接口。

## 4. 数据模型

无数据库变更。

## 5. 异常处理

| 场景 | 处理方式 |
| ---- | -------- |
| tsx 基准测试中 server 启动失败 | 检查 tsx 版本兼容性，记录错误日志 |
| 某 CJS 依赖在 tsx 下完全不可用 | 标记为 blocker，评估替代方案 |
| Project References 与路径别名冲突 | 记录冲突详情，评估是否可用 references 替代别名 |
| 迁移 ROI 为负 | 明确输出 no-go 建议，附理由 |
| tsx 原型中功能回归 | 记录回归清单，评估修复成本 |

## 6. 验证策略

1. 基准测试数据可复现（记录精确的环境、命令、参数）
2. 兼容性矩阵覆盖所有 server `dependencies`
3. tsx 原型通过全量测试
4. 评估报告包含明确结论和可操作建议
