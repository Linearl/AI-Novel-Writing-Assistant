---
description: "ARCH-004: DirectorCommandService ↔ workers/ 循环依赖解耦（P1）— IDispatcher 接口抽象"
---

# REQ-7035：DirectorCommandService ↔ workers/ 循环依赖解耦

## 背景

[复核报告 ARCH-004](docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md) 确认：

```
DirectorCommandService → workers/TaskDispatcher → workers/DirectorTaskQueue → DirectorCommandService
```

这是项目唯一的真实 P1 循环依赖。Node.js 中循环 import 导致模块初始化顺序不确定，间歇性 `TypeError: X is not a function`。

## 决策

**方案 A：依赖倒置（DIP）**——提取 `IDispatcher` 接口，DirectorCommandService 依赖接口而非具体实现。

## 实施步骤

1. 在 `server/src/platform/` 创建 `IDirectorTaskDispatcher.ts`
2. 提取 TaskDispatcher 的公开方法签名为接口
3. `DirectorCommandService` 从接口文件导入 `IDirectorTaskDispatcher` 而非 `../../workers/TaskDispatcher`
4. `workers/` 在启动时注入具体 `taskDispatcher` 实例
5. 验证循环 import 解除

## 验收标准

- [ ] 循环依赖链路解除：grep 确认无 mutual import
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过
- [ ] 自动导演功能正常（手动验证至少一次章节生成）

## 参考

- 复核报告：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md`
