import { runTextPrompt } from "../../prompting/core/promptRunner";
import { runtimeFallbackAnswerPrompt } from "../../prompting/prompts/agent/runtime.prompts";
import { narrativeAdvisorAnalysisPrompt, type NarrativeAdvisorAnalysisInput } from "../../prompting/prompts/narrative/narrativeAdvisorAnalysisPrompt";
import { listAgentToolDefinitions } from "../toolRegistry";
import type { StructuredIntent, ToolCall, ToolExecutionContext } from "../types";
import { isRecord, safeJson, type ToolExecutionResult } from "./runtimeHelpers";
import { composeCreateNovelSetupAnswer, composeSelectNovelWorkspaceSetupAnswer } from "./novelSetupGuidanceComposer";
import { composeNovelSetupIdeationAnswer } from "./novelSetupIdeationComposer";
import {
  composeNovelListAnswer,
  composeBaseCharacterListAnswer,
  composeWorldListAnswer,
  composeTaskListAnswer,
  composeTitleAnswer,
  composeBindWorldAnswer,
  composeUnbindWorldAnswer,
  truncateText,
  getSuccessfulOutputs,
} from "./answerComposerListHelpers";
import {
  composeProgressAnswer,
  composeChapterAnswer,
  composeWriteAnswer,
  composeProductionStatusAnswer,
  composeProduceNovelAnswer,
  composeFailureDiagnosisAnswer,
} from "./answerComposerProductionHelpers";

const COLLABORATION_FIRST_INTENTS = new Set<StructuredIntent["intent"]>([
  "create_novel",
  "produce_novel",
  "write_chapter",
  "rewrite_chapter",
  "save_chapter_draft",
  "start_pipeline",
  "ideate_novel_setup",
  "general_chat",
  "unknown",
]);

function buildGroundingFacts(results: ToolExecutionResult[]): string {
  return safeJson(results.map((item) => ({
    tool: item.tool,
    success: item.success,
    summary: item.summary,
    output: item.output
      ? Object.fromEntries(
        Object.entries(item.output).map(([key, value]) => {
          if (typeof value === "string") {
            return [key, truncateText(value, 400)];
          }
          if (Array.isArray(value)) {
            return [key, value.slice(0, 6)];
          }
          return [key, value];
        }),
      )
      : undefined,
  })));
}

