<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# infra

## Purpose
基础设施配置 — 容器编排、反向代理。

## Key Files
| File | Description |
|------|-------------|
| `docker-compose.qdrant.yml` | Qdrant(向量数据库)docker compose 定义 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `nginx/` | Nginx 配置(`ai-novel-web.conf`) |

## For AI Agents

### Working In This Directory
- 改动 Qdrant / Nginx 配置前先确认生产侧的版本兼容
- 配置文件应带注释解释关键参数
- 备份当前运行配置后再调整

## Dependencies

### External
- Qdrant(向量 DB,RAG 用)
- Nginx(反向代理,web 端)