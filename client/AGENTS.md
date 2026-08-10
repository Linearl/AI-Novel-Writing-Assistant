<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# client

## Purpose
`@ai-novel/client` 包:React 19 + Vite 前端。面向写作新手的"AI 导演式"长篇小说生产工作台,涵盖小说创建、章节生产、auto-director 驾驶舱、Creative Hub、任务中心、角色/世界观/风格管理等全流程页面。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 包定义(`type: module`,依赖 React 19 / Vite 7 / TanStack Query / Zustand / Plate) |
| `vite.config.ts` | Vite 配置(dev 端口 5173,proxy 到后端 13000) |
| `tsconfig.json` | TS 配置 |
| `tailwind.config.ts` | Tailwind 样式配置 |
| `index.html` | 入口 HTML |
| `components.json` | shadcn/ui 组件配置 |
| `src/main.tsx` | React 应用入口 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `src/` | 前端源码(api/components/pages/store/hooks 等)(see `src/AGENTS.md`) |
| `scripts/` | 构建辅助脚本(`build-desktop.mjs`) |
| `tests/` | 前端测试(Playwright 风格 `.test.js` 文件,`node --test` 运行) |
| `public/` | 静态资源 |

## For AI Agents

### Working In This Directory
- 包名 `@ai-novel/client`,依赖 `@ai-novel/shared` (workspace)
- 测试命令:`pnpm --filter @ai-novel/client test`(先 build shared)
- 构建:`pnpm build`(tsc --noEmit + vite build);桌面构建:`pnpm build:desktop`
- 路由由 `vite-plugin-pages` 文件路由生成,新增页面直接加文件
- 所有面向用户的 UI 文案必须从用户视角撰写(根 AGENTS.md "UI 文案规则")

### Style Conventions
- React 19 + TypeScript strict;函数组件 + hooks
- 全局状态用 Zustand(`src/store/`),服务端状态用 TanStack Query
- 编辑器基于 Plate,聊天 UI 基于 assistant-ui

## Dependencies

### Internal
- `@ai-novel/shared` (workspace) — 共享类型与 zod schema(改类型后需重新 build)
- 根 `AGENTS.md` — 最高优先级规则

### External
- React 19 / Vite 7 / TypeScript
- TanStack Query / Zustand / react-router-dom 7
- Plate(编辑器) / assistant-ui(聊天) / Tailwind CSS
