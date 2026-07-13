# Design - 世界同步手动对比功能

## 架构设计

### 问题分析

1. **自动对比失效**：syncDiffQuery的enabled条件可能不满足，导致syncDiff API没有被调用
2. **手动对比和自动对比显示重复**：两个独立的差异显示面板导致用户体验混乱
3. **同步操作后数据不一致**：syncNovelWorldWithLibrary方法名不匹配，导致同步操作返回undefined

### 解决方案

#### 1. 共享对比函数

创建`novelWorldStructureCompare.ts`，提供：
- `compareStructures()`：递归对比两个JSON对象的所有字段
- `convertToSyncDifferences()`：将对比结果转换为sync diff格式

#### 2. 手动对比API

新增`GET /novels/:id/novel-world/manual-diff`端点：
- 使用共享的`compareStructures`函数
- 返回`ManualDiffResult`格式

#### 3. 修复自动对比

修改`NovelWorldSyncService.getSyncDiff`：
- 使用共享的`compareStructures`函数
- 忽略`metadata.lastGeneratedAt`字段

#### 4. 修复同步功能

- 在`NovelWorldInstanceService`中添加`syncWithLibrary`和`syncNovelWorldWithLibrary`方法
- 修改`NovelApplicationServices`的调用链，优先使用`novelWorldInstanceService.syncWithLibrary`

#### 5. 合并UI面板

- 移除手动对比的独立面板
- 统一使用自动对比面板显示差异
- 移除多余的"立即拉取世界库更新"按钮

## 技术实现

### 后端

1. **novelWorldStructureCompare.ts**
   - `compareStructures()`：递归对比，忽略metadata.lastGeneratedAt
   - `convertToSyncDifferences()`：转换为sync diff格式

2. **NovelWorldSyncService.ts**
   - `getSyncDiff()`：使用共享对比函数
   - `syncWithLibrary()`：同步操作

3. **NovelWorldInstanceService.ts**
   - 添加`getNovelWorldSyncDiff()`、`syncWithLibrary()`、`syncNovelWorldWithLibrary()`方法

4. **NovelApplicationServices.ts**
   - 修改`syncNovelWorldWithLibrary`调用链

### 前端

1. **useNovelWorldSlice.ts**
   - 添加手动对比状态和函数
   - 修复syncDiffQuery的enabled条件

2. **NovelWorldManagerCard.tsx**
   - 添加手动对比按钮
   - 合并差异显示面板
   - 移除多余的"立即拉取世界库更新"按钮

## 验证结果

- ✅ 手动对比API返回正确
- ✅ 自动对比API返回正确
- ✅ 同步操作成功更新数据库
- ✅ 同步后两个API都显示一致（differenceCount=0）
