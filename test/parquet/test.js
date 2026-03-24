const fs = require('fs');
const path = require('path');
const { writeParquet, readParquet } = require('../../lib/parquet');

function normalizeValue(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (typeof v === 'bigint') {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v.toString();
  }
  if (typeof v === 'object') {
    if (typeof v.toNumber === 'function') {
      try { return v.toNumber(); } catch (_) { return v.toString(); }
    }
    const out = {};
    for (const k of Object.keys(v)) out[k] = normalizeValue(v[k]);
    return out;
  }
  return v;
}

describe('parquet helper', () => {
  const repoRoot = path.join(__dirname, '..', '..');
  const dataPath = path.join(repoRoot, 'examples', 'parquet-data.json');
  const outDir = path.join(__dirname, '..', 'output');
  const outPath = path.join(outDir, 'parquet-test.parquet');

  beforeAll(() => {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  });
  afterAll(() => {
    try { fs.rmSync(outDir, { recursive: true }); } catch (_) {}
  });

  test('write/read roundtrip matches example data', async () => {
    const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    const schemaDef = {
      id: { type: 'UTF8' },
      name: { type: 'UTF8' },
      price: { type: 'DOUBLE' },
      quantity: { type: 'INT64' },
      createdAt: { type: 'UTF8' }
    };

    await writeParquet(schemaDef, rows, outPath);
    const records = await readParquet(outPath);

    const a = rows.map(normalizeValue);
    const b = records.map(normalizeValue);

    expect(b.length).toBe(a.length);
    for (let i = 0; i < a.length; i++) {
      expect(b[i]).toEqual(a[i]);
    }
  });
});
