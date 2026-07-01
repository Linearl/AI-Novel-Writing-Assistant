import type {
  CanonicalStateSnapshot,
  StateVersionRecord,
} from "@ai-novel/shared/types/canonicalState";
import { prisma } from "../../../db/prisma";

function parseStringArray(value: string | null | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export interface CreateStateVersionInput {
  novelId: string;
  chapterId?: string | null;
  sourceType: string;
  sourceStage?: string | null;
  summary: string;
  acceptedProposalIds: string[];
  snapshot: CanonicalStateSnapshot;
}

export class StateVersionLog {
  async createVersion(input: CreateStateVersionInput): Promise<StateVersionRecord> {
    const created = await prisma.$transaction(async (tx) => {
      const latest = await tx.canonicalStateVersion.findFirst({
        where: { novelId: input.novelId },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      const version = await tx.canonicalStateVersion.create({
        data: {
          novelId: input.novelId,
          chapterId: input.chapterId ?? null,
          sourceType: input.sourceType,
          sourceStage: input.sourceStage ?? null,
          version: (latest?.version ?? 0) + 1,
          summary: input.summary,
          snapshotJson: JSON.stringify(input.snapshot),
          acceptedProposalIdsJson: JSON.stringify(input.acceptedProposalIds),
        },
      });
      // REQ-7005: dual-write to StateVersionProposal edge table
      if (input.acceptedProposalIds.length > 0) {
        await tx.stateVersionProposal.createMany({
          data: input.acceptedProposalIds.map((proposalId) => ({
            novelId: input.novelId,
            versionId: version.id,
            proposalId,
          })),
        });
      }
      return version;
    });

    return {
      id: created.id,
      novelId: created.novelId,
      chapterId: created.chapterId ?? null,
      sourceType: created.sourceType,
      sourceStage: created.sourceStage ?? null,
      version: created.version,
      summary: created.summary,
      // REQ-7005: prefer input source (also written to edge table) over JSON fallback
      acceptedProposalIds: input.acceptedProposalIds.length > 0
        ? input.acceptedProposalIds
        : parseStringArray(created.acceptedProposalIdsJson),
      snapshotJson: created.snapshotJson,
      createdAt: created.createdAt.toISOString(),
    };
  }
}

export const stateVersionLog = new StateVersionLog();
