const test = require("node:test");
const assert = require("node:assert/strict");

test("BookAnalysisCharacterMediaService - buildPortraitPrompt", async (t) => {
  const { BookAnalysisCharacterMediaService } = require("../../../dist/services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterMediaService");
  const service = new BookAnalysisCharacterMediaService();

  await t.test("builds portrait prompt with basic character info", () => {
    const character = {
      name: "云清",
      profile: {
        appearance: {
          gender: "male",
          age: "25",
          hair: "black long hair",
          eyes: "deep blue",
          height: "180cm",
          build: "slender",
          features: ["sharp jawline", "elegant brows"],
          clothing: ["white robe", "jade pendant"],
          summary: "A calm and collected swordsman.",
        },
        personality: {
          traits: ["calm", "reserved", "determined"],
        },
      },
    };
    const prompt = service.buildPortraitPrompt(character);
    assert.ok(prompt.includes("云清"));
    assert.ok(prompt.includes("male"));
    assert.ok(prompt.includes("black long hair"));
    assert.ok(prompt.includes("deep blue"));
    assert.ok(prompt.includes("white robe"));
    assert.ok(prompt.includes("Chinese fantasy"));
  });

  await t.test("builds portrait prompt with appearance excerpts", () => {
    const character = {
      name: "林月",
      profile: {
        appearance: { summary: "A mysterious beauty." },
      },
      appearances: [
        { excerpt: "她身着一袭红衣，长发如瀑布般倾泻而下。" },
        { excerpt: "她眼神清冷，嘴角微微上扬。" },
      ],
    };
    const prompt = service.buildPortraitPrompt(character);
    assert.ok(prompt.includes("林月"));
    assert.ok(prompt.includes("红衣"));
    assert.ok(prompt.includes("眼神清冷"));
  });

  await t.test("works with minimal character data", () => {
    const character = {
      name: "无名",
      profile: null,
    };
    const prompt = service.buildPortraitPrompt(character);
    assert.ok(prompt.includes("无名"));
    assert.ok(prompt.includes("Chinese fantasy"));
  });
});
