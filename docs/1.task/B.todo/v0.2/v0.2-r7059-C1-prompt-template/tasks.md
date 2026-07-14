---
description: "REQ-7059: Prompt 模板系统 — 任务清单"
update_time: "2026-07-14"
status: requirements_ready
---

# REQ-7059: Prompt 模板系统 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：Schema + 类型（0.5d）

- [ ] T1.1: 新增 PromptTemplateOverride Prisma 模型
- [ ] T1.2: 新增 PromptTemplateVersion Prisma 模型
- [ ] T1.3: 创建 `server/src/prompting/templates/templateTypes.ts` — 类型定义 `直接参考上游 templateTypes.ts`
- [ ] T1.4: 执行 prisma migrate dev，验证迁移

**验收点**: prisma generate 成功，2 个模型可用

## 阶段二：编译器（1d）`核心模块，大量参考上游 templateCompiler.ts`

- [ ] T2.1: 创建 `server/src/prompting/templates/templateCompiler.ts` — 基础框架 `参考上游 templateCompiler.ts`
- [ ] T2.2: 实现 TOKEN_PATTERN 正则解析（`{{ context.xxx }}` 语法） `参考上游 TOKEN_PATTERN`
- [ ] T2.3: 实现 Token 分类（context/input/slot） `参考上游 token 分类逻辑`
- [ ] T2.4: 实现 Token 替换为实际值（LangChain 消息构建） `参考上游消息构建逻辑`
- [ ] T2.5: 实现编译诊断生成 — referencedContextGroups, referencedInputFields, referencedSlotKeys `参考上游诊断逻辑`
- [ ] T2.6: 实现缺失检测 — missingRequiredGroups, missingReferencedContextGroups, missingInputFields `参考上游缺失检测`
- [ ] T2.7: 实现 unknownTokens 和 invalidMessages 检测 `参考上游`
- [ ] T2.8: 实现 WRITER_REQUIRED_CONTEXT_GROUPS 安全约束（10 个必需组） `参考上游 templateTypes.ts`
- [ ] T2.9: 实现 hasBlockingPromptTemplateDiagnostics / assertPromptTemplateIsSavable `参考上游`
- [ ] T2.10: 实现 extractPromptTemplateContextRefs（提取上下文引用） `参考上游`

**验收点**: 编译器可解析 Token、生成诊断、检查必需组约束

## 阶段三：官方模板（0.5d）`参考上游 officialTemplates.ts`

- [ ] T3.1: 创建 `server/src/prompting/templates/officialTemplates.ts` — 基础框架 `参考上游 officialTemplates.ts`
- [ ] T3.2: 实现 getOfficialPromptTemplate（获取官方模板 JSON） `参考上游`
- [ ] T3.3: 实现 getOfficialPromptTemplateVersion（版本号管理） `参考上游`
- [ ] T3.4: 实现 getOfficialPromptTemplateContextRefs（引用提取） `参考上游`
- [ ] T3.5: 实现 hashPromptTemplate（SHA-256 hash 校验） `参考上游`
- [ ] T3.6: 迁移现有 writer prompt 为官方模板格式

**验收点**: 官方模板正确存储、加载、hash 校验通过

## 阶段四：覆盖服务（1d）`大量参考上游 PromptTemplateOverrideService.ts`

- [ ] T4.1: 创建 `server/src/prompting/templates/PromptTemplateOverrideService.ts` — 基础框架 `参考上游 PromptTemplateOverrideService.ts`
- [ ] T4.2: 实现 getActiveTemplate（获取活跃模板：自定义或官方） `参考上游`
- [ ] T4.3: 实现 save（保存模板 → 创建新 Version） `参考上游 save 逻辑`
- [ ] T4.4: 实现 listVersions（版本历史列表） `参考上游`
- [ ] T4.5: 实现 restore（回滚到指定版本） `参考上游 restore 逻辑`
- [ ] T4.6: 实现 setMode（切换 official ↔ custom） `参考上游`
- [ ] T4.7: 实现 Prisma 查询（Override + Version CRUD） `参考上游 isMissingTableError 等`

**验收点**: 覆盖 CRUD、版本管理、回滚均正常

## 阶段五：运行时集成（0.5d）`参考上游 templateRuntime.ts`

- [ ] T5.1: 创建 `server/src/prompting/templates/templateRuntime.ts` — 运行时框架 `参考上游 templateRuntime.ts`
- [ ] T5.2: 实现运行时模板解析（检查覆盖 → 获取模板 → 编译） `参考上游`
- [ ] T5.3: 集成到现有 runStructuredPrompt 流程 `参考上游集成方式`
- [ ] T5.4: 测试端到端模板编译和执行

**验收点**: 现有 LLM 调用通过模板系统正常工作

## 阶段六：测试与验证（1d）

- [ ] T6.1: 单元测试 — templateCompiler（Token 解析、诊断生成、必需组约束）
- [ ] T6.2: 单元测试 — officialTemplates（加载、hash、版本）
- [ ] T6.3: 单元测试 — PromptTemplateOverrideService（CRUD、版本、回滚、模式切换）
- [ ] T6.4: 单元测试 — templateRuntime（覆盖选择、编译调用）
- [ ] T6.5: 集成测试 — 完整流程（创建覆盖 → 保存版本 → 编译 → 执行）
- [ ] T6.6: typecheck 全量验证
- [ ] T6.7: 更新 requirements.md 和任务包状态

**验收点**: 所有测试通过，typecheck 通过

## 依赖关系

```text
T1.x ──→ T2.x ──→ T3.x ──→ T4.x ──→ T5.x ──→ T6.x
```

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
- [ ] Token 语法解析正确
- [ ] 编译诊断 9 维度完整
- [ ] 官方模板管理正常
- [ ] 覆盖 CRUD + 版本化正常
- [ ] 回滚功能正常
- [ ] 必需组安全约束生效
- [ ] Slot official_default 模式正常
