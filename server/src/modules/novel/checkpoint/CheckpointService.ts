import { prisma } from "../../../../db/prisma";
import { logger } from "../../../../services/logging/LoggerService";

export interface ListCheckpointsOptions {
  page: number;
  pageSize: number;
  pinnedOnly?: boolean;
}

export interface CheckpointItem {
  id: string;
  chapterIndex: number;
  createdAt: string;
  isPinned: boolean;
  label: string | null;
}

export interface CheckpointPage {
  items: CheckpointItem[];
  total: number;
  page: number;
  pageSize: number;
}

export class CheckpointService {
  /**
   * FR-2: 列出指定小说的所有检查点（按创建时间倒序，支持分页）。
   */
  async listCheckpoints(
    novelId: string,
    options: ListCheckpointsOptions,
  ): Promise<CheckpointPage> {
    const { page, pageSize, pinnedOnly } = options;

    const where = {
      novelId,
      ...(pinnedOnly ? { isPinned: true } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.checkpoint.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          chapterIndex: true,
          createdAt: true,
          isPinned: true,
          label: true,
        },
      }),
      prisma.checkpoint.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }

  /**
   * FR-3: 删除单个检查点（标记保留的需要抛错提示）。
   */
  async deleteCheckpoint(checkpointId: string): Promise<void> {
    const checkpoint = await prisma.checkpoint.findUnique({
      where: { id: checkpointId },
      select: { isPinned: true },
    });

    if (!checkpoint) {
      throw new Error("检查点不存在");
    }

    if (checkpoint.isPinned) {
      throw new Error("检查点已标记为保留，请先取消保留再删除");
    }

    await prisma.checkpoint.delete({ where: { id: checkpointId } });
  }

  /**
   * FR-3: 批量删除检查点。
   */
  async deleteCheckpoints(ids: string[]): Promise<number> {
    const result = await prisma.checkpoint.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  /**
   * 强制删除检查点（忽略保留标记，用于用户确认后删除）。
   */
  async forceDeleteCheckpoint(checkpointId: string): Promise<void> {
    await prisma.checkpoint.delete({ where: { id: checkpointId } });
  }

  /**
   * 强制批量删除检查点。
   */
  async forceDeleteCheckpoints(ids: string[]): Promise<number> {
    const result = await prisma.checkpoint.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }

  /**
   * FR-4: 标记检查点为保留。
   */
  async pinCheckpoint(checkpointId: string): Promise<void> {
    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { isPinned: true },
    });
  }

  /**
   * FR-4: 取消检查点的保留标记。
   */
  async unpinCheckpoint(checkpointId: string): Promise<void> {
    await prisma.checkpoint.update({
      where: { id: checkpointId },
      data: { isPinned: false },
    });
  }

  /**
   * FR-1: 自动清理旧的检查点（保留最近 keepCount 个，跳过已标记保留的）。
   * 返回被删除的检查点数量。
   */
  async cleanupOldCheckpoints(
    novelId: string,
    keepCount: number = 20,
  ): Promise<number> {
    // 1. 查询非保留检查点总数
    const total = await prisma.checkpoint.count({
      where: { novelId, isPinned: false },
    });

    if (total <= keepCount) {
      return 0;
    }

    // 2. 计算需要删除的数量
    const toDelete = total - keepCount;

    // 3. 找到最旧的非保留检查点
    const oldest = await prisma.checkpoint.findMany({
      where: { novelId, isPinned: false },
      orderBy: { createdAt: "asc" },
      take: toDelete,
      select: { id: true },
    });

    // 4. 批量删除
    if (oldest.length > 0) {
      await prisma.checkpoint.deleteMany({
        where: { id: { in: oldest.map((c) => c.id) } },
      });

      logger.info(
        `[checkpoint] 自动清理完成：小说 ${novelId} 删除了 ${oldest.length} 个旧检查点`,
      );
    }

    return oldest.length;
  }

  /**
   * 获取单本小说的检查点总数。
   */
  async getCheckpointCount(novelId: string): Promise<number> {
    return prisma.checkpoint.count({ where: { novelId } });
  }
}

export const checkpointService = new CheckpointService();
