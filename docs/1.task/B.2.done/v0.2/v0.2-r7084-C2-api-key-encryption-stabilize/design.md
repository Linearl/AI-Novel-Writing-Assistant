---
description: "REQ-7084 设计文档：API Key 加密密钥源稳定化方案"
reqId: 7084
type: design
status: draft
created: 2026-07-18
---

# 设计文档：API Key 加密密钥源稳定化

## 架构变更

### 当前架构（有缺陷）

```
deriveMachineKey()
  ├── os.hostname()
  ├── os.userInfo().username
  └── getPrimaryMacAddress()  ← 不稳定！
        └── Object.values(os.networkInterfaces())
              .find(i => !i.internal && i.mac)  ← 顺序不固定
```

### 目标架构（稳定）

```
deriveMachineKey()
  ├── os.hostname()
  ├── os.userInfo().username
  └── getStableMachineId()  ← 跨重启稳定
        ├── Windows: reg query HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid
        ├── Linux:   readFileSync('/etc/machine-id')
        └── macOS:   readFileSync('/etc/machine-id') 或 ioreg 输出
```

## 关键设计决策

### D1: MachineGuid vs 其他方案

| 方案 | 稳定性 | 跨平台 | 复杂度 |
|------|--------|--------|--------|
| Windows MachineGuid | 极高（安装时生成，终身不变） | 仅 Windows | 低 |
| /etc/machine-id | 高（系统安装时生成） | Linux/macOS | 低 |
| CPU ID | 中（容器中可能虚拟化） | 通用 | 中 |
| 磁盘 UUID | 中（挂载点变化时不同） | 通用 | 中 |

**选择**：Windows 用 MachineGuid，Linux/macOS 用 /etc/machine-id。

### D2: 解密失败处理策略

当前实现（有缺陷）：catch 异常 → 返回密文原文 → LLM 调用失败。

新实现：
1. 尝试解密
2. 失败 → 尝试用旧 MAC 派生密钥解密（兼容迁移期）
3. 仍失败 → 记录警告 + 返回 `null`（而非密文）
4. `null` key → 上层抛出 "未配置 API Key" 错误 → 用户在 UI 重新输入

### D3: 自动重新加密迁移

`migrateExistingKeys()` 已有逻辑：扫描明文 key → 加密。扩展为：
1. 扫描所有 key
2. 明文 key → 用新密钥加密
3. 用旧密钥可解密的密文 → 用新密钥重新加密
4. 不可解密的密文 → 删除（强制用户重新配置）

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `server/src/platform/deriveMachineKey.ts` | 重构 | 移除 MAC 逻辑，新增跨平台 stable machine ID |
| `server/src/services/settings/secretStore/DatabaseSecretStore.ts` | 修改 | 解密失败返回 null + 迁移逻辑扩展 |

## 接口不变

- `deriveMachineKey(): Promise<Buffer | null>` — 签名不变
- `encryptValue(plaintext, key): string` — 不变
- `decryptValue(ciphertext, key): string` — 不变
- `isEncrypted(value): boolean` — 不变
- `SecretStore` 接口 — 不变

## 错误处理

| 场景 | 行为 |
|------|------|
| MachineGuid 读取成功 | 正常派生密钥 |
| MachineGuid 读取失败（权限/注册表缺失） | 返回 null → 降级明文存储 |
| 新密钥解密旧密文 | GCM tag 不匹配 → 尝试旧密钥兼容 → 最终返回 null |
| 旧密钥也不可用 | 删除旧密文，日志记录，用户重新配置 |
