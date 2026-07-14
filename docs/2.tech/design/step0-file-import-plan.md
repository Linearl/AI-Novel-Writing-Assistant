# 步骤0 文件导入功能实现计划

## 需求概述

在 AI 自动导演开书对话框中添加"从文件导入想法"功能，让用户可以快速导入手稿或草稿文件，避免手动打字。

---

## 实现步骤

### Step 1: 修改 NovelAutoDirectorSetupPanel 组件

**文件**：`client/src/pages/novels/components/NovelAutoDirectorSetupPanel.tsx`

**改动**：
1. 添加文件导入按钮到 header 区域
2. 添加 hidden file input 元素
3. 实现文件读取和处理逻辑

**代码片段**：

```typescript
// 在 props 接口中添加
interface NovelAutoDirectorSetupPanelProps {
  // ...existing
  onFileImport?: (content: string) => void;
}

// 在组件中添加
const fileInputRef = useRef<HTMLInputElement>(null);

const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (content?.trim()) {
      if (idea.trim()) {
        const confirmed = window.confirm("当前已有想法内容。是否替换为文件内容？");
        if (confirmed) {
          onIdeaChange(content);
        }
      } else {
        onIdeaChange(content);
      }
    }
  };
  reader.readAsText(file);
  event.target.value = ""; // 允许重新选择同一文件
};

// 修改 UI（第141-152行）
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  <div className="text-sm font-medium text-foreground">你的起始想法</div>
  <div className="flex gap-2">
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onGenerateIdeaInspirations}
      disabled={isGeneratingIdeaInspirations}
    >
      {isGeneratingIdeaInspirations ? "生成中..." : "没有想法？"}
    </Button>
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={() => fileInputRef.current?.click()}
    >
      导入文件
    </Button>
    <input
      ref={fileInputRef}
      type="file"
      accept=".txt,.md"
      className="hidden"
      onChange={handleFileImport}
    />
  </div>
</div>
```

**预估工作量**：1-2 小时

---

### Step 2: 添加文件大小和格式验证

**位置**：在 Step 1 的 handleFileImport 函数中

```typescript
const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 验证文件格式
  const allowedExtensions = [".txt", ".md"];
  const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    toast.error("仅支持 .txt 和 .md 格式的文本文件");
    return;
  }

  // 验证文件大小（最大 1MB）
  const maxSize = 1 * 1024 * 1024;
  if (file.size > maxSize) {
    toast.error("文件大小不能超过 1MB");
    return;
  }

  // ...existing file read logic
};
```

**预估工作量**：30 分钟

---

### Step 3: 添加文件导入反馈

**位置**：在文件成功导入后

```typescript
reader.onload = (e) => {
  const content = e.target?.result as string;
  if (content?.trim()) {
    // 添加成功提示
    toast.success(`已导入文件: ${file.name}（${(file.size / 1024).toFixed(1)} KB）`);

    // ...existing merge/replace logic
  }
};
```

**预估工作量**：15 分钟

---

### Step 4: 增强 UI 交互

**选项 1：文件名显示**

```typescript
// 在 Button 后添加文件名显示
const [importedFileName, setImportedFileName] = useState<string | null>(null);

// 在 handleFileImport 中
setImportedFileName(file.name);

// 在 UI 中
<Button ...>导入文件</Button>
{importedFileName && (
  <span className="text-xs text-muted-foreground truncate max-w-[100px]">
    {importedFileName}
  </span>
)}
```

**选项 2：导入文件预览弹窗**

```typescript
// 显示导入的内容预览，让用户确认
const [previewContent, setPreviewContent] = useState<string | null>(null);
const [isPreviewOpen, setIsPreviewOpen] = useState(false);

// 在 handleFileImport 中
setPreviewContent(content);
setIsPreviewOpen(true);

// 添加确认对话框
{isPreviewOpen && (
  <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>导入文件预览</DialogTitle>
      </DialogHeader>
      <div className="max-h-[300px] overflow-y-auto text-sm">
        {previewContent}
      </div>
      <DialogFooter>
        <Button onClick={() => {
          onIdeaChange(previewContent);
          setIsPreviewOpen(false);
          setImportedFileName(file.name);
        }}>
          确认导入
        </Button>
        <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
          取消
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)}
```

**预估工作量**：2-3 小时

---

## 完整实现方案

### 方案 A：快速版（1 天）

包含：
- ✅ 文件导入按钮
- ✅ .txt 和 .md 格式支持
- ✅ 文件大小限制
- ✅ 基础导入反馈（toast）
- ✅ 替换/合并选择（confirm）

排除：
- ❌ 文件名显示
- ❌ 导入预览
- ❌ 其他格式支持

**适合场景**：快速实现 MVP

---

### 方案 B：标准版（2 天）

包含：
- ✅ 方案 A 所有功能
- ✅ 文件名显示
- ✅ .doc/.docx 支持（通过前端转换）
- ✅ 更好的 UI/UX 优化
- ✅ 错误处理增强

