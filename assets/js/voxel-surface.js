import * as THREE from '../../vendor/three.module.js';
import { BLOCKS } from './blocks.js';

const SIDES = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const repeats = new Map();

function tiled(material) {
  if (!material.map) return material;
  if (!repeats.has(material)) {
    const copy = material.clone();
    copy.map = material.map.clone();
    copy.map.wrapS = copy.map.wrapT = THREE.RepeatWrapping;
    copy.map.needsUpdate = true;
    if (material.emissiveMap === material.map) copy.emissiveMap = copy.map;
    repeats.set(material, copy);
  }
  return repeats.get(material);
}

export function surfaceMeshes(build, cube, materialFor) {
  const [width, height, depth] = build.size;
  const offsetX = -width * .5 + .5, offsetZ = -depth * .5 + .5;
  const key = (x, y, z) => x + width * (z + depth * y);
  const grid = new Map(build.blocks.map(([x, y, z, type]) => [key(x, y, z), type]));
  const opaque = type => type && !BLOCKS[type].alpha && BLOCKS[type].pat !== 'leaves';
  const faces = SIDES.map(([dx, dy, dz], face) => {
    const vector = i => new THREE.Vector3().fromBufferAttribute(cube.attributes.position, face * 4 + i);
    const corner = vector(0);
    return { dx, dy, dz, corner, u: vector(1).sub(corner), v: vector(2).sub(corner) };
  });
  const batches = new Map();
  for (const [x, y, z, type] of build.blocks) {
    const materials = materialFor(type);
    for (const [index, face] of faces.entries()) {
      const { dx, dy, dz, u, v } = face;
      const nx = x + dx, ny = y + dy, nz = z + dz;
      const adjacent = nx >= 0 && nx < width && ny >= 0 && ny < height && nz >= 0 && nz < depth && grid.get(key(nx, ny, nz));
      if (opaque(adjacent) || (adjacent === type && BLOCKS[type].alpha)) continue;
      const material = Array.isArray(materials) ? materials[index] : materials;
      if (!batches.has(material)) batches.set(material, new Map());
      const planes = batches.get(material);
      const group = index + ':' + (x * dx + y * dy + z * dz);
      if (!planes.has(group)) planes.set(group, { face, cells: new Map() });
      const { cells } = planes.get(group);
      const a = x * u.x + y * u.y + z * u.z, b = x * v.x + y * v.y + z * v.z;
      cells.set(a + ',' + b, { x, y, z, a, b });
    }
  }
  const meshes = [];
  for (const [material, planes] of batches) {
    const positions = [], normals = [], uvs = [], indexes = [];
    for (const { face, cells } of planes.values()) {
      const { corner, u, v, dx, dy, dz } = face;
      for (const { x, y, z, a, b } of cells.values()) {
        let w = 1, h = 1;
        while (cells.has((a + w) + ',' + b)) w++;
        rows: while (true) {
          for (let i = 0; i < w; i++) if (!cells.has((a + i) + ',' + (b + h))) break rows;
          h++;
        }
        for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) cells.delete((a + i) + ',' + (b + j));
        const start = positions.length / 3;
        for (const [i, j] of [[0,0],[w,0],[0,h],[w,h]]) {
          positions.push(offsetX + x + corner.x + i * u.x + j * v.x,
            y + .5 + corner.y + i * u.y + j * v.y, offsetZ + z + corner.z + i * u.z + j * v.z);
          normals.push(dx, dy, dz);
          uvs.push(i, h - j);
        }
        indexes.push(start, start + 2, start + 1, start + 2, start + 3, start + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indexes);
    const mesh = new THREE.Mesh(geometry, tiled(material));
    mesh.renderOrder = material.transparent ? 2 : 0;
    meshes.push(mesh);
  }
  return meshes;
}
