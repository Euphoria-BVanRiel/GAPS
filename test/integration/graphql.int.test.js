const fs = require('fs');
const path = require('path');
const { createApolloServer } = require('../../app');
const { readParquet } = require('../../lib/parquet');

const examplesDir = path.join(__dirname, '../../examples');
const specFile = path.join(examplesDir, 'testitem.json');
const parquetFile = path.join(examplesDir, 'testitem.parquet');
const schemaFile = path.join(__dirname, '../../schema.graphql');

describe('GraphQL integration (Parquet persistence)', () => {
  beforeAll(() => {
    if (!fs.existsSync(examplesDir)) fs.mkdirSync(examplesDir, { recursive: true });
    const spec = {
      name: 'TestItem',
      fields: [
        { name: 'id', type: 'id' },
        { name: 'value', type: 'string' }
      ]
    };
    fs.writeFileSync(specFile, JSON.stringify(spec, null, 2));
    // ensure object types exist for all example specs (so server's schema validates)
    const jsonFiles = fs.readdirSync(examplesDir).filter(f => f.endsWith('.json'));
    const types = [];
    for (const f of jsonFiles) {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(examplesDir, f), 'utf8'));
        if (s && s.name && Array.isArray(s.fields)) {
          const lines = s.fields.map(ff => `  ${ff.name}: String`);
          types.push(`type ${s.name} {\n${lines.join('\n')}\n}`);
        }
      } catch (e) {
        // ignore parse errors
      }
    }
    // ensure at least TestItem is present
    if (!types.find(t => t.includes('type TestItem'))) {
      types.push('type TestItem {\n  id: ID\n  value: String\n}');
    }
    fs.writeFileSync(schemaFile, types.join('\n\n'));
  });

  afterAll(() => {
    try { if (fs.existsSync(specFile)) fs.unlinkSync(specFile); } catch(e) {}
    try { if (fs.existsSync(parquetFile)) fs.unlinkSync(parquetFile); } catch(e) {}
    try { if (fs.existsSync(schemaFile)) fs.unlinkSync(schemaFile); } catch(e) {}
  });

  test('create and query persists to parquet', async () => {
    const server = createApolloServer();

    const createMutation = `mutation Create($input: TestItemInput!) {\n  createTestItem(input: $input) { id value }\n}`;
    const createRes = await server.executeOperation({ query: createMutation, variables: { input: { id: '1', value: 'hello' } } });
    // Apollo Server v4 returns shape { http, body: { singleResult: { data } } }
    const createData = createRes && createRes.body && createRes.body.singleResult
      ? createRes.body.singleResult.data
      : undefined;
    if (!createData) {
      // eslint-disable-next-line no-console
      console.error('createRes full:', JSON.stringify(createRes, null, 2));
    }
    expect(createData).toBeDefined();
    expect(createData.createTestItem).toEqual({ id: '1', value: 'hello' });

    const listQuery = `query { testitems { id value } }`;
    const listRes = await server.executeOperation({ query: listQuery });
    const listData = listRes && listRes.body && listRes.body.singleResult ? listRes.body.singleResult.data : undefined;
    expect(listData).toBeDefined();
    expect(listData.testitems).toEqual(expect.arrayContaining([{ id: '1', value: 'hello' }]));

    // verify parquet file contents
    const rows = await readParquet(parquetFile);
    const found = rows.some(r => String(r.id) === '1' && String(r.value) === 'hello');
    expect(found).toBe(true);
  }, 20000);
});
