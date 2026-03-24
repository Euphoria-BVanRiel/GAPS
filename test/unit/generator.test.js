const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const tmpDir = path.join(__dirname, 'tmp-generator');
beforeAll(() => {
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
});
afterAll(() => {
  try { fs.rmSync(tmpDir, { recursive: true }); } catch (_) {}
});

test('generator produces expected SDL for simple spec', () => {
  const spec = {
    name: 'Pet',
    fields: [
      { name: 'id', type: 'id', nonNull: true },
      { name: 'name', type: 'string' }
    ]
  };
  const specPath = path.join(tmpDir, 'pet.json');
  const outPath = path.join(tmpDir, 'schema.graphql');
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

  const res = spawnSync('node', [path.join(__dirname, '..', '..', 'generator.js'), specPath, outPath], { encoding: 'utf8' });
  expect(res.error).toBeUndefined();
  expect(res.status).toBe(0);
  const sdl = fs.readFileSync(outPath, 'utf8');
  expect(sdl).toMatch(/type Pet/);
  expect(sdl).toMatch(/id: ID!/);
  expect(sdl).toMatch(/name: String/);
});
