---
description: "REQ-2062 方案设计"
update_time: 2026-07-21
---

# REQ-2062 方案设计

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                     构建流程                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  server/dev.db (原始)                                        │
│       ↓                                                     │
│  复制到临时位置                                               │
│       ↓                                                     │
│  clean-dev-db.js (清理脚本)                                  │
│       ↓                                                     │
│  清理后的种子数据库                                            │
│       ↓                                                     │
│  stage-desktop.cjs (打包)                                   │
│       ↓                                                     │
│  桌面版本                                                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. 清理脚本设计

### 2.1 输入输出

```
输入：server/dev.db (原始数据库)
输出：desktop/build/app/dist/seed-dev.db (清理后的种子数据库)
```

### 2.2 清理策略

```javascript
// 需要清空的表（137张）
const TABLES_TO_CLEAN = [
  // 配置
  'APIKey', 'AppSetting', 'ModelRouteConfig',
  // 小说核心
  'Novel', 'NovelBible', 'NovelFactEntry', ...,
  // 章节
  'Chapter', 'ChapterArtifactSyncCheckpoint', ...,
  // 角色
  'Character', 'CharacterCandidate', ...,
  // ... 共 137 张
];

// 需要保留的表（4张）
const TABLES_TO_KEEP = [
  'AntiAiRule',        // AI 检测规则预设
  'WritingTechnique',  // 写作技法预设
  'StyleTemplate',     // 风格模板预设
  '_prisma_migrations' // 迁移记录
];
```

### 2.3 执行顺序

1. 复制原始数据库到临时位置
2. 使用 better-sqlite3 打开副本
3. 开启事务
4. 按外键依赖顺序清空表（先清子表，再清父表）
5. 提交事务
6. 输出清理后的数据库

## 3. 端口配置设计

### 3.1 修改位置

文件：`desktop/src/runtime/server.ts`

### 3.2 External 模式

```typescript
// 修改前
function resolveExternalServerPort(): number {
  return resolveConfiguredPort() ?? 3000;
}

// 修改后
function resolveExternalServerPort(): number {
  return resolveConfiguredPort() ?? 13000;
}
```

### 3.3 Managed 模式

```typescript
// 修改前
async function resolveManagedServerPort(): Promise<number> {
  const configuredPort = resolveConfiguredPort();
  if (configuredPort) {
    return configuredPort;
  }
  // 随机端口
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => { ... });
  });
}

// 修改后
async function resolveManagedServerPort(): Promise<number> {
  const configuredPort = resolveConfiguredPort();
  if (configuredPort) {
    return configuredPort;
  }
  // 默认 14250 (13000 + 1250)
  const DEFAULT_PORT = 14250;
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(DEFAULT_PORT, "127.0.0.1", () => {
      server.close(() => resolve(DEFAULT_PORT));
    });
    server.once("error", reject);
  });
}
```

## 4. 安全性考虑

1. **原始数据库保护**：清理脚本只操作副本，原始 `dev.db` 不受影响
2. **事务保护**：清理过程在事务中执行，失败时自动回滚
3. **外键约束**：按依赖顺序清空，避免外键约束错误

## 5. 性能考虑

1. **批量删除**：使用事务批量执行 DELETE，减少 IO
2. **索引保留**：只清空数据，保留表结构和索引
3. **临时文件**：清理完成后删除临时副本
