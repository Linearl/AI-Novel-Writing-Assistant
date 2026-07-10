---
description: "REQ-7018 路由迁移至模块目录——技术设计"
update_time: 2026-07-10
---

# REQ-7018 技术设计

## 架构变更

### 变更前（当前状态）

```
路由来源:
  - modules/<domain>/http/  （部分模块）
  - routes/<feature>.ts      （约 30 个文件）
  - services/<domain>/       （个别 service 暴露路由）

app.ts 注册: import from 三种路径混用
```

### 变更后（目标状态）

```
路由来源:
  - modules/<domain>/http/  （唯一来源）

app.ts 注册: import { register<Domain>Routes } from "./modules/<domain>/http"
```

---

## 实施阶段

### Phase 1: 清点审计

遍历 `server/src/routes/` 目录，逐文件记录：
- 文件路径
- 导出的 router 或注册函数
- 路由前缀（base path）
- 在 `app.ts` 中的注册方式
- 对应的业务领域

同时扫描 `server/src/modules/`，检查哪些已有 `http/` 子目录和路由注册函数。

交叉对比产出迁移清单 CSV/Markdown 表格。

### Phase 2: 逐模块迁移

迁移模式：

```typescript
// 迁移前（routes/novels.ts）
import { Router } from "express";
const router = Router();
router.get("/api/novels", ...);
export default router;

// 迁移后（modules/novel/http/novelRoutes.ts）
import { Express } from "express";
export function registerNovelRoutes(app: Express) {
  app.get("/api/novels", ...);
}
```

迁移批次建议：
- **第一批**：独立、无依赖的路由（如 health、config 类）
- **第二批**：有少量跨模块依赖的路由
- **第三批**：复杂依赖路由

每批迁移后立即运行路由测试验证，确保 API 行为不变。

### Phase 3: 统一 app.ts

```typescript
// 迁移后
import { registerNovelRoutes } from "./modules/novel/http";
import { registerExportRoutes } from "./modules/export/http";
import { registerSetupRoutes } from "./modules/setup/http";
// ... 所有模块路由

registerNovelRoutes(app);
registerExportRoutes(app);
registerSetupRoutes(app);
// ...
```

### Phase 4: 清理与文档

- 评估 `routes/` 目录是否可删除（确认无其他引用后）
- 产出路由落位规则文档

---

## 风险评估

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| 迁移过程中路由遗漏 | 中 | 高 | 清点阶段做全量审计，交叉验证 |
| 路由测试覆盖不足 | 中 | 中 | 迁移前先补充关键路由测试 |
| 复杂依赖路由迁移后功能异常 | 低 | 中 | 分批迁移 + 每批后手动验证 |

---

## 验证方案

1. 清点后：迁移清单覆盖所有 `routes/` 文件，无遗漏
2. 每批迁移后：`pnpm --filter @ai-novel/server test:routes` 通过
3. 全部迁移后：`pnpm typecheck` + `pnpm test` 通过
4. 手动验证：启动 `pnpm dev`，确认所有 API 端点正常响应
