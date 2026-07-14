---
description: "创建页素材导入设计方案"
---

# 设计文档

## 方案

### AI 拆分
- 使用结构化 prompt 让 LLM 识别素材类型
- 输出 JSON 映射：{ title, description, worldSetting, characters[], outline, ... }

### 前端交互
- 创建页顶部新增"粘贴素材"入口
- 弹窗 → 粘贴 → 拆分预览 → 确认填入

## 与步骤间传递的关系
- 本任务解决入口灵活性问题
- 步骤间链式传递已实现，不需要改造
