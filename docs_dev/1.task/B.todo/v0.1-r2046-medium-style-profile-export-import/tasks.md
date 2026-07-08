---
description: "写法模板导出/导入任务清单"
---

# 任务清单

## 阶段一：后端 API

- [ ] 1.1 导出 API（GET /style-engine/style-profiles/:id/export）
- [ ] 1.2 导入 API（POST /style-engine/style-profiles/import）
- [ ] 1.3 冲突检测和处理逻辑

## 阶段二：前端 UI

- [ ] 2.1 风格管理页面新增导出按钮
- [ ] 2.2 导入按钮 + 文件选择 + 预览
- [ ] 2.3 冲突处理对话框

## 阶段三：验证

- [ ] 3.1 导出 → 导入还原测试
- [ ] 3.2 冲突处理测试
- [ ] 3.3 pnpm typecheck + pnpm build 通过
