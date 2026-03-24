const fs = require('fs');
const path = require('path');
const { writeParquet, readParquet } = require('../../lib/parquet');

const tmpDir = path.join(__dirname, 'tmp-parquet');
beforeAll(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
});
afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
});

function normalize(v) {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(normalize);
  if (typeof v === 'bigint') {
    const n = Number(v);
    return Number.isSafeInteger(n) ? n : v.toString();
  }
  if (typeof v === 'object') {
    if (typeof v.toNumber === 'function') {
      try { return v.toNumber(); } catch (_) { return String(v); }
    }
    const out = {};
    for (const k of Object.keys(v)) out[k] = normalize(v[k]);
    return out;
  }
  return v;
}

test('writeParquet/readParquet roundtrip', async () => {
  const outPath = path.join(tmpDir, 'test.parquet');
  const schema = { id: { type: 'UTF8' }, qty: { type: 'INT64' } };
  const rows = [ { id: 'a', qty: 5 }, { id: 'b', qty: 10 } ];

  await writeParquet(schema, rows, outPath);
  const got = await readParquet(outPath);
  expect(got.length).toBe(2);
  expect(normalize(got[0]).id).toBe('a');
  expect(normalize(got[0]).qty).toBe(5);
  expect(normalize(got[1]).id).toBe('b');
});
