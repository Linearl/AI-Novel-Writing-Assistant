---
description: "REQ-2030 节奏曲线可视化与调整（原始冻结副本）"
---

# REQ-2030 节奏曲线可视化与调整 (Pace Curve Visualization)

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2030 |
| 优先级 | P2 |
| 来源 | REQ-2029 narrative_advisor 后续迭代；上游 issue 节奏曲线需求 |
| 关联需求 | REQ-2029（narrative_advisor 模式） |

---

## 1. 背景与问题

现有 Prisma schema 中，`VolumeChapterPlan` 和 `Chapter` 都存储了 `conflictLevel`（0-100）和 `revealLevel`（0-100），`Chapter` 还有 `pacingScore`。但系统中没有任何地方以图表形式展示这些数据：

- 用户无法直观看到全书的节奏起伏曲线
- 无法判断冲突是否在正确的位置达到高潮
- 无法对比已写章节的实际节奏与规划节奏
- 未开始撰写的章节，节奏参数只能通过 JSON 编辑，无可视化调整入口

---

## 2. 目标与范围

### 2.1 目标

1. 提供可交互的节奏曲线图表，展示全书各章节的 conflictLevel 和 revealLevel 走势
2. 按卷分组着色，清晰展示卷间节奏变化
3. 支持对未开始撰写的章节直接调整 conflictLevel / revealLevel
4. 已完成章节的节奏数据只读展示，不可编辑

### 2.2 In Scope

**后端**：新增 `GET /api/novels/:novelId/pace-curve` 聚合端点
**前端**：`PaceCurveChart` 折线图组件 + 未写章节节奏参数编辑滑块
**基础设施**：可能引入 recharts

### 2.3 Out of Scope

- pacingScore 独立曲线、AI 自动建议节奏、节奏导出/分享、beat sheet 生成流程变更

---

## 3. 需求详情

### 3.1 节奏数据 API

`GET /api/novels/:novelId/pace-curve` 返回各卷各章节的 conflictLevel / revealLevel / pacingScore，区分 `isWritten` 状态。

### 3.2 节奏曲线图表

双折线图：conflictLevel（红色）+ revealLevel（蓝色），X 轴按卷分组，已写实心点 / 未写空心点，hover 显示 tooltip。

### 3.3 节奏参数调整

点击未写章节空心点弹出滑块，调整后保存到 `VolumeChapterPlan`。已写章节只读。

### 3.4 响应式

最小宽度 600px，窄屏只显示 conflictLevel。

---

## 4. 验收标准

- [ ] 全书节奏曲线可正确渲染
- [ ] 卷间分隔清晰
- [ ] 未写章节可点击编辑
- [ ] 调整后数据持久化
- [ ] 已写章节不可编辑
- [ ] 类型检查 + 前端测试通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| recharts 依赖冲突 | 备选 visx 或纯 SVG |
| 大量章节性能 | 分卷加载或虚拟滚动 |

---

## 6. 关联与边界

与 REQ-2029 互补：narrative_advisor 提供叙事对话分析，本需求提供数值可视化。

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 创建 | 初始版本 |
