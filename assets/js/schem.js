import { BLOCKS } from './blocks.js';

const MiB = 1024 * 1024;
export const SCHEM_LIMITS = { file: 4 * MiB, expanded: 16 * MiB, axis: 256, volume: 1_000_000, blocks: 60_000 };
const TYPES = { byte: 1, short: 2, int: 3, bytes: 7, text: 8, list: 9, object: 10, ints: 11, longs: 12 };
const sizes = [0, 1, 2, 4, 8, 4, 8];
const blocksById = new Map(Object.entries(BLOCKS).filter(([, block]) => block.id).map(([key, block]) => [block.id, key]));
const air = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const decoder = new TextDecoder();
const damaged = () => new Error('Plik ma uszkodzone albo niepełne dane NBT.');
const schematicFields = { Version: true, DataVersion: true, Width: true, Height: true, Length: true,
  Palette: true, BlockData: true, Blocks: { Palette: true, Data: true } };

async function expand(file) {
  if (!file.size || file.size > SCHEM_LIMITS.file) throw new Error('Wybierz niepusty plik .schem do 4 MiB.');
  const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  if (header[0] !== 0x1f || header[1] !== 0x8b) throw new Error('Plik .schem musi być zapisany w formacie gzip.');
  if (typeof DecompressionStream !== 'function') throw new Error('Ta przeglądarka nie potrafi rozpakować pliku gzip.');
  const reader = file.stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks = [];
  let length = 0;
  try {
    for (;;) {
      const next = await reader.read().catch(() => { throw new Error('Nie udało się rozpakować pliku gzip.'); });
      if (next.done) break;
      length += next.value.byteLength;
      if (length > SCHEM_LIMITS.expanded) {
        await reader.cancel().catch(() => {});
        throw new Error('Rozpakowany plik przekracza 16 MiB.');
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

// Nie odtwarzamy encji, ekwipunku i innych metadanych. Przechodzimy całą
// strukturę, żeby sprawdzić jej długości, ale zachowujemy tylko potrzebne pola.
function readNBT(bytes) {
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0, tags = 0;
  function take(size) {
    const start = offset;
    offset += size;
    if (size < 0 || offset > data.byteLength) throw damaged();
    return start;
  }
  const byte = () => data.getUint8(take(1));
  const short = () => data.getUint16(take(2));
  const int = () => data.getInt32(take(4));
  function text(keep) {
    const length = short(), start = take(length);
    return keep ? decoder.decode(bytes.subarray(start, start + length)) : undefined;
  }
  function payload(type, depth, keep) {
    if (depth > 32 || ++tags > 200_000) throw new Error('Struktura NBT przekracza limit złożoności.');
    if (type === TYPES.short) return short();
    if (type === TYPES.int) return int();
    if (sizes[type]) { take(sizes[type]); return; }
    if (type === TYPES.text) return text(keep);
    if (type === TYPES.bytes || type === TYPES.ints || type === TYPES.longs) {
      const length = int(), width = type === TYPES.bytes ? 1 : type === TYPES.ints ? 4 : 8;
      const start = take(length * width);
      return keep && type === TYPES.bytes ? bytes.subarray(start, start + length) : undefined;
    }
    if (type === TYPES.list) {
      const element = byte(), length = int();
      if (length < 0 || element > TYPES.longs || (!element && length)) throw damaged();
      if (sizes[element]) take(sizes[element] * length);
      else for (let i = 0; i < length; i++) payload(element, depth + 1, false);
      return;
    }
    if (type === TYPES.object) {
      const result = keep ? new Map() : undefined;
      for (let tag = byte(); tag; tag = byte()) {
        const name = text(keep);
        const save = keep === true || (keep && Object.hasOwn(keep, name) && keep[name]);
        const value = payload(tag, depth + 1, save);
        if (save) {
          if (result.has(name)) throw damaged();
          result.set(name, { type: tag, value });
        }
      }
      return result;
    }
    throw damaged();
  }
  if (byte() !== TYPES.object) throw damaged();
  text(false);
  const root = payload(TYPES.object, 0, { ...schematicFields, Schematic: schematicFields });
  if (offset !== data.byteLength) throw damaged();
  return root;
}

function field(object, name, type) {
  const tag = object?.get(name);
  if (tag?.type !== type) throw damaged();
  return tag.value;
}

export async function readSchematic(file) {
  const root = readNBT(await expand(file));
  const nested = root.has('Schematic');
  const schematic = nested ? field(root, 'Schematic', TYPES.object) : root;
  const version = field(schematic, 'Version', TYPES.int);
  if (!(version === 2 && !nested || version === 3 && nested)) throw new Error('Wybierz plik Sponge Schematic w wersji 2 lub 3.');
  if (field(schematic, 'DataVersion', TYPES.int) <= 0) throw damaged();
  const size = ['Width', 'Height', 'Length'].map(name => field(schematic, name, TYPES.short));
  const [width, height, length] = size, area = width * length, volume = area * height;
  if (!volume || size.some(n => n > SCHEM_LIMITS.axis) || volume > SCHEM_LIMITS.volume) {
    throw new Error('Podgląd mieści do 256 pól na oś i do miliona pól łącznie.');
  }
  const container = version === 3 ? field(schematic, 'Blocks', TYPES.object) : schematic;
  if (!container.has('Palette')) throw new Error('W pliku brakuje palety materiałów. Wyeksportuj budowlę ponownie z paletą.');
  const palette = new Map();
  for (const [state, entry] of field(container, 'Palette', TYPES.object)) {
    if (entry.type !== TYPES.int || entry.value < 0 || palette.has(entry.value)) throw damaged();
    const base = state.split('[', 1)[0];
    if (!/^(?:[a-z0-9_.-]+:)?[a-z0-9_/.-]+$/.test(base)) throw damaged();
    const id = base.includes(':') ? base : 'minecraft:' + base;
    palette.set(entry.value, { id, block: air.has(id) ? null : blocksById.get(id) || 'red_concrete', unknown: !air.has(id) && !blocksById.has(id) });
  }
  const data = field(container, version === 3 ? 'Data' : 'BlockData', TYPES.bytes);
  const blocks = [], unknown = new Map();
  let offset = 0;
  for (let i = 0; i < volume; i++) {
    let value = 0;
    for (let shift = 0; ; shift += 7) {
      const byte = data[offset++];
      if (byte === undefined || (shift === 28 && byte > 7)) throw damaged();
      value += (byte & 127) * (2 ** shift);
      if (byte < 128) break;
    }
    const entry = palette.get(value);
    if (!entry) throw damaged();
    if (!entry.block) continue;
    if (blocks.length >= SCHEM_LIMITS.blocks) throw new Error('Model ma ponad 60 000 bloków. Spróbuj wczytać jego fragment.');
    const block = [i % width, Math.floor(i / area), Math.floor(i / width) % length, entry.block];
    if (entry.unknown) {
      block.push(entry.id);
      unknown.set(entry.id, (unknown.get(entry.id) || 0) + 1);
    }
    blocks.push(block);
  }
  if (offset !== data.length) throw damaged();
  if (!blocks.length) throw new Error('W pliku jest tylko powietrze. Wybierz plik z budowlą.');
  return { size, blocks, version, unknown };
}
