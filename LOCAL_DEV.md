# 本地开发启动指南

> 配合 deepinit 后的首次配置。**与发布的安装包完全隔离**:端口 13000、数据库 `server/dev.db`、资产/日志在 `D:\ai-novel-dev-data\`。

## 前置(已就绪)
- Node `v24.3.0` ✅(满足 `>=20.19 / >=22.12 / >=24`)
- pnpm `10.6.0` ✅

## 已生成的配置文件
| 文件 | 作用 |
|------|------|
| `server/.env` | 后端配置(从 `server/.env.example` 复制,改 HOST、PORT、IMAGE_STORAGE_ROOT,RAG 默认关闭) |
| `client/.env` | 前端配置(API 指到 `http://127.0.0.1:13000/api`) |
| `D:\ai-novel-dev-data\` | 仓库外独立数据目录,所有图片资产/日志写到这里 |

## 数据隔离确认
| 资源 | 开发服务器 |
|------|-----------|
| API 端口 | **13000** |
| 数据库 | `server/dev.db`(仓库内,gitignored) |
| 图片资产 | `D:\ai-novel-dev-data\storage\generated-images` |
| 日志 | `D:\ai-novel-dev-data\logs` |
| RAG | 默认关闭(`RAG_ENABLED=false`),不需要 Qdrant |

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

# 终端 2:启动 server(http://127.0.0.1:13000)
pnpm --filter @ai-novel/server dev

# 终端 3:启动 client(Vite, http://127.0.0.1:5173)
pnpm --filter @ai-novel/client dev
```

或者一行启动所有:
```bash
pnpm dev
```

### 2. 验证
- 后端健康检查:浏览器访问 `http://127.0.0.1:13000/api/health`
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

## 验证用 checklist

- [ ] `pnpm --filter @ai-novel/shared build` 成功
- [ ] `pnpm --filter @ai-novel/server typecheck` 通过
- [ ] `pnpm --filter @ai-novel/server test` 通过
- [ ] `pnpm --filter @ai-novel/client typecheck` 通过
- [ ] `curl http://127.0.0.1:13000/api/health` 返回 200

## 常见问题

**Q: 我想切换到 PostgreSQL?**
A: 取消 `server/.env` 里 `DATABASE_URL` 的注释,设置 `AI_NOVEL_DATABASE_MODE=postgresql`,然后 `pnpm db:migrate`。

**Q: 端口 13000 也被占用了?**
A: 编辑 `server/.env` 改 `PORT=13001`,同时 `client/.env` 的 `VITE_API_BASE_URL=http://127.0.0.1:13001/api`。

**Q: 我想停止所有 dev 进程?**
A: 关闭 3 个终端即可。`pnpm dev` 用 concurrently,Ctrl+C 会一并停掉。
