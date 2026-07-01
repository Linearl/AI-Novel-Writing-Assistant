const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { listAgentToolDefinitions } = require("../dist/agents/toolRegistry.js");

test("tool registry exposes chapter range and cross-domain tools", () => {
  const tools = listAgentToolDefinitions().map((item) => item.name);
  assert.ok(tools.includes("list_novels"));
  assert.ok(tools.includes("create_novel"));
  assert.ok(tools.includes("select_novel_workspace"));
  assert.ok(tools.includes("list_chapters"));
  assert.ok(tools.includes("get_chapter_by_order"));
  assert.ok(tools.includes("get_chapter_content_by_order"));
  assert.ok(tools.includes("summarize_chapter_range"));
  assert.ok(tools.includes("list_book_analyses"));
  assert.ok(tools.includes("list_knowledge_documents"));
  assert.ok(tools.includes("list_worlds"));
  assert.ok(tools.includes("bind_world_to_novel"));
  assert.ok(tools.includes("unbind_world_from_novel"));
  assert.ok(tools.includes("generate_world_for_novel"));
  assert.ok(tools.includes("generate_novel_characters"));
  assert.ok(tools.includes("generate_story_bible"));
  assert.ok(tools.includes("generate_novel_outline"));
  assert.ok(tools.includes("generate_structured_outline"));
  assert.ok(tools.includes("sync_chapters_from_structured_outline"));
  assert.ok(tools.includes("start_full_novel_pipeline"));
  assert.ok(tools.includes("get_novel_production_status"));
  assert.ok(tools.includes("analyze_director_workspace"));
  assert.ok(tools.includes("get_director_run_status"));
  assert.ok(tools.includes("explain_director_next_action"));
  assert.ok(tools.includes("run_director_next_step"));
  assert.ok(tools.includes("run_director_until_gate"));
  assert.ok(tools.includes("switch_director_policy"));
  assert.ok(tools.includes("evaluate_manual_edit_impact"));
  assert.ok(tools.includes("list_writing_formulas"));
  assert.ok(tools.includes("list_base_characters"));
  assert.ok(tools.includes("list_tasks"));
  assert.ok(tools.includes("get_run_failure_reason"));
  assert.ok(tools.includes("explain_generation_blocker"));
});

test("tool registry exposes character arc query tools (REQ-2031)", () => {
  const tools = listAgentToolDefinitions().map((item) => item.name);
  assert.ok(tools.includes("get_character_arc"), "get_character_arc should be registered");
  assert.ok(tools.includes("get_character_dynamics_overview"), "get_character_dynamics_overview should be registered");
  assert.ok(tools.includes("get_character_relation_evolution"), "get_character_relation_evolution should be registered");
  assert.ok(tools.includes("get_character_states_by_chapter"), "get_character_states_by_chapter should be registered");
});

test("character arc query tools have correct metadata (REQ-2031)", () => {
  const defs = listAgentToolDefinitions();

  const arcTool = defs.find((item) => item.name === "get_character_arc");
  assert.ok(arcTool, "get_character_arc definition exists");
  assert.equal(arcTool.category, "read");
  assert.equal(arcTool.riskLevel, "low");
  assert.deepEqual(arcTool.resourceScopes, ["novel"]);

  const dynamicsTool = defs.find((item) => item.name === "get_character_dynamics_overview");
  assert.ok(dynamicsTool, "get_character_dynamics_overview definition exists");
  assert.equal(dynamicsTool.category, "read");
  assert.equal(dynamicsTool.riskLevel, "low");
  assert.deepEqual(dynamicsTool.resourceScopes, ["novel"]);

  const relationTool = defs.find((item) => item.name === "get_character_relation_evolution");
  assert.ok(relationTool, "get_character_relation_evolution definition exists");
  assert.equal(relationTool.category, "read");
  assert.equal(relationTool.riskLevel, "low");
  assert.deepEqual(relationTool.resourceScopes, ["novel"]);

  const statesTool = defs.find((item) => item.name === "get_character_states_by_chapter");
  assert.ok(statesTool, "get_character_states_by_chapter definition exists");
  assert.equal(statesTool.category, "read");
  assert.equal(statesTool.riskLevel, "low");
  assert.deepEqual(statesTool.resourceScopes, ["novel"]);
});

test("agent tool definitions keep zod declarations in dedicated schema modules", () => {
  const toolsDir = path.join(__dirname, "..", "src", "agents", "tools");
  const violations = [];
  const allowlist = new Set(["bookAnalysisTools.ts"]);

  for (const entry of fs.readdirSync(toolsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith("Tools.ts")) {
      continue;
    }
    if (allowlist.has(entry.name)) {
      continue;
    }
    const filePath = path.join(toolsDir, entry.name);
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/g);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (
        line.includes('from "zod"')
        || line.includes("from 'zod'")
        || line.includes("z.")
      ) {
        violations.push(`${entry.name}:${index + 1}`);
      }
    }
  }

  assert.deepEqual(violations, []);
});
