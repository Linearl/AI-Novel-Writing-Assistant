---
description: "REQ-7028 Director 事件系统收敛 — 决策留痕"
---

# REQ-7028 决策留痕

## 决策记录

### D-01：保留两套事件系统而非合并

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 保留 EventBus 和 DirectorEventProjection 两套系统，通过 Bridge 桥接 |
| 决策理由 | EventBus 面向跨模块广播（如 "novel.created"），DirectorEventProjection 面向内部状态持久化（如 "director.step.completed"）。两者服务不同层面，合并会导致广播事件和持久化事件耦合，违反单一职责 |
| 备选方案 | 合并为单一大事件总线 — 会导致 Director 内部实现细节泄露到全局事件空间 |

### D-02：保留 director/state/ 子目录版本

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | 保留 `director/state/` 子目录下的 State 文件，移除根目录旧版本 |
| 决策理由 | 子目录版本是后续迭代版本，组织结构更合理（state 文件集中在 state/ 目录）。根目录版本是初始实现，可能缺少后续的 bug 修复 |
| 备选方案 | 保留根目录版本 — 与项目"按功能分子目录"的架构约束冲突 |

### D-03：Takeover 按读/写/校验三级收敛

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | takeover 文件按功能聚类为 read / write / validate + index 入口 |
| 决策理由 | 当前 9 个文件按时间顺序增长而非功能聚类，read/write/validate 是 takeover 的自然边界，聚类后每个文件职责清晰 |
| 备选方案 | 合并为单一大文件 — 违反项目 600 行约束（9 个文件合并后远超 600 行） |

### D-04：EventBridge 作为独立桥接层而非 DirectorEventProjection 的一部分

| 项目 | 内容 |
| ---- | ---- |
| 决策日期 | 2026-07-10 |
| 决策者 | AI 建议 |
| 决策内容 | EventBridge 作为独立文件，不嵌入 DirectorEventProjectionService |
| 决策理由 | 桥接逻辑涉及 EventBus 和 DirectorEventProjection 两个系统的类型，独立文件保持各自系统不产生循环依赖 |
| 备选方案 | 在 DirectorEventProjectionService 内直接调用 EventBus — 会产生隐式耦合 |
