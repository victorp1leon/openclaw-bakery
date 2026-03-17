#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUTPUT = ".codex/skill-registry.md";

function toPosix(relPath) {
  return relPath.split(path.sep).join("/");
}

function listFiles(dirPath, filterFn) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(dirPath, entry.name))
    .filter(filterFn)
    .map((p) => toPosix(path.relative(ROOT, p)))
    .sort();
}

function listSkillFiles() {
  const skillsRoot = path.join(ROOT, ".codex", "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  const entries = fs.readdirSync(skillsRoot, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name, "SKILL.md"))
    .filter((skillPath) => fs.existsSync(skillPath))
    .map((p) => toPosix(path.relative(ROOT, p)))
    .sort();
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(skillRelPath) {
  const absolutePath = path.join(ROOT, skillRelPath);
  const content = fs.readFileSync(absolutePath, "utf8");

  if (!content.startsWith("---\n")) {
    throw new Error(`Missing YAML frontmatter: ${skillRelPath}`);
  }

  const endIndex = content.indexOf("\n---", 4);
  if (endIndex === -1) {
    throw new Error(`Unclosed YAML frontmatter: ${skillRelPath}`);
  }

  const frontmatter = content.slice(4, endIndex).split("\n");
  let name = "";
  let description = "";

  for (const line of frontmatter) {
    const nameMatch = line.match(/^name:\s*(.+)$/);
    if (nameMatch) {
      name = stripQuotes(nameMatch[1]);
      continue;
    }
    const descMatch = line.match(/^description:\s*(.+)$/);
    if (descMatch) {
      description = stripQuotes(descMatch[1]);
    }
  }

  if (!name || !description) {
    throw new Error(
      `Frontmatter must include non-empty name and description: ${skillRelPath}`,
    );
  }

  return { name, description };
}

function escapeCell(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function formatUtcNow() {
  const now = new Date();
  const iso = now.toISOString().replace("T", " ").replace("Z", " UTC");
  return iso.slice(0, 23) + " UTC";
}

function normalizeGeneratedAt(content) {
  return content.replace(
    /^Generated At \(UTC\): .*$/m,
    "Generated At (UTC): <stable>",
  );
}

function ensureNoDuplicates(values, label) {
  const seen = new Set();
  const dupes = new Set();
  for (const value of values) {
    if (seen.has(value)) dupes.add(value);
    seen.add(value);
  }
  if (dupes.size > 0) {
    throw new Error(`Duplicate ${label}: ${Array.from(dupes).join(", ")}`);
  }
}

function ensurePathsExist(paths) {
  const missing = paths.filter((relPath) => !fs.existsSync(path.join(ROOT, relPath)));
  if (missing.length > 0) {
    throw new Error(`Missing paths: ${missing.join(", ")}`);
  }
}

function buildRegistry() {
  const skillPaths = listSkillFiles();
  const rules = listFiles(path.join(ROOT, ".codex", "rules"), (filePath) => {
    return filePath.endsWith(".md") && path.basename(filePath) !== "README.md";
  });
  const agents = listFiles(path.join(ROOT, ".github", "agents"), (filePath) => {
    return filePath.endsWith(".md");
  });
  const instructions = listFiles(
    path.join(ROOT, ".github", "instructions"),
    (filePath) => filePath.endsWith(".md"),
  );

  const skills = skillPaths.map((skillPath) => ({
    ...parseFrontmatter(skillPath),
    path: skillPath,
  }));

  ensureNoDuplicates(
    skills.map((skill) => skill.name),
    "skill names",
  );

  const allPaths = [
    ...skills.map((skill) => skill.path),
    ...rules,
    ...agents,
    ...instructions,
  ];

  ensureNoDuplicates(allPaths, "paths");
  ensurePathsExist(allPaths);

  const lines = [];
  lines.push("# Skill Registry");
  lines.push("");
  lines.push(`Generated At (UTC): ${formatUtcNow()}`);
  lines.push("");

  lines.push("## Skills");
  lines.push("");
  lines.push("| Name | Description | Path |");
  lines.push("|---|---|---|");
  for (const skill of skills) {
    lines.push(
      `| ${escapeCell(skill.name)} | ${escapeCell(skill.description)} | \`${skill.path}\` |`,
    );
  }
  lines.push("");

  lines.push("## Rules");
  lines.push("");
  lines.push("| Rule | Path |");
  lines.push("|---|---|");
  for (const rulePath of rules) {
    const ruleName = path.basename(rulePath, ".md");
    lines.push(`| ${escapeCell(ruleName)} | \`${rulePath}\` |`);
  }
  lines.push("");

  lines.push("## Agents");
  lines.push("");
  lines.push("| Agent | Path |");
  lines.push("|---|---|");
  for (const agentPath of agents) {
    const agentName = path.basename(agentPath, ".md");
    lines.push(`| ${escapeCell(agentName)} | \`${agentPath}\` |`);
  }
  lines.push("");

  lines.push("## Instructions");
  lines.push("");
  lines.push("| Instruction | Path |");
  lines.push("|---|---|");
  for (const instructionPath of instructions) {
    const instructionName = path.basename(instructionPath, ".md");
    lines.push(`| ${escapeCell(instructionName)} | \`${instructionPath}\` |`);
  }
  lines.push("");

  return lines.join("\n");
}

function main() {
  const content = buildRegistry();
  const outputPath = path.join(ROOT, OUTPUT);
  if (fs.existsSync(outputPath)) {
    const previous = fs.readFileSync(outputPath, "utf8");
    if (
      normalizeGeneratedAt(previous) === normalizeGeneratedAt(content)
    ) {
      console.log(`Registry unchanged: ${OUTPUT}`);
      return;
    }
  }
  fs.writeFileSync(outputPath, content, "utf8");
  console.log(`Registry generated: ${OUTPUT}`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
