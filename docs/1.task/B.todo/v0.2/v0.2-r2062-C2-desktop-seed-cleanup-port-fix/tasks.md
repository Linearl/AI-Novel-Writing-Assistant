---
description: "REQ-2062 任务拆解"
update_time: 2026-07-21
---

# REQ-2062 任务拆解

## 阶段一：种子数据库清理脚本

### T1.1 创建清理脚本

**目标**：创建 `scripts/clean-dev-db.js`，实现种子数据库清理功能

**步骤**：
1. [ ] 创建 `scripts/clean-dev-db.js`
2. [ ] 定义需要清空的 137 张表清单
3. [ ] 定义需要保留的 4 张表清单
4. [ ] 实现复制 → 清理 → 输出流程
5. [ ] 添加命令行参数支持（输入/输出路径）

**验收**：
- 运行 `node scripts/clean-dev-db.js` 生成干净的种子数据库
- 原始数据库不被修改

---

## 阶段二：构建流程集成

### T2.1 修改 stage-desktop.cjs

**目标**：在构建流程中自动调用清理脚本

**步骤**：
1. [ ] 在 `stage-desktop.cjs` 中添加清理调用
2. [ ] 使用复制后的干净数据库作为种子
3. [ ] 保留原始 `dev.db` 不变

**验收**：
- 运行 `node scripts/build-portable-dir.js` 后种子数据库干净

---

## 阶段三：端口配置修改

### T3.1 修改 external 模式端口

**目标**：将 external 模式默认端口从 3000 改为 13000

**步骤**：
1. [ ] 修改 `desktop/src/runtime/server.ts` 中 `resolveExternalServerPort()`

**验收**：
- 开发模式下桌面端连接 `localhost:13000`

### T3.2 修改 managed 模式端口

**目标**：将 managed 模式默认端口从随机改为 14250

**步骤**：
1. [ ] 修改 `desktop/src/runtime/server.ts` 中 `resolveManagedServerPort()`

**验收**：
- 打包后桌面端默认使用端口 14250

---

## 阶段四：验证

### T4.1 类型检查

**步骤**：
1. [ ] 运行 `pnpm typecheck`

**验收**：无类型错误

### T4.2 桌面构建测试

**步骤**：
1. [ ] 运行 `node scripts/build-portable-dir.js`
2. [ ] 验证种子数据库内容

**验收**：
- 构建成功
- 种子数据库不包含敏感数据
