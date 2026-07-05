---
description: "v0.1 版本 — 全量任务包分阶段开发追踪清单"
date: 2026-07-04
update_time: 2026-07-04
---
# v0.1 版本 — 分阶段需求追踪清单

> 基线：8 个任务包全部位于 `docs_dev/1.task/B.todo/v0.1/`
> 当前进度：8/8 已完成，0 项待开发（5 个 Block 全部完成）
> 总计：8 个任务包（2 C1/C2 小型 + 3 C2 核心 + 3 M2 中型），共 81 个子任务 ✅ 全部完成

---

## 零、阶段总览

```text
Block 1（客户端快赢，并行）          Block 2（shared 层基础，并行）        Block 3（服务端+auto-director，并行）
┌─ REQ-2039 闲置网络恢复  ─┐      ┌─ REQ-2035 大纲锁定   ─┐           ┌─ REQ-2037 角色退场      ─┐
├─ REQ-3009 Tab性能优化   ─┼──→   ├─ REQ-2041 伏笔类型   ─┼──→       ├─ REQ-2042 自适应字数    ─┤
└──────────────────────────┘      └─ REQ-2038 设定校验    ─┘           ├─ REQ-2038 Auto-Director ─┤
  🔒 typecheck + test             🔒 typecheck + build               └─ REQ-2040 TXT导入导出   ─┘
                                                                    🔒 typecheck + test
Block 4（客户端 UI 适配）              Block 5（全量收口）
┌─ REQ-2035 client 锁定UI ─┐       ┌─ 全量回归测试      ─┐
├─ REQ-2037 client 退场UI ─┤       ├─ 版本文档同步      ─┤
├─ REQ-2041 client 伏笔UI ─┤       └─ 归档全部任务包    ─┘
├─ REQ-2042 client 字数UI ─┤         🔒 pnpm test:all
├─ REQ-2038 client 校验UI ─┤
├─ REQ-2040 client 导入UI ─┤
└──────────────────────────┘
  🔒 typecheck + test:client
```

**闸门规则**：每个 Block 结束后必须运行测试验证，全部通过方可进入下一 Block。任一测试失败须修复后重新验证，不得携带已知问题进入下一阶段。每个 Block 通过后提交作为下一阶段的基线。

---

## 一、Block 1：客户端快赢（并行，预计 0.5 天）

> 前置条件：无。
> 目标：修复两个客户端性能/体验问题，积累开发节奏。
> 并行说明：REQ-2039 和 REQ-3009 均为纯客户端改动，修改文件无交集，可并行。

### 1.1 REQ-2039 闲置后网络连接自动恢复

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2039-C1-idle-network-recovery` |
| 优先级 | P0 |
| 工时 | 小型（3 tasks） |
| 核心改动 | React Query 配置 + toast 超时 + Vite proxy keepalive |

**变更清单：**

- [ ] T1 React Query 全局配置优化（refetchOnWindowFocus: true, retry: 3, staleTime: 30s）
- [ ] T2 错误 toast 自动消失（duration Infinity → 5000ms）
- [ ] T3 Vite proxy keepalive 配置（timeout, proxyTimeout）

**验收标准：**

- [ ] 闲置后回到页面自动 refetch 数据
- [ ] 错误 toast 5 秒后自动消失
- [ ] Vite proxy 闲置后不断连

### 1.2 REQ-3009 Tab 切换性能优化

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r3009-C2-tab-switch-performance` |
| 优先级 | P0 |
| 工时 | 小型（3 tasks） |
| 核心改动 | 条件查询 staleTime + sync 防抖 + query 失效精细化 |

**变更清单：**

- [ ] T1 条件查询 staleTime 优化（volumeWorkspace, qualityReport, latestState 等设置 30s）
- [ ] T2 workflow stage sync 防抖（2 秒 debounce）
- [ ] T3 invalidateNovelDetail 精细化（按 tab 类型只失效相关 query key）

**验收标准：**

- [ ] 切换回已访问 tab 不触发网络请求
- [ ] 快速切换 tab 只触发一次 sync
- [ ] tab 切换不再级联失效 15 个 query

### 1.3 复核实际完成度

