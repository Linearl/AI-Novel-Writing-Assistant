---
description: "REQ-2036 用户反馈系统任务拆解"
---

# REQ-2036 任务拆解

> 版本：v0.1 | 复杂度：medium | 子任务：6 个

---

## 总表

| 序号 | ID | 任务 | 优先级 | 预估 | 状态 |
|---|---|---|---|---|---|
| T1 | BE-001 | 后端基础设施搭建 | P3 | 2h | 📋 |
| T2 | BE-002 | 反馈提交 API | P3 | 3h | 📋 |
| T3 | BE-003 | 反馈管理 API | P3 | 4h | 📋 |
| T4 | BE-004 | 评论系统 API | P3 | 2h | 📋 |
| T5 | FE-001 | 反馈提交前端组件 | P3 | 3h | 📋 |
| T6 | FE-002 | 反馈管理前端组件 | P3 | 4h | 📋 |

---

## 逐项展开

### T1: BE-001 后端基础设施搭建

**目标**: 搭建反馈系统的后端基础架构

**子任务**:
- [ ] T1.1 创建 `server/src/shared/feedbackRoot.ts` 配置反馈根目录
- [ ] T1.2 创建 `server/src/schemas/feedback.ts` Zod schema
- [ ] T1.3 创建 `server/src/routes/feedback.ts` 路由文件
- [ ] T1.4 在 `server/src/index.ts` 注册反馈路由
- [ ] T1.5 添加速率限制中间件

**验收**: 路由可访问，schema 校验生效

---

### T2: BE-002 反馈提交 API

**目标**: 实现 POST /api/feedback 端点

**子任务**:
- [ ] T2.1 实现文件夹创建逻辑（`{userId}_{timestamp}/`）
- [ ] T2.2 实现 issue.md 生成和写入
- [ ] T2.3 实现附件上传（multer 配置）
- [ ] T2.4 实现参数校验（Zod schema）
- [ ] T2.5 添加错误处理

**验收**: 可成功提交反馈，文件夹和 issue.md 正确创建

---

### T3: BE-003 反馈管理 API

**目标**: 实现反馈列表、详情、归档、删除端点

**子任务**:
- [ ] T3.1 实现 `feedbackAdminService.ts` 服务
- [ ] T3.2 实现 GET /api/feedback/admin/reviews（列表）
- [ ] T3.3 实现 GET /api/feedback/admin/reviews/:folderName（详情）
- [ ] T3.4 实现 POST /api/feedback/admin/reviews/:folderName/archive（归档）
- [ ] T3.5 实现 DELETE /api/feedback/admin/reviews/:folderName（删除）
- [ ] T3.6 添加管理员认证中间件

**验收**: 管理员可查看、归档、删除反馈

---

### T4: BE-004 评论系统 API

**目标**: 实现评论列表和添加端点

**子任务**:
- [ ] T4.1 实现 GET /api/feedback/:folderName/comments
- [ ] T4.2 实现 POST /api/feedback/:folderName/comments
- [ ] T4.3 评论存储到 `comments/` 目录
- [ ] T4.4 评论按时间排序

**验收**: 可添加和查看评论

---

### T5: FE-001 反馈提交前端组件

**目标**: 实现用户反馈提交 UI

**子任务**:
- [ ] T5.1 创建 `FeedbackDialog.tsx` 组件
- [ ] T5.2 实现表单（标题、描述、严重程度）
- [ ] T5.3 实现附件上传组件
- [ ] T5.4 实现提交逻辑和成功提示
- [ ] T5.5 添加入口（设置菜单或帮助按钮）

**验收**: 用户可通过 UI 提交反馈

---

### T6: FE-002 反馈管理前端组件

**目标**: 实现管理员反馈管理 UI

**子任务**:
- [ ] T6.1 创建 `FeedbackList.tsx` 组件
- [ ] T6.2 创建 `FeedbackDetail.tsx` 组件
- [ ] T6.3 实现反馈列表（卡片展示、筛选）
- [ ] T6.4 实现反馈详情（内容、附件预览）
- [ ] T6.5 实现评论区
- [ ] T6.6 实现归档操作

**验收**: 管理员可通过 UI 管理反馈

---

## 依赖关系

```
T1 (基础设施) ──→ T2 (提交 API) ──→ T3 (管理 API) ──→ T4 (评论 API)
                                                      ↓
                  T5 (提交 UI) ──────────────────→ T6 (管理 UI)
```

---

## DoD (Definition of Done)

- 所有子任务完成
- typecheck 通过
- test 通过
- build 通过
- 决策日志更新
