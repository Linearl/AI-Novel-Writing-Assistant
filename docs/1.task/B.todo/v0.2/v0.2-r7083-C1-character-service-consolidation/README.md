# README — REQ-7083 Character Service Consolidation

- **编号**: REQ-7083
- **标题**: Character Service Consolidation — 角色服务统一收敛
- **优先级**: C1
- **版本**: 0.2
- **状态**: done
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

角色相关代码分散在 7 个目录（`services/character/`、`services/novel/characterPrep/`、`services/novel/characterResource/`、`services/novel/characters/`、`services/novel/characterProfile/`、`services/novel/characterExit/`、`services/characterConsistency/`），11 个文件各自实现角色数据序列化，另有 23 处内联 prompt 违反 Prompt Governance。本任务将全部角色代码收敛到 `services/character/` 领域服务，建立统一 CharacterDomainService 入口和 CharacterMapper 序列化层。

## 目标架构

```
services/character/
├── CharacterDomainService.ts          ← 统一入口
├── CharacterMapper.ts                 ← 统一序列化/DTO
├── preparation/                       ← 原 characterPrep/ (6文件)
├── resource/                          ← 原 characterResource/ (4文件)
├── consistency/                       ← 原 characterConsistency/
├── profile/                           ← 原 characterProfile/
├── arc/                               ← 原 novel/characters/
└── exit/                              ← 原 characterExit/
```

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7083-character-service-consolidation.md | ✅ |
| REQ-7083-character-service-consolidation-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
