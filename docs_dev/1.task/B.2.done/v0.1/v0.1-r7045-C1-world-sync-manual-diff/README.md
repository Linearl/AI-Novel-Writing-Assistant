# 世界同步功能修复任务包

## 问题描述

世界工作台修改世界库后，小说世界的同步功能存在以下问题：

1. **自动对比失效**：刷新页面后，同步管理部分显示"无差异"
2. **手动对比有效**：点击"手动对比"按钮可以发现差异
3. **对比结果不一致**：手动对比发现差异后，自动对比仍然显示"无差异"

## 根本原因

经过调试发现：

1. **数据库状态正确**：
   - World表：`structureJson`包含"拾光花坊"，`version=2`
   - NovelWorld表：`structuredDataJson`包含"玫瑰时光花坊"，`syncBaseVersion=0`
   - 两者确实存在差异

2. **手动对比API正常**：`GET /novels/:id/novel-world/manual-diff`可以正确检测到差异

3. **自动对比API异常**：`GET /novels/:id/novel-world/sync-diff`返回的`differenceCount=0`

4. **已修改代码**：
   - 新增`novelWorldStructureCompare.ts`共享对比函数
   - 修改`NovelWorldSyncService.getSyncDiff()`使用新的对比逻辑
   - 但自动对比仍然无法检测到差异

5. **最终发现**：`syncDiffQuery`的enabled条件可能不满足，导致syncDiff API没有被调用

## 修复方案

### 方案1：验证对比函数（已实现）

已创建`compareStructures`函数，直接对比原始JSON：
```typescript
const worldStructureJson = safeJsonParse<Record<string, unknown> | null>(sourceWorld.structureJson, null);
const novelStructureJson = safeJsonParse<Record<string, unknown> | null>(novelWorld.structuredDataJson, null);
const compareResult = compareStructures(worldStructureJson, novelStructureJson);
```

### 方案2：修复syncDiffQuery的enabled条件（已实现）

在`useNovelWorldSlice.ts`中，修改`syncDiffQuery`的enabled条件：
```typescript
const syncDiffQuery = useQuery({
  queryKey: queryKeys.novels.novelWorldSyncDiff(novelId),
  queryFn: () => getNovelWorldSyncDiff(novelId),
  enabled: Boolean(
    novelId
    && enabled
    && novelWorldQuery.isSuccess  // 新增：确保novelWorldQuery加载完成
    && novelWorldQuery.data?.data?.novelWorld?.sourceWorldId,
  ),
  staleTime: 60_000,
});
```

### 方案3：调试日志（已添加）

在`getSyncDiff`方法中添加了调试日志：
```typescript
console.log("[getSyncDiff] NovelWorld ID:", novelWorld.id);
console.log("[getSyncDiff] sourceWorldId:", novelWorld.sourceWorldId);
console.log("[getSyncDiff] worldStructureJson length:", worldStructureJson ? JSON.stringify(worldStructureJson).length : 0);
console.log("[getSyncDiff] novelStructureJson length:", novelStructureJson ? JSON.stringify(novelStructureJson).length : 0);
console.log("[getSyncDiff] compareResult:", compareResult);
```

## 变更文件

### 后端新增
- `server/src/services/novel/worldContext/novelWorldStructureCompare.ts` - 共享对比函数

### 后端修改
- `server/src/services/novel/worldContext/NovelWorldSyncService.ts` - 修改`getSyncDiff`方法
- `server/src/modules/novel/setup/http/novelWorldManualDiffRoutes.ts` - 复用共享对比函数
- `server/src/modules/novel/http/novelRouteRegistration.ts` - 注册新路由

### 前端新增
- `client/src/api/novelWorldSlice.ts` - 新增`ManualDiffResult`类型和`getManualDiff` API
- `client/src/pages/novels/hooks/useNovelWorldSlice.ts` - 新增手动对比状态和函数，修复syncDiffQuery的enabled条件

### 前端修改
- `client/src/pages/novels/components/NovelWorldManagerCard.tsx` - 新增手动对比按钮和结果显示
- `client/src/pages/novels/components/BasicInfoTab.tsx` - 传递新props
- `client/src/pages/novels/components/NovelEditView.types.ts` - 更新类型定义
- `client/src/pages/novels/novelEditPlanningTabs.ts` - 传递新props
- `client/src/pages/novels/NovelEdit.tsx` - 传递新props

## 验证步骤

1. 访问小说设置页面：`http://localhost:5174/novels/cmriqrflt0001yc46q30ix26n/settings`
2. 查看同步管理部分是否自动显示差异（应该显示"2处差异"或更多）
3. 点击"手动对比"按钮验证差异检测
4. 如果自动对比仍失效，检查后端日志中的调试输出
5. 点击"拉取世界库更新"按钮完成同步

## 状态

- [x] 实现手动对比功能
- [x] 添加手动对比按钮和结果显示
- [x] 创建共享对比函数
- [x] 修改自动对比使用共享函数
- [x] 修复syncDiffQuery的enabled条件
- [x] 添加调试日志
- [ ] 验证自动对比是否正常工作
- [ ] 清理临时脚本和测试文件
- [ ] 提交代码

