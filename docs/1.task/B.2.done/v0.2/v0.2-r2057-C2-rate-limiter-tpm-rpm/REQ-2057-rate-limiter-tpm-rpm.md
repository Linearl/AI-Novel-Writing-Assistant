---
description: "REQ-2057 需求文档：LLM 限流器增强 — TPM/RPM + 公平调度 + WAL"
reqId: 2057
type: requirement
status: approved
created: 2026-07-18
updated: 2026-07-18
---

# REQ-2057: LLM 限流器增强 — TPM/RPM + 公平调度 + WAL

## 背景

当前 LLM 限流器 `ProviderModelRequestLimiter`（`server/src/llm/requestLimiter.ts`）仅支持两层限制：
1. `concurrencyLimit` — 同时在飞的请求数上限
2. `requestIntervalMs` — 两次请求之间的最小间隔

模型厂商（DeepSeek、OpenAI 等）通常限制 TPM（tokens/min）、RPM（requests/min）、并发请求数三个维度。当前限流器不覆盖 TPM/RPM，用户配置不当或两本小说并行生产时容易触发厂商 rate limit（429 错误）。

限流器的 key 维度是 `provider:model:concurrencyLimit:requestIntervalMs`，不同 provider+model 有独立的并发池，互不干扰。但同一 provider+model 下的多个请求共享同一 FIFO 队列，多 novel 并行时缺少公平调度。

同时 SQLite 默认 journal 模式在并行写入时可能触发 SQLITE_BUSY。

## 目标

1. 在限流器中新增 RPM（滑动窗口计数）和 TPM（事后扣减令牌桶）支持
2. ProviderSecret schema 新增 `rpm`、`tpm` 字段，默认值 `rpm=100`、`tpm=10000000`
3. 三个维度（并发数 / RPM / TPM）取最严者决定是否放行
4. 新增双队列轮转公平调度，保证多 novel 并行时各获得约 50% 并发槽
5. SQLite 启动时切换 WAL 模式，消除并行写入 SQLITE_BUSY
6. 设置页创建/编辑 provider 时展示并允许修改这三个参数
7. 向后兼容：已有 provider 记录使用默认值，无需用户手动迁移

## 非目标

- 不做章节间并行生成（更大改动，独立需求）
- 不改变 SQLite → PostgreSQL 的数据库选型

## EARS 验收条目

1. **WHEN** 请求进入限流器，**THE SYSTEM SHALL** 同时检查并发数、RPM、TPM 三个维度，取最严者决定放行
2. **WHEN** RPM 在 1 分钟滑动窗口内达到上限，**THE SYSTEM SHALL** 将请求排队等待下一窗口释放
3. **WHEN** LLM 请求完成，**THE SYSTEM SHALL** 从响应的 `usage` 字段回填 token 消耗到 TPM 桶
4. **WHEN** ProviderSecret 表中 `rpm`/`tpm` 为 0 或 null，**THE SYSTEM SHALL** 使用默认值（rpm=100, tpm=10000000）
5. **WHEN** 用户在设置页创建新 provider，**THE SYSTEM SHALL** 预填默认的 rpm=100、tpm=10000000、concurrencyLimit=10
6. **WHEN** TPM 回填时 provider 响应不包含 usage 字段，**THE SYSTEM SHALL** 跳过本次扣减并记录 debug 日志
7. **WHEN** 多个 novel 的请求同时排队，**THE SYSTEM SHALL** 按 round-robin 轮转调度，保证各 novel 获得约 50% 并发槽
8. **WHEN** 服务器启动，**THE SYSTEM SHALL** 将 SQLite journal 模式切换为 WAL

## 关键文件

- `server/src/llm/requestLimiter.ts` — 限流器核心（RPM/TPM/公平调度）
- `server/src/llm/factory.ts` — LLM 客户端工厂，加载 provider 配置
- `server/src/prisma/schema.sqlite.prisma` / `schema.prisma` — ProviderSecret schema
- `server/src/db/prisma.ts` — SQLite WAL 设置
- `server/src/services/settings/secretStore/` — provider 配置存储
- `client/src/pages/settings/` — 设置页 UI

## 风险

- **中风险**：TPM 事后扣减需要从 LLM 响应拿 usage，部分 provider 可能不返回 → 降级为不扣减
- **低风险**：RPM 滑动窗口内存开销（每 provider+model 一个 Map，可忽略）
