const parquet = require('parquetjs-lite');

async function writeParquet(schemaDef, rows, outPath) {
  const schema = new parquet.ParquetSchema(schemaDef);
  const writer = await parquet.ParquetWriter.openFile(schema, outPath);
  for (const row of rows) {
    await writer.appendRow(row);
  }
  await writer.close();
}

async function readParquet(filePath) {
  const reader = await parquet.ParquetReader.openFile(filePath);
  const cursor = reader.getCursor();
  const records = [];
  let record = null;
  while ((record = await cursor.next())) {
    records.push(record);
  }
  await reader.close();
  return records;
}

module.exports = { writeParquet, readParquet };
