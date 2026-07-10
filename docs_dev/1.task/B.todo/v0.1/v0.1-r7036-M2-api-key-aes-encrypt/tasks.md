---
description: "SEC-014 任务拆解"
---

# REQ-7036 任务拆解

- [ ] **T1** 创建 `deriveMachineKey.ts`（机器指纹 → SHA-256 → 32 字节密钥）
- [ ] **T2** 创建 `encryptKey.ts` / `decryptKey.ts`（AES-256-GCM，密文前缀 `aes256gcm:`）
- [ ] **T3** 修改 secretStore：upsertProvider 加密，读取时解密
- [ ] **T4** 迁移逻辑：已有明文 key 一次性加密
- [ ] **T5** `pnpm typecheck` + `pnpm test`
- [ ] **T6** 手动验证：设置 Key → 重启 → 确认可用
