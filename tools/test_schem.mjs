import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readSchematic, SCHEM_LIMITS } from '../assets/js/schem.js';

const sample = version => readFile(new URL('./fixtures/pawilon-v' + version + '.schem', import.meta.url));
const v2 = await sample(2), v3 = await sample(3);
const parse = bytes => readSchematic(new Blob([bytes]));
const [old, current] = await Promise.all([parse(v2), parse(v3)]);
assert.equal(old.version, 2);
assert.equal(current.version, 3);
assert.deepEqual(current.size, [7, 5, 5]);
assert.deepEqual(old.blocks, current.blocks);
assert.equal(current.blocks.length, 127);
assert.deepEqual(current.blocks.find(b => b[0] === 0 && b[1] === 1 && b[2] === 4), [0, 1, 4, 'oak_log']);
assert.deepEqual(current.blocks.find(b => b[0] === 3 && b[1] === 4 && b[2] === 2), [3, 4, 2, 'red_concrete', 'fixture:rubin']);
assert.deepEqual([...current.unknown], [['fixture:rubin', 1]]);

await assert.rejects(parse(v3.subarray(0, -4)), /rozpakować/);
await assert.rejects(parse(Buffer.from('niepoprawny plik')), /gzip/);
await assert.rejects(parse(Buffer.alloc(SCHEM_LIMITS.file + 1)), /4 MiB/);
await assert.rejects(parse(gzipSync(Buffer.alloc(SCHEM_LIMITS.expanded + 1))), /16 MiB/);
const raw = gunzipSync(v3);
const change = (tag, write) => {
  const bytes = Buffer.from(raw);
  write(bytes, bytes.indexOf(tag) + tag.length);
  return parse(gzipSync(bytes));
};
await assert.rejects(change('Version', (b, i) => b.writeInt32BE(4, i)), /wersji 2 lub 3/);
await assert.rejects(change('Width', (b, i) => b.writeUInt16BE(257, i)), /256 pól/);
await assert.rejects(change('Data', (b, i) => b.writeInt32BE(-1, i)), /NBT/);
await assert.rejects(change('fixture:rubin', (b, i) => b.writeInt32BE(0, i)), /NBT/);
await assert.rejects(parse(gzipSync(raw.subarray(0, -1))), /NBT/);
console.log('Schematic: v2 i v3, układ osi, VarInt, nierozpoznane bloki, uszkodzone pliki i limity.');
