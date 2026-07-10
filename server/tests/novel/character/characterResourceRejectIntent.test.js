const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

process.env.API_TOKEN = "test-token";

const { createApp } = require("../../dist/app.js");
const { prisma } = require("../../dist/db/prisma.js");

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(address.port);
    });
  });
}

test("character resource reject API saves intent to validationNotesJson", async () => {
  const originals = {
    proposalUpdateMany: prisma.stateChangeProposal.updateMany,
    proposalFindUnique: prisma.stateChangeProposal.findUnique,
    proposalFindMany: prisma.stateChangeProposal.findMany,
    ledgerFindMany: prisma.characterResourceLedgerItem.findMany,
  };
  let updateData = null;
  let findUniqueCalled = false;

  prisma.stateChangeProposal.findUnique = async ({ where, select }) => {
    findUniqueCalled = true;
    return {
      validationNotesJson: JSON.stringify(["existing note"]),
    };
  };
  prisma.stateChangeProposal.updateMany = async ({ where, data }) => {
    updateData = data;
    return { count: 1 };
  };
  prisma.stateChangeProposal.findMany = async () => [];
  prisma.characterResourceLedgerItem.findMany = async () => [];

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/novels/novel-1/character-resource-proposals/proposal-1/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
        body: JSON.stringify({
          intent: "保留原角色性格不变",
          reason: "不符合故事走向",
        }),
      },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.match(payload.message, /修正意图已记录/);

    // Verify intent was saved to validationNotesJson
    assert.ok(updateData, "updateMany should have been called");
    assert.ok(updateData.validationNotesJson, "validationNotesJson should be set");
    const notes = JSON.parse(updateData.validationNotesJson);
    assert.ok(notes.includes("rejectedIntent:保留原角色性格不变"));
    assert.ok(notes.includes("rejectedReason:不符合故事走向"));
    assert.ok(notes.includes("existing note"), "existing notes should be preserved");

    // Verify findUnique was called to read existing notes
    assert.ok(findUniqueCalled, "should read existing validationNotesJson");
  } finally {
    prisma.stateChangeProposal.updateMany = originals.proposalUpdateMany;
    prisma.stateChangeProposal.findUnique = originals.proposalFindUnique;
    prisma.stateChangeProposal.findMany = originals.proposalFindMany;
    prisma.characterResourceLedgerItem.findMany = originals.ledgerFindMany;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("character resource reject API works without intent (simple reject)", async () => {
  const originals = {
    proposalUpdateMany: prisma.stateChangeProposal.updateMany,
    proposalFindMany: prisma.stateChangeProposal.findMany,
    ledgerFindMany: prisma.characterResourceLedgerItem.findMany,
  };
  let updateData = null;

  prisma.stateChangeProposal.updateMany = async ({ where, data }) => {
    updateData = data;
    return { count: 1 };
  };
  prisma.stateChangeProposal.findMany = async () => [];
  prisma.characterResourceLedgerItem.findMany = async () => [];

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/novels/novel-1/character-resource-proposals/proposal-2/reject`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        },
      },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);
    assert.match(payload.message, /已忽略/);

    // Verify only status was updated (no validationNotesJson)
    assert.ok(updateData);
    assert.equal(updateData.status, "rejected");
    assert.equal(updateData.validationNotesJson, undefined);
  } finally {
    prisma.stateChangeProposal.updateMany = originals.proposalUpdateMany;
    prisma.stateChangeProposal.findMany = originals.proposalFindMany;
    prisma.characterResourceLedgerItem.findMany = originals.ledgerFindMany;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});

test("character resource proposal mapProposal extracts rejectedIntent from validationNotes", async () => {
  const originals = {
    proposalFindMany: prisma.stateChangeProposal.findMany,
    ledgerFindMany: prisma.characterResourceLedgerItem.findMany,
  };

  prisma.stateChangeProposal.findMany = async () => [
    {
      id: "proposal-rejected",
      novelId: "novel-1",
      chapterId: "chapter-1",
      sourceType: "extraction",
      sourceStage: "chapter_review",
      proposalType: "character_resource_update",
      riskLevel: "high",
      status: "rejected",
      summary: "角色身份变更",
      payloadJson: JSON.stringify({ resourceName: "林澈身份" }),
      evidenceJson: null,
      validationNotesJson: JSON.stringify([
        "rejectedIntent:保持原有身份设定",
        "rejectedReason:不符合角色发展",
        "original validation note",
      ]),
      createdAt: new Date("2026-06-29"),
      updatedAt: new Date("2026-06-29"),
    },
  ];
  prisma.characterResourceLedgerItem.findMany = async () => [];

  const app = createApp();
  const server = http.createServer(app);
  const port = await listen(server);

  try {
    const response = await fetch(
      `http://127.0.0.1:${port}/api/novels/novel-1/character-resources`,
      {
        headers: { Authorization: "Bearer test-token" },
      },
    );

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.success, true);

    const proposal = payload.data.pendingProposals.find((p) => p.id === "proposal-rejected");
    assert.ok(proposal, "rejected proposal should be in pendingProposals");
    assert.equal(proposal.rejectedIntent, "保持原有身份设定");
    assert.equal(proposal.rejectedReason, "不符合角色发展");
    assert.deepEqual(proposal.validationNotes, [
      "rejectedIntent:保持原有身份设定",
      "rejectedReason:不符合角色发展",
      "original validation note",
    ]);
  } finally {
    prisma.stateChangeProposal.findMany = originals.proposalFindMany;
    prisma.characterResourceLedgerItem.findMany = originals.ledgerFindMany;
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
