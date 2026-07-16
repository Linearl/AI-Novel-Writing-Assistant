import type { BookAnalysisCharacterMedia } from "@ai-novel/shared";
import type { LLMProvider } from "@ai-novel/shared";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";

export interface PortraitGenerationInput {
  characterId: string;
  style?: string;
  provider?: LLMProvider;
}

export class BookAnalysisCharacterMediaService {
  async listMedia(characterId: string): Promise<BookAnalysisCharacterMedia[]> {
    const rows = await prisma.bookAnalysisCharacterMedia.findMany({
      where: { characterId },
      orderBy: [{ createdAt: "desc" }],
    });
    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async createMedia(
    characterId: string,
    mediaType: string,
    url: string,
    prompt?: string,
    style?: string,
  ): Promise<BookAnalysisCharacterMedia> {
    const row = await prisma.bookAnalysisCharacterMedia.create({
      data: { characterId, mediaType, url, prompt: prompt ?? null, style: style ?? null },
    });
    return { ...row, createdAt: row.createdAt.toISOString() };
  }

  async deleteMedia(mediaId: string) {
    const media = await prisma.bookAnalysisCharacterMedia.findUnique({
      where: { id: mediaId },
    });
    if (!media) {
      throw new AppError("Character media not found.", 404);
    }
    await prisma.bookAnalysisCharacterMedia.delete({ where: { id: mediaId } });
  }

  buildPortraitPrompt(character: {
    name: string;
    profile: any;
    appearances?: Array<{ excerpt: string }>;
  }): string {
    const profile = character.profile as Record<string, any> | null;
    const appearance = profile?.appearance as Record<string, any> | null;

    const parts: string[] = [`Generate a character portrait for: ${character.name}`];

    if (appearance?.gender) {
      parts.push(`Gender: ${appearance.gender}`);
    }
    if (appearance?.age) {
      parts.push(`Age: ${appearance.age}`);
    }

    const features: string[] = [];
    if (appearance?.hair) features.push(`Hair: ${appearance.hair}`);
    if (appearance?.eyes) features.push(`Eyes: ${appearance.eyes}`);
    if (appearance?.height) features.push(`Height: ${appearance.height}`);
    if (appearance?.build) features.push(`Build: ${appearance.build}`);
    if (Array.isArray(appearance?.features)) {
      features.push(...appearance.features);
    }
    if (Array.isArray(appearance?.descriptors)) {
      features.push(...appearance.descriptors);
    }
    if (features.length > 0) {
      parts.push(`Physical features: ${features.join(", ")}`);
    }

    if (appearance?.clothing && Array.isArray(appearance.clothing)) {
      parts.push(`Clothing: ${appearance.clothing.join(", ")}`);
    }

    if (appearance?.summary) {
      parts.push(`Description: ${appearance.summary}`);
    }

    const personality = profile?.personality as Record<string, any> | null;
    if (personality?.traits && Array.isArray(personality.traits)) {
      parts.push(`Personality: ${personality.traits.join(", ")}`);
    }

    if (character.appearances && character.appearances.length > 0) {
      const excerpts = character.appearances
        .slice(0, 3)
        .map((a) => a.excerpt)
        .join(" ");
      parts.push(`References from text: ${excerpts.slice(0, 300)}`);
    }

    parts.push("Style: Chinese fantasy/anime art style, high quality, detailed");

    return parts.join(". ");
  }
}
