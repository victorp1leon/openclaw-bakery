import fs from "node:fs";
import path from "node:path";

type Issue = {
  file: string;
  location: string;
  message: string;
};

type TabSchema = {
  key?: unknown;
  defaultTabName?: unknown;
  headers?: unknown;
  rows?: unknown;
};

type RootSchema = {
  name?: unknown;
  tabs?: unknown;
};

const SCHEMAS_DIR = path.resolve(__dirname, "schemas");
const ALLOWED_PLACEHOLDER = /^[A-Z0-9_]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function addIssue(issues: Issue[], file: string, location: string, message: string): void {
  issues.push({ file, location, message });
}

function extractPlaceholders(value: string): string[] {
  const out: string[] = [];
  const re = /{{([^{}]+)}}/g;
  let match: RegExpExecArray | null = re.exec(value);
  while (match) {
    out.push(match[1]?.trim() ?? "");
    match = re.exec(value);
  }
  return out;
}

function validateFile(filePath: string): Issue[] {
  const issues: Issue[] = [];
  const file = path.basename(filePath);

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    addIssue(issues, file, "$", `invalid_json: ${detail}`);
    return issues;
  }

  if (!isPlainObject(parsed)) {
    addIssue(issues, file, "$", "root_must_be_object");
    return issues;
  }

  const root = parsed as RootSchema;
  if (typeof root.name !== "string" || root.name.trim().length === 0) {
    addIssue(issues, file, "$.name", "name_required_non_empty_string");
  }

  if (!Array.isArray(root.tabs) || root.tabs.length === 0) {
    addIssue(issues, file, "$.tabs", "tabs_required_non_empty_array");
    return issues;
  }

  const tabKeys = new Set<string>();
  const tabNames = new Set<string>();

  root.tabs.forEach((rawTab, tabIndex) => {
    const locationBase = `$.tabs[${tabIndex}]`;
    if (!isPlainObject(rawTab)) {
      addIssue(issues, file, locationBase, "tab_must_be_object");
      return;
    }

    const tab = rawTab as TabSchema;

    const key = typeof tab.key === "string" ? tab.key.trim() : "";
    if (!key) {
      addIssue(issues, file, `${locationBase}.key`, "tab_key_required_non_empty_string");
    } else if (tabKeys.has(key)) {
      addIssue(issues, file, `${locationBase}.key`, `tab_key_duplicated:${key}`);
    } else {
      tabKeys.add(key);
    }

    const tabName = typeof tab.defaultTabName === "string" ? tab.defaultTabName.trim() : "";
    if (!tabName) {
      addIssue(issues, file, `${locationBase}.defaultTabName`, "default_tab_name_required_non_empty_string");
    } else if (tabNames.has(tabName)) {
      addIssue(issues, file, `${locationBase}.defaultTabName`, `default_tab_name_duplicated:${tabName}`);
    } else {
      tabNames.add(tabName);
    }

    if (!Array.isArray(tab.headers) || tab.headers.length === 0) {
      addIssue(issues, file, `${locationBase}.headers`, "headers_required_non_empty_array");
      return;
    }

    const headers = tab.headers.map((header, headerIndex) => {
      if (typeof header !== "string" || header.trim().length === 0) {
        addIssue(issues, file, `${locationBase}.headers[${headerIndex}]`, "header_required_non_empty_string");
        return "";
      }
      return header.trim();
    });

    const headerSet = new Set<string>();
    headers.forEach((header, headerIndex) => {
      if (!header) return;
      if (headerSet.has(header)) {
        addIssue(issues, file, `${locationBase}.headers[${headerIndex}]`, `header_duplicated:${header}`);
      } else {
        headerSet.add(header);
      }
    });

    if (tab.rows == null) return;
    if (!Array.isArray(tab.rows)) {
      addIssue(issues, file, `${locationBase}.rows`, "rows_must_be_array_when_present");
      return;
    }

    tab.rows.forEach((row, rowIndex) => {
      const rowLocation = `${locationBase}.rows[${rowIndex}]`;
      if (!Array.isArray(row)) {
        addIssue(issues, file, rowLocation, "row_must_be_array");
        return;
      }

      if (row.length !== headers.length) {
        addIssue(
          issues,
          file,
          rowLocation,
          `row_length_mismatch:expected_${headers.length}_got_${row.length}`
        );
      }

      row.forEach((cell, cellIndex) => {
        const cellLocation = `${rowLocation}[${cellIndex}]`;
        const validType = cell == null
          || typeof cell === "string"
          || typeof cell === "number"
          || typeof cell === "boolean";

        if (!validType) {
          addIssue(issues, file, cellLocation, "cell_must_be_string_number_boolean_or_null");
          return;
        }

        if (typeof cell === "string") {
          const placeholders = extractPlaceholders(cell);
          placeholders.forEach((placeholder) => {
            if (!ALLOWED_PLACEHOLDER.test(placeholder)) {
              addIssue(
                issues,
                file,
                cellLocation,
                `placeholder_invalid:${placeholder}:use_[A-Z0-9_]+`
              );
            }
          });
        }
      });
    });
  });

  return issues;
}

function main() {
  if (!fs.existsSync(SCHEMAS_DIR)) {
    console.error(
      JSON.stringify(
        {
          event: "tabs_schema_validate_failed",
          detail: `schemas_dir_missing:${SCHEMAS_DIR}`
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(SCHEMAS_DIR)
    .filter((entry) => entry.endsWith(".tabs.json"))
    .sort();

  const issues: Issue[] = [];
  for (const file of files) {
    const filePath = path.join(SCHEMAS_DIR, file);
    issues.push(...validateFile(filePath));
  }

  const ok = issues.length === 0;
  console.log(
    JSON.stringify(
      {
        event: "tabs_schema_validate_result",
        ok,
        schemasDir: SCHEMAS_DIR,
        filesChecked: files,
        issues
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

main();
