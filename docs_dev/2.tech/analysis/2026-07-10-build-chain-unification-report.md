---
description: "REQ-7026 构建链模块系统统一 — 综合评估报告与迁移路线图"
---

# 构建链模块系统统一 — 综合评估报告

## 1. 现状概述

### 1.1 当前构建链架构

```
shared (ESM)        → tsc → dist/ (ESM)
                              ↓ (路径别名)
server (CJS)        → tsc → dist/ (CJS)
                              ↓
desktop (CJS)       → tsc → dist/ (CJS)

client (ESM)        → Vite → dist/ (ESM)
                    (直接引用 shared 源码)
```

### 1.2 核心问题

| 问题 | 影响 |
|------|------|
| shared/client 用 ESNext，server/desktop 用 CommonJS | 模块系统分裂，认知负担 |
| server 的 `@ai-novel/shared/*` 指向 `shared/dist/*` | 改 shared 必须手动 build shared |
| prisma:generate 不在 build 链中 | 开发者可能忘记执行 |
| 无 Project References | 无增量跨包编译 |

### 1.3 当前开发体验

**开发模式**（已解决）:
- `pnpm dev` 启动 shared watch + tsx watch server + vite client
- 修改 shared → shared watch 自动编译 → tsx watch 重启 server
- 基本流畅，但 shared build 有 1-3 秒延迟

**生产构建**:
- `pnpm build` = shared build → server build → client build
- 手动编排，顺序正确，无自动化依赖追踪

---

## 2. tsx 可行性评估

### 2.1 基准测试结论

| 指标 | tsc+node (A) | tsx (B) | B vs A |
|------|-------------|---------|--------|
| 冷启动 | 10-30s（含编译）| 2-5s | 显著优于 |
| 稳态 RSS | ~100MB | ~120-140MB | +20-40MB |
| 请求延迟 | 基线 | ≈基线 | 无差异 |

### 2.2 生产部署风险

| 风险 | 评级 | 说明 |
|------|------|------|
| 企业级先例 | **无** | 无大型生产部署案例 |
| 长期内存稳定性 | 未验证 | 转译缓存可能导致内存增长 |
| Native 模块兼容 | 需验证 | better-sqlite3 在 tsx 下长期行为未知 |
| 依赖链风险 | 中 | 依赖 esbuild，版本升级可能引入破坏性变更 |

### 2.3 结论

**不推荐 tsx 用于生产环境**。tsx 适合开发迭代（已在使用），但生产环境应保持 tsc → node。

---

## 3. CJS 互操作风险评估

### 3.1 依赖分布

```
ESM 原生:   10 个依赖 (45%) — 无风险
CJS dual:    6 个依赖 (27%) — 无风险（exports 字段双模支持）
CJS 纯 JS:   5 个依赖 (23%) — 低风险（tsx 可正确转换）
CJS native:  1 个依赖 (5%)  — 高风险（better-sqlite3）
```

### 3.2 高风险项

| 包 | 问题 | 解决方案 |
|----|------|----------|
| better-sqlite3 | native addon，tsx 兼容性取决于运行时 | 保持 CJS 构建链，不依赖 tsx |

### 3.3 结论

CJS/ESM 互操作**不是迁移障碍**。95% 的依赖在 tsx 下无兼容性问题。唯一高风险项是 better-sqlite3 的 native 模块支持。

---

## 4. Project References 评估

### 4.1 可行性

**技术上完全可行**。TypeScript 5.9 的 Project References 可实现：
- 修改 shared 源码后 `tsc --build` 自动增量编译 shared + server
- `declarationMap` 允许 VS Code 跳转到 shared 源码
- 依赖关系由 TypeScript 编译器自动追踪

### 4.2 对比

| 维度 | 当前方案 | Project References |
|------|----------|--------------------|
| 类型传递 | 手动 build shared | 自动增量编译 |
| VS Code | 指向 dist | 指向源码 |
| 构建可靠性 | 依赖开发者纪律 | 编译器自动保证 |
| 迁移成本 | 无 | 低（配置变更） |

### 4.3 结论

推荐引入 Project References。迁移成本低（tsconfig 配置变更），收益明确（增量编译 + 依赖追踪）。

---

## 5. 原型验证结果

### 5.1 tsx 原型

本项目已具备 tsx 运行环境（dev 模式使用 `tsx watch`）。关键验证点：
- Prisma 在 tsx 下正常工作：已验证
- LangChain 在 tsx 下正常工作：已验证
- better-sqlite3 在 tsx 下工作：已验证（dev 模式）
- 长期运行稳定性：未验证（不推荐用于生产）

### 5.2 无功能回归

tsx 模式下未发现功能回归，所有核心流程正常。

---

## 6. ROI 分析

### 6.1 开发效率提升估算

| 场景 | 当前周期 | 迁移后周期 | 提升 |
|------|----------|-----------|------|
| 改 shared → 验证 server | ~5s（shared watch 自动编译） | ~3s（Project References 增量） | 小幅 |
| 全量 build | ~30s | ~25s（增量编译） | 小幅 |
| 冷启动 dev | ~10s | ~8s | 小幅 |

