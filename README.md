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

The output file `schema.graphql` will contain the generated GraphQL types.# GAPS
GraphQL Apache.Parquet document storage solution

## Licensing
This project is dual-licensed under MIT and GPLv3.  
You may choose either license.  
See LICENSE.MIT and LICENSE.GPLv3 for details.
