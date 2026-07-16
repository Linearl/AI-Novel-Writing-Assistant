# 项目周报流程参考（AI 驱动版）

## 目标

将周报标准化为 AI 可执行的流程：

1. 确定周报周期（current_week / last_week）
2. 从 git log + docs/ 各数据源收集本周进展
3. AI 理解并提炼关键交付物 + 用户影响 + 经验教训
4. 生成或追加 Markdown 周报到 `docs/7.weekly/`

## 固定规则

- `mode` 从配置文件 `config/report-config.json` 读取，默认 `current_week`。
- `current_week` 模式下，若本周文件已存在则追加内容，不覆盖。
- `last_week` 模式下，始终创建新文件。
- 周报正文面向用户和项目管理者，中文优先。
- Git 提交统计通过 `git log --since/--until --oneline` 直接获取。

## AI 执行步骤

1. **确定周期**：读取 config → 确定 mode → 计算 ISO 周号 → 确定 periodStart/periodEnd
2. **收集数据**：并行读取 git log、已完成任务包目录、changelog、版本计划
3. **生成模板内容**：任务包表格、KPI 指标、问题风险（从数据源自动填充）
4. **生成"用户影响"**：从 REQ 文档提炼用户可感知变化，面向产品用户，自然语言
5. **生成"经验回灌"**：从 decision_log + tasks 提取教训
6. **落盘**：写入 `docs/7.weekly/YYYY-W{ISO周号}-weekly.md`
