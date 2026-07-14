---
description: "REQ-7022 Services 目录收敛与大文件拆分 —— 任务清单"
update_time: 2026-07-10
---

# REQ-7022 任务清单

## Phase 1: 大小审计

- [x] 1.1 统计 services/ 下所有 .ts 文件行数，输出 >680 行文件清单
- [x] 1.2 对每个超大文件分析职责边界，制定拆分方案
- [x] 1.3 分析 8 个大文件的 import 图，检测潜在循环依赖

## Phase 2: 大文件拆分

- [x] 2.1 拆分 novelCoreShared.ts (799行) → novelCoreShared/ 目录 (types 285 + helpers 445 + serialization 124 + facade 9)
- [x] 2.2 拆分 plannerChapterGeneration.ts (709行) → 提取 types 到 plannerChapterGenerationTypes.ts, 减至671行
- [x] 2.3 拆分 ragIndexServiceDataPipeline.ts (683行) → 提取 loadSourceDocuments + RagPipelineDeps, 减至~365行
- [x] 2.4 其余3个边界文件(719/703/700行)分析后判定为高风险拆分，保留现状
- [x] 2.5 验证所有拆分后文件 typecheck 通过

## Phase 3: Director 子目录收敛

- [x] 3.1 审计 debug/ (2) 和 commands/ (3) 的 export 和 import 关系
- [x] 3.2 执行合并到 operations/，更新所有 import 路径 (已完成，operations/index.ts 已存在)
- [x] 3.3 删除空洞目录（debug/ 和 commands/）(已删除)

## Phase 4: Novel 子目录内聚性审计

- [x] 4.1 遍历 novel 子目录，统计文件数/职责
- [x] 4.2 标记可合并项 → 所有小目录有清晰领域边界，不建议合并
- [x] 4.3 输出审计报告

## Phase 5: State 文件去重

- [x] 5.1 对比 director/StateXxx.ts 与 director/state/Xxx.ts 重复项 → director/ 下无 State*.ts 文件
- [x] 5.2 合并重复 state 或重命名消除歧义 → 无需操作
- [x] 5.3 全量验证：typecheck + test + lint
