import type { WorkflowActionDefinition, WorkflowDefinition } from "./workflowTypes";

/**
 * narrative_advisor intent workflow definitions.
 *
 * Dynamically selects read-only analysis tools based on the user's goal topic.
 * Each topic category maps to a specific tool that provides relevant context
 * for narrative advice (rhythm, characters, world-building, timeline, style, etc.).
 */

interface TopicPattern {
  /** Regex pattern to match against the lowercased goal text */
  pattern: RegExp;
  /** Factory that creates a WorkflowActionDefinition given novelId and goal */
  factory: (novelId: string, goal: string) => WorkflowActionDefinition;
}

const TOPIC_PATTERNS: TopicPattern[] = [
  {
    pattern: /节奏|结构|章节|卷|冲突|高潮|铺垫|慢|快/,
    factory: (novelId) => ({
      agent: "Planner",
      tool: "summarize_chapter_range",
      reason: "读取章节范围，分析叙事节奏与结构",
      input: { novelId, startOrder: 1, endOrder: 20, mode: "summary" },
      keyPrefix: "advisor_chapter_range",
    }),
  },
  {
    pattern: /角色|人物|动机|弧光|成长|配角|主角|反派|关系/,
    factory: (novelId) => ({
      agent: "Reviewer",
      tool: "get_character_states",
      reason: "读取角色状态，分析人物关系与弧光",
      input: { novelId },
      keyPrefix: "advisor_character_states",
    }),
  },
  {
    pattern: /世界|设定|规则|体系|魔法/,
    factory: (novelId) => ({
      agent: "Continuity",
      tool: "get_world_constraints",
      reason: "读取世界观约束，分析设定一致性",
      input: { novelId },
      keyPrefix: "advisor_world_constraints",
    }),
  },
  {
    pattern: /伏笔|时间|一致性|前后|呼应|连续/,
    factory: (novelId) => ({
      agent: "Continuity",
      tool: "get_timeline_facts",
      reason: "读取时间线事实，分析叙事连贯性",
      input: { novelId, limit: 30 },
      keyPrefix: "advisor_timeline_facts",
    }),
  },
  {
    pattern: /主题|风格|基调|文风|故事圣经/,
    factory: (novelId) => ({
      agent: "Planner",
      tool: "get_story_bible",
      reason: "读取故事圣经，分析主题与风格",
      input: { novelId },
      keyPrefix: "advisor_story_bible",
    }),
  },
];

export const narrativeAdvisorWorkflowDefinitions: WorkflowDefinition[] = [
  {
    id: "narrative_advisor",
    intent: "narrative_advisor",
    kind: "single",
    requiresNovelContext: true,
    resolve: ({ intent, plannerInput }) => {
      const actions: WorkflowActionDefinition[] = [];
      const goal = intent.goal || "";
      const goalLower = goal.toLowerCase();
      const novelId = plannerInput.novelId;

      if (!novelId) {
        return actions;
      }

      // Always load novel context as baseline
      actions.push({
        agent: "Planner",
        tool: "get_novel_context",
        reason: "读取小说总览，作为叙事建议的基础信息",
        input: { novelId },
        keyPrefix: "advisor_novel_context",
      });

      // Dynamically select analysis tools based on topic keywords in the goal
      for (const { pattern, factory } of TOPIC_PATTERNS) {
        if (pattern.test(goalLower)) {
          actions.push(factory(novelId, goal));
        }
      }

      // Fallback: if no specific topic matched, do a knowledge search
      if (actions.length <= 1) {
        actions.push({
          agent: "Planner",
          tool: "search_knowledge",
          reason: "关键词无明确匹配，执行知识检索获取相关上下文",
          input: { novelId, query: goal },
          keyPrefix: "advisor_knowledge_search",
        });
      }

      return actions;
    },
  },
];
