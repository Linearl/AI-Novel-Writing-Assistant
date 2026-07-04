/**
 * TXT import/export routes for world settings, outline, characters, and chapter prose.
 *
 * Mounted under the novel router (`/api/novels`).
 *
 * Endpoints:
 *   GET  /:id/world/export/txt         — world settings TXT export
 *   POST /:id/world/import/txt         — world settings TXT import (?mode=overwrite|merge)
 *   GET  /:id/outline/export/txt       — outline TXT export
 *   POST /:id/outline/import/txt       — outline TXT import (?mode=overwrite|append)
 *   GET  /:id/characters/export/txt    — characters+relations TXT export
 *   POST /:id/characters/import/txt    — characters+relations TXT import (?mode=overwrite|merge)
 *   GET  /:id/chapters/:chapterId/export/txt — chapter prose TXT export
 */

import type { Response, Router } from "express";
import { z } from "zod";
import { prisma } from "../../../db/prisma";
import { AppError } from "../../../middleware/errorHandler";
import { validate } from "../../../middleware/validate";
import { TxtParseError } from "../../../services/txt-io/txtParser";
import {
  serializeSettingsTxt,
  parseSettingsTxt,
  applySettingsFields,
} from "../../../services/txt-io/settingsTxtSerializer";
import {
  serializeOutlineTxt,
  parseOutlineTxt,
  toStructuredOutlineChapters,
} from "../../../services/txt-io/outlineTxtSerializer";
import {
  serializeCharactersTxt,
  parseCharactersTxt,
  resolveRelationIds,
} from "../../../services/txt-io/charactersTxtSerializer";
import { markdownToPlainText } from "../../../services/txt-io/chapterTxtSerializer";
import { parseTxtContent } from "../../../services/txt-io/txtParser";
import { normalizeWorldStructuredData } from "../../../services/world/worldStructure";
import { safeJsonParse } from "../../../platform/json";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const idParamsSchema = z.object({ id: z.string().trim().min(1) });
const chapterParamsSchema = z.object({
  id: z.string().trim().min(1),
  chapterId: z.string().trim().min(1),
});
const overwriteMergeSchema = z.object({
  mode: z.enum(["overwrite", "merge"]).default("overwrite"),
});
const overwriteAppendSchema = z.object({
  mode: z.enum(["overwrite", "append"]).default("overwrite"),
});

/* ------------------------------------------------------------------ */
/*  Helper: send TXT response                                          */
/* ------------------------------------------------------------------ */

function sendTxt(res: Response, content: string, fileName: string): void {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.status(200).send(content);
}

function buildTimeStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/* ------------------------------------------------------------------ */
/*  Route registration                                                 */
/* ------------------------------------------------------------------ */

interface RegisterNovelTxtImportExportRoutesInput {
  router: Router;
}

