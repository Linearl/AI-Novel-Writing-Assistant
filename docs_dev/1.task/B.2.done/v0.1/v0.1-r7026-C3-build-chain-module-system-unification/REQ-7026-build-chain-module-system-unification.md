---
description: "REQ-7026 构建链模块系统统一"
---

# REQ-7026 构建链模块系统统一

> 状态：待激活

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7026 |
| 优先级 | P2 |
| 来源 | 架构诊断报告 2026-07-10 第9条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

当前 monorepo 存在模块系统分裂：

| 包 | 模块系统 | 运行时 | 路径别名 |
|----|----------|--------|----------|
| `shared` | ESNext | — | 无（纯类型库） |
| `client` | ESNext / Bundler | Vite | 无（Vite 内置解析） |
| `server` | CommonJS / Node | Node.js (tsc → dist) | `@ai-novel/shared/*` → `../shared/dist/*` |
| `desktop` | CommonJS / Node | Electron (tsc → dist) | 同 server |

核心问题：
1. **模块系统不一致**：shared/client 用 ESM，server/desktop 用 CJS
2. **server 路径别名指向 dist**：`@ai-novel/shared/*` 映射到 `../shared/dist/*`，必须 pre-build shared
3. **prisma:generate 不在构建链中**：首次 clone 后需手动执行 `prisma generate`
4. **开发迭代繁琐**：改 shared → build shared → 重启 server（每轮 ~30s）

不改的后果：开发效率持续低下，新开发者容易因构建顺序错误而困惑，CJS/ESM 混用可能引发潜在的模块解析问题。

---

## 2. 目标与范围

### 2.1 目标

1. 评估将 server 迁移到 ESNext + tsx 运行时的可行性
2. 探索 TypeScript 5.9 Project References 替代路径别名
3. 将 prisma:generate 加入 server build 的 prebuild hook
4. 最终交付：评估报告 + 迁移计划（不一定全部落地）

### 2.2 In Scope

**调研阶段**：
- tsx 运行时生产环境内存/CPU 开销对比（vs tsc + node）
- tsx 与 CommonJS 依赖的互操作风险评估（Prisma、LangChain、Express 等）
- TypeScript 5.9 Project References 能否替代当前路径别名方案
- 评估迁移的成本与收益（ROI 分析）

**实验阶段**：
- 搭建 tsx 运行时的 server 原型（独立分支）
- 验证 server 所有功能在 tsx 下正常运行
- 验证开发迭代时间缩短幅度

**实施阶段（如评估通过）**：
- 统一 monorepo 模块系统为 ESNext
- 将 prisma:generate 加入 server `prebuild` hook
- 简化 `pnpm dev` 流程（减少手动步骤）

### 2.3 Out of Scope

- 不改变 `shared` / `client` 包的模块系统（它们已是 ESNext）
- 不涉及生产部署配置（Docker、CI/CD 等）
- 不做桌面端 Electron 的 ESM 迁移（Desktop 依赖 server 构建产物，server 迁移后自动受益）

---

## 3. 需求详情

### 3.1 tsx 可行性评估

**必须回答的问题**：
1. tsx 在生产环境的内存开销 vs tsc + node？（基准测试：同进程、同请求量下的 RSS 对比）
2. tsx 首次加载时间 vs tsc + node？（冷启动时间对比）
3. server 依赖中有多少是 CJS-only 包？tsx 能否正确处理 CJS/ESM 互操作？
4. tsx 与 LangChain/LangGraph（大量 CJS 依赖）的兼容性如何？
5. tsx 在生产环境的稳定性？有无已知的内存泄漏或 GC 问题？

**评估标准**：
- 内存开销：<15% 可接受
- 启动时间：<2x 可接受
- CJS 互操作：所有现有依赖必须正常工作
- 稳定性：生产级验证（有企业使用案例）

### 3.2 TypeScript 5.9 Project References 评估

**必须回答的问题**：
1. Project References 能否实现"改 shared 源码 → server 自动拿到新类型"？
2. 与当前路径别名方案（`@ai-novel/shared/*` → `../shared/dist/*`）相比，优劣势？
3. Project References 对 IDE（VS Code）的智能提示影响？

**评估标准**：
- 开发体验提升：类型即时可用，无需 build shared
- 与 monorepo 结构兼容：4 个包均能正常配置
- IDE 支持：VS Code 完整支持

### 3.3 prisma:generate prebuild 集成

**目标**：修改 `server/package.json` 的 `build` 脚本，确保 `prisma generate` 在编译前自动执行。

**方案**：
```json
{
  "scripts": {
    "prebuild": "prisma generate",
    "build": "tsc"
  }
}
```

---

## 4. 验收标准

- [ ] tsx 可行性评估报告完成（包含内存/启动时间/兼容性基准测试数据）
- [ ] TypeScript 5.9 Project References 评估报告完成（包含优劣势对比）
- [ ] CJS 互操作风险评估完成（列出所有不兼容的依赖及解决方案）
- [ ] prisma:generate 已加入 server prebuild hook
- [ ] 最终交付：综合分析报告 + 迁移路线图（含 ROI 分析）
- [ ] 迁移计划包含：阶段划分、每阶段工作量和风险、rollback 方案

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| tsx 生产环境不成熟 | 调研社区使用案例（Next.js、Vite 等），评估是否有企业级生产部署案例 |
| CJS 依赖不兼容 tsx | 逐包测试所有 CJS-only 依赖，记录不兼容项并评估替代方案 |
| 迁移成本高于收益 | 在调研阶段做出 go/no-go 决策，不盲目实施 |
| Project References 与路径别名冲突 | 先实验独立分支，验证兼容性后决定是否引入 |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告第9条发现生成需求文档 |
