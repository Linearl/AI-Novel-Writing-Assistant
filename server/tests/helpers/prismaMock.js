"use strict";

/**
 * Prisma mock helper for unit tests.
 *
 * Provides a structured way to mock Prisma model methods with automatic
 * cleanup. This formalizes the monkey-patching pattern already used
 * throughout the test suite.
 *
 * Usage:
 *   const { mockPrismaMethod, withPrismaMock } = require("./helpers/prismaMock.js");
 *   const { prisma } = require("../../dist/db/prisma.js");
 *
 *   // Option A: Manual mock with try/finally cleanup
 *   const restore = mockPrismaMethod(prisma.novel, "findUnique", async () => testNovel);
 *   try {
 *     // ... test code
 *   } finally {
 *     restore();
 *   }
 *
 *   // Option B: Auto-cleanup wrapper
 *   await withPrismaMock(prisma.novel, "findUnique", async () => testNovel, async () => {
 *     // ... test code (cleanup is automatic)
 *   });
 */

/**
 * Mock a Prisma model method. Returns a restore function that reverts the original.
 *
 * @param {object} model - The Prisma model object (e.g. prisma.novel)
 * @param {string} methodName - The method to mock (e.g. "findUnique")
 * @param {Function} mockImpl - The mock implementation
 * @returns {Function} Restore function
 */
function mockPrismaMethod(model, methodName, mockImpl) {
  const original = model[methodName];
  if (typeof original !== "function" && original !== undefined) {
    throw new Error(`prisma.${methodName} is not a function or property`);
  }
  model[methodName] = mockImpl;
  return () => {
    model[methodName] = original;
  };
}

/**
 * Mock multiple methods on a Prisma model at once. Returns a single restore
 * function that reverts all mocks.
 *
 * @param {object} model - The Prisma model object
 * @param {Record<string, Function>} mocks - Map of methodName -> mockImpl
 * @returns {Function} Restore function
 */
function mockPrismaModel(model, mocks) {
  const restores = Object.entries(mocks).map(([method, impl]) =>
    mockPrismaMethod(model, method, impl),
  );
  return () => {
    for (const restore of restores) {
      restore();
    }
  };
}

/**
 * Run a test function with Prisma mocks, automatically cleaning up afterward.
 *
 * @param {object} model - The Prisma model object
 * @param {string} methodName - The method to mock
 * @param {Function} mockImpl - The mock implementation
 * @param {Function} testFn - The test function to run
 */
async function withPrismaMock(model, methodName, mockImpl, testFn) {
  const restore = mockPrismaMethod(model, methodName, mockImpl);
  try {
    await testFn();
  } finally {
    restore();
  }
}

module.exports = {
  mockPrismaMethod,
  mockPrismaModel,
  withPrismaMock,
};
