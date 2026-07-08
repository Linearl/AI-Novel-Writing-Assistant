const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.API_TOKEN = "test-token";

const { createApp } = require("../dist/app.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

test("POST /api/novels/quick-preview 空灵感返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/quick-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ inspiration: "" }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/quick-preview 缺少灵感字段返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/quick-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/quick-preview 灵感超过 500 字返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const longInspiration = "一个".repeat(251);
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/quick-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ inspiration: longInspiration }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/quick-preview 有效灵感返回成功信封", async () => {
  const { novelQuickPreviewService } = require("../dist/services/novel/NovelQuickPreviewService.js");
  const originalGenerate = novelQuickPreviewService.generate;

  novelQuickPreviewService.generate = async (input) => {
    assert.equal(input.inspiration, "一个关于时空穿越的悬疑故事");
    return {
      candidates: [
        { title: "时空裂痕", synopsis: "一名科学家...", previewText: "第一章..." },
        { title: "时间悖论", synopsis: "平行世界...", previewText: "引子..." },
        { title: "回溯者", synopsis: "主角发现自己...", previewText: "深夜..." },
      ],
    };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/quick-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ inspiration: "一个关于时空穿越的悬疑故事" }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.ok(Array.isArray(payload.data.candidates));
    assert.equal(payload.data.candidates.length, 3);
    assert.equal(payload.data.candidates[0].title, "时空裂痕");
    assert.equal(typeof payload.message, "string");
  } finally {
    novelQuickPreviewService.generate = originalGenerate;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/novels/quick-preview 可选参数传递到服务层", async () => {
  const { novelQuickPreviewService } = require("../dist/services/novel/NovelQuickPreviewService.js");
  const originalGenerate = novelQuickPreviewService.generate;
  let capturedInput = null;

  novelQuickPreviewService.generate = async (input) => {
    capturedInput = input;
    return { candidates: [{ title: "测试标题", synopsis: "测试梗概", previewText: "测试预览文本" }] };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/novels/quick-preview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        inspiration: "科幻小说灵感",
        provider: "deepseek",
        model: "deepseek-chat",
        temperature: 0.9,
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(capturedInput.provider, "deepseek");
    assert.equal(capturedInput.model, "deepseek-chat");
    assert.equal(capturedInput.temperature, 0.9);
  } finally {
    novelQuickPreviewService.generate = originalGenerate;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
