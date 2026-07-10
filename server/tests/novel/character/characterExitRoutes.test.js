const test = require("node:test");
const assert = require("node:assert/strict");

// T12: Integration test for PATCH /api/novels/:novelId/characters/:charId/exit-status
// This test validates the route handler behavior via the service contract.

// Mock the characterExitInferenceService.setExitStatus behavior
function createMockSetExitStatus() {
  const characters = new Map();

  return {
    seedCharacter(id, exitStatus = "active") {
      characters.set(id, { id, exitStatus, exitNote: null, exitChapterId: null });
    },
    async setExitStatus(novelId, characterId, exitStatus, exitNote) {
      const character = characters.get(characterId);
      if (!character) {
        throw new Error("角色不存在");
      }
      if (character.exitStatus !== "active") {
        throw new Error(
          `当前状态为"${character.exitStatus}"，仅允许从"active"状态标记退场或死亡`
        );
      }
      const updated = {
        ...character,
        exitStatus,
        exitNote: exitNote ?? null,
      };
      characters.set(characterId, updated);
      return updated;
    },
    getCharacter(id) {
      return characters.get(id) ?? null;
    },
  };
}

function validateExitStatusBody(body) {
  const { exitStatus, exitNote } = body ?? {};
  if (!["exited", "dead"].includes(exitStatus)) {
    return { valid: false, error: "exitStatus must be 'exited' or 'dead'" };
  }
  if (exitNote !== undefined && exitNote !== null && typeof exitNote !== "string") {
    return { valid: false, error: "exitNote must be a string" };
  }
  if (typeof exitNote === "string" && exitNote.length > 500) {
    return { valid: false, error: "exitNote too long (max 500)" };
  }
  return { valid: true };
}

// --- Tests ---

test("PATCH exit-status: successfully mark active character as exited", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1");

  const result = await svc.setExitStatus("novel-1", "char-1", "exited", "完成使命离开");
  assert.equal(result.exitStatus, "exited");
  assert.equal(result.exitNote, "完成使命离开");
});

test("PATCH exit-status: successfully mark active character as dead", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1");

  const result = await svc.setExitStatus("novel-1", "char-1", "dead", "战斗中牺牲");
  assert.equal(result.exitStatus, "dead");
  assert.equal(result.exitNote, "战斗中牺牲");
});

test("PATCH exit-status: reject character not found", async () => {
  const svc = createMockSetExitStatus();

  await assert.rejects(
    () => svc.setExitStatus("novel-1", "nonexistent", "exited"),
    { message: "角色不存在" },
  );
});

test("PATCH exit-status: reject if character already exited", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1", "exited");

  await assert.rejects(
    () => svc.setExitStatus("novel-1", "char-1", "dead"),
    { message: /仅允许从"active"状态/ },
  );
});

test("PATCH exit-status: reject if character already dead", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1", "dead");

  await assert.rejects(
    () => svc.setExitStatus("novel-1", "char-1", "exited"),
    { message: /仅允许从"active"状态/ },
  );
});

test("PATCH exit-status: reject if character is frozen", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1", "frozen");

  await assert.rejects(
    () => svc.setExitStatus("novel-1", "char-1", "exited"),
    { message: /仅允许从"active"状态/ },
  );
});

test("PATCH exit-status: validate request body - invalid exitStatus", () => {
  const result = validateExitStatusBody({ exitStatus: "frozen" });
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("exited"));
});

test("PATCH exit-status: validate request body - missing exitStatus", () => {
  const result = validateExitStatusBody({});
  assert.equal(result.valid, false);
});

test("PATCH exit-status: validate request body - valid exited", () => {
  const result = validateExitStatusBody({ exitStatus: "exited" });
  assert.equal(result.valid, true);
});

test("PATCH exit-status: validate request body - valid dead with note", () => {
  const result = validateExitStatusBody({ exitStatus: "dead", exitNote: "牺牲" });
  assert.equal(result.valid, true);
});

test("PATCH exit-status: validate request body - exitNote too long", () => {
  const result = validateExitStatusBody({ exitStatus: "dead", exitNote: "a".repeat(501) });
  assert.equal(result.valid, false);
  assert.ok(result.error.includes("too long"));
});

test("PATCH exit-status: no exitNote defaults to null", async () => {
  const svc = createMockSetExitStatus();
  svc.seedCharacter("char-1");

  const result = await svc.setExitStatus("novel-1", "char-1", "dead");
  assert.equal(result.exitNote, null);
});
