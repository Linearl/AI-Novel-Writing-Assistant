---
description: "REQ-2057 任务清单：LLM 限流器 TPM/RPM 增强 + 公平调度 + WAL"
reqId: 2057
type: tasks
status: done
created: 2026-07-18
updated: 2026-07-18
---

# 任务清单：LLM 限流器 TPM/RPM 增强 + 公平调度 + WAL

## 阶段一：Schema、存储层与数据库

- [x] **T1** ProviderSecret schema 新增 rpm/tpm 字段 + SQLite WAL
  - 文件：`server/src/prisma/schema.sqlite.prisma`、`schema.prisma`
  - 新增 `rpm Int @default(100)`
  - 新增 `tpm Int @default(10000000)`
  - 执行 `pnpm db:migrate` 生成迁移
  - 文件：`server/src/db/prisma.ts`（或 client 初始化处）
  - 启动时执行 `PRAGMA journal_mode=WAL`，消除并行写入时的 SQLITE_BUSY

- [x] **T2** 存储层读写 rpm/tpm
  - 文件：`server/src/services/settings/secretStore/DatabaseSecretStore.ts`
  - `toProviderSecret()` 映射 rpm/tpm 字段
  - `createProvider()` / `updateProvider()` 支持 rpm/tpm

## 阶段二：限流器核心

- [x] **T3** RPM 滑动窗口实现
  - 文件：`server/src/llm/requestLimiter.ts`
  - 新增 `RpmSlidingWindow` 类：`timestamps: number[]`，`acquire()` 检查 + 记录，`cleanup()` 清理过期
  - 窗口大小 60 秒，maxCount 从配置读取

- [x] **T4** TPM 令牌桶实现
  - 文件：`server/src/llm/requestLimiter.ts`
  - 新增 `TpmTokenBucket` 类：`capacity`、`available`、`lastRefillAt`
  - `refill()` 按时间差补充令牌（rate = capacity/60/秒）
  - `consume(tokens)` 扣减，`tryAcquire()` 检查 + refill
  - `available < 0` 时阻塞

- [x] **T5** 三维度放行 + 公平调度
  - 文件：`server/src/llm/requestLimiter.ts`
  - `ProviderModelRequestLimiter` 构造函数接收 rpm/tpm
  - `processQueue()` 依次检查：concurrencyLimit → rpmWindow → tpmBucket
  - 限流器 key 新增 rpm/tpm 维度
  - **公平调度（双队列轮转）**：按来源（novelId 或 provider+model 维度）维护多个子队列，`processQueue` 按 round-robin 轮转取请求，保证多 novel 并行时各获得约 50% 并发槽；单 novel 时退化为 FIFO，无额外开销

- [x] **T6** TPM 事后回填
  - 文件：`server/src/llm/requestLimiter.ts`
  - `run()` 的 `.then()` 中从 LLM 响应提取 usage
  - `extractUsage(result)` 兼容 OpenAI 格式 `response.usage`
  - usage 不存在时跳过扣减

## 阶段三：工厂层集成

- [x] **T7** factory.ts 加载 rpm/tpm
  - 文件：`server/src/llm/factory.ts`
  - `resolveLLMClientOptions()` 从 provider 配置读取 rpm/tpm
  - `attachLLMRequestLimiter()` 传递 rpm/tpm 给 limiter

## 阶段四：前端设置页

- [x] **T8** Provider 表单新增 rpm/tpm 输入框
  - 文件：`client/src/pages/settings/` 相关组件
  - 新增 rpm 数字输入（默认 100）
  - 新增 tpm 数字输入（默认 10000000）
  - 创建时预填默认值

## 阶段五：验证

- [x] **T9** 类型检查与构建
  - `pnpm typecheck` — 0 errors
  - `pnpm build` — 全量构建通过

- [x] **T10** 测试
  - `pnpm test` — 现有测试通过
  - 验证 RPM 超限时请求排队
  - 验证 TPM 回填生效
  - 验证三维度取最严
  - 验证两 novel 并行时公平轮转（各获 ~50% 并发槽）
  - 验证 SQLite WAL 模式下无 SQLITE_BUSY

## 依赖

- T1 → T2（schema 先于存储层）
- T3/T4 可并行（RPM 和 TPM 独立实现）
- T3 + T4 → T5（三维度集成 + 公平调度依赖两者）
- T5 → T6（回填在集成后的 run() 中）
- T7 依赖 T5（factory 传递配置给 limiter）
- T8 独立于后端（前端可先行）
- T9/T10 在 T7 + T8 完成后执行

## 验收标准

1. 同一 provider+model 的请求受 rpm/tpm/concurrencyLimit 三重限制
2. RPM 超限时请求排队等待，不触发 429
3. TPM 事后回填准确，令牌桶正确 refill
4. 多 novel 并行时公平轮转，各获得约 50% 并发槽
5. 设置页可配置 rpm/tpm，默认值预填
6. 已有 provider 记录使用默认值，无需手动迁移
7. SQLite WAL 模式生效，并行写入无 SQLITE_BUSY
