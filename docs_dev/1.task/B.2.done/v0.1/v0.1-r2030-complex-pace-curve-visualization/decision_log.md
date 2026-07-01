---
description: "REQ-2030 决策留痕"
---

# REQ-2030 决策留痕

| # | 决策点 | 决策 | 理由 | 日期 |
| --- | --- | --- | --- | --- |
| D1 | 图表库选择 | recharts 为首选，visx/纯 SVG 为备选 | recharts 与 React 19 兼容好，API 简洁；若安装后发现 peer dependency 冲突再降级 | 2026-06-30 |
| D2 | API 粒度 | 按小说聚合（一次返回全书） | 前端一次性渲染，避免多请求瀑布；章节数一般 <200，数据量可控 | 2026-06-30 |
| D3 | 编辑目标表 | 未写章节写入 `VolumeChapterPlan` | 与 beat sheet 生成流程一致；已写章节来自 `Chapter` 表，只读 | 2026-06-30 |
| D4 | 窄屏策略 | 只显示 conflictLevel 单线 | revealLevel 在移动端可隐藏，减少信息密度；用户仍可切换查看 | 2026-06-30 |
