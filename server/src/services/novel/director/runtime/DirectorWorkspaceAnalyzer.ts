import type {
  AiManualEditImpactDecision,
  AiWorkspaceInterpretation,
  DirectorArtifactRef,
  DirectorManualEditImpact,
  DirectorManualEditInventory,
  DirectorWorkspaceAnalysis,
  DirectorWorkspaceInventory,
} from "@ai-novel/shared/types/directorRuntime";
import type { DirectorLLMOptions } from "@ai-novel/shared/types/novelDirector";
import { prisma } from "../../../../db/prisma";
import { runStructuredPrompt } from "../../../../prompting/core/promptRunner";
import { resolvePromptContextBlocksForAsset } from "../../../../prompting/context/promptContextResolution";
import {
  buildDirectorWorkspaceAnalysisContextBlocks,
  directorWorkspaceAnalysisPrompt,
} from "../../../../prompting/prompts/novel/directorWorkspaceAnalysis.prompts";
import {
  buildDirectorManualEditImpactContextBlocks,
  directorManualEditImpactPrompt,
} from "../../../../prompting/prompts/novel/directorManualEditImpact.prompts";
import { DirectorRuntimeStore } from "./DirectorRuntimeStore";
import { loadDirectorWorkspaceInventory } from "./DirectorWorkspaceInventoryLoader";
export { buildManualEditInventoryFromArtifacts, buildManualEditFallbackDecision } from "./DirectorWorkspaceInterpretation.js";
import {
  buildManualEditInventoryFromArtifacts,
  buildManualEditFallbackDecision,
  computeWorkspaceInterpretation,
  buildManualEditRecommendation,
} from "./DirectorWorkspaceInterpretation";

export class DirectorWorkspaceAnalyzer {
  constructor(private readonly runtimeStore = new DirectorRuntimeStore()) {}

  async analyze(input: {
    novelId: string;
    workflowTaskId?: string | null;
    includeAiInterpretation?: boolean;
    llm?: DirectorLLMOptions;
  }): Promise<DirectorWorkspaceAnalysis> {
    const inventory = await loadDirectorWorkspaceInventory(input.novelId);
    let interpretation: AiWorkspaceInterpretation | null = null;
    let promptMeta: DirectorWorkspaceAnalysis["prompt"] = null;

    if (input.includeAiInterpretation === true) {
      const fallbackContextBlocks = buildDirectorWorkspaceAnalysisContextBlocks({ inventory });
      const resolvedContext = await resolvePromptContextBlocksForAsset({
        asset: directorWorkspaceAnalysisPrompt,
        executionContext: {
          entrypoint: "auto_director",
          novelId: input.novelId,
          taskId: input.workflowTaskId ?? undefined,
          metadata: {
            workspaceInventory: inventory,
          },
        },
        fallbackBlocks: fallbackContextBlocks,
      });
      const result = await runStructuredPrompt({
        asset: directorWorkspaceAnalysisPrompt,
        promptInput: { inventory },
        contextBlocks: resolvedContext.blocks,
        options: {
          provider: input.llm?.provider,
          model: input.llm?.model,
          temperature: typeof input.llm?.temperature === "number" ? input.llm.temperature : 0.2,
          novelId: input.novelId,
          taskId: input.workflowTaskId ?? undefined,
          stage: "workspace_analysis",
          itemKey: "workspace_analyze",
          triggerReason: "director_runtime_workspace_analysis",
        },
      });
      interpretation = result.output;
      promptMeta = {
        promptId: result.meta.invocation.promptId,
        promptVersion: result.meta.invocation.promptVersion,
        provider: result.meta.provider,
        model: result.meta.model,
      };
    } else {
      interpretation = computeWorkspaceInterpretation(inventory);
    }

    const generatedAt = new Date().toISOString();
    const analysis: DirectorWorkspaceAnalysis = {
      novelId: input.novelId,
      inventory,
      interpretation,
      manualEditImpact: null,
      recommendation: interpretation?.recommendedAction ?? null,
      confidence: interpretation?.confidence ?? 0,
      evidenceRefs: interpretation?.evidenceRefs ?? ["workspace_inventory"],
      generatedAt,
      prompt: promptMeta,
    };

    if (input.workflowTaskId?.trim()) {
      await this.runtimeStore.recordWorkspaceAnalysis({
        taskId: input.workflowTaskId.trim(),
        analysis,
      });
    }

    return analysis;
  }

