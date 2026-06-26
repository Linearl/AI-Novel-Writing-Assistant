# 本地开发启动指南

> 配合 deepinit 后的首次配置。**与发布的安装包完全隔离**:端口 3100、数据库 `server/dev.db`、资产/日志在 `D:\ai-novel-dev-data\`。

## 前置(已就绪)
- Node `v24.3.0` ✅(满足 `>=20.19 / >=22.12 / >=24`)
- pnpm `10.6.0` ✅
- 发布版正在运行(PID 20544 占着 3000 端口)— **不要停它**,我们用 3100 隔开

## 已生成的配置文件
| 文件 | 作用 |
|------|------|
| `server/.env` | 后端配置(从 `server/.env.example` 复制,改 HOST、PORT、IMAGE_STORAGE_ROOT,RAG 默认关闭) |
| `client/.env` | 前端配置(API 指到 `http://127.0.0.1:3100/api`) |
| `D:\ai-novel-dev-data\` | 仓库外独立数据目录,所有图片资产/日志写到这里 |

## 数据隔离确认
| 资源 | 开发服务器 | 发布版 |
|------|-----------|--------|
| API 端口 | **3100** | 3000 |
| 数据库 | `server/dev.db`(仓库内,gitignored) | `C:\Users\yinji\AppData\Local\AI-Novel-Writing-Assistant-v2\...` |
| 图片资产 | `D:\ai-novel-dev-data\storage\generated-images` | AppData 内 |
| 日志 | `D:\ai-novel-dev-data\logs` | AppData 内 `logs/` |
| RAG | 默认关闭(`RAG_ENABLED=false`),不需要 Qdrant | 由发布版管理 |

## 启动步骤

### 0. 一次性准备(已自动完成)
```bash
# 安装依赖
pnpm install --frozen-lockfile
# 准备 Prisma 客户端 + 跑迁移
pnpm db:migrate
```

### 1. 开发模式(三个独立进程)
```bash
# 终端 1:构建 shared(其他包依赖它的产物)
pnpm --filter @ai-novel/shared dev

# 终端 2:启动 server(http://127.0.0.1:3100)
pnpm --filter @ai-novel/server dev

# 终端 3:启动 client(Vite, http://127.0.0.1:5173)
pnpm --filter @ai-novel/client dev
```

或者一行启动所有:
```bash
pnpm dev
```

### 2. 验证
- 后端健康检查:浏览器访问 `http://127.0.0.1:3100/api/health`
- 前端入口:浏览器访问 `http://127.0.0.1:5173`
- 数据库:`server/dev.db` 应被自动创建并迁移

## 填 LLM Key

至少需要一个 Provider 才能生成内容。编辑 `server/.env`:
```bash
# 例如用 DeepSeek
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_MODEL=deepseek-chat

# 或 OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-5-mini
```

填完保存即可生效(server 默认 ts-node-dev 会监听改动,不过 `.env` 改动通常需要重启 server)。

## 想跑 RAG?

1. 起 Qdrant:
   ```bash
   docker compose -f infra/docker-compose.qdrant.yml up -d
   ```
2. 编辑 `server/.env`:`RAG_ENABLED=true`,填 `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` / `QDRANT_URL`
3. 重启 server

## 桌面版开发(可选)

```bash
# 一次性安装 Electron 运行时
pnpm prepare:desktop-runtime

# 桌面模式启动(同时跑 shared+server+client+desktop)
pnpm dev:desktop
```

**注意**:`dev:desktop:raw` 默认会用端口 3000 启 server,与发布版冲突。建议在 `desktop` 启动前先单独用 3100 跑 server,或者等 desktop 端代码里加端口覆盖。

## 验证用 checklist

- [ ] `pnpm --filter @ai-novel/shared build` 成功
- [ ] `pnpm --filter @ai-novel/server typecheck` 通过
- [ ] `pnpm --filter @ai-novel/server test` 通过
- [ ] `pnpm --filter @ai-novel/client typecheck` 通过
- [ ] `curl http://127.0.0.1:3100/api/health` 返回 200

## 常见问题

**Q: 跑起来之后,我正在执行的发布版任务会受影响吗?**
A: 不会。我们用的是不同的端口(3100 vs 3000)、不同的数据库文件、不同的资产目录。两条链路完全独立。

**Q: 我想切换到 PostgreSQL?**
A: 取消 `server/.env` 里 `DATABASE_URL` 的注释,设置 `AI_NOVEL_DATABASE_MODE=postgresql`,然后 `pnpm db:migrate`。

**Q: 端口 3100 也被占用了?**
A: 编辑 `server/.env` 改 `PORT=3200`,同时 `client/.env` 的 `VITE_API_BASE_URL=http://127.0.0.1:3200/api`。

**Q: 我想停止所有 dev 进程?**
A: 关闭 3 个终端即可。`pnpm dev` 用 concurrently,Ctrl+C 会一并停掉。