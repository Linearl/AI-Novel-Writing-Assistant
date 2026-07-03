---
description: "REQ-3006 技术设计文档"
id: REQ-3006
title: 修复详情弹窗增强 - 技术设计
version: 0.1
created: 2026-06-28
---

# REQ-3006: 技术设计

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Repair Detail Dialog                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Header: 修复详情 - Token: 12,345  [关闭]          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  [版本 1] [版本 2] [版本 3] ...                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Content: 版本内容 / Diff 视图                      │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Chapter Editor (步骤 6)                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Header: [保存] [撤销] [查看 Diff]                  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  Content: 章节正文                                  │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 2. 功能模块

### 2.1 Token 统计实时显示

**数据源**：
- 复用 `task.tokenUsage` 或新增 API 查询修复任务的 token 消耗
- 每 3s 轮询一次（使用 `setInterval`）

**UI 实现**：
```tsx
// DialogHeader 中
<DialogTitle>
  修复详情
  {isRepairing && (
    <Badge variant="outline" className="ml-2">
      Token: {formatTokenCount(tokenUsage)}
    </Badge>
  )}
</DialogTitle>
```

**刷新逻辑**：
```tsx
useEffect(() => {
  if (!isRepairing) return;
  const timer = setInterval(() => {
    refetchTokenUsage();
  }, 3000);
  return () => clearInterval(timer);
}, [isRepairing]);
```

### 2.2 多版本动态 Tab

**数据结构**：
```typescript
interface RepairVersion {
  id: string;
  versionIndex: number;
  content: string;
  createdAt: string;
  tokenUsage?: number;
}
```

**状态管理**：
```tsx
const [versions, setVersions] = useState<RepairVersion[]>([]);
const [activeVersion, setActiveVersion] = useState<string>('');

// 修复过程中动态添加版本
useEffect(() => {
  if (newVersion) {
    setVersions(prev => [...prev, newVersion]);
    setActiveVersion(newVersion.id);
  }
}, [newVersion]);
```

**UI 实现**：
```tsx
<Tabs value={activeVersion} onValueChange={setActiveVersion}>
  <TabsList>
    {versions.map((v, i) => (
      <TabsTrigger key={v.id} value={v.id}>
        版本 {i + 1}
      </TabsTrigger>
    ))}
  </TabsList>
  {versions.map(v => (
    <TabsContent key={v.id} value={v.id}>
      <CardContent content={v.content} />
    </TabsContent>
  ))}
</Tabs>
```

### 2.3 Diff 视图

**Diff 库选择**：

| 库 | 优点 | 缺点 |
|----|------|------|
| diff | 轻量，纯 JS | 需要自己实现 UI |
| react-diff-viewer | React 组件，开箱即用 | 体积较大 |
| Monaco Editor diff | 功能强大，VS Code 体验 | 体积大，学习成本高 |

**推荐**：`react-diff-viewer-continued`（react-diff-viewer 的维护版本）

**UI 实现**：
```tsx
import ReactDiffViewer from 'react-diff-viewer-continued';

// 在弹窗中
{showDiff && (
  <ReactDiffViewer
    oldValue={originalContent}
    newValue={repairedContent}
    splitView={true}
  />
)}
```

**切换按钮**：
```tsx
// 步骤 6 正文主窗口头部
{canShowDiff && (
  <Button
    variant="outline"
    size="sm"
    onClick={() => setShowDiff(true)}
  >
    查看 Diff
  </Button>
)}
```

## 3. 数据流

```
修复开始
    │
    ├──► 创建修复任务
    │
    ├──► 流式生成内容
    │       │
    │       ├──► 版本 1 完成 ──► 添加到 versions[]
    │       │
    │       ├──► 版本 2 完成 ──► 添加到 versions[]
    │       │
    │       └──► ...
    │
    └──► 修复完成
            │
            ├──► 标记 canShowDiff = true
            │
            └──► 停止 token 刷新
```

## 4. API 变更

### 4.1 查询修复任务 token 用量

```typescript
// GET /tasks/:taskId/token-usage
Response: {
  tokenUsage: {
    llmCallCount: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  }
}
```

### 4.2 查询修复版本列表

```typescript
// GET /tasks/:taskId/versions
Response: {
  versions: Array<{
    id: string;
    versionIndex: number;
    content: string;
    createdAt: string;
  }>
}
```

## 5. 组件结构

```
RepairDetailDialog
├── DialogHeader
│   ├── DialogTitle (含 Token 统计)
│   └── DialogDescription
├── Tabs (版本切换)
│   ├── TabsList
│   │   └── TabsTrigger × N
│   └── TabsContent × N
│       └── RepairVersionContent
└── DialogFooter
    └── 关闭按钮

ChapterEditorHeader
├── 保存按钮
├── 撤销按钮
└── 查看 Diff 按钮 (条件显示)

DiffViewDialog
├── ReactDiffViewer
└── 关闭按钮
```

## 6. 样式方案

- Token 统计使用 Badge 组件，绿色表示正常，红色表示超预算
- 版本 Tab 使用 shadcn/ui Tabs 组件
- Diff 视图使用 `react-diff-viewer-continued` 默认样式，自定义颜色主题

## 7. 错误处理

| 场景 | 处理方式 |
|------|----------|
| Token 统计 API 失败 | 静默失败，不显示 Token 数 |
| 版本列表加载失败 | 显示错误提示，支持重试 |
| Diff 视图渲染失败 | 降级显示纯文本对比 |

## 8. 性能优化

- Token 刷新使用 `useRef` 存储 timer，避免重复创建
- 版本列表使用虚拟滚动（如果版本数 > 20）
- Diff 视图懒加载（仅在切换到 diff 视图时渲染）

## 9. 测试策略

| 测试类型 | 覆盖点 |
|----------|--------|
| 单元测试 | Token 格式化、版本排序 |
| 组件测试 | Tab 切换、Diff 视图渲染 |
| E2E 测试 | 完整修复流程 + 版本查看 + Diff 对比 |
