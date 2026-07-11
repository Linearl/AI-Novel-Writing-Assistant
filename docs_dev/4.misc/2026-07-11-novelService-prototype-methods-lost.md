---
description: 2026-07-11 自动导演 novelService 原型方法丢失问题分析与修复
---

# 自动导演 novelService 方法丢失问题

## 问题描述

自动导演执行章节时报错：
```
this.deps.novelService.startPipelineJob is not a function
this.deps.novelService.findActivePipelineJobForRange is not a function
```

## 根因分析

`NovelDirectorService.ts` 和 `DirectorCoreStepModuleRuntime.ts` 中创建 `novelService` 使用对象展开：

```typescript
const novelService = { ...getSharedNovelServices(), ...novelCoreService } as any;
```

**JavaScript 展开类实例（`...instance`）只拷贝构造函数中赋值的实例属性（own enumerable properties），不拷贝原型链上的方法。**

`NovelCoreService` 中的方法分两类：
- **箭头函数类字段**（own property）：`startPipelineJob`、`createChapterStream`、`createRepairStream`
- **普通 async 方法**（prototype method）：`findActivePipelineJobForRange`、`getPipelineJobById`、`resumePipelineJob`、`cancelPipelineJob` 等

展开只能拷贝第一类，第二类全部丢失。

## 修复方案

用 `Object.getOwnPropertyNames` 沿原型链收集所有方法，通过 `.bind()` 绑定正确 `this` 后合并到对象：

```typescript
const novelService = (() => {
  const src = novelCoreService;
  const base = { ...getSharedNovelServices(), ...src }; // 拷贝 own properties
  // 沿原型链收集并 bind 普通方法
  for (let proto = Object.getPrototypeOf(src); proto && proto !== Object.prototype; proto = Object.getPrototypeOf(proto)) {
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name !== "constructor" && typeof proto[name] === "function" && !(name in base)) {
        base[name] = proto[name].bind(src);
      }
    }
  }
  return base;
})() as any;
```

## 受影响文件

| 文件 | 行号 | 修复状态 |
|------|------|---------|
| `server/src/services/novel/director/NovelDirectorService.ts` | 100 | ✅ 已修复 |
| `server/src/services/novel/director/workflowStepRuntime/ DirectorCoreStepModuleRuntime.ts` | 64 | ✅ 已修复 |

## 验证

修复后 `novelService` 共暴露 77 个方法，包含：
- `startPipelineJob`（实例属性，展开可拷贝）
- `findActivePipelineJobForRange`（原型方法，需 bind）
- `getPipelineJobById`（原型方法，需 bind）
- `resumePipelineJob`（原型方法，需 bind）
- `cancelPipelineJob`（原型方法，需 bind）

## 经验教训

TypeScript `as any` 会屏蔽类型检查，掩盖展开类实例丢失原型方法的问题。对需要完整方法集的依赖注入，应避免盲展开，改用显式绑定或代理模式。
