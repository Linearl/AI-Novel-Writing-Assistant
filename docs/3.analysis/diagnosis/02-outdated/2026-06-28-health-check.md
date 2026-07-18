---
description: "2026-06-28 项目健康检查报告 — 五维评估 + 债务模式识别 + 行动建议"
---

# 项目健康检查报告

> **日期**：2026-06-28
> **版本**：v0.1（功能迭代阶段）
> **分支**：master
> **工作区状态**：干净（无未提交变更）

---

## 1. 项目快照摘要

| 指标 | 数值 | 备注 |
|------|------|------|
| 源文件总数（server） | 781 `.ts` | server/src/ |
| 源文件总数（client） | 418 `.ts/.tsx` | client/src/ |
| 测试文件总数（server） | 216 | server/tests/ |
| 测试文件总数（client） | 14 | client/ |
| TypeScript 编译 | ✅ 0 错误 | 全包通过（shared/server/client/desktop） |
| 测试通过率 | 15/19（79%） | 4 个 auto-director 测试失败 |
| npm 漏洞 | 128 | 2 critical / 41 high / 74 moderate / 11 low |
| B.todo 任务包 | 5 | 全部 v0.1 |
| B.2.done 任务包 | 19 | 全部 v0.1 |
| 活跃诊断报告 | 2 | docs_dev/3.analysis/diagnosis/01-active/ |
| any 类型使用 | 91 次 | server: 82 / client: 9 |
| console.log 残留 | 17 处 | 全部在 server/src/ |
| 超大文件（>800行） | 20 个 | server: 18 / client: 2 |

---

## 2. 五维健康评估

### 总评分：15.5 / 25（62%）

| 维度 | 评分 | 等级 | 关键证据 |
|------|------|------|----------|
| 🏗️ 架构 | 3.5 / 5 | B | 分层清晰（routes → modules → services），模块化良好，但大文件问题突出 |
| 🔒 安全 | 2.5 / 5 | D+ | 128 npm 漏洞（含 2 critical），无硬编码密钥，.env 文件存在 |
| 🧪 测试 | 2.0 / 5 | D | 测试文件 230 个 vs 源文件 1199 个（19%），4 个测试失败，无 E2E |
| 💳 债务 | 2.5 / 5 | D+ | 20 个 >800 行文件，91 个 any，最大文件 2731 行 |
| 📋 流程 | 4.0 / 5 | A- | 完整六件套体系，自动归档机制，INDEX.md 自动生成，需求清单 SSOT |

### 2.1 架构健康度 — 3.5/5

**优点**：
- 后端分层清晰：`routes/` → `modules/` → `services/` 三层层级明确
- 模块化成熟：`modules/` 下有 comic / drama / novel / export / setup / timeline 6 个业务模块
- 服务层职责明确：22 个服务目录，各司其职
- 前端页面按功能域组织：22 个页面目录

**问题**：
- **P1** server 最大文件 `worldStructure.ts` 1311 行，`world.prompts.ts` 1296 行，共 18 个文件 >800 行
- **P1** client `NovelEdit.tsx` 2731 行，严重超标（项目约束 >700 必须重构）
- **P2** prompting 目录多个超大文件（promptRunner 1122 行、chapterLayeredContext 1086 行）

### 2.2 安全健康度 — 2.5/5

**优点**：
- 无硬编码密钥（grep 扫描通过）
- .env 配置规范，敏感信息隔离

**问题**：
- **P0** 128 个 npm 漏洞，其中 2 个 critical（react-router CSRF，patched >=7.15.1，当前 7.13.1）
- **P1** 41 个 high 漏洞需排查修复
- **P2** TypeScript strict 模式未显式启用（tsconfig.json 中未见 strict: true）

### 2.3 测试健康度 — 2.0/5

**优点**：
- 216 个 server 测试文件，覆盖服务层各模块
- 使用 Node.js 内置 test runner，轻量无额外依赖

**问题**：
- **P1** 4 个 auto-director 测试失败（`findMany` 未定义，疑似 mock 缺失）
- **P1** 测试通过率 79%，低于 80% 阈值
- **P1** client 测试仅 14 个文件，前端覆盖严重不足
- **P2** 无 E2E 测试配置
- **P2** 测试/源码比 19%，远低于理想水平

### 2.4 债务健康度 — 2.5/5

**优点**：
- 0 个空 catch 块（错误处理无吞错）
- 错误处理规范：624 个 catch 块均携带错误变量

**问题**：
- **P1** 20 个文件超过 800 行（项目约束上限），最大 2731 行
- **P2** 91 处 `any` 类型使用（server 82 / client 9）
- **P2** 17 处 `console.log` 残留在 server 生产代码中
- **P3** 无结构化日志方案

### 2.5 流程健康度 — 4.0/5

**优点**：
- 完整任务包六件套体系（README / REQ-original / REQ / tasks / design / decision_log）
- `requirements.md` 由 `req-sync.js` 自动生成，SSOT 管理
- `INDEX.md` 自动生成
- docs_dev 编号化分层（0-8 体系），目录规范清晰
- 19 个任务包已完成归档，5 个在 todo

