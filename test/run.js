const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const inPath = path.join(repoRoot, 'examples', 'aggregate.json');
const outDir = path.join(__dirname, 'output');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'schema.graphql');

const generator = path.join(repoRoot, 'generator.js');
const res = spawnSync('node', [generator, inPath, outPath], { encoding: 'utf8' });
if (res.error) {
  console.error('Failed to run generator:', res.error);
  process.exit(2);
}
if (res.status !== 0) {
  console.error('Generator exited non-zero');
  console.error(res.stdout);
  console.error(res.stderr);
  process.exit(res.status || 1);
}

const expectedPath = path.join(__dirname, 'expected', 'schema.graphql');
if (!fs.existsSync(expectedPath)) {
  console.error('Missing expected file:', expectedPath);
  process.exit(2);
}

const expected = fs.readFileSync(expectedPath, 'utf8').replace(/\r\n/g, '\n');
const actual = fs.readFileSync(outPath, 'utf8').replace(/\r\n/g, '\n');

if (expected !== actual) {
  console.error('Generated SDL does not match expected.');
  console.error('--- expected ---');
  console.error(expected);
  console.error('--- actual ---');
  console.error(actual);
  process.exit(1);
}

console.log('Test passed');
