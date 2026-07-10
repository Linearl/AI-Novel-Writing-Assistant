---
description: "REQ-7027 遗留代码清理 — 方案设计"
---

# REQ-7027 方案设计

## 1. 方案概述

直接删除 Chat 功能遗留代码文件及未使用依赖。在删除前先审计全仓引用关系，确保安全移除。

### 1.1 设计目标

1. 删除文件数量最小化（仅目标文件）
2. 不引入回归
3. typecheck + test + build 全绿

### 1.2 关键决策

1. **先审计后删除**：避免遗漏引用导致 typecheck 失败
2. **逐文件删除**：每个文件删除后独立验证
3. **保留重定向**：`/chat` → `/creative-hub` 301 重定向保持不变

### 1.3 不在范围

- 不修改 Creative Hub 功能
- 不审计其他未使用依赖

---

## 2. 实现细节

### 2.1 文件变更清单

| 操作 | 文件 |
|------|------|
| 删除 | `client/src/store/chatStore.ts` |
| 删除 | `client/src/api/chat.ts` |
| 删除 | `server/src/routes/chat.ts` |
| 编辑 | `server/src/app.ts`（移除 chat 路由注册） |
| 编辑 | `client/package.json`（移除 vite-plugin-pages） |

### 2.2 app.ts 修改

```typescript
// 移除以下行（如存在）
import chatRoutes from "./routes/chat";
app.use("/api/chat", chatRoutes);
```

### 2.3 package.json 修改

```json
// 移除 devDependencies 中的
"vite-plugin-pages": "^x.x.x"
```

---

## 3. 接口定义

无新增 API 接口。

---

## 4. 数据模型

无数据库变更。

---

## 5. 异常处理

无。本次为纯删除操作，不存在运行时异常场景。

---

## 6. 验证策略

1. grep 审计：确认无残留 import
2. typecheck：`pnpm typecheck` 零错误
3. 测试：`pnpm test` 全量通过
4. 构建：`pnpm build` 成功
