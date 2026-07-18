import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Standalone acceptance status normalization implementation for testing
// Mirroring the same logic in server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts

const ACCEPTANCE_STATUSES = {
  PENDING: "pending",
  AUTO_APPROVED: "auto_approved",
  USER_APPROVED: "user_approved",
  REVISION_REQUIRED: "revision_required",
  REJECTED: "rejected",
} as const;

type AcceptanceStatus = (typeof ACCEPTANCE_STATUSES)[keyof typeof ACCEPTANCE_STATUSES];

function normalizeAcceptanceStatus(raw: string | null | undefined): AcceptanceStatus {
  if (!raw) return "pending";

  const normalized = raw.toLowerCase().trim();

  const statusValues = Object.values(ACCEPTANCE_STATUSES) as readonly string[];
  if (statusValues.includes(normalized)) {
    return normalized as AcceptanceStatus;
  }

  const LEGACY_MAPPINGS: Record<string, AcceptanceStatus> = {
    approved: "user_approved",
    auto_approved: "auto_approved",
    "needs-revision": "revision_required",
    needs_revision: "revision_required",
    pending_review: "pending",
    draft: "pending",
    active: "user_approved",
  };

  return LEGACY_MAPPINGS[normalized] ?? "pending";
}

describe("normalizeAcceptanceStatus", () => {
  it("should return pending for null input", () => {
    assert.equal(normalizeAcceptanceStatus(null), "pending");
  });

  it("should return pending for undefined input", () => {
    assert.equal(normalizeAcceptanceStatus(undefined), "pending");
  });

  it("should return pending for empty string", () => {
    assert.equal(normalizeAcceptanceStatus(""), "pending");
  });

  it("should return pending for whitespace-only string", () => {
    assert.equal(normalizeAcceptanceStatus("   "), "pending");
  });

  it("should handle standard status values", () => {
    const values = Object.values(ACCEPTANCE_STATUSES);
    for (const status of values) {
      assert.equal(normalizeAcceptanceStatus(status), status);
    }
  });

  it("should handle standard values with different casing", () => {
    assert.equal(normalizeAcceptanceStatus("PENDING"), "pending");
    assert.equal(normalizeAcceptanceStatus("Pending"), "pending");
    assert.equal(normalizeAcceptanceStatus("AUTO_APPROVED"), "auto_approved");
  });

  it("should map legacy 'approved' to 'user_approved'", () => {
    assert.equal(normalizeAcceptanceStatus("approved"), "user_approved");
  });

  it("should map legacy 'needs-revision' to 'revision_required'", () => {
    assert.equal(normalizeAcceptanceStatus("needs-revision"), "revision_required");
  });

  it("should map legacy 'needs_revision' to 'revision_required'", () => {
    assert.equal(normalizeAcceptanceStatus("needs_revision"), "revision_required");
  });

  it("should map legacy 'pending_review' to 'pending'", () => {
    assert.equal(normalizeAcceptanceStatus("pending_review"), "pending");
  });

  it("should map legacy 'draft' to 'pending'", () => {
    assert.equal(normalizeAcceptanceStatus("draft"), "pending");
  });

  it("should map legacy 'active' to 'user_approved'", () => {
    assert.equal(normalizeAcceptanceStatus("active"), "user_approved");
  });

  it("should default unknown values to pending", () => {
    assert.equal(normalizeAcceptanceStatus("unknown_status"), "pending");
    assert.equal(normalizeAcceptanceStatus("random_string_xyz"), "pending");
  });

  it("should handle trim and casing correctly", () => {
    assert.equal(normalizeAcceptanceStatus("  approved  "), "user_approved");
    assert.equal(normalizeAcceptanceStatus("\tPENDING\n"), "pending");
  });
});

describe("ACCEPTANCE_STATUSES", () => {
  it("should define all expected status constants", () => {
    assert.equal(ACCEPTANCE_STATUSES.PENDING, "pending");
    assert.equal(ACCEPTANCE_STATUSES.AUTO_APPROVED, "auto_approved");
    assert.equal(ACCEPTANCE_STATUSES.USER_APPROVED, "user_approved");
    assert.equal(ACCEPTANCE_STATUSES.REVISION_REQUIRED, "revision_required");
    assert.equal(ACCEPTANCE_STATUSES.REJECTED, "rejected");
  });

  it("should have exactly 5 status values", () => {
    assert.equal(Object.keys(ACCEPTANCE_STATUSES).length, 5);
  });

  it("all status values should be unique", () => {
    const values = Object.values(ACCEPTANCE_STATUSES);
    const unique = new Set(values);
    assert.equal(unique.size, values.length);
  });
});
