---
description: "REQ-7015 前端公共样式与组件提取 — 决策留痕"
---

# REQ-7015 决策留痕

## 决策记录

### D-01：Textarea 组件不引入 Radix 原语

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | AI 建议 |
| 决策内容 | 使用原生 `<textarea>` + className 封装，不引入 `@radix-ui/react-textarea` |
| 决策理由 | Radix 无独立 textarea 包；项目已有 9 个 Radix 依赖，保持轻量；原生 textarea 已满足需求 |
| 备选方案 | 引入 Headless UI 的 Textarea — 额外依赖无必要 |

### D-02：CSS 拆分用 @import 而非动态加载

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | AI 建议 |
| 决策内容 | 移动端样式拆分到 `styles/mobile/*.css`，通过 `@import` 在 `index.css` 中统一引入 |
| 决策理由 | Vite 会自动合并 CSS import，构建产物不变；开发时文件更易维护 |
| 备选方案 | 路由级动态 import CSS — 增加复杂度，移动端样式量不值得 |

### D-03：StatusBadge 基于已有 Badge 组件扩展

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | AI 建议 |
| 决策内容 | 新建 `status-badge.tsx`，内部使用 CVA 定义 status 语义 variant，不修改已有 `badge.tsx` |
| 决策理由 | Badge 组件已用于数字标记等场景，不应混入 status 语义；独立组件更清晰 |
| 备选方案 | 在已有 Badge 上增加 variant — 可能影响已有使用场景 |

### D-04：语义化 token 替换保留合理例外

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-09 |
| 决策者 | AI 建议 |
| 决策内容 | 仅替换语义等价的 token，保留数据可视化、图表等需要精确颜色控制的场景 |
| 决策理由 | recharts 等图表库需要精确颜色值，替换为语义 token 会导致颜色不可预测 |
| 备选方案 | 全部替换 — 图表颜色会随主题变化，不可接受 |
