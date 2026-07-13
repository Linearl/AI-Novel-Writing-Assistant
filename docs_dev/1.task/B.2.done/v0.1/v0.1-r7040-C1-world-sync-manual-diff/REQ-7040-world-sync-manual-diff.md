---
reqId: 7040
title: 世界同步手动对比功能
status: done
version: v0.1
priority: C1
created: 2026-07-13
updated: 2026-07-13
---

# REQ-7040 世界同步手动对比功能

## 需求描述

世界工作台修改世界库后，小说世界的同步功能需要：

1. 添加手动对比功能，让用户可以手动触发JSON对比
2. 统一自动对比和手动对比的差异显示
3. 确保同步操作正确更新NovelWorld的structuredDataJson
4. 忽略metadata.lastGeneratedAt字段的差异对比

## 验收标准

- [x] 手动对比API正常工作
- [x] 自动对比API正常工作
- [x] 同步操作正确更新数据库
- [x] 同步后自动对比和手动对比都显示一致
- [x] UI中移除多余的"立即拉取世界库更新"按钮
