<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# client/src

## Purpose
前端 TypeScript 源码根目录。页面、组件、状态、API 层、hooks 等全部从这里发出,按职责分层组织。

## Key Files
| File | Description |
|------|-------------|
| `main.tsx` | React 应用入口(挂载 root、初始化 provider) |
| `vite-env.d.ts` | Vite 环境类型声明 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `api/` | 后端 API 请求层(axios 封装,按域拆分,含 `novel/` 子目录) |
| `assets/` | 静态资源(icon 等) |
| `components/` | 跨页面复用 UI 组件(common/ui/layout/creativeHub/autoDirector/character/knowledge 等) |
| `config/` | 前端配置常量 |
| `hooks/` | 自定义 hooks |
| `lib/` | 工具函数与辅助逻辑 |
| `mobile/` | 移动端适配(autoDirector) |
| `pages/` | 文件路由页面(每页一目录,含子组件/子 hooks) |
| `router/` | 路由配置(vite-plugin-pages 补充) |
| `services/` | 前端服务层(notification 等) |
| `store/` | Zustand 全局状态 |
| `styles/` | 全局样式(mobile 适配) |
| `types/` | 前端本地类型 |

## For AI Agents

### Working In This Directory
- **页面组织**:`pages/<feature>/` 一个目录一个功能,页面子组件放 `pages/<feature>/components/`,页面级 hooks 放 `pages/<feature>/hooks/`
- **共享组件**放 `components/`,不要放页面私有目录
- **API 层**:`src/api/` 按后端域拆分,新增接口先看现有模式
- 单文件 >700 行必须拆分(根 AGENTS.md 架构约束)
- UI 文案规则:从用户视角描述功能,禁止实现叙述式文案

### Testing Requirements
- 组件/页面测试:`pnpm --filter @ai-novel/client test`(需先 build shared)
- 新增页面建议在 `client/tests/` 添加对应导航/契约测试

## Dependencies

### Internal
- `@ai-novel/shared` (workspace) — 共享类型
- 根 `AGENTS.md` — 最高优先级规则

### External
- React 19 / Vite 7 / react-router-dom 7
- TanStack Query / Zustand / axios
