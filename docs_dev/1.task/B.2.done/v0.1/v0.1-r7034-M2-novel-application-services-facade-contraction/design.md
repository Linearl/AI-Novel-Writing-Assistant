---
description: "REQ-7034 Novel Application Services 门面收缩 — 方案设计"
---

# REQ-7034 方案设计

## 1. 方案概述

对 NovelApplicationServices 门面应用"删除测试"：审计 130 方法 → 分类纯委托/协调 → 移除纯委托 → 调用方直接使用子服务。

### 1.1 设计目标

1. 门面接口从 130 方法缩减到 20-30 个
2. NovelApplicationServices.ts 从 694 行缩减到 <200 行
3. 调用方的注入复杂度不显著增加

### 1.2 关键决策

1. **保留协调方法**：如 `createNovelWithWorld` 涉及多服务调用 + 事务，保留在门面
2. **纯委托直接删除**：不新增 wrapper/helper/utility 层，调用方直接使用子服务
3. **调用方按需注入子服务**：route 文件注入所需的具体子服务，而非单一面门

### 1.3 不在范围

- 不修改子服务实现
- 不创建新的抽象层
- 不影响客户端代码

---

## 2. 删除测试原理

"删除测试"来自 Karpathy 的编码准则：如果一个模块可以删除而不增加系统整体复杂度（复杂性仅移动到调用方），则该模块无杠杆，应删除。

```
删除前:
  NovelApplicationServices.createNovel(params)
    → this.novelCoreCrudService.createNovel(params)  // 纯委托, 1 行

删除后:
  novelCoreCrudService.createNovel(params)  // 直接调用, 同样 1 行

系统总复杂度: 不变（删除 N 行门面方法 + 1 行 import，调用方 +1 行子服务注入）
杠杆: 无（复杂性从门面移动到调用方，净变化 ~0）
```

但对于协调方法：

```
删除前:
  NovelApplicationServices.createNovelWithWorld(params)
    → this.novelCoreCrudService.createNovel(params)  // 步骤 1
    → this.novelWorldInstanceService.ensureFromLegacyNovel(novel)  // 步骤 2
    → return novel  // 步骤 3

删除后:
  调用方需要自己写这 3 步 — 总共 N 个调用方 × 3 行

系统总复杂度: 增加（N × 3 行 > 1 × 3 行）
杠杆: 有（门面集中了跨服务协调逻辑，避免重复）
```

---

## 3. 实施阶段

### Phase 1: 审计分类（T1 + T2）

1. 读取 `NovelApplicationContracts.ts` 和 `NovelApplicationServices.ts`
2. 逐方法标注：纯委托 / 协调方法
3. 审计所有调用方，建立调用关系矩阵

### Phase 2: 门面收缩（T3 + T4）

1. 从接口定义中移除纯委托方法签名
2. 从门面实现中移除纯委托方法体
3. 验证 NovelApplicationServices.ts <200 行

### Phase 3: 调用方迁移（T5 + T6）

1. 路由注册文件：注入子服务，直接调用
2. 其他调用方：按需注入子服务

### Phase 4: 验证（T7）

typecheck + test + 手动验证核心流程。

---

## 4. 调用方迁移示例

```typescript
// 改造前 — novelRouteRegistration.ts
import { NovelApplicationServices } from "../services/novel";

const novel = await novelApplicationServices.createNovel(params);
const chapters = await novelApplicationServices.listChapters(novelId);

// 改造后
import { NovelCoreCrudService } from "../services/novel/novelCoreCrudService";
import { NovelChapterService } from "../services/novel/novelChapterService";

const novel = await novelCoreCrudService.createNovel(params);
const chapters = await novelChapterService.listChapters(novelId);

// 协调方法仍走门面
const result = await novelApplicationServices.createNovelWithWorld(params);
```

---

## 5. 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 调用方注入复杂度显著增加 | 中 | 中 | 如果单个 route 文件需要注入 5+ 子服务，评估是否保留便捷 facade |
| 误删协调方法 | 低 | 高 | 审计阶段逐方法检查方法体，不依赖方法名判断 |
| 循环依赖（子服务互相引用） | 低 | 中 | 审计阶段检查子服务间的 import 关系 |

---

## 6. 验证方案

1. typecheck：`pnpm typecheck` 零错误
2. 测试：`pnpm test` 全量通过
3. 门面行数：`wc -l NovelApplicationServices.ts` <200
4. 方法计数：grep `async \w+\(` NovelApplicationServices.ts 输出 20-30 个方法
5. 手动验证：创建小说 → 生成章节 → 确认功能正常