export function registerNovelTxtImportExportRoutes(
  input: RegisterNovelTxtImportExportRoutesInput,
): void {
  const { router } = input;

  /* ================================================================ */
  /*  T1-T2: World Settings TXT                                       */
  /* ================================================================ */

  // GET /:id/world/export/txt
  router.get(
    "/:id/world/export/txt",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;

        const novelWorld = await prisma.novelWorld.findUnique({
          where: { novelId: id },
          select: {
            title: true,
            coverSummary: true,
            structuredDataJson: true,
            novel: { select: { title: true } },
          },
        });
        if (!novelWorld) {
          throw new AppError("该小说还没有世界设定，请先创建或导入世界。", 404);
        }

        const structure = normalizeWorldStructuredData(
          safeJsonParse<unknown>(novelWorld.structuredDataJson ?? "{}", {}),
        );

        const content = serializeSettingsTxt({
          structuredData: structure,
          title: novelWorld.title ?? novelWorld.novel.title,
          coverSummary: novelWorld.coverSummary,
        });

        const title = novelWorld.title ?? novelWorld.novel.title ?? "世界设定";
        sendTxt(res, content, `${title}-世界设定-${buildTimeStamp()}.txt`);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /:id/world/import/txt
  router.post(
    "/:id/world/import/txt",
    validate({ params: idParamsSchema, query: overwriteMergeSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { mode } = req.query as z.infer<typeof overwriteMergeSchema>;
        const raw = typeof req.body === "string" ? req.body : String(req.body ?? "");
        const lines = parseTxtContent(raw);

        const novelWorld = await prisma.novelWorld.findUnique({
          where: { novelId: id },
          select: { id: true, structuredDataJson: true },
        });
        if (!novelWorld) {
          throw new AppError("该小说还没有世界设定，请先创建或导入世界。", 404);
        }

        const { fields } = parseSettingsTxt(raw, lines);
        const existing = normalizeWorldStructuredData(
          safeJsonParse<unknown>(novelWorld.structuredDataJson ?? "{}", {}),
        );
        const merged = applySettingsFields(existing, fields, mode);

        await prisma.novelWorld.update({
          where: { id: novelWorld.id },
          data: { structuredDataJson: JSON.stringify(merged, null, 2) },
        });

        res.status(200).json({ success: true, count: fields.length });
      } catch (error) {
        if (error instanceof TxtParseError) {
          const resp: Record<string, unknown> = { error: error.message };
          if (error.line !== undefined) resp.line = error.line;
          if (error.detail !== undefined) resp.detail = error.detail;
          res.status(400).json(resp);
          return;
        }
        next(error);
      }
    },
  );

  /* ================================================================ */
  /*  T3-T4: Outline TXT                                              */
  /* ================================================================ */

  // GET /:id/outline/export/txt
  router.get(
    "/:id/outline/export/txt",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;

        const novel = await prisma.novel.findUnique({
          where: { id },
          select: {
            title: true,
            structuredOutline: true,
          },
        });
        if (!novel) {
          throw new AppError("小说不存在。", 404);
        }

        const chapters = safeJsonParse<Array<{ chapter?: number; title?: string; summary?: string }>>(
          novel.structuredOutline ?? "[]",
          [],
        );

        const summaries = chapters
          .filter((ch) => ch.title)
          .map((ch) => ({
            title: ch.title!,
            summary: ch.summary ?? "",
          }));

        const content = serializeOutlineTxt(summaries);
        sendTxt(res, content || "(大纲为空)\n", `${novel.title ?? "小说"}-大纲-${buildTimeStamp()}.txt`);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /:id/outline/import/txt
  router.post(
    "/:id/outline/import/txt",
    validate({ params: idParamsSchema, query: overwriteAppendSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { mode } = req.query as z.infer<typeof overwriteAppendSchema>;
        const raw = typeof req.body === "string" ? req.body : String(req.body ?? "");
        const lines = parseTxtContent(raw);

        const novel = await prisma.novel.findUnique({
          where: { id },
          select: { id: true, structuredOutline: true },
        });
        if (!novel) {
          throw new AppError("小说不存在。", 404);
        }

        const parsed = parseOutlineTxt(lines);

        let existingChapters: Array<{ chapter: number; title: string; summary: string; key_events: string[]; roles: string[] }> = [];
        let startChapter = 1;

        if (mode === "append") {
          existingChapters = safeJsonParse<typeof existingChapters>(
            novel.structuredOutline ?? "[]",
            [],
          );
          startChapter = existingChapters.length > 0
            ? Math.max(...existingChapters.map((ch) => ch.chapter)) + 1
            : 1;
        }

        const newChapters = toStructuredOutlineChapters(parsed, startChapter);
        const merged = mode === "append" ? [...existingChapters, ...newChapters] : newChapters;

        await prisma.novel.update({
          where: { id },
          data: { structuredOutline: JSON.stringify(merged, null, 2) },
        });

        res.status(200).json({ success: true, count: parsed.length });
      } catch (error) {
        if (error instanceof TxtParseError) {
          const resp: Record<string, unknown> = { error: error.message };
          if (error.line !== undefined) resp.line = error.line;
          if (error.detail !== undefined) resp.detail = error.detail;
          res.status(400).json(resp);
          return;
        }
        next(error);
      }
    },
  );

  /* ================================================================ */
  /*  T5-T6: Characters + Relations TXT                               */
  /* ================================================================ */

  // GET /:id/characters/export/txt
  router.get(
    "/:id/characters/export/txt",
    validate({ params: idParamsSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;

        const novel = await prisma.novel.findUnique({
          where: { id },
          select: { title: true },
        });
        if (!novel) {
          throw new AppError("小说不存在。", 404);
        }

        const characters = await prisma.character.findMany({
          where: { novelId: id },
          select: {
            name: true,
            role: true,
            gender: true,
            castRole: true,
            identityLabel: true,
          },
          orderBy: { name: "asc" },
        });

        const relations = await prisma.characterRelation.findMany({
          where: { novelId: id },
          select: {
            surfaceRelation: true,
            sourceCharacter: { select: { name: true } },
            targetCharacter: { select: { name: true } },
          },
        });

        const profiles = characters.map((c) => ({
          name: c.name,
          role: c.role,
          gender: c.gender,
          castRole: c.castRole,
          identityLabel: c.identityLabel,
        }));

        const relationExports = relations.map((r) => ({
          sourceName: r.sourceCharacter.name,
          targetName: r.targetCharacter.name,
          surfaceRelation: r.surfaceRelation,
          status: "未知", // CharacterRelation has no "status" column; default to "未知"
        }));

        const content = serializeCharactersTxt(profiles, relationExports);
        sendTxt(res, content || "(角色和关系数据为空)\n", `${novel.title ?? "小说"}-关系网-${buildTimeStamp()}.txt`);
      } catch (error) {
        next(error);
      }
    },
  );

  // POST /:id/characters/import/txt
  router.post(
    "/:id/characters/import/txt",
    validate({ params: idParamsSchema, query: overwriteMergeSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params as z.infer<typeof idParamsSchema>;
        const { mode } = req.query as z.infer<typeof overwriteMergeSchema>;
        const raw = typeof req.body === "string" ? req.body : String(req.body ?? "");
        const lines = parseTxtContent(raw);

        // Verify novel exists
        const novel = await prisma.novel.findUnique({
          where: { id },
          select: { id: true, title: true },
        });
        if (!novel) {
          throw new AppError("小说不存在。", 404);
        }

        const { profiles, relations } = parseCharactersTxt(lines);

        let charactersImported = 0;
        let relationshipsImported = 0;

        if (mode === "overwrite") {
          // Delete all existing characters and relations
          await prisma.characterRelation.deleteMany({ where: { novelId: id } });
          await prisma.character.deleteMany({ where: { novelId: id } });

          // Create characters from profiles
          for (const p of profiles) {
            const genderValue = p.attributes[1];
            const validGenders = ["male", "female", "other", "unknown"] as const;
            type ValidGender = (typeof validGenders)[number];
            const gender = validGenders.includes(genderValue as ValidGender) ? (genderValue as ValidGender) : undefined;
            await prisma.character.create({
              data: {
                novelId: id,
                name: p.name,
                role: p.attributes[0] ?? "",
                gender: gender ?? undefined,
                castRole: p.attributes[2] as never ?? undefined,
                identityLabel: p.attributes[3] ?? null,
              },
            });
            charactersImported++;
          }
        } else {
          // Merge: only create characters that don't exist by name
          for (const p of profiles) {
            const existing = await prisma.character.findFirst({
              where: { novelId: id, name: p.name },
              select: { id: true },
            });
            if (!existing) {
              const genderValue = p.attributes[1];
              const validGenders = ["male", "female", "other", "unknown"] as const;
              type ValidGender2 = (typeof validGenders)[number];
              const gender = validGenders.includes(genderValue as ValidGender2) ? (genderValue as ValidGender2) : undefined;
              await prisma.character.create({
                data: {
                  novelId: id,
                  name: p.name,
                  role: p.attributes[0] ?? "",
                  gender: gender ?? undefined,
                  castRole: p.attributes[2] as never ?? undefined,
                  identityLabel: p.attributes[3] ?? null,
                },
              });
              charactersImported++;
            }
          }
        }

        // Resolve relation names to character IDs
        const allCharacters = await prisma.character.findMany({
          where: { novelId: id },
          select: { id: true, name: true },
        });
        const charactersByName = new Map(allCharacters.map((c) => [c.name, { id: c.id }]));
        const resolvedRelations = resolveRelationIds(relations, charactersByName);

        for (const r of resolvedRelations) {
          if (mode === "overwrite") {
            // Always create in overwrite mode (we deleted everything)
            await prisma.characterRelation.create({
              data: {
                novelId: id,
                sourceCharacterId: r.sourceCharacterId,
                targetCharacterId: r.targetCharacterId,
                surfaceRelation: r.surfaceRelation,
              },
            });
            relationshipsImported++;
          } else {
            // Merge: only create if relation doesn't exist
            const existing = await prisma.characterRelation.findFirst({
              where: {
                novelId: id,
                sourceCharacterId: r.sourceCharacterId,
                targetCharacterId: r.targetCharacterId,
              },
              select: { id: true },
            });
            if (!existing) {
              await prisma.characterRelation.create({
                data: {
                  novelId: id,
                  sourceCharacterId: r.sourceCharacterId,
                  targetCharacterId: r.targetCharacterId,
                  surfaceRelation: r.surfaceRelation,
                },
              });
              relationshipsImported++;
            }
          }
        }

        res.status(200).json({
          success: true,
          count: charactersImported + relationshipsImported,
        });
      } catch (error) {
        if (error instanceof TxtParseError) {
          const resp: Record<string, unknown> = { error: error.message };
          if (error.line !== undefined) resp.line = error.line;
          if (error.detail !== undefined) resp.detail = error.detail;
          res.status(400).json(resp);
          return;
        }
        next(error);
      }
    },
  );

  /* ================================================================ */
  /*  T7: Chapter Prose TXT Export                                    */
  /* ================================================================ */

  // GET /:id/chapters/:chapterId/export/txt
  router.get(
    "/:id/chapters/:chapterId/export/txt",
    validate({ params: chapterParamsSchema }),
    async (req, res, next) => {
      try {
        const { id, chapterId } = req.params as z.infer<typeof chapterParamsSchema>;

        const chapter = await prisma.chapter.findFirst({
          where: { id: chapterId, novelId: id },
          select: {
            title: true,
            content: true,
            order: true,
            novel: { select: { title: true } },
          },
        });
        if (!chapter) {
          throw new AppError("章节不存在。", 404);
        }

        const rawContent = chapter.content ?? "";
        const plainText = rawContent ? markdownToPlainText(rawContent) : "(本章暂无内容)";

        const fileName = `${chapter.novel.title ?? "小说"}-第${chapter.order}章-${chapter.title}-${buildTimeStamp()}.txt`;
        sendTxt(res, plainText + "\n", fileName);
      } catch (error) {
        next(error);
      }
    },
  );
}
