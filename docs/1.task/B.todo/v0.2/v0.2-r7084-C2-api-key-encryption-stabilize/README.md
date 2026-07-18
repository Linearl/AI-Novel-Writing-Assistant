---
description: "REQ-7084: API Key 加密密钥源稳定化 — 用 MachineGuid 替代 MAC 地址"
reqId: 7084
title: "API Key 加密密钥源稳定化"
status: pass
priority: P1
complexity: C2
estimatedEffort: "1天"
version: v0.2
created: 2026-07-18
updated: 2026-07-18T11:55:00.000Z
---

## 概要

API Key 使用 AES-256-GCM 加密存储，密钥派生自机器指纹 `hostname:username:primaryMAC`。由于 `getPrimaryMacAddress()` 取第一个非内部网卡 MAC 地址，而多网卡环境下（WSL/Hyper-V、VPN、WiFi）接口迭代顺序不固定，导致重启后派生密钥变化，所有已保存的 API Key 解密失败，LLM 调用报 "Invalid API Key"。

## 目标

- 将机器指纹中的 MAC 地址替换为 Windows `MachineGuid`（注册表 `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`），保证跨重启稳定
- macOS/Linux 使用 `/etc/machine-id`（或 `/var/lib/dbus/machine-id`）作为等价方案
- 保持 AES-256-GCM 加密架构不变
- 向后兼容：已加密的 key 在密钥源变更后能正确迁移或提示用户重新输入

## 关键文件

- `server/src/platform/deriveMachineKey.ts` — 机器指纹派生逻辑
- `server/src/platform/encryptKey.ts` — AES-256-GCM 加解密（无需修改）
- `server/src/services/settings/secretStore/DatabaseSecretStore.ts` — 加密存储层
