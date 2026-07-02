"use strict";

/**
 * Sample data fixtures for common test scenarios.
 *
 * Usage:
 *   const { FIXTURES } = require("./helpers/fixtures.js");
 */

const FIXTURES = {
  novel: {
    id: "novel-test-001",
    title: "Test Novel",
    description: "A test novel for unit testing",
    status: "draft",
    genreId: null,
    worldId: null,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },

  character: {
    id: "char-test-001",
    name: "TestHero",
    role: "protagonist",
    gender: "male",
    novelId: "novel-test-001",
    personality: "Brave and determined",
    background: "Born in a small village",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },

  chapter: {
    id: "chap-test-001",
    title: "Chapter 1: The Beginning",
    order: 1,
    content: "This is the test chapter content. The hero begins their journey.",
    novelId: "novel-test-001",
    chapterStatus: "completed",
    targetWordCount: 3000,
    qualityScore: 85,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },

  world: {
    id: "world-test-001",
    name: "TestWorld",
    description: "A test world setting",
    novelId: "novel-test-001",
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  },

  qualityScore: {
    coherence: 85,
    repetition: 82,
    pacing: 78,
    voice: 80,
    engagement: 88,
    overall: 83,
  },

  failingQualityScore: {
    coherence: 50,
    repetition: 40,
    pacing: 60,
    voice: 55,
    engagement: 45,
    overall: 50,
  },

  modelRouteConfig: {
    taskType: "writer",
    provider: "deepseek",
    model: "deepseek-chat",
    temperature: 0.8,
    maxTokens: null,
    contextWindow: 1048576,
    requestProtocol: "auto",
    structuredResponseFormat: "auto",
  },

  toolExecutionResult: {
    tool: "create_novel",
    success: true,
    summary: "已创建小说《Test Novel》。",
    output: { title: "Test Novel", stage: "ready_for_production" },
  },
};

module.exports = { FIXTURES };