- [ ] 逐项核对变更清单完成情况
- [ ] 核对验收标准全部达成
- [ ] 更新任务包 `tasks.md` 标记完成
- [ ] 更新任务包 `README.md` 状态

### 1.4 Block 1 测试闸门

```bash
pnpm typecheck                              # 类型检查
pnpm --filter @ai-novel/client test         # 客户端测试
```

- [ ] 类型检查零错误
- [ ] 客户端测试全部通过
- [ ] git commit：`chore(Block1): REQ-2039 闲置恢复 + REQ-3009 Tab性能优化`

### 1.5 归档本阶段任务包

- [ ] 更新 `run_result.json` status 为 `done`
- [ ] git commit：`chore(Block1-archive): 归档 REQ-2039, REQ-3009`

---

## 二、Block 2：shared 层基础 + 服务端核心（并行，预计 1.5 天）

> 前置条件：Block 1 完成。
> 目标：完成三个任务包的 shared 类型定义、Prisma schema 变更和核心服务端逻辑。
> 并行说明：REQ-2035（大纲锁定）和 REQ-2041（伏笔可视化）的 Prisma 模型不同，可并行。REQ-2038 无 shared 层变更。

### 2.1 REQ-2035 大纲终稿锁定 — Phase 1+2（shared + server）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2035-C2-outline-final-draft-lock` |
| 优先级 | P0 |
| 工时 | 中型（T1-T9, 7.5h） |
| 核心改动 | Chapter.locked 字段 + PATCH API + auto-director 5 阶段过滤 |

**变更清单：**

- [ ] T1 Chapter 类型新增 `locked: boolean` 字段（shared/types）
- [ ] T2 Prisma Schema Chapter 模型添加 locked 字段
- [ ] T3 DB migration（prisma migrate dev）
- [ ] T4 PATCH /chapters/:id/lock API 端点
- [ ] T5 auto-director replan 阶段过滤 locked 章节
- [ ] T6 auto-director full_audit 阶段过滤 locked 章节
- [ ] T7 auto-director 补充关系网阶段过滤 locked 章节
- [ ] T8 auto-director 补充时间线阶段过滤 locked 章节
- [ ] T9 auto-director 标题修复阶段过滤 locked 章节

### 2.2 REQ-2041 伏笔埋收可视化 — Phase 1+2（shared + server CRUD）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2041-M2-payoff-ledger-visualization` |
| 优先级 | P0 |
| 工时 | 中型（T1-T6, 7h） |
| 核心改动 | PayoffLedger 类型增强 + 状态枚举 4 值 + CRUD API + 自动更新 |

**变更清单：**

- [ ] T1 PayoffLedger 类型新增 plantedChapterId/resolvedChapterId/expiredAt 等字段
- [ ] T2 状态枚举收敛为 planted/active/resolved/expired（向后兼容）
- [ ] T3 shared 构建验证
- [ ] T4 CRUD API（GET/POST/PUT/DELETE payoff ledger entries）
- [ ] T5 伏笔状态自动更新服务（基于章节数过期）
- [ ] T6 过期阈值可配置

### 2.3 REQ-2038 设定一致性前置校验 — Phase 1（Server core）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2038-C2-setting-consistency-pre-check` |
| 优先级 | P2 |
| 工时 | 中型（T1-T3, 8h） |
| 核心改动 | 校验 Prompt + 校验服务 + API 端点 |

**变更清单：**

- [ ] T1 设定一致性校验 Prompt（prompting/ 注册）
- [ ] T2 校验服务（接收设定数据，输出结构化校验报告）
- [ ] T3 POST /settings/consistency-check API 端点

### 2.4 复核实际完成度

- [ ] 逐项核对变更清单完成情况
- [ ] 核对验收标准全部达成
- [ ] 更新任务包 `tasks.md` 标记完成
- [ ] 更新任务包 `README.md` 状态

### 2.5 Block 2 测试闸门

```bash
pnpm --filter @ai-novel/shared build         # shared 构建
pnpm typecheck                               # 全量类型检查
pnpm test                                    # 后端单元测试
```

