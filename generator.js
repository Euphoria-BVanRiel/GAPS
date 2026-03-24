#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inPath = process.argv[2] || path.join(__dirname, 'examples');
const outPath = process.argv[3] || path.join(__dirname, 'schema.graphql');
const schemaPath = process.argv[4] || path.join(__dirname, 'schema', 'aggregate.schema.json');

function readSpec(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

let ajv = null;
let validate = null;
if (fs.existsSync(schemaPath)) {
  try {
    const Ajv = require('ajv');
    ajv = new Ajv({ allErrors: true });
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
    validate = ajv.compile(schema);
  } catch (err) {
    console.warn('Failed to load JSON schema validator or schema:', err.message);
  }
} else {
  console.warn('No aggregate schema found at', schemaPath, '- skipping validation');
}

const scalars = {
  id: 'ID',
  string: 'String',
  int: 'Int',
  float: 'Float',
  boolean: 'Boolean',
  datetime: 'String'
};

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const types = [];
const generatedNames = new Set();

function typeName(parent, fieldName) {
  if (!parent) return capitalize(fieldName);
  return parent + capitalize(fieldName);
}

function processObject(obj, name) {
  if (generatedNames.has(name)) return;
  generatedNames.add(name);
  const fields = obj.fields || [];
  const lines = [];
  for (const f of fields) {
    let gqlType;
    if (f.type === 'object' || (typeof f.type === 'object' && f.type.fields)) {
      const nested = typeName(name, f.name);
      processObject({ fields: f.fields || f.type.fields }, nested);
      gqlType = nested;
    } else {
      const t = String(f.type).toLowerCase();
      gqlType = scalars[t] || capitalize(String(f.type));
    }
    if (f.isList) {
      const inner = f.nonNullItem ? `${gqlType}!` : gqlType;
      gqlType = `[${inner}]`;
    }
    if (f.nonNull) gqlType = `${gqlType}!`;
    lines.push(`  ${f.name}: ${gqlType}`);
  }
  types.push(`type ${name} {\n${lines.join('\n')}\n}`);
}

// Accept either a single file or a directory of JSON specs
const stats = fs.statSync(inPath);
if (stats.isDirectory()) {
  const files = fs.readdirSync(inPath).filter(f => f.endsWith('.json'));
  if (files.length === 0) {
    console.error('No JSON files found in', inPath);
    process.exit(1);
  }
  for (const f of files) {
    const fp = path.join(inPath, f);
    const spec = readSpec(fp);
    // Skip files that are not aggregate specs (expect object with 'name' and 'fields' array)
    if (!spec || typeof spec !== 'object' || !Array.isArray(spec.fields) || typeof spec.name !== 'string') {
      console.log('Skipping non-aggregate JSON:', fp);
      continue;
    }
    if (validate) {
      const ok = validate(spec);
      if (!ok) {
        console.error('Validation failed for', fp, '\n', ajv.errorsText(validate.errors));
        process.exit(2);
      }
    }
    const rootName = spec.name || capitalize(path.basename(f, '.json'));
    processObject(spec, rootName);
  }
} else {
  const spec = readSpec(inPath);
  if (validate) {
    const ok = validate(spec);
    if (!ok) {
      console.error('Validation failed for', inPath, '\n', ajv.errorsText(validate.errors));
      process.exit(2);
    }
  }
  const rootName = spec.name || 'AggregateRoot';
  processObject(spec, rootName);
}

const sdl = types.join('\n\n') + '\n';
fs.writeFileSync(outPath, sdl);
console.log('Wrote', outPath);
