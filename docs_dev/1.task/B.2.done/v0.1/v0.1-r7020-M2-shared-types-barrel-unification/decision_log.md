---
description: "REQ-7020 共享类型 Barrel 统一导出——决策日志"
update_time: 2026-07-10
---

# REQ-7020 决策日志

## D1: 保留 `shared/types/index.ts` 作为内部索引

**日期**：2026-07-10
**决策**：不删除 `shared/types/index.ts`，保留为内部索引
**原因**：shared 包内部代码（types 之间相互引用）仍需通过内层 barrel；删除会导致 types 内部 import 混乱
**影响**：两个 barrel 文件并存，维护时需保持同步（可通过脚本或 CI 检查）

## D2: chapterRuntime.ts 按子域拆分而非按类型拆分

**日期**：2026-07-10
**决策**：按业务子域（draft/review/generation）拆分，而非按 TypeScript 类型类别（types/schemas/interfaces）
**原因**：同一子域的类型、schema、接口通常一起修改，放在一起减少跨文件编辑
**影响**：每个子文件包含该子域的所有类型定义，保持高内聚

## D3: import 替换使用脚本辅助，不手动逐个替换

**日期**：2026-07-10
**决策**：编写或使用现有的 import 替换脚本，自动化深层导入路径替换
**原因**：约 500 处 import 语句，手动替换易出错且耗时
**影响**：需先确认脚本的正确性（dry-run 模式），再批量执行

## D4: 命名冲突时使用 `as` 别名而非重命名类型

**日期**：2026-07-10
**决策**：barrel 合并后如出现命名冲突，使用 import `as` 别名解决
**原因**：重命名类型会引发连锁反应，影响范围远超 import 替换任务
**影响**：个别文件中可能出现 `import { Chapter as ChapterType }` 形式的别名
