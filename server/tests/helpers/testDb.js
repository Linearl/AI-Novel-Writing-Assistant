"use strict";

/**
 * In-memory SQLite test database helper.
 *
 * Creates a temporary SQLite database for tests, avoiding pollution of the
 * development database. Each call to createTestDb() returns a fresh database
 * path that can be used by setting the DATABASE_URL environment variable
 * before importing the prisma module.
 *
 * Usage (in integration tests):
 *   const { createTestDb, cleanupTestDb } = require("./helpers/testDb.js");
 *
 *   // Must be set before prisma module is imported:
 *   process.env.DATABASE_URL = "file:./test-temp.db";
 *   // Then import prisma and run tests...
 *   // After tests, call cleanupTestDb() in teardown.
 *
 * Note: Because prisma.ts is a singleton that initializes at import time,
 * most unit tests should use the prismaMock helper instead. This helper
 * is for integration tests that need a real database.
 */

const fs = require("node:fs");
const path = require("node:path");

const serverRoot = path.resolve(__dirname, "../..");

/**
 * Create a test database path. Does NOT import prisma -- caller must set
 * DATABASE_URL before importing prisma.
 */
function createTestDb(suffix = "") {
  const timestamp = Date.now();
  const fileName = `test-db-${timestamp}${suffix ? `-${suffix}` : ""}.db`;
  const dbPath = path.join(serverRoot, fileName);
  return { dbPath, databaseUrl: `file:${dbPath}` };
}

/**
 * Remove a test database file created by createTestDb.
 */
function cleanupTestDb(dbPath) {
  try {
    if (dbPath && fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    // Also clean up WAL and SHM files that SQLite creates
    for (const ext of ["-wal", "-shm"]) {
      const sidecar = dbPath + ext;
      if (fs.existsSync(sidecar)) {
        fs.unlinkSync(sidecar);
      }
    }
  } catch {
    // Ignore cleanup errors in test teardown.
  }
}

/**
 * Clean up any leftover test database files from previous runs.
 */
function cleanupAllTestDbs() {
  try {
    const files = fs.readdirSync(serverRoot);
    for (const file of files) {
      if (file.startsWith("test-db-") && file.endsWith(".db")) {
        cleanupTestDb(path.join(serverRoot, file));
      }
    }
  } catch {
    // Ignore cleanup errors.
  }
}

module.exports = {
  createTestDb,
  cleanupTestDb,
  cleanupAllTestDbs,
};
