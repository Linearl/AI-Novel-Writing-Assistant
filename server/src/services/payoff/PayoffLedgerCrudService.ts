import type {
  PayoffLedgerItem,
  PayoffLedgerListResponse,
  PayoffLedgerNormalizedStatus,
  PayoffLedgerStatus,
} from "@ai-novel/shared";
import { NORMALIZED_STATUS_MAP } from "@ai-novel/shared";
import { prisma } from "../../db/prisma";
import {
  buildPayoffLedgerSummary,
  mapPayoffLedgerRow,
  serializeLedgerJson,
} from "./payoffLedgerShared";

interface ListItemsOptions {
  normalizedStatus?: PayoffLedgerNormalizedStatus;
  page?: number;
  pageSize?: number;
  chapterOrder?: number;
}

interface CreateItemInput {
  title: string;
  summary: string;
  scopeType: "book" | "volume" | "chapter";
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
  setupChapterId?: string | null;
  statusReason?: string | null;
}

interface UpdateItemInput {
  title?: string;
  summary?: string;
  normalizedStatus?: PayoffLedgerNormalizedStatus;
  statusReason?: string | null;
  targetStartChapterOrder?: number | null;
  targetEndChapterOrder?: number | null;
  payoffChapterId?: string | null;
}

/** 根据 normalizedStatus 推导需要匹配的 currentStatus 列表 */
function statusesForNormalized(normalized: PayoffLedgerNormalizedStatus): PayoffLedgerStatus[] {
  const entries = Object.entries(NORMALIZED_STATUS_MAP) as Array<[PayoffLedgerStatus, PayoffLedgerNormalizedStatus]>;
  return entries
    .filter(([, n]) => n === normalized)
    .map(([status]) => status);
}

export class PayoffLedgerCrudService {
  async listItems(novelId: string, options: ListItemsOptions = {}): Promise<PayoffLedgerListResponse> {
    const page = options.page ?? 1;
    const pageSize = options.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { novelId };

    if (options.normalizedStatus) {
      const matchingStatuses = statusesForNormalized(options.normalizedStatus);
      where.currentStatus = { in: matchingStatuses };
    }

    const [rows, total] = await Promise.all([
      prisma.payoffLedgerItem.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.payoffLedgerItem.count({ where }),
    ]);

    const items = rows.map(mapPayoffLedgerRow);

    // 计算全量 summary（不带分页过滤）
    const allRows = await prisma.payoffLedgerItem.findMany({
      where: { novelId },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    });
    const allItems = allRows.map(mapPayoffLedgerRow);
    const summary = buildPayoffLedgerSummary(allItems, options.chapterOrder);

    return {
      items,
      total,
      page,
      pageSize,
      summary,
    };
  }

  async createItem(novelId: string, input: CreateItemInput): Promise<PayoffLedgerItem> {
    // 验证小说存在
    const novel = await prisma.novel.findUnique({
      where: { id: novelId },
      select: { id: true },
    });
    if (!novel) {
      throw new Error("小说不存在。");
    }

    // 生成 ledgerKey：基于 title + novelId
    const ledgerKey = `manual:${novelId}:${Date.now()}`;

    const now = new Date();
    const row = await prisma.payoffLedgerItem.create({
      data: {
        novelId,
        ledgerKey,
        title: input.title,
        summary: input.summary,
        scopeType: input.scopeType,
        currentStatus: "setup",
        normalizedStatus: "planted",
        chaptersElapsed: 0,
        targetStartChapterOrder: input.targetStartChapterOrder ?? null,
        targetEndChapterOrder: input.targetEndChapterOrder ?? null,
        setupChapterId: input.setupChapterId ?? null,
        statusReason: input.statusReason ?? null,
        sourceRefsJson: serializeLedgerJson([]),
        evidenceJson: serializeLedgerJson([]),
        riskSignalsJson: serializeLedgerJson([]),
        createdAt: now,
        updatedAt: now,
      },
    });

    return mapPayoffLedgerRow(row);
  }

  async updateItem(itemId: string, input: UpdateItemInput): Promise<PayoffLedgerItem | null> {
    const existing = await prisma.payoffLedgerItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) {
      return null;
    }

    const updateData: Record<string, unknown> = {};

    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    if (input.summary !== undefined) {
      updateData.summary = input.summary;
    }
    if (input.statusReason !== undefined) {
      updateData.statusReason = input.statusReason;
    }
    if (input.targetStartChapterOrder !== undefined) {
      updateData.targetStartChapterOrder = input.targetStartChapterOrder;
    }
    if (input.targetEndChapterOrder !== undefined) {
      updateData.targetEndChapterOrder = input.targetEndChapterOrder;
    }
    if (input.payoffChapterId !== undefined) {
      updateData.payoffChapterId = input.payoffChapterId;
    }

    // normalizedStatus 变更时，同步更新 currentStatus 保持兼容
    if (input.normalizedStatus !== undefined) {
      updateData.normalizedStatus = input.normalizedStatus;
      const currentNormalized = existing.normalizedStatus
        ?? NORMALIZED_STATUS_MAP[existing.currentStatus as PayoffLedgerStatus];
      if (currentNormalized !== input.normalizedStatus) {
        const newCurrentStatus = reverseNormalizedStatus(input.normalizedStatus, existing.currentStatus as PayoffLedgerStatus);
        if (newCurrentStatus) {
          updateData.currentStatus = newCurrentStatus;
        }
      }
    }

    updateData.updatedAt = new Date();

    const row = await prisma.payoffLedgerItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return mapPayoffLedgerRow(row);
  }
}

/**
 * 将 normalizedStatus 反向映射为 currentStatus，保持向后兼容。
 * 选取映射中最能代表当前语义的值。
 */
function reverseNormalizedStatus(
  target: PayoffLedgerNormalizedStatus,
  current: PayoffLedgerStatus,
): PayoffLedgerStatus | null {
  // 如果当前值已经映射到目标 normalizedStatus，保持不变
  if (NORMALIZED_STATUS_MAP[current] === target) {
    return null;
  }

  switch (target) {
    case "planted":
      return "setup";
    case "active":
      return "pending_payoff";
    case "resolved":
      return "paid_off";
    case "expired":
      return "overdue";
    default:
      return null;
  }
}