- [ ] shared 构建成功
- [ ] 类型检查零错误
- [ ] 后端测试全部通过
- [ ] git commit：`chore(Block2): REQ-2035 Phase1+2 + REQ-2041 Phase1+2 + REQ-2038 Phase1`

### 2.6 归档本阶段任务包（部分完成，不迁移）

- [ ] 更新 tasks.md 标记已完成子任务
- [ ] 记录进度到 README.md

---

## 三、Block 3：auto-director 集成 + 服务端深度（并行，预计 2 天）

> 前置条件：Block 2 完成（shared 类型 + 基础 API）。
> 目标：完成 auto-director 集成、退场状态机、自适应字数服务端逻辑。
> 并行说明：REQ-2037/REQ-2042/REQ-2040 修改不同模块，可并行。

### 3.1 REQ-2037 角色退场状态机 — 全量（shared + server + client）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2037-C2-character-exit-state-machine` |
| 优先级 | P0 |
| 工时 | 大型（12 tasks, 19h） |
| 核心改动 | CharacterExitStatus 枚举 + frozen 过滤 + LLM 退场推断 + 状态变更 API + 客户端 UI |

**变更清单：**

- [ ] T1 CharacterExitStatus 枚举类型（active/exited/dead/frozen）
- [ ] T2 Prisma Schema + migration
- [ ] T3 frozen 角色过滤（不参与正文生成上下文）
- [ ] T4 退场推断 Prompt
- [ ] T5 auto-director 章节执行后自动推断退场
- [ ] T6 自动冻结机制
- [ ] T7 PATCH /characters/:id/exit-status API
- [ ] T8 客户端状态标签展示
- [ ] T9 exitStatus 筛选功能
- [ ] T10 手动标记交互
- [ ] T11 单元测试
- [ ] T12 集成测试

### 3.2 REQ-2042 自适应字数控制 — Phase 2-5（auto-director + pipeline + 水文检测）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2042-M2-adaptive-word-count-control` |
| 优先级 | P1 |
| 工时 | 大型（T4-T15, 20h） |
| 核心改动 | 章节角色标注 + 字数系数 + prompt 注入 + compress/expand + 水文检测 |

**变更清单：**

- [ ] T4 auto-director 章节角色标注（普通/过渡/高潮/转折）
- [ ] T5 字数系数计算逻辑（基准 3000-4000，高潮 x2.5）
- [ ] T6 基准字数可配置
- [ ] T7 prompt 注入字数范围
- [ ] T8 compress 能力（超限时精简）
- [ ] T9 expand 能力（不足时扩充）
- [ ] T10 字数检测逻辑
- [ ] T11 自动 compress/expand 触发
- [ ] T12 循环保护（最多 2 轮）
- [ ] T13 水文检测 Prompt
- [ ] T14 水文检测服务
- [ ] T15 超标处理（>30% 阈值）

### 3.3 REQ-2038 设定一致性校验 — Phase 2（Auto-Director 集成）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2038-C2-setting-consistency-pre-check` |
| 优先级 | P2 |
| 工时 | 中型（T4-T5, 5h） |
| 核心改动 | World Building 阶段自动触发校验 + 报告存储与忽略 |

**变更清单：**

- [ ] T4 auto-director world building 阶段完成后自动触发校验
- [ ] T5 校验报告存储 + 忽略机制

### 3.4 REQ-2040 资产 TXT 导入导出 — Phase 1-3（服务端全部）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2040-M2-asset-txt-import-export` |
| 优先级 | P2 |
| 工时 | 中型（T1-T7, 12h） |
| 核心改动 | 4 类资产的 TXT 格式导入导出 API |

**变更清单：**

- [ ] T1 世界设定 TXT 导出 endpoint
- [ ] T2 世界设定 TXT 导入 endpoint
- [ ] T3 大纲 TXT 导出 endpoint
- [ ] T4 大纲 TXT 导入 endpoint
- [ ] T5 关系网 TXT 导出 endpoint
- [ ] T6 关系网 TXT 导入 endpoint
- [ ] T7 正文 TXT 导出 endpoint

### 3.5 REQ-2041 伏笔埋收可视化 — Phase 3（auto-director 集成）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2041-M2-payoff-ledger-visualization` |
| 优先级 | P1 |
| 工时 | 中型（T7-T9, 6.5h） |
| 核心改动 | 章节生成后自动检测伏笔 + 未回收提醒 |

