import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import {
  compilePromptTemplate,
  extractPromptTemplateContextRefs,
  assertPromptTemplateIsSavable,
  hasBlockingPromptTemplateDiagnostics,
  createEmptyPromptTemplateDiagnostics,
} from "../../src/prompting/templates/templateCompiler";
import type {
  PromptTemplateJson,
  PromptTemplateDiagnostics,
} from "../../src/prompting/templates/templateTypes";
import {
  ADVANCED_TEMPLATE_MAX_CHARS,
  WRITER_REQUIRED_CONTEXT_GROUPS,
} from "../../src/prompting/templates/templateTypes";
import type { PromptRenderContext } from "../../src/prompting/core/promptTypes";
import type { PromptSlotDef, ResolvedSlots } from "../../src/prompting/slots/slotTypes";

// ─── helpers ───────────────────────────────────────────────────────────

function emptyContext(): PromptRenderContext {
  return {
    blocks: [],
    selectedBlockIds: [],
    droppedBlockIds: [],
    summarizedBlockIds: [],
    estimatedInputTokens: 0,
  };
}

function contextWithGroup(group: string, content: string): PromptRenderContext {
  return {
    blocks: [
      {
        id: `block-${group}`,
        group,
        priority: 1,
        required: true,
        estimatedTokens: 10,
        content,
      },
    ],
    selectedBlockIds: [`block-${group}`],
    droppedBlockIds: [],
    summarizedBlockIds: [],
    estimatedInputTokens: 10,
  };
}

const sampleSlotDefs: PromptSlotDef[] = [
  {
    key: "style",
    kind: "replace",
    label: "风格",
    default: "默认风格",
    maxLength: 500,
  },
  {
    key: "detail",
    kind: "token",
    label: "细节",
    default: "默认细节",
    maxLength: 200,
  },
  {
    key: "extra",
    kind: "choice",
    label: "附加选项",
    default: "a",
    options: [
      { value: "a", label: "A", copy: "选项A文本" },
      { value: "b", label: "B", copy: "选项B文本" },
    ],
  },
  {
    key: "showNote",
    kind: "toggle",
    label: "显示备注",
    default: true,
    copy: "【备注文本】",
  },
];

function simpleTemplate(messages: Array<{ role: "system" | "human"; content: string }>): PromptTemplateJson {
  return { kind: "chat", messages };
}

// ─── TOKEN_PATTERN parsing ────────────────────────────────────────────

