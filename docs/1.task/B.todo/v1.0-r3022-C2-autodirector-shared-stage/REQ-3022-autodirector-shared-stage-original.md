---
description: 提取共享 Stage 核心组件，消除 AutoDirector 创建流程 5 对 10 个文件的双轨重复
---

# REQ-3022 — AutoDirector 共享 Stage 组件提取

## 1. 背景

AutoDirector 创建流程存在两套完全平行的 Stage 组件，每对组件核心 UI 逻辑相同但各自独立维护：

**页面级**（全屏创建流程）— `pages/novels/autoDirector/`:
- StageBasicSetup.tsx (195行)
- StageIdea.tsx (154行)
- StageModelRun.tsx (186行)
- StageWorldStyle.tsx (149行)
- StageCandidates.tsx (90行)

**子组件级**（对话框内创建流程）— `pages/novels/components/autoDirectorCreate/`:
- StageBasicSetup.tsx (195行)
- StageIdea.tsx (81行)
- StageModelRun.tsx (195行)
- StageWorldStyle.tsx (156行)
- StageCandidates.tsx (118行)

合计 5 对 10 个文件约 1576 行，其中约 70% 逻辑重复。

### 差异分析

核心 UI 逻辑（表单字段、验证、选项渲染）几乎完全相同。主要差异在于：
- **布局**：页面级为全屏独立布局，子组件级为对话框紧凑布局
- **Props 接口**：页面级通过 controller hook 注入，子组件级通过 props 注入
- **导航行为**：页面级使用步骤编号，子组件级使用步骤 key

共享常量（`BASIC_INFO_FIELD_HINTS`、`EMOTION_OPTIONS` 等）当前分散定义在各组件内部，部分已通过 `novelBasicInfo.shared` 引入。

## 2. 目标

提取共享 Core 组件，消除 5 对组件间的逻辑重复。每个 Stage 的 Core 组件包含 90% 共享逻辑，两套包装组件只处理布局差异。

## 3. 范围

### 包含

- 提取共享常量到 `stageConstants.ts`
- 为 5 个 Stage 创建 Core 组件
- 重构子组件级 5 个包装组件，引用 Core 组件
- 重构页面级 5 个包装组件，引用 Core 组件
- 保持外部接口不变（使用者无需改动 import 路径）

### 不包含

- 修改 Core 组件内部业务逻辑
- 修改 controller / hook 签名
- 修改其他目录结构
- 新增测试文件（后续迭代）

## 4. 非目标

- 不合并目录结构
- 不修改路由或导航逻辑
- 不改变外部消费者代码

## 5. EARS 验收条目

| ID | 验收条件 |
|----|----------|
| AC-1 | 5 个共享 Core 组件已创建，包含所有可复用的表单、选项和渲染逻辑 |
| AC-2 | 子组件级 5 个包装组件引用 Core 组件，Props 接口不变 |
| AC-3 | 页面级 5 个包装组件引用 Core 组件，外部接口不变 |
| AC-4 | `pnpm typecheck` 零错误 |
| AC-5 | `pnpm test:client` 全部通过 |
| AC-6 | 页面级和子组件级创建流程功能行为与重构前一致 |
| AC-7 | 总体代码行数减少 30% 以上（预计重复代码消除） |

## 6. 风险与未决项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Core 组件过度抽象导致灵活性降低 | 中 | Core 通过 props + render props 保持扩展点；包装组件可覆盖局部渲染 |
| Props 接口差异导致 Core 组件难以统一 | 中 | 设计统一的 CoreProps 接口，包装层做适配转换 |
| 常量分散在各文件，提取后可能遗漏引用 | 低 | grep 确认所有常量引用来自统一入口 |
| 重构可能遗漏边缘场景 | 中 | 手动验证两种创建流程的核心路径 |

## 7. 工时估算

预计 8-10 小时。
