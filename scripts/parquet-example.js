const path = require('path');
const fs = require('fs');
const { writeParquet, readParquet } = require('../lib/parquet');

async function run() {
  const dataPath = path.join(__dirname, '..', 'examples', 'parquet-data.json');
  const outPath = path.join(__dirname, '..', 'examples', 'data.parquet');
  const rows = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Define a parquet schema matching the data
  const schemaDef = {
    id: { type: 'UTF8' },
    name: { type: 'UTF8' },
    price: { type: 'DOUBLE' },
    quantity: { type: 'INT64' },
    createdAt: { type: 'UTF8' }
  };

  console.log('Writing', outPath);
  await writeParquet(schemaDef, rows, outPath);
  console.log('Wrote parquet file. Reading back...');

  const records = await readParquet(outPath);
  console.log('Read', records.length, 'records');
  console.log(records.slice(0, 5));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
