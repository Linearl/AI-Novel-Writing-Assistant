---
description: 将 setting/ 下2个文件迁移到 settings/consistency/，消除重复目录，更新外部引用
---

# REQ-7078 — setting/ 与 settings/ 目录合并

## 1. 背景

项目中同时存在 `server/src/services/setting/` 和 `server/src/services/settings/` 两个目录，其中 `setting/` 下仅剩 2 个文件（`settingConsistencyService.ts` 和 `settingConsistencyStorage.ts`），其余功能均在 `settings/` 下。两个目录命名高度相似，容易混淆。

## 2. 目标

将 `setting/` 下的 2 个文件迁移到 `settings/consistency/` 子目录，消除冗余目录，统一命名规范。

## 3. 范围

### 包含

- 移动 `server/src/services/setting/settingConsistencyService.ts` 到 `server/src/services/settings/consistency/settingConsistencyService.ts`
- 移动 `server/src/services/setting/settingConsistencyStorage.ts` 到 `server/src/services/settings/consistency/settingConsistencyStorage.ts`
- 更新 2 个外部引用者的 import 路径
- 删除空的 `setting/` 目录

### 不包含

- 重命名文件本身
- 修改文件内容逻辑
- 其他目录结构调整

## 4. 非目标

- 不重命名 `settings/` 目录
- 不合并其他服务目录

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | 2 个文件从 `setting/` 迁移到 `settings/consistency/` 后文件内容一致 |
| AC-2 | 2 个外部引用者的 import 路径更新为 `settings/consistency/` |
| AC-3 | `setting/` 目录已删除（为空后可安全移除） |
| AC-4 | `pnpm typecheck` 零错误 |
| AC-5 | `pnpm test` 全部通过 |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 可能有其他文件通过动态路径引用 | 低 | TypeScript 编译器会捕获 import 错误，grep 确认无遗漏 |
| 目录结构调整可能影响 sourcemap | 低 | 仅物理移动，不改变代码逻辑 |
