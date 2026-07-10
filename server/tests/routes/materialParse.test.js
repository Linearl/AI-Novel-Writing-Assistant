const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.API_TOKEN = "test-token";

const { createApp } = require("../../dist/app.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

test("POST /api/novels/parse-material 素材少于 10 字返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/parse-material`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ material: "太短了" }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/parse-material 空素材返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/parse-material`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ material: "" }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/parse-material 素材超过 50000 字返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const oversizedMaterial = "这是一段很长的素材内容。".repeat(5001);
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/parse-material`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ material: oversizedMaterial }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/parse-material 恰好 10 字边界值返回 200", async () => {
  // Mock invokeStructuredLlm at the compiled module level
  const structuredInvokePath = require.resolve("../../dist/llm/structuredInvoke.js");
  const originalModule = require.cache[structuredInvokePath];
  const originalInvokeFn = originalModule.exports.invokeStructuredLlm;

  originalModule.exports.invokeStructuredLlm = async (input) => {
    return { title: "测试小说", description: "一段概述" };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const boundaryMaterial = "一二三四五六七八九十"; // 恰好 10 个字符
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/parse-material`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ material: boundaryMaterial }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.title, "测试小说");
  } finally {
    originalModule.exports.invokeStructuredLlm = originalInvokeFn;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/parse-material 成功返回包含所有字段", async () => {
  const structuredInvokePath = require.resolve("../../dist/llm/structuredInvoke.js");
  const originalModule = require.cache[structuredInvokePath];
  const originalInvokeFn = originalModule.exports.invokeStructuredLlm;

  const mockResult = {
    title: "迷雾之城",
    description: "一座被浓雾笼罩的城市里，侦探林墨发现了一连串离奇失踪案。",
    targetAudience: "悬疑推理爱好者",
    bookSellingPoint: "沉浸式都市悬疑体验",
    competingFeel: "东野圭吾式推理",
    first30ChapterPromise: "揭开前三起失踪案的真相",
    styleTone: "冷峻、克制",
    commercialTagsText: "悬疑,推理,都市",
    worldSetting: "现代都市，科技与传统交织",
    characters: "林墨（主角，冷面侦探）；苏瑶（搭档，法医）",
    outline: "主线围绕失踪案展开，层层反转",
    genreHint: "都市悬疑",
  };

  originalModule.exports.invokeStructuredLlm = async () => mockResult;

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const material = "侦探林墨在迷雾之城调查连环失踪案。线索指向一座废弃工厂，那里曾是城市的秘密实验基地。";
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/parse-material`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ material }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(typeof payload.message, "string");
    assert.equal(payload.data.title, "迷雾之城");
    assert.equal(payload.data.description, mockResult.description);
    assert.equal(payload.data.styleTone, "冷峻、克制");
    assert.equal(payload.data.genreHint, "都市悬疑");
    assert.equal(payload.data.worldSetting, mockResult.worldSetting);
  } finally {
    originalModule.exports.invokeStructuredLlm = originalInvokeFn;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
