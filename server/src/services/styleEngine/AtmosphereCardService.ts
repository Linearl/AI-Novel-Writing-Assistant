import { readFileSync } from "node:fs";
import { prisma } from "../../db/prisma";
import type { AtmosphereCard } from "@prisma/client";

function readCardBody(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    return match ? match[1].trim() : content;
  } catch {
    return "";
  }
}

function parseCsvList(value: string | null | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

export class AtmosphereCardService {
  async listCards(filters?: { category?: string; enabled?: boolean }): Promise<AtmosphereCard[]> {
    return prisma.atmosphereCard.findMany({
      where: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.enabled !== undefined ? { enabled: filters.enabled } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async getCardByKey(key: string): Promise<(AtmosphereCard & { body: string }) | null> {
    const card = await prisma.atmosphereCard.findUnique({ where: { key } });
    if (!card) return null;
    const body = readCardBody(card.filePath);
    return { ...card, body };
  }

  async toggleGlobal(key: string, enabled: boolean): Promise<AtmosphereCard> {
    const card = await prisma.atmosphereCard.findUnique({ where: { key } });
    if (!card) throw new Error(`氛围卡 ${key} 不存在`);
    return prisma.atmosphereCard.update({ where: { key }, data: { enabled } });
  }

  async toggleAll(enabled: boolean): Promise<number> {
    const result = await prisma.atmosphereCard.updateMany({ data: { enabled } });
    return result.count;
  }

  async listCategories(): Promise<string[]> {
    const rows = await prisma.atmosphereCard.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { category: { not: null } },
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category!).filter(Boolean);
  }

  /**
   * 获取所有启用的氛围卡的 frontmatter 轻量信息（供 LLM 匹配用）
   */
  async listEnabledFrontmatters(): Promise<
    Array<{ key: string; name: string; description: string; applicableEmotions: string[]; triggerKeywords: string[] }>
  > {
    const cards = await prisma.atmosphereCard.findMany({
      where: { enabled: true },
      select: { key: true, name: true, description: true, applicableEmotions: true, triggerKeywords: true },
      orderBy: { name: "asc" },
    });
    return cards.map((c) => ({
      key: c.key,
      name: c.name,
      description: c.description,
      applicableEmotions: parseCsvList(c.applicableEmotions),
      triggerKeywords: parseCsvList(c.triggerKeywords),
    }));
  }
}

export const atmosphereCardService = new AtmosphereCardService();
