---
description: "REQ-7026 构建链模块系统统一 — 任务拆解"
---

# REQ-7026 任务拆解

> 状态：待激活

## 任务概述

### 1. 来源

架构诊断报告 2026-07-10 第9条发现。shared/client 用 ESNext，server/desktop 用 CommonJS。路径别名指向 dist，prisma:generate 不在 build 链中。

### 2. 问题

开发迭代繁琐（改 shared → build shared → 重启 server），模块系统分裂增加认知负担和潜在互操作风险。

### 3. 需求

研究型任务包。调研 tsx/Project References 可行性，评估迁移方案，交付评估报告和迁移计划。

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| T1 | 调研 tsx 运行时生产环境可行性 | P0 | 3h | 待开始 |
| T2 | CJS/ESM 互操作兼容性测试 | P0 | 2h | 待开始 |
| T3 | 评估 TypeScript 5.9 Project References | P1 | 2h | 待开始 |
| T4 | 搭建 tsx server 原型（实验分支） | P1 | 3h | 待开始 |
| T5 | prisma:generate 加入 prebuild hook | P0 | 30min | 待开始 |
| T6 | 迁移 ROI 分析与 go/no-go 建议 | P0 | 2h | 待开始 |
| T7 | 撰写综合评估报告 + 迁移路线图 | P0 | 2h | 待开始 |

---

## 逐项展开

### T1: 调研 tsx 运行时生产环境可行性

**目标**: 通过基准测试和社区调研，评估 tsx 作为 server 生产运行时的可行性。

**调研内容**:
1. 基准测试：
   - 搭建同进程、同请求量的测试环境（tsx vs tsc + node）
   - 测量 RSS 内存占用（30 分钟运行稳态值）
   - 测量冷启动时间（重复 10 次取 P50/P95）
   - 测量请求延迟（P50/P95/P99）
2. 社区调研：
   - tsx 有无企业级生产部署案例？
   - GitHub issues 中是否有内存泄漏或 GC 问题的报告？
   - npm 下载量趋势（判断社区活跃度）
3. 与项目现有工具的兼容性：
   - LangChain / LangGraph 在 tsx 下的表现
   - Prisma 在 tsx 下的表现
   - Express 5 在 tsx 下的表现

**交付物**: 基准测试数据表格 + 社区调研摘要 + 兼容性初步结论

---

### T2: CJS/ESM 互操作兼容性测试

**目标**: 盘点 server 所有依赖，识别 CJS-only 包，测试 tsx 下互操作行为。

**调研内容**:
1. 使用工具（如 `are-the-types-wrong` 或手动 grep `package.json` exports 字段）盘点所有 CJS-only 依赖
2. 对每个 CJS-only 依赖：
   - 测试 `import` 语法能否正确导入（tsx 自动 CJS/ESM 转换）
   - 测试 `default` export 是否正常
   - 测试 named export 是否正常
3. 记录不兼容项，评估每个不兼容项的解决方案（升级依赖 / 替代包 / wrapper module）

**交付物**: 兼容性矩阵（依赖 × 兼容性 + 不兼容项 + 解决方案）

---

### T3: 评估 TypeScript 5.9 Project References

**目标**: 评估 Project References 是否能替代当前路径别名方案，实现"改 shared 源码 → server 自动感知"。

**调研内容**:
1. 研究 TypeScript 5.9 Project References 文档
2. 对比当前方案（路径别名 → shared/dist）和 Project References 方案：
   - 开发体验（类型即时可用 vs 需 build）
   - VS Code 智能提示支持
   - CI/CD 中的构建复杂度
   - 跨包类型传递的可靠性
3. 实验：在独立分支配置 Project References，验证 shared → server 的类型传递
4. 评估当前路径别名方案是否可以直接替换

**交付物**: 方案对比表 + 实验结论 + 推荐方案

---

### T4: 搭建 tsx server 原型（实验分支）

**目标**: 在独立分支创建 tsx 运行的 server 原型，验证所有功能正常。

**改动点**（仅实验分支，不合并）:
- 修改 `server/tsconfig.json`：module 改为 ESNext，moduleResolution 改为 bundler
- 修改 `server/package.json`：`start` 脚本改为 `tsx src/app.ts`
- 修改路径别名：`@ai-novel/shared/*` 指向源码而非 dist
- 运行全量测试：`pnpm test`
- 验证关键功能流程：启动服务器 → 创建小说 → 生成世界 → 生成章节

**交付物**: 原型验证结果（通过/失败 + 发现的问题清单）

---

### T5: prisma:generate 加入 prebuild hook

**目标**: 修改 `server/package.json`，确保 `prisma generate` 在 build 前自动执行。

**改动点**:
- `server/package.json` — 添加 `"prebuild": "prisma generate"`
- 验证：删除 `node_modules/.prisma` → `pnpm build` → prisma client 自动生成

**交付物**: 已验证的 prebuild hook

---

### T6: 迁移 ROI 分析与 go/no-go 建议

**目标**: 综合 T1~T5 的调研结果，做成本收益分析并给出 go/no-go 建议。

**分析维度**:
1. 开发效率提升估算：当前开发迭代周期 vs 迁移后周期
2. 一次性迁移成本：代码改造量 + 测试验证量 + 文档更新量
3. 风险量化：CJS 互操作风险概率 × 影响面
4. 维护成本变化：统一模块系统后的长期维护收益

**交付物**: ROI 分析矩阵 + go/no-go 建议（附理由）

---

### T7: 撰写综合评估报告 + 迁移路线图

**目标**: 汇总所有调研结果，输出综合评估报告和（如 go）分阶段迁移路线图。

**报告结构**:
1. 现状概述
2. tsx 可行性评估（含基准测试数据）
3. CJS 互操作风险评估（含兼容性矩阵）
4. Project References 评估
5. 原型验证结果
6. ROI 分析
7. go/no-go 建议
8. 迁移路线图（如 go）：
   - Phase 1: 基础设施准备（prebuild hook、CI 更新）
   - Phase 2: server ESM 迁移（模块系统切换）
   - Phase 3: desktop 跟随迁移
   - 每阶段的工作量、风险、rollback 方案

**交付物**: `docs_dev/2.tech/analysis/2026-07-10-build-chain-unification-report.md`

---

## DoD

- tsx 可行性评估报告完成（含基准测试数据）
- CJS 互操作兼容性矩阵完成
- Project References 对比评估完成
- tsx server 原型验证完成（通过 or 问题已记录）
- prisma:generate prebuild hook 已添加并验证
- go/no-go 建议已完成
- 综合评估报告 + 迁移路线图已输出
- 所有调研文档落位 `docs_dev/2.tech/analysis/`

---

## 验证步骤

1. 基准测试数据可复现（记录测试环境和命令）
2. 兼容性矩阵覆盖所有 server 依赖
3. tsx 原型验证结果可复现（提供分支和操作步骤）
4. prebuild hook 验证通过
5. 评估报告完整且包含明确建议

---

## 完成判定

- T1~T7 全部完成且 DoD 全部满足后，REQ-7026 达到"已完成"状态。
