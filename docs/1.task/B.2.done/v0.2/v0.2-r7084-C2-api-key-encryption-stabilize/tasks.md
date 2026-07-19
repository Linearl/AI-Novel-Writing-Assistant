---
description: "REQ-7084 任务清单：API Key 加密密钥源稳定化"
reqId: 7084
type: tasks
status: done
created: 2026-07-18
---

# 任务清单：API Key 加密密钥源稳定化

## 阶段一：核心修复

- [x] **T1** 重构 `deriveMachineKey.ts`：移除 MAC 地址逻辑
  - 文件：`server/src/platform/deriveMachineKey.ts`
  - ✅ 删除 `getPrimaryMacAddress()` 从主指纹逻辑
  - ✅ 新增 `getWindowsMachineGuid()` — 通过 `reg query` 读取注册表
  - ✅ 新增 `getUnixMachineId()` — 读取 `/etc/machine-id`
  - ✅ 新增 `getMacOsPlatformUuid()` — 通过 `ioreg` 读取 IOPlatformUUID
  - ✅ 修改 `getMachineFingerprint()` 调用 `getStableMachineId()`
  - ✅ 保留旧 `getPrimaryMacAddress()` 为 `legacyDeriveMachineKey()` 导出

- [x] **T2** 修改 `DatabaseSecretStore.ts`：解密失败返回 null
  - 文件：`server/src/services/settings/secretStore/DatabaseSecretStore.ts`
  - ✅ `decryptFromStorage()` 解密失败返回 `null`（不再返回密文原文）
  - ✅ 日志改为明确提示"需要重新配置"

- [x] **T3** 扩展 `migrateExistingKeys()`：支持密钥源变更后的重新加密
  - 文件：`server/src/services/settings/secretStore/DatabaseSecretStore.ts`
  - ✅ 新增 `tryMigrateWithLegacyKey()` 函数
  - ✅ 4 级迁移逻辑：明文加密 → 当前密钥可解密 → 旧密钥迁移 → 清除不可解密记录
  - ✅ 迁移统计日志（加密数/迁移数/清除数）

## 阶段二：验证

- [x] **T4** 类型检查与构建
  - ✅ `npx tsc --noEmit -p server/tsconfig.json` — 0 errors
  - ✅ `pnpm build` — 全量构建通过

- [x] **T5** 运行测试
  - ✅ `pnpm test` — 全部通过（1 个预先存在的失败：`novelDirectorCandidateRuntime.test.js` 缺少 dist 产物，与本次改动无关）

## 依赖

- T1 → T2 → T3（串行，T2 依赖 T1 的新指纹函数签名确认）
- T4/T5 在 T3 完成后执行

## 阶段三：安全补强

- [x] **T6** 修复 Case 4 破坏性数据清除
  - 文件：
  - ✅ 移除不可解密密文的  清除逻辑
  - ✅ 改为保留原 ciphertext，仅记录警告日志
  - ✅ 数据保护：读取路径已返回 null，UI 会提示用户重新配置

- [x] **T7** 补充加密单元测试
  - 文件：
  - ✅ isEncrypted 检测、加密/解密往返、错误密钥 GCM 认证失败
  - ✅ 随机 nonce 唯一性、畸形密文拒绝、非加密值拒绝
  - ✅ 全部 6 个测试通过

## 验收标准

1. 重启服务器后 API Key 不再报 "Invalid API Key"
2. `deriveMachineKey()` 不再使用 MAC 地址
3. 旧密文自动迁移或提示用户重新配置
4. 所有现有测试通过
