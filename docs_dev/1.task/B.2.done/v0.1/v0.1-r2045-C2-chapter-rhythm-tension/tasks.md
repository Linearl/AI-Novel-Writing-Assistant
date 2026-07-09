---
description: "章节节奏张力任务清单"
---

# 任务清单

## 阶段一：数据模型

- [x] 1.1 Chapter 模型新增 tensionLevel 字段
- [x] 1.2 shared/types 新增 TensionLevel 枚举
- [x] 1.3 prisma schema 更新 + migration

## 阶段二：AI 自动标记

- [x] 2.1 beatSheet 生成 prompt 中新增张力等级输出
- [x] 2.2 解析 beatSheet 输出并写入章节 tensionLevel
- [x] 2.3 现有 beatSheet 数据的兼容处理

## 阶段三：前端展示

- [x] 3.1 章节列表中显示张力等级标识
- [x] 3.2 张力等级手动调整 UI

## 阶段四：质量系统联动

- [ ] 4.1 审校系统读取 tensionLevel（阈值调整已实现，审校 prompt 未感知）
- [x] 4.2 根据张力等级调整审校参数

## 阶段五：验证

- [ ] 5.1 端到端测试：生成 beatSheet → 自动标记 → 质量系统生效
- [ ] 5.2 pnpm typecheck + pnpm test 通过
