---
description: "REQ-3017 方案设计"
update_time: 2026-07-13
---

# REQ-3017 方案设计

## 1. 架构设计

### 1.1 组件结构

```
NovelCreate.tsx
├── QuickPreviewCard（快速预览卡片）← 保持独立
├── PathSelectionCard（路径选择卡片）← 新增
│   ├── 路径A按钮
│   ├── 路径B按钮
│   └── 路径C按钮
└── 动态内容区 ← 根据路径选择变化
    ├── 路径A：NovelAutoDirectorDialog（对话框）
    ├── 路径B：MaterialParseDialog 导入区
    └── 路径C：NovelBasicInfoForm（表单）
```

### 1.2 状态管理

```typescript
// NovelCreate.tsx 中的状态
const [selectedPath, setSelectedPath] = useState<'A' | 'B' | 'C' | null>(null);
const [autoDirectorDialogOpen, setAutoDirectorDialogOpen] = useState(false);
const [showMaterialImport, setShowMaterialImport] = useState(false);
const [showManualForm, setShowManualForm] = useState(false);
```

### 1.3 路径选择逻辑

```typescript
const handlePathSelect = (path: 'A' | 'B' | 'C') => {
  setSelectedPath(path);

  switch (path) {
    case 'A':
      // 直接打开AI自动导演对话框
      setAutoDirectorDialogOpen(true);
      break;
    case 'B':
      // 显示素材导入区
      setShowMaterialImport(true);
      break;
    case 'C':
      // 显示手动填写表单
      setShowManualForm(true);
      break;
  }
};
```

---

## 2. UI设计

### 2.1 路径选择卡片

```tsx
<Card>
  <CardHeader>
    <CardTitle>选择你的创作方式</CardTitle>
    <CardDescription>
      三种路径，最终都填充同一组字段，根据你的需求选择最适合的方式
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="grid gap-4 md:grid-cols-3">
      <PathOption
        title="我有初步想法"
        description="AI自动导演开书"
        icon={<SparklesIcon />}
        isSelected={selectedPath === 'A'}
        onClick={() => handlePathSelect('A')}
      />
      <PathOption
        title="我有完善想法"
        description="从素材导入"
        icon={<FileImportIcon />}
        isSelected={selectedPath === 'B'}
        onClick={() => handlePathSelect('B')}
      />
      <PathOption
        title="都不需要"
        description="我要手动填写"
        icon={<PencilIcon />}
        isSelected={selectedPath === 'C'}
        onClick={() => handlePathSelect('C')}
      />
    </div>
  </CardContent>
</Card>
```

### 2.2 动态内容区

```tsx
{selectedPath === 'A' && autoDirectorDialogOpen && (
  <NovelAutoDirectorDialog
    // ...props
    open={autoDirectorDialogOpen}
    onOpenChange={setAutoDirectorDialogOpen}
    onConfirmed={handleAutoDirectorConfirmed}
  />
)}

{selectedPath === 'B' && showMaterialImport && (
  <Card>
    <CardHeader>
      <CardTitle>导入素材</CardTitle>
      <CardDescription>
        上传或粘贴你的长文本素材，AI将帮你解析为结构化字段
      </CardDescription>
    </CardHeader>
    <CardContent>
      <MaterialParseDialog onApplyParsed={handleMaterialParsed} />
    </CardContent>
  </Card>
)}

{selectedPath === 'C' && showManualForm && (
  <Card>
    <CardHeader>
      <CardTitle>填写小说信息</CardTitle>
      <CardDescription>
        逐步填写各字段，所有带"AI帮我填"的字段都可以让AI辅助生成
      </CardDescription>
    </CardHeader>
    <CardContent>
      <NovelBasicInfoForm
        basicForm={basicForm}
        // ...props
      />
    </CardContent>
  </Card>
)}
```

---

## 3. 数据流设计

### 3.1 统一目标字段

无论走哪条路径，最终都填充这些字段：

```typescript
interface NovelBasicFormState {
  title: string;
  description: string;
  worldSetting: string;
  characters: string;
  outline: string;
  styleTone: string;
  readerChannelPreference: 'male' | 'female' | 'neutral';
  narrativePov: 'first' | 'third_limited' | 'third_omniscient';
  pacePreference: 'fast' | 'medium' | 'slow';
  estimatedChapterCount: number;
}
```

### 3.2 路径A数据流

```
用户输入想法 → NovelAutoDirectorDialog
→ AI生成候选方案（3个）
→ 用户选择方案
→ 自动填充 basicForm 所有字段
→ 用户微调（可选）
→ 点击"创建小说"
```

### 3.3 路径B数据流

```
用户导入素材 → MaterialParseDialog
→ AI解析为结构化字段（worldSetting, characters, outline）
→ 预览解析结果
→ 用户确认
→ 填充 basicForm 对应字段
→ 用户继续编辑（可选）
→ 点击"创建小说"
```

### 3.4 路径C数据流

```
直接显示 NovelBasicInfoForm 表单
→ 用户逐个填写字段
→ 可使用各字段的"AI帮我填"按钮辅助
→ 点击"创建小说"
```

---

## 4. 实现要点

### 4.1 关键修改点

1. **NovelCreate.tsx**：添加 selectedPath 状态和路径选择逻辑
2. **PathSelectionCard.tsx**：新建组件，实现路径选择UI
3. **动态内容区**：根据 selectedPath 显示对应内容

### 4.2 复用现有组件

- NovelAutoDirectorDialog：路径A的对话框
- MaterialParseDialog：路径B的素材导入
- NovelBasicInfoForm：路径C的字段表单

### 4.3 保持兼容性

- 快速预览卡片保持独立，不受路径选择影响
- 所有现有功能保持不变
- 数据模型不变

---

## 5. 测试策略

### 5.1 单元测试

- PathSelectionCard 组件测试
- 路径选择逻辑测试
- 动态内容切换测试

### 5.2 集成测试

- 路径选择与现有组件集成测试
- 路径A/B/C完整流程测试

### 5.3 E2E测试

- 手动验证所有路径的完整流程
- 验证与现有功能的兼容性

---

## 6. 风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| UI布局调整导致样式问题 | 使用现有UI组件，保持一致性 |
| 路径切换时状态混乱 | 使用React状态管理，确保切换逻辑清晰 |
| 现有功能回归 | 完善测试覆盖，手动验证核心流程 |