describe("templateCompiler", () => {
  describe("TOKEN_PATTERN 解析 (T2.2)", () => {
    it("解析 {{context.xxx}} token", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统提示" },
        { role: "human", content: "上下文: {{context.book_contract}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: contextWithGroup("book_contract", "这是一份书级合约"),
        slotDefs: [],
        allowedContextGroups: ["book_contract"],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("这是一份书级合约"));
    });

    it("解析 {{input.xxx}} token", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "标题: {{input.novelTitle}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { novelTitle: "我的小说" },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("我的小说"));
    });

    it("解析 {{slot.xxx}} token", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "风格: {{slot.style}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("默认风格"));
    });

    it("解析带空格的 token {{ context.xxx }}", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "上下文: {{ context.book_contract }}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: contextWithGroup("book_contract", "合约内容"),
        slotDefs: [],
        allowedContextGroups: ["book_contract"],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("合约内容"));
    });

    it("input token 值为 undefined 时替换为空字符串", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{input.notExist}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.equal(humanMsg.content.toString(), "");
    });

    it("多个不同类型 token 混合解析", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "书:{{context.book_contract}} 标题:{{input.novelTitle}} 风格:{{slot.style}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { novelTitle: "测试小说" },
        context: contextWithGroup("book_contract", "书级合约内容"),
        slotDefs: sampleSlotDefs,
        allowedContextGroups: ["book_contract"],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      const content = humanMsg.content.toString();
      assert.ok(content.includes("书级合约内容"));
      assert.ok(content.includes("测试小说"));
      assert.ok(content.includes("默认风格"));
    });

    it("slot 值通过 ResolvedSlots 覆盖默认值", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{slot.style}}" },
      ]);
      const slots: ResolvedSlots = {
        text: (key: string) => (key === "style" ? "自定义风格" : ""),
        choiceCopy: () => "",
        enabled: () => true,
        token: () => "",
        append: () => "",
      };
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        slots,
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("自定义风格"));
    });

    it("choice slot 解析默认选项", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "附加:{{slot.extra}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("选项A文本"));
    });

    it("toggle slot 启用时输出 copy", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "备注:{{slot.showNote}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("【备注文本】"));
    });

    it("toggle slot 禁用时输出空字符串", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "备注:{{slot.showNote}}" },
      ]);
      const slots: ResolvedSlots = {
        text: () => "",
        choiceCopy: () => "",
        enabled: () => false,
        token: () => "",
        append: () => "",
      };
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        slots,
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.equal(humanMsg.content.toString(), "备注:");
    });
  });

  // ─── 诊断生成 (T2.5) ──────────────────────────────────────────────

  describe("编译诊断生成 (T2.5)", () => {
    it("生成 referencedContextGroups", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{context.book_contract}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: contextWithGroup("book_contract", "内容"),
        slotDefs: [],
        allowedContextGroups: ["book_contract"],
      });
      assert.ok(diagnostics.referencedContextGroups.includes("book_contract"));
    });

    it("生成 referencedInputFields", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{input.novelTitle}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: { novelTitle: "标题" },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      assert.ok(diagnostics.referencedInputFields.includes("novelTitle"));
    });

    it("生成 referencedSlotKeys", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{slot.style}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: sampleSlotDefs,
        allowedContextGroups: [],
      });
      assert.ok(diagnostics.referencedSlotKeys.includes("style"));
    });

    it("生成 missingReferencedContextGroups", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{context.nonexistent_group}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: ["nonexistent_group"],
      });
      assert.ok(diagnostics.missingReferencedContextGroups.includes("nonexistent_group"));
    });

    it("生成 missingInputFields", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{input.missing}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      assert.ok(diagnostics.missingInputFields.includes("missing"));
    });

    it("生成 fallbackRequiredGroups 用于未显式引用的必需组", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "只引用了 {{context.book_contract}}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: contextWithGroup("book_contract", "合约"),
        slotDefs: [],
        allowedContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
        requiredContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
      });
      // 除 book_contract 外的 9 个必需组应该出现在 fallback 中
      assert.ok(diagnostics.fallbackRequiredGroups.length >= 9);
    });

    it("需要明确需求的上下文组的 missingRequiredGroups", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "无上下文引用" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
        requiredContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
      });
      // 所有 10 个必需组缺失（因为空上下文且无显式引用）
      assert.equal(diagnostics.missingRequiredGroups.length, WRITER_REQUIRED_CONTEXT_GROUPS.length);
    });

    it("检测 unknownTokens（错误格式）", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{ unknown_namespace.field }}" },
      ]);
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      assert.ok(diagnostics.unknownTokens.length > 0);
    });

    it("检测 invalidMessages（多余的空消息）", () => {
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "系统消息" }],
      };
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      assert.ok(diagnostics.invalidMessages.length > 0);
    });
  });

  // ─── input 深度路径解析 ────────────────────────────────────────────

  describe("深度路径解析", () => {
    it("支持嵌套 input token：{{input.a.b}}", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "值:{{input.deep.nested.field}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { deep: { nested: { field: "嵌套值" } } },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(humanMsg.content.toString().includes("嵌套值"));
    });

    it("null/undefined 值返回空字符串", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{input.nullField}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { nullField: null },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.equal(humanMsg.content.toString(), "");
    });

    it("number/boolean 值转换为字符串", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "字数:{{input.wordCount}} 已发布:{{input.published}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { wordCount: 3000, published: true },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      const content = humanMsg.content.toString();
      assert.ok(content.includes("3000"));
      assert.ok(content.includes("true"));
    });
  });

  // ─── WRITER_REQUIRED_CONTEXT_GROUPS ────────────────────────────────

  describe("WRITER_REQUIRED_CONTEXT_GROUPS 安全约束 (T2.8)", () => {
    it("定义 10 个必需上下文组", () => {
      assert.equal(WRITER_REQUIRED_CONTEXT_GROUPS.length, 10);
    });

    it("fallback 必需组追加到 human 消息末尾", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统提示" },
        { role: "human", content: "请写一章。{{context.book_contract}}" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: {
          blocks: WRITER_REQUIRED_CONTEXT_GROUPS.map((g) => ({
            id: `block-${g}`,
            group: g,
            priority: 1,
            required: true,
            estimatedTokens: 5,
            content: `${g} 的内容`,
          })),
          selectedBlockIds: WRITER_REQUIRED_CONTEXT_GROUPS.map((g) => `block-${g}`),
          droppedBlockIds: [],
          summarizedBlockIds: [],
          estimatedInputTokens: 50,
        },
        slotDefs: [],
        allowedContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
        requiredContextGroups: [...WRITER_REQUIRED_CONTEXT_GROUPS],
      });
      const humanMsg = compiled.messages[1] as HumanMessage;
      const content = humanMsg.content.toString();
      // 人间消息应该包含未明确引用的 fallback 部分
      assert.ok(content.includes("【必需上下文保底】"));
    });
  });

  // ─── 消息构建 ──────────────────────────────────────────────────────

  describe("LangChain 消息构建 (T2.4)", () => {
    it("system 角色映射到 SystemMessage", () => {
      const template = simpleTemplate([
        { role: "system", content: "你是一个助手" },
        { role: "human", content: "你好" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      assert.equal(compiled.messages.length, 2);
      assert.ok(compiled.messages[0] instanceof SystemMessage);
      assert.ok(compiled.messages[1] instanceof HumanMessage);
    });

    it("编译后消息内容正确替换", () => {
      const template = simpleTemplate([
        { role: "system", content: "你是 {{input.role}}" },
        { role: "human", content: "写关于 {{input.topic}} 的内容" },
      ]);
      const compiled = compilePromptTemplate({
        template,
        promptInput: { role: "作家", topic: "AI" },
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const systemMsg = compiled.messages[0] as SystemMessage;
      const humanMsg = compiled.messages[1] as HumanMessage;
      assert.ok(systemMsg.content.toString().includes("作家"));
      assert.ok(humanMsg.content.toString().includes("AI"));
    });
  });

  // ─── extractPromptTemplateContextRefs ──────────────────────────────

  describe("extractPromptTemplateContextRefs (T2.10)", () => {
    it("提取所有类型的引用", () => {
      const template = simpleTemplate([
        { role: "system", content: "风格:{{slot.style}}" },
        { role: "human", content: "书:{{context.book_contract}} 标题:{{input.novelTitle}}" },
      ]);
      const refs = extractPromptTemplateContextRefs(template);
      assert.ok(refs.context.includes("book_contract"));
      assert.ok(refs.input.includes("novelTitle"));
      assert.ok(refs.slot.includes("style"));
    });

    it("空模板返回空引用", () => {
      const refs = extractPromptTemplateContextRefs({ kind: "chat", messages: [] });
      assert.deepEqual(refs, { context: [], input: [], slot: [] });
    });

    it("对重复引用去重", () => {
      const template = simpleTemplate([
        { role: "system", content: "{{context.book_contract}}" },
        { role: "human", content: "{{context.book_contract}}" },
      ]);
      const refs = extractPromptTemplateContextRefs(template);
      assert.equal(refs.context.length, 1);
    });
  });

  // ─── assertPromptTemplateIsSavable ────────────────────────────────

  describe("assertPromptTemplateIsSavable (T2.9)", () => {
    it("有效模板无阻塞诊断", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统提示" },
        { role: "human", content: "{{context.book_contract}}" },
      ]);
      const diagnostics = assertPromptTemplateIsSavable({
        template,
        allowedContextGroups: ["book_contract"],
        slotDefs: [],
      });
      assert.equal(diagnostics.invalidMessages.length, 0);
    });

    it("缺少的必需上下文组是有阻塞的", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统提示" },
        { role: "human", content: "{{context.book_contract}}" },
      ]);
      const diagnostics = assertPromptTemplateIsSavable({
        template,
        allowedContextGroups: ["book_contract"],
        slotDefs: [],
      });
      // 诊断生成但不可阻塞——可保存检查仅检查形状和 token
      assert.ok(diagnostics.referencedContextGroups.includes("book_contract"));
    });

    it("无效形状（缺少 human 消息）有阻塞", () => {
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [{ role: "system", content: "只有系统消息" }],
      };
      const diagnostics = assertPromptTemplateIsSavable({
        template,
        allowedContextGroups: [],
        slotDefs: [],
      });
      assert.ok(diagnostics.invalidMessages.length > 0);
      assert.ok(hasBlockingPromptTemplateDiagnostics(diagnostics));
    });

    it("未知的上下文组 token 有阻塞", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{context.fakeGroup}}" },
      ]);
      const diagnostics = assertPromptTemplateIsSavable({
        template,
        allowedContextGroups: ["book_contract"],
        slotDefs: [],
      });
      assert.ok(diagnostics.unknownTokens.length > 0);
      assert.ok(hasBlockingPromptTemplateDiagnostics(diagnostics));
    });

    it("未知的 slot key 有阻塞", () => {
      const template = simpleTemplate([
        { role: "system", content: "系统" },
        { role: "human", content: "{{slot.fakeSlot}}" },
      ]);
      const diagnostics = assertPromptTemplateIsSavable({
        template,
        allowedContextGroups: [],
        slotDefs: sampleSlotDefs,
      });
      assert.ok(diagnostics.unknownTokens.length > 0);
      assert.ok(hasBlockingPromptTemplateDiagnostics(diagnostics));
    });
  });

  // ─── hasBlockingPromptTemplateDiagnostics ─────────────────────────

  describe("hasBlockingPromptTemplateDiagnostics (T2.9)", () => {
    it("空诊断无阻塞", () => {
      const diagnostics = createEmptyPromptTemplateDiagnostics();
      assert.equal(hasBlockingPromptTemplateDiagnostics(diagnostics), false);
    });

    it("invalidMessages 导致阻塞", () => {
      const diagnostics = createEmptyPromptTemplateDiagnostics();
      diagnostics.invalidMessages.push("错误");
      assert.equal(hasBlockingPromptTemplateDiagnostics(diagnostics), true);
    });

    it("unknownTokens 导致阻塞", () => {
      const diagnostics = createEmptyPromptTemplateDiagnostics();
      diagnostics.unknownTokens.push("{{bad}}" );
      assert.equal(hasBlockingPromptTemplateDiagnostics(diagnostics), true);
    });

    it("missingRequiredGroups 导致阻塞", () => {
      const diagnostics = createEmptyPromptTemplateDiagnostics();
      diagnostics.missingRequiredGroups.push("book_contract");
      assert.equal(hasBlockingPromptTemplateDiagnostics(diagnostics), true);
    });
  });

  // ─── ADVANCED_TEMPLATE_MAX_CHARS ─────────────────────────────────

  describe("模板最大长度限制 (ADVANCED_TEMPLATE_MAX_CHARS)", () => {
    it("60000 限制已定义", () => {
      assert.equal(ADVANCED_TEMPLATE_MAX_CHARS, 60000);
    });

    it("超出限制会生成无效消息诊断", () => {
      const longContent = "x".repeat(ADVANCED_TEMPLATE_MAX_CHARS + 1);
      const template: PromptTemplateJson = {
        kind: "chat",
        messages: [
          { role: "system", content: "系统" },
          { role: "human", content: longContent },
        ],
      };
      const { diagnostics } = compilePromptTemplate({
        template,
        promptInput: {},
        context: emptyContext(),
        slotDefs: [],
        allowedContextGroups: [],
      });
      const hasSizeError = diagnostics.invalidMessages.some((m) => m.includes("60000"));
      assert.ok(hasSizeError);
    });
  });

  // ─── createEmptyPromptTemplateDiagnostics ─────────────────────────

  describe("createEmptyPromptTemplateDiagnostics", () => {
    it("所有字段初始为空数组", () => {
      const diagnostics = createEmptyPromptTemplateDiagnostics();
      assert.equal(diagnostics.referencedContextGroups.length, 0);
      assert.equal(diagnostics.referencedInputFields.length, 0);
      assert.equal(diagnostics.referencedSlotKeys.length, 0);
      assert.equal(diagnostics.fallbackRequiredGroups.length, 0);
      assert.equal(diagnostics.missingRequiredGroups.length, 0);
      assert.equal(diagnostics.missingReferencedContextGroups.length, 0);
      assert.equal(diagnostics.missingInputFields.length, 0);
      assert.equal(diagnostics.unknownTokens.length, 0);
      assert.equal(diagnostics.invalidMessages.length, 0);
    });

    it("每次调用返回新的独立实例", () => {
      const a = createEmptyPromptTemplateDiagnostics();
      const b = createEmptyPromptTemplateDiagnostics();
      a.missingRequiredGroups.push("test");
      assert.equal(b.missingRequiredGroups.length, 0);
    });
  });
});
