import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../../db/prisma";
import type {
  WritingTechnique,
  WritingTechniqueProfileBinding,
  WritingTechniqueNovelBinding,
} from "@prisma/client";

// --- 读取技法全文 ---

function readTechniqueBody(filePath: string): string {
  try {
    const content = readFileSync(filePath, "utf-8");
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
    return match ? match[1].trim() : content;
  } catch {
    return "";
  }
}

// --- Service ---

export class WritingTechniqueService {
  async listTechniques(filters?: {
    category?: string;
    enabled?: boolean;
  }): Promise<WritingTechnique[]> {
    return prisma.writingTechnique.findMany({
      where: {
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.enabled !== undefined ? { enabled: filters.enabled } : {}),
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async getTechniqueByKey(key: string): Promise<(WritingTechnique & { body: string }) | null> {
    const technique = await prisma.writingTechnique.findUnique({
      where: { key },
    });
    if (!technique) return null;

    const body = readTechniqueBody(technique.filePath);
    return { ...technique, body };
  }

  async toggleGlobal(key: string, enabled: boolean): Promise<WritingTechnique> {
    const technique = await prisma.writingTechnique.findUnique({ where: { key } });
    if (!technique) throw new Error(`技法 ${key} 不存在`);

    return prisma.writingTechnique.update({
      where: { key },
      data: { enabled },
    });
  }

  async toggleAll(enabled: boolean): Promise<number> {
    const result = await prisma.writingTechnique.updateMany({
      data: { enabled },
    });
    return result.count;
  }

  async listCategories(): Promise<string[]> {
    const rows = await prisma.writingTechnique.findMany({
      select: { category: true },
      distinct: ["category"],
      where: { category: { not: null } },
      orderBy: { category: "asc" },
    });
    return rows.map((r) => r.category!).filter(Boolean);
  }

  // --- 三级池子解析 ---

  async resolvePool(input: {
    styleProfileId?: string;
    novelId?: string;
  }): Promise<Array<{ key: string; name: string; description: string; category: string | null }>> {
    const seen = new Set<string>();
    const result: Array<{ key: string; name: string; description: string; category: string | null }> = [];

    // 1. 全局池
    const globalTechniques = await prisma.writingTechnique.findMany({
      where: { enabled: true },
      select: { key: true, name: true, description: true, category: true },
    });
    for (const t of globalTechniques) {
      if (!seen.has(t.key)) {
        seen.add(t.key);
        result.push(t);
      }
    }

    // 2. 画像池
    if (input.styleProfileId) {
      const profileBindings = await prisma.writingTechniqueProfileBinding.findMany({
        where: {
          styleProfileId: input.styleProfileId,
          enabled: true,
        },
        include: {
          technique: {
            select: { key: true, name: true, description: true, category: true },
          },
        },
      });
      for (const b of profileBindings) {
        if (!seen.has(b.technique.key)) {
          seen.add(b.technique.key);
          result.push(b.technique);
        }
      }
    }

    // 3. 小说池
    if (input.novelId) {
      const novelBindings = await prisma.writingTechniqueNovelBinding.findMany({
        where: {
          novelId: input.novelId,
          enabled: true,
        },
        include: {
          technique: {
            select: { key: true, name: true, description: true, category: true },
          },
        },
      });
      for (const b of novelBindings) {
        if (!seen.has(b.technique.key)) {
          seen.add(b.technique.key);
          result.push(b.technique);
        }
      }
    }

    return result;
  }

  // --- 画像绑定 ---

  async listProfileBindings(styleProfileId: string) {
    return prisma.writingTechniqueProfileBinding.findMany({
      where: { styleProfileId },
      include: { technique: true },
    });
  }

  async setProfileBindings(
    styleProfileId: string,
    techniqueKeys: string[],
  ): Promise<void> {
    // 查找技法 ID
    const techniques = await prisma.writingTechnique.findMany({
      where: { key: { in: techniqueKeys } },
      select: { id: true, key: true },
    });
    const keyToId = new Map(techniques.map((t) => [t.key, t.id]));

    await prisma.$transaction(async (tx) => {
      // 删除旧绑定
      await tx.writingTechniqueProfileBinding.deleteMany({
        where: { styleProfileId },
      });
      // 创建新绑定
      const data = techniqueKeys
        .map((key) => ({
          styleProfileId,
          writingTechniqueId: keyToId.get(key) ?? "",
        }))
        .filter((d) => d.writingTechniqueId);

      if (data.length > 0) {
        await tx.writingTechniqueProfileBinding.createMany({ data });
      }
    });
  }

  // --- 小说绑定 ---

  async listNovelBindings(novelId: string) {
    return prisma.writingTechniqueNovelBinding.findMany({
      where: { novelId },
      include: { technique: true },
    });
  }

  async setNovelBindings(
    novelId: string,
    techniqueKeys: string[],
  ): Promise<void> {
    const techniques = await prisma.writingTechnique.findMany({
      where: { key: { in: techniqueKeys } },
      select: { id: true, key: true },
    });
    const keyToId = new Map(techniques.map((t) => [t.key, t.id]));

    await prisma.$transaction(async (tx) => {
      await tx.writingTechniqueNovelBinding.deleteMany({ where: { novelId } });
      const data = techniqueKeys
        .map((key) => ({
          novelId,
          writingTechniqueId: keyToId.get(key) ?? "",
        }))
        .filter((d) => d.writingTechniqueId);

      if (data.length > 0) {
        await tx.writingTechniqueNovelBinding.createMany({ data });
      }
    });
  }
}
