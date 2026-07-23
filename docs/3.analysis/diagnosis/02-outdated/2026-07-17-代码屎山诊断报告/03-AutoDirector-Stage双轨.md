---
description: "子报告3：AutoDirector Stage组件完全双轨诊断——页面级与子组件级的5对重复文件"
date: 2026-07-17
parent: "2026-07-17-代码屎山诊断报告"
severity: P1
---

# 子报告3：AutoDirector Stage 组件完全双轨

> 严重度：P1（功能重复）
> 位置：`client/src/pages/novels/`
> 重复文件：5 对（10 个文件）| 合计行数：~1576 行

---

## 一、现状

### 1.1 双轨结构

项目中存在两套 AutoDirector 创建流程的 Stage 组件，功能高度重叠：

**页面级**（全屏创建流程）：
```
pages/novels/autoDirector/
├── StageBasicSetup.tsx      (252行)
├── StageIdea.tsx            (154行)
├── StageModelRun.tsx        (186行)
├── StageWorldStyle.tsx      (149行)
├── StageCandidates.tsx      (90行)
├── AutoDirectorCreatePage.tsx     ← 页面入口
└── useAutoDirectorCreateController.ts (612行) ← 控制器
```

**子组件级**（对话框内创建流程）：
```
pages/novels/components/autoDirectorCreate/
├── StageBasicSetup.tsx      (195行)
├── StageIdea.tsx            (81行)
├── StageModelRun.tsx        (195行)
├── StageWorldStyle.tsx      (156行)
├── StageCandidates.tsx      (118行)
└── (被 NovelAutoDirectorDialog.tsx 调用)
```

### 1.2 逐对对比

| Stage | 页面级行数 | 子组件级行数 | 差异 |
|-------|-----------|-------------|------|
| BasicSetup | 252 | 195 | 页面级多了 57 行（更多表单字段） |
| Idea | 154 | 81 | 页面级多了 73 行（更完整的创意输入） |
| ModelRun | 186 | 195 | 几乎相同 |
| WorldStyle | 149 | 156 | 几乎相同 |
| Candidates | 90 | 118 | 子组件级多了 28 行（卡片展示） |

---

## 二、差异分析

### 2.1 共享的常量和配置

两套组件引用相同的业务常量：
- `BASIC_INFO_FIELD_HINTS` — 基础信息字段提示
- `EMOTION_OPTIONS` — 情感选项
- `WORLD_STYLE_OPTIONS` — 世界观风格选项
- `MODEL_CONFIG_FIELDS` — 模型配置字段

这些常量分散定义在各组件内部，未提取为共享模块。

### 2.2 Props 接口差异

**页面级**：通过 `useAutoDirectorCreateController` hook 获取状态和方法
```typescript
// 页面级直接使用 hook
const controller = useAutoDirectorCreateController();
// Stage 组件接收 controller 的部分状态
<StageBasicSetup {...controller} />
```

**子组件级**：通过 Props 注入
```typescript
// 子组件级通过 props 接收
<StageBasicSetup
  formData={formData}
  onFieldChange={onFieldChange}
  onNext={onNext}
/>
```

### 2.3 UI 差异

| 差异点 | 页面级 | 子组件级 |
|--------|--------|---------|
| 布局 | 全屏居中 | 对话框内紧凑 |
| 导航 | 底部按钮组 | 对话框 Footer |
| 间距 | 宽松（p-8） | 紧凑（p-4） |
| 字号 | 标准 | 略小 |

核心 UI 逻辑（表单字段、验证、选项渲染）几乎完全相同。

---

## 三、维护成本

### 3.1 当前状态

- 两套组件各自独立维护
- 功能迭代（如新增一个表单字段）需要修改两处
- Bug 修复可能只修一处而遗漏另一处

### 3.2 已知风险

`useAutoDirectorCreateController.ts`（612 行）是页面级的核心控制器，本身也是超大文件。它与子组件级的控制器逻辑重复，但接口不同。

---

## 四、根因

**历史路径依赖**：
1. 最初只有页面级全屏创建流程
2. 后来新增了对话框内的快捷创建入口
3. 新入口直接复制了页面级组件，调整了 props 和布局
4. 两套代码独立演进，差异逐渐增大

---

## 五、建议方案

### 方案A：提取共享 Stage 组件（推荐）

```
pages/novels/components/autoDirectorCreate/
├── shared/
│   ├── StageBasicSetupCore.tsx    ← 共享核心逻辑
│   ├── StageIdeaCore.tsx
│   ├── StageModelRunCore.tsx
│   ├── StageWorldStyleCore.tsx
│   ├── StageCandidatesCore.tsx
│   └── stageConstants.ts          ← 共享常量
├── StageBasicSetup.tsx            ← 子组件级包装（紧凑布局）
└── ... (其他子组件级包装)

pages/novels/autoDirector/
├── StageBasicSetup.tsx            ← 页面级包装（全屏布局）
└── ... (其他页面级包装)
```

每个"Core"组件包含 90% 的共享逻辑，包装组件只处理布局差异（padding、字号、导航）。

**工时**：8-10h
**收益**：消除 5 处重复，功能迭代只需改 Core 组件

### 方案B：废弃子组件级，统一到页面级

如果对话框入口使用频率低，可废弃子组件级，将对话框入口改为跳转到页面级。

**工时**：4-6h
**风险**：用户体验变化（从对话框变为全屏）
