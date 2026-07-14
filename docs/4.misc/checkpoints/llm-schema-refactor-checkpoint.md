# LLM Schema 重构检查点

日期：2026-03-23

## 目的

本检查点将当前代码库变更标记为仓库级 LLM schema 重构的一部分，而非一系列独立的功能补丁。

本次重构的目标是将结构化 LLM 输出处理迁移到统一的基础设施上：

- 按领域定义共享 schema
- 共享结构化 invoke / 修复流程
- Provider 层感知 JSON 输出能力
- 减少散布在各服务中的临时 `JSON.parse + try/catch + 局部规范化` 代码

## 为何需要专项记录

本批次变更横跨多个领域：

- planner（规划器）
- novel core / chapter summary（小说核心 / 章节摘要）
- world / world visualization / world reference（世界观 / 世界观可视化 / 世界观引用）
- audit（审校）
- book analysis（书籍分析）
- character（角色）
- genre（题材）
- style detection（风格检测）
- title generation（标题生成）
- Creative Hub 及路由入口点

由于变更是横向且架构性的，普通功能说明不足以记录。后续变更应将此提交视为整体 LLM schema 层的迁移检查点。

## 主要结构变更

### 1. 共享结构化 invoke 路径

在 `server/src/llm/` 下新增了共享入口：

- `structuredInvoke.ts`
- `schemaHelpers.ts`

这些文件集中负责：

- 结构化输出调用
- JSON 提取
- 截断 JSON 修复
- Zod 校验
- Schema 校验失败时通过 LLM 进行一步修复重试

### 2. Provider JSON 能力层

`server/src/llm/capabilities.ts` 现在充当 Provider/模型 JSON 行为的能力网关，不再由各服务自行判断模型是否支持强制 JSON 输出。

此处定位为统一回答以下问题的单一来源：

- Provider 是否支持 `json_object`
- Provider 是否支持 schema 级 JSON 输出
- 特定模型系列是否需要额外防护

### 3. 领域 schema 拆分

Schema 文件正从业务服务中抽取到独立的 schema 模块，包括但不限于：

- `server/src/services/audit/auditSchemas.ts`
- `server/src/services/bookAnalysis/bookAnalysisSchemas.ts`
- `server/src/services/character/characterSchemas.ts`
- `server/src/services/genre/genreSchemas.ts`
- `server/src/services/novel/chapterSummarySchemas.ts`
- `server/src/services/novel/novelCoreSchemas.ts`
- `server/src/services/planner/plannerSchemas.ts`
- `server/src/services/state/stateSchemas.ts`
- `server/src/services/title/titleSchemas.ts`
- `server/src/services/world/worldSchemas.ts`
- `server/src/services/world/worldReferenceSchema.ts`
- `server/src/services/world/worldVisualizationSchema.ts`

预期方向：

- 业务服务负责 prompt、编排和持久化
- Schema 模块负责结构化输出契约

### 4. 服务迁移：去除局部解析

多个服务已从领域局部的 LLM 解析辅助工具迁移到共享 schema/invoke 路径。这在书籍分析、planner、小说核心、标题生成、世界观相关服务、风格检测及相关路由接线中均有体现。

## 当前状态

本检查点应被理解为：

- 一次进行中的架构迁移
- 非最终稳定状态
- 适合作为里程碑边界提交

当前已达成：

- 仓库现在有了可见的共享 LLM schema 层
- 多个领域已开始迁移
- Provider 能力处理不再完全分散

尚未完全完成：

- 部分旧的规范化路径仍与新 schema 路径共存
- 并非所有服务都已迁移到同一严格级别
- 部分 schema 文件有意保持宽松，待更多真实输出验证后再收紧

## 后续工作准则

在本检查点之后，新增 LLM 相关开发应遵循：

1. 优先定义或扩展 schema 模块
2. 通过共享结构化 invoke 路由生成
3. 确定性清理仅作为后处理步骤
4. 避免在业务服务中新增临时 JSON 解析分支

若后续变更需要在新领域使用结构化输出，应基于本层构建，而非重新引入局部临时解析。

## 提交意图

本检查点的存在是为了让当前代码在日后可被识别为：

- 仓库级 LLM schema 迁移的起点
- 一次有意识的架构边界划分
- 后续继续迁移的安全基准点
