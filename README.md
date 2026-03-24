# JSON → GraphQL Aggregate Generator

Quick generator that reads a JSON description of an aggregate root and emits GraphQL SDL.

Files added:
- [generator.js](generator.js)
- [examples/aggregate.json](examples/aggregate.json)
- [package.json](package.json)

JSON format (brief):
- `name`: root type name
- `fields`: array of fields; each field may include:
  - `name`: field name
  - `type`: scalar name (`id`, `string`, `int`, `float`, `boolean`, `datetime`) or `object`
  - `nonNull`: boolean (append `!`)
  - `isList`: boolean (makes a list)
  - `fields`: for `object` types, nested field definitions

Usage:

Run the generator and write SDL to `schema.graphql`:

```
node generator.js examples/aggregate.json schema.graphql
```

Or use the npm script:

```
npm run generate
```

The output file `schema.graphql` will contain the generated GraphQL types.

Parquet (read/write)
--------------------

This project includes a small example showing how to read and write Apache Parquet files using Node.js.

1. Install dependencies:

```bash
npm install
```

2. Run the Parquet example which writes `examples/data.parquet` and reads it back:

```bash
npm run parquet:example
```

Files:
- `lib/parquet.js`: helper functions `writeParquet(schemaDef, rows, outPath)` and `readParquet(filePath)`.
- `scripts/parquet-example.js`: example script that writes `examples/data.parquet` from `examples/parquet-data.json` and reads it back.

Next steps (future):
- Create indexes over Parquet files and map GraphQL types to row-level accessors.
- Generate input types and mutations that write updates into Parquet-backed storage.

# GAPS
GraphQL Apache.Parquet document storage solution

## Licensing
This project is dual-licensed under MIT and GPLv3.  
You may choose either license.  
See LICENSE.MIT and LICENSE.GPLv3 for details.
