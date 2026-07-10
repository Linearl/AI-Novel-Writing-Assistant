---
description: "提取硬编码常量 — REQ-7032 任务拆解"
---

# REQ-7032 任务拆解

## 阶段一：常量提取

- [ ] **T1.1** ARCH-016: structuredOutput.ts 提取 `DEFAULT_SAFE_STRUCTURED_MAX_TOKENS` + 9 处替换
  - 文件：`server/src/llm/structuredOutput.ts`
  - 验证：grep safeStructuredMaxTokens 仅 1 处定义 + 9 处引用
- [ ] **T1.2** STA-017: 提取 `PIPELINE_POLL_INTERVAL_MS`
  - 文件：`server/src/services/novel/director/automation/novelDirectorAutoExecutionRuntime.ts`
  - 验证：常量定义 + 引用替换
- [ ] **T1.3** QUA-031: novelCoreShared.ts ruleScore() 魔法数字命名
  - 文件：`server/src/services/novel/novelCoreShared.ts`
  - 验证：所有内联数字替换为命名常量

## 阶段二：断路器阈值 + 锁超时

- [ ] **T2.1** ARCH-014: 断路器阈值添加环境变量 fallback 注释
  - 文件：`server/src/services/novel/director/runtime/DirectorCircuitBreakerService.ts`
  - 验证：5 个阈值常量上方有环境变量覆盖说明
- [ ] **T2.2** STA-016: busy-wait 锁加超时 + 指数退避
  - 文件：`server/src/services/novel/novelCorePipelineService.ts`
  - 验证：30s 超时抛错；退避间隔 50/100/200ms

## 阶段三：重复函数收敛

- [ ] **T3.1** QUA-016: shared 包创建 compactText/truncateText
  - 文件：`shared/utils/text.ts`（新建）
  - 验证：shared build 过；导出在 index.ts 中
- [ ] **T3.2** 替换 2-3 个调用点验证无循环依赖
  - 任选 2-3 个文件将自定义 compactText 替换为 shared 导入
  - `pnpm typecheck` 通过；`pnpm test` 通过

## 阶段四：验证

- [ ] **T4.1** `pnpm typecheck`
- [ ] **T4.2** `pnpm --filter @ai-novel/shared build`
- [ ] **T4.3** `pnpm test`
