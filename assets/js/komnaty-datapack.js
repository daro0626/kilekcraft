import { BLOCKS } from './blocks.js';
import { OFFSET_X, safeName } from './export.js';

export const MECHANICAL_ROOMS = [6, 7, 8, 10];
export const mechanicRoom = ({ type, diff }) => type === 'mistrz' && MECHANICAL_ROOMS.includes(diff);

const relative = (x, y, z) => `~${x} ~${y} ~${z}`;
const xyz = (x, y, z) => relative(x + OFFSET_X, y, z);
const time = 'kc_mczas';
const rounds = 'kc_mgra';
const seenCheckpoint = 'kc_mpunkt';
const crack = BLOCKS.cracked_bricks.id;
const air = 'minecraft:air', barrier = 'minecraft:barrier', lava = BLOCKS.lava.id;
const darkness = 'minecraft:darkness';

export function roomFiles(room, title) {
  const name = safeName(title);
  const prefix = `kilekcraft:${name}`;
  const fn = f => `function ${prefix}/${f}`;
  const tag = 'kg_' + name;
  const marker = `@e[type=minecraft:marker,tag=${tag},limit=1]`;
  const runnerTag = tag + '_g';
  const player = `@e[tag=${runnerTag}]`;
  const active = name + '_runda';
  const guard = '#s_' + name, ticks = (player = '@s') => `${player} ${time}`;
  const [width, height, depth] = room.size;
  const [left, right] = [-1, width], [near, far] = [-1, depth], top = height + 2;
  const { fog, crumble, lava: rising } = room.rules;
  const crumbling = crumble ? room.blocks.filter(b => b[3] === 'cracked_bricks') : [];
  const spawn = room.blocks.find(b => b[3] === 'gold');
  const checkpoint = room.blocks.find(b => b[3] === 'emerald');
  const spawnAt = ([x, y, z]) => xyz(x + .5, y + 1, z + .5);
  const regionStart = xyz(left, -1, near);
  const region = `positioned ${regionStart}`;
  const area = `dx=${right - left},dy=${top + 1},dz=${far - near}`;
  const inside = `@e[tag=${runnerTag},${area}]`;
  const box = (x0, y0, z0, x1, y1, z1) => `${xyz(x0, y0, z0)} ${xyz(x1, y1, z1)}`;
  const file = (path, lines) => ({ name: `data/kilekcraft/function/${name}/${path}.mcfunction`, data: lines.join('\n') + '\n' });
  const say = (text) => `tellraw @s ${JSON.stringify({ text })}`;
  const positionCheck = [];
  for (let x = left; x <= right; x++) for (let y = -1; y <= top; y++) for (let z = near; z <= far; z++) {
    positionCheck.push(`execute if score ${ticks(guard)} matches 1 unless block ${xyz(x, y, z)} ${air} run scoreboard players set ${ticks(guard)} 0`);
  }
  const chunks = [regionStart, xyz(left, 0, far), xyz(right, 0, near), xyz(right, top, far)];
  // Dodatkowy punkt środka chroni dużą komnatę, gdy środkowy chunk nie jest wczytany.
  for (let x = left; x < right; x += 16) for (let z = near; z < far; z += 16) chunks.push(xyz(x, 0, z));
  const walls = [
    box(left, -1, near, right, -1, far),
    box(left, 0, near, left, top, far),
    box(right, 0, near, right, top, far),
    box(left + 1, 0, near, right - 1, top, near),
    box(left + 1, 0, far, right - 1, top, far),
  ];
  const crackScore = i => ticks(`#${name}_${i}`);
  const crackRestore = crumbling.flatMap(([x, y, z], i) => [
    `execute if score ${crackScore(i)} matches 1.. if block ${xyz(x, y, z)} ${air} run setblock ${xyz(x, y, z)} ${crack}`,
    `scoreboard players reset ${crackScore(i)}`,
  ]);
  const drain = rising ? [`fill ${box(0, 1, 0, width - 1, height - 1, depth - 1)} ${air} replace ${lava}`] : [];
  const crank = crumbling.flatMap(([x, y, z], i) => {
    const key = crackScore(i), pos = xyz(x, y, z);
    const remove = Math.round(crumble.after * 20) + 1, restore = remove + Math.round(crumble.back * 20);
    return [
      `execute if score ${key} matches 1.. run scoreboard players add ${key} 1`,
      `execute unless score ${key} matches 1.. if block ${pos} ${crack} positioned ${xyz(x, y + 1, z)} if entity @e[tag=${runnerTag},dx=0,dy=0,dz=0] run scoreboard players set ${key} 1`,
      `execute if score ${key} matches ${remove} if block ${pos} ${crack} run setblock ${pos} ${air}`,
      `execute if score ${key} matches ${restore}.. if block ${pos} ${air} positioned ${pos} unless entity @e[tag=${runnerTag},dx=0,dy=0,dz=0] run function ${prefix}/odbuduj_${i}`,
    ];
  });
  const wave = rising ? Array.from({ length: height - 1 }, (_, i) => {
    const y = i + 1, at = Math.round((rising.delay + i * rising.every) * 20);
    return `execute if score ${ticks()} matches ${at} run fill ${box(0, y, 0, width - 1, y, depth - 1)} ${lava} replace ${air}`;
  }) : [];
  const teleport = checkpoint && room.rules.checkpoints ? [
    `tp @e[tag=${runnerTag},tag=!${seenCheckpoint}] ${spawnAt(spawn)}`,
    `tp @e[tag=${runnerTag},tag=${seenCheckpoint}] ${spawnAt(checkpoint)}`,
  ] : [`tp ${player} ${spawnAt(spawn)}`];
  return [
    { name: 'data/minecraft/tags/function/tick.json', data: JSON.stringify({ values: [`${prefix}/takt`] }) },
    file('przygotuj', [
      `execute unless dimension minecraft:overworld run return run ${say('Przygotuj komnatę w zwykłym świecie na kopii testowej.')}`,
      `execute if entity ${marker} run return run ${say('Ta komnata już stoi. Najpierw użyj /sprzataj przy starej komnacie.')}`,
      `scoreboard objectives add ${time} dummy`,
      `scoreboard players set ${ticks(guard)} 1`,
      ...new Set(chunks.map(c => `execute align xyz unless loaded ${c} run scoreboard players set ${ticks(guard)} 0`)),
      `execute align xyz if score ${ticks(guard)} matches 1 run ${fn('sprawdz_pole')}`,
      `execute align xyz if score ${ticks(guard)} matches 1 run ${fn('postaw')}`,
      `execute if score ${ticks(guard)} matches 0 run ${say('Pole komnaty jest zajęte lub niewczytane. Nic nie postawiono.')}`,
      `scoreboard players reset ${ticks(guard)}`,
    ]),
    file('sprawdz_pole', positionCheck),
    file('postaw', [
      `summon minecraft:marker ~ ~ ~ {Tags:["${tag}"]}`,
      ...walls.map(w => `fill ${w} ${barrier} replace ${air}`),
      `function ${prefix}`,
      say('Komnata przygotowana. Użyj /runda, aby zacząć.'),
    ]),
    file('runda', [
      `execute unless entity @s[type=minecraft:player,tag=!${rounds}] run return 0`,
      `execute at ${marker} if entity @s[distance=..70] run ${fn('dolacz')}`,
    ]),
    file('dolacz', [
      `execute if entity @e[type=minecraft:marker,tag=${tag},tag=${active}] run return run ${say('W tej komnacie trwa już runda.')}`,
      `tag @s add ${rounds}`,
      `tag @s add ${runnerTag}`,
      `execute as ${marker} at @s run ${fn('wlacz')}`,
    ]),
    file('wlacz', [`tag @s add ${active}`, ...teleport, `scoreboard players set ${ticks()} 0`]),
    file('takt', [
      `execute in minecraft:overworld as @e[type=minecraft:marker,tag=${tag},tag=${active},limit=1] at @s run ${fn('krok_gry')}`,
      `execute in minecraft:overworld if entity @a[tag=${runnerTag}] unless entity @e[type=minecraft:marker,tag=${tag},tag=${active}] as @a[tag=${runnerTag}] run ${fn('wylogowany')}`,
    ]),
    file('wylogowany', [
      ...(fog ? [`effect clear @s ${darkness}`] : []),
      ...[rounds, seenCheckpoint, tag + '_meta', tag + '_upadek', runnerTag].map(t => `tag @s remove ${t}`),
    ]),
    file('krok_gry', [
      `execute ${region} unless entity ${inside} run return run ${fn('wyczysc_runde')}`,
      `execute as ${player} at @s if block ~ ~-0.05 ~ ${BLOCKS.diamond.id} run tag @s add ${tag}_meta`,
      `execute as @e[tag=${tag}_meta] run ${say('Meta! Komnata ukończona.')}`,
      `execute if entity @e[tag=${tag}_meta] run return run ${fn('wyczysc_runde')}`,
      ...(checkpoint && room.rules.checkpoints ? [
        `execute as ${player} at @s if block ~ ~-0.05 ~ ${BLOCKS.emerald.id} run tag @s add ${seenCheckpoint}`,
      ] : []),
      `execute as ${player} at @s if block ~ ~-0.05 ~ ${barrier} run tag @s add ${tag}_upadek`,
      ...(rising ? [`execute as ${player} at @s if block ~ ~ ~ ${lava} run tag @s add ${tag}_upadek`] : []),
      `execute if entity @e[tag=${tag}_upadek] run return run ${fn('odrodz')}`,
      ...(fog ? [`effect give ${player} ${darkness} 2 0 true`] : []),
      `scoreboard players add ${ticks()} 1`,
      ...wave, ...crank,
    ]),
    file('odrodz', [
      ...drain, ...crackRestore, ...teleport, `tag ${player} remove ${tag}_upadek`, `scoreboard players set ${ticks()} 0`,
    ]),
    file('reset', [
      `execute as @e[type=minecraft:marker,tag=${tag},tag=${active},limit=1] at @s run ${fn('reset_lokalny')}`,
    ]),
    file('reset_lokalny', [`tag ${player} remove ${seenCheckpoint}`, fn('odrodz')]),
    file('stop', [`execute as ${marker} at @s run ${fn('wyczysc_runde')}`]),
    file('wyczysc_runde', [
      `tag @s remove ${active}`,
      ...(fog ? [`effect clear ${player} ${darkness}`] : []),
      `tag ${player} remove ${rounds}`, `tag ${player} remove ${seenCheckpoint}`,
      `tag ${player} remove ${tag}_meta`, `tag ${player} remove ${tag}_upadek`, `tag ${player} remove ${runnerTag}`,
      ...drain, ...crackRestore, `scoreboard players reset ${ticks()}`,
    ]),
    file('sprzataj', [`execute as ${marker} at @s run ${fn('usun_komnate')}`]),
    file('usun_komnate', [
      fn('wyczysc_runde'),
      ...room.blocks.filter(b => BLOCKS[b[3]]?.id).map(([x, y, z, t]) =>
        `execute if block ${xyz(x, y, z)} ${BLOCKS[t].id} run setblock ${xyz(x, y, z)} ${air}`),
      ...walls.map(w => `fill ${w} ${air} replace ${barrier}`),
      `kill @s`,
    ]),
    ...crumbling.map((_, i) => file(`odbuduj_${i}`, [
      `setblock ${relative(0, 0, 0)} ${crack} keep`, `scoreboard players reset ${crackScore(i)}`,
    ])),
  ];
}
