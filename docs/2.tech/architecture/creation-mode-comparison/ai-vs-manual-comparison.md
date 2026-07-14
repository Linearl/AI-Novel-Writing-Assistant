# AI 自动导演 vs 手动创建：流程对比分析

## 总体对比

| 维度 | 手动创建模式 | AI 自动导演模式 |
|------|-------------|----------------|
| **目标用户** | 有详细设定的作者 | 只有模糊想法的用户 |
| **核心逻辑** | 解析已有的完整素材 | 从模糊想法生成完整规划 |
| **UI 界面** | 多表单 + 多个专门输入区 | 单个弹窗对话框 |
| **提示词作用** | 解析用户输入 | AI 自动规划 |
| **处理流程** | 素材 → 解析 → 保存 → 步骤1 | 想法 → AI生成 → 候选 → 执行 |
| **用户参与度** | 高（需要手动配置） | 低（只需确认方向） |

---

## 详细流程对比

### 手动创建模式流程

```
创建项目页面 NovelCreate
│
├─→ 用户填写基本信息
│   ├─ 标题、描述、世界观设定、角色、大纲
│   ├─ （可选）使用 MaterialParseDialog 解析长文本素材
│   └─ 保存到 Novel 表
│
├─→ 进入 NovelEdit 页面
│   ├─ 步骤1：项目设定（AI生成扩展）
│   ├─ 步骤2：故事宏观规划
│   │   └─ storyInput = buildOutlineFromMaterialFields(basicForm)
│   │       = 合并 worldSetting + characters + outline
│   └─ 步骤3-7...
│
└─→ 用户逐步推进
```

### AI 自动导演模式流程

```
创建项目页面 NovelCreate
│
├─→ 用户点击 "AI 自动导演开书"
│   └─ 打开 NovelAutoDirectorDialog 对话框
│
├─→ 对话框内配置
│   ├─ 填写/导入初始想法（可选）
│   │   ├─ idea（核心想法）
│   │   ├─ basicForm（读者频道、节奏、视角等）
│   │   └─ 其他设置
│   │
│   ├─ 选择运行模式
│   │   ├─ 从头规划 (from_scratch)
│   │   ├─ 从步骤2开始 (from_step2)
│   │   └─ 从步骤4开始 (from_step4)
│   │
│   ├─ 生成候选方案
│   │   └─ AI 调用 generateDirectorCandidates()
│   │
│   └─ 用户选择并确认方案
│
├─→ 自动执行规划流水线
│   ├─ 保存基本设置到 Novel 表
│   ├─ 创建 auto_director 任务
│   └─ AI 自动执行步骤1-7
│
└─→ 完成后进入 NovelEdit 页面
```

---

## 关键代码逻辑对比

### 手动模式：素材注入链路

**位置**：`NovelEdit.tsx:27-30`

```typescript
const storyMacroFallbackInput = useMemo(() => {
  const parts = [
    basicForm.description.trim(),
    basicForm.outline.trim()
  ].filter(Boolean);
  return parts.join("\n\n");
}, [basicForm.description, basicForm.outline]);
```

**特点**：
- 直接从 basicForm 提取素材
- 拼接 description 和 outline
- 作为步骤2的 fallback 输入
- 已有完整数据，无需生成

**位置**：`novelBasicInfo.shared.ts:240-252`

```typescript
function buildOutlineFromMaterialFields(basicForm: NovelBasicFormState): string {
  const sections: string[] = [];
  if (basicForm.worldSetting.trim()) {
    sections.push(`【世界观设定】\n${basicForm.worldSetting.trim()}`);
  }
  if (basicForm.characters.trim()) {
    sections.push(`【角色阵容】\n${basicForm.characters.trim()}`);
  }
  if (basicForm.outline.trim()) {
    sections.push(`【故事大纲】\n${basicForm.outline.trim()}`);
  }
  return sections.join("\n\n");
}
```

**特点**：
- 合并三个字段为结构化文本
- 保留分节标记
- 传递完整素材

---

### AI 自动导演模式：想法构建链路

**位置**：`NovelAutoDirectorDialog.shared.ts:42-52`

```typescript
export function buildInitialIdea(basicForm: NovelBasicFormState): string {
  const lines = [
    basicForm.description.trim(),
    basicForm.title.trim()
      ? `我想写一本暂名为《${basicForm.title.trim()}》的小说。`
      : "",
    basicForm.styleTone.trim()
      ? `文风希望偏 ${basicForm.styleTone.trim()}。`
      : "",
    basicForm.worldSetting.trim()
      ? `\n【世界观设定】\n${basicForm.worldSetting.trim()}` : "",
    basicForm.characters.trim()
      ? `\n【角色阵容】\n${basicForm.characters.trim()}` : "",
    basicForm.outline.trim()
      ? `\n【故事大纲】\n${basicForm.outline.trim()}` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
```

**特点**：
- 合并 basicForm 所有字段
- 可从多个来源构建 idea
- 作为 AI 生成的种子
- AI 会基于此生成多个候选方案

**位置**：`NovelAutoDirectorSetupPanel.tsx:141-166`

