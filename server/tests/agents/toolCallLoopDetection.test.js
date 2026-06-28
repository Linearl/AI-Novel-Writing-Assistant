const test = require("node:test");
const assert = require("node:assert/strict");

// Test the stableStringify and buildToolCallKey logic directly
// Since they're not exported, we test through the RunExecutionService behavior

test("stableStringify produces consistent output regardless of key order", () => {
  // Inline the function for testing
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const a = { b: 2, a: 1 };
  const b = { a: 1, b: 2 };
  assert.equal(stableStringify(a), stableStringify(b));
  assert.equal(stableStringify(a), '{"a":1,"b":2}');
});

test("stableStringify handles nested objects", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const input = { z: { c: 3, a: 1 }, a: [3, 1, 2] };
  const result = stableStringify(input);
  assert.equal(result, '{"a":[3,1,2],"z":{"a":1,"c":3}}');
});

test("stableStringify handles primitives and null", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  assert.equal(stableStringify(null), "null");
  assert.equal(stableStringify(undefined), undefined);
  assert.equal(stableStringify(42), "42");
  assert.equal(stableStringify("hello"), '"hello"');
  assert.equal(stableStringify(true), "true");
});

test("stableStringify produces different output for different values", () => {
  function stableStringify(value) {
    if (value === null || value === undefined || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }

  const key1 = `search_knowledge:${stableStringify({ query: "hello" })}`;
  const key2 = `search_knowledge:${stableStringify({ query: "world" })}`;
  assert.notEqual(key1, key2);
});

// =============================================================================
// Integration tests — RunExecutionService.runActionPlan loop detection
// =============================================================================

// Mock toolRegistry AND db/prisma before RunExecutionService loads them.
// toolRegistry eagerly imports all tool modules which pull in the entire service
// graph (Prisma, path aliases, etc.). Our tests never reach tool execution, so a
// stub is sufficient. We also mock db/prisma to cover any other import paths.
const path = require("node:path");

const toolRegistryPath = path.resolve(__dirname, "../../dist/agents/toolRegistry.js");
require.cache[toolRegistryPath] = {
  id: toolRegistryPath,
  filename: toolRegistryPath,
  loaded: true,
  exports: {
    getAgentToolDefinition: () => undefined,
    listAgentToolDefinitions: () => [],
    listPlannerSemanticDefinitions: () => [],
  },
};

const prismaPath = path.resolve(__dirname, "../../dist/db/prisma.js");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { prisma: {} },
};

const { RunExecutionService } = require("../../dist/agents/runtime/RunExecutionService.js");

function createMockStore(overrides = {}) {
  const steps = [];
  const cachedResult = {
    id: "cached-step",
    status: "succeeded",
    outputJson: JSON.stringify({ result: "ok" }),
    createdAt: new Date().toISOString(),
  };
  const store = {
    steps,
    updateRun: async () => ({ id: "run-1", status: "running" }),
    addStep: async (input) => {
      const step = { id: `step-${steps.length}`, ...input, createdAt: new Date().toISOString() };
      steps.push(step);
      return step;
    },
    addApproval: async (input) => ({ id: `approval-${Date.now()}`, ...input }),
    getRunDetail: async () => ({
      run: { id: "run-1", status: "failed", novelId: "novel-1" },
      steps,
      approvals: [],
      metrics: {},
    }),
    findToolResultByIdempotencyKey: async () => cachedResult,
    ...overrides,
  };
  return store;
}

function makeCall(tool, input, idempotencyKey) {
  return {
    tool,
    idempotencyKey: idempotencyKey || `key-${tool}-${JSON.stringify(input)}`,
    input,
    reason: `test call ${tool}`,
    approvalSatisfied: true,
  };
}

function makeAction(agent, calls) {
  return { agent, reasoning: "test reasoning", calls };
}

function noopFailRun() {
  return Promise.resolve();
}

const defaultContext = {
  contextMode: "writing",
  provider: "openai",
  model: "gpt-4o",
};

