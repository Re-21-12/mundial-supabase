#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '..', 'src', 'app', 'types', 'database.types.ts');
const outFile = path.resolve(__dirname, 'db-schemas.json');

if (!fs.existsSync(input)) {
  console.error('No se encontró', input);
  process.exit(2);
}

const txt = fs.readFileSync(input, 'utf8');

function findAllRowBlocks(text) {
  const results = {};
  // Find the 'public: {\n    Tables: {' region start
  const tablesIdx = text.indexOf('public:');
  if (tablesIdx === -1) return results;
  const tablesSection = text.slice(tablesIdx);

  // Search for occurrences of "\n      SOME_TABLE: {" where SOME_TABLE is uppercase or contains underscores
  const tableHeaderRegex = /\n\s*([A-Z0-9_]+):\s*\{/g;
  let m;
  while ((m = tableHeaderRegex.exec(tablesSection)) !== null) {
    const tableName = m[1];
    // find the block for this table by locating the next 'Row:' inside the slice starting at m.index
    const after = tablesSection.slice(m.index);
    const rowPos = after.indexOf('\n        Row:');
    if (rowPos === -1) continue;
    const rowStart = m.index + rowPos + after.slice(rowPos).indexOf('{');
    const absoluteRowStart =
      tablesSection.slice(rowStart).indexOf('{') >= 0
        ? tablesSection.indexOf('{', m.index + rowPos)
        : -1;
    // safer: find 'Row:' position in original and then find the following '{'
    const globalRowIndex = tablesSection.indexOf('Row:', m.index);
    if (globalRowIndex === -1) continue;
    const braceIndex = tablesSection.indexOf('{', globalRowIndex);
    if (braceIndex === -1) continue;
    // now extract block with brace matching
    const block = extractBlock(tablesSection, braceIndex);
    if (block) {
      results[tableName] = block;
    }
  }
  return results;
}

function extractBlock(text, startIdx) {
  let i = startIdx;
  let level = 0;
  let out = '';
  for (; i < text.length; i++) {
    const ch = text[i];
    out += ch;
    if (ch === '{') level++;
    else if (ch === '}') {
      level--;
      if (level === 0) break;
    }
  }
  return out;
}

function parseRowFields(block) {
  const lines = block.split(/\n/).map((l) => l.trim());
  const fields = {};
  for (const line of lines) {
    // match lines like: field_name: number;  or field_name: string | null;
    const m = line.match(/^([a-zA-Z0-9_]+):\s*([^;]+);/);
    if (m) {
      const name = m[1];
      const typeStr = m[2].trim();
      fields[name] = simplifyType(name, typeStr);
    }
  }
  return fields;
}

function simplifyType(name, typeStr) {
  const lower = typeStr.toLowerCase();
  if (lower.includes('number')) return 'number';
  if (lower.includes('boolean')) return 'boolean';
  if (lower.includes('string')) {
    if (/_at$/.test(name) || name.includes('date') || name.includes('time')) return 'date';
    return 'string';
  }
  // fallback for unions like number | null
  if (/\bnumber\b/.test(lower)) return 'number';
  if (/\bboolean\b/.test(lower)) return 'boolean';
  if (/\bstring\b/.test(lower)) return 'string';
  // unknown -> any
  return 'any';
}

const rowBlocks = findAllRowBlocks(txt);
const schemas = {};
for (const [table, block] of Object.entries(rowBlocks)) {
  schemas[table] = parseRowFields(block);
}

fs.writeFileSync(outFile, JSON.stringify(schemas, null, 2), 'utf8');
console.log('Escrito', outFile);
