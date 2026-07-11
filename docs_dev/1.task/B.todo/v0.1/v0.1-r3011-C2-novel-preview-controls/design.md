# Design: REQ-3011 小说预览页面增强控制面板

## 设计概述

本设计实现了小说预览页面的控制面板，允许用户在预览时实时调节显示设置。控制面板位于页面标题和"复制正文"按钮之间的空白区域。

---

## 架构设计

### 组件结构

```
NovelPreviewControls/
├── index.tsx              # 主容器组件
├── FontSizeSlider.tsx     # 字号滑块组件
├── FontSelector.tsx       # 字体选择器组件
├── BoldToggle.tsx         # 加粗开关组件
├── WidthSlider.tsx        # 页宽滑块组件
├── BackgroundPicker.tsx   # 背景色选择器组件
├── ControlPanel.tsx       # 控制面板容器
├── usePreviewSettings.ts  # 预览设置自定义 hook
└── types.ts               # 类型定义
```

### 数据流

```
用户交互 → usePreviewSettings hook → 更新状态
     ↓
PreviewSettings Context
     ↓
小说预览区域组件（接收设置 props）
```

---

## 关键组件设计

### 1. usePreviewSettings Hook

管理预览设置状态，提供统一的状态管理和持久化接口。

```typescript
interface PreviewSettings {
  fontSize: number;        // 12-36
  fontFamily: FontFamily;  // 枚举值
  isBold: boolean;
  pageWidth: number;       // 500-1200
  backgroundColor: ThemeColors;
}

type FontFamily = 'song' | 'hei' | 'kai' | 'fangsong' | 'yahei' | 'system';

type ThemeColors = {
  background: string;
  text: string;
};

// Hook 接口
function usePreviewSettings(): {
  settings: PreviewSettings;
  updateFontSize: (size: number) => void;
  updateFontFamily: (family: FontFamily) => void;
  toggleBold: () => void;
  updatePageWidth: (width: number) => void;
  updateBackground: (theme: ThemeColors) => void;
  resetToDefaults: () => void;
};
```

### 2. ControlPanel 组件

控制面板容器，布局和组织所有控制项。

```typescript
interface ControlPanelProps {
  settings: PreviewSettings;
  onUpdate: {
    fontSize: (size: number) => void;
    fontFamily: (family: FontFamily) => void;
    bold: () => void;
    pageWidth: (width: number) => void;
    background: (theme: ThemeColors) => void;
  };
  className?: string;
}
```

**布局方案**：
- 水平排列所有控制项（在宽屏上）
- 使用分组样式，每组用分割线分隔
- 支持响应式：窄屏时换行为垂直排列

### 3. 各控制项组件

#### FontSizeSlider
- 范围：12px ~ 36px
- 步长：1px 或 2px
- 显示当前值
- 支持拖动和点击选择

#### FontSelector
- 下拉选择或按钮组
- 选项中以该字体显示选项文字
- 预览效果

#### BoldToggle
- 简单的开关控件
- 两个状态：开启/关闭
- 显示当前状态文本

#### WidthSlider
- 范围：500px ~ 1200px
- 步长：50px 或 100px
- 预设按钮：600px、800px、1000px
- 实时显示宽度值

#### BackgroundPicker
- 按钮组或色板
- 4 个预设主题（见下表）
- 每个主题显示预览色块

**预设主题**：

| 主题 | 背景色 | 文本颜色 | 说明 |
|------|--------|----------|------|
| 默认白 | #FFFFFF | #000000 | 纯白色背景 |
| 米黄色 | #F5F5DC | #333333 | 暖色调，减少刺眼 |
| 护眼绿 | #CCE8CF | #2D2D2D | 绿色调，护眼效果 |
| 夜间黑 | #1A1A1A | #CCCCCC | 暗色主题 |

---

## 样式设计

### 布局样式

```css
.control-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 16px;
  background: #F8F9FA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  margin-bottom: 16px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 16px;
  border-right: 1px solid #E5E5E5;
}

.control-group:last-child {
  border-right: none;
}

.control-label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
  margin-bottom: 4px;
}

.control-value {
  font-size: 11px;
  color: #999;
}
```

### 响应式布局

```css
@media (max-width: 900px) {
  .control-panel {
    flex-direction: column;
  }
  
  .control-group {
    border-right: none;
    border-bottom: 1px solid #E5E5E5;
    padding: 12px 0;
  }
}
```

---

## 性能考虑

### 渲染优化

1. **使用 useMemo**：控制面板设置变化不触发整个预览区域重渲染
2. **使用 useCallback**：控制项回调函数稳定化
3. **使用 React.memo**：控制项组件在 props 不变时不重渲染

### 状态更新优化

1. **使用 useReducer**：集中管理多个相关状态
2. **批量更新**：多个状态变化合并为一次渲染
3. **防抖处理**：滑块拖动时使用 debounce（可选，100ms）

---

## 可访问性

1. 所有控件有明确的标签（label）
2. 支持键盘操作（Tab、方向键）
3. 颜色对比度符合 WCAG 2.1 AA 标准
4. 每个控件有 aria-label 说明

---

## 错误处理

1. 字体加载失败时使用系统默认字体
2. 持久化失败时静默失败（不影响预览）
3. 设置超出范围时自动 clamp 到合法值

---

## 测试策略

### 单元测试

1. `usePreviewSettings` hook 测试
2. 各控制项组件的交互测试
3. 设置持久化逻辑测试

### 集成测试

1. 控制面板整体布局测试
2. 控制项与预览区域的联动测试
3. 响应式布局测试

### E2E 测试

1. 完整控制流程测试（调节所有设置）
2. 刷新页面后设置保持测试（可选）

---

## 未来扩展

1. **自定义字体上传**：支持用户上传 TTF/OTF 字体文件
2. **自定义背景色**：颜色选择器支持 RGB/HSL 调整
3. **导出设置**：将设置导出为配置文件
4. **多套配置**：支持保存和切换多套显示设置
5. **动画效果**：设置变化时的平滑过渡动画

---

## 参考

- Ant Design Slider 组件
- React 官方文档 - Hooks
- 项目编码规范（见 CLAUDE.md）