**问题**：
- **P3** 版本规划目录（0.version_plan/）为空，缺少顶层版本路线图
- **P3** 无 CI/CD 配置（未见 GitHub Actions / GitLab CI）

---

## 3. 债务模式识别

### 命中模式

| # | 模式 | 匹配度 | 证据 |
|---|------|--------|------|
| 1 | **快速原型债务** | ⚠️ 高 | v0.1 已完成 19 个任务包，快速推进导致大文件累积（20 个 >800 行） |
| 2 | **不彻底的模块化** | ⚠️ 中高 | 模块划分合理但内部未拆分（如 NovelEdit.tsx 2731 行），模块边界与文件粒度不匹配 |
| 3 | **安全后置的代价** | ⚠️ 中 | 128 npm 漏洞累积，react-router 未升级到 patched 版本 |

### 未命中模式

- ❌ 响应格式漂移 — API 响应格式基本统一
- ❌ 样式债务累积 — client `any` 仅 9 处，前端代码质量相对可控
- ❌ 审计驱动的打地鼠 — 有系统性任务包管理，非临时修补
- ❌ 范围蔓延 — v0.1 任务包范围明确，有编号分类规则管控

### 版本生命周期判断

**当前阶段：功能迭代（v03-05 对应）**

- v0.1 已完成 19 个核心功能任务包，5 个在 todo
- 项目处于"功能快速积累、债务开始显现"的拐点
- 下一阶段应进入债务清理与安全加固

---

## 4. Top 5 行动建议（优先级排序）

### P0 — 立即处理

| # | 行动 | 影响 | 预估工作量 |
|---|------|------|-----------|
| 1 | **升级 react-router 到 >=7.15.1** | 修复 2 个 critical CSRF 漏洞 | 0.5h |

### P1 — 本迭代内处理

| # | 行动 | 影响 | 预估工作量 |
|---|------|------|-----------|
| 2 | **修复 4 个 auto-director 测试失败** | 测试通过率回到 80%+ | 2h |
| 3 | **批量升级 npm 高危依赖** | 降低 41 个 high 漏洞 | 2-4h |
| 4 | **拆分 NovelEdit.tsx（2731行）** | 最严重的架构违规 | 4-8h |

### P2 — 下个迭代规划

| # | 行动 | 影响 | 预估工作量 |
|---|------|------|-----------|
| 5 | **制定超大文件拆分计划（20个文件）** | 系统性债务清理 | 分批迭代 |

---

## 5. 版本规划建议

| 阶段 | 主题 | 重点 |
|------|------|------|
| v0.1 剩余 | 功能收口 | 完成 B.todo 剩余 5 个任务包 |
| v0.2 | 安全加固 + 债务清理 | npm 漏洞修复、超大文件拆分（优先 NovelEdit.tsx）、测试补充 |
| v0.3 | 测试体系建设 | E2E 框架搭建、client 测试覆盖、CI/CD 集成 |

---

## 6. 数据附录

### 6.1 超大文件清单（>800 行）

#### Server（18 个）

| 行数 | 文件 |
|------|------|
| 1311 | server/src/services/world/worldStructure.ts |
| 1296 | server/src/prompting/prompts/world/world.prompts.ts |
| 1122 | server/src/prompting/core/promptRunner.ts |
| 1086 | server/src/prompting/prompts/novel/chapterLayeredContext.ts |
| 1082 | server/src/services/world/worldVisualization.ts |
| 1072 | server/src/services/rag/RagIndexService.ts |
| 1047 | server/src/services/novel/director/runtime/novelDirectorTakeover.ts |
| 1046 | server/src/services/novel/novelCorePipelineService.ts |
| 978 | server/src/services/planner/PlannerService.ts |
| 911 | server/src/services/styleEngine/StyleProfileService.ts |
| 905 | server/src/services/novel/runtime/ChapterArtifactDeltaService.ts |
| 888 | server/src/services/novel/director/runtime/DirectorWorkspaceAnalyzer.ts |
| 874 | server/src/services/novel/director/commands/DirectorCommandService.ts |
| 845 | server/src/services/novel/characterPrep/CharacterPreparationService.ts |
| 842 | server/src/services/novel/director/workflowStepRuntime/directorExecutionStepModules.ts |
| 837 | server/src/services/world/WorldService.ts |
| 806 | server/src/prompting/prompts/style/style.prompts.ts |
| 803 | server/src/services/novel/volume/NovelVolumeService.ts |

#### Client（2 个）

| 行数 | 文件 |
|------|------|
| 2731 | client/src/pages/novels/NovelEdit.tsx |
| 842 | client/src/pages/promptWorkbench/components/PromptSlotPanel.tsx |

### 6.2 测试失败详情

| 测试名称 | 错误 |
|----------|------|
| auto director approval preferences expose defaults... | mock 缺失 |
| auto director auto-approval audit records the event... | mock 缺失 |
| auto director replan notice audit records a reminder... | mock 缺失 |
| auto director auto-approval audit loads the latest 10... | `findMany` 未定义 |

### 6.3 npm 漏洞分布

| 严重度 | 数量 |
|--------|------|
| Critical | 2 |
| High | 41 |
| Moderate | 74 |
| Low | 11 |
| **合计** | **128** |
