# 逐步骤 Token 用量合同

仅在工作区模式下记录模型生成调用。预览模式无法持久化时，只在当前回复中报告运行时实际暴露的用量，不为缺失数据编造数字。

## 1. 权威文件

- `production/token-usage.jsonl`：追加式权威账本，每次模型调用一行；失败和重试分别记录。
- `production/token-summary.json`：由账本重建的汇总视图，可删除后重新生成。
- Token 账本是成本与运行诊断数据，不是创作事实。除非用户要求分析成本，否则不得装入章节上下文包或创作提示。

## 2. 测量等级

| `measurement` | 含义 | 规则 |
| --- | --- | --- |
| `exact` | 模型提供方或宿主运行时返回的 usage | 保留 provider、model 和可用的 request ID |
| `estimated` | 使用与目标模型兼容的 tokenizer 计算 | 必须与精确值分开汇总，不得作为账单金额 |
| `unavailable` | 运行时未暴露用量，且没有兼容 tokenizer | Token 字段全部留空，并记录稳定原因码 |

不得用字符数、汉字数或固定比例冒充 Token 估算。`cached_input_tokens` 是 `input_tokens` 的子集，`reasoning_tokens` 是 `output_tokens` 的明细；汇总时不能重复相加。不同提供方或模型的 Token 口径可能不同，跨模型总数只用于工作量观察，不等于统一成本。

## 3. 记录边界

对每次实际模型生成调用记录一个事件，而不是只给最终产物记总数。推荐的稳定步骤名包括：

- 小说生产：`novel_brief`、`story_bible`、`world_and_cast`、`volume_strategy`、`volume_skeleton`、`beat_sheet`、`chapter_plan`、`context_package`、`chapter_draft`、`humanization_revision`、`chapter_review`、`chapter_repair`、`continuity_update`。
- 参考作品分析：`analysis_segment_notes`、`analysis_overview`、`analysis_section`、`pattern_cards`。
- 趋势分析：`trend_report`、`opportunity_cards`。

纯文件读取、索引构建、校验、导出等确定性操作不记录 Token。一次步骤发生重试时，通过相同 `run_id` 关联，但每次调用保留独立事件和状态。

## 4. 最小字段

每条记录必须包含 `route`、`step`、`status`、`measurement` 和自动生成的事件时间与 ID。按运行时能力补充：

- `provider`、`model`、`request_id`、`run_id`；
- 工作区相对 `artifact` 路径；
- `input_tokens`、`cached_input_tokens`、`output_tokens`、`reasoning_tokens`、`total_tokens`；
- `unavailable` 时使用 `reason`，例如 `runtime_usage_not_exposed`。

不要把提示词正文、小说上下文、密钥或用户隐私写入用量账本。

## 5. 操作流程

### 5.1 记录调用

```bash
python scripts/token_usage.py record <workspace> \
  --route novel --step chapter_draft --measurement exact \
  --provider <provider> --model <model> \
  --input-tokens <n> --output-tokens <n> \
  --artifact chapters/chapter-001/draft.md
```

### 5.2 记录不可用

```bash
python scripts/token_usage.py record <workspace> \
  --route novel --step chapter_draft --measurement unavailable \
  --reason runtime_usage_not_exposed \
  --artifact chapters/chapter-001/draft.md
```

### 5.3 验证并刷新汇总

```bash
python scripts/token_usage.py validate <workspace>
python scripts/token_usage.py summarize <workspace> --write
```

## 6. 报告格式

向用户报告时分别列出精确 Token、估算 Token 和不可统计调用数。不要把精确值与估算值合并成一个无标记总数，也不要根据 Token 数自动判定创作质量。

```markdown
# Token 用量报告

## 总计
- 精确 Token：1,200,000
- 估算 Token：50,000
- 不可用调用：3 次

## 按步骤分布
| 步骤 | 精确 Token | 估算 Token | 调用次数 |
|------|-----------|-----------|----------|
| chapter_draft | 800,000 | 30,000 | 15 |
| chapter_review | 200,000 | 10,000 | 15 |
| chapter_repair | 100,000 | 5,000 | 8 |
| continuity_update | 50,000 | 2,000 | 15 |
| 其他 | 50,000 | 3,000 | 10 |

## 按模型分布
| 模型 | 精确 Token | 调用次数 |
|------|-----------|----------|
| DeepSeek-V3 | 960,000 | 45 |
| Claude-3.5 | 240,000 | 18 |
```
