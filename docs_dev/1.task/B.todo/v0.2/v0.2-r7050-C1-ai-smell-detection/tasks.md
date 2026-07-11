---
description: "REQ-7050: AI味自动检测 — 任务清单"
update_time: "2026-07-11"
status: todo
---

# REQ-7050: AI味自动检测

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：开发

- [ ] T1: 创建 smell 目录结构和核心框架
- [ ] T2: 实现 VocabularyDetector（词汇检测器）
- [ ] T3: 实现 SentenceDetector（句式检测器）
- [ ] T4: 实现 EmotionDetector（情感检测器）
- [ ] T5: 实现 AiSmellScorer（综合评分聚合）
- [ ] T6: 实现 AiSmellDetector 主类
- [ ] T7: 集成到质量检查器（REQ-7048）
- [ ] T8: 实现 HTTP API
- [ ] T9: 创建数据库迁移（AiSmellDictionary 表）

## 阶段二：测试

- [ ] T10: 单元测试（词汇检测器）
- [ ] T11: 单元测试（句式检测器）
- [ ] T12: 单元测试（情感检测器）
- [ ] T13: 单元测试（综合评分）
- [ ] T14: 集成测试（完整AI味检测流程）

## 阶段三：验证

- [ ] T15: typecheck通过
- [ ] T16: 单元测试通过
- [ ] T17: 集成测试通过
- [ ] T18: 手动验证（对自然文本和AI生成文本分别检测，验证评分合理性）

## 阶段四：收尾

- [ ] T19: 更新requirements.md
- [ ] T20: 更新任务包README状态
- [ ] T21: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] typecheck通过
- [ ] 测试覆盖率>80%
- [ ] 验收标准达成
