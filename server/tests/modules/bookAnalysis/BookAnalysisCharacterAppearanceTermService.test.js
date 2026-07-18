const test = require("node:test");
const assert = require("node:assert/strict");

test("BookAnalysisCharacterAppearanceTermService - normalizeTerm", async (t) => {
  const { BookAnalysisCharacterAppearanceTermService } = require("../../../dist/services/bookAnalysis/bookAnalysisCharacter/BookAnalysisCharacterAppearanceTermService");
  const service = new BookAnalysisCharacterAppearanceTermService();

  await t.test("normalizes known hair terms", () => {
    assert.equal(service.normalizeTerm("hair", "黑色头发"), "黑发");
    assert.equal(service.normalizeTerm("hair", "白发"), "白发");
    assert.equal(service.normalizeTerm("hair", "银发"), "银发");
    assert.equal(service.normalizeTerm("hair", "花白"), "花白发");
    assert.equal(service.normalizeTerm("hair", "斑白"), "花白发");
  });

  await t.test("normalizes known eye terms", () => {
    assert.equal(service.normalizeTerm("eyes", "黑眸"), "黑瞳");
    assert.equal(service.normalizeTerm("eyes", "蓝眸"), "蓝瞳");
    assert.equal(service.normalizeTerm("eyes", "深邃"), "深瞳");
    assert.equal(service.normalizeTerm("eyes", "明亮"), "亮瞳");
  });

  await t.test("normalizes known body type terms", () => {
    assert.equal(service.normalizeTerm("body", "修长"), "修长");
    assert.equal(service.normalizeTerm("body", "高挑"), "高挑");
    assert.equal(service.normalizeTerm("body", "纤细"), "纤瘦");
  });

  await t.test("normalizes known clothing terms", () => {
    assert.equal(service.normalizeTerm("clothing", "长袍"), "长袍");
    assert.equal(service.normalizeTerm("clothing", "白袍"), "白袍");
  });

  await t.test("returns original term truncated to 10 chars if no match", () => {
    assert.equal(service.normalizeTerm("eyes", "非常罕见的瞳孔颜色"), "非常罕见的瞳孔颜色".slice(0, 10));
  });
});
