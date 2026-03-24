#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inPath = process.argv[2] || path.join(__dirname, 'examples', 'aggregate.json');
const outPath = process.argv[3] || path.join(__dirname, 'schema.graphql');

const spec = JSON.parse(fs.readFileSync(inPath, 'utf8'));

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

const rootName = spec.name || 'AggregateRoot';
processObject(spec, rootName);

const sdl = types.join('\n\n') + '\n';
fs.writeFileSync(outPath, sdl);
console.log('Wrote', outPath);
