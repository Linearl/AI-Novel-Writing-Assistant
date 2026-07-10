const test = require("node:test");
const assert = require("node:assert/strict");

// Set paths module dependency before requiring server.
process.env.AI_NOVEL_APP_DATA_DIR = "/tmp/ai-novel-desktop-test";

const { resolveDesktopServerPort } = require("../../dist/runtime/server.js");

// ---------- resolveDesktopServerPort (external mode) ----------

test("resolveDesktopServerPort returns configured port in external mode", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "4200";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 4200);

  delete process.env.AI_NOVEL_SERVER_PORT;
});

test("resolveDesktopServerPort returns PORT env var in external mode", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  delete process.env.AI_NOVEL_SERVER_PORT;
  process.env.PORT = "5000";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 5000);

  delete process.env.PORT;
});

test("resolveDesktopServerPort defaults to 3000 in external mode with no env vars", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  delete process.env.AI_NOVEL_SERVER_PORT;
  delete process.env.PORT;

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 3000);
});

test("resolveDesktopServerPort returns integer port (truncates decimals)", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "4200.7";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 4200);
  assert.ok(Number.isInteger(port));

  delete process.env.AI_NOVEL_SERVER_PORT;
});

test("resolveDesktopServerPort defaults to 3000 for invalid port value", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "not-a-number";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 3000);

  delete process.env.AI_NOVEL_SERVER_PORT;
});

test("resolveDesktopServerPort defaults to 3000 for zero port", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "0";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 3000);

  delete process.env.AI_NOVEL_SERVER_PORT;
});

test("resolveDesktopServerPort defaults to 3000 for negative port", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "-100";

  const port = await resolveDesktopServerPort({ isPackaged: false });
  assert.equal(port, 3000);

  delete process.env.AI_NOVEL_SERVER_PORT;
});

// ---------- resolveDesktopServerPort (mode resolution) ----------

test("resolveDesktopServerPort uses external mode when not packaged and no env override", async () => {
  delete process.env.AI_NOVEL_DESKTOP_SERVER_MODE;
  delete process.env.AI_NOVEL_SERVER_PORT;
  delete process.env.PORT;

  const port = await resolveDesktopServerPort({ isPackaged: false });
  // External mode defaults to 3000.
  assert.equal(port, 3000);
});

test("resolveDesktopServerPort uses managed mode when packaged", async () => {
  delete process.env.AI_NOVEL_DESKTOP_SERVER_MODE;
  delete process.env.AI_NOVEL_SERVER_PORT;
  delete process.env.PORT;

  // Managed mode with no configured port allocates a free port via net.createServer.
  // This should return a port > 0.
  const port = await resolveDesktopServerPort({ isPackaged: true });
  assert.ok(typeof port === "number");
  assert.ok(port > 0);
});

test("resolveDesktopServerPort managed mode uses configured port when set", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "managed";
  process.env.AI_NOVEL_SERVER_PORT = "4300";

  const port = await resolveDesktopServerPort({ isPackaged: true });
  assert.equal(port, 4300);

  delete process.env.AI_NOVEL_DESKTOP_SERVER_MODE;
  delete process.env.AI_NOVEL_SERVER_PORT;
});

test("resolveDesktopServerPort respects explicit AI_NOVEL_DESKTOP_SERVER_MODE override", async () => {
  process.env.AI_NOVEL_DESKTOP_SERVER_MODE = "external";
  process.env.AI_NOVEL_SERVER_PORT = "4500";

  const port = await resolveDesktopServerPort({ isPackaged: true });
  // Even though isPackaged=true, the env override forces external mode.
  assert.equal(port, 4500);

  delete process.env.AI_NOVEL_DESKTOP_SERVER_MODE;
  delete process.env.AI_NOVEL_SERVER_PORT;
});

// Cleanup: remove env vars that could leak between tests.
test.afterEach(() => {
  delete process.env.AI_NOVEL_DESKTOP_SERVER_MODE;
  delete process.env.AI_NOVEL_SERVER_PORT;
  delete process.env.PORT;
});
