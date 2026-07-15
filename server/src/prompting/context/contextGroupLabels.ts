/**
 * contextGroupLabels.ts
 *
 * Context group ID → 中文显示标签映射表。
 * 所有标签集中管理，方便后续新增或修改。
 *
 * 映射缺失时回退到原始 ID，不会报错。
 */

/**
 * Context Group ID → 中文显示标签映射
 *
 * 覆盖全部运行时 context group（runtimeContextResolvers.ts 中的
 * CHAPTER_CONTEXT_GROUPS + WORKSPACE_CONTEXT_GROUPS）、
 * creative hub 解析器、审计 prompt 需求等所有上下文组。
 */
export const CONTEXT_GROUP_LABELS: Record<string, string> = {
  // ── 章节核心 ──
  book_contract: "书籍契约",
  story_macro: "宏观故事",
  chapter_mission: "章节任务",
  chapter_boundary: "章节边界",
  narrative_progress_hint: "叙事进度提示",
  previous_chapter_tail: "前章尾段",
  previous_chapter_hook: "前章钩子",
  timeline_context: "时间线约束",

  // ── 卷/大纲 ──
  volume_window: "当前卷窗口",
  scene_plan: "场景计划",
  current_draft_excerpt: "当前草稿摘录",
  opening_constraints: "开头约束",
  recent_chapters: "最近章节摘要",
  scene_contract: "场景契约",

  // ── 角色 ──
  character_hard_facts: "角色硬事实",
  participant_subset: "参与角色",
  character_dynamics: "角色动态",
  character_resource: "角色资源",
  character_resource_context: "角色资源上下文",
  character_arc_plan: "角色弧光计划",

  // ── 状态/结构 ──
  state_goal: "状态目标",
  obligation_contract: "义务契约",
  local_state: "本地状态",
  structure_obligations: "结构义务",
  open_conflicts: "开放冲突",

  // ── 伏笔/账本 ──
  payoff_directives: "伏笔兑现指令",
  payoff_ledger: "伏笔账本",

  // ── 世界/规则 ──
  world_rules: "世界规则",
  world_slice: "世界切片",
  historical_issues: "历史遗留问题",

  // ── 风格/约束 ──
  style_contract: "风格契约",
  continuation_constraints: "续写约束",

  // ── 增量/修复 ──
  incremental_round_context: "增量轮次上下文",
  repair_issues: "修复问题",
  repair_boundaries: "修复边界",

  // ── 导演工作区 ──
  workspace_inventory: "工作区清单",
  manual_edit_inventory: "手动编辑清单",

  // ── RAG ──
  rag_context: "RAG 检索上下文",

  // ── Creative Hub ──
  "creative_hub.bindings": "创作中心资源绑定",
  "creative_hub.recent_messages": "创作中心最近消息",
  "creative_hub.novel_setup_status": "小说初始化状态",
  "creative_hub.production_status": "创作进度状态",
  reasoning_trace: "前序推理摘要",
};

/**
 * 获取 context group 的中文显示标签
 * @param groupId - context group ID（如 "chapter_mission"）
 * @returns 中文标签；若无映射则返回原始 ID
 */
export function getContextGroupLabel(groupId: string): string {
  return CONTEXT_GROUP_LABELS[groupId] ?? groupId;
}
