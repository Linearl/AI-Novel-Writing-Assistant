import { prisma } from "../../db/prisma";

export class BaseCharacterService {
  async list(input: {
    category?: string;
    tags?: string;
    search?: string;
  }) {
    return prisma.baseCharacter.findMany({
      where: {
        category: input.category ? { equals: input.category } : undefined,
        tags: input.tags ? { contains: input.tags } : undefined,
        OR: input.search
          ? [
              { name: { contains: input.search } },
              { personality: { contains: input.search } },
              { background: { contains: input.search } },
              { appearance: { contains: input.search } },
              { weaknesses: { contains: input.search } },
              { interests: { contains: input.search } },
              { keyEvents: { contains: input.search } },
              { tags: { contains: input.search } },
            ]
          : undefined,
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.baseCharacter.findUnique({ where: { id } });
  }

  async create(data: {
    name: string;
    role: string;
    personality: string;
    background: string;
    development: string;
    appearance?: string;
    weaknesses?: string;
    interests?: string;
    keyEvents?: string;
    tags?: string;
    category: string;
  }) {
    return prisma.baseCharacter.create({
      data: {
        ...data,
        tags: data.tags ?? "",
      },
    });
  }

  async update(id: string, data: Record<string, unknown>) {
    return prisma.baseCharacter.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.baseCharacter.delete({ where: { id } });
  }
}

export const baseCharacterService = new BaseCharacterService();
