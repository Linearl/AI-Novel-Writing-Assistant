# README — REQ-7080 Director 系统拆分

- **编号**: REQ-7080
- **标题**: Director 子系统模块化拆分
- **优先级**: C1
- **版本**: 0.2
- **状态**: done
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

`server/src/services/novel/director/` 是项目中最大的子系统，拥有 101 个文件、13 个子目录。其中 `runtime/` 子目录有 46 个文件，远超项目约束（>12 须建下级目录）。本项目通过三阶段拆分方案，将 director 从"项目中的项目"收敛为可维护的模块化结构。

## 背景

- 代码屎山诊断：director 子系统文件过多、目录层级不合理
- runtime/ 46 个文件缺乏内部组织，职责混杂
- 5 个超大文件（>650 行）需拆分
- 外部模块（agents/tools、workers）与 director 耦合过深

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7080-director-system-split.md | ✅ |
| REQ-7080-director-system-split-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
