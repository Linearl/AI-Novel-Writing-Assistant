---
description: "文笔体系自动闭环需求定义"
---

# REQ-2043 文笔体系自动闭环

## 背景

当前 styleEngine 模块状态：
- 消费侧已闭环：StyleBinding 存在时，章节生成自动注入 style_contract
- 生产侧未闭环：章节编辑后风格提取需手动按钮触发；拆书结果需手动 API 调用转化

用户的核心痛点是 AI 输出文笔一致性过高（AI 味重），手动修改成本高。需要自动化"从用户修改中学习"和"从拆书中提炼写法"两个环节。

## 需求描述

### 补丁A：章节编辑后自动提取风格

在 `novelCoreCrudService.updateChapter` 保存完成后，通过事件总线或直接调用 `ChapterEditDiffService`，自动提取反AI规则和写法偏好，更新关联的 StyleProfile。

### 补丁B：拆书完成后自动转化为 StyleProfile

在 BookAnalysis pipeline 完成时，自动调用 `StyleProfileService.createFromBookAnalysis`，将拆书结果转化为可用的 StyleProfile。

## 验收条件

1. 编辑章节保存后，后台自动执行风格提取（不阻塞保存响应）
2. 拆书完成后自动生成 StyleProfile（可在风格管理页面看到）
3. 现有手动触发按钮功能不受影响
4. 所有现有测试通过
