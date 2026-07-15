---
description: "多素材导入与按需加载系统——NovelMaterial 表设计、接口解耦、material_index context group、B2 两轮材料加载机制"
---

# REQ-2054 多素材导入与按需加载系统（冻结副本）

> 本文件为原始需求冻结副本，创建后不再修改。后续变更请更新工作副本 `REQ-2054-material-import-system.md`。
> 原始需求来自 2026-07-15 对话中的方案讨论。

## 冻结时间

2026-07-15

## 原始需求摘要

1. 允许用户导入多份文档（文件/文件夹）作为参考材料
2. 新增 `NovelMaterial` 表，每条材料独立存储，附带 AI 生成描述
3. `storyInput` 改为 AI 汇总的"概要 + 材料列表"
4. 接口解耦：parse-material（解析）与 import-material（导入）分离
5. 新增 `material_index` context group + B2 两轮材料加载
6. 前端支持文件夹选择 + 材料管理页面
