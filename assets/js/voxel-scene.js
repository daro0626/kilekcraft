// Ta sama scena dla wątku renderującego i przeglądarek bez OffscreenCanvas.
// Worker modułowy wymaga ścieżki względnej do lokalnego Three.js.
import * as THREE from '../../vendor/three.module.js';
import { BLOCKS } from './blocks.js';
import { surfaceMeshes } from './voxel-surface.js';

function makeCanvas(size) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(size, size);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return canvas;
}

// ---------- tekstury ----------
const texCache = {};
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, r * f)); g = Math.max(0, Math.min(255, g * f)); b = Math.max(0, Math.min(255, b * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
function makeTex(key, draw) {
  if (texCache[key]) return texCache[key];
  const c = makeCanvas(16);
  const x = c.getContext('2d'); draw(x);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return (texCache[key] = t);
}
function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

function patternTex(type, face = 'side') {
  const b = BLOCKS[type], col = b.c, R = seeded(type.length * 997 + (face === 'top' ? 7 : 1));
  return makeTex(type + face, (x) => {
    const px = (i, j, f) => { x.fillStyle = shade(col, f); x.fillRect(i, j, 1, 1); };
    const fill = (f = 1) => { x.fillStyle = shade(col, f); x.fillRect(0, 0, 16, 16); };
    switch (b.pat) {
      case 'noise': fill(); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(i, j, .86 + R() * .26); break;
      case 'cobble': fill(.95); for (let k = 0; k < 9; k++) { const cx = R() * 16, cy = R() * 16, rr = 2 + R() * 3, f = .85 + R() * .3; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const d = Math.hypot(i - cx, j - cy); if (d < rr) px(i, j, d > rr - 1 ? .62 : f); } } break;
      case 'bricks': fill(.7); for (let row = 0; row < 4; row++) for (let i = 0; i < 16; i++) for (let j = row * 4; j < row * 4 + 3; j++) { const off = row % 2 ? 4 : 0; if ((i + off) % 8 !== 7) px(i, j, .92 + R() * .16); } break;
      case 'grass':
        if (face === 'top') { BLOCKS.grass && (x.fillStyle = col); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(i, j, .8 + R() * .35); }
        else { const d = BLOCKS.dirt.c; for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { x.fillStyle = shade(d, .86 + R() * .26); x.fillRect(i, j, 1, 1); } for (let i = 0; i < 16; i++) { const h = 3 + (R() * 3 | 0); for (let j = 0; j < h; j++) px(i, j, .8 + R() * .3); } }
        break;
      case 'bark': fill(); for (let i = 0; i < 16; i++) { const f = .75 + R() * .4; for (let j = 0; j < 16; j++) px(i, j, f * (.92 + R() * .12)); } break;
      case 'planks': fill(); for (let j = 0; j < 16; j++) { const seam = j % 4 === 3; for (let i = 0; i < 16; i++) px(i, j, seam ? .68 : .92 + R() * .14); } for (let r = 0; r < 4; r++) { const i = (r * 5 + 3) % 16; for (let j = r * 4; j < r * 4 + 3; j++) px(i, j, .72); } break;
      case 'leaves': x.clearRect(0, 0, 16, 16); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (R() > .18) px(i, j, .7 + R() * .5); break;
      case 'portal': for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) px(i, j, .75 + .5 * Math.abs(Math.sin((i + j * .7) * .6 + Math.cos(j * .5) * 2))); break;
      case 'woven':
        fill();
        for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
          px(i, j, ((i + j) % 2 ? .91 : 1.06) + R() * .09);
        }
        break;
      case 'prism':
        fill();
        for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
          const scale = (j + Math.abs((i + (j >> 2) * 2) % 4 - 2)) % 4;
          px(i, j, (scale === 0 ? .77 : 1.02) + R() * .12);
        }
        break;
      case 'frost':
        fill();
        for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) {
          const ridge = Math.abs(Math.sin(i * .7 + j * .28) + Math.cos(j * .8));
          px(i, j, (ridge > 1.45 ? 1.19 : .91) + R() * .12);
        }
        break;
      case 'metal': fill(); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { let f = .96 + R() * .06; if (i === 0 || j === 0) f = 1.15; if (i === 15 || j === 15) f = .72; px(i, j, f); } break;
      case 'smooth': fill(); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { let f = .97 + R() * .05; if (i === 0 || j === 0 || i === 15 || j === 15) f = .8; px(i, j, f); } break;
      case 'lantern': fill(1); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const g = i % 5 === 0 || j % 5 === 0; px(i, j, g ? .8 : 1.05 + R() * .08); } break;
      case 'glass': x.clearRect(0, 0, 16, 16); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (i === 0 || j === 0 || i === 15 || j === 15 || (i === j && i > 3 && i < 8)) px(i, j, 1.05); break;
      default: fill();
    }
  });
}

const matCache = {};
export function materialFor(type) {
  if (matCache[type]) return matCache[type];
  const b = BLOCKS[type];
  const mk = (face) => {
    const map = patternTex(type, face);
    const m = new THREE.MeshLambertMaterial({ map, transparent: !!b.alpha || b.pat === 'leaves', opacity: b.alpha || 1, alphaTest: b.pat === 'leaves' ? .5 : 0 });
    if (b.alpha) m.depthWrite = false;
    if (b.glow) { m.emissive = new THREE.Color(b.c); m.emissiveMap = map; m.emissiveIntensity = type === 'diamond' ? .35 : .85; }
    return m;
  };
  let m;
  if (b.pat === 'grass') { const side = mk('side'), top = mk('top'), bottom = materialFor('dirt'); m = [side, side, top, bottom, side, side]; }
  else m = mk('side');
  return (matCache[type] = m);
}