function formatMissingInfo(structuredIntent?: StructuredIntent): string[] {
  return (structuredIntent?.missingInfo ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildCollaborativeQuestion(structuredIntent?: StructuredIntent): string {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return "你想先把一句话设定钉牢，还是让我直接给你三套可选方向？";
    case "write_chapter":
    case "rewrite_chapter":
      return "这章你最想先解决的是剧情推进、人物情绪，还是文风节奏？";
    case "ideate_novel_setup":
      return "你更想先看核心设定、故事承诺，还是题材风格的备选方案？";
    default:
      return "你现在最想先解决哪一个创作问题？";
  }
}

function buildCollaborativeOptions(structuredIntent?: StructuredIntent): string[] {
  switch (structuredIntent?.intent) {
    case "produce_novel":
    case "create_novel":
      return [
        "我先基于当前信息给你 3 套核心设定方向。",
        "你补一句主角、冲突和目标，我帮你收敛成可执行设定。",
        "如果你已经想清楚，也可以直接说“现在启动整本生产”。",
      ];
    case "write_chapter":
    case "rewrite_chapter":
      return [
        "我先帮你判断这一章的问题出在情节、人物还是节奏。",
        "你告诉我这章的目标和想保留的部分，我给你重写方案。",
        "如果你已经确定范围，也可以直接说要改哪一章、往哪个方向改。",
      ];
    case "ideate_novel_setup":
      return [
        "先给你 3 套核心设定备选。",
        "先给你 3 套故事承诺和卖点方向。",
        "先给你 3 套题材风格与叙事配置组合。",
      ];
    default:
      return [
        "我先帮你拆清楚这个问题。",
        "我先给你几个可选方向。",
        "你补充最关键的限制条件，我再继续推进。",
      ];
  }
}

function composeCollaborativeAnswer(goal: string, structuredIntent?: StructuredIntent): string {
  const missingInfo = formatMissingInfo(structuredIntent);
  const lead = structuredIntent?.intent === "general_chat" || structuredIntent?.intent === "unknown"
    ? `我先不把它当成命令执行，先和你一起把问题说清楚：${goal}`
    : `我理解你现在想推进的是：${goal}`;
  const collaborationLead = structuredIntent?.interactionMode === "review"
    ? "这轮更适合先一起诊断和判断。"
    : "这轮更适合先共创澄清，再决定是否进入执行。";

  if ((structuredIntent?.assistantResponse ?? "explain") === "offer_options") {
    const options = buildCollaborativeOptions(structuredIntent)
      .map((item, index) => `${index + 1}. ${item}`)
      .join("\n");
    const missingLine = missingInfo.length > 0
      ? `在继续之前，我还想补齐这几个点：${missingInfo.join("、")}。\n`
      : "";
    return `${lead}\n${collaborationLead}\n${missingLine}你可以直接选一个方向继续：\n${options}`;
  }

  const missingLine = missingInfo.length > 0
    ? `在继续之前，我还缺这几个关键信息：${missingInfo.join("、")}。`
    : "";
  return [lead, collaborationLead, missingLine, buildCollaborativeQuestion(structuredIntent)]
    .filter(Boolean)
    .join("\n");
}

function composeSocialOpeningAnswer(context: Omit<ToolExecutionContext, "runId" | "agentName">): string {
  if (context.novelId) {
    return "你好。我可以继续陪你打磨这本书的设定、大纲、人物、章节，或者先帮你判断当前卡点。你现在想先推进哪一块？";
  }
  return "你好。我可以帮你一起打磨设定、大纲、人物、章节，或者帮你诊断当前卡点。你现在想先推进哪一块？";
}

async function composeFallbackAnswer(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  try {
    const toolList = listAgentToolDefinitions()
      .map((item) => `- ${item.name}: ${item.description}`)
      .join("\n");
    const result = await runTextPrompt({
      asset: runtimeFallbackAnswerPrompt,
      promptInput: {
        toolList,
        goal,
        structuredIntentJson: safeJson(structuredIntent ?? { intent: "unknown" }),
        summary,
        groundingFacts: buildGroundingFacts(results),
      },
      options: {
        provider: context.provider ?? "deepseek",
        model: context.model,
        temperature: 0.2,
        maxTokens: context.maxTokens,
      },
    });
    return result.output.trim() || "当前信息不足，无法继续";
  } catch {
    return summary || "当前信息不足，无法继续";
  }
  return "当前信息不足，无法继续";
}

function formatToolResultsForAdvisor(results: ToolExecutionResult[]): string {
  const successful = results.filter((item) => item.success && item.output);
  if (successful.length === 0) {
    return "未获取到有效的分析数据。";
  }
  return successful.map((item) => {
    const label = item.tool;
    const output = item.output as Record<string, unknown>;
    const snippet = typeof item.summary === "string" && item.summary.trim()
      ? item.summary.trim()
      : JSON.stringify(output, null, 2).slice(0, 600);
    return `### ${label}\n${snippet}`;
  }).join("\n\n");
}

async function composeNarrativeAdvisorAnswer(
  goal: string,
  results: ToolExecutionResult[],
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
): Promise<string> {
  const toolResultsText = formatToolResultsForAdvisor(results);
  const groundingFacts = buildGroundingFacts(results);
  try {
    const input: NarrativeAdvisorAnalysisInput = {
      creativeContext: groundingFacts,
      toolResults: toolResultsText,
      userQuestion: goal,
    };
    const result = await runTextPrompt({
      asset: narrativeAdvisorAnalysisPrompt,
      promptInput: input,
      options: {
        provider: context.provider ?? "deepseek",
        model: context.model,
        temperature: 0.3,
        maxTokens: context.maxTokens,
      },
    });
    return result.output.trim() || "分析结果为空，请尝试更具体的问题。";
  } catch {
    const fallback = toolResultsText.length > 0
      ? `以下是与你问题相关的数据分析：\n\n${toolResultsText}`
      : "当前数据不足以进行深入分析，请确保小说已有基本资产（角色、世界观、章节等）。";
    return fallback;
  }
}

export async function composeAssistantMessage(
  goal: string,
  summary: string,
  results: ToolExecutionResult[],
  waitingForApproval: boolean,
  context: Omit<ToolExecutionContext, "runId" | "agentName">,
  structuredIntent?: StructuredIntent,
): Promise<string> {
  if (structuredIntent?.intent === "social_opening") {
    return composeSocialOpeningAnswer(context);
  }

  if (
    !waitingForApproval
    && structuredIntent
    && COLLABORATION_FIRST_INTENTS.has(structuredIntent.intent)
    && (
      structuredIntent.shouldAskFollowup
      || ((structuredIntent.interactionMode ?? "execute") !== "execute" && results.length === 0)
    )
  ) {
    return composeCollaborativeAnswer(goal, structuredIntent);
  }

  switch (structuredIntent?.intent) {
    case "list_novels":
      return composeNovelListAnswer(results);
    case "list_base_characters":
      return composeBaseCharacterListAnswer(results);
    case "list_worlds":
      return composeWorldListAnswer(results);
    case "query_task_status":
      return composeTaskListAnswer(results);
    case "create_novel":
      return composeCreateNovelSetupAnswer(goal, results, context, structuredIntent);
    case "select_novel_workspace":
      return composeSelectNovelWorkspaceSetupAnswer(goal, results, context, structuredIntent);
    case "bind_world_to_novel":
      return composeBindWorldAnswer(results, context);
    case "unbind_world_from_novel":
      return composeUnbindWorldAnswer(results, context);
    case "produce_novel":
      return composeProduceNovelAnswer(results, waitingForApproval, context, goal, structuredIntent);
    case "query_novel_production_status":
      return composeProductionStatusAnswer(results, context);
    case "query_novel_title":
      return composeTitleAnswer(results);
    case "query_progress":
      return composeProgressAnswer(results);
    case "query_chapter_content":
      return composeChapterAnswer(results) ?? "未获取到章节正文";
    case "inspect_failure_reason":
      return composeFailureDiagnosisAnswer(results);
    case "ideate_novel_setup":
      return composeNovelSetupIdeationAnswer(goal, results, context, structuredIntent);
    case "write_chapter":
    case "rewrite_chapter":
    case "save_chapter_draft":
    case "start_pipeline":
      return composeWriteAnswer(results, waitingForApproval) ?? "未获取到可执行范围";
    case "narrative_advisor":
      return composeNarrativeAdvisorAnswer(goal, results, context);
    default:
      break;
  }

  if (waitingForApproval) {
    return summary;
  }
  return composeFallbackAnswer(goal, summary, results, context, structuredIntent);
}

export function hasUsableStructuredIntent(value: unknown): value is StructuredIntent {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.goal === "string"
    && typeof value.intent === "string"
    && typeof value.confidence === "number"
    && isRecord(value.chapterSelectors);
}

