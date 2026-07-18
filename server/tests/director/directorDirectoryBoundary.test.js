const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const directorRoot = path.join(repoRoot, "src", "orchestration", "pipeline");
const facadeRoot = path.join(repoRoot, "src", "services", "novel", "director");

function readSource(...segments) {
  return fs.readFileSync(path.join(repoRoot, "src", ...segments), "utf8");
}

test("director facade exists at old location", () => {
  assert.equal(
    fs.existsSync(path.join(facadeRoot, "index.ts")),
    true,
    "services/novel/director/index.ts facade must exist for backward compatibility"
  );
});

test("director responsibility directories exist in orchestration/pipeline", () => {
  for (const dirname of [
    "automation",
    "commands",
    "http",
    "phases",
    "projections",
    "recovery",
    "runtime",
    "state",
  ]) {
    const fullPath = path.join(directorRoot, dirname);
    assert.equal(fs.statSync(fullPath).isDirectory(), true, `${dirname} must be a directory`);
  }
});

test("app.ts mounts director router from orchestration/pipeline", () => {
  const appSource = fs.readFileSync(path.join(repoRoot, "src", "app.ts"), "utf8");

  assert.equal(
    appSource.includes('orchestration/pipeline/http/novelDirector') ||
    appSource.includes('services/novel/director/http/novelDirector'),
    true,
    "app.ts must import the director router"
  );
});
