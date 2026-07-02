"use strict";

/**
 * Common mock patterns for LLM clients, EventBus, and other services.
 *
 * Usage (in a test file):
 *   const { createMockLlmClient, createMockEventBus } = require("./helpers/mockServices.js");
 */

function createMockLlmClient(overrides = {}) {
  const calls = [];
  return {
    calls,
    invoke: async (prompt, options) => {
      calls.push({ prompt, options });
      return overrides.invokeResult ?? '{"result":"ok"}';
    },
    invokeStructured: async (prompt, options) => {
      calls.push({ prompt, options });
      return overrides.structuredResult ?? { result: "ok" };
    },
    invokeWithFallback: async (prompt, options) => {
      calls.push({ prompt, options });
      return overrides.fallbackResult ?? '{"result":"ok"}';
    },
    reset() {
      calls.length = 0;
    },
  };
}

function createMockEventBus() {
  const events = [];
  return {
    events,
    emit(eventType, payload) {
      events.push({ eventType, payload });
    },
    on(_eventType, _handler) {
      // no-op for tests
    },
    off(_eventType, _handler) {
      // no-op for tests
    },
    reset() {
      events.length = 0;
    },
  };
}

function createMockLogger() {
  const entries = [];
  return {
    entries,
    info(message, meta) {
      entries.push({ level: "info", message, meta });
    },
    warn(message, meta) {
      entries.push({ level: "warn", message, meta });
    },
    error(message, meta) {
      entries.push({ level: "error", message, meta });
    },
    debug(message, meta) {
      entries.push({ level: "debug", message, meta });
    },
    reset() {
      entries.length = 0;
    },
  };
}

module.exports = {
  createMockLlmClient,
  createMockEventBus,
  createMockLogger,
};
