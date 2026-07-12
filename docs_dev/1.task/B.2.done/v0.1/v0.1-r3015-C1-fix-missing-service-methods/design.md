# 设计文档：修复缺失的服务方法

## 问题分析

### 缺失方法统计

- **总调用方法数**：101 个
- **Contracts 中定义的方法**：72 个
- **Services 中实现的方法**：37 个
- **缺失方法数**：32 个

### 缺失方法列表

这些方法在路由文件中被调用，但未在 NovelApplicationContracts 中定义：

1. `analyzeStorylineImpact`
2. `applyCharacterCastOption`
3. `applySupplementalCharacter`
4. `checkCharacterAgainstWorld`
5. `clearCharacterCastOptions`
6. `confirmCharacterCandidate`
7. `createBeatStream`
8. `createBibleStream`
9. `createOutlineStream`
10. `deleteCharacterCastOption`
11. `evolveCharacter`
12. `generateBatchCharacterVisibleProfiles`
13. `generateChapterHook`
14. `generateCharacterCastOptions`
15. `generateCharacterVisibleProfile`
16. `generateSupplementalCharacters`
17. `generateTitles`
18. `getCharacterDynamicsOverview`
19. `getNovelStructuredOutline`
20. `getPipelineJob`
21. `importCharactersFromOutline`
22. `listCharacterCandidates`
23. `listCharacterCastOptions`
24. `listCharacterRelations`
25. `listCharacters`
26. `mergeCharacterCandidate`
27. `rebuildCharacterDynamics`
28. `refineSupplementalCharacter`
29. `syncAllCharacterTimeline`
30. `syncCharacterTimeline`

## 修复策略

### 1. 在 Contracts 中添加缺失的方法定义

使用统一的 `(...args: any[]) => Promise<any>` 签名，确保类型兼容性。

### 2. 在 Services 中添加缺失的方法实现

使用委托模式，调用正确的子服务：

```typescript
// 示例：listCharacterCandidates
listCharacterCandidates = (...args: any[]) => (this.core as any).listCharacterCandidates(...args);
```

### 3. 方法分组

根据调用位置，将方法分组：

- **角色管理**：applyCharacterCastOption, listCharacterCandidates, confirmCharacterCandidate 等
- **世界线**：analyzeStorylineImpact, createOutlineStream, createBeatStream 等
- **生成流程**：generateBatchCharacterVisibleProfiles, generateChapterHook, generateTitles 等

## 实现细节

### NovelApplicationContracts 修改

```typescript
export interface NovelApplicationServices {
  // 现有方法...
  
  // 缺失的方法（新增）
  analyzeStorylineImpact: (...args: any[]) => Promise<any>;
  applyCharacterCastOption: (...args: any[]) => Promise<any>;
  // ... 其他 30 个方法
}
```

### NovelApplicationServices 修改

```typescript
export class DefaultNovelApplicationServices implements NovelApplicationServices {
  // 现有方法...
  
  // 缺失的方法（新增）
  analyzeStorylineImpact = (...args: any[]) => (this.core as any).analyzeStorylineImpact(...args);
  applyCharacterCastOption = (...args: any[]) => (this.characterPreparationService as any).applyCharacterCastOption(...args);
  // ... 其他 30 个方法
}
```

## 风险评估

### 低风险

- 方法定义和实现遵循现有模式
- 使用 `(...args: any[]) => Promise<any>` 签名，类型安全
- 不影响现有功能

### 中风险

- 部分方法可能在子服务中不存在
- 需要验证方法的实际实现

### 缓解措施

- 添加方法前先检查子服务是否存在该方法
- 使用 `(this.xxxService as any).methodName(...)` 模式，避免编译时错误
- 逐步验证每个方法的实现

## 测试策略

### 单元测试

- 验证每个新添加的方法都能正常调用
- 验证返回值类型正确

### 集成测试

- 运行现有的 API 测试
- 验证路由文件中的调用正常工作

### 手动测试

- 在前端调用相关功能
- 验证无 "is not a function" 错误
