# 任务清单 — REQ-7081 统一编排层

## 阶段 0：前置检查 + 需求确认

- [x] 需求文档已生成
- [x] 设计文档已生成
- [x] 决策日志已生成
- [ ] 确认 R7080（Director系统拆分）进度 — pipeline 迁移必须等 R7080 至少阶段1完成
- [ ] 确认当前工作区干净，无未提交变更干扰大规模重构

## 阶段 1：建立 orchestration/ 目录骨架 + router 框架

### T1.1: 创建目录结构和类型定义
- [ ] 创建 `orchestration/` 顶层目录及子目录：`agent/`、`pipeline/`、`graph/`、`runtime/`
- [ ] 定义 `orchestration/types.ts`：ExecutionContext、TaskType、RouteRequest、RouteResult
- [ ] `pnpm typecheck` 通过

### T1.2: 实现 router.ts
- [ ] 创建 `orchestration/router.ts`：根据 `TaskType` 分发到对应子系统
- [ ] 路由表设计：agent → orchestration/agent、pipeline → orchestration/pipeline 等
- [ ] 错误处理：未知 taskType 返回明确错误
- [ ] `pnpm typecheck` 通过

### T1.3: 创建 facade 兼容层骨架
- [ ] 在原目录创建 `index.ts` facade，重新导出新路径模块
- [ ] 添加 `@deprecated` 注释引导后续清理
- [ ] `pnpm typecheck` 通过

## 阶段 2：迁移 graph 子系统（最小依赖，先迁移）

### T2: graph 子系统迁移
- [ ] 列出 `graphs/` 和 `creativeHub/` 下所有文件
- [ ] 移动到 `orchestration/graph/`
- [ ] 更新内部导入路径（graph 模块之间的引用）
- [ ] 更新外部模块对 graph 的导入路径
- [ ] 在 `graphs/` 原目录创建 facade 重新导出
- [ ] 在 `creativeHub/` 原目录创建 facade 重新导出
- [ ] `pnpm typecheck` 通过
- [ ] 如有测试，运行相关测试

## 阶段 3：迁移 runtime 子系统

### T3.1: runtime 文件迁移
- [ ] 列出 `services/novel/runtime/` 和 `runtime/` 下所有文件
- [ ] 移动到 `orchestration/runtime/`，保持子目录结构
- [ ] 更新内部导入路径
- [ ] `pnpm typecheck` 通过

### T3.2: 外部导入路径更新
- [ ] 搜索全量对 `services/novel/runtime/` 和 `runtime/` 的导入引用
- [ ] 批量更新为新路径 `orchestration/runtime/`
- [ ] 在原目录创建 facade 重新导出
- [ ] `pnpm typecheck` 通过
- [ ] 运行 runtime 相关测试

## 阶段 4：迁移 agent 子系统

### T4.1: agent 文件迁移
- [ ] 列出 `agents/` 下所有文件
- [ ] 移动到 `orchestration/agent/`，保持子目录结构
- [ ] 更新内部导入路径
- [ ] `pnpm typecheck` 通过

### T4.2: 外部导入路径更新
- [ ] 搜索全量对 `agents/` 的导入引用
- [ ] 批量更新为新路径 `orchestration/agent/`
- [ ] 在 `agents/` 原目录创建 facade 重新导出
- [ ] `pnpm typecheck` 通过
- [ ] 运行 agent 相关测试

## 阶段 5：迁移 pipeline 子系统（依赖 R7080）

### T5.1: 前置检查
- [ ] 确认 R7080 Director 拆分至少阶段1完成
- [ ] R7080 拆分后的 director/ 模块结构明确

### T5.2: pipeline 文件迁移
- [ ] 列出 `services/novel/director/` 下所有文件（拆分后结构）
- [ ] 移动到 `orchestration/pipeline/`，保持子目录结构
- [ ] 更新内部导入路径
- [ ] `pnpm typecheck` 通过

### T5.3: 外部导入路径更新
- [ ] 搜索全量对 `services/novel/director/` 的导入引用
- [ ] 批量更新为新路径 `orchestration/pipeline/`
- [ ] 在原目录创建 facade 重新导出
- [ ] `pnpm typecheck` 通过
- [ ] 运行 director 相关测试

## 阶段 6：统一 Execution Context 实现

### T6: ExecutionContext 落地
- [ ] 实现 `orchestration/context.ts`：ExecutionContext 创建、读写、序列化
- [ ] 各子系统接入 ExecutionContext（agent、pipeline、graph、runtime）
- [ ] 替换各子系统原有的独立状态管理为统一 Context
- [ ] `pnpm typecheck` 通过
- [ ] 运行全量测试

## 阶段 7：全量验证 + 路径清理

### T7.1: 全局搜索残留引用
- [ ] grep 搜索 `from ['"]\.\.\/agents\/` 等旧路径模式
- [ ] grep 搜索 `from ['"]\.\/agents\/` 等旧路径模式
- [ ] 逐一修复遗漏的导入路径
- [ ] `pnpm typecheck` 通过

### T7.2: 构建与测试验证
- [ ] `pnpm build` 构建全部包（shared → server → client → desktop）
- [ ] `pnpm test:all` 全量测试通过
- [ ] `pnpm typecheck` 零错误

### T7.3: 运行时验证
- [ ] 启动 `pnpm dev` 完整开发环境
- [ ] 手动验证核心流程：创建小说 → AI对话 → 导演流水线 → 章节生成
- [ ] 验证桌面端 Electron 打包

## 阶段 8：收尾

### T8: 文档与提交
- [ ] 更新 CODEOWNERS / CLAUDE.md 中关于编排系统的描述
- [ ] 更新 `run_result.json` 状态为 `done`
- [ ] 更新 `tasks.md` 所有任务勾选
- [ ] 更新 `README.md` 状态
- [ ] 提交变更（大规模重构建议拆分为多个 commit）