```tsx
<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
  <div className="text-sm font-medium text-foreground">你的起始想法</div>
  <Button
    type="button"
    size="sm"
    variant="outline"
    onClick={onGenerateIdeaInspirations}
    disabled={isGeneratingIdeaInspirations}
  >
    {isGeneratingIdeaInspirations ? "生成中..." : "没有想法？"}
  </Button>
</div>
<Textarea
  className="mt-2 min-h-[128px]"
  value={idea}
  onChange={(event) => onIdeaChange(event.target.value)}
  placeholder="例如：普通女大学生误入异能组织，一边上学打工，一边调查父亲失踪真相。"
/>
```

**特点**：
- 提供"没有想法？"辅助功能
- AI 自动生成灵感供用户选择
- 用户可随时导入文件补充

---

## AI 模式 vs 手动模式的关键差异

### 1. 数据处理逻辑

| 场景 | 手动模式 | AI 模式 |
|------|---------|---------|
| 有完整素材 | 直接使用 | 导入作为 seed → AI 基于此生成候选 |
| 无素材 | 逐步填写 | AI 自动生成（从 description 开始） |
| 有模糊想法 | - | 填入 idea → AI 扩展和细化 |

### 2. 用户决策点

**手动模式决策点**：
1. 决定填哪些字段
2. 决定是否使用 MaterialParseDialog 解析素材
3. 步骤1-7 中的每一步都需要用户确认

**AI 模式决策点**：
1. 填写初始想法（可选）
2. 选择运行模式（从头/从步骤2/从步骤4）
3. 生成候选方案时选择一个
4. 确认后全自动执行

### 3. 提示词使用方式

**手动模式**：
- 步骤2提示词 → 从素材生成故事宏观规划
- 素材已经是结构化的 → 提示词需要解析和扩展

**AI 模式**：
- 生成候选提示词 → 从想法生成多个方案
- 想法是种子 → 提示词需要创意生成
- 用户选择后 → AI 自动填充所有步骤的 prompt

---

## 文件导入功能设计

### 需求分析

用户说："只需支持从文件导入想法"（AI 模式）

**实现位置**：`NovelAutoDirectorSetupPanel.tsx:141-152`

**建议的 UI 位置**：
```
┌──────────────────────────────────────────────┐
│ [你的起始想法]         [没有想法？] [导入文件] │
├──────────────────────────────────────────────┤
│                                              │
│  [Textarea: idea input]                      │
│                                              │
└──────────────────────────────────────────────┘
```

### 文件导入逻辑

```typescript
// 新增 props
interface NovelAutoDirectorSetupPanelProps {
  // ...existing
  onFileImport?: (content: string) => void;
}

// UI 修改
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
      accept=".txt,.md,.doc,.docx"
      className="hidden"
      onChange={handleFileImport}
    />
  </div>
</div>

// 文件处理
const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    if (content) {
      // 合并或替换 idea
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
};
```

---

## 为什么 AI 模式倾向于"生成"而非"解析"

### 设计理念

1. **用户画像差异**
   - 手动模式：专业/资深作者 → 有完整设定 → 解析他们的素材
   - AI 模式：新手/休闲用户 → 只有模糊想法 → 帮他们生成完整规划

2. **核心价值差异**
   - 手动模式：效率工具 → 快速录入和转换
   - AI 模式：创作助手 → 从零帮助创作

3. **交互设计差异**
   - 手动模式：引导式 → 用户主导
   - AI 模式：协作式 → AI 主导，用户确认

### 数据流向差异

**手动模式**：
```
用户完整素材 → 解析器 → 结构化字段 → 逐步生成内容
    ↓              ↓            ↓             ↓
  10000字        3个字段      3个表         步骤1-7
```

**AI 模式**：
```
用户想法/无想法 → AI生成器 → 多个候选方案 → 选择 → 自动执行
    ↓              ↓            ↓           ↓          ↓
  100-500字      3-5个方案   方案对比     1个方案    步骤1-7
```

---

## 结论与建议

### 步骤0 重新评估

基于分析，**步骤0不应是统一的素材导入功能**，而是：

**手动模式**：
- 步骤0 = 素材导入（MaterialParseDialog）
- 目的：将长文本素材解析为结构化字段
- 价值：减少手动输入工作量

**AI 模式**：
- 步骤0 = 从文件导入想法（仅文件读取）
- 目的：让有手稿的用户快速导入
- 价值：避免手动打字输入想法

### 建议实现方案

**Phase 1（立即实现）**：
- 在 NovelAutoDirectorSetupPanel 中添加文件导入按钮
- 支持 .txt、.md、.doc、.docx 格式
- 导入后替换或合并到 idea 字段
- 工作量：1-2 天

**Phase 2（可选增强）**：
- AI 模式下添加"导入素材"按钮（连接到 MaterialParseDialog）
- 自动将解析结果注入到 basicForm
- 用于有详细设定的用户快速迁移
- 工作量：2-3 天

**Phase 3（未来优化）**：
- 步骤0 作为独立阶段出现在 UI 中
- 可视化显示素材流转到各步骤
- 支持素材的修改和重新生成
- 工作量：6-8 天

---

## 相关文件

| 文件 | 职责 |
|------|------|
| `NovelAutoDirectorDialog.tsx` | AI 对话框入口 |
| `NovelAutoDirectorSetupPanel.tsx` | 设置面板（包含 idea 输入） |
| `NovelAutoDirectorDialog.shared.ts` | 构建初始想法和请求体 |
| `NovelCreate.tsx` | 创建项目页面（手动模式入口） |
| `novelBasicInfo.shared.ts` | 素材合并函数 |
| `useNovelStoryMacro.ts` | 步骤2 hook（使用 fallback 输入） |