test("T5: same tool+same params triggers LOOP_DETECTED on 3rd call", async () => {
  const store = createMockStore();
  const service = new RunExecutionService(store);

  const actions = [
    makeAction("Planner", [makeCall("search_knowledge", { query: "hello" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "hello" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "hello" })]),
  ];

  const result = await service.runActionPlan(
    "run-1",
    "test goal",
    actions,
    defaultContext,
    undefined,
    noopFailRun,
  );

  assert.equal(result.run.status, "failed");

  const loopStep = result.steps.find((s) => s.errorCode === "LOOP_DETECTED");
  assert.ok(loopStep, "should record a LOOP_DETECTED step");
  assert.equal(loopStep.stepType, "tool_result");
  assert.equal(loopStep.status, "failed");

  // Reasoning step is added before call processing, so all 3 actions get one
  const reasoningSteps = result.steps.filter((s) => s.stepType === "reasoning");
  assert.equal(reasoningSteps.length, 3, "all 3 actions get a reasoning step (loop triggers during call processing)");
});

test("T6: same tool with different params does NOT trigger loop detection", async () => {
  const cachedResult = {
    id: "cached-step",
    status: "succeeded",
    outputJson: JSON.stringify({ result: "ok" }),
    createdAt: new Date().toISOString(),
  };
  const store = createMockStore({
    findToolResultByIdempotencyKey: async () => cachedResult,
  });
  const service = new RunExecutionService(store);

  const actions = [
    makeAction("Planner", [makeCall("search_knowledge", { query: "aaa" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "bbb" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "ccc" })]),
  ];

  const result = await service.runActionPlan(
    "run-1",
    "test goal",
    actions,
    defaultContext,
    undefined,
    noopFailRun,
  );

  const loopStep = result.steps.find((s) => s.errorCode === "LOOP_DETECTED");
  assert.equal(loopStep, undefined, "should NOT trigger loop detection with different params");

  // All 3 actions should complete
  const reasoningSteps = result.steps.filter((s) => s.stepType === "reasoning");
  assert.equal(reasoningSteps.length, 3, "all 3 actions should complete");
});

test("T7: different tools with same params does NOT trigger loop detection", async () => {
  const cachedResult = {
    id: "cached-step",
    status: "succeeded",
    outputJson: JSON.stringify({ result: "ok" }),
    createdAt: new Date().toISOString(),
  };
  const store = createMockStore({
    findToolResultByIdempotencyKey: async () => cachedResult,
  });
  const service = new RunExecutionService(store);

  // Use 3 different tools that Planner is allowed to call
  const actions = [
    makeAction("Planner", [makeCall("search_knowledge", { query: "hello" })]),
    makeAction("Planner", [makeCall("list_novels", { query: "hello" })]),
    makeAction("Planner", [makeCall("get_novel_context", { query: "hello" })]),
  ];

  const result = await service.runActionPlan(
    "run-1",
    "test goal",
    actions,
    defaultContext,
    undefined,
    noopFailRun,
  );

  const loopStep = result.steps.find((s) => s.errorCode === "LOOP_DETECTED");
  assert.equal(loopStep, undefined, "should NOT trigger loop detection with different tools");

  const reasoningSteps = result.steps.filter((s) => s.stepType === "reasoning");
  assert.equal(reasoningSteps.length, 3, "all 3 actions should complete");
});

test("T8: interleaved calls still trigger loop detection on 3rd same-key occurrence", async () => {
  const store = createMockStore();
  const service = new RunExecutionService(store);

  // Pattern: A(a), A(b), A(a), A(b), A(a)
  // The 5th call is the 3rd occurrence of key "search_knowledge:{...a}" -> triggers
  const actions = [
    makeAction("Planner", [makeCall("search_knowledge", { query: "alpha" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "beta" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "alpha" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "beta" })]),
    makeAction("Planner", [makeCall("search_knowledge", { query: "alpha" })]),
  ];

  const result = await service.runActionPlan(
    "run-1",
    "test goal",
    actions,
    defaultContext,
    undefined,
    noopFailRun,
  );

  assert.equal(result.run.status, "failed");

  const loopStep = result.steps.find((s) => s.errorCode === "LOOP_DETECTED");
  assert.ok(loopStep, "should record a LOOP_DETECTED step");

  // 5 reasoning steps: one per action (loop triggers during 5th action's call processing)
  const reasoningSteps = result.steps.filter((s) => s.stepType === "reasoning");
  assert.equal(reasoningSteps.length, 5, "all 5 actions get a reasoning step (loop triggers during call processing)");
});
