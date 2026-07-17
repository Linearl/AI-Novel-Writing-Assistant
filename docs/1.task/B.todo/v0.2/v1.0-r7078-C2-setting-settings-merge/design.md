# 设计文档 — REQ-7078 setting/ 与 settings/ 目录合并

## 1. 现状分析

```
server/src/services/
├── setting/                          ← 待删除
│   ├── settingConsistencyService.ts  ← 迁移到 settings/consistency/
│   └── settingConsistencyStorage.ts  ← 迁移到 settings/consistency/
├── settings/                         ← 目标目录
│   ├── ... (其他 settings 文件)
│   └── consistency/                  ← 新建子目录
│       ├── settingConsistencyService.ts
│       └── settingConsistencyStorage.ts
```

## 2. 迁移步骤

### Step 1: 创建目标目录并移动文件

```bash
mkdir -p server/src/services/settings/consistency
git mv server/src/services/setting/settingConsistencyService.ts server/src/services/settings/consistency/settingConsistencyService.ts
git mv server/src/services/setting/settingConsistencyStorage.ts server/src/services/settings/consistency/settingConsistencyStorage.ts
```

### Step 2: 更新外部引用

grep 查找 `setting/settingConsistencyService` 和 `setting/settingConsistencyStorage` 的引用，将 import 路径从 `setting/` 更新为 `settings/consistency/`。

预期 2 个外部引用者，路径更新形如：

```typescript
// 修改前
import { ... } from '../setting/settingConsistencyService.js';
// 修改后
import { ... } from '../settings/consistency/settingConsistencyService.js';
```

### Step 3: 删除空目录

```bash
rmdir server/src/services/setting
```

## 3. 影响范围

| 变更类型 | 影响 |
|----------|------|
| 文件移动 | 2 个文件 |
| import 路径更新 | 2 个外部引用文件 |
| 目录删除 | 1 个空目录 |

## 4. 测试策略

- `pnpm typecheck` 验证类型完整性
- `pnpm test` 验证功能无回归
- 手动确认 `setting/` 目录已删除
