import type {
  BookAnalysisCharacterAppearance,
} from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";

export interface AppearanceExtractionInput {
  characterId: string;
  sectionKey?: string;
  excerpt: string;
  orderIndex: number;
  parsedTraits?: Record<string, unknown>;
}

export class BookAnalysisCharacterAppearanceService {
  async listAppearances(characterId: string): Promise<BookAnalysisCharacterAppearance[]> {
    const rows = await prisma.bookAnalysisCharacterAppearance.findMany({
      where: { characterId },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    });
    return rows.map((row) => ({
      ...row,
      parsedTraits: row.parsedTraits as Record<string, unknown> | null,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async addAppearance(input: AppearanceExtractionInput) {
    const character = await prisma.bookAnalysisCharacter.findUnique({
      where: { id: input.characterId },
    });
    if (!character) {
      throw new AppError("Book analysis character not found.", 404);
    }
    return prisma.bookAnalysisCharacterAppearance.create({
      data: {
        characterId: input.characterId,
        sectionKey: input.sectionKey ?? null,
        excerpt: input.excerpt,
        orderIndex: input.orderIndex,
        parsedTraits: input.parsedTraits as any ?? null,
      },
    });
  }

  async updateAppearance(appearanceId: string, input: Partial<Pick<AppearanceExtractionInput, "excerpt" | "parsedTraits" | "orderIndex">>) {
    const appearance = await prisma.bookAnalysisCharacterAppearance.findUnique({
      where: { id: appearanceId },
    });
    if (!appearance) {
      throw new AppError("Appearance record not found.", 404);
    }
    return prisma.bookAnalysisCharacterAppearance.update({
      where: { id: appearanceId },
      data: {
        ...(input.excerpt !== undefined ? { excerpt: input.excerpt } : {}),
        ...(input.parsedTraits !== undefined ? { parsedTraits: input.parsedTraits as any } : {}),
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
      },
    });
  }

  async deleteAppearance(appearanceId: string) {
    const appearance = await prisma.bookAnalysisCharacterAppearance.findUnique({
      where: { id: appearanceId },
    });
    if (!appearance) {
      throw new AppError("Appearance record not found.", 404);
    }
    await prisma.bookAnalysisCharacterAppearance.delete({ where: { id: appearanceId } });
  }

  async extractAppearancesFromSections(characterId: string): Promise<number> {
    const character = await prisma.bookAnalysisCharacter.findUnique({
      where: { id: characterId },
      include: { analysis: { include: { sections: true } } },
    });
    if (!character) {
      throw new AppError("Book analysis character not found.", 404);
    }
    const characterName = character.name;
    const sectionContents = character.analysis.sections
      .filter((s) => s.status === "succeeded" || s.status === "idle")
      .map((s) => ({
        sectionKey: s.sectionKey,
        title: s.title,
        content: s.editedContent?.trim() || s.aiContent?.trim() || "",
      }))
      .filter((s) => s.content);

    const maxOrder = await prisma.bookAnalysisCharacterAppearance.aggregate({
      where: { characterId },
      _max: { orderIndex: true },
    });
    let orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;
    let created = 0;

    for (const section of sectionContents) {
      const paragraphs = section.content.split(/\n\n+/).filter((p) => p.trim());
      for (const paragraph of paragraphs) {
        if (!paragraph.includes(characterName)) continue;
        const sentences = paragraph.split(/[。！？\.!\?]/);
        for (const sentence of sentences) {
          if (sentence.includes(characterName)) {
            const appearanceKeywords = ["穿着", "头发", "眼睛", "身高", "容貌", "服饰", "打扮", "披", "戴", "色", "长", "发", "目", "容", "貌", "装", "体型", "衣", "袍", "裙", "裤", "靴", "冠", "饰", "身材", "肤", "脸", "眉", "鼻", "嘴", "唇", "耳", "颈", "肩", "手", "腕", "腰带", "披风", "打扮", "模样", "长相", "外表", "身形", "体态", "面容", "面庞"];
            const hasKeyword = appearanceKeywords.some((k) => sentence.includes(k));
            if (hasKeyword && sentence.trim().length > 10) {
              await prisma.bookAnalysisCharacterAppearance.create({
                data: {
                  characterId,
                  sectionKey: section.sectionKey,
                  excerpt: sentence.trim(),
                  orderIndex: orderIndex,
                  parsedTraits: undefined,
                },
              });
              orderIndex++;
              created++;
            }
          }
        }
      }
    }
    return created;
  }
}
