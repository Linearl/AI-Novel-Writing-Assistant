---
description: "REQ-7084 需求文档：API Key 加密密钥源稳定化"
reqId: 7084
type: requirement
status: approved
created: 2026-07-18
---

# REQ-7084: API Key 加密密钥源稳定化

## 背景

当前项目使用 AES-256-GCM 加密存储 LLM Provider 的 API Key。加密密钥通过机器指纹 `hostname:username:primaryMAC` 派生（SHA-256）。该方案的问题：

1. `getPrimaryMacAddress()` 遍历 `os.networkInterfaces()` 取第一个非内部 MAC
2. 多网卡环境下（WSL Hyper-V 虚拟网卡、WiFi、VPN），迭代顺序不保证稳定
3. 重启或网络状态变化后 MAC 顺序可能翻转 → 派生密钥变化 → GCM 认证失败
4. `decryptFromStorage` catch 异常后返回密文原文 → LLM Provider 报 "Invalid API Key"

上游原版项目不加密 API Key，明文存储，不存在此问题。

## 目标

1. 将 MAC 地址从机器指纹中移除，替换为跨重启稳定的系统标识
2. Windows: 使用注册表 `HKLM\SOFTWARE\Microsoft\Cryptography\MachineGuid`
3. Linux/macOS: 使用 `/etc/machine-id` 或 `/var/lib/dbus/machine-id`
4. 保持 AES-256-GCM 加密/解密逻辑不变
5. 提供密钥迁移路径：旧 MAC 派生的密文在新指纹下无法解密时，标记为需要重新配置

## 非目标

- 不改变加密算法（AES-256-GCM 已足够安全）
- 不回退到明文存储（对齐上游但保留安全性提升）
- 不修改 UI 或 API 路由层逻辑

## EARS 验收条目

1. **WHEN** 服务器在 Windows 上启动，**THE SYSTEM SHALL** 从注册表读取 MachineGuid 作为指纹输入
2. **WHEN** 服务器在 Linux/macOS 上启动，**THE SYSTEM SHALL** 从 /etc/machine-id 读取稳定标识
3. **WHEN** 机器指纹组件无法获取，**THE SYSTEM SHALL** 返回 null 并降级为明文存储
4. **WHEN** 使用新指纹派生的密钥解密旧密文失败，**THE SYSTEM SHALL** 记录警告日志并返回空 key（触发用户重新配置），而非返回密文原文
5. **WHEN** 加密密钥源变更后首次启动，**THE SYSTEM SHALL** 用新密钥重新加密所有已有的明文或可解密的密文 key

## 风险

- **低风险**：MachineGuid 在 Windows 重装后会变化（与原 MAC 方案同等风险）
- **中风险**：旧密文无法自动迁移，用户需重新输入 API Key（一次性操作）
