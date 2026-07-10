const test = require("node:test");
const assert = require("node:assert/strict");

// T11: Unit tests for character exit inference logic and freeze mechanism

// --- Exit status validation logic ---

function validateExitStatusTransition(currentStatus, targetStatus) {
  const validTransitions = {
    active: ["exited", "dead"],
    exited: ["frozen"],
    dead: ["frozen"],
  };
  const allowed = validTransitions[currentStatus];
  if (!allowed) return false;
  return allowed.includes(targetStatus);
}

function isFrozenCharacter(character) {
  return character.exitStatus === "frozen";
}

function isContextExcluded(character) {
  return character.exitStatus === "frozen";
}

function partitionByExitStatus(characters) {
  const active = [];
  const exited = [];
  const dead = [];
  const frozen = [];
  for (const c of characters) {
    switch (c.exitStatus) {
      case "exited": exited.push(c); break;
      case "dead": dead.push(c); break;
      case "frozen": frozen.push(c); break;
      default: active.push(c); break;
    }
  }
  return { active, exited, dead, frozen };
}

function shouldFreeze(character, lastMentionChapterOrder, currentChapterOrder, threshold) {
  if (character.exitStatus !== "exited" && character.exitStatus !== "dead") {
    return false;
  }
  if (lastMentionChapterOrder === null || lastMentionChapterOrder === undefined) {
    return true;
  }
  return (currentChapterOrder - lastMentionChapterOrder) >= threshold;
}

// --- Tests ---

test("exitStatus transition: active -> exited is valid", () => {
  assert.equal(validateExitStatusTransition("active", "exited"), true);
});

test("exitStatus transition: active -> dead is valid", () => {
  assert.equal(validateExitStatusTransition("active", "dead"), true);
});

test("exitStatus transition: active -> frozen is invalid (must go through exited/dead first)", () => {
  assert.equal(validateExitStatusTransition("active", "frozen"), false);
});

test("exitStatus transition: exited -> frozen is valid", () => {
  assert.equal(validateExitStatusTransition("exited", "frozen"), true);
});

test("exitStatus transition: dead -> frozen is valid", () => {
  assert.equal(validateExitStatusTransition("dead", "frozen"), true);
});

test("exitStatus transition: exited -> active is invalid (irreversible)", () => {
  assert.equal(validateExitStatusTransition("exited", "active"), false);
});

test("exitStatus transition: dead -> active is invalid (irreversible)", () => {
  assert.equal(validateExitStatusTransition("dead", "active"), false);
});

test("exitStatus transition: frozen -> any is invalid (terminal state)", () => {
  assert.equal(validateExitStatusTransition("frozen", "active"), false);
  assert.equal(validateExitStatusTransition("frozen", "exited"), false);
  assert.equal(validateExitStatusTransition("frozen", "dead"), false);
});

test("isFrozenCharacter correctly identifies frozen characters", () => {
  assert.equal(isFrozenCharacter({ exitStatus: "frozen" }), true);
  assert.equal(isFrozenCharacter({ exitStatus: "active" }), false);
  assert.equal(isFrozenCharacter({ exitStatus: "exited" }), false);
  assert.equal(isFrozenCharacter({ exitStatus: "dead" }), false);
});

test("isContextExcluded filters frozen characters from generation context", () => {
  const characters = [
    { id: "1", name: "Alice", exitStatus: "active" },
    { id: "2", name: "Bob", exitStatus: "exited" },
    { id: "3", name: "Charlie", exitStatus: "dead" },
    { id: "4", name: "Dave", exitStatus: "frozen" },
  ];
  const contextCharacters = characters.filter((c) => !isContextExcluded(c));
  assert.equal(contextCharacters.length, 3);
  assert.equal(contextCharacters.map((c) => c.name).join(","), "Alice,Bob,Charlie");
});

test("partitionByExitStatus correctly categorizes characters", () => {
  const characters = [
    { id: "1", name: "Alice", exitStatus: "active" },
    { id: "2", name: "Bob", exitStatus: "exited" },
    { id: "3", name: "Charlie", exitStatus: "dead" },
    { id: "4", name: "Dave", exitStatus: "frozen" },
    { id: "5", name: "Eve", exitStatus: undefined },
  ];
  const result = partitionByExitStatus(characters);
  assert.equal(result.active.length, 2);
  assert.equal(result.exited.length, 1);
  assert.equal(result.dead.length, 1);
  assert.equal(result.frozen.length, 1);
  assert.equal(result.active[0].name, "Alice");
  assert.equal(result.active[1].name, "Eve");
});

test("shouldFreeze: exited character not mentioned in last 5 chapters -> freeze", () => {
  const char = { exitStatus: "exited" };
  assert.equal(shouldFreeze(char, 10, 15, 5), true);
});

test("shouldFreeze: exited character mentioned 3 chapters ago -> no freeze (threshold 5)", () => {
  const char = { exitStatus: "exited" };
  assert.equal(shouldFreeze(char, 12, 15, 5), false);
});

test("shouldFreeze: active character not mentioned -> no freeze (only exited/dead)", () => {
  const char = { exitStatus: "active" };
  assert.equal(shouldFreeze(char, null, 15, 5), false);
});

test("shouldFreeze: dead character never mentioned -> freeze", () => {
  const char = { exitStatus: "dead" };
  assert.equal(shouldFreeze(char, null, 15, 5), true);
});

test("shouldFreeze: frozen character -> no freeze (already terminal)", () => {
  const char = { exitStatus: "frozen" };
  assert.equal(shouldFreeze(char, null, 15, 5), false);
});

test("shouldFreeze: default threshold of 5 chapters", () => {
  const char = { exitStatus: "exited" };
  // Exactly at threshold
  assert.equal(shouldFreeze(char, 10, 15, 5), true);
  // One below threshold
  assert.equal(shouldFreeze(char, 11, 15, 5), false);
});
