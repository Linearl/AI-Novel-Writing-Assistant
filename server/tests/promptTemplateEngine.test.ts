import { describe, it } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

// Inline the loader logic to avoid path resolution issues in test context
import * as fs from "node:fs";
import * as yaml from "js-yaml";
import { renderPrompt } from "../src/data/prompts/renderer";

const PROMPTS_DIR = path.resolve(__dirname, "../src/prompts");

interface PromptDefinition {
  id: string;
  version: string;
  system: string;
  user?: string;
  variables: string[];
}

function loadPromptForTest(id: string): PromptDefinition {
  const filename = id.replace(/\./g, "-") + ".yaml";
  const filePath = path.join(PROMPTS_DIR, filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw) as Record<string, unknown>;
  return {
    id: parsed.id as string,
    version: String(parsed.version ?? "1"),
    system: parsed.system as string,
    user: typeof parsed.user === "string" ? (parsed.user as string) : undefined,
    variables: Array.isArray(parsed.variables) ? (parsed.variables as string[]) : [],
  };
}

describe("prompt template engine", () => {
  describe("renderer", () => {
    it("replaces {var} placeholders with provided values", () => {
      const template = "Hello {name}, welcome to {place}!";
      const result = renderPrompt(template, { name: "World", place: "Earth" });
      assert.equal(result, "Hello World, welcome to Earth!");
    });

    it("keeps unmatched placeholders as-is", () => {
      const template = "Hello {name}, your code is {status}";
      const result = renderPrompt(template, { name: "Alice" });
      assert.equal(result, "Hello Alice, your code is {status}");
    });

    it("handles empty vars object", () => {
      const template = "No variables here";
      const result = renderPrompt(template, {});
      assert.equal(result, "No variables here");
    });

    it("handles multiple occurrences of same variable", () => {
      const template = "{x} and {x} again";
      const result = renderPrompt(template, { x: "yes" });
      assert.equal(result, "yes and yes again");
    });
  });

  describe("YAML loader", () => {
    it("loads novel-character-extraction prompt", () => {
      const prompt = loadPromptForTest("novel.character-extraction");
      assert.equal(prompt.id, "novel.character-extraction");
      assert.equal(prompt.version, "1");
      assert.ok(prompt.system.includes("你是角色信息提取器"));
      assert.ok(prompt.system.includes("【铁律】"));
      assert.ok(prompt.system.includes("输出纯 JSON"));
      assert.ok(prompt.user!.includes("{outlineText}"));
      assert.deepEqual(prompt.variables, ["outlineText"]);
    });

    it("loads json-repair prompt", () => {
      const prompt = loadPromptForTest("llm.json-repair");
      assert.equal(prompt.id, "llm.json-repair");
      assert.ok(prompt.system.includes("你是 JSON 修复器"));
      assert.ok(prompt.system.includes("不要输出任何解释"));
      assert.equal(prompt.user, undefined);
      assert.deepEqual(prompt.variables, []);
    });

    it("loads character-refine prompt", () => {
      const prompt = loadPromptForTest("character.refine");
      assert.equal(prompt.id, "character.refine");
      assert.ok(prompt.system.includes("你是角色微调编辑"));
      assert.ok(prompt.system.includes("硬规则"));
      assert.equal(prompt.user, undefined);
      assert.deepEqual(prompt.variables, []);
    });
  });

  describe("prompt content consistency", () => {
    // YAML block scalar (|) appends a trailing newline — this is expected
    // and harmless for LLM prompts. We trim for comparison.
    it("novel-character-extraction system prompt matches original inline text", () => {
      const prompt = loadPromptForTest("novel.character-extraction");
      const expected = [
        "你是角色信息提取器。严格从素材文本中提取角色和关系，禁止编造任何信息。",
        "",
        "【铁律】",
        "1. 只提取素材中明确出现的角色和关系",
        "2. 角色名必须逐字抄录，不得改写、翻译或近似",
        "3. 如果素材没有提到某字段，该字段留空，不得猜测",
        "4. 素材中没提到的角色一个都不要加",
        "5. relations 中的 sourceName/targetName 必须与 characters 中的 name 完全一致",
        "",
        "【字段说明】",
        "characters[].name: 角色姓名，逐字从原文摘录",
        "characters[].role: 角色定位（主角/反派/配角/女主/未指定）",
        "characters[].gender: male/female/other/unknown",
        "characters[].personality: 性格描述",
        "characters[].background: 背景/身世摘要",
        "characters[].relationToProtagonist: 与主角的关系",
        "characters[].storyFunction: 故事中的功能/作用",
        "",
        "relations 字段: 素材中明确提到的角色间关系，每条包含:",
        "sourceName: 关系来源角色名（如\"江夜\"）",
        "targetName: 关系目标角色名（如\"季星灼\"）",
        "surfaceRelation: 表面关系描述（如\"前恋人/背叛者\"、\"救赎与被救赎\"）",
        "hiddenTension: 隐藏的情感张力（选填）",
        "conflictSource: 冲突来源（选填）",
        "",
        "输出纯 JSON：{\"characters\": [...], \"relations\": [...]}",
      ].join("\n");
      assert.equal(prompt.system.trimEnd(), expected);
    });

    it("json-repair system prompt matches original inline text", () => {
      const prompt = loadPromptForTest("llm.json-repair");
      const expected = [
        "你是 JSON 修复器。",
        "你的任务是：只输出严格合法的 JSON 值，并且必须通过给定的结构校验。",
        "最终输出可能是 JSON 对象，也可能是 JSON 数组；必须与目标结构一致。",
        "不要输出任何解释、Markdown 或额外字段。",
        "如果校验错误提示某个字段缺失，必须直接使用错误路径里的字段名作为 JSON 键名，不要翻译成中文别名。",
        "如果目标结构顶层是数组，就直接输出数组本身，不要再外包一层对象。",
        "如果某个字段要求是数组，就必须输出 JSON 数组；即使只有一个元素，也不能压成字符串、数字或对象。",
        "如果数组元素应为对象，就必须输出对象数组，例如 [{...}]；不能写成逗号拼接字符串。",
        "如果原始 JSON 多包了一层无关包装键，例如 data、result、output、xxxProjection、xxxList 等，必须去掉包装层，把真正目标结构提升到顶层。",
        "如果缺失必填字符串字段，必须补出非空字符串；可根据原始 JSON 中已有内容做最小、保守、语义一致的补全，不能输出空字符串、null 或 undefined。",
        "如果校验错误是 expected string, received number/boolean，必须保留原值语义并改成 JSON 字符串，例如 19 改为 \"19\"、true 改为 \"true\"，不要删除字段。",
        "如果校验错误指出某个数组数量过多或过少，必须把该路径的数组长度修正到错误里要求的精确数量，不能停留在接近正确的数量。",
      ].join("\n");
      assert.equal(prompt.system.trimEnd(), expected);
    });

    it("character-refine system prompt matches original inline text", () => {
      const prompt = loadPromptForTest("character.refine");
      const expected = [
        "你是角色微调编辑。用户对一个已生成的角色候选提出了调整要求，你需要在保持角色整体定位不变的前提下，按要求修改对应字段。",
        "",
        "硬规则：",
        "1. 只修改用户明确要求调整的字段，其余字段保持原样。",
        "2. 修改后的角色必须仍然能直接进入正文使用。",
        "3. 不得改变角色姓名（name 字段必须保持不变）。",
        "4. 输出严格 JSON，不要输出 Markdown 或额外文本。",
        "5. 所有文本使用简体中文。",
      ].join("\n");
      assert.equal(prompt.system.trimEnd(), expected);
    });
  });
});
