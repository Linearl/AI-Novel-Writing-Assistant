---
description: "文笔体系自动闭环任务清单"
---

# 任务清单

## 阶段一：补丁A — 编辑后自动提取

- [ ] 1.1 确认 updateChapter 的事件触发机制（直接调用 vs 事件总线）
- [ ] 1.2 在 updateChapter 末尾或 chapter:updated handler 中接入 ChapterEditDiffService
- [ ] 1.3 异步执行，不阻塞保存响应
- [ ] 1.4 错误处理：提取失败不影响章节保存

## 阶段二：补丁B — 拆书自动转化

- [ ] 2.1 找到 BookAnalysis pipeline 完成的触发点
- [ ] 2.2 接入 StyleProfileService.createFromBookAnalysis
- [ ] 2.3 自动绑定到对应小说的 StyleBinding

## 阶段三：验证

- [ ] 3.1 端到端测试：编辑章节 → 自动提取 → 下次生成注入
- [ ] 3.2 端到端测试：拆书完成 → 自动生成 StyleProfile → 可用
- [ ] 3.3 回归测试：手动按钮功能仍正常
- [ ] 3.4 pnpm typecheck + pnpm test 通过