export function createScene(canvas, o, ratio) {
  const context = canvas.getContext('webgl2', { antialias: o.antialias ?? ratio < 2, alpha: true, powerPreference: 'low-power' });
  if (!context) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, context, alpha: true });
  renderer.setPixelRatio(Math.min(ratio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .5, 1000);
  scene.add(new THREE.HemisphereLight(0xc8d8ff, 0x3a2550, 2.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4); sun.position.set(1, 2.2, .7); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xa06bff, 1.1); rim.position.set(-1.2, .4, -1); scene.add(rim);

  const group = new THREE.Group(); scene.add(group);
  const box = new THREE.BoxGeometry(1, 1, 1);
  let meshes = [], surfaces = [], ghost = null, plane = null, motes = null, maxY = 0;

  function clear() {
    meshes.forEach(m => { group.remove(m.mesh); m.mesh.dispose(); });
    surfaces.forEach(mesh => { group.remove(mesh); mesh.geometry.dispose(); });
    if (ghost) { group.remove(ghost); ghost.dispose(); ghost = null; }
    if (plane) { group.remove(plane); plane.geometry.dispose(); plane.material.map.dispose(); plane.material.dispose(); plane = null; }
    meshes = [];
    surfaces = [];
  }

  function load(b) {
    clear();
    const [sx, sy, sz] = b.size; maxY = sy - 1;
    if (b.blocks.length > 12_000) {
      surfaces = surfaceMeshes(b, box, materialFor);
      group.add(...surfaces);
    }
    const ox = -sx / 2 + .5, oz = -sz / 2 + .5;
    const byType = {};
    for (const bl of b.blocks) (byType[bl[3]] ||= []).push(bl);
    const M = new THREE.Matrix4();
    for (const [type, list] of Object.entries(byType)) {
      list.sort((a, c) => a[1] - c[1]);
      const mesh = new THREE.InstancedMesh(box, materialFor(type), list.length);
      list.forEach((bl, i) => { M.makeTranslation(bl[0] + ox, bl[1] + .5, bl[2] + oz); mesh.setMatrixAt(i, M); });
      mesh.instanceMatrix.needsUpdate = true;
      if (BLOCKS[type].alpha) mesh.renderOrder = 2;
      group.add(mesh);
      meshes.push({ mesh, ys: list.map(l => l[1]) });
    }
    if (o.ghost) {
      const all = [...b.blocks].filter(bl => !BLOCKS[bl[3]].alpha).sort((a, c) => c[1] - a[1]);
      ghost = new THREE.InstancedMesh(box, new THREE.MeshBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: .05, depthWrite: false }), all.length);
      all.forEach((bl, i) => { M.makeTranslation(bl[0] + ox, bl[1] + .5, bl[2] + oz); ghost.setMatrixAt(i, M); });
      ghost.userData.ys = all.map(l => l[1]); ghost.count = 0; ghost.renderOrder = 3; group.add(ghost);
    }
    if (o.layerPlane) {
      const c = makeCanvas(64); const x = c.getContext('2d');
      x.strokeStyle = 'rgba(255,61,61,.95)'; x.lineWidth = 3; x.strokeRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(sx, sz); tex.magFilter = THREE.NearestFilter;
      plane = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: .55, depthWrite: false, side: THREE.DoubleSide }));
      plane.rotation.x = -Math.PI / 2; plane.visible = false; plane.renderOrder = 4; group.add(plane);
    }
    setLayer(Infinity);
  }

  function setLayer(L) {
    const fullSurface = L === Infinity && surfaces.length > 0;
    for (const mesh of surfaces) mesh.visible = fullSurface;
    for (const m of meshes) {
      let n = m.ys.length; if (L !== Infinity) { n = 0; while (n < m.ys.length && m.ys[n] <= L) n++; }
      m.mesh.count = n;
      m.mesh.visible = !fullSurface;
    }
    if (ghost) { let n = 0; const ys = ghost.userData.ys; if (L !== Infinity) while (n < ys.length && ys[n] > L) n++; ghost.count = n; }
    if (plane) { plane.visible = L !== Infinity && L < maxY; plane.position.y = L + 1.02; }
  }

  // drobinki w powietrzu (tylko hero)
  if (o.motes) {
    const n = 90, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 40; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - .5) * 40; }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    motes = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xc9a6ff, size: .35, transparent: true, opacity: .8 }));
    scene.add(motes);
  }

  function resize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function draw(frame) {
    camera.position.fromArray(frame.position);
    camera.quaternion.fromArray(frame.quaternion);
    if (camera.near !== frame.near || camera.far !== frame.far) {
      camera.near = frame.near;
      camera.far = frame.far;
      camera.updateProjectionMatrix();
    }
    if (motes) {
      motes.rotation.y = frame.rotation;
      motes.position.y = Math.sin(frame.time / 2000) * .6;
    }
    renderer.render(scene, camera);
  }

  return { load, setLayer, resize, draw, dispose() { clear(); renderer.dispose(); } };
}
