#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const RUNTIME_PATH = path.join(ROOT, "src", "runtime", "conversationProcessor.ts");
const SKILLS_ROOT = path.join(ROOT, "skills");

const CANONICAL_MAP = {
  gasto: "expense.add",
  pedido: "order.create",
  reporte: "order.report",
  web: "web.publish",
};

function readRuntimeIntents(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Runtime file not found: ${path.relative(ROOT, filePath)}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  const regex = /intent:\s*"([^"]+)"/g;
  const intents = new Set();

  let match;
  while ((match = regex.exec(content)) !== null) {
    intents.add(match[1]);
  }

  return Array.from(intents).sort();
}

function resolveSkillPath(intent) {
  const mapped = CANONICAL_MAP[intent] ?? intent;
  const skillFile = path.join(SKILLS_ROOT, mapped, "SKILL.md");
  return { mapped, skillFile, exists: fs.existsSync(skillFile) };
}

function relative(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function main() {
  const intents = readRuntimeIntents(RUNTIME_PATH);
  if (intents.length === 0) {
    throw new Error("No intents found in runtime. Check parser regex or runtime contract.");
  }

  const rows = intents.map((intent) => ({
    intent,
    ...resolveSkillPath(intent),
  }));

  const missing = rows.filter((row) => !row.exists);

  console.log("[intent-skill-coverage] Intents reviewed:");
  for (const row of rows) {
    const marker = row.exists ? "OK" : "MISSING";
    console.log(
      ` - ${marker} intent=${row.intent} -> skill=${row.mapped} (${relative(row.skillFile)})`,
    );
  }

  if (missing.length > 0) {
    console.error("\n[intent-skill-coverage] Missing skill coverage detected:");
    for (const row of missing) {
      console.error(` - intent=${row.intent} expected ${relative(row.skillFile)}`);
    }
    process.exit(1);
  }

  console.log("\n[intent-skill-coverage] PASS - all runtime intents have skill coverage.");
}

try {
  main();
} catch (error) {
  console.error(`[intent-skill-coverage] ERROR: ${error.message}`);
  process.exit(1);
}
