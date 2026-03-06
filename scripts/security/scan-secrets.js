#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = process.cwd();
const INCLUDE_PATHS = [/^src\//, /^scripts\//, /^\.env\.(example|sample)(\..+)?$/, /^package\.json$/];
const IGNORE_PATHS = [/^node_modules\//, /^dist\//, /^documentation\//, /^skills\//];
const IGNORE_LINE_MARKER = "security-scan: ignore";

const multilinePatterns = [
  { id: "private-key", regex: /-----BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY-----/m, message: "Private key material detected" },
  { id: "github-token", regex: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/m, message: "GitHub token pattern detected" },
  { id: "aws-access-key", regex: /\bAKIA[0-9A-Z]{16}\b/m, message: "AWS access key pattern detected" }
];

const linePatterns = [
  {
    id: "bearer-token",
    regex: /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{16,}/i,
    message: "Hardcoded Bearer token detected"
  },
  {
    id: "hardcoded-secret-literal",
    regex: /\b(token|secret|api[_-]?key|password)\b\s*[:=]\s*["'][^"']{12,}["']/i,
    message: "Hardcoded secret string literal detected"
  },
  {
    id: "dotenv-secret",
    regex: /^\s*[A-Z0-9_]*(TOKEN|SECRET|API_KEY|PASSWORD)[A-Z0-9_]*\s*=\s*.+\s*$/,
    message: "Suspicious secret assignment detected",
    evaluator: isLikelyRealSecretAssignment
  }
];

function isTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return [".ts", ".js", ".json", ".md", ".yaml", ".yml", ".env", ""].includes(ext);
}

function isIncluded(filePath) {
  if (IGNORE_PATHS.some((r) => r.test(filePath))) return false;
  return INCLUDE_PATHS.some((r) => r.test(filePath));
}

function getTrackedFiles() {
  const result = spawnSync("git", ["ls-files", "-z"], {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status === 0) {
    return result.stdout
      .split("\0")
      .filter(Boolean)
      .filter((f) => isIncluded(f) && isTextFile(f));
  }

  // Fallback for environments without .git metadata.
  return walkLocalFiles(ROOT)
    .map((absolutePath) => path.relative(ROOT, absolutePath))
    .filter((f) => isIncluded(f) && isTextFile(f));
}

function walkLocalFiles(rootDir) {
  const out = [];
  const queue = ["src", "scripts", ".env.example", ".env.sample", "package.json"];

  while (queue.length > 0) {
    const next = queue.pop();
    const absolute = path.join(rootDir, next);

    if (!fs.existsSync(absolute)) continue;
    const stat = fs.statSync(absolute);

    if (stat.isFile()) {
      out.push(absolute);
      continue;
    }

    if (!stat.isDirectory()) continue;

    const entries = fs.readdirSync(absolute, { withFileTypes: true });
    for (const entry of entries) {
      const rel = path.join(next, entry.name);
      if (IGNORE_PATHS.some((r) => r.test(rel))) continue;
      queue.push(rel);
    }
  }

  return out;
}

function normalizeAssignedValue(line) {
  const idx = line.search(/[:=]/);
  if (idx === -1) return "";
  return line
    .slice(idx + 1)
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

function isLikelyPlaceholder(value) {
  if (!value) return true;
  if (value === "null" || value === "undefined") return true;
  if (value.startsWith("$") || value.startsWith("${")) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes("your") ||
    lower.includes("your_") ||
    lower.includes("changeme") ||
    lower.includes("placeholder") ||
    lower.includes("example") ||
    lower.includes("dummy") ||
    lower.includes("test") ||
    lower.includes("local-dev")
  );
}

function isLikelyRealSecretAssignment(line) {
  const value = normalizeAssignedValue(line);
  if (isLikelyPlaceholder(value)) return false;
  if (value.length < 12) return false;
  if (/^[A-Za-z0-9_./-]+$/.test(value) && value.length < 20) return false;
  return true;
}

function scanFile(filePath) {
  const absolutePath = path.join(ROOT, filePath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    return [];
  }

  const findings = [];

  for (const pattern of multilinePatterns) {
    if (pattern.regex.test(content)) {
      findings.push({
        filePath,
        line: 1,
        id: pattern.id,
        message: pattern.message
      });
    }
  }

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.includes(IGNORE_LINE_MARKER)) continue;

    for (const pattern of linePatterns) {
      if (!pattern.regex.test(line)) continue;
      if (typeof pattern.evaluator === "function" && !pattern.evaluator(line)) continue;
      findings.push({
        filePath,
        line: i + 1,
        id: pattern.id,
        message: pattern.message
      });
    }
  }

  return findings;
}

function main() {
  if (fs.existsSync(path.join(ROOT, ".env"))) {
    console.error("[security:scan] Notice: '.env' is excluded from automated scanning (local secret file).");
  }

  const files = getTrackedFiles();
  const findings = files.flatMap(scanFile);

  if (findings.length === 0) {
    console.log("[security:scan] OK - no high-confidence secret patterns found");
    return;
  }

  console.error(`[security:scan] FAIL - ${findings.length} finding(s)`);
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} [${finding.id}] ${finding.message}`);
  }
  console.error(`[security:scan] Use '${IGNORE_LINE_MARKER}' only when a finding is known-safe.`);
  process.exit(1);
}

main();