  async evaluateManualEditImpact(input: {
    novelId: string;
    workflowTaskId?: string | null;
    chapterId?: string | null;
    includeAiInterpretation?: boolean;
    llm?: DirectorLLMOptions;
  }): Promise<DirectorManualEditImpact> {
    const inventory = await loadDirectorWorkspaceInventory(input.novelId);
    const taskId = input.workflowTaskId?.trim() || null;
    const snapshot = taskId ? await this.runtimeStore.getSnapshot(taskId) : null;
    const previousArtifacts = snapshot?.lastWorkspaceAnalysis?.inventory.artifacts ?? snapshot?.artifacts ?? [];
    const editInventory = await this.buildManualEditInventory({
      novelId: input.novelId,
      inventory,
      previousArtifacts,
      focusedChapterId: input.chapterId,
      comparedAgainstTaskId: taskId,
    });

    let decision = buildManualEditFallbackDecision(editInventory);
    let promptMeta: DirectorManualEditImpact["prompt"] = null;

    if (input.includeAiInterpretation !== false && editInventory.changedChapters.length > 0) {
      const fallbackContextBlocks = buildDirectorManualEditImpactContextBlocks({ inventory, editInventory });
      const resolvedContext = await resolvePromptContextBlocksForAsset({
        asset: directorManualEditImpactPrompt,
        executionContext: {
          entrypoint: "auto_director",
          novelId: input.novelId,
          taskId: taskId ?? undefined,
          metadata: {
            workspaceInventory: inventory,
            manualEditInventory: editInventory,
          },
        },
        fallbackBlocks: fallbackContextBlocks,
      });
      const result = await runStructuredPrompt({
        asset: directorManualEditImpactPrompt,
        promptInput: { inventory, editInventory },
        contextBlocks: resolvedContext.blocks,
        options: {
          provider: input.llm?.provider,
          model: input.llm?.model,
          temperature: typeof input.llm?.temperature === "number" ? input.llm.temperature : 0.2,
          novelId: input.novelId,
          taskId: taskId ?? undefined,
          stage: "workspace_analysis",
          itemKey: "manual_edit_impact",
          triggerReason: "director_runtime_manual_edit_impact",
        },
      });
      decision = result.output;
      promptMeta = {
        promptId: result.meta.invocation.promptId,
        promptVersion: result.meta.invocation.promptVersion,
        provider: result.meta.provider,
        model: result.meta.model,
      };
    }

    const affectedArtifactIds = new Set([
      ...decision.affectedArtifactIds,
      ...editInventory.changedChapters.flatMap((chapter) => chapter.relatedArtifactIds),
    ]);
    const impact: DirectorManualEditImpact = {
      novelId: input.novelId,
      changedChapters: editInventory.changedChapters,
      affectedArtifacts: inventory.artifacts.filter((artifact) => affectedArtifactIds.has(artifact.id)),
      generatedAt: editInventory.generatedAt,
      ...decision,
      affectedArtifactIds: [...affectedArtifactIds],
      prompt: promptMeta,
    };

    if (taskId) {
      await this.runtimeStore.recordWorkspaceAnalysis({
        taskId,
        analysis: {
          novelId: input.novelId,
          inventory,
          interpretation: null,
          manualEditImpact: impact,
          recommendation: buildManualEditRecommendation(impact),
          confidence: impact.confidence,
          evidenceRefs: impact.evidenceRefs.length > 0 ? impact.evidenceRefs : ["manual_edit_inventory"],
          generatedAt: impact.generatedAt,
          prompt: promptMeta,
        },
      });
    }

    return impact;
  }

  private async buildManualEditInventory(input: {
    novelId: string;
    inventory: DirectorWorkspaceInventory;
    previousArtifacts: DirectorArtifactRef[];
    focusedChapterId?: string | null;
    comparedAgainstTaskId?: string | null;
  }): Promise<DirectorManualEditInventory> {
    const draftArtifacts = input.inventory.artifacts
      .filter((artifact) => artifact.artifactType === "chapter_draft" && artifact.targetType === "chapter" && artifact.targetId);
    const chapterIds = [...new Set(draftArtifacts.map((artifact) => artifact.targetId as string))];
    const chapters = chapterIds.length > 0
      ? await prisma.chapter.findMany({
        where: { novelId: input.novelId, id: { in: chapterIds } },
        select: {
          id: true,
          title: true,
          order: true,
          updatedAt: true,
        },
      })
      : [];
    const chapterMetaById = Object.fromEntries(chapters.map((chapter) => [
      chapter.id,
      {
        title: chapter.title,
        order: chapter.order,
        changedAt: chapter.updatedAt.toISOString(),
      },
    ]));
    return buildManualEditInventoryFromArtifacts({
      novelId: input.novelId,
      artifacts: input.inventory.artifacts,
      previousArtifacts: input.previousArtifacts,
      focusedChapterId: input.focusedChapterId,
      comparedAgainstTaskId: input.comparedAgainstTaskId,
      chapterMetaById,
    });
  }
}
