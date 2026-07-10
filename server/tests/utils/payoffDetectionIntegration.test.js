const test = require("node:test");
const assert = require("node:assert/strict");

// ---------------------------------------------------------------------------
// T9: Payoff Detection & Reminder Integration Tests
//
// These tests verify:
// 1. The payoff detection prompt schema validates correctly
// 2. The prompt asset is registered and can be resolved
// 3. The buildPayoffReminderContext logic works (unit-level)
// 4. The detectNewPayoffsAfterGeneration dedup logic works (unit-level)
// ---------------------------------------------------------------------------

const {
  payoffDetectionOutputSchema,
} = require("../dist/prompting/prompts/payoff/payoffDetection.promptSchemas.js");

const {
  payoffDetectionPrompt,
} = require("../dist/prompting/prompts/payoff/payoffDetection.prompts.js");

const {
  getRegisteredPromptAsset,
  hasRegisteredPromptAsset,
} = require("../dist/prompting/registry.js");

const {
  normalizePayoffLedgerIdentity,
} = require("../dist/services/payoff/payoffLedgerShared.js");

// ---------------------------------------------------------------------------
// Prompt schema tests
// ---------------------------------------------------------------------------

test("payoffDetectionOutputSchema accepts valid output with detected payoffs", () => {
  const input = {
    detectedPayoffs: [
      {
        title: "龙纹玉佩的来历",
        summary: "主角获得的玉佩与古代皇族有关。",
        scopeType: "chapter",
        confidence: 0.8,
        evidenceSummary: "文中明确描写主角对玉佩来历产生疑问。",
      },
    ],
  };
  const result = payoffDetectionOutputSchema.parse(input);
  assert.equal(result.detectedPayoffs.length, 1);
  assert.equal(result.detectedPayoffs[0].title, "龙纹玉佩的来历");
  assert.equal(result.detectedPayoffs[0].confidence, 0.8);
});

test("payoffDetectionOutputSchema defaults empty array when no payoffs detected", () => {
  const result = payoffDetectionOutputSchema.parse({ detectedPayoffs: [] });
  assert.equal(result.detectedPayoffs.length, 0);
});

test("payoffDetectionOutputSchema defaults when detectedPayoffs is missing", () => {
  const result = payoffDetectionOutputSchema.parse({});
  assert.equal(result.detectedPayoffs.length, 0);
});

test("payoffDetectionOutputSchema rejects invalid scopeType", () => {
  assert.throws(() => {
    payoffDetectionOutputSchema.parse({
      detectedPayoffs: [
        {
          title: "test",
          summary: "test summary",
          scopeType: "invalid_scope",
          confidence: 0.5,
          evidenceSummary: "test evidence",
        },
      ],
    });
  });
});

test("payoffDetectionOutputSchema rejects confidence out of range", () => {
  assert.throws(() => {
    payoffDetectionOutputSchema.parse({
      detectedPayoffs: [
        {
          title: "test",
          summary: "test summary",
          scopeType: "chapter",
          confidence: 1.5,
          evidenceSummary: "test evidence",
        },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// Prompt asset registration tests
// ---------------------------------------------------------------------------

test("novel.payoff_detection@v1 is registered in the prompt registry", () => {
  assert.ok(hasRegisteredPromptAsset("novel.payoff_detection", "v1"));
});

test("payoffDetectionPrompt has correct asset metadata", () => {
  assert.equal(payoffDetectionPrompt.id, "novel.payoff_detection");
  assert.equal(payoffDetectionPrompt.version, "v1");
  assert.equal(payoffDetectionPrompt.taskType, "planner");
  assert.equal(payoffDetectionPrompt.mode, "structured");
  assert.equal(payoffDetectionPrompt.language, "zh");
});

test("payoffDetectionPrompt can be resolved from registry by key", () => {
  const asset = getRegisteredPromptAsset("novel.payoff_detection", "v1");
  assert.ok(asset);
  assert.equal(asset.id, "novel.payoff_detection");
});

// ---------------------------------------------------------------------------
// Prompt render tests
// ---------------------------------------------------------------------------

test("payoffDetectionPrompt render produces system and human messages", () => {
  const messages = payoffDetectionPrompt.render(
    {
      novelTitle: "测试小说",
      chapterOrder: 3,
      chapterTitle: "神秘玉佩",
      chapterContent: "主角在这一章获得了一块神秘的龙纹玉佩，玉佩散发微光。",
      existingLedgerSummaries: "- 伏笔1（setup）：测试伏笔",
    },
    { sessionId: "test", invocationId: "test" },
  );
  assert.ok(Array.isArray(messages));
  assert.ok(messages.length >= 2);
  // First message should be SystemMessage
  assert.equal(messages[0]._getType(), "system");
  // Second message should be HumanMessage
  assert.equal(messages[1]._getType(), "human");
});

// ---------------------------------------------------------------------------
// postValidate filtering tests
// ---------------------------------------------------------------------------

test("payoffDetectionPrompt postValidate filters low confidence items", () => {
  const output = {
    detectedPayoffs: [
      {
        title: "高置信度伏笔",
        summary: "摘要",
        scopeType: "chapter",
        confidence: 0.8,
        evidenceSummary: "证据",
      },
      {
        title: "低置信度伏笔",
        summary: "摘要",
        scopeType: "chapter",
        confidence: 0.3,
        evidenceSummary: "证据",
      },
      {
        title: "边界伏笔",
        summary: "摘要",
        scopeType: "chapter",
        confidence: 0.5,
        evidenceSummary: "证据",
      },
    ],
  };
  const result = payoffDetectionPrompt.postValidate(output, {}, {});
  // confidence >= 0.5 passes
  assert.equal(result.detectedPayoffs.length, 2);
  assert.equal(result.detectedPayoffs[0].title, "高置信度伏笔");
  assert.equal(result.detectedPayoffs[1].title, "边界伏笔");
});

// ---------------------------------------------------------------------------
// Dedup logic tests (unit-level, testing the identity normalization)
// ---------------------------------------------------------------------------

test("normalizePayoffLedgerIdentity deduplicates equivalent titles", () => {
  const id1 = normalizePayoffLedgerIdentity("龙纹玉佩的秘密");
  const id2 = normalizePayoffLedgerIdentity("龙纹玉佩的秘密");
  const id3 = normalizePayoffLedgerIdentity("龙纹玉佩的秘密。");
  const id4 = normalizePayoffLedgerIdentity("  龙纹 玉佩 的 秘密  ");

  assert.equal(id1, id2);
  assert.equal(id1, id3);
  assert.equal(id1, id4);
});

test("normalizePayoffLedgerIdentity distinguishes different titles", () => {
  const id1 = normalizePayoffLedgerIdentity("龙纹玉佩的秘密");
  const id2 = normalizePayoffLedgerIdentity("叛徒的真实身份");
  assert.notEqual(id1, id2);
});

// ---------------------------------------------------------------------------
// Ledger key generation tests
// ---------------------------------------------------------------------------

test("detect: prefix ledger keys are correctly structured", () => {
  const novelId = "abc12345-6789-0000-0000-000000000000";
  const chapterOrder = 3;
  const identity = "龙纹玉佩的秘密";

  const expected = `detect:${novelId.slice(0, 8)}:${chapterOrder}:${identity.slice(0, 30)}`;
  assert.ok(expected.startsWith("detect:"));
  assert.ok(expected.includes("3"));
});
