---
description: "移除漫画和短剧模块的需求定义"
---

# REQ-7013 移除漫画和短剧模块

## 背景

产品需求优先级诊断报告（2026-07-08）基于王慧文产品课框架分析，确认漫画和短剧模块属于功能蔓延：
- 技术成本极高（图像生成、视频生成、配音合成）
- A+E 用户（网文作者）核心需求是文字产出
- PMF 未验证时不应分散资源

## 需求描述

从代码库中安全移除漫画（comic）和短剧（drama）相关的前后端代码，包括模块、路由、页面，但保留 shared 类型定义（避免破坏其他模块引用）。

## 验收条件

1. server 模块移除后 pnpm typecheck 通过
2. client 页面移除后 pnpm build 通过
3. 所有现有测试通过
4. 移除不破坏其他模块的功能

## 范围

### 包含
- server/src/modules/comic/ 和 server/src/modules/drama/
- client/src/pages/ 下相关页面
- app.ts 中相关路由注册

### 不包含
- shared/types/ 中的类型定义（保留或安全处理）
- 数据库 schema（不删除表，只断开代码引用）
