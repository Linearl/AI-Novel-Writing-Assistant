import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  getOfficialPromptTemplate,
  getOfficialPromptTemplateVersion,
  getOfficialPromptTemplateContextRefs,
  hashPromptTemplate,
} from "../../src/prompting/templates/officialTemplates";
import {
  ADVANCED_TEMPLATE_PROMPT_ID,
  WRITER_REQUIRED_CONTEXT_GROUPS,
} from "../../src/prompting/templates/templateTypes";
import type { PromptTemplateJson } from "../../src/prompting/templates/templateTypes";

describe("officialTemplates", () => {
  describe("getOfficialPromptTemplate (T3.2)", () => {
    it("返回 ADVANCED_TEMPLATE_PROMPT_ID 的有效模板", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID);
      assert.ok(template !== null);
      assert.equal(template!.kind, "chat");
      assert.ok(Array.isArray(template!.messages));
      assert.ok(template!.messages.length >= 2);
    });

    it("有一个 system 消息和一个 human 消息", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const systemMsgs = template.messages.filter((m) => m.role === "system");
      const humanMsgs = template.messages.filter((m) => m.role === "human");
      assert.ok(systemMsgs.length >= 1);
      assert.ok(humanMsgs.length >= 1);
    });

    it("system 包含中文指令", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const systemMsg = template.messages.find((m) => m.role === "system")!;
      assert.ok(systemMsg.content.includes("写作助手") || systemMsg.content.includes("小说"));
    });

    it("human 包含上下文 token 占位符", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const humanMsg = template.messages.find((m) => m.role === "human")!;
      assert.ok(humanMsg.content.includes("{{context.book_contract}}"));
      assert.ok(humanMsg.content.includes("{{input.novelTitle}}"));
    });

    it("system 包含 slot token 占位符", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const systemMsg = template.messages.find((m) => m.role === "system")!;
      assert.ok(systemMsg.content.includes("{{slot."));
    });

    it("未知 promptId 返回 null", () => {
      const template = getOfficialPromptTemplate("unknown.prompt.id");
      assert.equal(template, null);
    });
  });

  describe("getOfficialPromptTemplateVersion (T3.3)", () => {
    it("返回非空版本字符串", () => {
      const version = getOfficialPromptTemplateVersion(ADVANCED_TEMPLATE_PROMPT_ID);
      assert.ok(version !== null);
      assert.ok(typeof version === "string");
      assert.ok(version.length > 0);
    });

    it("未知 promptId 返回 null", () => {
      const version = getOfficialPromptTemplateVersion("unknown.prompt.id");
      assert.equal(version, null);
    });
  });

  describe("getOfficialPromptTemplateContextRefs (T3.4)", () => {
    it("返回上下文引用", () => {
      const refs = getOfficialPromptTemplateContextRefs(ADVANCED_TEMPLATE_PROMPT_ID);
      assert.ok(refs !== null);
      assert.ok(Array.isArray(refs!.context));
      assert.ok(Array.isArray(refs!.input));
      assert.ok(Array.isArray(refs!.slot));
    });

    it("上下文引用包含所有 WRITER_REQUIRED_CONTEXT_GROUPS", () => {
      const refs = getOfficialPromptTemplateContextRefs(ADVANCED_TEMPLATE_PROMPT_ID)!;
      for (const group of WRITER_REQUIRED_CONTEXT_GROUPS) {
        assert.ok(refs.context.includes(group), `缺失必需的上下文组：${group}`);
      }
    });

    it("输入引用包含常用的输入字段", () => {
      const refs = getOfficialPromptTemplateContextRefs(ADVANCED_TEMPLATE_PROMPT_ID)!;
      assert.ok(refs.input.includes("novelTitle"));
      assert.ok(refs.input.includes("chapterTitle"));
      assert.ok(refs.input.includes("chapterOrder"));
    });

    it("slot 引用包含 writer.* 键", () => {
      const refs = getOfficialPromptTemplateContextRefs(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const writerSlots = refs.slot.filter((s) => s.startsWith("writer."));
      assert.ok(writerSlots.length > 0);
    });

    it("未知 promptId 返回 null", () => {
      const refs = getOfficialPromptTemplateContextRefs("unknown.prompt.id");
      assert.equal(refs, null);
    });
  });

  describe("hashPromptTemplate (T3.5)", () => {
    it("生成非空十六进制哈希", () => {
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [
          { role: "system", content: "系统" },
          { role: "human", content: "你好" },
        ],
      };
      const hash = hashPromptTemplate(template);
      assert.ok(typeof hash === "string");
      assert.ok(hash.length > 0);
      assert.ok(/^[0-9a-f]+$/.test(hash));
    });

    it("相同内容生成相同哈希", () => {
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "测试" }, { role: "human", content: "用户" }],
      };
      const hash1 = hashPromptTemplate(template);
      const hash2 = hashPromptTemplate({ ...template, messages: [...template.messages] });
      assert.equal(hash1, hash2);
    });

    it("不同内容生成不同哈希", () => {
      const templateA: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "A" }, { role: "human", content: "Hello" }],
      };
      const templateB: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "B" }, { role: "human", content: "Hello" }],
      };
      assert.notEqual(hashPromptTemplate(templateA), hashPromptTemplate(templateB));
    });

    it("哈希与独立 SHA-1 计算一致", () => {
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "验证" }, { role: "human", content: "测试" }],
      };
      const expected = createHash("sha1")
        .update(JSON.stringify(template))
        .digest("hex")
        .slice(0, 16);
      assert.equal(hashPromptTemplate(template), expected);
    });
  });

  describe("官方模板完整性", () => {
    it("官方模板对 WRITER_REQUIRED_CONTEXT_GROUPS 中的所有必需组有 token", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      for (const group of WRITER_REQUIRED_CONTEXT_GROUPS) {
        const tokenPattern = `{{context.${group}}}`;
        const found = template.messages.some((m) => m.content.includes(tokenPattern));
        assert.ok(found, `官方模板中应包含 token: ${tokenPattern}`);
      }
    });

    it("官方模板 human 消息不为空", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const humanMsg = template.messages.find((m) => m.role === "human")!;
      assert.ok(humanMsg.content.trim().length > 0);
    });

    it("官方模板 system 消息不为空", () => {
      const template = getOfficialPromptTemplate(ADVANCED_TEMPLATE_PROMPT_ID)!;
      const systemMsg = template.messages.find((m) => m.role === "system")!;
      assert.ok(systemMsg.content.trim().length > 0);
    });
  });
});
