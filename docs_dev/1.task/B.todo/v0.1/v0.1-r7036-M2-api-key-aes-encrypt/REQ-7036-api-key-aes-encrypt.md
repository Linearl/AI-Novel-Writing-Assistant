---
description: "SEC-014: API Key AES-256-GCM 加密存储（P2）— secretStore 加 crypto 包装层"
---

# REQ-7036：API Key 加密存储

## 背景

[复核报告 SEC-014](docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md) 确认：`secretStore.upsertProvider(provider, { key })` 将 LLM API Key 以明文存入 SQLite。桌面端场景下，若数据库文件被意外泄露（备份上传、恶意软件），所有 API Key 直接暴露。

## 决策

**方案 A：AES-256-GCM + 机器指纹**。从 `hostname + OS user + MAC` 派生 256-bit 密钥（不落盘），存储前加密、读取时解密。`secretStore` 内部透明加解密，上层调用方无需改动。

## 实施步骤

1. 在 `server/src/platform/` 创建 `deriveMachineKey.ts`——从机器指纹派生加密密钥
2. 修改 `server/src/services/settings/secretStore.ts`：
   - `upsertProvider`: key 字段写入前 `encrypt(plainKey, machineKey)`
   - 读取时: `decrypt(encryptedKey, machineKey)` → 返回明文给调用方
3. 迁移：已有明文 key 一次性加密（检测密文前缀标记，已加密的跳过）
4. 降级：机器指纹失败时 fallback 明文存储 + logger.warn（不阻断应用启动）

## 验收标准

- [ ] 新写入的 API Key 以密文存储在 DB 中（AES-GCM 格式，有可识别前缀）
- [ ] 读取时自动解密，上层调用方无感知
- [ ] 迁移脚本将已有明文 key 加密
- [ ] `pnpm typecheck` + `pnpm test` 通过
- [ ] 手动验证：设置 API Key → 重启应用 → Key 仍可正常使用
