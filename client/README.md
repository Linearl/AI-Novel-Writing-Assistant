# @ai-novel/client

AI 小说创作工作台前端。

## 技术栈

- React 19 + TypeScript
- Vite 7 构建
- TanStack Query 数据请求
- Plate 富文本编辑器
- Zustand 状态管理
- Tailwind CSS 样式

## 开发

```bash
# 安装依赖（在项目根目录执行）
pnpm install

# 启动开发服务器
pnpm --filter @ai-novel/client dev

# 构建生产版本
pnpm --filter @ai-novel/client build

# 类型检查
pnpm --filter @ai-novel/client typecheck

# 测试
pnpm --filter @ai-novel/client test
```

## 端口

开发服务器默认运行在 `http://localhost:5173`。

## 目录结构

```text
src/
├── pages/         路由页面（vite-plugin-pages 文件路由）
├── components/    UI 组件
├── api/           API 请求层
├── store/         Zustand store
├── hooks/         自定义 hooks
└── router/        路由配置
```
