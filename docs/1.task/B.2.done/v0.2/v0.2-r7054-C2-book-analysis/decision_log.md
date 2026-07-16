---
description: "REQ-7054: Book Analysis 拆书系统 — 决策日志"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7054: Book Analysis 拆书系统 — 决策日志

## D1: 模块架构方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 采用上游的模块化分层架构（HTTP → Application → Domain → Infrastructure） |
| 原因 | 上游已验证该架构可良好支撑 30+ 文件的大型模块，分层清晰、职责明确 |
| 影响 | 新增 `server/src/modules/bookAnalysis/` 和 `server/src/services/bookAnalysis/` 两个目录树 |
| 备选方案 | 方案B: 单层 Service — 对于 30+ 文件的模块过于扁平，维护困难 |

---

## D2: Prisma 模型设计策略

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 独立模块自包含 7 个新模型，不向 Novel 模型追加字段 |
| 原因 | 遵循 Prisma Schema 治理规则（CLAUDE.md 2.1 节）：新模块数据模型必须自包含 |
| 影响 | 分析结果通过 publish 功能映射到 Novel，而非直接修改 Novel 表结构 |
| 备选方案 | 方案B: 在 Novel 模型上追加 bookAnalysis JSON 字段 — 违反自包含原则 |

---

## D3: Prompt 管理方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 所有 Prompt 注册为 PromptAsset，遵循 Prompt Governance |
| 原因 | 项目约束要求产品级 prompt 必须在 `server/src/prompting/` 注册，禁止内联 |
| 影响 | 新增 3 个 Prompt 文件（bookAnalysis.prompts.ts, bookAnalysisChapter.prompts.ts, bookAnalysisCharacter.prompts.ts），包含约 12 个 PromptAsset |
| 备选方案 | 无 — Prompt Governance 为强制约束 |

---

## D4: 文档格式支持范围

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 初版支持 TXT/DOCX/PDF 三种格式 |
| 原因 | 覆盖网文作者最常用的文档格式；TXT 是网文原始格式，DOCX/PDF 是出版物常见格式 |
| 影响 | 需要引入文档解析库（如 mammoth 用于 DOCX，pdf-parse 用于 PDF） |
| 备选方案 | 方案B: 仅支持 TXT — 覆盖面不足；方案C: 支持 EPUB — 优先级较低 |

---

## D5: 角色外貌追踪策略

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 采用术语标准化（AppearanceTermService）+ 时间线追踪的双层方案 |
| 原因 | 上游已验证该方案可有效管理角色外貌的一致性，术语标准化支持跨段落对比 |
| 影响 | 新增 AppearanceTerm 表用于存储标准化术语映射 |
| 备选方案 | 方案B: 纯文本存储 — 不支持结构化对比和检索 |

---

## D6: 肖像生成集成方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 肖像生成作为可选功能，依赖外部图像生成 API |
| 原因 | 图像生成 API 稳定性不可控，降级为纯文本描述不影响核心分析功能 |
| 影响 | 需要配置图像生成 API 密钥；无 API 时降级为文本描述 |
| 备选方案 | 方案B: 内置图像生成 — 增加部署复杂度和资源消耗 |

---

## D7: 前端架构方式

| 字段 | 内容 |
| ---- | ---- |
| 日期 | 2026-07-14 |
| 决策人 | AI |
| 决策 | 直接参考上游的组件和 Hook 结构，保持一致的前端架构 |
| 原因 | 上游的 DualPaneLayout + Sidebar + Detail 面板模式已验证可用，Hooks 分层清晰 |
| 影响 | 新增 ~28 个前端文件（15 组件 + 9 Hook + 类型/工具/页面） |
| 备选方案 | 方案B: 自行设计布局 — 风险高，周期长 |

---

## 总结

| 决策 | 选择 | 核心理由 |
| ---- | ---- | -------- |
| 架构方式 | 模块化分层 | 上游验证，适合大型模块 |
| Prisma 策略 | 自包含 7 模型 | 遵循 Schema 治理规则 |
| Prompt 管理 | PromptAsset 注册 | 项目强制约束 |
| 文档格式 | TXT/DOCX/PDF | 覆盖常见格式 |
| 外貌追踪 | 术语标准化 + 时间线 | 上游验证，支持结构化对比 |
| 肖像生成 | 可选 + 外部 API | 降级不影响核心功能 |
| 前端架构 | 参考上游 | 验证可用，降低风险 |
