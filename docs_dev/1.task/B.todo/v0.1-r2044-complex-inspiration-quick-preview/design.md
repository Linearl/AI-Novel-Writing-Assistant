---
description: "灵感页快速预览设计方案"
---

# 设计文档

## 方案

### 快速预览 API
- 不走完整的 auto-director 流水线
- 使用轻量 prompt 直接生成 3 个方向候选
- 每个候选包含：title、synopsis（100字）、previewText（500字）

### 前 3 章快速生成
- 复用现有章节生成能力
- 跳过卷战略/拆章等重规划步骤
- 直接基于选定方向的 synopsis 生成

### 转入正式流程
- 预览选定的方向自动填入创建页表单
- 用户补充/调整设定后进入 auto-director

## 技术选型
- 后端：新增 controller，复用现有 LLM 调用层
- 前端：NovelCreate 页面内新增预览区域
