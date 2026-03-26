#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const siteRoot = path.join(repoRoot, 'site-new');
const templatesRoot = path.join(siteRoot, '_templates');
const partialsRoot = path.join(templatesRoot, 'partials');
const pagesRoot = path.join(templatesRoot, 'pages');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content);
}

function loadPartials() {
  if (!fs.existsSync(partialsRoot)) {
    throw new Error(`Missing partials directory: ${partialsRoot}`);
  }

  const partialFiles = fs
    .readdirSync(partialsRoot)
    .filter((file) => file.endsWith('.html'));

  const partials = new Map();
  for (const file of partialFiles) {
    const name = path.basename(file, '.html');
    partials.set(name, readFile(path.join(partialsRoot, file)).trimEnd());
  }

  return partials;
}

function compileTemplate(source, partials, templateName) {
  return source.replace(/<!--\s*@include\s+([a-z0-9-_.]+)\s*-->/gi, (_, key) => {
    if (!partials.has(key)) {
      throw new Error(`Template "${templateName}" references missing partial "${key}".`);
    }
    return partials.get(key);
  });
}

function build() {
  if (!fs.existsSync(pagesRoot)) {
    throw new Error(`Missing page templates directory: ${pagesRoot}`);
  }

  const partials = loadPartials();
  const pageFiles = fs.readdirSync(pagesRoot).filter((file) => file.endsWith('.html'));

  const built = [];
  for (const pageFile of pageFiles) {
    const templatePath = path.join(pagesRoot, pageFile);
    const outputPath = path.join(siteRoot, pageFile);
    const template = readFile(templatePath);
    const compiled = compileTemplate(template, partials, pageFile);

    if (/@include\s+/i.test(compiled)) {
      throw new Error(`Unresolved include token found in "${pageFile}".`);
    }

    writeFile(outputPath, compiled);
    built.push(pageFile);
  }

  return built;
}

function main() {
  try {
    const pages = build();
    console.log(`Built ${pages.length} page(s) into site-new/.`);
    for (const page of pages) {
      console.log(`- ${page}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