**开发效率提升有限**。当前 dev 模式已通过 `tsx watch` + shared watch 解决了迭代延迟问题。

### 6.2 一次性迁移成本

| 改动 | 工作量 | 风险 |
|------|--------|------|
| 添加 prebuild hook（T5） | 10 min | 低 |
| 引入 Project References | 2-4h | 低 |
| server ESM 迁移 | 1-2 周 | **高** |
| desktop 跟随迁移 | 2-3 天 | 中 |

### 6.3 风险量化

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| tsx 生产环境内存泄漏 | 中 | 高 | 保持 tsc+node |
| better-sqlite3 ESM 兼容失败 | 低 | 高 | 保持 CJS 构建链 |
| ESM 迁移引入运行时错误 | 中 | 中 | 独立分支实验 |
| 构建链中断 | 低 | 高 | 完善测试覆盖 |

### 6.4 长期维护收益

| 收益 | 评估 |
|------|------|
| 统一模块系统 | 认知负担降低，但当前 dev 模式已缓解 |
| 减少 build 步骤 | Project References 可显著改善 |
| 减少 CJS/ESM 互操作风险 | 95% 依赖已兼容，风险较低 |
| 对齐 TypeScript 生态趋势 | ESM 是趋势，但 CJS 仍广泛使用 |

### 6.5 ROI 结论

**ROI 为负（当前阶段）**。理由：
1. 开发迭代痛点已被 tsx dev 模式缓解
2. 生产构建链稳定可靠，无需紧急优化
3. ESM 迁移的高风险项（better-sqlite3、生产环境 tsx）无低成本解决方案
4. 迁移成本（1-2 周）高于收益（小幅效率提升）

---

## 7. Go/No-Go 建议

### No-Go（完整 ESM 迁移）

**不建议当前阶段执行 server ESM 迁移**。理由：
1. 生产环境 tsx 不推荐（无企业级先例）
2. better-sqlite3 native 模块兼容性风险
3. ROI 分析为负
4. 开发体验已被 tsx dev 模式充分改善

### Go（增量改善）

**建议执行以下低成本改善**（非完整迁移）：

1. **T5: prisma:generate prebuild hook** — 立即执行，无风险
2. **Project References 引入** — 推荐执行，低成本高收益
3. **shared 增量编译优化** — 推荐执行，改善全量 build 速度

---

## 8. 迁移路线图（备用方案，非当前推荐）

> 以下路线图在"未来 ESM 迁移成为必要"时使用，当前不推荐启动。

### Phase 0: 基础设施准备（1-2 天）

| 任务 | 工作量 | 风险 |
|------|--------|------|
| 添加 prisma:generate prebuild hook | 10 min | 低 |
| 引入 Project References | 2-4h | 低 |
| 更新 CI/CD 构建脚本 | 1-2h | 低 |

**验证**: `pnpm build` + `pnpm typecheck` 通过。

### Phase 1: server ESM 迁移（1-2 周）

| 任务 | 工作量 | 风险 |
|------|--------|------|
| 修改 server tsconfig 为 ESM | 1h | 中 |
| 更新 server package.json scripts | 2h | 中 |
| 修改路径别名指向 shared/src | 1h | 低 |
| 验证所有 CJS 依赖的 import 行为 | 4-8h | **高** |
| 解决 better-sqlite3 兼容性 | 4-8h | **高** |
| 全量测试 + E2E 验证 | 4-8h | 中 |

**验证**: 全量测试通过 + 30 分钟运行稳定。

**Rollback**: git revert + `pnpm build` 验证。

### Phase 2: desktop 跟随迁移（2-3 天）

| 任务 | 工作量 | 风险 |
|------|--------|------|
| desktop tsconfig 改为 ESM | 1h | 中 |
| 验证 Electron + ESM 兼容性 | 4-8h | **高** |
| 更新 desktop build scripts | 2h | 中 |

**验证**: `pnpm dev:desktop` 正常 + desktop 构建通过。

**Rollback**: git revert。

### 每阶段 Rollback 方案

| 场景 | 操作 | 时间 |
|------|------|------|
| Phase 1 失败 | git revert Phase 1 commits | 10 min |
| Phase 2 失败 | git revert Phase 2 commits | 10 min |
| 数据损坏 | 从 git 恢复 | 5 min |

---

## 9. 相关文档

| 文档 | 路径 |
|------|------|
| tsx 基准测试数据 | [2026-07-10-tsx-benchmark-data.md](./2026-07-10-tsx-benchmark-data.md) |
| CJS 互操作矩阵 | [2026-07-10-cjs-interop-matrix.md](./2026-07-10-cjs-interop-matrix.md) |
| Project References 评估 | [2026-07-10-project-references-evaluation.md](./2026-07-10-project-references-evaluation.md) |
