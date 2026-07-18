import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { prisma } from "../../src/db/prisma";
import { PromptTemplateOverrideService } from "../../src/prompting/templates/PromptTemplateOverrideService";
import { ADVANCED_TEMPLATE_PROMPT_ID, ADVANCED_TEMPLATE_SCOPE } from "../../src/prompting/templates/templateTypes";
import type {
  PromptTemplateJson,
  PromptTemplateOverrideView,
  PromptTemplateVersionView,
} from "../../src/prompting/templates/templateTypes";
import { hashPromptTemplate } from "../../src/prompting/templates/officialTemplates";

const service = new PromptTemplateOverrideService();

function writerTemplate(): PromptTemplateJson {
  return {
    kind: "chat",
    messages: [
      { role: "system", content: "你是写作助手。{{slot.writer.pov}}" },
      {
        role: "human",
        content: [
          "小说：{{input.novelTitle}}",
          "章节：第 {{input.chapterOrder}} 章 {{input.chapterTitle}}",
          "",
          "【书级合约】",
          "{{context.book_contract}}",
          "",
          "【章节任务】",
          "{{context.chapter_mission}}",
          "",
          "【时间线上下文】",
          "{{context.timeline_context}}",
          "",
          "【上一章钩子】",
          "{{context.previous_chapter_hook}}",
          "",
          "【人物硬事实】",
          "{{context.character_hard_facts}}",
          "",
          "【本章义务合约】",
          "{{context.obligation_contract}}",
          "",
          "【卷级窗口】",
          "{{context.volume_window}}",
          "",
          "【出场角色子集】",
          "{{context.participant_subset}}",
          "",
          "【当前局面】",
          "{{context.local_state}}",
          "",
          "【风格合约】",
          "{{context.style_contract}}",
          "",
          "只输出章节正文。",
        ].join("\n"),
      },
    ],
  };
}

function writerTemplateV2(): PromptTemplateJson {
  const t = writerTemplate();
  t.messages[1].content = t.messages[1].content + "\n\n【额外指令】\n版本2的新增内容。";
  return t;
}

describe("PromptTemplateOverrideService", () => {
  const novelId = `test-novel-${Date.now()}`;

  // 如果在迁移前运行，则通过
  before(async () => {
    try {
      await prisma.promptTemplateOverride.findFirst({ where: { novelId } });
    } catch {
      // 表不存在 → 跳过
    }
  });

  after(async () => {
    try {
      const override = await prisma.promptTemplateOverride.findUnique({
        where: { scope_novelId_promptId: { scope: ADVANCED_TEMPLATE_SCOPE, novelId, promptId: ADVANCED_TEMPLATE_PROMPT_ID } },
      });
      if (override) {
        await prisma.promptTemplateVersion.deleteMany({ where: { overrideId: override.id } });
        await prisma.promptTemplateOverride.deleteMany({ where: { novelId } });
      }
    } catch {
      // 容错
    }
  });

  describe("获取", () => {
    it("没有覆盖时为官方返回视图", async () => {
      const view = await service.get({ promptId: ADVANCED_TEMPLATE_PROMPT_ID, novelId: "nonexistent" });
      assert.equal(view.mode, "official");
      assert.equal(view.promptId, ADVANCED_TEMPLATE_PROMPT_ID);
      assert.ok(view.officialTemplate.kind === "chat");
      assert.ok(view.officialTemplate.messages.length > 0);
      assert.equal(view.versions.length, 0);
    });

    it("官方模板有已编译哈希", async () => {
      const view = await service.get({ promptId: ADVANCED_TEMPLATE_PROMPT_ID, novelId: "nonexistent" });
      assert.ok(view.officialCompiledHash.length > 0);
    });
  });

  describe("保存（T4.3）", () => {
    it("创建新的覆盖和版本", async () => {
      const template = writerTemplate();
      const view = await service.save({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
        template,
        notes: "初始版本",
      });
      assert.equal(view.mode, "custom");
      assert.ok(view.activeVersionId !== null);
      assert.ok(view.versions.length >= 1);
      const active = view.activeVersion!;
      assert.equal(active.versionNo, 1);
      assert.equal(active.notes, "初始版本");
      assert.ok(active.compiledHash.length > 0);
    });

    it("第二次保存创建新版本（versionNo = 2）", async () => {
      const templateV2 = writerTemplateV2();
      const view = await service.save({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
        template: templateV2,
        notes: "第二个版本",
      });
      assert.equal(view.versions.length, 2);
      const active = view.activeVersion!;
      assert.equal(active.versionNo, 2);
      assert.equal(active.notes, "第二个版本");
    });
  });

  describe("版本历史（T4.4）", () => {
    it("列表包含所有版本，按递减顺序", async () => {
      const view = await service.get({ promptId: ADVANCED_TEMPLATE_PROMPT_ID, novelId });
      assert.equal(view.versions.length, 2);
      assert.ok(view.versions[0].versionNo > view.versions[1].versionNo);
    });
  });

  describe("版本恢复（T4.5）", () => {
    it("激活一个旧版本", async () => {
      const view = await service.get({ promptId: ADVANCED_TEMPLATE_PROMPT_ID, novelId });
      const v1 = view.versions.find((v) => v.versionNo === 1)!;
      assert.ok(v1 !== undefined);

      const restored = await service.activateVersion({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
        versionId: v1.id,
      });
      assert.equal(restored.activeVersionId, v1.id);
      assert.equal(restored.activeVersion!.versionNo, 1);
      assert.equal(restored.mode, "custom");
    });
  });

  describe("模式切换（T4.6）", () => {
    it("恢复到官方模式", async () => {
      const view = await service.restoreOfficial({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
      });
      assert.equal(view.mode, "official");
      assert.equal(view.activeVersionId, null);
    });
  });

  describe("getActiveCustomTemplate", () => {
    it("在官方模式下返回 null", async () => {
      const result = await service.getActiveCustomTemplate({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
      });
      assert.equal(result, null);
    });

    it("在自定义模式下返回活动的自定义模板", async () => {
      // 先保存一个自定义模板
      await service.save({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
        template: writerTemplate(),
      });
      const result = await service.getActiveCustomTemplate({
        promptId: ADVANCED_TEMPLATE_PROMPT_ID,
        novelId,
      });
      assert.ok(result !== null);
      assert.equal(result!.template.kind, "chat");
      assert.ok(result!.versionNo > 0);
      assert.ok(result!.versionId.length > 0);
    });
  });

  describe("getOfficialTemplate", () => {
    it("返回官方模板、版本和引用", () => {
      const result = service.getOfficialTemplate({ promptId: ADVANCED_TEMPLATE_PROMPT_ID });
      assert.ok(result.template.kind === "chat");
      assert.ok(result.basePromptVersion.length > 0);
      assert.ok(result.contextRefs.context.length > 0);
      assert.ok(result.compiledHash.length > 0);
      assert.ok(result.allowedContextGroups.length > 0);
    });

    it("为未知 promptId 抛出错误", () => {
      assert.throws(() => {
        service.getOfficialTemplate({ promptId: "unknown.prompt.id" });
      });
    });
  });
});
