const test = require("node:test");
const assert = require("node:assert/strict");

// Set AI_NOVEL_APP_DATA_DIR before requiring state.ts so that
// resolveDesktopLogsDir() resolves deterministically.
process.env.AI_NOVEL_APP_DATA_DIR = "/tmp/ai-novel-desktop-test";

const {
  desktopBootstrapStore,
  desktopUpdaterStore,
  createBootstrapSnapshot,
  createUpdaterSnapshot,
} = require("../../dist/runtime/state.js");

// ---------- createBootstrapSnapshot ----------

test("createBootstrapSnapshot populates required fields", () => {
  const snapshot = createBootstrapSnapshot({
    state: "launching",
    stage: "app-ready",
    title: "Test title",
    detail: "Test detail",
  });

  assert.equal(snapshot.state, "launching");
  assert.equal(snapshot.stage, "app-ready");
  assert.equal(snapshot.title, "Test title");
  assert.equal(snapshot.detail, "Test detail");
  assert.ok(typeof snapshot.logDir === "string" && snapshot.logDir.length > 0);
  assert.ok(typeof snapshot.logFile === "string" && snapshot.logFile.length > 0);
  assert.ok(typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0);
});

test("createBootstrapSnapshot defaults canRetry to false for non-error states", () => {
  const snapshot = createBootstrapSnapshot({
    state: "ready",
    stage: "main-window-shown",
    title: "Ready",
    detail: "All done",
  });

  assert.equal(snapshot.canRetry, false);
});

test("createBootstrapSnapshot defaults canRetry to true for error state", () => {
  const snapshot = createBootstrapSnapshot({
    state: "error",
    stage: "error",
    title: "Failed",
    detail: "Something broke",
  });

  assert.equal(snapshot.canRetry, true);
});

test("createBootstrapSnapshot allows explicit canRetry override", () => {
  const snapshot = createBootstrapSnapshot({
    state: "launching",
    stage: "splash-shown",
    title: "Launching",
    detail: "Loading",
    canRetry: true,
  });

  assert.equal(snapshot.canRetry, true);
});

test("createBootstrapSnapshot accepts custom updatedAt", () => {
  const fixedTime = "2026-01-15T10:30:00.000Z";
  const snapshot = createBootstrapSnapshot({
    state: "ready",
    stage: "main-window-shown",
    title: "Ready",
    detail: "Done",
    updatedAt: fixedTime,
  });

  assert.equal(snapshot.updatedAt, fixedTime);
});

// ---------- createUpdaterSnapshot ----------

test("createUpdaterSnapshot populates required fields", () => {
  const snapshot = createUpdaterSnapshot({
    status: "idle",
    message: "Ready",
    currentVersion: "1.0.0",
    availableVersion: null,
    progressPercent: null,
    bytesPerSecond: null,
    channel: "beta",
    isPortable: false,
    isPackaged: true,
    isSupported: true,
    canInstall: false,
    lastCheckedAt: null,
  });

  assert.equal(snapshot.status, "idle");
  assert.equal(snapshot.currentVersion, "1.0.0");
  assert.equal(snapshot.isPackaged, true);
  assert.ok(typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0);
});

test("createUpdaterSnapshot accepts custom updatedAt", () => {
  const fixedTime = "2026-06-01T00:00:00.000Z";
  const snapshot = createUpdaterSnapshot({
    status: "disabled",
    message: "Not supported",
    currentVersion: "0.0.0",
    availableVersion: null,
    progressPercent: null,
    bytesPerSecond: null,
    channel: "beta",
    isPortable: false,
    isPackaged: false,
    isSupported: false,
    canInstall: false,
    lastCheckedAt: null,
    updatedAt: fixedTime,
  });

  assert.equal(snapshot.updatedAt, fixedTime);
});

// ---------- desktopBootstrapStore ----------

test("desktopBootstrapStore returns initial snapshot with launching state", () => {
  const snapshot = desktopBootstrapStore.getSnapshot();
  assert.equal(snapshot.state, "launching");
  assert.equal(snapshot.stage, "launching");
  assert.equal(snapshot.canRetry, false);
});

