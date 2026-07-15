# Tasks: REQ-3014 批量润色功能

> status: done
> updated: 2026-07-14

## 任务概览

| 阶段 | 任务数 | 预计工作量 |
|------|--------|-----------|
| 阶段一：后端 API | 4 | 3-4 小时 |
| 阶段二：前端组件 | 5 | 4-5 小时 |
| 阶段三：集成与测试 | 3 | 2-3 小时 |
| **总计** | **12** | **9-12 小时** |

---

## 阶段一：后端 API 实现

### T1.1 实现批量检测接口
- **目标**：实现 `POST /api/novel/:novelId/batch-style-detect`
- **依赖**：无
- **DoD**：
  - [x] 创建路由文件 `server/src/modules/novel/http/novelBatchStyleRoutes.ts`
  - [x] 调用 `StyleDetectionService.check()` 逐章检测
  - [x] 返回 `BatchDetectionResult` 格式数据
  - [x] 支持指定章节或检测全部
- **验证方式**：Postman 测试

### T1.2 实现批量修复接口
- **目标**：实现 `POST /api/novel/:novelId/batch-style-polish`
- **依赖**：T1.1
- **DoD**：
  - [x] 创建后台任务机制（可复用现有 BackgroundJobService）
  - [x] 调用 `StyleRewriteService.rewrite()` 修复章节
  - [x] 返回 `jobId` 用于进度追踪
  - [x] 支持中断和继续
  - [x] chapterIds透传bug修复
  - [x] 风险分≥35过滤逻辑修复
  - [x] 润色结果持久化到DB（autoApply=true）
- **验证方式**：Postman 测试

### T1.3 实现进度查询接口
- **目标**：实现 `GET /api/novel/:novelId/batch-style-polish/:jobId/progress`
- **依赖**：T1.2
- **DoD**：
  - [x] 返回任务状态和进度信息
  - [x] 支持实时更新（轮询或 WebSocket）
  - [x] 完成时返回完整结果
- **验证方式**：Postman 测试

### T1.4 实现取消接口
- **目标**：实现 `POST /api/novel/:novelId/batch-style-polish/:jobId/cancel`
- **依赖**：T1.2
- **DoD**：
  - [x] 支持优雅取消（完成当前章节后停止）
  - [x] 保存已完成的章节
  - [x] 返回取消确认
- **验证方式**：Postman 测试

---

## 阶段二：前端组件实现

### T2.1 创建批量润色 Hook
- **目标**：实现 `useBatchPolish` 和 `useBatchPolishProgress` Hook
- **依赖**：T1.1, T1.2, T1.3
- **DoD**：
  - [x] 创建 `client/src/components/batch-polish/hooks/useBatchPolish.ts`
  - [x] 封装 API 调用
  - [x] 管理批量润色状态
  - [x] 支持中断和继续
- **验证方式**：单元测试

### T2.2 实现触发按钮组件
- **目标**：实现 `BatchPolishButton` 组件
- **依赖**：T2.1
- **DoD**：
  - [x] 创建 `client/src/components/batch-polish/BatchPolishButton.tsx`
  - [x] 显示在批量操作菜单中
  - [x] 点击触发确认对话框
- **验证方式**：组件渲染测试

### T2.3 实现进度显示组件
- **目标**：实现 `BatchPolishProgress` 组件
- **依赖**：T2.1
- **DoD**：
  - [x] 创建 `client/src/components/batch-polish/BatchPolishProgress.tsx`
  - [x] 显示进度条和统计信息
  - [x] 支持暂停和取消按钮
  - [x] 实时更新当前处理的章节
- **验证方式**：组件渲染测试

### T2.4 实现结果展示组件
- **目标**：实现 `BatchPolishResult` 组件
- **依赖**：T2.1
- **DoD**：
  - [x] 创建 `client/src/components/batch-polish/BatchPolishResult.tsx`
  - [x] 显示汇总报告
  - [x] 列出所有处理的章节
  - [x] 支持查看详情
- **验证方式**：组件渲染测试

### T2.5 实现主入口组件
- **目标**：实现 `BatchPolish` 主入口组件
- **依赖**：T2.2, T2.3, T2.4
- **DoD**：
  - [x] 创建 `client/src/components/batch-polish/index.tsx`
  - [x] 集成所有子组件
  - [x] 管理组件状态流转
  - [x] 接入PipelineTab质量修复区
- **验证方式**：集成测试

---

## 阶段三：集成与测试

### T3.1 集成到小说详情页
- **目标**：将批量润色功能集成到小说详情页
- **依赖**：T2.5
- **DoD**：
  - [x] 在批量操作菜单中添加入口
  - [x] 传递小说 ID 到组件
  - [x] 处理完成后的刷新
- **验证方式**：E2E 测试

### T3.2 编写单元测试
- **目标**：为后端 API 和前端组件编写单元测试
- **依赖**：T1.x, T2.x
- **DoD**：
  - [x] 后端 API 测试覆盖 ≥ 80%
  - [x] 前端组件测试覆盖 ≥ 80%
  - [x] 通过 `pnpm test` 和 `pnpm test:client`
- **验证方式**：测试通过

### T3.3 编写 E2E 测试
- **目标**：测试完整批量润色流程
- **依赖**：T3.1
- **DoD**：
  - [x] 测试批量检测功能
  - [x] 测试批量修复功能
  - [x] 测试进度追踪功能
  - [x] 测试结果展示功能
- **验证方式**：E2E 测试通过

---

## 验收清单

### 功能验收
- [x] 批量检测返回所有章节的风险分
- [x] 批量修复只处理高风险章节（≥35分）
- [x] 进度追踪实时更新
- [x] 结果展示包含所有章节状态
- [x] 支持中断和继续
- [x] 支持取消操作

### 质量验收
- [x] `pnpm typecheck` 通过
- [x] `pnpm test` 通过
- [x] `pnpm test:client` 通过
- [x] 测试覆盖率 ≥ 80%
- [x] 无 ESLint 错误

### 文档验收
- [x] API 文档完整
- [x] 组件接口文档完整
- [x] 代码注释清晰
