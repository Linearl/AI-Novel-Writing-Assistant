---
description: "REQ-7066 artifactSyncMode 前端选择器 — 决策日志"
update_time: 2026-07-14
---

## 决策记录

### D1: UI 位置

- **决策**：放在章节设置或导演配置面板中，具体位置由实现时确定
- **理由**：artifactSyncMode 影响全书的章节产出行为，属于项目级配置，不放单章编辑器中
- **日期**：2026-07-14

### D2: 控件类型

- **决策**：RadioGroup 或 SegmentedControl，不用于普通 Select
- **理由**：三选项语义明确，RadioGroup 展示更直观
- **日期**：2026-07-14