test("desktopBootstrapStore setSnapshot updates snapshot", () => {
  const before = desktopBootstrapStore.getSnapshot();
  const originalState = before.state;

  const newSnapshot = createBootstrapSnapshot({
    state: "ready",
    stage: "main-window-shown",
    title: "Ready",
    detail: "Done",
  });

  desktopBootstrapStore.setSnapshot(newSnapshot);
  const after = desktopBootstrapStore.getSnapshot();
  assert.equal(after.state, "ready");
  assert.equal(after.stage, "main-window-shown");

  // Restore original state for other tests.
  desktopBootstrapStore.setSnapshot(before);
  assert.equal(desktopBootstrapStore.getSnapshot().state, originalState);
});

test("desktopBootstrapStore subscribe receives snapshot updates", () => {
  const receivedSnapshots = [];
  const unsubscribe = desktopBootstrapStore.subscribe((snap) => {
    receivedSnapshots.push(snap);
  });

  const testSnapshot = createBootstrapSnapshot({
    state: "starting-server",
    stage: "server-starting",
    title: "Starting server",
    detail: "Please wait",
  });

  desktopBootstrapStore.setSnapshot(testSnapshot);

  assert.equal(receivedSnapshots.length, 1);
  assert.equal(receivedSnapshots[0].state, "starting-server");

  unsubscribe();

  // After unsubscribing, further updates should not trigger the listener.
  desktopBootstrapStore.setSnapshot(
    createBootstrapSnapshot({
      state: "ready",
      stage: "main-window-shown",
      title: "Ready",
      detail: "Done",
    }),
  );
  assert.equal(receivedSnapshots.length, 1);
});

// ---------- desktopUpdaterStore ----------

test("desktopUpdaterStore returns initial snapshot with disabled status", () => {
  const snapshot = desktopUpdaterStore.getSnapshot();
  assert.equal(snapshot.status, "disabled");
  assert.equal(snapshot.isSupported, false);
});

test("desktopUpdaterStore setSnapshot updates snapshot", () => {
  const before = desktopUpdaterStore.getSnapshot();
  const originalStatus = before.status;

  desktopUpdaterStore.setSnapshot(
    createUpdaterSnapshot({
      status: "idle",
      message: "Ready to check",
      currentVersion: "2.0.0",
      availableVersion: null,
      progressPercent: null,
      bytesPerSecond: null,
      channel: "stable",
      isPortable: false,
      isPackaged: true,
      isSupported: true,
      canInstall: false,
      lastCheckedAt: null,
    }),
  );

  const after = desktopUpdaterStore.getSnapshot();
  assert.equal(after.status, "idle");
  assert.equal(after.currentVersion, "2.0.0");

  // Restore original state for other tests.
  desktopUpdaterStore.setSnapshot(before);
  assert.equal(desktopUpdaterStore.getSnapshot().status, originalStatus);
});

test("desktopUpdaterStore subscribe fires on snapshot change", () => {
  const events = [];
  const unsubscribe = desktopUpdaterStore.subscribe((snap) => {
    events.push(snap.status);
  });

  const snap = createUpdaterSnapshot({
    status: "checking",
    message: "Checking...",
    currentVersion: "1.0.0",
    availableVersion: null,
    progressPercent: null,
    bytesPerSecond: null,
    channel: "beta",
    isPortable: false,
    isPackaged: true,
    isSupported: true,
    canInstall: false,
    lastCheckedAt: null,
  });

  desktopUpdaterStore.setSnapshot(snap);
  assert.deepEqual(events, ["checking"]);

  unsubscribe();

  desktopUpdaterStore.setSnapshot(
    createUpdaterSnapshot({
      status: "idle",
      message: "Idle",
      currentVersion: "1.0.0",
      availableVersion: null,
      progressPercent: null,
      bytesPerSecond: null,
      channel: "beta",
      isPortable: false,
      isPackaged: true,
      isSupported: true,
      canInstall: false,
      lastCheckedAt: null,
    }),
  );
  // Should still be only one event after unsubscribe.
  assert.deepEqual(events, ["checking"]);
});
