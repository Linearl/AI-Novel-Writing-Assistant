---
description: "P2 安全问题修复需求文档（原始版）"
---

# REQ-7001: P2 安全问题修复

## 需求来源

2026-07-01 全量代码审计报告

## 问题描述

### SEC-003: 文件路径遍历风险

**位置**: 
- `server/src/services/comic/ComicCharacterImageService.ts` (89-91行)
- `server/src/services/drama/visual/DramaShotKeyframeService.ts` (71-73行)

**问题**: 用户输入的 `charId` 参数直接拼接到文件路径中，未做路径规范化和白名单校验。

**攻击向量**: 攻击者构造 `charId=../../../etc/passwd` 可读取服务器任意文件。

**修复要求**:
1. 使用 `path.resolve()` 规范化路径
2. 验证最终路径在允许的目录范围内
3. 拒绝包含 `..` 的输入

---

### SEC-004: 无 CSRF 保护

**位置**: `server/src/app.ts` (91-105行)

**问题**: 状态变更 API (POST/PUT/DELETE) 无 CSRF token 验证。

**攻击向量**: 攻击者通过恶意网站诱导已认证用户发起状态变更请求。

**修复要求**:
1. 引入 `csrf-csrf` 或类似库
2. 为所有状态变更路由添加 CSRF 保护
3. 前端请求自动携带 CSRF token

---

### SEC-005: 错误响应泄露内部信息

**位置**: `server/src/middleware/errorHandler.ts` (287-315行)

**问题**: 生产环境错误响应包含完整的错误堆栈、文件路径、数据库结构等内部信息。

**攻击向量**: 攻击者通过触发服务器错误获取内部技术细节。

**修复要求**:
1. 生产环境仅返回通用错误消息
2. 详细错误信息仅记录到日志
3. 开发环境可保留详细错误（通过 NODE_ENV 控制）

---

### SEC-006: Prisma raw query 参数化审计

**位置**: `server/src/services/novel/worldContext/NovelWorldSyncService.ts` 等 20+ 处

**问题**: 大量使用 `prisma.$queryRaw`，若后续维护者引入字符串拼接可能导致 SQL 注入。

**修复要求**:
1. 审计所有 `prisma.$queryRaw` 调用
2. 确保使用 `Prisma.sql` 模板标签进行参数化
3. 添加 ESLint 规则禁止字符串拼接的 raw query

## 验收标准

1. 路径遍历攻击测试用例失败（无法读取目标目录外文件）
2. CSRF token 验证生效
3. 生产环境错误响应不包含内部信息
4. 所有 raw query 使用参数化
