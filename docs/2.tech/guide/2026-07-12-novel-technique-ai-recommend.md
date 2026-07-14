# 项目设定 - 文笔技法 AI帮我挑 功能实现

## 功能概述

在项目设定的文笔技法面板中添加了"AI帮我挑"功能，与写法引擎中的实现类似。该功能会根据小说的标题和描述，自动推荐适合的文笔技法。

## 实现细节

### 1. 前端修改

#### NovelWritingTechniquePanel.tsx

- **新增props**：接收`novelTitle`和`novelDescription`参数，用于生成推荐
- **新增状态**：添加推荐对话框状态管理
- **新增mutation**：`recommendMutation`，调用`recommendTechniquesForNovel` API
- **新增handler**：`handleRecommendConfirm`，处理推荐确认
- **UI更新**：添加AI帮我挑按钮和TechniqueRecommendDialog组件

#### BasicInfoTab.tsx

- **传递props**：将`novelTitle`和`novelDescription`传递给NovelWritingTechniquePanel

### 2. API层修改

#### writingTechniques.ts

- **新增函数**：`recommendTechniquesForNovel(novelId, novelTitle, novelDescription)`
- **调用端点**：POST `/api/writing-techniques/recommend-for-novel`

### 3. 后端实现

#### writingTechniques.ts

- **新增API端点**：`POST /writing-techniques/recommend-for-novel`
- **请求体**：包含`novelId`、`novelTitle`和`novelDescription`（可选）
- **功能**：
  1. 获取所有启用的技法列表
  2. 使用LLM根据小说标题和描述生成推荐
  3. 返回推荐结果（技法列表+推荐理由）

### 4. 推荐流程

1. 用户点击"AI帮我挑"按钮
2. 前端发送请求到后端，包含小说标题和描述
3. 后端获取所有启用的技法
4. 调用LLM生成推荐（使用现有的`techniqueRecommendPrompt`）
5. 返回推荐结果到前端
6. 打开TechniqueRecommendDialog显示推荐结果
7. 用户选择推荐的技法
8. 点击确认，更新小说技法绑定

## 用户体验

### 与写法引擎的区别

| 特性 | 写法引擎 | 项目设定 |
|------|---------|---------|
| 绑定对象 | 写法画像 | 小说 |
| 推荐上下文 | 画像名称+描述 | 小说标题+描述 |
| 界面位置 | 写法引擎页面 | 项目设定 → 基本信息 |
| 使用场景 | 创建或编辑写法画像 | 编辑小说基本信息 |

### 操作流程

1. 打开创作工作台
2. 选择一个小说项目
3. 进入项目设定
4. 展开"文笔技法"部分
5. 点击"AI帮我挑"按钮
6. AI生成推荐（通常2-3秒）
7. 在弹出的对话框中查看推荐结果
8. 选择想使用的技法
9. 点击"应用选中"

## 技术亮点

1. **复用现有组件**：直接使用TechniqueRecommendDialog组件，保持UI一致性
2. **复用推荐逻辑**：复用现有的`techniqueRecommendPrompt`，无需重新实现LLM调用
3. **绑定到小说**：推荐是根据小说的标题和描述生成的，而不是写法画像
4. **无缝集成**：与现有的小说技法绑定系统完美集成

## 相关文件

### 前端
- `client/src/pages/novels/components/NovelWritingTechniquePanel.tsx` - 主要组件
- `client/src/pages/novels/components/BasicInfoTab.tsx` - 调用方
- `client/src/api/writingTechniques.ts` - API层

### 后端
- `server/src/modules/writing/http/writingTechniques.ts` - API端点

## 类型检查

```
✓ 类型检查通过
✓ 构建成功
✓ 服务器重启完成
```

## 使用建议

1. **提供详细描述**：为了获得更好的推荐，建议在基本信息中填写详细的小说描述
2. **启用足够的技法**：推荐只从已启用的技法中选择
3. **按需使用**：AI帮我挑适合快速获得建议，而不是完全依赖AI

## 后续优化

如果需要，可以：
1. 添加推荐理由的详细展示
2. 支持多轮推荐（用户可以要求"换一批"）
3. 记录用户的推荐偏好
4. 根据小说类型（genre）调整推荐
