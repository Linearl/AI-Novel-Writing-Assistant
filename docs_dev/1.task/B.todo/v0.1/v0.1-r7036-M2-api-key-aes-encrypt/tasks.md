---
description: "SEC-014 任务拆解"
---

# REQ-7036 任务拆解

- [x] **T1** 创建 `deriveMachineKey.ts`（机器指纹 → SHA-256 → 32 字节密钥）
- [x] **T2** 创建 `encryptKey.ts`（AES-256-GCM，密文前缀 `aes256gcm:`）
- [x] **T3** 修改 secretStore：upsertProvider 加密，读取时解密
- [x] **T4** 迁移逻辑：已有明文 key 一次性加密（集成在 DatabaseSecretStore.ensureMigrated 中）
- [ ] **T5** `pnpm typecheck` + `pnpm test`
- [ ] **T6** 手动验证：设置 Key → 重启 → 确认可用
