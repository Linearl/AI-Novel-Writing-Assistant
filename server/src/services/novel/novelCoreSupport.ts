import { prisma } from "../../db/prisma";
import { logger } from "../../services/logging/LoggerService";
import { ragServices } from "../rag";
import type { RagOwnerType } from "../rag/types";

export function queueRagUpsert(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueUpsert(ownerType, ownerId).catch((err) => {
    logger.warn("[NovelCoreSupport] RAG enqueueUpsert 失败（非阻断）", {
      ownerType,
      ownerId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export function queueRagDelete(ownerType: RagOwnerType, ownerId: string): void {
  void ragServices.ragIndexService.enqueueDelete(ownerType, ownerId).catch((err) => {
    logger.warn("[NovelCoreSupport] RAG enqueueDelete 失败（非阻断）", {
      ownerType,
      ownerId,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

export async function ensureNovelCharacters(novelId: string, actionName: string, minCount = 1) {
  const count = await prisma.character.count({ where: { novelId } });
  if (count < minCount) {
    throw new Error(`请先在本小说中至少添加 ${minCount} 个角色后再${actionName}。`);
  }
}
