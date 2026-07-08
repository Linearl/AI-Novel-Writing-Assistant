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

const SAMPLE_PROFILE = {
  id: "profile-export-1",
  name: "冷硬悬疑写法",
  description: "以冷峻笔调描绘都市暗面的写作风格",
  category: "悬疑",
  tags: ["悬疑", "冷硬"],
  applicableGenres: ["悬疑", "犯罪"],
  sourceType: "manual",
  sourceRefId: null,
  sourceContent: null,
  analysisMarkdown: null,
  extractedFeatures: [],
  extractionPresets: [],
  extractionAntiAiRuleKeys: [],
  selectedExtractionPresetKey: null,
  narrativeRules: { pacing: "慢热铺陈" },
  characterRules: {},
  languageRules: { tone: "冷峻克制" },
  rhythmRules: {},
  antiAiRules: [{ key: "no_ai_cliche" }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test("GET /api/style-profiles/:id/export 返回正确 JSON 信封结构", async () => {
  const { StyleProfileService } = require("../dist/services/styleEngine/StyleProfileService.js");
  const originalGetById = StyleProfileService.prototype.getProfileById;

  StyleProfileService.prototype.getProfileById = async function (id) {
    if (id === "profile-export-1") return SAMPLE_PROFILE;
    return null;
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/profile-export-1/export`, {
      method: "GET",
      headers: { Authorization: "Bearer test-token" },
    });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type").includes("application/json"));

    const envelope = await response.json();
    assert.equal(envelope.formatVersion, 1);
    assert.equal(typeof envelope.exportedAt, "string");
    assert.ok(envelope.exportedAt.endsWith("Z"));

    const profile = envelope.profile;
    assert.equal(profile.name, "冷硬悬疑写法");
    assert.equal(profile.description, "以冷峻笔调描绘都市暗面的写作风格");
    assert.deepEqual(profile.tags, ["悬疑", "冷硬"]);
    assert.deepEqual(profile.applicableGenres, ["悬疑", "犯罪"]);
    assert.equal(profile.sourceType, "manual");
    assert.deepEqual(profile.narrativeRules, { pacing: "慢热铺陈" });
    assert.deepEqual(profile.languageRules, { tone: "冷峻克制" });
    assert.deepEqual(profile.antiAiRuleKeys, ["no_ai_cliche"]);

    // 信封不应包含内部字段
    assert.equal(profile.id, undefined);
    assert.equal(profile.createdAt, undefined);
    assert.equal(profile.updatedAt, undefined);
  } finally {
    StyleProfileService.prototype.getProfileById = originalGetById;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("GET /api/style-profiles/:id/export 不存在的档案返回 404", async () => {
  const { StyleProfileService } = require("../dist/services/styleEngine/StyleProfileService.js");
  const originalGetById = StyleProfileService.prototype.getProfileById;

  StyleProfileService.prototype.getProfileById = async () => null;

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/nonexistent/export`, {
      method: "GET",
      headers: { Authorization: "Bearer test-token" },
    });
    assert.equal(response.status, 404);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    StyleProfileService.prototype.getProfileById = originalGetById;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/style-profiles/import create_new 策略创建新档案", async () => {
  const { StyleProfileService } = require("../dist/services/styleEngine/StyleProfileService.js");
  const originalImportProfile = StyleProfileService.prototype.importProfile;

  StyleProfileService.prototype.importProfile = async function (input) {
    assert.equal(input.conflictStrategy, "create_new");
    assert.equal(input.profileData.name, "导入的写法");
    return {
      action: "created",
      profileId: "new-profile-1",
      profileName: "导入的写法",
      message: `已导入：写法资产“${input.profileData.name}”创建成功。`,
    };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        profileData: {
          name: "导入的写法",
          description: null,
          category: null,
          tags: [],
          applicableGenres: [],
          narrativeRules: {},
          characterRules: {},
          languageRules: {},
          rhythmRules: {},
        },
        conflictStrategy: "create_new",
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.action, "created");
    assert.equal(payload.data.profileName, "导入的写法");
  } finally {
    StyleProfileService.prototype.importProfile = originalImportProfile;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/style-profiles/import overwrite 策略传递覆盖参数", async () => {
  const { StyleProfileService } = require("../dist/services/styleEngine/StyleProfileService.js");
  const originalImportProfile = StyleProfileService.prototype.importProfile;
  let capturedInput = null;

  StyleProfileService.prototype.importProfile = async function (input) {
    capturedInput = input;
    return {
      action: "overwritten",
      profileId: "existing-profile-1",
      profileName: "已有写法",
      message: `已覆盖：同名写法资产"${input.profileData.name}"已更新。`,
    };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        profileData: {
          name: "已有写法",
          description: null,
          category: null,
          tags: [],
          applicableGenres: [],
        },
        conflictStrategy: "overwrite",
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.action, "overwritten");
    assert.equal(capturedInput.conflictStrategy, "overwrite");
  } finally {
    StyleProfileService.prototype.importProfile = originalImportProfile;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/style-profiles/import skip 策略传递跳过参数", async () => {
  const { StyleProfileService } = require("../dist/services/styleEngine/StyleProfileService.js");
  const originalImportProfile = StyleProfileService.prototype.importProfile;

  StyleProfileService.prototype.importProfile = async function (input) {
    return {
      action: "skipped",
      profileName: input.profileData.name,
      message: `已跳过：已存在同名写法资产"${input.profileData.name}"。`,
    };
  };

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        profileData: {
          name: "跳过写法",
          description: null,
          category: null,
          tags: [],
          applicableGenres: [],
        },
        conflictStrategy: "skip",
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.equal(payload.data.action, "skipped");
  } finally {
    StyleProfileService.prototype.importProfile = originalImportProfile;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/style-profiles/import 无效冲突策略返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        profileData: {
          name: "测试写法",
          description: null,
          category: null,
          tags: [],
          applicableGenres: [],
        },
        conflictStrategy: "invalid_strategy",
      }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("POST /api/style-profiles/import 缺少名称返回 400", async () => {
  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/style-profiles/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        profileData: {
          description: "没有名称",
          category: null,
          tags: [],
          applicableGenres: [],
        },
        conflictStrategy: "create_new",
      }),
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.success, false);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
