# REQ-2054 多素材导入与按需加载系统

> 状态：🚧 待开发 | 更新时间：2026-07-15

## 概述

改造素材导入系统，支持用户导入多份文档（文件/文件夹）作为小说参考材料。每份材料独立存储并附带 AI 生成描述。后续写作步骤中注入材料索引，AI 自主按需加载全文。

## 结构

| 文件 | 说明 |
|------|------|
| `REQ-2054-material-import-system.md` | 需求工作副本 |
| `REQ-2054-material-import-system-original.md` | 需求冻结副本 |
| `design.md` | 实施层方案设计 |
| `tasks.md` | 任务拆解（7 阶段，约 20h） |
| `decision_log.md` | 6 项关键决策记录 |
| `run_result.json` | 执行快照 |

## 设计文档

完整架构设计：[2026-07-15-multi-material-import-design.md](../../../2.tech/architecture/2026-07-15-multi-material-import-design.md)

## 关键里程碑

- [x] 架构设计文档完稿
- [x] 任务包六件套创建
- [ ] 数据库层：NovelMaterial 表
- [ ] 后端 API：材料 CRUD + parse-material 改造
- [ ] Prompt 注入：material_index + B2 两轮加载
- [ ] 前端：导入 UI + 材料管理
- [ ] 验证：typecheck + 测试全量通过
