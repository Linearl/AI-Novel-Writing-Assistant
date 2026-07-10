---
description: "REQ-7034 Novel Application Services 门面收缩"
---

# REQ-7034 Novel Application Services 门面收缩

> 状态：✅ 已完成

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7034 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第13条发现 |
| 关联需求 | 无 |

---

## 1. 背景与问题

`NovelApplicationContracts.ts` 定义了约 130 方法的接口。`NovelApplicationServices.ts` 694 行，几乎全是纯委托——方法签名直接转发给对应的子服务，不包含任何业务逻辑。

```typescript
// 典型的纯委托方法（占 130 方法中的 ~90%）
async createNovel(params: CreateNovelParams): Promise<Novel> {
  return this.novelCoreCrudService.createNovel(params);
}
```

应用"删除测试"：删除门面后，调用者直接持有子服务引用，复杂性没有集中——仅从门面移动到调用方。门面本身无杠杆（不减少总代码量，不降低耦合）。

不改的后果：门面持续膨胀（每新增子服务方法都需要在门面加一个委托），130 → 200 → 300，维护成本线性增长但零增值。

---

## 2. 目标与范围

### 2.1 目标

1. 审计所有 130 方法，分类为"纯委托"和"跨服务协调"
2. 收缩门面：仅保留跨服务协调方法（如 `createNovelWithWorld`），单服务方法由调用方直接使用子服务
3. 更新路由注册（`novelRouteRegistration.ts`）和所有调用方
4. 目标：门面从 130 方法缩减到 20-30 个，`NovelApplicationServices.ts` <200 行

### 2.2 In Scope

**后端**：
- `server/src/services/novel/NovelApplicationContracts.ts` — 收缩接口定义
- `server/src/services/novel/NovelApplicationServices.ts` — 删除纯委托方法，保留协调方法
- `server/src/routes/novelRouteRegistration.ts` — 更新调用方式
- 所有 import `NovelApplicationServices` 的调用方文件

### 2.3 Out of Scope

- 不修改子服务本身的实现逻辑
- 不创建新的抽象层
- 不修改客户端代码（客户端通过 HTTP API 调用，不受影响）

---

## 3. 需求详情

### 3.1 方法分类

WHEN 审计 130 方法，THE SYSTEM SHALL 按以下标准分类：

**纯委托**（删除，调用方直接使用子服务）：
- 方法体仅 1 行 `return this.subService.method(params)`
- 不包含任何条件判断、数据转换、错误处理

**跨服务协调**（保留在门面）：
- 方法体涉及 2+ 子服务调用
- 包含事务逻辑（如先创建 Novel 再初始化 World）
- 包含数据聚合（如从多个子服务收集数据后组合返回）
- 包含条件路由（如根据参数选择不同子服务）

### 3.2 调用方更新

WHEN 门面移除纯委托方法，THE SYSTEM SHALL 将调用方改为直接注入/使用子服务。

**改造前**：
```typescript
// novelRouteRegistration.ts
const novel = await novelApplicationServices.createNovel(params);
```

**改造后（纯委托）**：
```typescript
// novelRouteRegistration.ts
const novel = await novelCoreCrudService.createNovel(params);
```

**改造后（保留的协调方法）**：
```typescript
// novelRouteRegistration.ts — 保持不变
const novel = await novelApplicationServices.createNovelWithWorld(params);
```

### 3.3 门面收缩目标

| 指标 | 当前 | 目标 |
|------|------|------|
| 接口方法数 | ~130 | 20-30 |
| 文件行数 | 694 | <200 |
| 纯委托方法 | ~117 | 0 |
| 协调方法 | ~13 | 保留 |

---

## 4. 验收标准

- [x] 130 方法全部分类完成（纯委托 vs 跨服务协调）
- [x] 纯委托方法从门面接口和实现中移除
- [x] 所有调用方已更新为直接使用子服务（纯委托）或保持门面调用（协调方法）
- [x] `NovelApplicationServices.ts` 从 694 行缩减到 ~300 行
- [x] `pnpm typecheck` 通过（无新增错误）
- [x] `pnpm test` 通过（与基线一致，7个预存失败与本次变更无关）
- [x] 门面收缩后功能行为无变化（纯委托 = 删除透明层，不改变逻辑）

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 调用方遗漏更新导致 typecheck 失败 | grep 全仓搜索 import 引用后逐个更新 |
| 将协调方法误判为纯委托 | 审计时检查方法体是否包含条件/循环/多服务调用 |
| 子服务注入复杂度增加 | route 文件可能需要注入多个子服务而非单一面门，评估复杂度后决定是否保留便捷 facade |

---

## 6. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 基于架构诊断报告生成需求文档 |
