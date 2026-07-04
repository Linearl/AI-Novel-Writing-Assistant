---
description: "REQ-2038 设定一致性前置校验任务拆解"
---

# REQ-2038 任务拆解

> 版本：v0.1 | 复杂度：M2 (medium) | 子任务：3 阶段 9 项

---

## 总表

| 阶段 | 序号 | ID | 任务 | 优先级 | 预估 | 状态 |
|------|---|---|---|---|---|---|
| 一 | T1 | BE-001 | 新增设定校验 Prompt | P2 | 2h | done |
| 一 | T2 | BE-002 | 校验服务实现 | P2 | 4h | done |
| 一 | T3 | BE-003 | 校验 API 端点 | P2 | 2h | done |
| 二 | T4 | BE-004 | Auto-Director World Building 集成 | P2 | 3h | |
| 二 | T5 | BE-005 | 校验报告存储与忽略机制 | P2 | 2h | |
| 三 | T6 | FE-001 | 设定页面校验结果展示 | P2 | 3h | |
| 三 | T7 | FE-002 | 一键修复功能 | P2 | 3h | |
| 三 | T8 | FE-003 | 忽略功能 | P2 | 1h | |
| 三 | T9 | VER-001 | 全量验证 | P2 | 2h | |

---

## 阶段一：Server 核心校验能力

### T1: BE-001 新增设定校验 Prompt

**目标**: 在 `prompting/` 注册设定一致性校验 prompt

**子任务**:
- [x] T1.1 创建 `server/src/prompting/assets/setting-consistency-check.ts`（PromptAsset 定义）
- [x] T1.2 设计 prompt 模板：输入设定 JSON → 输出结构化校验报告
- [x] T1.3 在 `prompting/registry.ts` 中注册该 prompt asset
- [x] T1.4 添加 shared 类型定义（`SettingConsistencyReport`、`Contradiction`）到 `shared/types/`

**验收**: prompt 可通过 registry 获取，shared 类型编译通过

---

### T2: BE-002 校验服务实现

**目标**: 实现设定一致性校验业务逻辑

**子任务**:
- [x] T2.1 创建 `server/src/services/setting/settingConsistencyService.ts`
- [x] T2.2 实现 `checkConsistency(projectId, settings)` 方法：组装 prompt、调用 LLM、解析结构化输出
- [x] T2.3 实现 `getReport(projectId)` 方法：读取最新校验报告
- [x] T2.4 实现 `ignoreContradiction(projectId, contradictionId)` 方法
- [x] T2.5 实现 `fixContradiction(projectId, contradictionId)` 方法：调用 LLM 修复 + 重新校验
- [x] T2.6 添加错误处理（LLM 调用失败、JSON 解析失败的 fallback）

> 注: fixContradiction 推迟到 Phase 2 (T7) 实现；存储层独立为 settingConsistencyStorage.ts

**验收**: 校验服务可接受设定数据返回结构化报告

---

### T3: BE-003 校验 API 端点

**目标**: 暴露校验相关 REST API

**子任务**:
- [x] T3.1 创建路由文件（模块 http 入口内或独立路由）
- [x] T3.2 实现 `POST /api/projects/:projectId/settings/consistency-check`
- [x] T3.3 实现 `GET /api/projects/:projectId/settings/consistency-report`
- [x] T3.4 实现 `POST /api/projects/:projectId/settings/consistency-report/ignore`
- [x] T3.5 实现 `POST /api/projects/:projectId/settings/consistency-report/fix`
- [x] T3.6 参数校验（Zod schema）

> 注: fix 端点推迟到 Phase 2 (T7) 实现；路由使用 novelId 匹配代码库约定

**验收**: 所有 API 端点可访问且参数校验生效

---

## 阶段二：Auto-Director 集成

### T4: BE-004 Auto-Director World Building 集成

**目标**: world building 阶段完成后自动触发校验

**子任务**:
- [ ] T4.1 定位 auto-director world building 完成回调
- [ ] T4.2 在 world building 完成后调用 `settingConsistencyService.checkConsistency()`
- [ ] T4.3 确保校验不阻断主流程（异步执行 + 错误隔离）
- [ ] T4.4 校验结果写入项目设定数据

**验收**: auto-director 执行完 world building 后自动触发校验，主流程不受影响

---

### T5: BE-005 校验报告存储与忽略机制

**目标**: 校验报告持久化，忽略记录保存

**子任务**:
- [ ] T5.1 定义报告存储路径（`server/data/projects/{projectId}/consistency-reports/`）
- [ ] T5.2 实现报告写入/读取逻辑
- [ ] T5.3 忽略记录持久化（与报告同文件或独立 ignore-list 文件）
- [ ] T5.4 新校验时自动过滤已忽略项

**验收**: 报告正确存储，忽略项在新校验中不显示

---

## 阶段三：Client 展示与交互

### T6: FE-001 设定页面校验结果展示

**目标**: 在设定页面展示校验报告

**子任务**:
- [ ] T6.1 创建 `SettingConsistencyPanel.tsx` 组件
- [ ] T6.2 展示总体评分（pass / warning / fail）+ 校验时间
- [ ] T6.3 展示矛盾列表（字段、描述、严重级别、修复建议）
- [ ] T6.4 添加"校验一致性"触发按钮
- [ ] T6.5 加载状态和空状态处理

**验收**: 设定页面可查看校验结果

---

### T7: FE-002 一键修复功能

**目标**: 用户可对单条矛盾执行一键修复

**子任务**:
- [ ] T7.1 在矛盾项上添加"一键修复"按钮
- [ ] T7.2 调用修复 API，展示修复进度
- [ ] T7.3 修复完成后刷新校验结果
- [ ] T7.4 修复失败时展示错误信息

**验收**: 一键修复正常工作

---

### T8: FE-003 忽略功能

**目标**: 用户可忽略不需处理的矛盾

**子任务**:
- [ ] T8.1 在矛盾项上添加"忽略"按钮
- [ ] T8.2 调用忽略 API
- [ ] T8.3 忽略后该项从列表消失
- [ ] T8.4 添加"查看已忽略"入口（可选）

**验收**: 忽略功能正常，已忽略项不显示

---

### T9: VER-001 全量验证

**目标**: 端到端验证所有功能

**子任务**:
- [ ] T9.1 `pnpm typecheck` 通过
- [ ] T9.2 `pnpm test:all` 通过
- [ ] T9.3 手动验证：设定页面触发校验 → 查看结果 → 一键修复 → 忽略
- [ ] T9.4 手动验证：auto-director world building 后自动校验

**验收**: 全量类型检查 + 测试通过 + E2E 手动验证通过

---

## 依赖关系

```
阶段一：T1 (Prompt) ──→ T2 (校验服务) ──→ T3 (API 端点)
                                                │
阶段二：T4 (Auto-Director 集成) ──→ T5 (存储与忽略)
                                                │
阶段三：T6 (展示) ──→ T7 (一键修复) ──→ T8 (忽略) ──→ T9 (全量验证)
```

---

## DoD (Definition of Done)

- [ ] 所有子任务完成
- [ ] typecheck 通过
- [ ] test 通过
- [ ] build 通过
- [ ] 决策日志更新
- [ ] README 状态标记为 done
- [ ] run_result.json status 更新为 done
