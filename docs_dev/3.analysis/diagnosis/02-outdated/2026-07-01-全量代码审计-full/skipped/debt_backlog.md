---
description: "技术债台账 — 基于 2026-07-01 全量代码审计"
created: 2026-07-01
updated: 2026-07-01
---

# 技术债台账

> 记录审计中跳过的问题，按优先级和处理窗口分类。

## 处理窗口说明

| 窗口 | 时间 | 说明 |
|------|------|------|
| 24-72h | 紧急 | P1 级别，需尽快处理 |
| 1w | 一周内 | P2 级别，下个迭代处理 |
| 1 iteration | 一个迭代 | P3 级别，计划内处理 |
| planned | 计划中 | P4 级别，长期优化 |

---

## P2 跳过项（7条）

| 编号 | 问题 | 跳过理由 | 处理窗口 |
|------|------|----------|----------|
| ARCH-002 | services/novel 反向依赖 modules | 实际只是 re-export，非真正反向依赖 | planned |
| QUA-004 | console.log 残留 | 被 P1 OBS-001 覆盖 | 1w |
| OBS-003 | console 散布 | 被 P1 OBS-001 覆盖 | 1w |
| PERF-001 | 查询全量内容 | 优化空间有限 | planned |
| MAINT-002 | client 端 25+ 超大文件 | 与 ARCH-006 重叠 | 1 iteration |
| MAINT-003 | 多个函数超 400 行 | 与 QUA-002 重叠 | 1 iteration |
| MAINT-005 | 4-5 层深嵌套 | 与 QUA-003 重叠 | 1 iteration |
| MAINT-006 | 88 处 as any | 与 STB-001 重叠 | 1 iteration |
| MAINT-010 | JSDoc 覆盖率极低 | 工作量大，收益有限 | planned |
| MAINT-012 | 396 处深层 import | 需大规模重构 | planned |
| MAINT-026 | services/ 508 个文件 | 与 ARCH-007 重叠 | 1 iteration |

---

## P3 跳过项（23条）

| 编号 | 问题 | 跳过理由 | 处理窗口 |
|------|------|----------|----------|
| SEC-007 | CORS 允许任意 LAN IP | 开发环境可接受 | planned |
| SEC-009 | API Key 双路径存储 | 架构设计选择 | planned |
| STB-002 | LLM 81处 as any | 与 P2 STB-001 重叠 | 1 iteration |
| STB-003 | @ts-ignore Winston 类型 | 第三方库限制 | planned |
| STB-010 | LLM 无自动重试 | 可在稳定性加固时处理 | 1 iteration |
| STB-012 | 批量事务串行执行 | 性能优化，非关键 | planned |
| ARCH-008 | 双 HTTP 注册模式 | 架构演进过程 | planned |
| ARCH-009 | routes 含业务逻辑 | 与 P2 ARCH-004 重叠 | 1 iteration |
| ARCH-010 | shared/types 超大文件 | 与 P2 QUA-011 重叠 | 1 iteration |
| QUA-009 | 路由函数过长 | 与 P2 ARCH-004 重叠 | 1 iteration |
| QUA-011 | Shared 类型膨胀 | 与 P2 ARCH-005 重叠 | 1 iteration |
| QUA-013 | @ts-ignore | 第三方库限制 | planned |
| PERF-005 | worldBuildingGraph 串行 LLM | 可并行化 | 1 iteration |
| PERF-006 | novelOutlineGraph 串行 LLM | 可并行化 | 1 iteration |
| PERF-009 | 无分页查询 | 与 P2 PERF-004 重叠 | 1 iteration |
| PERF-010 | NovelEdit useState 过多 | 与 P2 ARCH-006 重叠 | 1 iteration |
| TEST-005 | 依赖注入不一致 | 逐步统一 | planned |
| TEST-007 | 集成测试不完整 | 逐步补充 | planned |
| TEST-008 | 模块无测试 | 逐步补充 | planned |
| TEST-018 | 测试依赖构建链 | 需要较大改动 | planned |
| MAINT-008 | 38处 as unknown as | 与 P2 STB-001 重叠 | 1 iteration |
| MAINT-013 | bookAnalysis 高扇入 | 架构问题 | planned |
| MAINT-015 | console.log 残留 | 被 P1 OBS-001 覆盖 | 1w |
| MAINT-017 | import 排序 | ESLint 自动修复 | 1 iteration |
| MAINT-018 | 路由导出模式不一致 | 逐步统一 | planned |
| MAINT-019 | process.env 散布 | 逐步收敛 | planned |
| MAINT-027 | 代码量偏大 | 长期优化目标 | planned |
| MAINT-028 | export 绕过 novel 模块 | 架构问题 | planned |
| COMP-002~010 | 各类兼容性问题 | 低优先级 | planned |

---

## P4 跳过项（17条）

| 编号 | 问题 | 跳过理由 | 处理窗口 |
|------|------|----------|----------|
| STB-016 | migrateAddendums as any | 迁移脚本，可接受 | planned |
| ARCH-014 | prompting 导入 services | 已有依赖，方向合规 | planned |
| ARCH-015 | routes/modules 无 index.ts | 低优先级 | planned |
| TEST-011 | TS 源码用 JS 测试 | 长期目标 | planned |
| TEST-012 | Node assert 断言库 | 长期目标 | planned |
| TEST-013 | 无快照测试 | 长期目标 | planned |
| TEST-014 | 无覆盖率报告 | 长期目标 | planned |
| TEST-015 | desktop 无测试 | 长期目标 | planned |
| TEST-016 | shared 无测试 | 长期目标 | planned |
| TEST-017 | 测试盲区 | 长期目标 | planned |
| OBS-010 | DirectorDebugLogger 独立日志 | 功能合理 | planned |
| OBS-011 | LogRetention 两套实现 | 低优先级 | planned |
| OBS-012 | MemoryTelemetry 覆盖有限 | 低优先级 | planned |
| MAINT-022 | 耦合热点 | 长期优化 | planned |
| MAINT-024 | @ts-nocheck 合理 | 已评估可接受 | planned |
| MAINT-025 | eslint-disable 集中 | 数量少可接受 | planned |
| MAINT-030 | 魔数散布 | 与 P3 QUA-008 重叠 | 1 iteration |
| COMP-011~015 | 各类兼容性问题 | 低优先级 | planned |

---

## 统计

| 级别 | 总数 | 修复 | 跳过 | 处理率 |
|------|------|------|------|--------|
| P2 | 41 | 28 | 13 | 68% |
| P3 | 63 | 22 | 41 | 35% |
| P4 | 39 | 12 | 27 | 31% |
| **合计** | **143** | **62** | **81** | **43%** |

## 建议处理顺序

1. **1w 内**：处理被 P1 覆盖的问题（QUA-004, OBS-003, MAINT-015）
2. **1 iteration**：处理与 P2 重叠的问题
3. **planned**：长期优化目标，按优先级排序
