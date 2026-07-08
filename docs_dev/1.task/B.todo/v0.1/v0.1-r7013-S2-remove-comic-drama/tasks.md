---
description: "移除漫画和短剧模块任务清单"
---

# 任务清单

## 阶段一：代码扫描

- [x] 1.1 扫描 comic 和 drama 相关的所有文件和引用
- [x] 1.2 确认移除范围和依赖关系

## 阶段二：后端移除

- [x] 2.1 移除 server/src/modules/comic/
- [x] 2.2 移除 server/src/modules/drama/
- [x] 2.3 移除 app.ts 中相关路由注册

## 阶段三：前端移除

- [x] 3.1 移除漫画相关页面组件
- [x] 3.2 移除短剧相关页面组件
- [x] 3.3 移除路由配置中的相关条目

## 阶段四：验证

- [x] 4.1 pnpm typecheck 通过
- [x] 4.2 pnpm build 通过
- [ ] 4.3 pnpm test 通过（待执行）
