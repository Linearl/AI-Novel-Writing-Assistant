---
description: "写法模板导出/导入设计方案"
---

# 设计文档

## JSON 格式

```json
{
  "version": "1.0",
  "exportedAt": "2026-07-08T00:00:00.000Z",
  "profile": {
    "name": "都市爽文写法",
    "category": "web_novel",
    "tags": ["urban", "power_fantasy"],
    "narrativeRules": {},
    "characterRules": {},
    "languageRules": {},
    "rhythmRules": {},
    "antiAiRules": []
  }
}
```

## 冲突处理

导入时检测同名 StyleProfile：
- 覆盖：更新现有 Profile
- 新建：创建新 Profile（名称加后缀）
- 跳过：不做任何操作
