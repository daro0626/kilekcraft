import { writeFile } from 'node:fs/promises';
import { generate, decode } from '../assets/js/komnaty-gen.js';
import { MECHANICAL_ROOMS, roomFiles } from '../assets/js/komnaty-datapack.js';
import { datapack, OFFSET_X } from '../assets/js/export.js';

const [target, pack] = process.argv.slice(2);
const cases = [];
for (const level of MECHANICAL_ROOMS) {
  const code = 'M' + level + '-K-1';
  const room = generate(decode(code));
  const title = 'komnata ' + code.replaceAll('-', ' ');
  const { name, blob } = await datapack(room.blocks, title, { info: { pack: JSON.parse(pack) }, extra: roomFiles(room, title) });
  await writeFile(target + '/' + name + '.zip', new Uint8Array(await blob.arrayBuffer()));
  cases.push({ name, code, offset: OFFSET_X, rules: room.rules, size: room.size,
    start: room.blocks.find(b => b[3] === 'gold'),
    finish: room.blocks.find(b => b[3] === 'diamond'),
    crack: room.blocks.filter(b => b[3] === 'cracked_bricks').sort((a, b) => b[1] - a[1])[0] });
}
await writeFile(target + '/komnaty.json', JSON.stringify(cases));