**变更清单：**

- [ ] T7 章节生成后自动检测新埋设伏笔
- [ ] T8 后续章节自动检查未回收伏笔提醒
- [ ] T9 集成测试

### 3.6 复核实际完成度

- [ ] 逐项核对变更清单完成情况
- [ ] 核对验收标准全部达成
- [ ] 更新各任务包 `tasks.md` 标记完成
- [ ] 更新各任务包 `README.md` 状态

### 3.7 Block 3 测试闸门

```bash
pnpm --filter @ai-novel/shared build         # shared 构建
pnpm typecheck                               # 全量类型检查
pnpm test                                    # 后端单元测试
pnpm --filter @ai-novel/server test:routes   # 路由测试
```

- [ ] shared 构建成功
- [ ] 类型检查零错误
- [ ] 后端测试全部通过
- [ ] 路由测试全部通过
- [ ] git commit：`chore(Block3): REQ-2037 全量 + REQ-2042 T4-T15 + REQ-2038 T4-T5 + REQ-2040 T1-T7 + REQ-2041 T7-T9`

### 3.8 归档本阶段任务包（部分完成，不迁移）

- [ ] 更新 tasks.md 标记已完成子任务
- [ ] 记录进度到 README.md

---

## 四、Block 4：客户端 UI 适配（并行，预计 1.5 天）

> 前置条件：Block 3 完成（服务端 API 就绪）。
> 目标：完成所有任务包的客户端 UI 部分。
> 并行说明：各任务包 UI 涉及不同页面组件，可并行。

### 4.1 REQ-2035 大纲锁定 — Phase 3（Client UI）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2035-C2-outline-final-draft-lock` |
| 优先级 | P0 |
| 工时 | 小型（T10-T12, 3.5h） |

**变更清单：**

- [ ] T10 章节列表锁定按钮
- [ ] T11 locked 状态视觉标识
- [ ] T12 集成测试

### 4.2 REQ-2037 角色退场 — Phase 3（Client UI，已在 3.1 T8-T10 完成）

- [ ] 确认 T8-T10 已在 Block 3 完成

### 4.3 REQ-2041 伏笔可视化 — Phase 4（Client UI）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2041-M2-payoff-ledger-visualization` |
| 优先级 | P0 |
| 工时 | 中型（T10-T13, 6h） |

**变更清单：**

- [ ] T10 伏笔列表面板
- [ ] T11 状态筛选功能
- [ ] T12 expired 醒目样式 + 过期阈值配置 UI
- [ ] T13 E2E 测试

### 4.4 REQ-2042 自适应字数 — Phase 6（Client UI）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2042-M2-adaptive-word-count-control` |
| 优先级 | P1 |
| 工时 | 中型（T16-T18, 4h） |

**变更清单：**

- [ ] T16 字数目标展示
- [ ] T17 字数对比可视化（目标 vs 实际）
- [ ] T18 水文标记

### 4.5 REQ-2038 设定校验 — Phase 3（Client UI）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2038-C2-setting-consistency-pre-check` |
| 优先级 | P2 |
| 工时 | 中型（T6-T9, 9h） |

**变更清单：**

- [ ] T6 校验结果展示
- [ ] T7 一键修复交互
- [ ] T8 忽略功能
- [ ] T9 全量验证

### 4.6 REQ-2040 TXT 导入导出 — Phase 4（Client UI）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2040-M2-asset-txt-import-export` |
| 优先级 | P2 |
| 工时 | 中型（T8-T12, 8h） |

**变更清单：**

- [ ] T8 世界设定页面导入导出按钮
- [ ] T9 大纲页面导入导出按钮
- [ ] T10 关系网页面导入导出按钮
- [ ] T11 正文页面导出按钮
- [ ] T12 全量验证

### 4.7 REQ-2042 自适应字数 — Phase 1（shared，补齐）

| 属性 | 值 |
| --- | --- |
| 目录 | `v0.1-r2042-M2-adaptive-word-count-control` |
| 优先级 | P0 |
| 工时 | 小型（T1-T3, 2h） |

