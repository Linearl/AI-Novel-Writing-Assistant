---
description: "REQ-2057: LLM 限流器增强 — 新增 TPM/RPM 支持"
reqId: 2057
title: "LLM 限流器增强：TPM/RPM 支持"
status: requirements_ready
priority: P2
complexity: C2
estimatedEffort: "1.5天"
version: v0.2
created: 2026-07-18
updated: 2026-07-18
---

## 概要

当前 LLM 限流器（`ProviderModelRequestLimiter`）仅支持并发请求数（`concurrencyLimit`）和请求间隔（`requestIntervalMs`）两层限制，不覆盖模型厂商常见的 TPM（tokens/min）和 RPM（requests/min）限制。两本小说并行生产时，共享同一 provider+model 的并发池，缺少公平调度和总量控制，容易触发厂商 rate limit。

## 目标

1. 在限流器中新增 RPM（滑动窗口计数）和 TPM（事后扣减令牌桶）支持
2. ProviderSecret schema 新增 `rpm`、`tpm` 字段，默认值 `rpm=100`、`tpm=10000000`
3. 三个维度（并发数 / RPM / TPM）取最严者决定是否放行
4. 设置页创建/编辑 provider 时展示并允许修改这三个参数
5. 向后兼容：已有 provider 记录使用默认值，无需用户手动迁移

## 非目标

- 不做跨 novel 的公平队列调度（后续独立需求）
- 不做章节间并行生成（更大改动，独立需求）
- 不改变 SQLite → PostgreSQL 的数据库选型

## EARS 验收条目

1. **WHEN** 请求进入限流器，**THE SYSTEM SHALL** 同时检查并发数、RPM、TPM 三个维度
2. **WHEN** RPM 在 1 分钟窗口内达到上限，**THE SYSTEM SHALL** 将请求排队等待下一窗口
3. **WHEN** LLM 请求完成，**THE SYSTEM SHALL** 从响应的 `usage` 字段回填 token 消耗到 TPM 桶
4. **WHEN** ProviderSecret 表中 `rpm`/`tpm` 为 0 或 null，**THE SYSTEM SHALL** 使用默认值（rpm=100, tpm=10M）
5. **WHEN** 用户在设置页创建新 provider，**THE SYSTEM SHALL** 预填默认的 rpm/tpm/concurrencyLimit 值

## 关键文件

- `server/src/llm/requestLimiter.ts` — 限流器核心
- `server/src/llm/factory.ts` — LLM 客户端工厂，加载 provider 配置
- `server/src/prisma/schema.sqlite.prisma` / `schema.prisma` — ProviderSecret schema
- `server/src/services/settings/secretStore/` — provider 配置存储
- `client/src/pages/settings/` — 设置页 UI

## 风险

- **中风险**：TPM 事后扣减需要从 LLM 响应拿 usage，部分 provider 可能不返回 → 降级为不扣减
- **低风险**：RPM 滑动窗口内存开销（每 provider+model 一个 Map，可忽略）
