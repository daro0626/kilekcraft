import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { BLOCKS, getBuild } from '../assets/js/builds.js';
import { datapack, exportLines, layerFunctions } from '../assets/js/export.js';
import { readSchematic } from '../assets/js/schem.js';
import { surfaceMeshes } from '../assets/js/voxel-surface.js';
import { BoxGeometry, MeshBasicMaterial } from '../vendor/three.module.js';

const path = new URL('../docs/prototypy/latajaca-twierdza-kilek.schem', import.meta.url);
const model = getBuild('twierdza');
const [width, height, length] = model.size;
const palette = new Map([['minecraft:air', 0]]);
const blocks = Buffer.alloc(width * height * length);
for (const [x, y, z, type] of model.blocks) {
  const id = BLOCKS[type].id;
  assert(id);
  if (!palette.has(id)) palette.set(id, palette.size);
  blocks[x + z * width + y * width * length] = palette.get(id);
}
assert(palette.size < 128, 'W tym modelu każdy indeks mieści się w jednym bajcie VarInt.');
function short(n) { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; }
function int(n) { const b = Buffer.alloc(4); b.writeInt32BE(n); return b; }
function tag(type, name, value) {
  const title = Buffer.from(name);
  return Buffer.concat([Buffer.from([type]), short(title.length), title, value]);
}
const compound = (name, fields) => tag(10, name, Buffer.concat([...fields, Buffer.from([0])]));
const data = compound('', [compound('Schematic', [
  tag(3, 'Version', int(3)), tag(3, 'DataVersion', int(5023)),
  tag(2, 'Width', short(width)), tag(2, 'Height', short(height)), tag(2, 'Length', short(length)),
  compound('Blocks', [
    compound('Palette', [...palette].map(([name, index]) => tag(3, name, int(index)))),
    tag(7, 'Data', Buffer.concat([int(blocks.length), blocks])),
  ]),
])]);
if (process.argv.includes('--zapisz')) await writeFile(path, gzipSync(data));
const bytes = await readFile(path);
const loaded = await readSchematic(new Blob([bytes]));
assert.deepEqual(loaded.size, model.size);
assert.equal(loaded.unknown.size, 0);
const key = b => b.join(',');
assert.deepEqual(new Set(loaded.blocks.map(key)), new Set(model.blocks.map(key)));
assert(model.blocks.length > 15_000 && model.blocks.length < 60_000);
assert.equal(layerFunctions(model.blocks, model.short).filter(f => f.path.includes('/warstwa_')).length, height);
const packInfo = JSON.parse(await readFile(new URL('../data/datapack.json', import.meta.url)));
const { blob } = await datapack(model.blocks, model.short, { info: packInfo });
const materials = new Map();
const surface = surfaceMeshes(model, new BoxGeometry(), type => {
  if (!materials.has(type)) materials.set(type, new MeshBasicMaterial());
  return materials.get(type);
});
const triangles = surface.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);
assert(triangles < model.blocks.length * 12 / 3);
console.log('Twierdza', model.size.join('×'), model.blocks.length, 'bloków,', bytes.length, 'B schem,',
  blob.size, 'B ZIP,', exportLines(model.blocks).length, 'poleceń całości,', triangles, 'trójkątów powierzchni.');
