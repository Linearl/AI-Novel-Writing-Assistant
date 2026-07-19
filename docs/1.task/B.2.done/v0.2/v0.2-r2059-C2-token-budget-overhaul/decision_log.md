---
description: "REQ-2059 决策留痕"
update_time: 2026-07-18
---
# REQ-2059 决策留痕

| 日期 | 决策 | 理由 |
| --- | --- | --- |
| 2026-07-18 | 估算函数改为 text.length，预算值 ×4 补偿 | 用户体感不变，消除 CJK 偏差；比引入复杂 CJK 检测逻辑更简单可靠 |
| 2026-07-18 | YAML 配置文件放在 server/configs/ 而非 prompting/ 目录 | 配置与代码分离；configs/ 目录语义更清晰；便于运维人员调整 |
| 2026-07-18 | YAML 加载保留 TypeScript fallback | YAML 文件缺失或解析失败时服务仍能启动；渐进式迁移 |
| 2026-07-18 | 预算紧张步骤额外 ×2 放大（audit.light、chapter_list 等） | 诊断显示利用率 >90% 或溢出；接入 outline+material 后空间更紧张 |
| 2026-07-18 | P5（零预算 prompt）不处理 | 多数是轻量 prompt（character、style、world），无上下文过滤是设计意图 |
| 2026-07-18 | P7（溢出告警）和 P8（4096 静默吞掉）不在本期 | 独立关注点，不阻塞预算系统重构；后续单独任务包处理 |
