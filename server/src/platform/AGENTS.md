<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/platform

## Purpose
平台基础设施层 — 与产品领域无关的横切能力:依赖注入、日志、安全、加密、JSON/文本工具、任务分发接口。

## Key Files
| File | Description |
|------|-------------|
| `di/` | 依赖注入容器(interfaces / index) |
| `logging/` | 日志能力(logRetention 等) |
| `security/` | 安全工具(safePath 等) |
| `encryptKey.ts` | 密钥加密(API key AES 加密) |
| `deriveMachineKey.ts` | 机器密钥派生 |
| `json.ts` | JSON 处理工具 |
| `textUtils.ts` | 文本工具 |
| `dbErrors.ts` | 数据库错误归一化 |
| `IDirectorTaskDispatcher.ts` | director 任务分发接口 |

## For AI Agents

### Working In This Directory
- 平台层**不依赖业务模块**;新基础设施先放这里,业务逻辑放 `services/` 或 `modules/`
- 加密/密钥相关改动需谨慎:涉及 API key 加密稳定性(参考 `docs/4.misc/wiki/architecture/`)

## Dependencies

### Internal
- `server/src/config/` — 配置读取
- 根 `AGENTS.md` — 安全与数据保护规则

### External
- Node crypto