适合场景：生产环境标准版本

---

### 方案 C：增强版（3 天）

包含：
- ✅ 方案 B 所有功能
- ✅ 导入内容预览弹窗
- ✅ 批量文件导入
- ✅ 导入历史记录
- ✅ 素材库功能

适合场景：完整的产品化版本

---

## 测试用例

### 基础测试

```typescript
test('import txt file updates idea textarea', async () => {
  // 准备
  const file = new File(['这是测试想法'], 'idea.txt', { type: 'text/plain' });

  // 执行
  const input = screen.getByLabelText('导入文件');
  await userEvent.upload(input, file);

  // 断言
  expect(screen.getByPlaceholderText('例如：...')).toHaveValue('这是测试想法');
});

test('import md file updates idea textarea', async () => {
  // 准备
  const file = new File(['# 我的想法\n\n这是一个好故事'], 'idea.md', { type: 'text/markdown' });

  // 执行
  const input = screen.getByLabelText('导入文件');
  await userEvent.upload(input, file);

  // 断言
  expect(screen.getByPlaceholderText('例如：...')).toHaveValue('# 我的想法\n\n这是一个好故事');
});
```

### 边界测试

```typescript
test('rejects file over 1MB', async () => {
  // 准备 - 创建 1.1MB 文件
  const content = 'x'.repeat(1.1 * 1024 * 1024);
  const file = new File([content], 'large.txt', { type: 'text/plain' });

  // 执行
  const input = screen.getByLabelText('导入文件');
  await userEvent.upload(input, file);

  // 断言
  expect(toast.error).toHaveBeenCalledWith('文件大小不能超过 1MB');
});

test('rejects non-txt/md files', async () => {
  // 准备
  const file = new File(['test'], 'file.pdf', { type: 'application/pdf' });

  // 执行
  const input = screen.getByLabelText('导入文件');
  await userEvent.upload(input, file);

  // 断言
  expect(toast.error).toHaveBeenCalledWith('仅支持 .txt 和 .md 格式');
});
```

### 交互测试

```typescript
test('confirm dialog when idea already exists', async () => {
  // 准备 - 已有想法
  render(<SetupPanel idea="已存在的想法" ... />);
  const file = new File(['新想法'], 'new.txt', { type: 'text/plain' });

  // 执行
  const input = screen.getByLabelText('导入文件');
  await userEvent.upload(input, file);

  // 断言 - 弹出确认
  expect(window.confirm).toHaveBeenCalledWith('当前已有想法内容。是否替换为文件内容？');

  // 确认替换
  await userEvent.click(screen.getByText('确定'));

  // 验证替换
  expect(screen.getByPlaceholderText('例如：...')).toHaveValue('新想法');
});
```

---

## 文件变更清单

### 必需修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `NovelAutoDirectorSetupPanel.tsx` | Edit | 添加文件导入逻辑 |

### 可选修改

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `NovelAutoDirectorSetupPanel.test.tsx` | Create | 添加单元测试 |
| `NovelAutoDirectorSetupPanel.module.css` | Edit | UI 样式调整 |

---

## 依赖关系

### 无新依赖

所有功能使用现有库：
- React useRef/useState/useEffect
- FileReader API（原生）
- toast（已有）
- shadcn/ui Button（已有）

### 与其他功能的依赖

- ✅ 无依赖（独立功能）
- ✅ 可随时添加
- ✅ 不影响现有代码

---

## 实施时间表

| 阶段 | 工作 | 预估时间 | 交付物 |
|------|------|---------|--------|
| Phase 1 | 基础实现 | 1-2h | 文件导入按钮和基础逻辑 |
| Phase 2 | 验证和反馈 | 30min | 格式/大小验证，toast 反馈 |
| Phase 3 | 测试 | 1-2h | 单元测试和边界测试 |
| Phase 4 | UI 优化 | 1-2h | 文件名显示、预览（可选） |
| **总计** | - | **3-6 小时** | 完整的文件导入功能 |

---

## 风险评估

| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|---------|
| 浏览器安全限制 | 中 | 中 | 使用标准 File API，无需特殊处理 |
| 大文件处理 | 低 | 中 | 添加大小限制和进度提示 |
| 编码问题 | 低 | 低 | 使用 UTF-8 编码读取 |
| 移动端兼容 | 中 | 低 | 使用 input type="file" 标准 |

---

## 参考代码

### 相似功能参考

1. **MaterialParseDialog 文件导入**
   - 位置：`MaterialParseDialog.tsx`
   - 功能：导入长文本进行解析
   - 参考：文件读取和预览逻辑

2. **其他文件上传功能**
   - 搜索代码库中的 `FileReader` 或 `type="file"`
   - 参考：文件验证和 UI 反馈模式

---

## 相关文档

- [AI 自动导演 vs 手动创建流程对比](./ai-vs-manual-comparison.md)
- [步骤0 素材导入设计](./step0-material-import-design.md)
- [步骤0 Mermaid 流程图](./step0-mermaid-diagrams.md)
