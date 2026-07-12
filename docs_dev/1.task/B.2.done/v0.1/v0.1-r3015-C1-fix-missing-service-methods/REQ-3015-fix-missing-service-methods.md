# REQ-3015: 修复缺失的服务方法

## 需求背景

在任务中心和前端调用 API 时，出现大量 `novelService.XXX is not a function` 错误。这是因为路由文件中调用的服务方法在 NovelApplicationContracts 和 NovelApplicationServices 中未定义。

## 问题描述

**错误示例**：
```
[error] GET /api/novels/cmrc3xxyc0001c0463z8qhdgq/character-candidates novelService.listCharacterCandidates is not a function
```

**影响范围**：
- 32 个方法在路由中被调用但未在 Contracts/Services 中定义
- 影响多个功能模块：角色管理、世界线、生成流程等
- 导致前端功能无法正常工作

## 根本原因

1. 路由文件调用了未在接口中定义的方法
2. 接口定义和服务实现不同步
3. 新功能开发时遗漏了接口更新

## 修复方案

### 方案 1：快速修复（推荐）

**在 NovelApplicationContracts 中添加缺失的方法定义**
**在 NovelApplicationServices 中添加缺失的方法实现**

**优点**：
- 快速解决问题
- 不影响现有功能
- 可以逐步完善

**缺点**：
- 可能有部分方法实现不完整
- 需要后续优化

### 方案 2：完整重构

**重新梳理所有路由文件的调用关系**
**统一更新 Contracts 和 Services**

**优点**：
- 一次性解决所有问题
- 代码更加规范

**缺点**：
- 工作量大
- 风险较高
- 耗时较长

## 选择方案 1 的理由

1. **紧急性**：用户已经遇到功能无法使用的问题
2. **风险控制**：方案 1 影响范围小，易于测试
3. **快速交付**：方案 1 可以快速解决用户问题
4. **后续优化**：可以在后续版本中完善实现

## 影响范围

- **受影响模块**：NovelApplicationContracts, NovelApplicationServices
- **涉及方法**：32 个缺失的方法
- **影响功能**：角色管理、世界线、生成流程等

## 验收标准

- [ ] 所有缺失的方法都已在 Contracts 中定义
- [ ] 所有缺失的方法都已在 Services 中实现
- [ ] 类型检查通过
- [ ] 单元测试通过
- [ ] 无 "is not a function" 错误

## 相关任务

- REQ-3016: 服务器日志系统实现（已完成）
- REQ-3012: 任务中心批量操作功能（已完成）
