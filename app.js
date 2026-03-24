const fs = require('fs');
const path = require('path');
const { ApolloServer } = require('@apollo/server');
const { readParquet, writeParquet } = require('./lib/parquet');

function scalarFor(type) {
  const t = String(type).toLowerCase();
  if (t === 'id') return 'ID';
  if (t === 'string' || t === 'datetime') return 'String';
  if (t === 'int') return 'Int';
  if (t === 'float') return 'Float';
  if (t === 'boolean') return 'Boolean';
  return 'String';
}

function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

function buildInputSDL(spec) {
  const parts = [];
  function build(name, fields) {
    const lines = fields.map(f => {
      if (f.type === 'object' || (typeof f.type === 'object' && f.type.fields)) {
        const nestedName = `${name}${capitalize(f.name)}Input`;
        build(nestedName, f.fields || f.type.fields);
        const gqlType = f.isList ? `[${nestedName}]` : nestedName;
        return `  ${f.name}: ${gqlType}`;
      }
      const gqlType = scalarFor(f.type);
      const base = f.isList ? `[${gqlType}]` : gqlType;
      return `  ${f.name}: ${base}`;
    });
    parts.push(`input ${name} {\n${lines.join('\n')}\n}`);
  }
  const inputName = `${spec.name}Input`;
  build(inputName, spec.fields);
  return parts.join('\n\n');
}

function buildRootSDL(specs) {
  const q = [];
  const m = [];
  for (const { spec } of specs) {
    const name = spec.name;
    const plural = name.toLowerCase() + 's';
    q.push(`${plural}: [${name}!]!`);
    m.push(`create${name}(input: ${name}Input!): ${name}!`);
    m.push(`update${name}(id: ID!, input: ${name}Input!): ${name}!`);
    m.push(`delete${name}(id: ID!): Boolean!`);
  }
  return `type Query {\n${q.join('\n')}\n}\n\ntype Mutation {\n${m.join('\n')}\n}`;
}

function buildParquetSchema(spec) {
  const def = {};
  function mapFields(fields, target) {
    for (const f of fields) {
      if (f.type === 'object' || (typeof f.type === 'object' && f.type.fields)) {
        target[f.name] = { type: 'UTF8' };
      } else {
        const t = String(f.type).toLowerCase();
        if (t === 'id' || t === 'string' || t === 'datetime') target[f.name] = { type: 'UTF8' };
        else if (t === 'int') target[f.name] = { type: 'INT64' };
        else if (t === 'float') target[f.name] = { type: 'DOUBLE' };
        else if (t === 'boolean') target[f.name] = { type: 'BOOLEAN' };
        else target[f.name] = { type: 'UTF8' };
      }
    }
  }
  mapFields(spec.fields, def);
  return def;
}

function loadSpecs() {
  const examplesDir = path.join(__dirname, 'examples');
  if (!fs.existsSync(examplesDir)) return [];
  return fs.readdirSync(examplesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ file: f, spec: JSON.parse(fs.readFileSync(path.join(examplesDir, f), 'utf8')) }))
    .filter(x => x.spec && typeof x.spec === 'object' && Array.isArray(x.spec.fields) && typeof x.spec.name === 'string');
}

function createApolloServer() {
  const specs = loadSpecs();

  const baseSDL = fs.existsSync(path.join(__dirname, 'schema.graphql'))
    ? fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8')
    : '';

  const inputs = specs.map(s => buildInputSDL(s.spec)).join('\n\n');
  const roots = buildRootSDL(specs);
  const typeDefs = `${baseSDL}\n\n${inputs}\n\n${roots}`;

  const resolvers = { Query: {}, Mutation: {} };
  for (const { spec } of specs) {
    const name = spec.name;
    const plural = name.toLowerCase() + 's';
    const parquetPath = path.join(__dirname, 'examples', `${name.toLowerCase()}.parquet`);
    const parquetSchema = buildParquetSchema(spec);

    resolvers.Query[plural] = async () => {
      if (!fs.existsSync(parquetPath)) return [];
      const rows = await readParquet(parquetPath);
      return rows.map(r => r);
    };

    resolvers.Mutation[`create${name}`] = async (_, { input }) => {
      const rows = fs.existsSync(parquetPath) ? await readParquet(parquetPath) : [];
      const next = { ...input };
      for (const f of spec.fields) {
        if (f.type === 'object' || (typeof f.type === 'object' && f.type.fields)) {
          if (next[f.name] !== undefined) next[f.name] = JSON.stringify(next[f.name]);
        }
      }
      rows.push(next);
      await writeParquet(parquetSchema, rows, parquetPath);
      return next;
    };

    resolvers.Mutation[`update${name}`] = async (_, { id, input }) => {
      const rows = fs.existsSync(parquetPath) ? await readParquet(parquetPath) : [];
      let found = null;
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i].id) === String(id)) {
          const updated = { ...rows[i], ...input };
          for (const f of spec.fields) {
            if (f.type === 'object' || (typeof f.type === 'object' && f.type.fields)) {
              if (updated[f.name] !== undefined) updated[f.name] = JSON.stringify(updated[f.name]);
            }
          }
          rows[i] = updated;
          found = updated;
          break;
        }
      }
      await writeParquet(parquetSchema, rows, parquetPath);
      return found;
    };

    resolvers.Mutation[`delete${name}`] = async (_, { id }) => {
      const rows = fs.existsSync(parquetPath) ? await readParquet(parquetPath) : [];
      const filtered = rows.filter(r => String(r.id) !== String(id));
      await writeParquet(parquetSchema, filtered, parquetPath);
      return filtered.length !== rows.length;
    };
  }

  return new ApolloServer({ typeDefs, resolvers });
}

module.exports = { createApolloServer };