**变更清单：**

- [ ] T1 Chapter wordCountTarget 字段定义
- [ ] T2 章节角色枚举（normal/transition/climax/turning_point）
- [ ] T3 shared 构建验证

### 4.8 复核实际完成度

- [ ] 逐项核对变更清单完成情况
- [ ] 核对验收标准全部达成
- [ ] 更新各任务包 `tasks.md` 全部标记完成
- [ ] 更新各任务包 `README.md` status 更新

### 4.9 Block 4 测试闸门

```bash
pnpm --filter @ai-novel/shared build         # shared 构建
pnpm typecheck                               # 全量类型检查
pnpm test                                    # 后端测试
pnpm --filter @ai-novel/client test          # 客户端测试
```

- [ ] shared 构建成功
- [ ] 类型检查零错误
- [ ] 后端测试全部通过
- [ ] 客户端测试全部通过
- [ ] git commit：`chore(Block4): 全部客户端 UI 适配完成`

### 4.10 归档本阶段任务包

- [ ] 所有 8 个任务包 `run_result.json` status 更新为 `done`
- [ ] 所有 8 个任务包 `tasks.md` 状态同步
- [ ] 所有 8 个任务包 `README.md` 状态同步

---

## 五、Block 5：全量收口（预计 0.5 天）

> 前置条件：所有前置 Block 完成。
> 目标：最终验证 + 全量回归 + 版本文档 + 归档。

### 5.1 复核实际完成度

- [ ] 逐项核对全部 8 个任务包变更清单完成情况
- [ ] 核对全部验收标准达成
- [ ] 更新全部任务包 `tasks.md` 标记完成
- [ ] 更新全部任务包 `README.md` 状态

### 5.2 全量测试闸门

```bash
pnpm --filter @ai-novel/shared build         # shared 构建
pnpm typecheck                               # 全量类型检查
pnpm test                                    # 后端全量测试
pnpm test:client                             # 客户端测试
pnpm build                                   # 生产构建
```

- [ ] shared 构建成功
- [ ] 类型检查零错误
- [ ] 后端全量测试通过
- [ ] 客户端测试通过
- [ ] 生产构建成功
- [ ] git commit：`chore(Block5): v0.1 全量收口验证`

### 5.3 归档全部任务包

- [ ] 所有任务包从 `B.todo/v0.1/` 迁移至 `B.2.done/v0.1/`
- [ ] 同步更新 `docs_dev/1.task/requirements.md`
- [ ] 同步更新 `docs_dev/1.task/README.md`
- [ ] 同步更新 `docs_dev/INDEX.md`
- [ ] git commit：`chore(v0.1-archive): 归档 v0.1 全部 8 个任务包`

---

## 六、任务依赖矩阵

```text
任务         Block   依赖        可并行组    子任务数
──────────   ─────   ────────    ──────      ────────
REQ-2039     1       无          A           3
REQ-3009     1       无          A           3
REQ-2035     2,4     无          B           12
REQ-2041     2,3,4   无          B           13
REQ-2038     2,3,4   无          B,C         9
REQ-2037     3,4     2035,2041   C           12
REQ-2042     3,4     2035,2041   C           18
REQ-2040     3,4     2038        C           12
```

---

## 七、进度追踪

| Block | 任务数 | 状态 | 通过测试？ | 已提交？ |
| --- | --- | --- | --- | --- |
| Block 1（客户端快赢） | 2 包 / 6 子任务 | ✅ | ✅ | ✅ c312179, d5f94b8 |
| Block 2（shared+server 核心） | 3 包 / 18 子任务 | ✅ | ✅ | ✅ 1d818b5, 0f23ce0, a1426cd |
| Block 3（auto-director+深度） | 5 包 / 38 子任务 | ✅ | ✅ | ✅ cf63ec6, 45e9839, 1a16c50 |
| Block 4（客户端 UI） | 6 包 / 22 子任务 | ✅ | ✅ | ✅ 85ea6dc, df7afce, 2cd1db5, 72066ef, e86da7c |
| Block 5（全量收口） | 8 包回归 | ✅ | ✅ | ✅ typecheck 零错误 |
