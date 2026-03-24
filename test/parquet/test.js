const fs = require('fs');
const path = require('path');
const { writeParquet, readParquet } = require('../../lib/parquet');

async function run() {
  const repoRoot = path.join(__dirname, '..', '..');
  const dataPath = path.join(repoRoot, 'examples', 'parquet-data.json');
  const outDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'parquet-test.parquet');

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

  function normalizeValue(v) {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(normalizeValue);
    if (typeof v === 'bigint') {
      const n = Number(v);
      return Number.isSafeInteger(n) ? n : v.toString();
    }
    if (typeof v === 'object') {
      // parquetjs-lite may return Long-like objects with toNumber()
      if (typeof v.toNumber === 'function') {
        try {
          return v.toNumber();
        } catch (_) {
          return v.toString();
        }
      }
      const out = {};
      for (const k of Object.keys(v)) out[k] = normalizeValue(v[k]);
      return out;
    }
    return v;
  }

  const a = rows.map(normalizeValue);
  const b = records.map(normalizeValue);

  if (a.length !== b.length) {
    console.error('Parquet test failed: length mismatch', a.length, b.length);
    process.exit(1);
  }

  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      console.error('Parquet test failed: row mismatch at', i);
      console.error('expected:', a[i]);
      console.error('actual:  ', b[i]);
      process.exit(1);
    }
  }

  console.log('Parquet test passed');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
