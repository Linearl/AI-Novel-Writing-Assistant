---
description: "REQ-7022 Services 目录收敛与大文件拆分 —— 任务清单"
update_time: 2026-07-10
---

# REQ-7022 任务清单

## Phase 1: 大小审计

- [ ] 1.1 统计 services/ 下所有 .ts 文件行数，输出 >680 行文件清单
- [ ] 1.2 对每个超大文件分析职责边界，制定拆分方案
- [ ] 1.3 分析 8 个大文件的 import 图，检测潜在循环依赖

## Phase 2: 大文件拆分

- [ ] 2.1 拆分第 1-2 个超大文件（按职责边界拆 + facade index.ts）
- [ ] 2.2 拆分第 3-4 个超大文件
- [ ] 2.3 拆分第 5-6 个超大文件
- [ ] 2.4 拆分第 7-8 个超大文件
- [ ] 2.5 验证所有拆分后文件 <600 行 + typecheck

## Phase 3: Director 子目录收敛

- [ ] 3.1 审计 debug/ (2) 和 commands/ (3) 的 export 和 import 关系
- [ ] 3.2 执行合并到 operations/，更新所有 import 路径
- [ ] 3.3 删除空洞目录（debug/ 和 commands/）

## Phase 4: Novel 子目录内聚性审计

- [ ] 4.1 遍历 34 个 novel 子目录，统计文件数/职责
- [ ] 4.2 标记可合并项（文件数 <3 且职能重叠的）
- [ ] 4.3 输出审计报告

## Phase 5: State 文件去重

- [ ] 5.1 对比 director/StateXxx.ts 与 director/state/Xxx.ts 重复项
- [ ] 5.2 合并重复 state 或重命名消除歧义
- [ ] 5.3 全量验证：typecheck + test + lint
