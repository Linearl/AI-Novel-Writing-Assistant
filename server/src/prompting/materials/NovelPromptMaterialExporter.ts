/**
 * NovelPromptMaterialExporter.ts
 *
 * Class that exports novel prompt materials by group.
 * Delegates builder logic to NovelPromptMaterialBuilders.ts
 * and utility functions to NovelPromptMaterialUtils.ts.
 *
 * After REQ-2071 split:
 *   - NovelPromptMaterialExporter.ts  (~120 lines): class skeleton + export() + resolveGroup()
 *   - NovelPromptMaterialBuilders.ts  (~450 lines): 12 builder methods
 *   - NovelPromptMaterialUtils.ts     (~200 lines): utility functions + export singleton
 */

import { prisma } from "../../db/prisma";
import type {
  NovelMaterialBlock,
  NovelMaterialExportInput,
  NovelMaterialExportResult,
  NovelMaterialGroupDefinition,
} from "./types";
import {
  dedupe,
  sortRequestedGroups,
  applyTokenLimit,
  DEFAULT_MAX_TOKENS,
} from "./NovelPromptMaterialUtils";
import {
  buildNovelBasics,
  buildBookContract,
  buildChapterMission,
  buildCurrentChapter,
  buildRecentChapters,
  buildCharacterState,
  buildWorldRules,
  buildStyleContract,
  buildOpenIssues,
  buildDirectorWorkspace,
  buildMaterialIndex,
  buildReasoningTrace,
} from "./NovelPromptMaterialBuilders";
import { resolveNovelMaterialGroup } from "./materialGroups";

type MaterialsDb = typeof prisma;

export class NovelPromptMaterialExporter {
  constructor(private readonly db: MaterialsDb = prisma) {}

  async export(input: NovelMaterialExportInput): Promise<NovelMaterialExportResult> {
    const novelId = input.novelId?.trim();
    if (!novelId) {
      throw new Error("novelId is required to export prompt materials.");
    }

    const requestedGroups = sortRequestedGroups(input.groups);
    const missingGroups: string[] = [];
    const missingInputs: string[] = [];
    const warnings: string[] = [];
    const blocks: NovelMaterialBlock[] = [];

    for (const requestedGroup of requestedGroups) {
      const definition = resolveNovelMaterialGroup(requestedGroup);
      if (!definition) {
        missingGroups.push(requestedGroup);
        continue;
      }
      if (definition.requiresChapterId && !input.chapterId?.trim()) {
        missingInputs.push(`${requestedGroup}: chapterId`);
        continue;
      }
      if (definition.requiresTaskId && !input.taskId?.trim()) {
        missingInputs.push(`${requestedGroup}: taskId`);
        continue;
      }

      const exported = await this.resolveGroup({
        requestedGroup,
        definition,
        input: {
          ...input,
          novelId,
          chapterId: input.chapterId?.trim(),
          taskId: input.taskId?.trim(),
          volumeId: input.volumeId?.trim(),
        },
      });
      if (!exported) {
        missingGroups.push(requestedGroup);
        continue;
      }
      blocks.push(exported);
    }

    const limited = applyTokenLimit({
      blocks,
      maxTokens: input.maxTokens ?? DEFAULT_MAX_TOKENS,
      warnings,
    });

    return {
      blocks: limited,
      missingGroups: dedupe(missingGroups),
      missingInputs: dedupe(missingInputs),
      warnings,
      generatedAt: new Date().toISOString(),
    };
  }

  private async resolveGroup(input: {
    requestedGroup: string;
    definition: NovelMaterialGroupDefinition;
    input: NovelMaterialExportInput;
  }): Promise<NovelMaterialBlock | null> {
    switch (input.definition.group) {
      case "novel_basics":
        return buildNovelBasics(input.requestedGroup, input.definition, input.input.novelId);
      case "book_contract":
        return buildBookContract(input.requestedGroup, input.definition, input.input.novelId);
      case "chapter_mission":
        return buildChapterMission(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "current_chapter":
        return buildCurrentChapter(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "recent_chapters":
        return buildRecentChapters(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "character_state":
        return buildCharacterState(input.requestedGroup, input.definition, input.input.novelId);
      case "world_rules":
        return buildWorldRules(input.requestedGroup, input.definition, input.input.novelId);
      case "style_contract":
        return buildStyleContract(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "open_issues":
        return buildOpenIssues(input.requestedGroup, input.definition, input.input.novelId, input.input.chapterId);
      case "director_workspace":
        return buildDirectorWorkspace(input.requestedGroup, input.definition, input.input.novelId, input.input.taskId);
      case "material_index":
        return buildMaterialIndex(input.requestedGroup, input.definition, input.input.novelId);
      case "reasoning_trace":
        return buildReasoningTrace(input.requestedGroup, input.definition, input.input.novelId);
      default:
        return null;
    }
  }
}

export const novelPromptMaterialExporter = new NovelPromptMaterialExporter();

export async function exportNovelPromptMaterials(input: NovelMaterialExportInput): Promise<NovelMaterialExportResult> {
  return novelPromptMaterialExporter.export(input);
}
