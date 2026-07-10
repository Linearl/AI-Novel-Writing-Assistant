const test = require("node:test");
const assert = require("node:assert/strict");

const { prisma } = require("../../dist/db/prisma.js");
const {
  CharacterResourceLedgerService,
} = require("../../dist/services/novel/characterResource/CharacterResourceLedgerService.js");

test("getRejectedIntentsForChapter returns parsed intents from validationNotesJson", async () => {
  const service = new CharacterResourceLedgerService();
  const originalFindMany = prisma.stateChangeProposal.findMany;

  prisma.stateChangeProposal.findMany = async ({ where }) => {
    assert.equal(where.novelId, "novel-1");
    assert.equal(where.chapterId, "chapter-1");
    assert.equal(where.status, "rejected");
    assert.equal(where.proposalType, "character_resource_update");
    return [
      {
        id: "proposal-1",
        riskLevel: "high",
        summary: "角色身份变更",
        payloadJson: JSON.stringify({ resourceName: "林澈身份" }),
        validationNotesJson: JSON.stringify([
          "rejectedIntent:保持原有身份设定",
          "rejectedReason:不符合角色发展",
        ]),
        updatedAt: new Date("2026-06-29"),
      },
      {
        id: "proposal-2",
        riskLevel: "medium",
        summary: "资源归属变更",
        payloadJson: JSON.stringify({ resourceName: "密室钥匙" }),
        validationNotesJson: JSON.stringify([
          "rejectedIntent:钥匙应该在第三章出现",
          "some other note",
        ]),
        updatedAt: new Date("2026-06-29"),
      },
      {
        id: "proposal-3",
        riskLevel: "low",
        summary: "无意图的拒绝",
        payloadJson: JSON.stringify({}),
        validationNotesJson: JSON.stringify(["just a note"]),
        updatedAt: new Date("2026-06-29"),
      },
    ];
  };

  try {
    const intents = await service.getRejectedIntentsForChapter("novel-1", "chapter-1");

    assert.equal(intents.length, 2);
    assert.equal(intents[0].resourceName, "林澈身份");
    assert.equal(intents[0].riskLevel, "high");
    assert.equal(intents[0].summary, "角色身份变更");
    assert.equal(intents[0].rejectedIntent, "保持原有身份设定");

    assert.equal(intents[1].resourceName, "密室钥匙");
    assert.equal(intents[1].riskLevel, "medium");
    assert.equal(intents[1].rejectedIntent, "钥匙应该在第三章出现");
  } finally {
    prisma.stateChangeProposal.findMany = originalFindMany;
  }
});

test("getRejectedIntentsForChapter returns empty array when no rejected intents exist", async () => {
  const service = new CharacterResourceLedgerService();
  const originalFindMany = prisma.stateChangeProposal.findMany;

  prisma.stateChangeProposal.findMany = async () => [];

  try {
    const intents = await service.getRejectedIntentsForChapter("novel-2", "chapter-2");
    assert.deepEqual(intents, []);
  } finally {
    prisma.stateChangeProposal.findMany = originalFindMany;
  }
});
