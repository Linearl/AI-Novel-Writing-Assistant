---
description: "REQ-7010 任务拆解"
---

# REQ-7010 任务拆解

> 版本：v0.1 | 复杂度：complex | 子任务：7 个

---

## 总表

| 序号 | ID | 任务 | 优先级 | 预估 | 状态 |
|---|---|---|---|---|---|
| T1 | STB-008 | 添加进程保护 | P1 | 0.5h | 📋 |
| T2 | SEC-001 | 实现 API Token 认证 | P1 | 2h | 📋 |
| T3 | SEC-002 | 添加速率限制 | P1 | 1h | 📋 |
| T4 | OBS-001 | Logger 迁移 | P1 | 3h | 📋 |
| T5 | ARCH-001 | 循环引用解耦 | P1 | 4h | 📋 |
| T6 | QUA-001 | 超大文件拆分 | P1 | 8h | 📋 |
| T7 | QUA-002 | 超长函数拆分 | P1 | 4h | 📋 |

---

## 逐项展开

### T1: STB-008 添加进程保护

**目标**: 防止未捕获异常导致静默崩溃

**子任务**:
- [ ] T1.1 在 app.ts 添加 unhandledRejection 处理
- [ ] T1.2 添加 uncaughtException 处理
- [ ] T1.3 添加 SIGTERM/SIGINT 优雅关闭

**验收**: 进程异常时记录日志并优雅退出

---

### T2: SEC-001 实现 API Token 认证

**目标**: 为所有 API 端点添加认证保护

**子任务**:
- [ ] T2.1 创建 TokenService（生成/验证 token）
- [ ] T2.2 重写 authMiddleware
- [ ] T2.3 前端请求拦截器附加 token
- [ ] T2.4 更新 .env.example

**验收**: 无 token 请求返回 401

---

### T3: SEC-002 添加速率限制

**目标**: 防止 API 滥用

**子任务**:
- [ ] T3.1 安装 express-rate-limit
- [ ] T3.2 创建全局限流中间件（100 req/min）
- [ ] T3.3 创建 LLM 端点限流（20 req/min）
- [ ] T3.4 挂载到 app.ts

**验收**: 超限请求返回 429

---

### T4: OBS-001 Logger 迁移

**目标**: server 端全量迁移 console.* 到 LoggerService

**子任务**:
- [ ] T4.1 确认 LoggerService 接口
- [ ] T4.2 迁移 server/src/services/
- [ ] T4.3 迁移 server/src/routes/
- [ ] T4.4 迁移 server/src/middleware/
- [ ] T4.5 迁移 server/src/agents/
- [ ] T4.6 迁移 server/src/modules/
- [ ] T4.7 验证零 console.* 残留

**验收**: `grep -r "console\." server/src/` 零命中

---

### T5: ARCH-001 循环引用解耦

**目标**: 消除 novel ↔ planner 双向循环引用

**子任务**:
- [ ] T5.1 分析交叉调用点
- [ ] T5.2 创建 mediation 目录和接口
- [ ] T5.3 实现 NovelPlannerMediator
- [ ] T5.4 修改 novel 依赖方向
- [ ] T5.5 修改 planner 依赖方向
- [ ] T5.6 madge 验证无循环

**验收**: `pnpm madge --circular` 无 novel/planner 循环

---

### T6: QUA-001 超大文件拆分

**目标**: 30 个超大文件全部拆分至 <400 行

**子任务**:
- [ ] T6.1 拆分 PlannerService.ts (992行)
- [ ] T6.2 拆分 CharacterPreparationService.ts (845行)
- [ ] T6.3 拆分 directorRuntime.ts (1273行)
- [ ] T6.4 拆分 server 端其余 12 个文件
- [ ] T6.5 拆分 client 端 9 个文件
- [ ] T6.6 拆分 shared 端 5 个文件
- [ ] T6.7 验证所有文件 <400 行

**验收**: `wc -l` 所有 .ts/.tsx 文件 < 400 行

---

### T7: QUA-002 超长函数拆分

**目标**: 优先拆分 Top-10 超长函数

**子任务**:
- [ ] T7.1 拆分 runFromReady() (~610行)
- [ ] T7.2 拆分 NovelAutoDirectorDialog (~654行)
- [ ] T7.3 拆分其余 Top-8 超长函数
- [ ] T7.4 验证关键函数 <50 行

**验收**: 关键函数 < 50 行

---

## 依赖关系

```
T1 (进程保护) ──→ T2 (认证) ──→ T3 (限流)
                    ↓
                  T4 (Logger) ──→ T5 (循环引用) ──→ T6 (文件拆分) ──→ T7 (函数拆分)
```

---

## DoD (Definition of Done)

- 所有子任务完成
- typecheck 通过
- test 通过
- build 通过
- 决策日志更新
